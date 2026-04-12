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
            const stationCode = await getSetting(context.env.DB, 'station_code', 'RTB');
            const format = await getSetting(context.env.DB, 'format_farmer_id', '{STATION}-F-{SEQ4}');
            
            const stmts = [];
            for (const p of body.payloads) {
                let id = p.id;
                if (!id || isUUID(id)) {
                    id = await generateNextId(context.env.DB, 'farmers', format, stationCode, userId);
                }
                const { name, phone, bankAccount, bankName, address, note, fscId, memberTypeId } = p;
                stmts.push(context.env.DB.prepare(
                    "INSERT OR REPLACE INTO farmers (id, name, phone, bankAccount, bankName, address, note, fscId, memberTypeId, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                ).bind(id, name, phone, bankAccount, bankName, address, note, fscId, memberTypeId || null, userId));
            }
            
            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: stmts.length });
        }

        const payload = body.payload;
        let id = payload.id;
        if (!id || isUUID(id)) {
            const stationCode = await getSetting(context.env.DB, 'station_code', 'RTB');
            const format = await getSetting(context.env.DB, 'format_farmer_id', '{STATION}-F-{SEQ4}');
            id = await generateNextId(context.env.DB, 'farmers', format, stationCode, userId);
        }

        const { name, phone, bankAccount, bankName, address, note, fscId, memberTypeId } = payload;
        
        await context.env.DB.prepare(
            "INSERT OR REPLACE INTO farmers (id, name, phone, bankAccount, bankName, address, note, fscId, memberTypeId, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, name, phone, bankAccount, bankName, address, note, fscId, memberTypeId || null, userId).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);
export const onRequestPatch = withAuth(handlePost);
