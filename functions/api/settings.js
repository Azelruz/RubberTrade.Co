import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM settings").all();
        // Convert array of {key, value} to a single object like { daily_price: '50' }
        const settingsObj = {};
        results.forEach(row => {
            settingsObj[row.key] = row.value;
        });
        return jsonResponse(settingsObj);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload;
        
        // Handle updateDailyPrice
        if (body.action === 'updateDailyPrice' && payload?.price) {
            await context.env.DB.prepare(
                "INSERT INTO settings (key, value, updated_at) VALUES ('daily_price', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
            ).bind(payload.price).run();
            return jsonResponse({ status: 'success' });
        }
        
        // Handle generic updateSettings
        if (body.action === 'updateSettings' && payload) {
            const stmts = Object.keys(payload).map(key => {
                return context.env.DB.prepare(
                    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
                ).bind(key, String(payload[key]));
            });
            if(stmts.length > 0) {
               await context.env.DB.batch(stmts);
            }
            return jsonResponse({ status: 'success' });
        }
        
        return errorResponse("Invalid action or payload provided.", 400);

    } catch (e) {
        return errorResponse(e.message);
    }
}
