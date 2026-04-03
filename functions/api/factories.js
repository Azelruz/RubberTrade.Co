import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare(`
            SELECT * FROM factories ORDER BY name ASC
        `).all();
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
        
        const { name, code, shortName, taxId, address } = payload;
        
        await context.env.DB.prepare(`
            INSERT INTO factories (id, name, code, shortName, taxId, address)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                code = excluded.code,
                shortName = excluded.shortName,
                taxId = excluded.taxId,
                address = excluded.address
        `).bind(id, name, code, shortName, taxId || null, address || null).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}
