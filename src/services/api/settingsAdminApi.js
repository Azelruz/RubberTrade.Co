import { fetchAPI, getCache, setCache, clearCache, triggerDataRefresh } from './apiClient';
import db from '../db';

export const fetchDashboardData = async (force = false) => {
    if (!force) {
        const cached = getCache('dashboard');
        if (cached) return cached;
    }
    
    const serveOfflineDashboard = () => {
        const cached = getCache('dashboard');
        if (cached) return cached;
        return { 
           stats: { summaryCurrentMonth: { buys: 0, sells: 0, balance: 0 } }, 
           recentRecords: [], 
           inventory: { totalStock: 0 }, 
           dailyPriceObj: null 
        };
    };

    if (!navigator.onLine) {
        return serveOfflineDashboard();
    }

    try {
        const res = await fetchAPI('/dashboard');
        if (res && !res.status) setCache('dashboard', res);
        return res;
    } catch (e) {
        return serveOfflineDashboard();
    }
};

export const fetchGlobalSearch = async (query) => {
    if (!query || query.length < 2) return { results: {} };
    return await fetchAPI(`/global-search?q=${encodeURIComponent(query)}`);
};

export const fetchBackupHistory = async () => {
    return await fetchAPI('/backup');
};

export const triggerBackup = async () => {
    return await fetchAPI('/backup', { method: 'POST' });
};

export const deleteBackup = async (id) => {
    return await fetchAPI(`/backup?id=${id}`, { method: 'DELETE' });
};

export const fetchWeatherForecast = async () => {
    return await fetchAPI('/forecast');
};

export const fetchQueues = async () => {
    return await fetchAPI('/queue');
};

export const addQueue = async (payload) => {
    return await fetchAPI('/queue', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
};

export const updateQueue = async (payload) => {
    return await fetchAPI('/queue', {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
};

export const fetchPublicQueues = async (storeId) => {
    const response = await fetch(`/api/queue/public?storeId=${storeId}`);
    if (!response.ok) throw new Error("Failed to fetch public queues");
    return await response.json();
};

export const getSettings = async () => {
    const switchedStoreId = localStorage.getItem('rt_active_store_id');

    if (navigator.onLine) {
        try {
            const res = await fetchAPI('/settings');
            if (res && typeof res === 'object' && !res.error) {
                if (!switchedStoreId) {
                    try {
                        const entries = Object.keys(res).map(k => ({ key: k, value: String(res[k]) }));
                        await db.settings.bulkPut(entries);
                    } catch {}
                }
                return { status: 'success', data: res };
            }
        } catch (err) {
            console.warn('[getSettings API failed, falling back to local DB]', err);
        }
    }

    try {
        const local = await db.settings.toArray();
        if (local && local.length > 0) {
            const dataObj = {};
            local.forEach(s => dataObj[s.key] = s.value);
            return { status: 'success', data: dataObj };
        }
    } catch {}

    return { status: 'success', data: {} };
};

export const updateSettingsAPI = async (payload) => {
    if (!navigator.onLine) return { status: 'offline' };
    const res = await fetchAPI('/settings', { method: 'POST', body: { action: 'updateSettings', payload } });
    clearCache('dashboard', 'settings', 'dailyPrice');

    const switchedStoreId = localStorage.getItem('rt_active_store_id');
    if (!switchedStoreId && payload) {
        try {
            const entries = Object.keys(payload).map(k => ({ key: k, value: String(payload[k]) }));
            await db.settings.bulkPut(entries);
        } catch (e) {
            console.warn('Failed to update local Dexie settings:', e);
        }
    }

    triggerDataRefresh();
    window.dispatchEvent(new CustomEvent('price-updated', { detail: { payload } }));
    window.dispatchEvent(new CustomEvent('settings-updated', { detail: { payload } }));
    
    return res;
};

export const fetchDailyPrice = async (force = false) => {
    try {
        if (force) clearCache('dashboard', 'settings', 'dailyPrice');
        const settingsRes = await getSettings();
        if (settingsRes && settingsRes.status === 'success' && settingsRes.data?.daily_price) {
            return { 
                status: 'success', 
                data: { 
                    price: String(settingsRes.data.daily_price), 
                    cupLumpPrice: String(settingsRes.data.cupLumpPrice || '0'),
                    date: new Date().toISOString().split('T')[0] 
                } 
            };
        }
        const dash = await fetchDashboardData(force);
        return { status: 'success', data: dash?.dailyPrice || { price: "0", date: new Date().toISOString().split('T')[0] } };
    } catch {
        return { status: 'success', data: { price: "0", date: new Date().toISOString().split('T')[0] } };
    }
};

export const updateDailyPriceAPI = async (price) => {
    if (!navigator.onLine) return { status: 'offline' };
    const res = await fetchAPI('/settings', { method: 'POST', body: { action: 'updateDailyPrice', payload: { price } } });
    if (res.status === 'success') {
        clearCache('dashboard', 'settings', 'dailyPrice');
        triggerDataRefresh();
        window.dispatchEvent(new CustomEvent('price-updated', { detail: { price } }));
    }
    return res;
};

export const saveReceiptImageToDrive = async (base64Data, filename) => {
    if (!navigator.onLine) return { status: 'success', url: 'offline_queue_' + filename };

    let payloadBase64 = base64Data;
    // Auto-compress large images (>400KB) before sending to /upload
    try {
        if (typeof window !== 'undefined' && base64Data && base64Data.length > 500000) {
            const { compressImage } = await import('../../utils/imageCompressor');
            const compressed = await compressImage(base64Data, { maxWidth: 1600, quality: 0.8 });
            if (compressed && compressed.base64) {
                payloadBase64 = compressed.base64;
            }
        }
    } catch (e) {
        console.warn('Auto image compression skipped in saveReceiptImageToDrive:', e);
    }

    const res = await fetchAPI('/upload', { method: 'POST', body: { base64: payloadBase64, filename: filename } });
    return res;
};

export const sendLineReceipt = async (farmerId, receiptUrl) => {
    if (!navigator.onLine) return { status: 'success' };
    const res = await fetchAPI('/send-line-receipt', { method: 'POST', body: { farmerId, receiptUrl } });
    return res;
};

export const broadcastPrice = async (newPrice, imageUrl) => {
    if (!navigator.onLine) return { status: 'offline' };
    const res = await fetchAPI('/broadcast-price', { method: 'POST', body: { newPrice, imageUrl } });
    return res;
};

export const deleteReceiptFileToDrive = async (fileUrl) => {
    return { status: 'demo', message: 'Demo mode: no file deleted' };
};

// --- Subscription API ---
export const getSubscriptionStatus = async () => {
    return await fetchAPI('/subscriptions');
};

export const submitSubscriptionRequest = async (base64, filename, amount, packageName, requestedDays) => {
    return await fetchAPI('/subscriptions', { method: 'POST', body: { base64, filename, amount, packageName, requestedDays } });
};

export const adminFetchPendingRequests = async () => {
    return await fetchAPI('/admin/subscriptions');
};

export const adminActionSubscription = async (requestId, action, days = 30) => {
    return await fetchAPI('/admin/subscriptions', { method: 'POST', body: { requestId, action, days } });
};

// --- Package API ---
export const fetchPackages = async () => {
    return await fetchAPI('/packages');
};

export const adminCreatePackage = async (payload) => {
    return await fetchAPI('/admin/packages', { method: 'POST', body: { action: 'create', payload } });
};

export const adminDeletePackage = async (id) => {
    return await fetchAPI('/admin/packages', { method: 'POST', body: { action: 'delete', id } });
};

export const adminFetchAllMembers = async () => {
    return await fetchAPI('/admin/subscriptions?type=members');
};

export const adminUpdateUserSubscription = async (userId, status, expiry, maxStaffLimit) => {
    return await fetchAPI('/admin/subscriptions', { 
        method: 'PATCH', 
        body: { userId, subscription_status: status, subscription_expiry: expiry, maxStaffLimit } 
    });
};

export const adminFetchBankSettings = async () => {
    return await fetchAPI('/admin/subscriptions?type=settings');
};

export const adminUpdateBankSettings = async (payload) => {
    return await fetchAPI('/admin/subscriptions', { method: 'POST', body: { action: 'update_bank_info', payload } });
};

export const adminFetchSubscriptionDashboard = async () => {
    return await fetchAPI('/admin/subscription-dashboard');
};

// --- Super Admin Reports API ---
export const adminFetchReportUsers = async () => {
    return await fetchAPI('/admin/reports?action=getUsers');
};

export const adminFetchReportData = async (action, params) => {
    const queryParams = new URLSearchParams(params).toString();
    return await fetchAPI(`/admin/reports?action=${action}&${queryParams}`);
};

export const adminFetchUsageStats = async (userId) => {
    return await fetchAPI(`/admin/usage?action=getStats&userId=${userId}`);
};

export const adminTriggerBackfill = async () => {
    return await fetchAPI('/admin/usage?action=backfill');
};

// --- Super Admin Branch Management API ---
export const adminFetchBranches = async () => {
    return await fetchAPI('/admin/branches');
};

export const adminRegisterBranch = async (branchData) => {
    return await fetchAPI('/admin/branches', { method: 'POST', body: branchData });
};

export const adminDeleteBranch = async (slug) => {
    return await fetchAPI('/admin/branches', { method: 'POST', body: { action: 'delete', slug } });
};

export const adminToggleBranchStatus = async (slug) => {
    return await fetchAPI('/admin/branches', { method: 'POST', body: { action: 'toggle_status', slug } });
};

// --- Database Management API ---
export const adminExportTable = async (userId, table) => {
    return await fetchAPI(`/admin/database?action=export&userId=${userId}&table=${table}`);
};

export const adminImportTable = async (userId, table, data, purge = false) => {
    const url = `/admin/database?action=import&userId=${userId}&table=${table}${purge ? '&purge=true' : ''}`;
    return await fetchAPI(url, {
        method: 'POST',
        body: data
    });
};

export const fetchNotificationStats = async () => {
    return await fetchAPI('/notifications');
};

export const fetchActivityLogs = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await fetchAPI(`/audit-logs?${query}`);
};

// --- Team Management API ---
export const fetchTeamMembers = async () => {
    return await fetchAPI('/team');
};

export const inviteTeamMember = async (email) => {
    return await fetchAPI('/team', { method: 'POST', body: { action: 'invite', email } });
};

export const removeTeamMember = async (userId) => {
    return await fetchAPI('/team', { method: 'POST', body: { action: 'remove', userId } });
};

// --- General Services & Service Queues API ---
export const fetchServiceCatalog = async () => {
    const { offlineRead } = await import('./apiClient');
    return await offlineRead('service_catalog', '/services/catalog');
};

export const addServiceCatalog = async (payload) => {
    const { offlineWrite } = await import('./apiClient');
    return await offlineWrite('service_catalog', '/services/catalog', payload);
};

export const updateServiceCatalog = async (id, payload) => {
    const { offlineWrite } = await import('./apiClient');
    return await offlineWrite('service_catalog', `/services/catalog/${id}`, payload, 'POST');
};

export const deleteServiceCatalog = async (id) => {
    const { deleteRecord } = await import('./apiClient');
    return await deleteRecord('service_catalog', id);
};

export const fetchServiceQueues = async () => {
    const { offlineRead } = await import('./apiClient');
    return await offlineRead('service_queues', '/services/queues');
};

export const addServiceQueue = async (payload) => {
    const { offlineWrite } = await import('./apiClient');
    return await offlineWrite('service_queues', '/services/queues', payload);
};

export const updateServiceQueue = async (id, payload) => {
    const { offlineWrite } = await import('./apiClient');
    return await offlineWrite('service_queues', `/services/queues/${id}`, payload, 'POST');
};

export const deleteServiceQueue = async (id) => {
    const { deleteRecord } = await import('./apiClient');
    return await deleteRecord('service_queues', id);
};

export const checkStationCodeAPI = async (code) => {
    if (!navigator.onLine) return { status: 'success', isAvailable: true };
    return await fetchAPI('/settings', { method: 'POST', body: { action: 'checkStationCode', payload: { code } } });
};

export const generateUniqueStationCodeAPI = async (prefix = 'RTB') => {
    if (!navigator.onLine) return { status: 'success', code: prefix };
    return await fetchAPI('/settings', { method: 'POST', body: { action: 'generateStationCode', payload: { prefix } } });
};
