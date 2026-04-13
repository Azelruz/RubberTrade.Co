import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleUpdate(context) {
    try {
        const body = await context.request.json();
        const { sheetName, id, updates } = body;
        
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

        const keys = Object.keys(updates);
        if (keys.length === 0) return jsonResponse({ status: 'success' });

        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(id);
        values.push(context.user.id);

        const res = await context.env.DB.prepare(
            `UPDATE ${tableName} SET ${setClause} WHERE id = ? AND userId = ?`
        ).bind(...values).run();

        if (res.meta.rows_written === 0) {
            return errorResponse('Record not found or unauthorized', 404);
        }

        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handleUpdate);
