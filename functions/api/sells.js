import { jsonResponse, errorResponse } from './_utils.js';
import { generateNextId, getSetting } from './_id_utils.js';

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare("SELECT * FROM sells ORDER BY date DESC, created_at DESC").all();
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
            const format = await getSetting(context.env.DB, 'format_sell_bill', 'S-{STATION}{YYYY}-{SEQ4}');
            id = await generateNextId(context.env.DB, 'sells', format, stationCode);
        }

        const { 
            date, buyerName, factoryId, employeeId, truckId, truckInfo,
            weight, drc, pricePerKg, lossWeight, total, 
            profitShareAmount, receiptUrl, note 
        } = payload;
        
        await context.env.DB.prepare(`
            INSERT INTO sells (
                id, date, buyerName, factoryId, employeeId, truckId, truckInfo,
                weight, drc, pricePerKg, lossWeight, total, 
                profitShareAmount, receiptUrl, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                note = excluded.note
        `).bind(
            id, date || null, buyerName || null, factoryId || null, employeeId || null, 
            truckId || null, truckInfo || null,
            weight || 0, drc || 0, pricePerKg || 0, lossWeight || 0, total || 0, 
            profitShareAmount || 0, receiptUrl || null, note || null
        ).run();
        
        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error("[POST /sells Error]", e);
        return errorResponse(e.message);
    }
}
