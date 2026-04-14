import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare('SELECT * FROM trucks WHERE userId = ? ORDER BY created_at DESC').bind(context.user.storeId).all();
        return jsonResponse(results);
    } catch (error) {
        return errorResponse(error.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    const { env, request } = context;
    try {
        const body = await request.json();
        const { payload } = body;
        const { id, licensePlate, chassisNumber, brand, model, prbExpiry } = payload;
        const userId = context.user.id;

        await env.DB.prepare(`
            INSERT INTO trucks (id, licensePlate, chassisNumber, brand, model, prbExpiry, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                licensePlate = excluded.licensePlate,
                chassisNumber = excluded.chassisNumber,
                brand = excluded.brand,
                model = excluded.model,
                prbExpiry = excluded.prbExpiry
        `).bind(id, licensePlate, chassisNumber, brand, model, prbExpiry, context.user.storeId).run();

        return jsonResponse({ status: 'success', id });
    } catch (error) {
        return errorResponse(error.message);
    }
}

export const onRequestPost = withAuth(handlePost);
