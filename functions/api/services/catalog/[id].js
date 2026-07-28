import { jsonResponse, errorResponse, withAuth } from '../../_utils.js';

async function handleDelete(context) {
    try {
        const id = context.params.id;
        const storeId = context.user?.storeId || 'DEFAULT_STORE';
        if (!id) return errorResponse('Missing ID', 400);

        await context.env.DB.prepare("DELETE FROM service_catalog WHERE id = ? AND userId = ?")
            .bind(id, storeId).run();
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);

async function handlePost(context) {
    try {
        const id = context.params.id;
        const body = await context.request.json();
        const payload = body.payload || body;
        const targetId = id || payload.id || crypto.randomUUID();
        const storeId = context.user?.storeId || 'DEFAULT_STORE';
        
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
        `).bind(targetId, name, unit_type, price_per_unit, description, is_active, storeId).run();

        return jsonResponse({ status: 'success', id: targetId });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);
