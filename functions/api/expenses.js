import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM expenses ORDER BY date DESC, created_at DESC").all();
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
        const { date, category, description, amount, note } = payload;
        
        await context.env.DB.prepare(
            "INSERT INTO expenses (id, date, category, description, amount, note) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(id, date || null, category || null, description || null, amount || 0, note || null).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /expenses Error]", e);
        return errorResponse(e.message);
    }
}
