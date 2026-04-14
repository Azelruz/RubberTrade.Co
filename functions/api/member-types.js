import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare(`
            SELECT * FROM farmer_types WHERE userId = ? ORDER BY name ASC
        `).bind(context.user.storeId).all();
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
        const payload = body.payload;
        
        if (!payload) return errorResponse("Missing payload");

        const id = payload.id || crypto.randomUUID();
        const { name, bonus } = payload;
        
        await context.env.DB.prepare(`
            INSERT INTO farmer_types (id, name, bonus, userId)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                bonus = excluded.bonus
        `).bind(id, name, Number(bonus) || 0, context.user.storeId).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);
export const onRequestPatch = withAuth(handlePost);

async function handleDelete(context) {
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        if (!id) return errorResponse("Missing ID");

        await context.env.DB.prepare("DELETE FROM farmer_types WHERE id = ? AND userId = ?")
            .bind(id, context.user.storeId)
            .run();
            
        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
