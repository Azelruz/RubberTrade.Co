import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM promotions ORDER BY date DESC, created_at DESC").all();
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
        const { date, farmerId, farmerName, pointsUsed, rewardName } = payload;
        
        await context.env.DB.prepare(
            "INSERT INTO promotions (id, date, farmerId, farmerName, pointsUsed, rewardName) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(id, date, farmerId, farmerName, pointsUsed, rewardName).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}
