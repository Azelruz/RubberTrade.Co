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
                
                // Special handling for settings object vs array
                if (ep.table === 'settings' && !Array.isArray(data) && typeof data === 'object' && !data.results) {
                   itemsToStore = Object.keys(data).filter(k => k !== 'status').map(k => ({ key: k, value: data[k] }));
                }

                if (itemsToStore && itemsToStore.length > 0) {
                    await db[ep.table].clear();
                    await db[ep.table].bulkPut(itemsToStore);
                }
            } catch (tableErr) {
                console.warn(`[SyncService] Failed to hydrate table ${ep.table}:`, tableErr.message);
                // Continue with other tables even if one fails
            }
        }

        // Re-apply offline queued records so they don't disappear from UI
        try {
            const pendingQueue = await db.sync_queue.toArray();
            for (const item of pendingQueue) {
                if (item.type !== 'settings' && db[item.type]) {
                    if (item.action === 'POST' || item.action === 'PUT') {
                        // Extract actual record data from nested payload if needed
                        const recordData = item.payload?.payload || item.payload;
                        if (recordData && Object.keys(recordData).length > 0) {
                            await db[item.type].put(recordData);
                        }
                    } else if (item.action === 'DELETE') {
                        // If there is an offline delete queued, remove it from local UI
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

        // Clear ALL session caches so UI reads from fresh IndexedDB
        clearAllCache();

        console.log('[SyncService] Local Database fully hydrated & caches cleared.');
        return { status: 'success' };
    } catch (e) {
        console.error('[SyncService] Failed to hydrate:', e);
        return { status: 'error', message: e.message };
    }
};

export const syncQueueToServer = async () => {
    if (!navigator.onLine) return;

    const queue = await db.sync_queue.orderBy('createdAt').toArray();
    if (queue.length === 0) return;

    console.log(`[SyncService] Starting sync of ${queue.length} items`);
    let syncedCount = 0;

    for (const item of queue) {
        try {
            const endpointTemplate = `/${item.type}`; 
            
            const res = await directFetch(endpointTemplate, {
                method: item.action,
                body: JSON.stringify(item.payload)
            });

            if (!res.ok) {
                throw new Error(`API Error ${res.status}`);
            }

            const data = await res.json();
            
            // Handle ID mapping if the server replaced a temporary UUID
            if (data.status === 'success' && data.id && data.id !== item.payload.id) {
                const oldId = item.payload.id;
                const newId = data.id;
                const table = item.table;
                
                try {
                    // Update the local record with the new ID
                    const record = await db[table].get(oldId);
                    if (record) {
                        await db[table].delete(oldId);
                        await db[table].put({ ...record, id: newId });
                    }
                    
                    // Update remaining sync queue to replace any foreign key references to the old UUID
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
            console.log(`[SyncService] Synced item ${item.uuid}`);

        } catch (e) {
            console.error(`[SyncService] Failed to sync item ${item.uuid}:`, e);
            break; 
        }
    }

    if (syncedCount > 0) {
        // Clear caches after sync so UI picks up server-side changes (e.g. generated IDs)
        clearAllCache();
        window.dispatchEvent(new CustomEvent('sync-complete', { detail: { count: syncedCount } }));
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
