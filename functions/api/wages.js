import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare(
            `SELECT w.*, s.name as staffName 
             FROM wages w 
             LEFT JOIN staff s ON w.staffId = s.id 
             WHERE w.userId = ?
             ORDER BY w.created_at DESC`
        ).bind(context.user.id).all();
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
        const id = payload?.id || crypto.randomUUID();
        const userId = context.user.id;
        
        // Handle bulk wages (addBulkWages)
        if (body.action === 'addBulkWages' && Array.isArray(body.payloads)) {
            const stmts = body.payloads.map(p => {
                const wid = crypto.randomUUID();
                const { date, staffId, staffName, dailyWage, bonus, workDays, total, note, description } = p;
                return context.env.DB.prepare(
                    "INSERT OR REPLACE INTO wages (id, date, staffId, staffName, dailyWage, bonus, workDays, total, note, description, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                ).bind(
                    wid, date || null, staffId || null, staffName || null, 
                    Number(dailyWage) || 0, Number(bonus) || 0, Number(workDays) || 0, Number(total) || 0, 
                    note || null, description || null, userId
                );
            });
            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: stmts.length });
        }
        
        // Handle single wage
        const { date, staffId, staffName, dailyWage, bonus, workDays, total, note, description } = payload;
        
        await context.env.DB.prepare(
            "INSERT OR REPLACE INTO wages (id, date, staffId, staffName, dailyWage, bonus, workDays, total, note, description, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            id, date || null, staffId || null, staffName || null, 
            Number(dailyWage) || 0, Number(bonus) || 0, Number(workDays) || 0, Number(total) || 0, 
            note || null, description || null, userId
        ).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /wages Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
