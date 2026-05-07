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
        const payload = body.payload || body;
        const { 
            id, licensePlate, driverName, capacity, 
            chassisNumber, brand, model, prbExpiry, note 
        } = payload;
        const storeId = context.user.storeId;

        await env.DB.prepare(`
            INSERT INTO trucks (
                id, licensePlate, driverName, capacity, 
                chassisNumber, brand, model, prbExpiry, note, userId
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                licensePlate = excluded.licensePlate,
                driverName = excluded.driverName,
                capacity = excluded.capacity,
                chassisNumber = excluded.chassisNumber,
                brand = excluded.brand,
                model = excluded.model,
                prbExpiry = excluded.prbExpiry,
                note = excluded.note
        `).bind(
            id, 
            licensePlate, 
            driverName || null, 
            capacity || null, 
            chassisNumber || null, 
            brand || null, 
            model || null, 
            prbExpiry || null, 
            note || null, 
            storeId
        ).run();

        return jsonResponse({ status: 'success', id });
    } catch (error) {
        return errorResponse(error.message);
    }
}

export const onRequestPost = withAuth(handlePost);
