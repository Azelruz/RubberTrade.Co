import db from './db';
import Dexie from 'dexie';

import { supabase } from '../utils/supabase';
import { clearAllCache, validateRecordData, triggerDataRefresh } from './apiService';

const directFetch = async (endpoint, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const switchedStoreId = localStorage.getItem('rt_active_store_id');

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'X-User-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            ...(switchedStoreId ? { 'X-Switch-Store-ID': switchedStoreId } : {}),
            ...options.headers,
        },
    };

    const response = await fetch(`/api${endpoint}`, config);
    
    if (!response.ok) {
        // Return structured error info
        return { 
            status: 'error', 
            httpStatus: response.status, 
            message: `API Error ${response.status}` 
        };
    }
    
    return await response.json();
};

const cascadeUpdateLocalDBIds = async (table, oldId, newId) => {
    try {
        if (table === 'farmers') {
            await db.buys.where('farmerId').equals(oldId).modify({ farmerId: newId });
            await db.employees.where('farmerId').equals(oldId).modify({ farmerId: newId });
            const promos = await db.promotions.toArray();
            for (const p of promos) {
                if (p.farmerId === oldId) {
                    await db.promotions.update(p.id, { farmerId: newId });
                }
            }
        } else if (table === 'staff') {
            await db.wages.where('staffId').equals(oldId).modify({ staffId: newId });
            const sells = await db.sells.toArray();
            for (const s of sells) {
                if (s.employeeId === oldId) {
                    await db.sells.update(s.id, { employeeId: newId });
                }
            }
        } else if (table === 'factories') {
            await db.trucks.where('factoryId').equals(oldId).modify({ factoryId: newId });
            const sells = await db.sells.toArray();
            for (const s of sells) {
                if (s.factoryId === oldId) {
                    await db.sells.update(s.id, { factoryId: newId });
                }
            }
        } else if (table === 'trucks') {
            const sells = await db.sells.toArray();
            for (const s of sells) {
                if (s.truckId === oldId) {
                    await db.sells.update(s.id, { truckId: newId });
                }
            }
        }
    } catch (e) {
        console.error("[SyncService] Cascade update failed:", e);
    }
};


export const hydrateLocalDB = async () => {
    try {
        if (!navigator.onLine) return { status: 'offline', message: 'Cannot hydrate offline' };

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
            { path: '/land_plots', table: 'land_plots' }
        ];

        for (const ep of endpoints) {
            try {
                const data = await directFetch(ep.path);
                let itemsToStore = Array.isArray(data) ? data : (data.results || data.data || []);
                
                if (ep.table === 'settings' && !Array.isArray(data) && typeof data === 'object' && !data.results) {
                   itemsToStore = Object.keys(data).filter(k => k !== 'status').map(k => ({ key: k, value: data[k] }));
                }

                if (itemsToStore && itemsToStore.length > 0) {
                    await db[ep.table].bulkPut(itemsToStore);
                }
            } catch (tableErr) {
                console.warn(`[SyncService] Failed to hydrate table ${ep.table}:`, tableErr.message);
            }
        }

        // Re-apply offline queued records so they don't disappear from UI
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

export const syncQueueToServer = async () => {
    if (!navigator.onLine || isSyncing) return;
    isSyncing = true;

    try {
        const allItems = await db.sync_queue.orderBy('createdAt').toArray();
        // Skip failed items and items with max retries
        const queue = allItems.filter(item => (item.retryCount || 0) < 5 && item.status !== 'failed');
        
        if (queue.length === 0) {
            isSyncing = false;
            return;
        }

        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: {} }));
        const currentUserId = session?.user?.id;

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
                    console.error(`[SyncService] Data incomplete for item ${item.uuid}:`, validation.message);
                    // Mark as failed and keep in queue instead of silent deletion
                    await db.sync_queue.update(item.uuid, { status: 'failed', note: validation.message });
                    failedCount++;
                    window.dispatchEvent(new CustomEvent('sync-item-failed', { detail: { item, reason: validation.message } }));
                    continue;
                }

                let endpointTemplate = `/${item.type}`; 
                if (item.type === 'member_types' || item.type === 'farmer_types') {
                    endpointTemplate = '/member-types';
                }
                
                const data = await directFetch(endpointTemplate, {
                    method: item.action,
                    body: JSON.stringify(item.payload)
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
                        
                        try {
                            const record = await db[table].get(oldId);
                            if (record) {
                                await db[table].delete(oldId);
                                await db[table].put({ ...record, id: newId });
                            }
                            
                            // Cascade foreign key updates to other local tables
                            await cascadeUpdateLocalDBIds(table, oldId, newId);
                            
                            // Update remaining items in queue
                            const remainingQueue = await db.sync_queue.toArray();
                            for (const qEntry of remainingQueue) {
                                let payloadStr = JSON.stringify(qEntry.payload);
                                if (payloadStr.includes(oldId)) {
                                    const updatedPayload = JSON.parse(payloadStr.split(oldId).join(newId));
                                    await db.sync_queue.update(qEntry.uuid, { payload: updatedPayload });
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

                    // If it is a client-side permanent error (4xx) or max retry reached
                    const isPermanentError = httpStatus >= 400 && httpStatus < 500;
                    const isMaxRetried = nextRetry >= 5;

                    if (isPermanentError || isMaxRetried) {
                        await db.sync_queue.update(item.uuid, { 
                            retryCount: nextRetry, 
                            status: 'failed', 
                            note: data?.message || `HTTP Error ${httpStatus}` 
                        });
                        failedCount++;
                        window.dispatchEvent(new CustomEvent('sync-item-failed', { 
                            detail: { item, reason: data?.message || `HTTP Error ${httpStatus}` } 
                        }));
                        continue; // Proceed with next item
                    } else {
                        // For 5xx or server timeout issues, increment retry count and break to wait
                        await db.sync_queue.update(item.uuid, { retryCount: nextRetry });
                        break; 
                    }
                }
            } catch (e) {
                console.error(`[SyncService] Unexpected error for item ${item.uuid}:`, e);
                const currentRetry = item.retryCount || 0;
                const nextRetry = currentRetry + 1;
                
                // Differentiate Network Errors
                const isNetworkError = e.name === 'TypeError' || e.message?.toLowerCase().includes('fetch');

                if (isNetworkError) {
                    await db.sync_queue.update(item.uuid, { retryCount: nextRetry });
                    break; // Stop and retry later when connection is stable
                } else {
                    // Internal JS error or data parsing issue, mark as failed and continue
                    await db.sync_queue.update(item.uuid, { 
                        retryCount: nextRetry, 
                        status: 'failed', 
                        note: e.message 
                    });
                    failedCount++;
                    window.dispatchEvent(new CustomEvent('sync-item-failed', { detail: { item, reason: e.message } }));
                    continue;
                }
            }
        }

        if (syncedCount > 0 || failedCount > 0) {
            triggerDataRefresh();
            window.dispatchEvent(new CustomEvent('sync-complete', { detail: { count: syncedCount, failedCount } }));
        }

    } finally {
        isSyncing = false;
    }
};

export const startBackgroundSync = () => {
    // Listen for online events
    window.addEventListener('online', async () => {
        console.log('[SyncService] Back online. Triggering sync.');
        await syncQueueToServer();
        await hydrateLocalDB();
        // Dispatch event to refresh UI
        window.dispatchEvent(new Event('dashboard-refresh'));
    });

    // Check periodically just in case
    setInterval(async () => {
        if (navigator.onLine) {
            await syncQueueToServer();
        }
    }, 60000); // Check every minute
};
