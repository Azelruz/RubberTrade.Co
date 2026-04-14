import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM staff WHERE userId = ? ORDER BY name ASC").bind(context.user.storeId).all();
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

        // Bulk Insert Support
        if (body.action === 'bulk' && Array.isArray(body.payloads)) {
            const stmts = body.payloads.map(p => {
                const id = p.id || crypto.randomUUID();
                const { name, phone, address, salary, bonus, note } = p;
                return context.env.DB.prepare(`
                    INSERT INTO staff (id, name, phone, address, salary, bonus, note, userId) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        phone = excluded.phone,
                        address = excluded.address,
                        salary = excluded.salary,
                        bonus = excluded.bonus,
                        note = excluded.note
                `).bind(id, name, phone, address, salary, bonus, note, context.user.storeId);
            });
            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: stmts.length });
        }

        const payload = body.payload;
        const id = payload.id || crypto.randomUUID();
        const { name, phone, address, salary, bonus, note } = payload;
        
        await context.env.DB.prepare(`
            INSERT INTO staff (id, name, phone, address, salary, bonus, note, userId) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                phone = excluded.phone,
                address = excluded.address,
                salary = excluded.salary,
                bonus = excluded.bonus,
                note = excluded.note
        `).bind(id, name, phone, address, salary, bonus, note, context.user.storeId).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
