import { fetchAPI, offlineRead, offlineWrite, getCache, setCache } from './apiClient';
import { supabase } from '../../utils/supabase';

export const fetchBuyRecords = async (force = false, dateParams = null) => {
    let endpoint = '/buys';
    let isForced = force;
    if (dateParams) {
        if (typeof dateParams === 'string') {
            endpoint = `/buys?startDate=${dateParams}&endDate=${dateParams}`;
        } else if (typeof dateParams === 'object') {
            const query = new URLSearchParams(dateParams).toString();
            if (query) endpoint = `/buys?${query}`;
        }
        isForced = true;
    }
    return await offlineRead('buys', endpoint, isForced);
};

export const fetchFarmerBuyStats = async (force = false) => {
    if (!force) {
        const cached = getCache('farmer_buy_stats');
        if (cached) return cached;
    }
    if (!navigator.onLine) {
        const cached = getCache('farmer_buy_stats');
        return cached || [];
    }
    try {
        const res = await fetchAPI('/buys?farmerStats=true');
        if (res) setCache('farmer_buy_stats', res);
        return res;
    } catch {
        const cached = getCache('farmer_buy_stats');
        return cached || [];
    }
};

export const fetchBuyHistory = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetchAPI(`/buys?${query}`);
    return res;
};

export const addBuyRecord = async (payload) => {
    return await offlineWrite('buys', '/buys', payload);
};

export const scanExpenseReceiptWithAI = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    const switchedStoreId = localStorage.getItem('rt_active_store_id');
    
    const headers = {
        'Authorization': `Bearer ${token}`
    };
    if (switchedStoreId) {
        headers['X-Switch-Store-ID'] = switchedStoreId;
    }

    const res = await fetch('/api/expenses/scan', {
        method: 'POST',
        headers,
        body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'สแกนใบเสร็จไม่สำเร็จ');
    return data;
};

export const scanSellReceiptWithAI = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    const switchedStoreId = localStorage.getItem('rt_active_store_id');
    
    const headers = {
        'Authorization': `Bearer ${token}`
    };
    if (switchedStoreId) {
        headers['X-Switch-Store-ID'] = switchedStoreId;
    }

    const res = await fetch('/api/sells/scan', {
        method: 'POST',
        headers,
        body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'สแกนใบชั่ง/ใบเสร็จล้มเหลว');
    return data;
};
