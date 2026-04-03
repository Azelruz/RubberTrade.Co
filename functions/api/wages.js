import { jsonResponse, errorResponse } from './_utils.js';

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare(
            `SELECT w.*, s.name as staffName 
             FROM wages w 
             LEFT JOIN staff s ON w.staffId = s.id 
             ORDER BY w.created_at DESC`
        ).all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload;
        const id = payload?.id || crypto.randomUUID();
        
        // Handle bulk wages (addBulkWages)
        if (body.action === 'addBulkWages' && Array.isArray(body.payloads)) {
            const stmts = body.payloads.map(p => {
                const wid = crypto.randomUUID();
                const { date, staffId, staffName, dailyWage, bonus, workDays, total, note, description } = p;
                return context.env.DB.prepare(
                    "INSERT INTO wages (id, date, staffId, staffName, dailyWage, bonus, workDays, total, note, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                ).bind(
                    wid, date || null, staffId || null, staffName || null, 
                    Number(dailyWage) || 0, Number(bonus) || 0, Number(workDays) || 0, Number(total) || 0, 
                    note || null, description || null
                );
            });
            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: stmts.length });
        }
        
        // Handle single wage
        const { date, staffId, staffName, dailyWage, bonus, workDays, total, note, description } = payload;
        
        await context.env.DB.prepare(
            "INSERT INTO wages (id, date, staffId, staffName, dailyWage, bonus, workDays, total, note, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            id, date || null, staffId || null, staffName || null, 
            Number(dailyWage) || 0, Number(bonus) || 0, Number(workDays) || 0, Number(total) || 0, 
            note || null, description || null
        ).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /wages Error]", e);
        return errorResponse(e.message);
    }
}
