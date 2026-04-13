import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleDelete(context) {
    try {
        const body = await context.request.json();
        const { sheetName, id } = body;
        const user = context.user;
        const isSuperAdmin = user.role === 'super_admin';
        
        if (!sheetName || !id) {
            return errorResponse('Missing required fields (sheetName, id)', 400);
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

        if (isSuperAdmin) {
            // SuperAdmin can delete any record by ID (Global administrative control)
            query = `DELETE FROM ${tableName} WHERE id = ?`;
        } else {
            // Standard User: strictly restricted to their own data
            query = `DELETE FROM ${tableName} WHERE id = ? AND userId = ?`;
            params.push(user.id);
        }

        const res = await context.env.DB.prepare(query).bind(...params).run();
        
        if (res.meta.rows_written === 0) {
            return errorResponse('Record not found or unauthorized', 404);
        }

        return jsonResponse({ status: 'success' });
    } catch (e) {
        console.error("[API Delete Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handleDelete);
