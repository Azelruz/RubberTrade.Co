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
        const res = jsonResponse(settingsObj);
        res.headers.set('Vary', 'Accept-Encoding, Authorization, X-Switch-Store-ID');
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        return res;
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload || body;
        const userId = context.user.id;
        
        // Handle updateDailyPrice
        if (body.action === 'updateDailyPrice' && payload?.price) {
            await context.env.DB.prepare(
                "INSERT INTO settings (key, value, userId, updated_at) VALUES ('daily_price', ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key, userId) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
            ).bind(payload.price, context.user.storeId).run();
            return jsonResponse({ status: 'success' });
        }
        
        // Handle checkStationCode
        if (body.action === 'checkStationCode') {
            const code = (payload?.code || '').trim().toUpperCase();
            if (!code) return jsonResponse({ status: 'success', isAvailable: true });

            // Fetch current store's station code
            const current = await context.env.DB.prepare(
                "SELECT value FROM settings WHERE key = 'station_code' AND userId = ?"
            ).bind(context.user.storeId).first();

            const currentCode = current ? String(current.value).trim().toUpperCase() : '';

            // If checking current store's own code, skip check
            if (code === currentCode) {
                return jsonResponse({ status: 'success', isAvailable: true });
            }

            const existing = await context.env.DB.prepare(
                "SELECT userId FROM settings WHERE key = 'station_code' AND UPPER(value) = ? AND userId != ?"
            ).bind(code, context.user.storeId).first();

            if (existing) {
                return jsonResponse({ status: 'duplicate', isAvailable: false, message: `รหัสสถานี '${code}' ถูกใช้งานแล้วโดยร้านค้าอื่น` });
            }
            return jsonResponse({ status: 'success', isAvailable: true });
        }

        // Handle generateStationCode
        if (body.action === 'generateStationCode') {
            let prefix = (payload?.prefix || context.user.username || 'RTB').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (prefix.length < 2) prefix = 'RTB';
            if (prefix.length > 4) prefix = prefix.substring(0, 4);

            let candidate = prefix;
            let counter = 1;
            let isUnique = false;

            while (!isUnique && counter <= 99) {
                const checkCode = counter === 1 ? candidate : `${prefix}${String(counter).padStart(2, '0')}`;
                const existing = await context.env.DB.prepare(
                    "SELECT userId FROM settings WHERE key = 'station_code' AND UPPER(value) = ? AND userId != ?"
                ).bind(checkCode, context.user.storeId).first();

                if (!existing) {
                    candidate = checkCode;
                    isUnique = true;
                } else {
                    counter++;
                }
            }

            return jsonResponse({ status: 'success', code: candidate });
        }

        // Handle generic updateSettings
        if (body.action === 'updateSettings' && payload) {
            // Check station_code uniqueness before updating (only if changed)
            if (payload.station_code) {
                const code = String(payload.station_code).trim().toUpperCase();

                const current = await context.env.DB.prepare(
                    "SELECT value FROM settings WHERE key = 'station_code' AND userId = ?"
                ).bind(context.user.storeId).first();

                const currentCode = current ? String(current.value).trim().toUpperCase() : '';

                // Only check for duplicates if station_code is actually changed
                if (code !== currentCode) {
                    const existing = await context.env.DB.prepare(
                        "SELECT userId FROM settings WHERE key = 'station_code' AND UPPER(value) = ? AND userId != ?"
                    ).bind(code, context.user.storeId).first();

                    if (existing) {
                        return errorResponse(`รหัสสถานี '${code}' ถูกใช้งานแล้วโดยร้านค้าอื่น กรุณาเลือกใช้รหัสอื่น`, 400);
                    }
                }
            }

            const stmts = Object.keys(payload).map(key => {
                const rawValue = payload[key];
                const value = rawValue === undefined ? null : (typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue));
                
                return context.env.DB.prepare(
                    "INSERT INTO settings (key, value, userId, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key, userId) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
                ).bind(key, value, context.user.storeId);
            });
            
            if (payload.factoryName !== undefined) {
                stmts.push(context.env.DB.prepare(
                    "UPDATE users SET store_name = ? WHERE id = ?"
                ).bind(payload.factoryName, context.user.storeId));
            }
            
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
