import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { sheetName, id, updates } = body;
        
        const validTables = ['farmers', 'staff', 'employees', 'buys', 'sells', 'expenses', 'wages', 'promotions', 'trucks', 'factories'];
        const tableName = sheetName.toLowerCase();
        
        if (!validTables.includes(tableName)) {
            return errorResponse('Invalid table name: ' + sheetName);
        }

        const keys = Object.keys(updates);
        if (keys.length === 0) return jsonResponse({ status: 'success' });

        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(id);

        await context.env.DB.prepare(
            `UPDATE ${tableName} SET ${setClause} WHERE id = ?`
        ).bind(...values).run();

        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}
