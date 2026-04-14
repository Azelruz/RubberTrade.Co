import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const db = context.env.DB;
        const user = context.user;
        const url = new URL(context.request.url);
        
        const limit = parseInt(url.searchParams.get('limit')) || 100;
        const offset = parseInt(url.searchParams.get('offset')) || 0;
        const targetUserId = url.searchParams.get('userId');
        const entityType = url.searchParams.get('type');
        const action = url.searchParams.get('action');

        let query = "SELECT * FROM audit_logs";
        const params = [];

        // --- Permissions & Filtering ---
        const isSuperAdmin = user.role === 'super_admin';
        
        if (isSuperAdmin) {
            // SuperAdmin can see everything or filter by a specific user
            if (targetUserId) {
                query += " WHERE userId = ?";
                params.push(targetUserId);
            } else {
                query += " WHERE 1=1"; // Placeholder for subsequent ANDs
            }
        } else {
            // Standard User: only see their own logs
            query += " WHERE userId = ?";
            params.push(user.id);
        }

        if (entityType) {
            query += " AND entityType = ?";
            params.push(entityType);
        }

        if (action) {
            query += " AND action = ?";
            params.push(action);
        }

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const { results } = await db.prepare(query).bind(...params).all();
        
        // Count total for pagination
        let countQuery = "SELECT COUNT(*) as total FROM audit_logs";
        const countParams = [];
        if (isSuperAdmin && targetUserId) {
            countQuery += " WHERE userId = ?";
            countParams.push(targetUserId);
        } else if (!isSuperAdmin) {
            countQuery += " WHERE userId = ?";
            countParams.push(user.id);
        }
        
        const totalResult = await db.prepare(countQuery).bind(...countParams).first();

        return jsonResponse({
            status: 'success',
            results: results.map(r => ({
                ...r,
                oldData: r.oldData ? JSON.parse(r.oldData) : null,
                newData: r.newData ? JSON.parse(r.newData) : null
            })),
            total: totalResult?.total || 0
        });
    } catch (e) {
        console.error("[Audit Logs API Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
