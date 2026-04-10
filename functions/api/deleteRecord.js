import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleDelete(context) {
    try {
        const body = await context.request.json();
        const { sheetName, id } = body;
        
        const validTables = ['farmers', 'staff', 'employees', 'buys', 'sells', 'expenses', 'wages', 'promotions', 'trucks', 'factories', 'chemicals'];
        const tableName = sheetName.toLowerCase();
        
        if (!validTables.includes(tableName)) {
            return errorResponse('Invalid table name: ' + sheetName);
        }

        // Enforce user isolation: only delete records belonging to this user
        // Note: For tables without userId (like settings?), this might need adjustment, 
        // but all transactional tables should have it.
        const res = await context.env.DB.prepare(`DELETE FROM ${tableName} WHERE id = ? AND userId = ?`).bind(id, context.user.id).run();
        
        if (res.meta.rows_written === 0) {
            return errorResponse('Record not found or unauthorized', 404);
        }

        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handleDelete);
