import { jsonResponse, errorResponse, withAuth, isUUID } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM farmers WHERE userId = ? ORDER BY name ASC").bind(context.user.id).all();
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
            const format = await getSetting(context.env.DB, 'format_farmer_id', 'F-{SEQ4}');
            let startId = null;
            
            // To handle multiple ID generations accurately in batch, 
            // we'd normally need a sequence or a better id_utils.
            // For now, if user provides IDs in CSV, use them. If not, generate sequentially.
            // Simplified: loop and create statements
            const stmts = [];
            for (const p of body.payloads) {
                let id = p.id;
                if (!id || isUUID(id)) {
                    id = await generateNextId(context.env.DB, 'farmers', format, '');
                    // Note: This is still 1-by-1 generation because of how generateNextId works.
                    // Improving this would require a major refactor of _id_utils.
                }
                const { name, phone, bankAccount, bankName, address, note, fscId, memberTypeId } = p;
                stmts.push(context.env.DB.prepare(
                    "INSERT INTO farmers (id, name, phone, bankAccount, bankName, address, note, fscId, memberTypeId, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                ).bind(id, name, phone, bankAccount, bankName, address, note, fscId, memberTypeId || null, userId));
            }
            
            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: stmts.length });
        }

        const payload = body.payload;
        let id = payload.id;
        if (!id || isUUID(id)) {
            const format = await getSetting(context.env.DB, 'format_farmer_id', 'F-{SEQ4}');
            id = await generateNextId(context.env.DB, 'farmers', format, '');
        }

        const { name, phone, bankAccount, bankName, address, note, fscId, memberTypeId } = payload;
        
        await context.env.DB.prepare(
            "INSERT INTO farmers (id, name, phone, bankAccount, bankName, address, note, fscId, memberTypeId, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, name, phone, bankAccount, bankName, address, note, fscId, memberTypeId || null, userId).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);
export const onRequestPatch = withAuth(handlePost);
