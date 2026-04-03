import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { action, lineId, accessToken, payload } = body;
        const db = context.env.DB;

        // basic verification if accessToken and lineId are provided
        if (accessToken) {
            const profile = await verifyLineUser(accessToken);
            if (!profile || (lineId && profile.userId !== lineId)) {
                return errorResponse('Authentication failed (Invalid Token)', 401);
            }
        } else {
             return errorResponse('Missing Access Token', 401);
        }

        if (action === 'getFarmer') {
            const farmer = await db.prepare("SELECT * FROM farmers WHERE lineId = ?").bind(lineId).first();
            if (!farmer) {
                // Return a placeholder or empty if not found
                return jsonResponse({ status: 'not_found' });
            }
            return jsonResponse({ status: 'success', data: farmer });
        }

        if (action === 'updateFarmer') {
            const { name, phone, bankAccount, bankName, address, note } = payload;
            await db.prepare(`
                UPDATE farmers 
                SET name = ?, phone = ?, bankAccount = ?, bankName = ?, address = ?, note = ?
                WHERE lineId = ?
            `).bind(name, phone, bankAccount, bankName, address, note, lineId).run();
            return jsonResponse({ status: 'success' });
        }

        if (action === 'addEmployee') {
            const farmer = await db.prepare("SELECT id FROM farmers WHERE lineId = ?").bind(lineId).first();
            if (!farmer) return errorResponse('Farmer not found', 404);

            const id = crypto.randomUUID();
            const { name, phone, bankAccount, bankName, profitSharePct } = payload;
            
            await db.prepare(`
                INSERT INTO employees (id, name, farmerId, phone, bankAccount, bankName, profitSharePct)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(id, name, farmer.id, phone, bankAccount, bankName, profitSharePct).run();
            
            return jsonResponse({ status: 'success', id });
        }

        return errorResponse('Invalid action', 400);
    } catch (e) {
        return errorResponse(e.message);
    }
}

async function verifyLineUser(accessToken) {
    try {
        const res = await fetch('https://api.line.me/v2/profile', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}
