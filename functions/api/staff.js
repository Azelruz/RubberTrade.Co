import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const storeId = context.user.storeId || context.user.id;
        const { results } = await context.env.DB.prepare("SELECT * FROM staff WHERE userId = ? ORDER BY name ASC").bind(storeId).all();
        const res = jsonResponse(results);
        res.headers.set('Vary', 'Accept-Encoding, Authorization, X-Switch-Store-ID');
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        return res;
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const storeId = context.user.storeId || context.user.id;

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
                `).bind(
                    id, 
                    name ?? null, 
                    phone ?? null, 
                    address ?? null, 
                    salary ?? 0, 
                    bonus ?? 0, 
                    note ?? null, 
                    storeId
                );
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
        `).bind(
            id, 
            name ?? null, 
            phone ?? null, 
            address ?? null, 
            salary ?? 0, 
            bonus ?? 0, 
            note ?? null, 
            storeId
        ).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
