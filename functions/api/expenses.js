import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC, created_at DESC").bind(context.user.id).all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload;
        const userId = context.user.id;
        const id = payload.id || crypto.randomUUID();
        const { date, category, description, amount, note } = payload;
        
        await context.env.DB.prepare(
            "INSERT OR REPLACE INTO expenses (id, date, category, description, amount, note, userId) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, date || null, category || null, description || null, amount || 0, note || null, userId).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /expenses Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
