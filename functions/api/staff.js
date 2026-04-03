import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM staff ORDER BY name ASC").all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload;
        const id = payload.id || crypto.randomUUID();
        const { name, phone, address, salary, bonus, note } = payload;
        
        await context.env.DB.prepare(
            "INSERT INTO staff (id, name, phone, address, salary, bonus, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, name, phone, address, salary, bonus, note).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}
