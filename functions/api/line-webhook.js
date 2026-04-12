import { jsonResponse, errorResponse } from './_utils.js';

/**
 * LINE Messaging API Webhook
 * This endpoint handles events from LINE OA (follow, unfollow, message, etc.)
 */
export async function onRequestPost(context) {
    try {
        const url = new URL(context.request.url);
        const uid = url.searchParams.get('uid'); // Optional: target user ID for multi-tenancy

        const bodyRaw = await context.request.text();
        console.log("[LINE Webhook] Raw body:", bodyRaw);

        const db = context.env.DB;

        // Helper to save setting with UID filter if present
        const saveSetting = async (key, value) => {
            if (uid) {
                await db.prepare(
                    "INSERT INTO settings (key, value, userId, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key, userId) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
                ).bind(key, value, uid).run();
            } else {
                await db.prepare(
                    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
                ).bind(key, value).run();
            }
        };

        // Save raw body to settings for debugging
        await saveSetting('lineLastEvent', bodyRaw);

        let body;
        try {
            body = JSON.parse(bodyRaw);
        } catch (e) {
            return jsonResponse({ status: 'error', message: 'Invalid JSON' });
        }

        const { events } = body;
        console.log(`[LINE Webhook] Received ${events?.length || 0} events. Target UID: ${uid || 'GLOBAL'}`);

        // Immediately update status to show we received SOMETHING
        const timestamp = new Date().toLocaleTimeString();
        await saveSetting('lineLastStatus', `ได้รับข้อมูลเมื่อ ${timestamp} (จำนวน ${events?.length || 0} รายการ)`);

        if (!events || events.length === 0) {
            return jsonResponse({ status: 'ok', message: 'No events' });
        }
        
        // Get LINE credentials from settings (filter by uid if provided)
        let query = "SELECT * FROM settings WHERE key IN ('lineChannelAccessToken', 'lineChannelSecret')";
        let params = [];
        if (uid) {
            query += " AND userId = ?";
            params.push(uid);
        } else {
            query += " AND userId IS NULL";
        }
        
        const { results: settings } = await db.prepare(query).bind(...params).all();
        const creds = {};
        settings.forEach(s => creds[s.key] = s.value);

        if (!creds.lineChannelAccessToken || !creds.lineChannelSecret) {
            const err = `Missing credentials in settings (UID: ${uid || 'GLOBAL'})`;
            console.error("[LINE Webhook]", err);
            await saveSetting('lineLastError', err);
            return jsonResponse({ status: 'error', message: err });
        }

        for (const event of events) {
            const { type, source } = event;
            const lineId = source?.userId;
            
            if (!lineId) {
                console.log(`[LINE Webhook] Event ${type} has no userId, skipping`);
                continue;
            }

            console.log(`[LINE Webhook] Processing Event: ${type}, User ID: ${lineId}`);

            // Fetch profile and upsert on ANY event to ensure they are registered
            const profile = await fetchLineProfile(lineId, creds.lineChannelAccessToken);
            
            if (profile) {
                console.log(`[LINE Webhook] Profile fetched: ${profile.displayName}`);
                const id = `line_${lineId.substring(0, 8)}`;
                
                try {
                    // Update farmer and ensure it's associated with the correct UID (if provided)
                    await db.prepare(`
                        INSERT INTO farmers (id, name, lineId, lineName, linePicture, userId)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT(lineId) DO UPDATE SET
                            lineName = excluded.lineName,
                            linePicture = excluded.linePicture,
                            userId = COALESCE(excluded.userId, farmers.userId)
                    `).bind(id, profile.displayName, lineId, profile.displayName, profile.pictureUrl || null, uid || null).run();
                    
                    console.log(`[LINE Webhook] Farmer upserted successfully`);
                    await saveSetting('lineLastStatus', `สำเร็จ: เชื่อมต่อคุณ ${profile.displayName} เรียบร้อย`);
                } catch (dbErr) {
                    console.error("[LINE Webhook] DB Error during upsert:", dbErr.message);
                    await saveSetting('lineLastError', `DB Error: ${dbErr.message}`);
                }
            } else {
                const err = "Failed to fetch profile (Check LINE Channel Access Token)";
                console.error("[LINE Webhook]", err);
                await saveSetting('lineLastError', err);
            }
        }

        return jsonResponse({ status: 'success' });
    } catch (e) {
        console.error("[LINE Webhook Fatal Error]", e.message);
        try {
            const url = new URL(context.request.url);
            const uid = url.searchParams.get('uid');
            if (uid) {
                await context.env.DB.prepare("INSERT INTO settings (key, value, userId, updated_at) VALUES ('lineLastError', ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key, userId) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").bind(`Fatal: ${e.message}`, uid).run();
            } else {
                await context.env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('lineLastError', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").bind(`Fatal: ${e.message}`).run();
            }
        } catch {}
        return errorResponse(e.message);
    }
}

async function fetchLineProfile(userId, accessToken) {
    if (!accessToken) return null;
    try {
        const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error("[fetchLineProfile Error]", e);
        return null;
    }
}
