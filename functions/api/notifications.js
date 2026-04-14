import { withAuth, jsonResponse } from './_utils';

export const onRequest = withAuth(async (context) => {
    const { db, user } = context;
    const userId = user.id;
    const role = user.role.toLowerCase();
    
    // 1. Subscription Expiry for all users
    const userRecord = await db.prepare("SELECT subscription_expiry, subscription_status FROM users WHERE id = ?").bind(userId).first();
    
    let expiryDays = null;
    let isExpired = false;
    
    if (userRecord && userRecord.subscription_expiry) {
        const expiryDate = new Date(userRecord.subscription_expiry);
        const now = new Date();
        const diffTime = expiryDate - now;
        expiryDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isExpired = expiryDays < 0;
    }

    // 2. Pending Approvals for Super Admins
    let pendingApprovalsCount = 0;
    if (role === 'super_admin') {
        const result = await db.prepare("SELECT COUNT(*) as count FROM subscription_requests WHERE status = 'pending'").first();
        pendingApprovalsCount = result?.count || 0;
    }

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
            }
        }
    });
});
