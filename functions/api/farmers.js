import { jsonResponse, errorResponse } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM farmers ORDER BY name ASC").all();
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
            const format = await getSetting(context.env.DB, 'format_farmer_id', 'F-{SEQ4}');
            id = await generateNextId(context.env.DB, 'farmers', format, '');
        }

        const { name, phone, bankAccount, bankName, address, note, fscId } = payload;
        
        await context.env.DB.prepare(
            "INSERT INTO farmers (id, name, phone, bankAccount, bankName, address, note, fscId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, name, phone, bankAccount, bankName, address, note, fscId).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}
