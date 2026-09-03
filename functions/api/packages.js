import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const db = context.env.DB;
        const packages = await db.prepare("SELECT * FROM subscription_packages ORDER BY days ASC").all();
        
        const res = jsonResponse({
            status: 'success',
            packages: packages?.results || []
        });
        res.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
        return res;
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
