import { supabase } from '../../utils/supabase';
import db from '../db';

// API Service Base for Cloudflare D1 Backend
export const API_BASE = '/api';

// --- Legacy exports for compatibility ---
export const getScriptUrl = () => 'cloudflare-d1';
export const updateScriptUrl = (url) => {};

// --- Simple in-session cache with fast in-memory RAM layer ---
const TTL_SHORT = 3 * 60 * 1000;  // 3 minutes (Dashboard, Transactions)
const TTL_LONG = 10 * 60 * 1000; // 10 minutes (Farmers, Factories, Employees, Staff, Trucks)

export const memoryCache = new Map();

export const getTTL = (key) => {
    const longTTLKeys = ['farmers', 'employees', 'staff', 'factories', 'trucks', 'settings', 'farmer_types', 'farmer_employees'];
    return longTTLKeys.includes(key) ? TTL_LONG : TTL_SHORT;
};

export const getCache = (key) => {
    try {
        const item = memoryCache.get(key);
        if (item) {
            if (Date.now() > item.expires) {
                memoryCache.delete(key);
                try { sessionStorage.removeItem('gc_' + key); } catch {}
                return null;
            }
            return item.data;
        }

        const raw = sessionStorage.getItem('gc_' + key);
        if (!raw) return null;
        const { data, expires } = JSON.parse(raw);
        if (Date.now() > expires) { sessionStorage.removeItem('gc_' + key); return null; }
        memoryCache.set(key, { data, expires });
        return data;
    } catch { return null; }
};

export const setCache = (key, data) => {
    try {
        const ttl = getTTL(key);
        const expires = Date.now() + ttl;
        memoryCache.set(key, { data, expires });
        sessionStorage.setItem('gc_' + key, JSON.stringify({ data, expires }));
    } catch {}
};

export const clearCache = (...keys) => {
    keys.forEach(k => { 
        memoryCache.delete(k);
        memoryCache.forEach((_, memKey) => {
            if (memKey.startsWith(k + ':')) memoryCache.delete(memKey);
        });
        try {
            sessionStorage.removeItem('gc_' + k);
            Object.keys(sessionStorage)
                .filter(sk => sk.startsWith('gc_' + k + ':'))
                .forEach(sk => sessionStorage.removeItem(sk));
        } catch {} 
    });
};

export const clearAllCache = () => {
    try {
        memoryCache.clear();
        Object.keys(sessionStorage)
            .filter(k => k.startsWith('gc_') || k.startsWith('rt_'))
            .forEach(k => sessionStorage.removeItem(k));
    } catch {}
};

export const isCached = (...keys) => {
    try {
        return keys.every(k => memoryCache.has(k) || !!sessionStorage.getItem('gc_' + k));
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

    if (table === 'trucks') {
        if (!data.licensePlate) return { valid: false, message: 'กรุณาระบุทะเบียนรถ' };
    }

    return { valid: true };
};

// --- Fast in-memory Supabase Session Cache to avoid navigator.locks contention on every API call ---
let cachedSession = null;
if (typeof window !== 'undefined') {
    supabase.auth.getSession().then(({ data }) => {
        if (data?.session) cachedSession = data.session;
    }).catch(() => {});
    supabase.auth.onAuthStateChange((_event, session) => {
        cachedSession = session || null;
    });
}

export const getFastSession = async () => {
    if (cachedSession?.access_token) {
        const expiresAtMs = (cachedSession.expires_at || 0) * 1000;
        // Use cached session if it has > 60s before expiry
        if (!expiresAtMs || Date.now() < expiresAtMs - 60000) {
            return cachedSession;
        }
    }
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) cachedSession = session;
        return session;
    } catch {
        return cachedSession;
    }
};

// Global refresh trigger for UI
export const triggerDataRefresh = (table = null) => {
    if (table === 'buys') {
        // Only invalidate buys & related financial/dashboard caches; keep static reference caches (farmers, employees, settings, member_types) intact!
        clearCache('buys', 'dashboard', 'farmer_buy_stats', 'loans', 'loan_deductions');
    } else if (table === 'sells') {
        clearCache('sells', 'stock_summary', 'dashboard');
    } else if (table) {
        clearCache(table, 'dashboard');
    } else {
        clearAllCache();
    }
    // Defer event dispatch to next macrotask so caller (e.g. Buy.jsx handlePrintReceipt) can open print dialog first
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('dashboard-refresh', { detail: { timestamp: Date.now(), table } }));
        window.dispatchEvent(new CustomEvent('data-updated', { detail: { timestamp: Date.now(), table } }));
    }, 0);
};

// Internal helper to ensure no 'undefined' values reach D1
export const sanitizePayload = (data) => {
    if (data === undefined) return null;
    if (data === null || typeof data !== 'object') return data;
    if (data instanceof Date) return data;
    if (Array.isArray(data)) return data.map(item => sanitizePayload(item));
    
    const clean = {};
    Object.keys(data).forEach(key => {
        clean[key] = sanitizePayload(data[key]);
    });
    return clean;
};

// Internal fetch wrapper
export const fetchAPI = async (endpoint, options = {}) => {
    try {
        const session = await getFastSession();
        const token = session?.access_token;
        const switchedStoreId = localStorage.getItem('rt_active_store_id');

        const fetchOptions = {
            method: options.method || 'GET',
            cache: options.cache || 'no-store',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            fetchOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        if (switchedStoreId) {
            fetchOptions.headers['X-Switch-Store-ID'] = switchedStoreId;
        }

        if (options.body) {
            const cleanBody = typeof options.body === 'string' ? options.body : sanitizePayload(options.body);
            fetchOptions.body = typeof cleanBody === 'string' ? cleanBody : JSON.stringify(cleanBody);
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
        if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
             window.dispatchEvent(new Event('offline'));
        }
        console.error("API Fetch Error:", error);
        throw error;
    }
};

// --- HYBRID READ: Online = API, Offline = IndexedDB ---
export const offlineRead = async (table, fallbackEndpoint, force = false) => {
    const switchedStoreId = localStorage.getItem('rt_active_store_id');
    const isPartialQuery = /[?&](startDate|endDate|search|page|since)=/.test(fallbackEndpoint || '');
    const cacheKey = isPartialQuery ? `${table}:${fallbackEndpoint}` : table;

    if (navigator.onLine) {
        if (!switchedStoreId && !force) {
            const cached = getCache(cacheKey);
            if (cached) return cached;
        }

        try {
            const res = await fetchAPI(fallbackEndpoint);
            const data = Array.isArray(res) 
                ? res 
                : (res?.results ? res.results : (res?.data ? res.data : []));
            
            if (!switchedStoreId) {
                try {
                    // Only clear the entire IndexedDB table on full-table reads;
                    // for filtered/date-range queries, upsert via bulkPut so other dates remain intact!
                    if (!isPartialQuery) {
                        await db[table].clear();
                    }
                    if (Array.isArray(data) && data.length > 0) {
                        await db[table].bulkPut(data);
                    }
                } catch {}
                setCache(cacheKey, data);
            }
            
            return data;
        } catch {}
    }

    if (!switchedStoreId) {
        try {
            const localData = await db[table].toArray();
            if (localData && localData.length > 0) return localData;
        } catch {}
    }
    
    if (!switchedStoreId) {
        const cached = getCache(cacheKey) || getCache(table);
        if (cached) return cached;
    }
    
    return [];
};

// --- HYBRID WRITE: Online = API direct, Offline = queue ---
export const offlineWrite = async (table, endpoint, payload, action = 'POST') => {
    const switchedStoreId = localStorage.getItem('rt_active_store_id');

    const validation = validateRecordData(table, payload);
    if (!validation.valid) {
        throw new Error(validation.message);
    }

    const id = payload?.id || crypto.randomUUID();
    const finalPayload = { ...payload, id };

    if (navigator.onLine) {
        try {
            const res = await fetchAPI(endpoint, { method: action, body: { payload: finalPayload } });
            
            const updatedItem = { ...finalPayload };
            if (res.status === 'success' && res.id && res.id !== id) {
                updatedItem.id = res.id;
                markPendingDelete(table, id);
                try { 
                    if (!switchedStoreId) await db[table].delete(id); 
                } catch {}
            }
            
            if (!switchedStoreId) {
                try {
                    if (table !== 'settings') await db[table].put(updatedItem);
                } catch {}
            }
            
            triggerDataRefresh(table);
            return res;
        } catch {}
    }

    if (switchedStoreId) {
        throw new Error('ไม่สามารถบันทึกข้อมูลแบบออฟไลน์ขณะแก้ไขข้อมูลแทนร้านค้าอื่นได้ กรุณาเชื่อมต่ออินเทอร์เน็ต');
    }

    try {
        if (table !== 'settings') {
            await db[table].put(finalPayload);
        }
        
        const session = await getFastSession();
        const currentUserId = session?.user?.id || null;

        await db.sync_queue.put({
            type: table,
            action,
            payload: { payload: finalPayload },
            userId: currentUserId,
            status: 'pending',
            retryCount: 0,
            createdAt: Date.now(),
            uuid: crypto.randomUUID()
        });
        
        triggerDataRefresh(table);
        return { status: 'success', id };
    } catch (e) {
        console.error("[Offline Write] Error", e);
        throw e;
    }
};

export const pendingDeletesSet = new Set();
export const pendingUpdatesMap = new Map();

export const markPendingDelete = (table, id) => {
    if (table && id) {
        pendingDeletesSet.add(`${String(table).toLowerCase()}:${String(id)}`);
    }
};

export const getPendingDeletes = (sheetName) => {
    const table = (sheetName || '').toLowerCase();
    const result = new Set();
    pendingDeletesSet.forEach(key => {
        const [tbl, id] = key.split(':');
        if (tbl === table) result.add(String(id));
    });
    return result;
};

export const getPendingUpdates = (sheetName) => {
    const table = (sheetName || '').toLowerCase();
    const result = new Map();
    pendingUpdatesMap.forEach((val, key) => {
        const [tbl, id] = key.split(':');
        if (tbl === table) result.set(String(id), val);
    });
    return result;
};

export const deleteRecord = async (sheetName, id) => {
    const table = sheetName.toLowerCase();
    const switchedStoreId = localStorage.getItem('rt_active_store_id');
    
    pendingDeletesSet.add(`${table}:${String(id)}`);
    
    if (navigator.onLine) {
        try {
            const res = await fetchAPI('/deleteRecord', { method: 'POST', body: { sheetName, id } });
            try { await db[table].delete(id); } catch {}
            triggerDataRefresh(table);
            return res;
        } catch {}
    }

    if (switchedStoreId) {
        throw new Error('ไม่สามารถลบข้อมูลแบบออฟไลน์ขณะแก้ไขข้อมูลแทนร้านค้าอื่นได้ กรุณาเชื่อมต่ออินเทอร์เน็ต');
    }

    const sess2 = await getFastSession();
    await db.sync_queue.put({
        type: 'deleteRecord',
        action: 'POST',
        payload: { sheetName, id },
        userId: sess2?.user?.id || null,
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
        uuid: crypto.randomUUID()
    });
    
    try { await db[table].delete(id); } catch {}
    triggerDataRefresh(table);
    return { status: 'success', message: 'Queued for deletion' };
};

export const updateRecord = async (sheetName, id, updates, options = {}) => {
    const table = sheetName.toLowerCase();
    const switchedStoreId = localStorage.getItem('rt_active_store_id');
    const silent = Boolean(options?.silent);
    
    const key = `${table}:${String(id)}`;
    const existing = pendingUpdatesMap.get(key) || {};
    pendingUpdatesMap.set(key, { ...existing, ...updates });

    if (navigator.onLine) {
        try {
            const res = await fetchAPI('/updateRecord', { method: 'POST', body: { sheetName, id, updates } });
            try { await db[table].update(id, updates); } catch {}
            if (!silent) triggerDataRefresh(table);
            else clearCache(table);
            return res;
        } catch {}
    }

    if (switchedStoreId) {
        throw new Error('ไม่สามารถแก้ไขข้อมูลแบบออฟไลน์ขณะแก้ไขข้อมูลแทนร้านค้าอื่นได้ กรุณาเชื่อมต่ออินเทอร์เน็ต');
    }

    const sess3 = await getFastSession();
    await db.sync_queue.put({
        type: 'updateRecord',
        action: 'POST',
        payload: { sheetName, id, updates },
        userId: sess3?.user?.id || null,
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now(),
        uuid: crypto.randomUUID()
    });
    
    try { await db[table].update(id, updates); } catch {}
    if (!silent) triggerDataRefresh(table);
    else clearCache(table);
    return { status: 'success' };
};

export const bulkAddRecords = async (type, payloads) => {
    if (!navigator.onLine) return { status: 'offline' };
    let endpoint = `/${type}`;
    const res = await fetchAPI(endpoint, { method: 'POST', body: { action: 'bulk', payloads } });
    clearCache(type, 'dashboard');
    return res;
};

export const setupSheets = async () => { return { status: 'success', message: 'D1 ready' }; };

export const loginUser = async (username, password) => { 
    return await fetchAPI('/login', { method: 'POST', body: { username, password } }); 
};
