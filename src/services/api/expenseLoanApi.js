import { fetchAPI, offlineRead, offlineWrite, triggerDataRefresh } from './apiClient';

export const fetchExpenses = async (dateParams = null, force = false) => {
    let endpoint = '/expenses';
    let isForced = force;
    if (dateParams) {
        if (typeof dateParams === 'string') {
            endpoint = `/expenses?startDate=${dateParams}&endDate=${dateParams}`;
        } else if (typeof dateParams === 'object') {
            const query = new URLSearchParams(dateParams).toString();
            if (query) endpoint = `/expenses?${query}`;
        }
        isForced = true;
    }
    return await offlineRead('expenses', endpoint, isForced);
};

export const addExpense = async (payload) => await offlineWrite('expenses', '/expenses', payload);

export const fetchWages = async (dateParams = null, force = false) => {
    let endpoint = '/wages';
    let isForced = force;
    if (dateParams) {
        if (typeof dateParams === 'string') {
            endpoint = `/wages?startDate=${dateParams}&endDate=${dateParams}`;
        } else if (typeof dateParams === 'object') {
            const query = new URLSearchParams(dateParams).toString();
            if (query) endpoint = `/wages?${query}`;
        }
        isForced = true;
    }
    return await offlineRead('wages', endpoint, isForced);
};

export const addWage = async (payload) => await offlineWrite('wages', '/wages', payload);

export const addBulkWages = async (payloads) => {
    if (!navigator.onLine) return { status: 'offline' };
    const res = await fetchAPI('/wages', { method: 'POST', body: { action: 'addBulkWages', payloads } });
    triggerDataRefresh();
    return res;
};

export const fetchPromotions = async () => await offlineRead('promotions', '/promotions');
export const addPromotion = async (payload) => await offlineWrite('promotions', '/promotions', payload);

export const fetchChemicalUsage = async () => await offlineRead('chemicals', '/chemicals');
export const addChemicalUsage = async (payload) => await offlineWrite('chemicals', '/chemicals', payload);

export const deleteChemicalUsage = async (id) => {
    const { deleteRecord } = await import('./apiClient');
    return await deleteRecord('chemicals', id);
};

export const fetchLoans = async () => {
    return await fetchAPI('/loans');
};

export const addLoan = async (payload) => await offlineWrite('loans', '/loans', payload);

export const addLoanDeduction = async (payload) => await offlineWrite('loan_deductions', '/loans/deductions', payload);

export const fetchLoanDeductions = async () => {
    return await fetchAPI('/loans/deductions');
};
