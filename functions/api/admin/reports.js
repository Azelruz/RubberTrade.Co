import { jsonResponse, errorResponse, withSuperAdmin } from '../_utils.js';

/**
 * Super Admin Reporting API
 * Handles global/user-specific statistics and history
 */
async function handleGet(context) {
    try {
        const db = context.env.DB;
        const url = new URL(context.request.url);
        const action = url.searchParams.get('action');
        const targetUserId = url.searchParams.get('userId');
        const date = url.searchParams.get('date'); // YYYY-MM-DD
        const month = url.searchParams.get('month'); // YYYY-MM

        // 1. Get List of Users for the selector
        if (action === 'getUsers') {
            const { results } = await db.prepare("SELECT id, username, email, store_name FROM users ORDER BY CASE WHEN store_name IS NULL THEN 1 ELSE 0 END, store_name ASC").all();
            return jsonResponse(results);
        }

        if (!targetUserId) {
            return errorResponse('Missing userId parameter', 400);
        }
        
        // 1.5. Get Usage Settings for a specific user (for ID remapping)
        if (action === 'getUsageSettings') {
            const { results } = await db.prepare("SELECT key, value FROM settings WHERE userId = ?")
                .bind(targetUserId).all();
            return jsonResponse({ settings: results });
        }

        // 2. Daily Summary for a specific user
        if (action === 'getDailySummary') {
            if (!date) return errorResponse('Missing date parameter', 400);
            
            const buys = await db.prepare(`
                SELECT 
                    SUM(weight) as totalWeight, 
                    SUM(total) as totalAmount, 
                    COUNT(*) as count,
                    SUM(weight * drc / 100) as totalDryWeight,
                    CASE WHEN SUM(weight) > 0 THEN (SUM(weight * drc) / SUM(weight)) ELSE 0 END as avgDrc,
                    COUNT(DISTINCT farmerId) as uniqueFarmers
                FROM buys 
                WHERE userId = ? AND date = ?
            `).bind(targetUserId, date).first();
            
            const sells = await db.prepare("SELECT SUM(weight) as totalWeight, SUM(total) as totalAmount, COUNT(*) as count FROM sells WHERE userId = ? AND date = ?")
                .bind(targetUserId, date).first();
            
            const expenses = await db.prepare("SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND date = ?")
                .bind(targetUserId, date).first();

            return jsonResponse({
                buys: buys || { totalWeight: 0, totalAmount: 0, count: 0 },
                sells: sells || { totalWeight: 0, totalAmount: 0, count: 0 },
                expenses: expenses?.total || 0,
                date
            });
        }

        // 3. Monthly Summary for a specific user
        if (action === 'getMonthlySummary') {
            if (!month) return errorResponse('Missing month parameter (YYYY-MM)', 400);
            
            const pattern = `${month}%`;
            const buys = await db.prepare(`
                SELECT 
                    SUM(weight) as totalWeight, 
                    SUM(total) as totalAmount, 
                    COUNT(*) as count,
                    SUM(weight * drc / 100) as totalDryWeight,
                    CASE WHEN SUM(weight) > 0 THEN (SUM(weight * drc) / SUM(weight)) ELSE 0 END as avgDrc,
                    COUNT(DISTINCT farmerId) as uniqueFarmers
                FROM buys 
                WHERE userId = ? AND date LIKE ?
            `).bind(targetUserId, pattern).first();
            
            const sells = await db.prepare("SELECT SUM(weight) as totalWeight, SUM(total) as totalAmount, COUNT(*) as count FROM sells WHERE userId = ? AND date LIKE ?")
                .bind(targetUserId, pattern).first();

            const expenses = await db.prepare("SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND date LIKE ?")
                .bind(targetUserId, pattern).first();

            return jsonResponse({
                buys: buys || { totalWeight: 0, totalAmount: 0, count: 0 },
                sells: sells || { totalWeight: 0, totalAmount: 0, count: 0 },
                expenses: expenses?.total || 0,
                month
            });
        }

        // 4. Buys History for a specific user
        if (action === 'getBuysHistory') {
            const { results } = await db.prepare("SELECT * FROM buys WHERE userId = ? ORDER BY date DESC, created_at DESC LIMIT 100")
                .bind(targetUserId).all();
            return jsonResponse(results);
        }

        // 5. Sells History for a specific user
        if (action === 'getSellsHistory') {
            const { results } = await db.prepare("SELECT * FROM sells WHERE userId = ? ORDER BY date DESC, created_at DESC LIMIT 100")
                .bind(targetUserId).all();
            return jsonResponse(results);
        }

        return errorResponse('Invalid action', 400);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withSuperAdmin(handleGet);
