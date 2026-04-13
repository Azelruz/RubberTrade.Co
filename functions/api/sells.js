import { jsonResponse, errorResponse, withAuth, isUUID, trackUsage } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';

async function handleGet(context) {
    try {
        const userId = context.user.id;
        const url = new URL(context.request.url);
        const since = url.searchParams.get('since');
        
        let query = "SELECT * FROM sells WHERE userId = ?";
        const params = [userId];
        
        if (since) {
            query += " AND updated_at > ?";
            params.push(since);
        }
        
        query += " ORDER BY date DESC, created_at DESC";
        
        const { results } = await context.env.DB.prepare(query).bind(...params).all();
        
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
            const stationCode = await getSetting(context.env.DB, 'station_code', userId, '0335');
            const format = await getSetting(context.env.DB, 'format_sell_bill', userId, 'S-{STATION}{YYYY}-{SEQ4}');
            const stmts = [];
            
            for (let i = 0; i < body.payloads.length; i++) {
                const p = body.payloads[i];
                let id = p.id;
                if (!id || isUUID(id)) {
                    const nonce = isUUID(id) ? id.substring(0, 4).toUpperCase() : '';
                    id = await generateNextId(context.env.DB, 'sells', format, stationCode, userId, nonce, i);
                }
                const { 
                    date, buyerName, factoryId, employeeId, truckId, truckInfo,
                    weight, drc, pricePerKg, lossWeight, total, 
                    profitShareAmount, receiptUrl, note, rubberType 
                } = p;
                stmts.push(context.env.DB.prepare(`
                    INSERT OR REPLACE INTO sells (
                        id, date, buyerName, factoryId, employeeId, truckId, truckInfo,
                        weight, drc, pricePerKg, lossWeight, total, 
                        profitShareAmount, receiptUrl, note, rubberType, userId
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id, date || null, buyerName || null, factoryId || null, employeeId || null, 
                    truckId || null, truckInfo || null,
                    weight || 0, drc || 0, pricePerKg || 0, lossWeight || 0, total || 0, 
                    profitShareAmount || 0, receiptUrl || null, note || null, rubberType || 'latex', userId
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
            const stationCode = await getSetting(context.env.DB, 'station_code', userId, '0335');
            const format = await getSetting(context.env.DB, 'format_sell_bill', userId, 'S-{STATION}{YYYY}-{SEQ4}');
            const nonce = isUUID(id) ? id.substring(0, 4).toUpperCase() : '';
            id = await generateNextId(context.env.DB, 'sells', format, stationCode, userId, nonce, 0);
        }

        const { 
            date, buyerName, factoryId, employeeId, truckId, truckInfo,
            weight, drc, pricePerKg, lossWeight, total, 
            profitShareAmount, receiptUrl, note, rubberType 
        } = payload;
        
        await context.env.DB.prepare(`
            INSERT OR REPLACE INTO sells (
                id, date, buyerName, factoryId, employeeId, truckId, truckInfo,
                weight, drc, pricePerKg, lossWeight, total, 
                profitShareAmount, receiptUrl, note, rubberType, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, date || null, buyerName || null, factoryId || null, employeeId || null, 
            truckId || null, truckInfo || null,
            weight || 0, drc || 0, pricePerKg || 0, lossWeight || 0, total || 0, 
            profitShareAmount || 0, receiptUrl || null, note || null, rubberType || 'latex', userId
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
