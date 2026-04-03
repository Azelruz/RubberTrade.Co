import liff from '@line/liff';

const LIFF_ID_PROFILE = '2009445413-LKTCq5J8';
const LIFF_ID_ADD_EMPLOYEE = '2009445413-EuVTEBaS';

export const initLiff = async (type = 'profile') => {
    try {
        const liffId = type === 'profile' ? LIFF_ID_PROFILE : LIFF_ID_ADD_EMPLOYEE;
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
            liff.login();
            return null;
        }
        return liff.getProfile();
    } catch (e) {
        console.error('LIFF Init Error:', e);
        return null;
    }
};

export const getLiffFarmer = async (lineId, accessToken) => {
    const res = await fetch('/api/liff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getFarmer', lineId, accessToken })
    });
    return res.json();
};

export const updateLiffFarmer = async (lineId, accessToken, payload) => {
    const res = await fetch('/api/liff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateFarmer', lineId, accessToken, payload })
    });
    return res.json();
};

export const addLiffEmployee = async (lineId, accessToken, payload) => {
    const res = await fetch('/api/liff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addEmployee', lineId, accessToken, payload })
    });
    return res.json();
};
