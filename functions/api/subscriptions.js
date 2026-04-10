import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const db = context.env.DB;
        const userId = context.user.id;
        
        const [user, requests, bankSettings] = await Promise.all([
            db.prepare("SELECT subscription_status, subscription_expiry FROM users WHERE id = ?").bind(userId).first(),
            db.prepare("SELECT * FROM subscription_requests WHERE userId = ? ORDER BY requestedAt DESC").bind(userId).all(),
            db.prepare("SELECT key, value FROM settings WHERE userId = 'SYSTEM' AND key IN ('bank_name', 'bank_account', 'bank_owner', 'promptpay_id')").all()
        ]);

        const settingsObj = {};
        bankSettings?.results?.forEach(row => {
            settingsObj[row.key] = row.value;
        });
        
        return jsonResponse({
            status: 'success',
            subscription: user,
            requests: requests?.results || [],
            payment_info: settingsObj
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}

async function handlePost(context) {
    try {
        const db = context.env.DB;
        const userId = context.user.id;
        const body = await context.request.json();
        const { base64, filename, amount, packageName, requestedDays } = body;

        if (!base64 || !filename) {
            return errorResponse('Missing slip image data', 400);
        }

        // Upload to R2 (Modern binary conversion)
        const fetchRes = await fetch(base64);
        const bytes = await fetchRes.arrayBuffer();

        const bucket = context.env.BUCKET;
        if (!bucket) {
            return errorResponse('Bucket not found', 500);
        }

        // Sanitize filename for R2 key (only allow alphanumeric, dots, dashes, underscores)
        const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const key = `slips/${userId}_${Date.now()}_${safeFilename}`;
        
        try {
            await bucket.put(key, bytes, {
                httpMetadata: { contentType: filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg' }
            });
        } catch (r2Err) {
            console.error("R2 Put Error:", r2Err);
            return errorResponse(`R2 Upload Error: ${r2Err.message || 'Internal Storage Error (10001)'}`, 500);
        }

        const slipUrl = `/api/files/${key}`;
        const requestId = 'sr_' + Date.now();

        await db.prepare("INSERT INTO subscription_requests (id, userId, slipUrl, amount, status, package_name, requested_days) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(requestId, userId, slipUrl, amount || 0, 'pending', packageName || null, requestedDays || null)
            .run();

        return jsonResponse({
            status: 'success',
            message: 'Subscription request submitted successfully',
            requestId
        });
    } catch (e) {
        console.error("Subscription handlePost Error:", e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
export const onRequestPost = withAuth(handlePost);
