import { withAuth, jsonResponse } from './_utils';

export const onRequest = withAuth(async (context) => {
    const { db, user } = context;
    const userId = user.id;
    const storeId = user.storeId || userId;
    const role = (user.role || '').toLowerCase();
    
    // 1. Subscription Expiry for all users
    let expiryDays = null;
    let isExpired = false;
    let userRecord = null;
    try {
        userRecord = await db.prepare("SELECT subscription_expiry, subscription_status FROM users WHERE id = ?").bind(userId).first();
        if (userRecord && userRecord.subscription_expiry) {
            const expiryDate = new Date(userRecord.subscription_expiry);
            const now = new Date();
            const diffTime = expiryDate - now;
            expiryDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            isExpired = expiryDays < 0;
        }
    } catch (e) {
        console.error('Error in subscription check:', e);
    }

    // 2. Pending Approvals for Super Admins
    let pendingApprovalsCount = 0;
    if (role === 'super_admin') {
        try {
            const result = await db.prepare("SELECT COUNT(*) as count FROM subscription_requests WHERE status = 'pending'").first();
            pendingApprovalsCount = result?.count || 0;
        } catch (e) {
            console.error('Error in admin approvals check:', e);
        }
    }

    // 3. Outstanding / Pending Loans for this store
    let outstandingLoansCount = 0;
    let outstandingLoansTotal = 0;
    try {
        const loanRes = await db.prepare(
            "SELECT COUNT(*) as count, COALESCE(SUM(remainingAmount), 0) as total FROM loans WHERE userId = ? AND remainingAmount > 0"
        ).bind(storeId).first();
        outstandingLoansCount = loanRes?.count || 0;
        outstandingLoansTotal = loanRes?.total || 0;
    } catch (e) {
        console.error('Error fetching loan notifications:', e);
    }

    // 4. Pending Unpaid Buys for this store (disabled to reduce database workload)
    let unpaidBuysCount = 0;
    let unpaidBuysTotal = 0;

    return jsonResponse({
        status: 'success',
        notifications: {
            subscription: {
                expiryDays,
                isExpired,
                status: userRecord?.subscription_status
            },
            admin: {
                pendingApprovalsCount
            },
            loans: {
                count: outstandingLoansCount,
                totalAmount: outstandingLoansTotal
            },
            unpaidBuys: {
                count: unpaidBuysCount,
                totalAmount: unpaidBuysTotal
            }
        }
    });
});

