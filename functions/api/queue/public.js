import { jsonResponse, errorResponse } from '../_utils.js';

// GET: Fetch today's queues for a specific store without authentication (for TV display)
export async function onRequestGet(context) {
    try {
        const url = new URL(context.request.url);
        const storeId = url.searchParams.get('storeId');

        if (!storeId) {
            return errorResponse("กรุณาระบุรหัสร้านค้า (storeId)", 400);
        }

        // Generate current date in Bangkok timezone (YYYY-MM-DD)
        const dateStr = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'Asia/Bangkok', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        }).format(new Date());

        // Fetch queues matching the storeId for today
        const { results } = await context.env.DB.prepare(`
            SELECT * FROM queues 
            WHERE userId = ? AND created_at LIKE ?
            ORDER BY created_at ASC
        `).bind(storeId, `${dateStr}%`).all();

        return jsonResponse(results);
    } catch (e) {
        console.error("[GET /api/queue/public Error]", e);
        return errorResponse(e.message);
    }
}
