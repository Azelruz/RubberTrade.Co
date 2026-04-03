import { jsonResponse, errorResponse } from './_utils.js';

/**
 * Broadcast New Price to all connected Farmers via LINE Multicast/Broadcast
 */
export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { newPrice, imageUrl } = body;

        if (!newPrice || !imageUrl) {
            return errorResponse('Missing newPrice or imageUrl', 400);
        }

        const db = context.env.DB;

        // 1. Get LINE credentials from settings
        const { results: settings } = await db.prepare("SELECT * FROM settings WHERE key IN ('lineChannelAccessToken', 'lineChannelSecret')").all();
        const creds = {};
        settings.forEach(s => creds[s.key] = s.value);

        if (!creds.lineChannelAccessToken) {
            return errorResponse('LINE Channel Access Token not configured in settings', 500);
        }

        // 2. Get all farmers with lineId
        const { results: farmers } = await db.prepare("SELECT lineId FROM farmers WHERE lineId IS NOT NULL").all();
        
        if (!farmers || farmers.length === 0) {
            return jsonResponse({ status: 'skipped', message: 'No farmers connected to LINE' });
        }

        const lineIds = farmers.map(f => f.lineId);
        
        // 3. Construct absolute image URL
        const url = new URL(context.request.url);
        const baseUrl = `${url.protocol}//${url.host}`;
        const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;

        console.log(`[LINE Broadcast] Sending price ${newPrice} to ${lineIds.length} users. Image: ${absoluteImageUrl}`);

        // 4. Send Multicast Message via LINE Messaging API (Limited to 500 users per call)
        // For simplicity, we assume < 500 users for now. If > 500, we should chunk.
        const linePayload = {
            to: lineIds.slice(0, 500), 
            messages: [
                {
                    type: "text",
                    text: `📢 แจ้งราคากลางน้ำยางสดประจำวันที่ ${new Date().toLocaleDateString('th-TH')}\n💰 ราคา: ${newPrice} บาท/กก.`
                },
                {
                    type: "image",
                    originalContentUrl: absoluteImageUrl,
                    previewImageUrl: absoluteImageUrl
                }
            ]
        };

        const res = await fetch('https://api.line.me/v2/bot/message/multicast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${creds.lineChannelAccessToken}`
            },
            body: JSON.stringify(linePayload)
        });

        const resText = await res.text();
        if (!res.ok) {
            console.error("[LINE Multicast Error Response]", resText);
            return errorResponse(`LINE API Error: ${resText}`, res.status);
        }

        return jsonResponse({ 
            status: 'success', 
            message: `Notified ${lineIds.length} farmers via LINE`,
            lineResponse: resText 
        });

    } catch (e) {
        console.error("[broadcast-price Fatal Error]", e);
        return errorResponse(e.message);
    }
}
