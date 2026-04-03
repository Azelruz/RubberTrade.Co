import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { sheetName, id } = body;
        
        const validTables = ['farmers', 'staff', 'employees', 'buys', 'sells', 'expenses', 'wages', 'promotions', 'trucks', 'factories'];
        const tableName = sheetName.toLowerCase();
        
        if (!validTables.includes(tableName)) {
            return errorResponse('Invalid table name: ' + sheetName);
        }

        // D1 doesn't support parameterized table names directly safely without syntax binding, string literal is required for table names
        await context.env.DB.prepare(`DELETE FROM ${tableName} WHERE id = ?`).bind(id).run();
        
        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}
