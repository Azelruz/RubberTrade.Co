import { jsonResponse, errorResponse, withAuth } from './_utils.js';
import { validatePayload } from './_validation.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM expenses WHERE userId = ? ORDER BY date DESC, created_at DESC").bind(context.user.storeId).all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload;
        const userId = context.user.id;

        const expenseSchema = {
            date: { type: 'date', label: 'วันที่' },
            amount: { type: 'number', label: 'จำนวนเงิน', min: 0.01 }
        };

        try {
            validatePayload(payload, expenseSchema);
        } catch (valErr) {
            return errorResponse(`ข้อมูลไม่ถูกต้อง: ${valErr.message}`);
        }

        const id = payload.id || crypto.randomUUID();
        const { date, category, description, amount, note } = payload;
        
        await context.env.DB.prepare(`
            INSERT INTO expenses (id, date, category, description, amount, note, userId) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                date = excluded.date,
                category = excluded.category,
                description = excluded.description,
                amount = excluded.amount,
                note = excluded.note
        `).bind(id, date || null, category || null, description || null, amount || 0, note || null, context.user.storeId).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /expenses Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
