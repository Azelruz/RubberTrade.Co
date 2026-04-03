import { jsonResponse, errorResponse } from './_utils.js';

/**
 * Send Receipt Image to Farmer via LINE Messaging API
 */
export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { farmerId, receiptUrl } = body;

        if (!farmerId || !receiptUrl) {
            return errorResponse('Missing farmerId or receiptUrl', 400);
        }

        const db = context.env.DB;

        // 1. Get LINE credentials from settings
        const { results: settings } = await db.prepare("SELECT * FROM settings WHERE key IN ('lineChannelAccessToken', 'lineChannelSecret')").all();
        const creds = {};
        settings.forEach(s => creds[s.key] = s.value);

        if (!creds.lineChannelAccessToken) {
            return errorResponse('LINE Channel Access Token not configured in settings', 500);
        }

        // 2. Get farmer's lineId
        const farmer = await db.prepare("SELECT lineId, name FROM farmers WHERE id = ?").bind(farmerId).first();
        if (!farmer) {
            return errorResponse('Farmer record not found', 404);
        }
        
        if (!farmer.lineId) {
            return jsonResponse({ status: 'skipped', message: 'Farmer not connected to LINE' });
        }

        // 3. Construct absolute image URL
        // receiptUrl is relative like "/api/files/receipts/..."
        const url = new URL(context.request.url);
        // Important: Use the stable domain if possible, or current host
        const baseUrl = `${url.protocol}//${url.host}`;
        const absoluteImageUrl = `${baseUrl}${receiptUrl}`;

        console.log(`[LINE Push] Sending to ${farmer.name} (${farmer.lineId}) URL: ${absoluteImageUrl}`);

        // 4. Send Message via LINE Messaging API
        const linePayload = {
            to: farmer.lineId,
            messages: [
                {
                    type: "text",
                    text: `ใบเสร็จการรับซื้อของคุณ ${farmer.name} ประจำวันที่ ${new Date().toLocaleDateString('th-TH')}`
                },
                {
                    type: "image",
                    originalContentUrl: absoluteImageUrl,
                    previewImageUrl: absoluteImageUrl
                }
            ]
        };

        const res = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${creds.lineChannelAccessToken}`
            },
            body: JSON.stringify(linePayload)
        });

        const resText = await res.text();
        if (!res.ok) {
            console.error("[LINE Push Error Response]", resText);
            return errorResponse(`LINE API Error: ${resText}`, res.status);
        }

        return jsonResponse({ 
            status: 'success', 
            message: 'Receipt sent to LINE successfully',
            lineResponse: resText 
        });

    } catch (e) {
        console.error("[send-line-receipt Fatal Error]", e);
        return errorResponse(e.message);
    }
}
