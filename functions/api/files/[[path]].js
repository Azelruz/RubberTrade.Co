import { errorResponse } from '../_utils.js';

export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const key = url.pathname.split('/api/files/')[1];

        if (!key) {
            return errorResponse('Missing file key', 400);
        }

        const bucket = context.env.BUCKET;
        const object = await bucket.get(key);

        if (object === null) {
            return new Response('Object Not Found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000');

        return new Response(object.body, {
            headers,
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}
