import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

// Specific middleware for super admin
const withSuperAdmin = (handler) => {
    return withAuth(async (context) => {
        const superAdminEmail = 'narapong.an@gmail.com';
        const superAdminUser = 'narapong.an';
        if (context.user.role !== 'super_admin' && 
            context.user.email !== superAdminEmail && 
            context.user.username !== superAdminUser) {
            return errorResponse('Forbidden: Super Admin access required', 403);
        }
        return handler(context);
    });
};

async function handleGet(context) {
    try {
        const db = context.env.DB;
        
        // 1. User Status Summary
        const userSummary = await db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN subscription_status = 'active' AND (subscription_expiry >= CURRENT_TIMESTAMP OR subscription_expiry IS NULL) THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN subscription_status = 'trial' THEN 1 ELSE 0 END) as trial,
                SUM(CASE WHEN subscription_status = 'active' AND subscription_expiry < CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as expired
            FROM users 
            WHERE role = 'owner'
        `).first();

        // 2. Financial Summary
        const financialSummary = await db.prepare(`
            SELECT 
                SUM(amount) as total_revenue,
                SUM(CASE WHEN approvedAt >= date('now', 'start of month') THEN amount ELSE 0 END) as monthly_revenue
            FROM subscription_requests 
            WHERE status = 'approved'
        `).first();

        // 3. Package Popularity
        const packageStats = await db.prepare(`
            SELECT 
                package_name as name, 
                COUNT(*) as count
            FROM subscription_requests 
            WHERE status = 'approved'
            GROUP BY package_name
            ORDER BY count DESC
        `).all();

        // 4. 6-Month Revenue Trend
        // Note: strftime('%Y-%m', ...) might return NULL if date format is inconsistent, 
        // but we've been using ISO strings.
        const revenueTrend = await db.prepare(`
            SELECT 
                strftime('%Y-%m', approvedAt) as month,
                SUM(amount) as revenue
            FROM subscription_requests 
            WHERE status = 'approved' 
              AND approvedAt >= date('now', '-6 months', 'start of month')
            GROUP BY month
            ORDER BY month ASC
        `).all();

        // 5. Recent Activity
        const recentActivity = await db.prepare(`
            SELECT 
                sr.*, u.username, u.store_name
            FROM subscription_requests sr
            JOIN users u ON sr.userId = u.id
            WHERE sr.status != 'pending'
            ORDER BY sr.requestedAt DESC
            LIMIT 5
        `).all();

        return jsonResponse({
            status: 'success',
            data: {
                user_summary: userSummary,
                financial_summary: financialSummary,
                package_stats: packageStats?.results || [],
                revenue_trend: revenueTrend?.results || [],
                recent_activity: recentActivity?.results || []
            }
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withSuperAdmin(handleGet);
