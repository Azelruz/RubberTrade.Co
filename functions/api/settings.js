import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const storeId = context.user.storeId;
        const { results } = await context.env.DB.prepare("SELECT * FROM settings WHERE userId = ? OR userId IS NULL").bind(storeId).all();
        
        // Convert to a single object. 
        // We sort so that userId IS NULL comes first, then userId = actual ID comes later and overwrites the defaults.
        const sortedResults = results.sort((a, b) => {
            if (a.userId === null && b.userId !== null) return -1;
            if (a.userId !== null && b.userId === null) return 1;
            return 0;
        });

        const settingsObj = {};
        sortedResults.forEach(row => {
            settingsObj[row.key] = row.value;
        });
        return jsonResponse(settingsObj);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload;
        const userId = context.user.id;
        
        // Handle updateDailyPrice
        if (body.action === 'updateDailyPrice' && payload?.price) {
            await context.env.DB.prepare(
                "INSERT INTO settings (key, value, userId, updated_at) VALUES ('daily_price', ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key, userId) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
            ).bind(payload.price, context.user.storeId).run();
            return jsonResponse({ status: 'success' });
        }
        
        // Handle generic updateSettings
        if (body.action === 'updateSettings' && payload) {
            const stmts = Object.keys(payload).map(key => {
                return context.env.DB.prepare(
                    "INSERT INTO settings (key, value, userId, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key, userId) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
                ).bind(key, String(payload[key]), context.user.storeId);
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

export const onRequestPost = withAuth(handlePost);
