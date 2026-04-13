import { jsonResponse, errorResponse, withAuth, isUUID, trackUsage } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';

async function handleGet(context) {
    try {
        const userId = context.user.id;
        const url = new URL(context.request.url);
        const since = url.searchParams.get('since');
        
        let query = "SELECT b.*, COALESCE(f.name, b.farmerName) as farmerName FROM buys b LEFT JOIN farmers f ON b.farmerId = f.id WHERE b.userId = ?";
        const params = [userId];
        
        if (since) {
            query += " AND b.updated_at > ?";
            params.push(since);
        }
        
        query += " ORDER BY b.date DESC, b.created_at DESC";
        
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
            const format = await getSetting(context.env.DB, 'format_buy_bill', userId, 'B-{STATION}{YYYY}-{SEQ4}');
            const stmts = [];
            
            for (let i = 0; i < body.payloads.length; i++) {
                const p = body.payloads[i];
                let id = p.id;
                if (!id || isUUID(id)) {
                    const nonce = isUUID(id) ? id.substring(0, 4).toUpperCase() : '';
                    id = await generateNextId(context.env.DB, 'buys', format, stationCode, userId, nonce, i);
                }
                const {
                    date, farmerId, farmerName, weight, drc, pricePerKg, total,
                    dryRubber, empPct, employeeTotal, farmerTotal, note, status, 
                    farmerStatus, employeeStatus, receiptUrl, bucketWeight,
                    basePrice, bonusDrc, actualPrice, bonusMemberType, rubberType
                } = p;

                stmts.push(context.env.DB.prepare(`
                    INSERT OR REPLACE INTO buys (
                        id, date, farmerId, farmerName, weight, drc, pricePerKg, total, 
                        dryRubber, empPct, employeeTotal, farmerTotal, note, status, 
                        farmerStatus, employeeStatus, receiptUrl, bucketWeight,
                        basePrice, bonusDrc, actualPrice, bonusMemberType, rubberType, userId
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id, date || null, farmerId || null, farmerName || null, 
                    weight || 0, drc || 0, pricePerKg || 0, total || 0, 
                    dryRubber || 0, empPct || 0, employeeTotal || 0, farmerTotal || 0, 
                    note || null, status || null, 
                    farmerStatus || 'Pending', employeeStatus || 'Pending', 
                    receiptUrl || null, bucketWeight || 0,
                    basePrice || 0, bonusDrc || 0, actualPrice || 0, bonusMemberType || 0, 
                    rubberType || 'latex', userId
                ));
            }
            
            await context.env.DB.batch(stmts);
            return jsonResponse({ status: 'success', count: stmts.length });
        }

        const payload = body.payload;
        let id = payload.id;
        if (!id || isUUID(id)) {
            const stationCode = await getSetting(context.env.DB, 'station_code', userId, '0335');
            const format = await getSetting(context.env.DB, 'format_buy_bill', userId, 'B-{STATION}{YYYY}-{SEQ4}');
            const nonce = isUUID(id) ? id.substring(0, 4).toUpperCase() : '';
            id = await generateNextId(context.env.DB, 'buys', format, stationCode, userId, nonce, 0);
        }

        const { 
            date, farmerId, farmerName, weight, drc, pricePerKg, total, 
            dryRubber, empPct, employeeTotal, farmerTotal, note, status, 
            farmerStatus, employeeStatus, receiptUrl, bucketWeight,
            basePrice, bonusDrc, actualPrice, bonusMemberType, rubberType
        } = payload;
        
        await context.env.DB.prepare(`
            INSERT OR REPLACE INTO buys (
                id, date, farmerId, farmerName, weight, drc, pricePerKg, total, 
                dryRubber, empPct, employeeTotal, farmerTotal, note, status, 
                farmerStatus, employeeStatus, receiptUrl, bucketWeight,
                basePrice, bonusDrc, actualPrice, bonusMemberType, rubberType, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, date || null, farmerId || null, farmerName || null, 
            weight || 0, drc || 0, pricePerKg || 0, total || 0, 
            dryRubber || 0, empPct || 0, employeeTotal || 0, farmerTotal || 0, 
            note || null, status || null, 
            farmerStatus || 'Pending', employeeStatus || 'Pending', 
            receiptUrl || null, bucketWeight || 0,
            basePrice || 0, bonusDrc || 0, actualPrice || 0, bonusMemberType || 0, 
            rubberType || 'latex', userId
        ).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /buys Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);
export const onRequestPatch = withAuth(handlePost);
