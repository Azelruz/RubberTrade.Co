// API Service for Cloudflare D1 Backend

// When running locally with Wrangler, Pages Functions are served at the same host
// In production, they are also on the same host (e.g. /api/buys)
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

// Internal fetch wrapper
const fetchAPI = async (endpoint, options = {}) => {
    try {
        const fetchOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error) errorMessage = errorData.error;
                else if (errorData && errorData.message) errorMessage = errorData.message;
            } catch (e) {
                // Not a JSON error response
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        console.error("API Fetch Error:", error);
        throw error;
    }
}

// --- API Endpoints ---

export const setupSheets = async () => {
    // Legacy setup, not strictly needed for D1 but keeping for compatibility
    return { status: 'success', message: 'D1 ready' };
};

export const loginUser = async (username, password) => {
    try {
        const res = await fetchAPI('/login', {
            method: 'POST',
            body: { username, password }
        });
        return res;
    } catch (error) {
        return { status: 'error', message: error.message };
    }
};

export const fetchDashboardData = async (force = false) => {
    if (!force) {
        const cached = getCache('dashboard');
        if (cached) return cached;
    }
    const res = await fetchAPI('/dashboard');
    if (res && typeof res === 'object' && !res.status) {
        setCache('dashboard', res);
        return res;
    }
    return null;
};

export const fetchBuyRecords = async () => {
    const cached = getCache('buys');
    if (cached) return cached;
    const res = await fetchAPI('/buys');
    if (Array.isArray(res)) setCache('buys', res);
    return res;
};

export const fetchSellRecords = async () => {
    const cached = getCache('sells');
    if (cached) return cached;
    const res = await fetchAPI('/sells');
    if (Array.isArray(res)) setCache('sells', res);
    return res;
};

export const getSettings = async () => {
    const res = await fetchAPI('/settings');
    // Wrap to match old structure: { status: 'success', data: { daily_price: '50' } }
    return { status: 'success', data: res };
};

export const updateSettingsAPI = async (payload) => {
    return await fetchAPI('/settings', {
        method: 'POST',
        body: { action: 'updateSettings', payload }
    });
};

export const addBuyRecord = async (payload) => {
    const res = await fetchAPI('/buys', { method: 'POST', body: { payload } });
    clearCache('dashboard', 'buys');
    return res;
};

export const addSellRecord = async (payload) => {
    const res = await fetchAPI('/sells', { method: 'POST', body: { payload } });
    clearCache('dashboard', 'sells');
    return res;
};

export const deleteRecord = async (sheetName, id) => {
    const res = await fetchAPI('/deleteRecord', {
        method: 'POST',
        body: { sheetName, id }
    });
    // Clear relevant caches
    const table = sheetName.toLowerCase();
    clearCache(table, 'dashboard');
    return res;
};

export const updateRecord = async (sheetName, id, updates) => {
    const res = await fetchAPI('/updateRecord', {
        method: 'POST',
        body: { sheetName, id, updates }
    });
    // Clear relevant caches
    const table = sheetName.toLowerCase();
    clearCache(table, 'dashboard');
    return res;
};

export const fetchFarmers = async () => {
    const cached = getCache('farmers');
    if (cached) return cached;
    const res = await fetchAPI('/farmers');
    const data = Array.isArray(res) ? res : [];
    setCache('farmers', data);
    return data;
};

export const addFarmer = async (payload) => {
    const res = await fetchAPI('/farmers', { method: 'POST', body: { payload } });
    clearCache('farmers');
    return res;
};

export const fetchEmployees = async () => {
    const cached = getCache('employees');
    if (cached) return cached;
    const res = await fetchAPI('/employees');
    const data = Array.isArray(res) ? res : [];
    setCache('employees', data);
    return data;
};

export const fetchStaff = async () => {
    const cached = getCache('staff');
    if (cached) return cached;
    const res = await fetchAPI('/staff');
    const data = Array.isArray(res) ? res : [];
    setCache('staff', data);
    return data;
};

export const fetchFactories = async () => {
    const cached = getCache('factories');
    if (cached) return cached;
    const res = await fetchAPI('/factories');
    const data = Array.isArray(res) ? res : [];
    setCache('factories', data);
    return data;
};

export const fetchTrucks = async () => {
    const cached = getCache('trucks');
    if (cached) return cached;
    const res = await fetchAPI('/trucks');
    const data = Array.isArray(res) ? res : [];
    setCache('trucks', data);
    return data;
};

export const addFactory = async (payload) => {
    const res = await fetchAPI('/factories', { method: 'POST', body: { payload } });
    clearCache('factories');
    return res;
};

export const addTruck = async (payload) => {
    const res = await fetchAPI('/trucks', { method: 'POST', body: { payload } });
    clearCache('trucks');
    return res;
};

export const addStaff = async (payload) => {
    const res = await fetchAPI('/staff', { method: 'POST', body: { payload } });
    clearCache('staff', 'dashboard');
    return res;
};

export const addEmployee = async (payload) => {
    const res = await fetchAPI('/employees', { method: 'POST', body: { payload } });
    clearCache('employees', 'dashboard');
    return res;
};

export const fetchExpenses = async () => {
    const cached = getCache('expenses');
    if (cached) return cached;
    const res = await fetchAPI('/expenses');
    const data = Array.isArray(res) ? res : [];
    setCache('expenses', data);
    return data;
};

export const addExpense = async (payload) => {
    const res = await fetchAPI('/expenses', { method: 'POST', body: { payload } });
    clearCache('expenses', 'dashboard');
    return res;
};

export const fetchWages = async () => {
    const cached = getCache('wages');
    if (cached) return cached;
    const res = await fetchAPI('/wages');
    const data = Array.isArray(res) ? res : [];
    setCache('wages', data);
    return data;
};

export const addWage = async (payload) => {
    const res = await fetchAPI('/wages', { method: 'POST', body: { payload } });
    clearCache('wages', 'dashboard');
    return res;
};

export const addBulkWages = async (payloads) => {
    const res = await fetchAPI('/wages', { method: 'POST', body: { action: 'addBulkWages', payloads } });
    clearCache('wages', 'dashboard');
    return res;
};

export const fetchPromotions = async () => {
    const cached = getCache('promotions');
    if (cached) return cached;
    const res = await fetchAPI('/promotions');
    const data = Array.isArray(res) ? res : [];
    setCache('promotions', data);
    return data;
};

export const addPromotion = async (payload) => {
    const res = await fetchAPI('/promotions', { method: 'POST', body: { payload } });
    clearCache('promotions');
    return res;
};

export const fetchChemicalUsage = async () => {
    const res = await fetchAPI('/chemicals');
    return Array.isArray(res) ? res : [];
};

export const addChemicalUsage = async (payload) => {
    const res = await fetchAPI('/chemicals', { method: 'POST', body: { payload } });
    clearCache('dashboard');
    return res;
};

export const deleteChemicalUsage = async (id) => {
    const res = await fetchAPI(`/chemicals?id=${id}`, { method: 'DELETE' });
    clearCache('dashboard');
    return res;
};

export const fetchDailyPrice = async () => {
    const res = await fetchAPI('/dashboard');
    return { 
        status: 'success', 
        data: res?.dailyPrice || { price: "0", date: new Date().toISOString().split('T')[0] } 
    };
};

export const updateDailyPriceAPI = async (price) => {
    const res = await fetchAPI('/settings', {
        method: 'POST',
        body: { action: 'updateDailyPrice', payload: { price } }
    });
    if (res.status === 'success') {
        clearCache('dashboard');
    }
    return res;
};

export const saveReceiptImageToDrive = async (base64Data, filename) => {
    const res = await fetchAPI('/upload', {
        method: 'POST',
        body: { base64: base64Data, filename: filename }
    });
    return res;
};

export const sendLineReceipt = async (farmerId, receiptUrl) => {
    const res = await fetchAPI('/send-line-receipt', {
        method: 'POST',
        body: { farmerId, receiptUrl }
    });
    return res;
};

export const broadcastPrice = async (newPrice, imageUrl) => {
    const res = await fetchAPI('/broadcast-price', {
        method: 'POST',
        body: { newPrice, imageUrl }
    });
    return res;
};

export const deleteReceiptFileToDrive = async (fileUrl) => {
    return { status: 'demo', message: 'Demo mode: no file deleted' };
};
