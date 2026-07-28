import { jsonResponse, errorResponse, withAuth } from './_utils.js';

// GET: Fetch today's queues for this store
async function handleGet(context) {
    try {
        const storeId = context.user.storeId;
        // Generate current date in Bangkok timezone (YYYY-MM-DD)
        const dateStr = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'Asia/Bangkok', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        }).format(new Date());

        const { results } = await context.env.DB.prepare(`
            SELECT * FROM queues 
            WHERE userId = ? AND created_at LIKE ?
            ORDER BY created_at ASC
        `).bind(storeId, `${dateStr}%`).all();

        return jsonResponse(results);
    } catch (e) {
        console.error("[GET /api/queue Error]", e);
        return errorResponse(e.message);
    }
}

// POST: Add/Create a new queue ticket
async function handlePost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload || body;
        const storeId = context.user.storeId;

        if (!payload.farmer_id || !payload.farmer_name) {
            return errorResponse("กรุณาระบุข้อมูลเกษตรกร");
        }

        // Generate current date in Bangkok timezone
        const dateStr = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'Asia/Bangkok', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        }).format(new Date());

        // Find the next daily queue number for this store
        const qRes = await context.env.DB.prepare(`
            SELECT COALESCE(MAX(queue_no), 0) as maxQ 
            FROM queues 
            WHERE userId = ? AND created_at LIKE ?
        `).bind(storeId, `${dateStr}%`).first();
        
        const nextQueueNo = (qRes?.maxQ || 0) + 1;
        const id = payload.id || crypto.randomUUID();
        const status = payload.status || 'waiting_drc';

        // Insert new queue record
        await context.env.DB.prepare(`
            INSERT INTO queues (
                id, queue_no, farmer_id, farmer_name, rubber_type, 
                weight, bucket_weight, drc, status, userId, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
        `).bind(
            id,
            nextQueueNo,
            payload.farmer_id,
            payload.farmer_name,
            payload.rubber_type || 'fresh_latex',
            payload.weight || 0,
            payload.bucket_weight || 0,
            payload.drc || 0,
            status,
            storeId
        ).run();

        return jsonResponse({ 
            status: 'success', 
            id, 
            queue_no: nextQueueNo 
        });
    } catch (e) {
        console.error("[POST /api/queue Error]", e);
        return errorResponse(e.message);
    }
}

// PUT: Update queue status / details (DRC, weight, calling, completed)
async function handlePut(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload || body;
        const storeId = context.user.storeId;

        if (!payload.id) {
            return errorResponse("Missing queue ID");
        }

        // We build SQL dynamically depending on which fields are provided
        const fields = [];
        const binds = [];

        const allowedFields = [
            'status', 'weight', 'bucket_weight', 'drc', 
            'called_at', 'completed_at', 'rubber_type'
        ];

        for (const field of allowedFields) {
            if (payload[field] !== undefined) {
                fields.push(`${field} = ?`);
                binds.push(payload[field]);
            }
        }

        if (fields.length === 0) {
            return jsonResponse({ status: 'success', message: 'No fields to update' });
        }

        binds.push(payload.id);
        binds.push(storeId);

        const query = `
            UPDATE queues 
            SET ${fields.join(', ')} 
            WHERE id = ? AND userId = ?
        `;

        await context.env.DB.prepare(query).bind(...binds).run();

        return jsonResponse({ status: 'success' });
    } catch (e) {
        console.error("[PUT /api/queue Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePut);
