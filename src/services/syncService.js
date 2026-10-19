import db from './db';
import Dexie from 'dexie';

import { clearAllCache, validateRecordData, triggerDataRefresh, getFastSession, markPendingDelete } from './apiService';

/**
 * Direct API fetch helper with token reuse, timeout protection, and structured error responses.
 */
const directFetch = async (endpoint, options = {}) => {
    let token = options.token;
    if (token === undefined) {
        const session = await getFastSession();
        token = session?.access_token;
    }

    const switchedStoreId = localStorage.getItem('rt_active_store_id');
    const timeoutMs = options.timeout || 10000; // 10s default timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const config = {
        ...options,
        signal: options.signal || controller.signal,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'X-User-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            ...(switchedStoreId ? { 'X-Switch-Store-ID': switchedStoreId } : {}),
            ...options.headers,
        },
    };

    try {
        const response = await fetch(`/api${endpoint}`, config);
        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorMsg = `API Error ${response.status}`;
            try {
                const errJson = await response.json();
                if (errJson?.message) errorMsg = errJson.message;
            } catch {}
            return { 
                status: 'error', 
                httpStatus: response.status, 
                message: errorMsg 
            };
        }
        
        return await response.json();
    } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
            return {
                status: 'error',
                httpStatus: 408,
                message: 'การเชื่อมต่อหมดเวลา (Timeout 10 วินาที) สัญญาณอินเทอร์เน็ตอาจยังไม่เสถียร'
            };
        }
        throw fetchErr;
    }
};

/**
 * Cascade foreign key updates when temporary UUIDs are replaced by sequential server IDs.
 */
const cascadeUpdateLocalDBIds = async (table, oldId, newId) => {
    try {
        if (table === 'farmers') {
            await db.buys.where('farmerId').equals(oldId).modify({ farmerId: newId });
            await db.employees.where('farmerId').equals(oldId).modify({ farmerId: newId });
            await db.promotions.where('farmerId').equals(oldId).modify({ farmerId: newId }).catch(async () => {
                const promos = await db.promotions.toArray();
                for (const p of promos) {
                    if (p.farmerId === oldId) {
                        await db.promotions.update(p.id, { farmerId: newId });
                    }
                }
            });
        } else if (table === 'staff') {
            await db.wages.where('staffId').equals(oldId).modify({ staffId: newId });
            await db.sells.where('employeeId').equals(oldId).modify({ employeeId: newId }).catch(async () => {
                const sells = await db.sells.toArray();
                for (const s of sells) {
                    if (s.employeeId === oldId) {
                        await db.sells.update(s.id, { employeeId: newId });
                    }
                }
            });
        } else if (table === 'factories') {
            await db.trucks.where('factoryId').equals(oldId).modify({ factoryId: newId });
            await db.sells.where('factoryId').equals(oldId).modify({ factoryId: newId }).catch(async () => {
                const sells = await db.sells.toArray();
                for (const s of sells) {
                    if (s.factoryId === oldId) {
                        await db.sells.update(s.id, { factoryId: newId });
                    }
                }
            });
        } else if (table === 'trucks') {
            await db.sells.where('truckId').equals(oldId).modify({ truckId: newId }).catch(async () => {
                const sells = await db.sells.toArray();
                for (const s of sells) {
                    if (s.truckId === oldId) {
                        await db.sells.update(s.id, { truckId: newId });
                    }
                }
            });
        }
    } catch (e) {
        console.error("[SyncService] Cascade update failed:", e);
    }
};

/**
 * Hydrate local IndexedDB from server with parallel concurrency (chunks of 5)
 * Reduces 19 serial HTTP roundtrips from 15s+ down to ~1.5s!
 */
export const hydrateLocalDB = async (providedToken = null) => {
    try {
        if (!navigator.onLine) return { status: 'offline', message: 'Cannot hydrate offline' };

        // Wait for any active syncQueueToServer to complete before hydrating
        if (activeSyncPromise) {
            try {
                await activeSyncPromise;
            } catch {}
        }

        let token = providedToken;
        if (!token) {
            const session = await getFastSession();
            token = session?.access_token;
        }

        const endpoints = [
            { path: '/farmers', table: 'farmers' },
            { path: '/staff', table: 'staff' },
            { path: '/employees', table: 'employees' },
            { path: '/factories', table: 'factories' },
            { path: '/trucks', table: 'trucks' },
            { path: '/buys', table: 'buys' },
            { path: '/sells', table: 'sells' },
            { path: '/wages', table: 'wages' },
            { path: '/expenses', table: 'expenses' },
            { path: '/queue', table: 'queues' },
            { path: '/loans', table: 'loans' },
            { path: '/loans/deductions', table: 'loan_deductions' },
            { path: '/chemicals', table: 'chemicals' },
            { path: '/promotions', table: 'promotions' },
            { path: '/settings', table: 'settings' },
            { path: '/services/catalog', table: 'service_catalog' },
            { path: '/services/queues', table: 'service_queues' },
            { path: '/land_plots', table: 'land_plots' },
            { path: '/coop-members', table: 'coop_members' }
        ];

        // Process endpoints in parallel chunks of 5 for optimal network concurrency
        const CHUNK_SIZE = 5;
        for (let i = 0; i < endpoints.length; i += CHUNK_SIZE) {
            const chunk = endpoints.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(async (ep) => {
                try {
                    const data = await directFetch(ep.path, { token, timeout: 8000 });
                    let itemsToStore = Array.isArray(data) ? data : (data.results || data.data || []);
                    
                    if (ep.table === 'settings' && !Array.isArray(data) && typeof data === 'object' && !data.results) {
                        itemsToStore = Object.keys(data).filter(k => k !== 'status').map(k => ({ key: k, value: data[k] }));
                    }

                    if (itemsToStore && itemsToStore.length > 0 && db[ep.table]) {
                        await db[ep.table].bulkPut(itemsToStore);
                    }
                } catch (tableErr) {
                    console.warn(`[SyncService] Failed to hydrate table ${ep.table}:`, tableErr.message);
                }
            }));
        }

        // Re-apply offline queued records so pending un-synced data remains visible in UI
        try {
            const pendingQueue = await db.sync_queue.toArray();
            for (const item of pendingQueue) {
                if (item.type !== 'settings' && db[item.type]) {
                    if (item.action === 'POST' || item.action === 'PUT') {
                        const recordData = item.payload?.payload || item.payload;
                        if (recordData && Object.keys(recordData).length > 0) {
                            await db[item.type].put(recordData);
                        }
                    } else if (item.action === 'DELETE') {
                        const recordId = item.payload?.id || item.payload?.payload?.id;
                        if (recordId) {
                            await db[item.type].delete(recordId);
                        }
                    }
                }
            }
        } catch (queueErr) {
            console.warn('[SyncService] Failed to re-apply offline queue:', queueErr);
        }

        clearAllCache();
        console.log('[SyncService] Local Database fully hydrated & merged.');
        return { status: 'success' };
    } catch (e) {
        console.error('[SyncService] Failed to hydrate:', e);
        return { status: 'error', message: e.message };
    }
};

let isSyncing = false;
let activeSyncPromise = null;

/**
 * Upload offline queued transactions to server with ID cascade and precise error logging.
 */
export const syncQueueToServer = async () => {
    if (!navigator.onLine) return;
    if (activeSyncPromise) {
        return activeSyncPromise;
    }

    activeSyncPromise = (async () => {
        isSyncing = true;
        let syncedCount = 0;
        let failedCount = 0;
        const failedReasons = [];

        try {
            const totalQueued = await db.sync_queue.count();
        if (totalQueued === 0) {
            return;
        }

        const allItems = await db.sync_queue.orderBy('createdAt').toArray();
        // Skip failed items and items with max retries
        const queue = allItems.filter(item => (item.retryCount || 0) < 5 && item.status !== 'failed');
        
        if (queue.length === 0) {
            return;
        }

        // Fetch auth token once for the entire batch
        const session = await getFastSession();
        const currentUserId = session?.user?.id;
        const token = session?.access_token;

        for (const item of queue) {
            try {
                // USER ISOLATION CHECK: Skip items created by another user without deleting them
                if (currentUserId && item.userId && item.userId !== currentUserId) {
                    console.warn(`[SyncService] Skipping item ${item.uuid} belonging to user ${item.userId} (current: ${currentUserId})`);
                    continue;
                }

                // DATA INTEGRITY CHECK: Validate data before syncing
                const recordData = item.payload?.payload || item.payload;
                const validation = validateRecordData(item.type, recordData);
                
                if (item.action !== 'DELETE' && !validation.valid) {
                    const failNote = `ข้อมูลไม่สมบูรณ์: ${validation.message}`;
                    console.error(`[SyncService] Data incomplete for item ${item.uuid}:`, failNote);
                    await db.sync_queue.update(item.uuid, { status: 'failed', note: failNote });
                    failedCount++;
                    failedReasons.push({ type: item.type, reason: failNote, item });
                    window.dispatchEvent(new CustomEvent('sync-item-failed', { detail: { item, reason: failNote } }));
                    continue;
                }

                let endpointTemplate = `/${item.type}`; 
                if (item.type === 'member_types' || item.type === 'farmer_types') {
                    endpointTemplate = '/member-types';
                }
                
                const data = await directFetch(endpointTemplate, {
                    method: item.action,
                    body: JSON.stringify(item.payload),
                    token,
                    timeout: 8000
                });

                // Handle server response or HTTP errors
                const isSuccess = data && data.status === 'success';
                const is404 = data && data.httpStatus === 404;

                // SPECIAL LOGIC: If deleting something that's already gone (404), consider it sync'd
                if (isSuccess || (is404 && item.action === 'DELETE')) {
                    // Handle ID mapping if the server replaced a temporary UUID
                    const payloadId = item.payload?.payload?.id || item.payload?.id;
                    
                    if (data.id && data.id !== payloadId) {
                        const oldId = payloadId;
                        const newId = data.id;
                        const table = item.type;
                        
                        // Mark old temporary ID as pending delete so UI merge doesn't resurrect it
                        markPendingDelete(table, oldId);

                        try {
                            const record = await db[table].get(oldId);
                            if (record) {
                                await db[table].delete(oldId);
                                await db[table].put({ ...record, id: newId });
                            }
                            
                            // Cascade foreign key updates to other local tables
                            await cascadeUpdateLocalDBIds(table, oldId, newId);
                            
                            // Update remaining items in queue ONLY if modified entity is a parent reference
                            // (buys/wages/expenses IDs are not referenced by subsequent queue items)
                            const isParentEntity = ['farmers', 'staff', 'employees', 'factories', 'trucks'].includes(table);
                            if (isParentEntity) {
                                const remainingQueue = await db.sync_queue.toArray();
                                for (const qEntry of remainingQueue) {
                                    let payloadStr = JSON.stringify(qEntry.payload);
                                    if (payloadStr.includes(oldId)) {
                                        const updatedPayload = JSON.parse(payloadStr.split(oldId).join(newId));
                                        await db.sync_queue.update(qEntry.uuid, { payload: updatedPayload });
                                    }
                                }
                            }
                        } catch (mapErr) {
                            console.error("[SyncService] ID mapping failed:", mapErr);
                        }
                    }

                    await db.sync_queue.delete(item.uuid);
                    syncedCount++;
                } else {
                    console.error(`[SyncService] Sync failed for item ${item.uuid}:`, data);
                    
                    const currentRetry = item.retryCount || 0;
                    const nextRetry = currentRetry + 1;
                    const httpStatus = data?.httpStatus;
                    const failReason = data?.message || `HTTP Error ${httpStatus || 'Unknown'}`;

                    // If it is a client-side permanent error (4xx) or max retry reached
                    const isPermanentError = httpStatus >= 400 && httpStatus < 500;
                    const isMaxRetried = nextRetry >= 5;

                    if (isPermanentError || isMaxRetried) {
                        await db.sync_queue.update(item.uuid, { 
                            retryCount: nextRetry, 
                            status: 'failed', 
                            note: failReason 
                        });
                        failedCount++;
                        failedReasons.push({ type: item.type, reason: failReason, item });
                        window.dispatchEvent(new CustomEvent('sync-item-failed', { 
                            detail: { item, reason: failReason } 
                        }));
                        continue; // Proceed with next item
                    } else {
                        // For 5xx or server timeout issues, increment retry count and break to wait
                        await db.sync_queue.update(item.uuid, { retryCount: nextRetry, note: failReason });
                        break; 
                    }
                }
            } catch (e) {
                console.error(`[SyncService] Unexpected error for item ${item.uuid}:`, e);
                const currentRetry = item.retryCount || 0;
                const nextRetry = currentRetry + 1;
                
                // Differentiate Network Errors
                const isNetworkError = e.name === 'TypeError' || e.message?.toLowerCase().includes('fetch');
                const errMsg = e.message || 'เกิดข้อผิดพลาดในการประมวลผลข้อมูล';

                if (isNetworkError) {
                    await db.sync_queue.update(item.uuid, { retryCount: nextRetry, note: 'สัญญาณอินเทอร์เน็ตขาดหายระหว่างส่งข้อมูล' });
                    break; // Stop and retry later when connection is stable
                } else {
                    // Internal JS error or data parsing issue, mark as failed and continue
                    await db.sync_queue.update(item.uuid, { 
                        retryCount: nextRetry, 
                        status: 'failed', 
                        note: errMsg 
                    });
                    failedCount++;
                    failedReasons.push({ type: item.type, reason: errMsg, item });
                    window.dispatchEvent(new CustomEvent('sync-item-failed', { detail: { item, reason: errMsg } }));
                    continue;
                }
            }
        }

        if (syncedCount > 0 || failedCount > 0) {
            triggerDataRefresh();
            window.dispatchEvent(new CustomEvent('sync-complete', { 
                detail: { 
                    count: syncedCount, 
                    failedCount, 
                    failedReasons 
                } 
            }));
        }

        } finally {
            isSyncing = false;
            activeSyncPromise = null;
        }
    })();

    return activeSyncPromise;
};

let syncDebounceTimer = null;
let isBackgroundSyncStarted = false;

export const startBackgroundSync = () => {
    if (isBackgroundSyncStarted) return;
    isBackgroundSyncStarted = true;

    const triggerSyncWithDebounce = () => {
        if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(async () => {
            const session = await getFastSession();
            const token = session?.access_token;

            await syncQueueToServer();
            await hydrateLocalDB(token);
            // Dispatch event to refresh UI
            window.dispatchEvent(new Event('dashboard-refresh'));
        }, 400); // 400ms stabilization window
    };

    // Listen for online events with debounce to let network connection stabilize
    window.addEventListener('online', () => {
        console.log('[SyncService] Back online. Triggering debounced sync.');
        triggerSyncWithDebounce();
    });

    // Check when user refocuses or switches back to the tab
    const handleActive = async () => {
        if (navigator.onLine && !isSyncing) {
            await syncQueueToServer();
        }
    };
    window.addEventListener('focus', handleActive);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) handleActive();
    });

    // Check periodically in background every 20 seconds
    setInterval(async () => {
        if (navigator.onLine && !isSyncing) {
            await syncQueueToServer();
        }
    }, 20000);
};
