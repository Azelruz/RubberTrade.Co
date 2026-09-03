import { jsonResponse, errorResponse, withAuth } from './_utils.js';
import { validatePayload } from './_validation.js';

async function handleGet(context) {
    try {
        const url = new URL(context.request.url);
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const search = url.searchParams.get('search');
        const since = url.searchParams.get('since');

        let whereClauses = ["w.userId = ?"];
        const params = [context.user.storeId];

        if (since) {
            whereClauses.push("w.updated_at > ?");
            params.push(since);
        }
        if (startDate) {
            whereClauses.push("w.date >= ?");
            params.push(startDate);
        }
        if (endDate) {
            const endDateBound = endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate;
            whereClauses.push("w.date <= ?");
            params.push(endDateBound);
        }
        if (search) {
            whereClauses.push("(w.staffName LIKE ? OR s.name LIKE ? OR w.note LIKE ?)");
            const pattern = `%${search}%`;
            params.push(pattern, pattern, pattern);
        }

        const fromClause = search ? 'FROM wages w LEFT JOIN staff s ON w.staffId = s.id' : 'FROM wages w';
        const query = `SELECT w.* ${fromClause} WHERE ${whereClauses.join(' AND ')} ORDER BY w.date DESC, w.created_at DESC`;
        const { results } = await context.env.DB.prepare(query).bind(...params).all();
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
        const payload = body.payload;
        const id = payload?.id || crypto.randomUUID();
        const userId = context.user.id;
        
        // Handle bulk wages (addBulkWages)
        if (body.action === 'addBulkWages' && Array.isArray(body.payloads)) {
            const wageSchema = {
                date: { type: 'date', label: 'วันที่' },
                workDays: { type: 'number', label: 'จำนวนวันทำงาน', min: 0.1 },
                dailyWage: { type: 'number', label: 'ค่าแรงรายวัน', min: 0 },
                bonus: { type: 'number', label: 'โบนัส', min: 0 }
            };

            const stmts = body.payloads.map((p, idx) => {
                // Server-side Validation
                try {
                    validatePayload(p, wageSchema, context.user.timezone);
                } catch (valErr) {
                    throw new Error(`ข้อมูลรายการที่ ${idx + 1} ไม่ถูกต้อง: ${valErr.message}`);
                }

                const wid = crypto.randomUUID();
                const { date, staffId, staffName, dailyWage, bonus, workDays, total, note, description } = p;
                return context.env.DB.prepare(`
                    INSERT INTO wages (id, date, staffId, staffName, dailyWage, bonus, workDays, total, note, description, userId) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        date = excluded.date,
                        staffId = excluded.staffId,
                        staffName = excluded.staffName,
                        dailyWage = excluded.dailyWage,
                        bonus = excluded.bonus,
                        workDays = excluded.workDays,
                        total = excluded.total,
                        note = excluded.note,
                        description = excluded.description
                `).bind(
                    wid, date || null, staffId || null, staffName || null, 
                    Number(dailyWage) || 0, Number(bonus) || 0, Number(workDays) || 0, Number(total) || 0, 
                    note || null, description || null, context.user.storeId
                );
            });
            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: stmts.length });
        }
        
        // Handle single wage
        const wageSchema = {
            date: { type: 'date', label: 'วันที่' },
            workDays: { type: 'number', label: 'จำนวนวันทำงาน', min: 0.1 },
            dailyWage: { type: 'number', label: 'ค่าแรงรายวัน', min: 0 },
            bonus: { type: 'number', label: 'โบนัส', min: 0 }
        };

        try {
            validatePayload(payload, wageSchema, context.user.timezone);
        } catch (valErr) {
            return errorResponse(`ข้อมูลไม่ถูกต้อง: ${valErr.message}`);
        }

        const { date, staffId, staffName, dailyWage, bonus, workDays, total, note, description } = payload;
        
        await context.env.DB.prepare(`
            INSERT INTO wages (id, date, staffId, staffName, dailyWage, bonus, workDays, total, note, description, userId) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                date = excluded.date,
                staffId = excluded.staffId,
                staffName = excluded.staffName,
                dailyWage = excluded.dailyWage,
                bonus = excluded.bonus,
                workDays = excluded.workDays,
                total = excluded.total,
                note = excluded.note,
                description = excluded.description
        `).bind(
            id, date || null, staffId || null, staffName || null, 
            Number(dailyWage) || 0, Number(bonus) || 0, Number(workDays) || 0, Number(total) || 0, 
            note || null, description || null, context.user.storeId
        ).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /wages Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
