// Get this URL after deploying Code.gs as a Web App
// For now, read from localStorage to allow dynamic update from Settings
let SCRIPT_URL = localStorage.getItem('sheet_api_url') || '';

export const updateScriptUrl = (url) => {
    SCRIPT_URL = url;
    localStorage.setItem('sheet_api_url', url);
    clearAllCache(); // Invalidate all caches when URL changes
};

export const getScriptUrl = () => {
    return SCRIPT_URL;
}

// --- Simple in-session cache (lives as long as the browser tab is open) ---
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

// Call with specific keys to invalidate, or no args to use clearAllCache
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

// Check if a cache key exists (synchronous) — used by pages to skip loading spinner
export const isCached = (...keys) => {
    try {
        return keys.every(k => !!sessionStorage.getItem('gc_' + k));
    } catch { return false; }
};

// Internal generic fetch wrapper for Google Apps Script
// GAS requires following redirects and often struggles with CORS preflights when headers are complex
const fetchGAS = async (url, options = {}) => {
    try {
        const isPost = options.method === 'POST';

        // For GET requests to GAS, we can just use normal fetch
        // For POST requests to GAS, we must send as text/plain to avoid CORS preflight (OPTIONS) request
        const fetchOptions = {
            method: options.method || 'GET',
            redirect: 'follow', // Crucial for GAS Web Apps which always redirect from script.google.com to script.googleusercontent.com
        };

        if (isPost && options.body) {
            fetchOptions.headers = {
                'Content-Type': 'text/plain;charset=utf-8',
            };
            fetchOptions.body = options.body;
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON from GAS:", text);
            throw new Error("Invalid response format from server");
        }
    } catch (error) {
        console.error("GAS Fetch Error:", error);
        throw error;
    }
};

export const setupSheets = async () => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    return await fetchGAS(`${SCRIPT_URL}?action=setup`);
};

export const loginUser = async (username, password) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    return await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'login',
            username,
            password
        })
    });
};

// --- Batch endpoint (1 call = all dashboard data) ---
export const fetchDashboardData = async (force = false) => {
    if (!SCRIPT_URL) return null;
    if (!force) {
        const cached = getCache('dashboard');
        if (cached) return cached;
    }
    const res = await fetchGAS(`${SCRIPT_URL}?action=getDashboardData`);
    // res is a plain object { buys, sells, expenses, wages, staff, dailyPrice }
    if (res && typeof res === 'object' && !res.status) {
        setCache('dashboard', res);
        return res;
    }
    return null;
};

export const fetchBuyRecords = async () => {
    if (!SCRIPT_URL) return { status: 'error', message: "No API URL" };
    const cached = getCache('buys');
    if (cached) return cached;
    const res = await fetchGAS(`${SCRIPT_URL}?action=getBuyRecords`);
    if (Array.isArray(res)) setCache('buys', res);
    return res;
};

export const fetchSellRecords = async () => {
    if (!SCRIPT_URL) return { status: 'error', message: "No API URL" };
    const cached = getCache('sells');
    if (cached) return cached;
    const res = await fetchGAS(`${SCRIPT_URL}?action=getSellRecords`);
    if (Array.isArray(res)) setCache('sells', res);
    return res;
};

export const getSettings = async () => {
    if (!SCRIPT_URL) return { status: 'error', message: "No API URL" };
    return await fetchGAS(`${SCRIPT_URL}?action=getSettings`);
};

export const updateSettingsAPI = async (payload) => {
    if (!SCRIPT_URL) return { status: 'error', message: "No API URL" };
    return await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'updateSettings',
            payload
        })
    });
};

export const addBuyRecord = async (payload) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    const res = await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addBuyRecord', payload })
    });
    clearCache('dashboard', 'buys'); // invalidate related caches
    return res;
};

export const addSellRecord = async (payload) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    const res = await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addSellRecord', payload })
    });
    clearCache('dashboard', 'sells'); // invalidate related caches
    return res;
};

export const deleteRecord = async (sheetName, id) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    return await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'deleteRecord',
            sheetName,
            id
        })
    });
};

export const updateRecord = async (sheetName, id, updates) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    return await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'updateRecord',
            sheetName,
            id,
            updates
        })
    });
};

export const fetchFarmers = async () => {
    if (!SCRIPT_URL) return [];
    const cached = getCache('farmers');
    if (cached) return cached;
    const res = await fetchGAS(`${SCRIPT_URL}?action=getFarmers`);
    const data = Array.isArray(res) ? res : [];
    setCache('farmers', data);
    return data;
};

export const addFarmer = async (payload) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    const res = await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addFarmer', payload })
    });
    clearCache('farmers');
    return res;
};

export const fetchEmployees = async () => {
    if (!SCRIPT_URL) return [];
    const res = await fetchGAS(`${SCRIPT_URL}?action=getEmployees`);
    return Array.isArray(res) ? res : [];
};

export const fetchStaff = async () => {
    if (!SCRIPT_URL) return [];
    const cached = getCache('staff');
    if (cached) return cached;
    const res = await fetchGAS(`${SCRIPT_URL}?action=getStaff`);
    const data = Array.isArray(res) ? res : [];
    setCache('staff', data);
    return data;
};

export const addStaff = async (payload) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    const res = await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addStaff', payload })
    });
    clearCache('staff', 'dashboard');
    return res;
};

export const addEmployee = async (payload) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    return await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addEmployee', payload })
    });
};

export const fetchExpenses = async () => {
    if (!SCRIPT_URL) return [];
    const cached = getCache('expenses');
    if (cached) return cached;
    const res = await fetchGAS(`${SCRIPT_URL}?action=getExpenses`);
    const data = Array.isArray(res) ? res : [];
    setCache('expenses', data);
    return data;
};

export const addExpense = async (payload) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    const res = await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addExpense', payload })
    });
    clearCache('expenses', 'dashboard');
    return res;
};

export const fetchWages = async () => {
    if (!SCRIPT_URL) return [];
    const cached = getCache('wages');
    if (cached) return cached;
    const res = await fetchGAS(`${SCRIPT_URL}?action=getWages`);
    const data = Array.isArray(res) ? res : [];
    setCache('wages', data);
    return data;
};

export const addWage = async (payload) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    const res = await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addWage', payload })
    });
    clearCache('wages', 'dashboard');
    return res;
};

export const addBulkWages = async (payloads) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    const res = await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addBulkWages', payloads })
    });
    clearCache('wages', 'dashboard');
    return res;
};

export const fetchPromotions = async () => {
    if (!SCRIPT_URL) return [];
    const cached = getCache('promotions');
    if (cached) return cached;
    const res = await fetchGAS(`${SCRIPT_URL}?action=getPromotions`);
    const data = Array.isArray(res) ? res : [];
    setCache('promotions', data);
    return data;
};

export const addPromotion = async (payload) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    const res = await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addPromotion', payload })
    });
    clearCache('promotions');
    return res;
};

export const fetchDailyPrice = async () => {
    if (!SCRIPT_URL) {
        const p = localStorage.getItem('demo_daily_price') || "50";
        const d = localStorage.getItem('demo_daily_price_date') || new Date().toISOString().split('T')[0];
        return { status: 'success', data: { price: p, date: d } };
    }
    return await fetchGAS(`${SCRIPT_URL}?action=getDailyPrice`);
};

export const updateDailyPriceAPI = async (price) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    return await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'updateDailyPrice',
            payload: { price }
        })
    });
};

export const saveReceiptImageToDrive = async (base64Data, filename) => {
    if (!SCRIPT_URL) throw new Error("API URL is missing");
    return await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'saveReceiptImage',
            payload: { base64Data, filename }
        })
    });
};

export const deleteReceiptFileToDrive = async (fileUrl) => {
    if (!SCRIPT_URL) return { status: 'demo', message: 'Demo mode: no file deleted' };
    return await fetchGAS(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'deleteReceiptFile',
            fileUrl
        })
    });
};
