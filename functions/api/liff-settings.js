import { jsonResponse, errorResponse } from './_utils.js';

/**
 * Public endpoint to fetch LIFF IDs and basic shop info for LIFF apps.
 * Requires shopId (userId of the dealer/owner)
 */
export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const shopId = url.searchParams.get('shopId');
        
        if (!shopId) return errorResponse('Missing shopId parameter', 400);
        
        const db = context.env.DB;
        const keys = ['lineLiffIdProfile', 'lineLiffIdAddEmployee', 'factoryName', 'logoUrl'];
        
        const { results } = await db.prepare(
            `SELECT key, value FROM settings WHERE userId = ? AND key IN (${keys.map(() => '?').join(',')})`
        ).bind(shopId, ...keys).all();
        
        const settings = {};
        // Set defaults for missing keys
        settings.lineLiffIdProfile = '2009445413-LKTCq5J8'; // Fallback to original global IDs if not set
        settings.lineLiffIdAddEmployee = '2009445413-EuVTEBaS';
        
        results.forEach(r => {
            settings[r.key] = r.value;
        });
        
        return jsonResponse(settings);
    } catch (e) {
        return errorResponse(e.message);
    }
}
