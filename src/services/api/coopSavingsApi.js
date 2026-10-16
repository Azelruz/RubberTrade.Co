import { fetchAPI, offlineRead, offlineWrite } from './apiClient';

// ================= Cooperative & Dividend API Services =================
export const fetchCoopMembers = async (params = {}, force = false) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/coop-members${query ? `?${query}` : ''}`;
    return await offlineRead('coop_members', endpoint, force);
};

export const addCoopMember = async (payload) => {
    return await offlineWrite('coop_members', '/coop-members', payload);
};

export const deleteCoopMember = async (id) => {
    return await fetchAPI(`/coop-members?id=${id}`, { method: 'DELETE' });
};

export const fetchShareTransactions = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/share-transactions${query ? `?${query}` : ''}`;
    return await fetchAPI(endpoint);
};

export const addShareTransaction = async (payload) => {
    return await fetchAPI('/share-transactions', { method: 'POST', body: { payload } });
};

export const deleteShareTransaction = async (id) => {
    return await fetchAPI(`/share-transactions?id=${id}`, { method: 'DELETE' });
};

export const fetchDividendPeriods = async (id = null) => {
    const endpoint = id ? `/dividends/periods?id=${id}` : '/dividends/periods';
    return await fetchAPI(endpoint);
};

export const saveDividendPeriod = async (payload) => {
    return await fetchAPI('/dividends/periods', { method: 'POST', body: { payload } });
};

export const deleteDividendPeriod = async (id) => {
    return await fetchAPI(`/dividends/periods?id=${id}`, { method: 'DELETE' });
};

export const simulateDividendCalculation = async (payload) => {
    return await fetchAPI('/dividends/calculate', { method: 'POST', body: { payload } });
};

export const fetchDividendDistributions = async (periodId) => {
    return await fetchAPI(`/dividends/distributions?periodId=${periodId}`);
};

export const saveDividendDistributions = async (periodId, distributions) => {
    return await fetchAPI('/dividends/distributions', { method: 'POST', body: { periodId, distributions } });
};

export const updateDividendDistribution = async (payload) => {
    return await fetchAPI('/dividends/distributions', { method: 'PATCH', body: { payload } });
};

// ================= Member Savings & Deposit-Withdrawal APIs =================

export const fetchSavingsTransactions = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/savings-transactions${query ? `?${query}` : ''}`;
    return await fetchAPI(endpoint);
};

export const addSavingsTransaction = async (payload) => {
    return await fetchAPI('/savings-transactions', { method: 'POST', body: { payload } });
};

export const deleteSavingsTransaction = async (id) => {
    return await fetchAPI(`/savings-transactions?id=${id}`, { method: 'DELETE' });
};

export const calculateSavingsInterest = async (payload) => {
    return await fetchAPI('/savings/interest-calculate', { method: 'POST', body: payload });
};

export const distributeSavingsInterest = async (payload) => {
    return await fetchAPI('/savings-transactions', { method: 'POST', body: { action: 'bulk_interest', ...payload } });
};

export const fetchSavingsAccounts = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const endpoint = `/savings-accounts${query ? `?${query}` : ''}`;
    return await fetchAPI(endpoint);
};

export const addSavingsAccount = async (payload) => {
    return await fetchAPI('/savings-accounts', { method: 'POST', body: { payload } });
};

export const deleteSavingsAccount = async (id) => {
    return await fetchAPI(`/savings-accounts?id=${id}`, { method: 'DELETE' });
};
