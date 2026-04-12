import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare(`
            SELECT * FROM factories WHERE userId = ? OR userId IS NULL ORDER BY name ASC
        `).bind(context.user.id).all();
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
            const stmts = body.payloads.map(p => {
                const id = p.id || crypto.randomUUID();
                const { name, code, shortName, taxId, address } = p;
                return context.env.DB.prepare(`
                    INSERT OR REPLACE INTO factories (id, name, code, shortName, taxId, address, userId)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(id, name, code, shortName, taxId || null, address || null, userId);
            });
            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: stmts.length });
        }

        const payload = body.payload;
        const id = payload.id || crypto.randomUUID();
        const { name, code, shortName, taxId, address } = payload;
        
        await context.env.DB.prepare(`
            INSERT OR REPLACE INTO factories (id, name, code, shortName, taxId, address, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(id, name, code, shortName, taxId || null, address || null, userId).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
