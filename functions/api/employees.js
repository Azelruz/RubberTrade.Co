import { jsonResponse, errorResponse } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM employees ORDER BY name ASC").all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload;
        
        let id = payload.id;
        if (!id) {
            const format = await getSetting(context.env.DB, 'format_employee_id', 'E-{SEQ3}');
            id = await generateNextId(context.env.DB, 'employees', format, '');
        }

        const { name, farmerId, profitSharePct, phone, bankAccount, bankName } = payload;
        
        await context.env.DB.prepare(
            "INSERT INTO employees (id, name, farmerId, profitSharePct, phone, bankAccount, bankName) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, name, farmerId, profitSharePct, phone, bankAccount, bankName).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}
