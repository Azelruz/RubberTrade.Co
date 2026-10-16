import { fetchAPI, offlineRead, offlineWrite, getCache, setCache, clearCache, triggerDataRefresh, memoryCache } from './apiClient';

export const fetchFarmers = async (includeStats = false, force = false) => {
    const endpoint = includeStats ? '/farmers?includeStats=true' : '/farmers';
    return await offlineRead('farmers', endpoint, force);
};

export const addFarmer = async (payload) => await offlineWrite('farmers', '/farmers', payload);

export const fetchEmployees = async (force = false) => await offlineRead('employees', '/employees', force);
export const addEmployee = async (payload) => await offlineWrite('employees', '/employees', payload);

export const fetchFarmerEmployees = async (params = {}, force = false) => {
    const query = new URLSearchParams(params).toString();
    const cacheKey = `farmer_employees_${query || 'all'}`;
    if (!force) {
        const cached = getCache(cacheKey);
        if (cached) return cached;
    }
    const endpoint = query ? `/farmer_employees?${query}` : '/farmer_employees';
    const data = await fetchAPI(endpoint);
    setCache(cacheKey, data);
    return data;
};

export const saveFarmerEmployeeLink = async (payload) => {
    const res = await fetchAPI('/farmer_employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    clearCache('farmer_employees', 'farmers', 'employees');
    memoryCache.forEach((_, key) => {
        if (key.startsWith('farmer_employees_')) memoryCache.delete(key);
    });
    triggerDataRefresh();
    return res;
};

export const deleteFarmerEmployeeLink = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetchAPI(`/farmer_employees?${query}`, {
        method: 'DELETE'
    });
    clearCache('farmer_employees', 'farmers', 'employees');
    memoryCache.forEach((_, key) => {
        if (key.startsWith('farmer_employees_')) memoryCache.delete(key);
    });
    triggerDataRefresh();
    return res;
};

export const fetchStaff = async (force = false) => await offlineRead('staff', '/staff', force);
export const addStaff = async (payload) => await offlineWrite('staff', '/staff', payload);

export const fetchFactories = async () => await offlineRead('factories', '/factories');
export const addFactory = async (payload) => await offlineWrite('factories', '/factories', payload);

export const fetchTrucks = async () => await offlineRead('trucks', '/trucks');
export const addTruck = async (payload) => await offlineWrite('trucks', '/trucks', payload);

export const fetchMemberTypes = async () => await offlineRead('farmer_types', '/member-types');
export const addMemberType = async (payload) => await offlineWrite('farmer_types', '/member-types', payload);

export const deleteMemberType = async (id) => {
    if (navigator.onLine) {
        const res = await fetchAPI(`/member-types?id=${id}`, { method: 'DELETE' });
        try { 
            const db = (await import('../db')).default;
            await db.farmer_types.delete(id); 
        } catch {}
        triggerDataRefresh();
        return res;
    }
    const { supabase } = await import('../../utils/supabase');
    const db = (await import('../db')).default;
    const { data: { session: sess1 } } = await supabase.auth.getSession().catch(() => ({ data: {} }));
    await db.sync_queue.put({ type: 'farmer_types', action: 'DELETE', payload: { id }, userId: sess1?.user?.id || null, status: 'pending', retryCount: 0, createdAt: Date.now(), uuid: crypto.randomUUID() });
    try { await db.farmer_types.delete(id); } catch {}
    triggerDataRefresh();
    return { status: 'success' };
};
