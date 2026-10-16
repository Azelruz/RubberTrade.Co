/**
 * RubberTrade Notification Preferences Utility
 * Manages user toggles for notification categories.
 */

export const NOTIFICATION_CATEGORIES = [
    {
        id: 'subscription',
        label: 'อายุสมาชิกและสิทธิ์การใช้งาน',
        description: 'เตือนล่วงหน้า 7 วันเมื่อบัญชีร้านค้าใกล้หมดอายุ',
        adminOnly: false,
        icon: 'Clock'
    },
    {
        id: 'loans',
        label: 'เงินเบิกล่วงหน้า / หนี้ค้างชำระ',
        description: 'เตือนเมื่อมียอดเงินกู้เกษตรกรที่ยังมียอดค้างชำระ',
        adminOnly: false,
        icon: 'HandCoins'
    },
    {
        id: 'unpaidBuys',
        label: 'บิลรับซื้อยางที่ค้างชำระ',
        description: 'เตือนเมื่อมีรายการซื้อยางที่ยังไม่ได้กดชำระเงิน',
        adminOnly: false,
        icon: 'Receipt'
    },
    {
        id: 'offlineQueue',
        label: 'รายการออฟไลน์รอซิงก์',
        description: 'เตือนเมื่อมีรายการบันทึกในเครื่องที่รอส่งขึ้น Cloud',
        adminOnly: false,
        icon: 'CloudOff'
    },
    {
        id: 'adminApprovals',
        label: 'สลิปต่ออายุรออนุมัติ',
        description: 'เตือนเมื่อมีร้านค้ายื่นหลักฐานโอนเงินรอการยืนยัน',
        adminOnly: true,
        icon: 'CreditCard'
    }
];

export const DEFAULT_NOTIFICATION_PREFERENCES = {
    subscription: true,
    loans: true,
    unpaidBuys: true,
    offlineQueue: true,
    adminApprovals: true
};

const STORAGE_KEY = 'rt_notification_preferences';

/**
 * Retrieve user's notification preferences from localStorage.
 * Falls back to default preferences.
 */
export const getNotificationPreferences = () => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return { ...DEFAULT_NOTIFICATION_PREFERENCES };
        }
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed };
        }
    } catch (e) {
        console.error('Error reading notification preferences:', e);
    }
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
};

/**
 * Save updated notification preferences to localStorage and notify listeners.
 */
export const saveNotificationPreferences = (newPrefs) => {
    const merged = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...newPrefs };
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            window.dispatchEvent(new CustomEvent('notification-prefs-updated', { detail: merged }));
        }
    } catch (e) {
        console.error('Error saving notification preferences:', e);
    }
    return merged;
};

/**
 * Calculate if there are active notifications based on current stats and user preferences.
 */
export const computeActiveNotificationCount = (notifications, syncQueueCount, prefs, isSuperAdmin) => {
    if (!notifications || !prefs) return 0;

    let count = 0;

    // 1. Subscription
    if (prefs.subscription && notifications.subscription) {
        const { expiryDays } = notifications.subscription;
        if (expiryDays !== null && expiryDays !== undefined && expiryDays <= 7) {
            count += 1;
        }
    }

    // 2. Admin pending approvals
    if (isSuperAdmin && prefs.adminApprovals && notifications.admin) {
        if ((notifications.admin.pendingApprovalsCount || 0) > 0) {
            count += 1;
        }
    }

    // 3. Outstanding loans
    if (prefs.loans && notifications.loans) {
        if ((notifications.loans.count || 0) > 0) {
            count += 1;
        }
    }

    // 4. Unpaid buys
    if (prefs.unpaidBuys && notifications.unpaidBuys) {
        if ((notifications.unpaidBuys.count || 0) > 0) {
            count += 1;
        }
    }

    // 5. Offline sync queue
    if (prefs.offlineQueue && (syncQueueCount || 0) > 0) {
        count += 1;
    }

    return count;
};
