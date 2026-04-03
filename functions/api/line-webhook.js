import { jsonResponse, errorResponse } from './_utils.js';

/**
 * LINE Messaging API Webhook
 * This endpoint handles events from LINE OA (follow, unfollow, message, etc.)
 */
export async function onRequestPost(context) {
    try {
        const bodyRaw = await context.request.text();
        console.log("[LINE Webhook] Raw body:", bodyRaw);

        // Save raw body to settings for debugging
        await context.env.DB.prepare(
            "INSERT INTO settings (key, value, updated_at) VALUES ('lineLastEvent', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
        ).bind(bodyRaw).run();

        let body;
        try {
            body = JSON.parse(bodyRaw);
        } catch (e) {
            return jsonResponse({ status: 'error', message: 'Invalid JSON' });
        }

        const { events } = body;
        console.log(`[LINE Webhook] Received ${events?.length || 0} events`);

        const db = context.env.DB;

        // Immediately update status to show we received SOMETHING
        const timestamp = new Date().toLocaleTimeString();
        await db.prepare(
            "INSERT INTO settings (key, value, updated_at) VALUES ('lineLastStatus', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP"
        ).bind(`ได้รับข้อมูลเมื่อ ${timestamp} (จำนวน ${events?.length || 0} รายการ)`).run();

        if (!events || events.length === 0) {
            return jsonResponse({ status: 'ok', message: 'No events' });
        }
        
        // Get LINE credentials from settings
        const { results: settings } = await db.prepare("SELECT * FROM settings WHERE key IN ('lineChannelAccessToken', 'lineChannelSecret')").all();
        const creds = {};
        settings.forEach(s => creds[s.key] = s.value);

        if (!creds.lineChannelAccessToken || !creds.lineChannelSecret) {
            const err = "Missing credentials in settings";
            console.error("[LINE Webhook]", err);
            await db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('lineLastError', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").bind(err).run();
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
                    await db.prepare(`
                        INSERT INTO farmers (id, name, lineId, lineName, linePicture)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT(lineId) DO UPDATE SET
                            lineName = excluded.lineName,
                            linePicture = excluded.linePicture
                    `).bind(id, profile.displayName, lineId, profile.displayName, profile.pictureUrl || null).run();
                    console.log(`[LINE Webhook] Farmer upserted successfully`);
                    
                    await db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('lineLastStatus', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").bind(`สำเร็จ: เชื่อมต่อคุณ ${profile.displayName} เรียบร้อย`).run();
                } catch (dbErr) {
                    console.error("[LINE Webhook] DB Error during upsert:", dbErr.message);
                    await db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('lineLastError', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").bind(`DB Error: ${dbErr.message}`).run();
                }
            } else {
                const err = "Failed to fetch profile (Check LINE Channel Access Token)";
                console.error("[LINE Webhook]", err);
                await db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('lineLastError', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").bind(err).run();
            }
        }

        return jsonResponse({ status: 'success' });
    } catch (e) {
        console.error("[LINE Webhook Fatal Error]", e.message);
        try {
            await context.env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('lineLastError', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP").bind(`Fatal: ${e.message}`).run();
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
