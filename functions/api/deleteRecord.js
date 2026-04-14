import { jsonResponse, errorResponse, withAuth, withRateLimit, recordAuditLog } from './_utils.js';

async function handleDelete(context) {
    try {
        const body = await context.request.json();
        const { sheetName, id } = body;
        const user = context.user;
        const isSuperAdmin = user.role === 'super_admin';
        
        if (!sheetName || !id) {
            return errorResponse('Missing required fields (sheetName, id)', 400);
        }

        // Block Staff from deleting anything
        if (user.role === 'staff') {
            return errorResponse('Permission Denied: Staff cannot delete records', 403);
        }

        const validTables = ['farmers', 'staff', 'employees', 'buys', 'sells', 'expenses', 'wages', 'promotions', 'trucks', 'factories', 'chemicals'];
        let tableName = sheetName.toLowerCase();
        
        // Map frontend table names to actual database table names if they differ
        const tableMap = {
            'chemicals': 'chemical_usage'
        };
        
        if (tableMap[tableName]) {
            tableName = tableMap[tableName];
        }
        
        if (!validTables.includes(tableName)) {
            return errorResponse('Invalid table name: ' + sheetName, 400);
        }

        let query;
        const params = [id];
        let oldRecord = null;

        // Fetch old record before deletion for Audit Log
        try {
            oldRecord = await context.env.DB.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).bind(id).first();
        } catch (e) {
            console.error("[Audit Fetch Error]", e);
        }

        if (isSuperAdmin) {
            // SuperAdmin can delete any record by ID (Global administrative control)
            query = `DELETE FROM ${tableName} WHERE id = ?`;
        } else {
            // Standard User (Owner/Admin): strictly restricted to their store's data
            query = `DELETE FROM ${tableName} WHERE id = ? AND userId = ?`;
            params.push(user.storeId);
        }

        const res = await context.env.DB.prepare(query).bind(...params).run();
        
        if (res.meta.rows_written === 0) {
            return errorResponse('Record not found or unauthorized', 404);
        }

        // --- Audit Logging ---
        context.waitUntil?.(recordAuditLog(context, {
            action: 'DELETE',
            entityType: tableName,
            entityId: id,
            oldData: oldRecord
        }));

        return jsonResponse({ status: 'success' });
    } catch (e) {
        console.error("[API Delete Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(withRateLimit(handleDelete));
