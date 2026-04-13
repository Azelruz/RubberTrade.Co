import { supabase } from '../utils/supabase';
import db from './db';

// API Service for Cloudflare D1 Backend
const API_BASE = '/api';

// --- Legacy exports for compatibility ---
export const getScriptUrl = () => 'cloudflare-d1';
export const updateScriptUrl = (url) => {};

// --- Simple in-session cache ---
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const getCache = (key) => {
    try {
        const raw = sessionStorage.getItem('gc_' + key);
        if (!raw) return null;
        const { data, expires } = JSON.parse(raw);
        if (Date.now() > expires) { sessionStorage.removeItem('gc_' + key); return null; }
        return data;
    } catch { return null; }
};

const setCache = (key, data) => {
    try {
        sessionStorage.setItem('gc_' + key, JSON.stringify({ data, expires: Date.now() + CACHE_TTL }));
    } catch {}
};

export const clearCache = (...keys) => {
    keys.forEach(k => { try { sessionStorage.removeItem('gc_' + k); } catch {} });
};

export const clearAllCache = () => {
    try {
        Object.keys(sessionStorage)
            .filter(k => k.startsWith('gc_'))
            .forEach(k => sessionStorage.removeItem(k));
    } catch {}
};

export const isCached = (...keys) => {
    try {
        const cachedKeys = ['farmers', 'employees', 'staff', 'factories', 'trucks', 'expenses', 'promotions', 'dailyPrice', 'settings', 'buys', 'sells', 'dashboard'];
        return keys.every(k => !!sessionStorage.getItem('gc_' + k));
    } catch { return false; }
};

// Data validation before writing or syncing
export const validateRecordData = (table, data) => {
    if (!data) return { valid: false, message: 'ไม่มีข้อมูล' };
    
    // Core fields check
    if (table === 'buys') {
        if (!data.farmerId) return { valid: false, message: 'กรุณาระบุรหัสเกษตรกร' };
        if (!data.weight || data.weight <= 0) return { valid: false, message: 'น้ำหนักต้องมากกว่า 0' };
    }
    
    if (table === 'sells') {
        if (!data.factoryId) return { valid: false, message: 'กรุณาระบุรหัสโรงงาน' };
        if (!data.weight || data.weight <= 0) return { valid: false, message: 'น้ำหนักต้องมากกว่า 0' };
    }

    if (table === 'farmers' || table === 'employees') {
        if (!data.name) return { valid: false, message: 'กรุณาระบุชื่อ' };
    }

    return { valid: true };
};

// Global refresh trigger for UI
export const triggerDataRefresh = () => {
    clearAllCache();
    window.dispatchEvent(new CustomEvent('dashboard-refresh', { detail: { timestamp: Date.now() } }));
    window.dispatchEvent(new CustomEvent('data-updated', { detail: { timestamp: Date.now() } }));
};


// Internal fetch wrapper
const fetchAPI = async (endpoint, options = {}) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const fetchOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            fetchOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.body) {
            fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) errorMessage = errorData.error;
                else if (errorData && errorData.message) errorMessage = errorData.message;
            } catch (e) {}
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        // If it's a TypeError (Network Error), dispatch a custom event to update the UI
        if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
             window.dispatchEvent(new Event('offline'));
        }
        console.error("API Fetch Error:", error);
        throw error;
    }
}

// --- HYBRID READ: Online = API, Offline = IndexedDB ---
const offlineRead = async (table, fallbackEndpoint) => {
    // ONLINE: Always fetch from API directly
    if (navigator.onLine) {
        const cached = getCache(table);
        if (cached) return cached;

        try {
            const res = await fetchAPI(fallbackEndpoint);
            const data = Array.isArray(res) ? res : (res?.data ? res.data : []);
            
            // Save to IndexedDB in background for offline use
            try {
                await db[table].clear();
                if (Array.isArray(data) && data.length > 0) {
                    await db[table].bulkPut(data);
                }
            } catch {}
            
            setCache(table, data);
            return data;
        } catch {
            // Network failed despite being "online" — fall through to local
        }
    }

    // OFFLINE: Read from local IndexedDB
    try {
        const localData = await db[table].toArray();
        if (localData && localData.length > 0) return localData;
    } catch {}
    
    // Last resort: session cache
    const cached = getCache(table);
    if (cached) return cached;
    
    return [];
};

// --- HYBRID WRITE: Online = API direct, Offline = queue ---
const offlineWrite = async (table, endpoint, payload, action = 'POST') => {
    // Validate data before proceeding
    const validation = validateRecordData(table, payload);
    if (!validation.valid) {
        throw new Error(validation.message);
    }

    const id = payload?.id || crypto.randomUUID();
    const finalPayload = { ...payload, id };

    
    // ONLINE: Send directly to API
    if (navigator.onLine) {
        try {
            const res = await fetchAPI(endpoint, { method: action, body: { payload: finalPayload } });
            
            // If server returned a new ID (e.g. replaced UUID with Human-Readable ID)
            const updatedItem = { ...finalPayload };
            if (res.status === 'success' && res.id && res.id !== id) {
                updatedItem.id = res.id;
                // Delete old UUID record if it was stored
                try { await db[table].delete(id); } catch {}
            }
            
            // Update local IndexedDB in background
            try {
                if (table !== 'settings') await db[table].put(updatedItem);
            } catch {}
            
            triggerDataRefresh();
            return res;
        } catch {
            // Network failed — fall through to offline queue
        }
    }

    // OFFLINE: Save locally + queue for later sync
    try {
        if (table !== 'settings') {
            await db[table].put(finalPayload);
        }
        
        await db.sync_queue.put({
            type: table,
            action,
            payload: { payload: finalPayload },
            status: 'pending',
            createdAt: Date.now(),
            uuid: crypto.randomUUID()
        });
        
        triggerDataRefresh();
        return { status: 'success', id };
    } catch (e) {
        console.error("[Offline Write] Error", e);
        throw e;
    }
};

// --- API Endpoints ---

export const setupSheets = async () => { return { status: 'success', message: 'D1 ready' }; };

export const loginUser = async (username, password) => { return await fetchAPI('/login', { method: 'POST', body: { username, password } }); };

export const fetchDashboardData = async (force = false) => {
    // Check local cache first unless forced
    if (!force) {
        const cached = getCache('dashboard');
        if (cached) return cached;
    }
    
    // Fallback block if strictly offline or if fetch fails
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

// Replace Read Operations with offlineRead
export const fetchFarmers = async () => await offlineRead('farmers', '/farmers');
export const fetchBuys = async () => await offlineRead('buys', '/buys'); // legacy or internal usage
export const fetchBuyRecords = async () => await offlineRead('buys', '/buys');
export const fetchSellRecords = async () => await offlineRead('sells', '/sells');
export const fetchEmployees = async () => await offlineRead('employees', '/employees');
export const fetchStaff = async () => await offlineRead('staff', '/staff');
export const fetchFactories = async () => await offlineRead('factories', '/factories');
export const fetchTrucks = async () => await offlineRead('trucks', '/trucks');
export const fetchExpenses = async () => await offlineRead('expenses', '/expenses');
export const fetchWages = async () => await offlineRead('wages', '/wages');
export const fetchPromotions = async () => await offlineRead('promotions', '/promotions');
export const fetchChemicalUsage = async () => await offlineRead('chemicals', '/chemicals');
export const fetchMemberTypes = async () => await offlineRead('farmer_types', '/member-types');

export const getSettings = async () => {
    try {
        const local = await db.settings.toArray();
        if (local && local.length > 0) {
            const dataObj = {};
            local.forEach(s => dataObj[s.key] = s.value);
            return { status: 'success', data: dataObj };
        }
    } catch {}
    try {
        const res = await fetchAPI('/settings');
        return { status: 'success', data: res };
    } catch {
        return { status: 'success', data: {} };
    }
};

// Replace Write Operations with offlineWrite
export const addFarmer = async (payload) => await offlineWrite('farmers', '/farmers', payload);
export const addEmployee = async (payload) => await offlineWrite('employees', '/employees', payload);
export const addStaff = async (payload) => await offlineWrite('staff', '/staff', payload);
export const addFactory = async (payload) => await offlineWrite('factories', '/factories', payload);
export const addTruck = async (payload) => await offlineWrite('trucks', '/trucks', payload);
export const addBuyRecord = async (payload) => await offlineWrite('buys', '/buys', payload);
export const addSellRecord = async (payload) => await offlineWrite('sells', '/sells', payload);
export const addExpense = async (payload) => await offlineWrite('expenses', '/expenses', payload);
export const addWage = async (payload) => await offlineWrite('wages', '/wages', payload);
export const addPromotion = async (payload) => await offlineWrite('promotions', '/promotions', payload);
export const addChemicalUsage = async (payload) => await offlineWrite('chemicals', '/chemicals', payload);
export const addMemberType = async (payload) => await offlineWrite('farmer_types', '/member-types', payload);

export const deleteMemberType = async (id) => {
    if (navigator.onLine) {
        const res = await fetchAPI(`/member-types?id=${id}`, { method: 'DELETE' });
        try { await db.farmer_types.delete(id); } catch {}
        triggerDataRefresh();
        return res;
    }
    // Offline delete
    await db.sync_queue.put({ type: 'farmer_types', action: 'DELETE', payload: { id }, status: 'pending', createdAt: Date.now(), uuid: crypto.randomUUID() });
    try { await db.farmer_types.delete(id); } catch {}
    triggerDataRefresh();
    return { status: 'success' };
};

// Complex or Custom Writes (Leaves as fetchAPI for now)
export const updateSettingsAPI = async (payload) => {
    if (!navigator.onLine) return { status: 'offline' };
    const res = await fetchAPI('/settings', { method: 'POST', body: { action: 'updateSettings', payload } });
    triggerDataRefresh();
    db.settings.clear(); 
    return res;
};

export const deleteRecord = async (sheetName, id) => {
    const table = sheetName.toLowerCase();
    
    // ONLINE: Delete via API directly
    if (navigator.onLine) {
        try {
            const res = await fetchAPI('/deleteRecord', { method: 'POST', body: { sheetName, id } });
            try { await db[table].delete(id); } catch {}
            triggerDataRefresh();
            return res;
        } catch {
            // Fall through to offline queue
        }
    }

    // OFFLINE: Queue for later sync
    await db.sync_queue.put({
        type: 'deleteRecord',
        action: 'POST',
        payload: { sheetName, id },
        status: 'pending',
        createdAt: Date.now(),
        uuid: crypto.randomUUID()
    });
    
    try { await db[table].delete(id); } catch {}
    triggerDataRefresh();
    return { status: 'success', message: 'Queued for deletion' };
};

export const updateRecord = async (sheetName, id, updates) => {
    const table = sheetName.toLowerCase();
    
    // ONLINE: Update via API directly
    if (navigator.onLine) {
        try {
            const res = await fetchAPI('/updateRecord', { method: 'POST', body: { sheetName, id, updates } });
            try { await db[table].update(id, updates); } catch {}
            triggerDataRefresh();
            return res;
        } catch {
            // Fall through to offline queue
        }
    }

    // OFFLINE: Queue for later sync
    await db.sync_queue.put({
        type: 'updateRecord',
        action: 'POST',
        payload: { sheetName, id, updates },
        status: 'pending',
        createdAt: Date.now(),
        uuid: crypto.randomUUID()
    });
    
    try { await db[table].update(id, updates); } catch {}
    triggerDataRefresh();
    return { status: 'success' };
};

export const addBulkWages = async (payloads) => {
    if (!navigator.onLine) return { status: 'offline' };
    const res = await fetchAPI('/wages', { method: 'POST', body: { action: 'addBulkWages', payloads } });
    triggerDataRefresh();
    return res;
};

export const fetchDailyPrice = async () => {
    try {
        const dash = await fetchDashboardData();
        return { status: 'success', data: dash?.dailyPrice || { price: "0", date: new Date().toISOString().split('T')[0] } };
    } catch {
        return { status: 'success', data: { price: "0", date: new Date().toISOString().split('T')[0] } };
    }
};

export const updateDailyPriceAPI = async (price) => {
    if (!navigator.onLine) return { status: 'offline' };
    const res = await fetchAPI('/settings', { method: 'POST', body: { action: 'updateDailyPrice', payload: { price } } });
    if (res.status === 'success') clearCache('dashboard');
    return res;
};

export const saveReceiptImageToDrive = async (base64Data, filename) => {
    if (!navigator.onLine) return { status: 'success', url: 'offline_queue_' + filename };
    const res = await fetchAPI('/upload', { method: 'POST', body: { base64: base64Data, filename: filename } });
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

export const bulkAddRecords = async (type, payloads) => {
    if (!navigator.onLine) return { status: 'offline' };
    let endpoint = `/${type}`;
    const res = await fetchAPI(endpoint, { method: 'POST', body: { action: 'bulk', payloads } });
    clearCache(type, 'dashboard');
    return res;
};

export const deleteReceiptFileToDrive = async (fileUrl) => {
    return { status: 'demo', message: 'Demo mode: no file deleted' };
};

export const deleteChemicalUsage = async (id) => {
    return await deleteRecord('chemicals', id);
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

export const adminUpdateUserSubscription = async (userId, status, expiry) => {
    return await fetchAPI('/admin/subscriptions', { 
        method: 'PATCH', 
        body: { userId, subscription_status: status, subscription_expiry: expiry } 
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



