import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleDelete(context) {
    try {
        const body = await context.request.json();
        const { sheetName, id } = body;
        
        const validTables = ['farmers', 'staff', 'employees', 'buys', 'sells', 'expenses', 'wages', 'promotions', 'trucks', 'factories', 'chemicals'];
        let tableName = sheetName.toLowerCase();
        
        // Map frontend table names to actual database table names if they differ
        const tableMap = {
            'chemicals': 'chemical_usage'
        };
        
        if (tableMap[tableName]) {
            tableName = tableMap[tableName];
        }
        
        if (!validTables.includes(sheetName.toLowerCase())) {
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
