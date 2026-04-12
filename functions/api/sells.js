import { jsonResponse, errorResponse, withAuth, isUUID, trackUsage } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM sells WHERE userId = ? ORDER BY date DESC, created_at DESC").bind(context.user.id).all();
        
        // Track usage
        context.waitUntil?.(trackUsage(context, { rowsRead: results.length }));
        
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
            const stationCode = await getSetting(context.env.DB, 'station_code', '0335');
            const format = await getSetting(context.env.DB, 'format_sell_bill', 'S-{STATION}{YYYY}-{SEQ4}');
            const stmts = [];
            
            for (const p of body.payloads) {
                let id = p.id;
                if (!id || isUUID(id)) {
                    id = await generateNextId(context.env.DB, 'sells', format, stationCode, userId);
                }

                const { 
                    date, buyerName, factoryId, employeeId, truckId, truckInfo,
                    weight, drc, pricePerKg, lossWeight, total, 
                    profitShareAmount, receiptUrl, note 
                } = p;

                stmts.push(context.env.DB.prepare(`
                    INSERT OR REPLACE INTO sells (
                        id, date, buyerName, factoryId, employeeId, truckId, truckInfo,
                        weight, drc, pricePerKg, lossWeight, total, 
                        profitShareAmount, receiptUrl, note, userId
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id, date || null, buyerName || null, factoryId || null, employeeId || null, 
                    truckId || null, truckInfo || null,
                    weight || 0, drc || 0, pricePerKg || 0, lossWeight || 0, total || 0, 
                    profitShareAmount || 0, receiptUrl || null, note || null, userId
                ));
            }
            
            await context.env.DB.batch(stmts);
            
            // Track usage
            context.waitUntil?.(trackUsage(context, { rowsWritten: stmts.length }));
            
            return jsonResponse({ status: 'success', count: stmts.length });
        }

        const payload = body.payload;
        let id = payload.id;
        if (!id || isUUID(id)) {
            const stationCode = await getSetting(context.env.DB, 'station_code', '0335');
            const format = await getSetting(context.env.DB, 'format_sell_bill', 'S-{STATION}{YYYY}-{SEQ4}');
            id = await generateNextId(context.env.DB, 'sells', format, stationCode, userId);
        }

        const { 
            date, buyerName, factoryId, employeeId, truckId, truckInfo,
            weight, drc, pricePerKg, lossWeight, total, 
            profitShareAmount, receiptUrl, note 
        } = payload;
        
        await context.env.DB.prepare(`
            INSERT OR REPLACE INTO sells (
                id, date, buyerName, factoryId, employeeId, truckId, truckInfo,
                weight, drc, pricePerKg, lossWeight, total, 
                profitShareAmount, receiptUrl, note, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, date || null, buyerName || null, factoryId || null, employeeId || null, 
            truckId || null, truckInfo || null,
            weight || 0, drc || 0, pricePerKg || 0, lossWeight || 0, total || 0, 
            profitShareAmount || 0, receiptUrl || null, note || null, userId
        ).run();
        
        // Track usage
        context.waitUntil?.(trackUsage(context, { rowsWritten: 1 }));
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /sells Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);
export const onRequestPatch = withAuth(handlePost);
