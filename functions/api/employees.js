import { jsonResponse, errorResponse, withAuth, isUUID } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM employees WHERE userId = ? ORDER BY name ASC").bind(context.user.id).all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const userId = context.user.id;

        // Bulk Insert Support
        if (body.action === 'bulk' && Array.isArray(body.payloads)) {
            const format = await getSetting(context.env.DB, 'format_employee_id', 'E-{SEQ3}');
            const stmts = [];
            for (const p of body.payloads) {
                let id = p.id;
                if (!id || isUUID(id)) {
                    id = await generateNextId(context.env.DB, 'employees', format, '');
                }
                const { name, farmerId, profitSharePct, phone, bankAccount, bankName } = p;
                stmts.push(context.env.DB.prepare(
                    "INSERT INTO employees (id, name, farmerId, profitSharePct, phone, bankAccount, bankName, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                ).bind(id, name, farmerId, profitSharePct, phone, bankAccount, bankName, userId));
            }
            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: stmts.length });
        }

        const payload = body.payload;
        let id = payload.id;
        if (!id || isUUID(id)) {
            const format = await getSetting(context.env.DB, 'format_employee_id', 'E-{SEQ3}');
            id = await generateNextId(context.env.DB, 'employees', format, '');
        }

        const { name, farmerId, profitSharePct, phone, bankAccount, bankName } = payload;
        
        await context.env.DB.prepare(
            "INSERT INTO employees (id, name, farmerId, profitSharePct, phone, bankAccount, bankName, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, name, farmerId, profitSharePct, phone, bankAccount, bankName, userId).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
