import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare(
            "SELECT * FROM chemical_usage WHERE userId = ? ORDER BY date DESC, created_at DESC"
        ).bind(context.user.storeId).all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const userId = context.user.id;
        
        if (body.action === 'addBulkUsage') {
            const payloads = body.payloads || [];
            if (payloads.length === 0) return jsonResponse({ status: 'success', message: 'No payloads' });

            const stmts = payloads.map(p => {
                return context.env.DB.prepare(`
                    INSERT INTO chemical_usage (id, date, chemicalId, amount, unit, userId) 
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        date = excluded.date,
                        chemicalId = excluded.chemicalId,
                        amount = excluded.amount,
                        unit = excluded.unit
                `).bind(p.id || crypto.randomUUID(), p.date, p.chemicalId, p.amount, p.unit || 'กก.', context.user.storeId);
            });

            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: payloads.length });
        }

        // Single add or update
        const payload = body.payload || body; 
        const { date, chemicalId, amount, unit } = payload;
        
        // Find existing record for same date and chemical
        const existing = await context.env.DB.prepare(
            "SELECT id FROM chemical_usage WHERE date = ? AND chemicalId = ? AND userId = ?"
        ).bind(date, chemicalId, context.user.storeId).first();

        if (existing) {
            await context.env.DB.prepare(
                "UPDATE chemical_usage SET amount = ?, unit = ? WHERE id = ? AND userId = ?"
            ).bind(amount, unit || 'กก.', existing.id, context.user.storeId).run();
            return jsonResponse({ status: 'success', action: 'updated', id: existing.id });
        } else {
            const id = payload.id || crypto.randomUUID();
            await context.env.DB.prepare(
                "INSERT INTO chemical_usage (id, date, chemicalId, amount, unit, userId) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(id, date, chemicalId, amount, unit || 'กก.', context.user.storeId).run();
            return jsonResponse({ status: 'success', action: 'inserted', id });
        }
    } catch (e) {
        console.error("[POST /chemicals Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);

async function handleDelete(context) {
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        const userId = context.user.id;
        if (!id) return errorResponse("Missing ID");

        await context.env.DB.prepare("DELETE FROM chemical_usage WHERE id = ? AND userId = ?").bind(id, context.user.storeId).run();
        return jsonResponse({ status: 'success', message: 'Record deleted' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
