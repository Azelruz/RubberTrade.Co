import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare(
            "SELECT * FROM promotions WHERE userId = ? ORDER BY date DESC, created_at DESC"
        ).bind(context.user.id).all();
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
        const id = payload.id || crypto.randomUUID();
        const userId = context.user.id;
        const { date, farmerId, farmerName, pointsUsed, rewardName } = payload;
        
        await context.env.DB.prepare(
            "INSERT INTO promotions (id, date, farmerId, farmerName, pointsUsed, rewardName, userId) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, date, farmerId, farmerName, pointsUsed, rewardName, userId).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
