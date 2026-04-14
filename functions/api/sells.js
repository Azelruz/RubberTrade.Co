import { jsonResponse, errorResponse, withAuth, isUUID, trackUsage, recordAuditLog } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';
import { validatePayload } from './_validation.js';

async function handleGet(context) {
    try {
        const userId = context.user.id;
        const url = new URL(context.request.url);
        
        // --- Input Parameters ---
        const since = url.searchParams.get('since');
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const search = url.searchParams.get('search');
        const pageParam = url.searchParams.get('page');
        const pageSizeParam = url.searchParams.get('pageSize');
        const isPaginated = !!pageParam;
        
        const page = parseInt(pageParam) || 1;
        const pageSize = parseInt(pageSizeParam) || 50;
        const offset = (page - 1) * pageSize;

        // --- Build Where Clauses ---
        let whereClauses = ["userId = ?"];
        const params = [context.user.storeId];
        const storeId = context.user.storeId;

        if (since) {
            whereClauses.push("updated_at > ?");
            params.push(since);
        }
        if (startDate) {
            whereClauses.push("date >= ?");
            params.push(startDate);
        }
        if (endDate) {
            whereClauses.push("date <= ?");
            params.push(endDate);
        }
        if (search) {
            whereClauses.push("(buyerName LIKE ? OR id LIKE ?)");
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }

        // --- Advanced Filters ---
        const rubberType = url.searchParams.get('rubberType');
        const minWeight = url.searchParams.get('minWeight');
        const maxWeight = url.searchParams.get('maxWeight');
        const minTotal = url.searchParams.get('minTotal');
        const maxTotal = url.searchParams.get('maxTotal');
        const factoryId = url.searchParams.get('factoryId');
        const employeeId = url.searchParams.get('employeeId');

        if (rubberType) {
            whereClauses.push("rubberType = ?");
            params.push(rubberType);
        }
        if (minWeight) {
            whereClauses.push("weight >= ?");
            params.push(parseFloat(minWeight));
        }
        if (maxWeight) {
            whereClauses.push("weight <= ?");
            params.push(parseFloat(maxWeight));
        }
        if (minTotal) {
            whereClauses.push("total >= ?");
            params.push(parseFloat(minTotal));
        }
        if (maxTotal) {
            whereClauses.push("total <= ?");
            params.push(parseFloat(maxTotal));
        }
        if (factoryId) {
            whereClauses.push("factoryId = ?");
            params.push(factoryId);
        }
        if (employeeId) {
            whereClauses.push("employeeId = ?");
            params.push(employeeId);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // --- Execute Queries in Batch ---
        // 1. Paginated Records
        const recordsQuery = `
            SELECT * FROM sells 
            ${whereSql} 
            ORDER BY date DESC, created_at DESC 
            ${isPaginated ? 'LIMIT ? OFFSET ?' : ''}
        `;
        const recordsParams = isPaginated ? [...params, pageSize, offset] : params;

        // 2. Summary & Total Count
        const summaryQuery = `
            SELECT 
                COUNT(*) as totalCount,
                SUM(total) as totalAmount,
                SUM(weight) as totalWeight
            FROM sells
            ${whereSql}
        `;

        const [recordsRes, summaryRes] = await context.env.DB.batch([
            context.env.DB.prepare(recordsQuery).bind(...recordsParams),
            context.env.DB.prepare(summaryQuery).bind(...params)
        ]);

        const results = recordsRes.results || [];
        const summary = summaryRes.results[0] || { totalCount: 0, totalAmount: 0, totalWeight: 0 };
        
        const totalCount = summary.totalCount || 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        // Track usage
        context.waitUntil?.(trackUsage(context, { rowsRead: results.length }));

        return jsonResponse({
            results,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                pageSize
            },
            summary: {
                totalBills: totalCount,
                totalAmount: summary.totalAmount || 0,
                totalWeight: summary.totalWeight || 0
            }
        });
    } catch (e) {
        console.error("[GET /sells Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const userId = context.user.id;
        const storeId = context.user.storeId;

        // Bulk Insert Support
        if (body.action === 'bulk' && Array.isArray(body.payloads)) {
            const stationCode = await getSetting(context.env.DB, 'station_code', storeId, '0335');
            const format = await getSetting(context.env.DB, 'format_sell_bill', storeId, 'S-{STATION}{YYYY}-{SEQ4}');
            const stmts = [];

            const sellSchema = {
                date: { type: 'date', label: 'วันที่' },
                weight: { type: 'number', label: 'น้ำหนักขาย', min: 0.1 },
                drc: { type: 'number', label: 'DRC', min: 1, max: 100 },
                pricePerKg: { type: 'number', label: 'ราคาต่อหน่วย', min: 0.1 }
            };
            
            for (let i = 0; i < body.payloads.length; i++) {
                const p = body.payloads[i];
                
                // Server-side Validation
                try {
                    validatePayload(p, sellSchema);
                } catch (valErr) {
                    return errorResponse(`ข้อมูลรายการที่ ${i+1} ไม่ถูกต้อง: ${valErr.message}`);
                }

                let id = p.id;
                if (!id || isUUID(id)) {
                    const nonce = isUUID(id) ? id.substring(0, 4).toUpperCase() : '';
                    id = await generateNextId(context.env.DB, 'sells', format, stationCode, storeId, nonce, i);
                }
                const { 
                    date, buyerName, factoryId, employeeId, truckId, truckInfo,
                    weight, drc, pricePerKg, lossWeight, total, 
                    profitShareAmount, receiptUrl, note, rubberType 
                } = p;
                stmts.push(context.env.DB.prepare(`
                    INSERT INTO sells (
                        id, date, buyerName, factoryId, employeeId, truckId, truckInfo,
                        weight, drc, pricePerKg, lossWeight, total, 
                        profitShareAmount, receiptUrl, note, rubberType, userId
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        date = excluded.date,
                        buyerName = excluded.buyerName,
                        factoryId = excluded.factoryId,
                        employeeId = excluded.employeeId,
                        truckId = excluded.truckId,
                        truckInfo = excluded.truckInfo,
                        weight = excluded.weight,
                        drc = excluded.drc,
                        pricePerKg = excluded.pricePerKg,
                        lossWeight = excluded.lossWeight,
                        total = excluded.total,
                        profitShareAmount = excluded.profitShareAmount,
                        receiptUrl = excluded.receiptUrl,
                        note = excluded.note,
                        rubberType = excluded.rubberType
                `).bind(
                    id, date || null, buyerName || null, factoryId || null, employeeId || null, 
                    truckId || null, truckInfo || null,
                    weight || 0, drc || 0, pricePerKg || 0, lossWeight || 0, total || 0, 
                    profitShareAmount || 0, receiptUrl || null, note || null, rubberType || 'latex', context.user.storeId
                ));
            }
            
            await context.env.DB.batch(stmts);
            
            // Track usage
            context.waitUntil?.(trackUsage(context, { rowsWritten: stmts.length }));
            
            // --- Audit Logging (Bulk) ---
            if (body.payloads.length > 0) {
                context.waitUntil?.(Promise.all(body.payloads.map((p, idx) => {
                    const id = stmts[idx].params[0];
                    return recordAuditLog(context, {
                        action: 'CREATE',
                        entityType: 'sells',
                        entityId: id,
                        newData: p
                    });
                })));
            }

            return jsonResponse({ status: 'success', count: stmts.length });
        }

        const payload = body.payload;

        const sellSchema = {
            date: { type: 'date', label: 'วันที่' },
            weight: { type: 'number', label: 'น้ำหนักขาย', min: 0.1 },
            drc: { type: 'number', label: 'DRC', min: 1, max: 100 },
            pricePerKg: { type: 'number', label: 'ราคาต่อหน่วย', min: 0.1 }
        };

        try {
            validatePayload(payload, sellSchema);
        } catch (valErr) {
            return errorResponse(`ข้อมูลไม่ถูกต้อง: ${valErr.message}`);
        }

        let id = payload.id;
        if (!id || isUUID(id)) {
            const stationCode = await getSetting(context.env.DB, 'station_code', storeId, '0335');
            const format = await getSetting(context.env.DB, 'format_sell_bill', storeId, 'S-{STATION}{YYYY}-{SEQ4}');
            const nonce = isUUID(id) ? id.substring(0, 4).toUpperCase() : '';
            id = await generateNextId(context.env.DB, 'sells', format, stationCode, storeId, nonce, 0);
        }

        const { 
            date, buyerName, factoryId, employeeId, truckId, truckInfo,
            weight, drc, pricePerKg, lossWeight, total, 
            profitShareAmount, receiptUrl, note, rubberType 
        } = payload;
        
        await context.env.DB.prepare(`
            INSERT INTO sells (
                id, date, buyerName, factoryId, employeeId, truckId, truckInfo,
                weight, drc, pricePerKg, lossWeight, total, 
                profitShareAmount, receiptUrl, note, rubberType, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                date = excluded.date,
                buyerName = excluded.buyerName,
                factoryId = excluded.factoryId,
                employeeId = excluded.employeeId,
                truckId = excluded.truckId,
                truckInfo = excluded.truckInfo,
                weight = excluded.weight,
                drc = excluded.drc,
                pricePerKg = excluded.pricePerKg,
                lossWeight = excluded.lossWeight,
                total = excluded.total,
                profitShareAmount = excluded.profitShareAmount,
                receiptUrl = excluded.receiptUrl,
                note = excluded.note,
                rubberType = excluded.rubberType
        `).bind(
            id, date || null, buyerName || null, factoryId || null, employeeId || null, 
            truckId || null, truckInfo || null,
            weight || 0, drc || 0, pricePerKg || 0, lossWeight || 0, total || 0, 
            profitShareAmount || 0, receiptUrl || null, note || null, rubberType || 'latex', context.user.storeId
        ).run();
        
        // Track usage
        context.waitUntil?.(trackUsage(context, { rowsWritten: 1 }));
        
        // --- Audit Logging ---
        context.waitUntil?.(recordAuditLog(context, {
            action: 'CREATE',
            entityType: 'sells',
            entityId: id,
            newData: payload
        }));

        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /sells Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);
export const onRequestPatch = withAuth(handlePost);
