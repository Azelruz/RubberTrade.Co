import db from './db';
import Dexie from 'dexie';

import { supabase } from '../utils/supabase';
import { clearAllCache } from './apiService';

const directFetch = async (endpoint, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        },
    };

    const response = await fetch(`/api${endpoint}`, config);
    if (!response.ok) throw new Error(`API Error ${response.status}`);
    return await response.json();
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
            { path: '/chemicals', table: 'chemicals' },
            { path: '/promotions', table: 'promotions' },
            { path: '/settings', table: 'settings' }
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
        const queue = await db.sync_queue.orderBy('createdAt').toArray();
        if (queue.length === 0) {
            isSyncing = false;
            return;
        }

        console.log(`[SyncService] Starting sync of ${queue.length} items`);
        let syncedCount = 0;

        for (const item of queue) {
            try {
                let endpointTemplate = `/${item.type}`; 
                
                if (item.type === 'member_types' || item.type === 'farmer_types') {
                    endpointTemplate = '/member-types';
                }
                
                const data = await directFetch(endpointTemplate, {
                    method: item.action,
                    body: JSON.stringify(item.payload)
                });

                // data is decoded JSON from directFetch
                // CRITICAL FIX: Only delete from local queue if SERVER confirmed success.
                // If status is 'error', keep it in the queue for a retry later.
                if (data && data.status === 'success') {
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
                    console.error(`[SyncService] Server reported failure for item ${item.uuid}:`, data);
                    break; // Stop sync loop if we hit a server error
                }
            } catch (e) {
                console.error(`[SyncService] Network or API error for item ${item.uuid}:`, e);
                break; 
            }
        }

        if (syncedCount > 0) {
            clearAllCache();
            window.dispatchEvent(new CustomEvent('sync-complete', { detail: { count: syncedCount } }));
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
