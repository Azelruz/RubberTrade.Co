import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const db = context.env.DB;
        const packages = await db.prepare("SELECT * FROM subscription_packages ORDER BY days ASC").all();
        
        return jsonResponse({
            status: 'success',
            packages: packages?.results || []
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
