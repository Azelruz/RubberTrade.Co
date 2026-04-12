import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const { base64, filename } = body;

        if (!base64 || !filename) {
            return errorResponse('Missing base64 data or filename', 400);
        }

        // Clean base64 data (remove header if present)
        const pureBase64 = base64.replace(/^data:image\/\w+;base64,/, "");
        const binaryString = atob(pureBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const bucket = context.env.BUCKET;
        if (!bucket) {
            console.error("[Upload Error] R2 BUCKET binding not found");
            return errorResponse('Cloudflare R2 Bucket (BUCKET) is not configured. Please enable R2 and ensure it is bound to this project.', 500);
        }

        const key = `receipts/${context.user.id}/${Date.now()}_${filename}`;
        
        // Upload to R2
        try {
            await bucket.put(key, bytes, {
                httpMetadata: { contentType: filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg' }
            });
        } catch (r2Err) {
            console.error("[R2 Upload Error]", r2Err);
            return errorResponse('R2 Upload failed: ' + r2Err.message, 500);
        }

        // Generate URL proxy path
        const url = `/api/files/${key}`;

        return jsonResponse({
            status: 'success',
            url: url,
            key: key,
            message: 'Uploaded to Cloudflare R2'
        });
    } catch (e) {
        console.error("[Upload Function Error]", e);
        return errorResponse('Upload failed: ' + e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
