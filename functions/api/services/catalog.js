import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

async function initTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS service_catalog (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            unit_type TEXT NOT NULL,
            price_per_unit REAL DEFAULT 0,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            userId TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `).run();

    // Purge legacy shared static IDs to prevent cross-store leakage
    try {
        await db.prepare("DELETE FROM service_catalog WHERE id IN ('srv_1', 'srv_2', 'srv_3', 'srv_4')").run();
    } catch (e) {}
}

async function handleGet(context) {
    try {
        await initTable(context.env.DB);
        const storeId = context.user?.storeId || 'DEFAULT_STORE';
        const { results } = await context.env.DB.prepare(
            "SELECT * FROM service_catalog WHERE userId = ? AND id NOT IN ('srv_1', 'srv_2', 'srv_3', 'srv_4') ORDER BY created_at DESC"
        ).bind(storeId).all();
        return jsonResponse(results || []);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        await initTable(context.env.DB);
        const body = await context.request.json();
        const payload = body.payload || body;
        const id = payload.id || crypto.randomUUID();
        const storeId = context.user?.storeId || 'DEFAULT_STORE';

        // Prevent adding legacy shared IDs
        if (['srv_1', 'srv_2', 'srv_3', 'srv_4'].includes(id)) {
            return jsonResponse({ status: 'ignored', message: 'Legacy static ID skipped' });
        }

        const name = payload.name ?? 'บริการทั่วไป';
        const unit_type = payload.unit_type ?? 'rai';
        const price_per_unit = Number(payload.price_per_unit || 0);
        const description = payload.description ?? '';
        const is_active = payload.is_active !== false ? 1 : 0;

        await context.env.DB.prepare(`
            INSERT INTO service_catalog (id, name, unit_type, price_per_unit, description, is_active, userId)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                unit_type = excluded.unit_type,
                price_per_unit = excluded.price_per_unit,
                description = excluded.description,
                is_active = excluded.is_active,
                userId = excluded.userId
        `).bind(id, name, unit_type, price_per_unit, description, is_active, storeId).run();

        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);

async function handleDelete(context) {
    try {
        await initTable(context.env.DB);
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        if (!id) return errorResponse('Missing ID');

        const storeId = context.user?.storeId || 'DEFAULT_STORE';
        await context.env.DB.prepare("DELETE FROM service_catalog WHERE id = ? AND userId = ?")
            .bind(id, storeId).run();
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
