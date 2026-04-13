import { jsonResponse, errorResponse, withSuperAdmin } from '../_utils.js';

async function handleGet(context) {
    try {
        const db = context.env.DB;
        const url = new URL(context.request.url);
        const type = url.searchParams.get('type'); // 'pending' or 'members'

        if (type === 'members') {
            const users = await db.prepare(`
                SELECT id, username, email, store_name, subscription_status, subscription_expiry 
                FROM users 
                ORDER BY username ASC
            `).all();
            return jsonResponse({
                status: 'success',
                members: users?.results || []
            });
        }

        if (type === 'settings') {
            const { results } = await db.prepare("SELECT key, value FROM settings WHERE userId = 'SYSTEM'").all();
            const settingsObj = {};
            results.forEach(row => {
                settingsObj[row.key] = row.value;
            });
            return jsonResponse({
                status: 'success',
                settings: settingsObj
            });
        }

        // Default: Pending Requests
        const requests = await db.prepare(`
            SELECT sr.*, u.username, u.email 
            FROM subscription_requests sr 
            JOIN users u ON sr.userId = u.id 
            WHERE sr.status = 'pending' 
            ORDER BY sr.requestedAt ASC
        `).all();
        
        return jsonResponse({
            status: 'success',
            requests: requests?.results || []
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}

async function handleAction(context) {
    try {
        const db = context.env.DB;
        const body = await context.request.json();
        const { requestId, action, days, payload } = body; // action: 'approve' or 'reject' or 'update_bank_info'

        if (action === 'update_bank_info' && payload) {
            const stmts = Object.keys(payload).map(key => {
                return db.prepare(
                    "INSERT INTO settings (key, value, userId, updated_at) VALUES (?, ?, 'SYSTEM', CURRENT_TIMESTAMP) ON CONFLICT(key, userId) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
                ).bind(key, String(payload[key]));
            });
            if(stmts.length > 0) {
               await db.batch(stmts);
            }
            return jsonResponse({ status: 'success', message: 'Bank info updated' });
        }

        if (!requestId || !action) {
            return errorResponse('Missing requestId or action', 400);
        }

        const request = await db.prepare("SELECT * FROM subscription_requests WHERE id = ?").bind(requestId).first();
        if (!request) return errorResponse('Request not found', 404);

        if (action === 'approve') {
            const now = new Date();
            // Fetch current expiry from user
            const user = await db.prepare("SELECT subscription_expiry FROM users WHERE id = ?").bind(request.userId).first();
            
            let currentExpiry = user.subscription_expiry ? new Date(user.subscription_expiry) : new Date();
            if (currentExpiry < now) currentExpiry = now; // If already expired, start from now
            
            const addedDays = parseInt(days) || 30;
            const newExpiry = new Date(currentExpiry.getTime() + addedDays * 24 * 60 * 60 * 1000);
            const newExpiryStr = newExpiry.toISOString().replace('T', ' ').substring(0, 19);

            await db.batch([
                db.prepare("UPDATE users SET subscription_status = 'active', subscription_expiry = ? WHERE id = ?").bind(newExpiryStr, request.userId),
                db.prepare("UPDATE subscription_requests SET status = 'approved', approvedAt = CURRENT_TIMESTAMP WHERE id = ?").bind(requestId)
            ]);

            return jsonResponse({
                status: 'success',
                message: `Approved. New expiry: ${newExpiryStr}`
            });
        } else if (action === 'reject') {
            await db.prepare("UPDATE subscription_requests SET status = 'rejected' WHERE id = ?").bind(requestId).run();
            return jsonResponse({ status: 'success', message: 'Rejected' });
        }

        return errorResponse('Invalid action', 400);
    } catch (e) {
        return errorResponse(e.message);
    }
}

async function handleUpdateOverride(context) {
    try {
        const db = context.env.DB;
        const body = await context.request.json();
        const { userId, subscription_status, subscription_expiry } = body;

        if (!userId) return errorResponse('Missing userId', 400);

        // Prepare update query
        let query = "UPDATE users SET ";
        const params = [];
        const updates = [];

        if (subscription_status !== undefined) {
            updates.push("subscription_status = ?");
            params.push(subscription_status);
        }
        if (subscription_expiry !== undefined) {
            updates.push("subscription_expiry = ?");
            params.push(subscription_expiry);
        }

        if (updates.length === 0) return errorResponse('Nothing to update', 400);

        query += updates.join(", ") + " WHERE id = ?";
        params.push(userId);

        await db.prepare(query).bind(...params).run();

        return jsonResponse({
            status: 'success',
            message: 'User subscription updated successfully'
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withSuperAdmin(handleGet);
export const onRequestPost = withSuperAdmin(handleAction);
export const onRequestPatch = withSuperAdmin(handleUpdateOverride);
