import { jsonResponse, errorResponse } from './_utils.js';

async function ensureTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS chemical_usage (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            chemicalId TEXT NOT NULL,
            amount REAL NOT NULL,
            unit TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `).run();
}

export async function onRequestGet(context) {
    try {
        await ensureTable(context.env.DB);
        const { results } = await context.env.DB.prepare(
            "SELECT * FROM chemical_usage ORDER BY date DESC, created_at DESC"
        ).all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export async function onRequestPost(context) {
    try {
        await ensureTable(context.env.DB);
        const body = await context.request.json();
        
        if (body.action === 'addBulkUsage') {
            const payloads = body.payloads || [];
            if (payloads.length === 0) return jsonResponse({ status: 'success', message: 'No payloads' });

            // We use individual UPSERTs or just batch for simplicity
            // For bulk from Dashboard, we usually assume new or overwrite.
            // Let's use INSERT OR REPLACE if we had a unique constraint, but we'll do it sequentially here for safety or batch with a smart query.
            const stmts = payloads.map(p => {
                return context.env.DB.prepare(
                    "INSERT INTO chemical_usage (id, date, chemicalId, amount, unit) VALUES (?, ?, ?, ?, ?) " +
                    "ON CONFLICT(id) DO UPDATE SET amount=excluded.amount, date=excluded.date, chemicalId=excluded.chemicalId"
                ).bind(p.id || crypto.randomUUID(), p.date, p.chemicalId, p.amount, p.unit || 'กก.');
            });

            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: payloads.length });
        }

        // Single add or update
        const payload = body.payload || body; // Support both wrapped and direct
        const { date, chemicalId, amount, unit } = payload;
        
        // Find existing record for same date and chemical
        const existing = await context.env.DB.prepare(
            "SELECT id FROM chemical_usage WHERE date = ? AND chemicalId = ?"
        ).bind(date, chemicalId).first();

        if (existing) {
            await context.env.DB.prepare(
                "UPDATE chemical_usage SET amount = ?, unit = ? WHERE id = ?"
            ).bind(amount, unit || 'กก.', existing.id).run();
            return jsonResponse({ status: 'success', action: 'updated', id: existing.id });
        } else {
            const id = payload.id || crypto.randomUUID();
            await context.env.DB.prepare(
                "INSERT INTO chemical_usage (id, date, chemicalId, amount, unit) VALUES (?, ?, ?, ?, ?)"
            ).bind(id, date, chemicalId, amount, unit || 'กก.').run();
            return jsonResponse({ status: 'success', action: 'inserted', id });
        }
    } catch (e) {
        console.error("[POST /chemicals Error]", e);
        return errorResponse(e.message);
    }
}

export async function onRequestDelete(context) {
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        if (!id) return errorResponse("Missing ID");

        await context.env.DB.prepare("DELETE FROM chemical_usage WHERE id = ?").bind(id).run();
        return jsonResponse({ status: 'success', message: 'Record deleted' });
    } catch (e) {
        return errorResponse(e.message);
    }
}
