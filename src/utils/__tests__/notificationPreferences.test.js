import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    DEFAULT_NOTIFICATION_PREFERENCES, 
    getNotificationPreferences, 
    saveNotificationPreferences,
    computeActiveNotificationCount 
} from '../notificationPreferences';

// Mock localStorage and window in node environment
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = String(value); },
        clear: () => { store = {}; },
        removeItem: (key) => { delete store[key]; }
    };
})();

describe('Notification Preferences Utility', () => {
    beforeEach(() => {
        global.window = {
            localStorage: localStorageMock,
            dispatchEvent: vi.fn()
        };
        global.localStorage = localStorageMock;
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('returns default preferences when nothing is stored', () => {
        const prefs = getNotificationPreferences();
        expect(prefs).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
        expect(prefs.subscription).toBe(true);
        expect(prefs.loans).toBe(true);
        expect(prefs.unpaidBuys).toBe(true);
        expect(prefs.offlineQueue).toBe(true);
        expect(prefs.adminApprovals).toBe(true);
    });

    it('saves and retrieves updated preferences', () => {
        const updated = saveNotificationPreferences({ loans: false, unpaidBuys: false });
        expect(updated.loans).toBe(false);
        expect(updated.unpaidBuys).toBe(false);
        expect(updated.subscription).toBe(true); // preserved

        const retrieved = getNotificationPreferences();
        expect(retrieved.loans).toBe(false);
        expect(retrieved.unpaidBuys).toBe(false);
        expect(retrieved.subscription).toBe(true);
    });

    it('dispatches a notification-prefs-updated custom event on save', () => {
        const spy = vi.spyOn(global.window, 'dispatchEvent');

        saveNotificationPreferences({ offlineQueue: false });
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('correctly calculates active notification count respecting user preferences', () => {
        const mockNotifs = {
            subscription: { expiryDays: 3, isExpired: false },
            admin: { pendingApprovalsCount: 2 },
            loans: { count: 5, totalAmount: 25000 },
            unpaidBuys: { count: 3, totalAmount: 12000 }
        };
        const syncQueueCount = 4;

        // When all enabled (super admin)
        const allCount = computeActiveNotificationCount(mockNotifs, syncQueueCount, DEFAULT_NOTIFICATION_PREFERENCES, true);
        expect(allCount).toBe(5);

        // When non-super-admin (admin approvals ignored)
        const userCount = computeActiveNotificationCount(mockNotifs, syncQueueCount, DEFAULT_NOTIFICATION_PREFERENCES, false);
        expect(userCount).toBe(4);

        // When user turns off loans and unpaid buys
        const partialPrefs = {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            loans: false,
            unpaidBuys: false
        };
        const partialCount = computeActiveNotificationCount(mockNotifs, syncQueueCount, partialPrefs, false);
        // remaining: subscription (1) + offlineQueue (1) = 2
        expect(partialCount).toBe(2);

        // When all turned off
        const nonePrefs = {
            subscription: false,
            loans: false,
            unpaidBuys: false,
            offlineQueue: false,
            adminApprovals: false
        };
        const noneCount = computeActiveNotificationCount(mockNotifs, syncQueueCount, nonePrefs, true);
        expect(noneCount).toBe(0);
    });
});
