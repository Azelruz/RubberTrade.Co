import { fetchAPI, offlineRead, offlineWrite, getCache, setCache } from './apiClient';

export const fetchSellRecords = async (force = false, dateParams = null) => {
    let endpoint = '/sells';
    if (dateParams) {
        if (typeof dateParams === 'string') {
            endpoint = `/sells?startDate=${dateParams}&endDate=${dateParams}`;
        } else if (typeof dateParams === 'object') {
            const query = new URLSearchParams(dateParams).toString();
            if (query) endpoint = `/sells?${query}`;
        }
    }
    return await offlineRead('sells', endpoint, force);
};

export const fetchStockSummary = async (force = false) => {
    if (!force) {
        const cached = getCache('stock_summary');
        if (cached) return cached;
    }
    if (!navigator.onLine) {
        const cached = getCache('stock_summary');
        return cached || { currentStock: 0, cupLumpStock: 0, avgDrc: 0 };
    }
    try {
        const res = await fetchAPI('/sells?stockSummary=true');
        if (res && res.status === 'success') {
            setCache('stock_summary', res.stockMetrics);
            return res.stockMetrics;
        }
        return { currentStock: 0, cupLumpStock: 0, avgDrc: 0 };
    } catch {
        const cached = getCache('stock_summary');
        return cached || { currentStock: 0, cupLumpStock: 0, avgDrc: 0 };
    }
};

export const fetchSellHistory = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetchAPI(`/sells?${query}`);
    return res;
};

export const addSellRecord = async (payload) => await offlineWrite('sells', '/sells', payload);
