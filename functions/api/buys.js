import { jsonResponse, errorResponse } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare(`
            SELECT b.*, f.name as farmerName 
            FROM buys b 
            LEFT JOIN farmers f ON b.farmerId = f.id 
            ORDER BY b.date DESC, b.created_at DESC
        `).all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload;
        
        let id = payload.id;
        if (!id) {
            const stationCode = await getSetting(context.env.DB, 'station_code', '0335');
            const format = await getSetting(context.env.DB, 'format_buy_bill', 'B-{STATION}{YYYY}-{SEQ4}');
            id = await generateNextId(context.env.DB, 'buys', format, stationCode);
        }

        
        const { 
            date, farmerId, farmerName, weight, drc, pricePerKg, total, 
            dryRubber, empPct, employeeTotal, farmerTotal, note, status, 
            farmerStatus, employeeStatus, receiptUrl, bucketWeight,
            basePrice, bonusDrc, actualPrice
        } = payload;
        
        await context.env.DB.prepare(`
            INSERT INTO buys (
                id, date, farmerId, farmerName, weight, drc, pricePerKg, total, 
                dryRubber, empPct, employeeTotal, farmerTotal, note, status, 
                farmerStatus, employeeStatus, receiptUrl, bucketWeight,
                basePrice, bonusDrc, actualPrice
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, date || null, farmerId || null, farmerName || null, 
            weight || 0, drc || 0, pricePerKg || 0, total || 0, 
            dryRubber || 0, empPct || 0, employeeTotal || 0, farmerTotal || 0, 
            note || null, status || null, 
            farmerStatus || 'Pending', employeeStatus || 'Pending', 
            receiptUrl || null, bucketWeight || 0,
            basePrice || 0, bonusDrc || 0, actualPrice || 0
        ).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /buys Error]", e); // Improved error logging
        return errorResponse(e.message);
    }
}
