import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const storeId = context.user.storeId || context.user.id;
        const url = new URL(context.request.url);
        const farmerId = url.searchParams.get('farmerId');
        const employeeId = url.searchParams.get('employeeId');

        let query = `
            SELECT fe.*, e.name as employeeName, e.phone as employeePhone, f.name as farmerName
            FROM farmer_employees fe
            LEFT JOIN employees e ON fe.employeeId = e.id
            LEFT JOIN farmers f ON fe.farmerId = f.id
            WHERE fe.userId = ?
        `;
        const params = [storeId];

        if (farmerId) {
            query += " AND fe.farmerId = ?";
            params.push(farmerId);
        }
        if (employeeId) {
            query += " AND fe.employeeId = ?";
            params.push(employeeId);
        }

        query += " ORDER BY fe.isDefault DESC, e.name ASC";

        const { results } = await context.env.DB.prepare(query).bind(...params).all();
        return jsonResponse(results || []);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const storeId = context.user.storeId || context.user.id;
        const payload = body.payload || body;

        const { farmerId, employeeId, profitSharePct, isDefault } = payload;

        if (!farmerId || !employeeId) {
            return errorResponse("Missing farmerId or employeeId");
        }

        const linkId = payload.id || `fe_${farmerId}_${employeeId}`;
        const defaultVal = isDefault ? 1 : 0;
        const pctVal = Number(profitSharePct ?? 50);

        // If setting as default, clear default for other employees of this farmer
        if (defaultVal === 1) {
            await context.env.DB.prepare(`
                UPDATE farmer_employees SET isDefault = 0 WHERE farmerId = ? AND userId = ?
            `).bind(farmerId, storeId).run();
        }

        await context.env.DB.prepare(`
            INSERT INTO farmer_employees (id, farmerId, employeeId, profitSharePct, isDefault, userId)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(farmerId, employeeId) DO UPDATE SET
                profitSharePct = excluded.profitSharePct,
                isDefault = excluded.isDefault
        `).bind(linkId, farmerId, employeeId, pctVal, defaultVal, storeId).run();

        return jsonResponse({ status: 'success', id: linkId });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);

async function handleDelete(context) {
    try {
        const storeId = context.user.storeId || context.user.id;
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        const farmerId = url.searchParams.get('farmerId');
        const employeeId = url.searchParams.get('employeeId');

        if (id) {
            await context.env.DB.prepare("DELETE FROM farmer_employees WHERE id = ? AND userId = ?").bind(id, storeId).run();
        } else if (farmerId && employeeId) {
            await context.env.DB.prepare("DELETE FROM farmer_employees WHERE farmerId = ? AND employeeId = ? AND userId = ?").bind(farmerId, employeeId, storeId).run();
        } else {
            return errorResponse("Missing link id or farmerId/employeeId parameters");
        }

        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
