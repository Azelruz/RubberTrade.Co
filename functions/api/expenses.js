import { jsonResponse, errorResponse, withAuth } from './_utils.js';
import { validatePayload } from './_validation.js';

async function handleGet(context) {
    try {
        const url = new URL(context.request.url);
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const category = url.searchParams.get('category');
        const search = url.searchParams.get('search');
        const since = url.searchParams.get('since');

        let whereClauses = ["userId = ?"];
        const params = [context.user.storeId];

        if (since) {
            whereClauses.push("updated_at > ?");
            params.push(since);
        }
        if (startDate) {
            whereClauses.push("date >= ?");
            params.push(startDate);
        }
        if (endDate) {
            const endDateBound = endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate;
            whereClauses.push("date <= ?");
            params.push(endDateBound);
        }
        if (category) {
            whereClauses.push("category = ?");
            params.push(category);
        }
        if (search) {
            whereClauses.push("(description LIKE ? OR category LIKE ? OR note LIKE ?)");
            const pattern = `%${search}%`;
            params.push(pattern, pattern, pattern);
        }

        const query = `SELECT * FROM expenses WHERE ${whereClauses.join(' AND ')} ORDER BY date DESC, created_at DESC`;
        const { results } = await context.env.DB.prepare(query).bind(...params).all();
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
            validatePayload(payload, expenseSchema, context.user.timezone);
        } catch (valErr) {
            return errorResponse(`ข้อมูลไม่ถูกต้อง: ${valErr.message}`);
        }

        const id = payload.id || crypto.randomUUID();
        const { date, category, description, amount, note, tax_type, tax_amount } = payload;
        
        await context.env.DB.prepare(`
            INSERT INTO expenses (id, date, category, description, amount, note, userId, tax_type, tax_amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                date = excluded.date,
                category = excluded.category,
                description = excluded.description,
                amount = excluded.amount,
                note = excluded.note,
                tax_type = excluded.tax_type,
                tax_amount = excluded.tax_amount
        `).bind(
            id, 
            date || null, 
            category || null, 
            description || null, 
            amount || 0, 
            note || null, 
            context.user.storeId,
            tax_type || 'none',
            tax_amount || 0
        ).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /expenses Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
