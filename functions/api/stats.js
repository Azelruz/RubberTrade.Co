import { jsonResponse, errorResponse, withAuth } from './_utils.js';

/**
 * Enhanced Aggregated Statistics API
 * Handles server-side calculations for Dashboard KPIs
 */
async function handleGet(context) {
    try {
        const db = context.env.DB;
        const storeId = context.user.storeId;
        const role = context.user.role;
        const url = new URL(context.request.url);
        const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        
        const todayPattern = `${dateParam}%`;
        const monthPattern = `${dateParam.substring(0, 7)}%`;
        const isStaff = role === 'staff';

        const [
            todayBuysLatex, todayBuysCupLump, todaySellsLatex, todaySellsCupLump, 
            todayExp, todayWage, 
            monthBuysLatex, monthBuysCupLump, monthSellsLatex, monthSellsCupLump, 
            monthExp, monthWage, 
            unpaid, settings, marketPrices, buyHistory, sellHistory, recentRecords
        ] = await Promise.all([
            // --- TODAY'S DATA ---
            db.prepare(`
                SELECT SUM(weight - bucketWeight) as totalWeight, SUM(total) as totalAmount, COUNT(*) as count,
                       CASE WHEN SUM(weight - bucketWeight) > 0 THEN (SUM((weight - bucketWeight) * drc) / SUM(weight - bucketWeight)) ELSE 0 END as avgDrc
                FROM buys WHERE userId = ? AND date LIKE ? AND (rubberType = 'latex' OR rubberType IS NULL)
            `).bind(storeId, todayPattern).first(),
            
            db.prepare(`
                SELECT SUM(weight - bucketWeight) as totalWeight, SUM(total) as totalAmount, COUNT(*) as count
                FROM buys WHERE userId = ? AND date LIKE ? AND rubberType = 'cup_lump'
            `).bind(storeId, todayPattern).first(),
            
            db.prepare(`SELECT SUM(total) as totalAmount FROM sells WHERE userId = ? AND date LIKE ? AND (rubberType = 'latex' OR rubberType IS NULL)`).bind(storeId, todayPattern).first(),
            db.prepare(`SELECT SUM(total) as totalAmount FROM sells WHERE userId = ? AND date LIKE ? AND rubberType = 'cup_lump'`).bind(storeId, todayPattern).first(),
            
            db.prepare(`SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND date LIKE ?`).bind(storeId, todayPattern).first(),
            db.prepare(`SELECT SUM(total) as total FROM wages WHERE userId = ? AND date LIKE ?`).bind(storeId, todayPattern).first(),
            
            // --- MONTHLY DATA ---
            db.prepare(`SELECT SUM(total) as totalAmount FROM buys WHERE userId = ? AND date LIKE ? AND (rubberType = 'latex' OR rubberType IS NULL)`).bind(storeId, monthPattern).first(),
            db.prepare(`SELECT SUM(total) as totalAmount FROM buys WHERE userId = ? AND date LIKE ? AND rubberType = 'cup_lump'`).bind(storeId, monthPattern).first(),
            
            db.prepare(`SELECT SUM(total) as totalAmount FROM sells WHERE userId = ? AND date LIKE ? AND (rubberType = 'latex' OR rubberType IS NULL)`).bind(storeId, monthPattern).first(),
            db.prepare(`SELECT SUM(total) as totalAmount FROM sells WHERE userId = ? AND date LIKE ? AND rubberType = 'cup_lump'`).bind(storeId, monthPattern).first(),
            
            db.prepare(`SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND date LIKE ?`).bind(storeId, monthPattern).first(),
            db.prepare(`SELECT SUM(total) as total FROM wages WHERE userId = ? AND date LIKE ?`).bind(storeId, monthPattern).first(),
            
            // --- OTHERS ---
            db.prepare(`SELECT COUNT(*) as count FROM buys WHERE userId = ? AND (farmerStatus != 'Paid' OR employeeStatus != 'Paid')`).bind(storeId).first(),
            db.prepare("SELECT key, value FROM settings WHERE userId = ?").bind(storeId).all(),
            db.prepare("SELECT id, date, price, source FROM market_prices WHERE userId IS NULL OR userId = ? ORDER BY date DESC LIMIT 30").bind(storeId).all(),
            db.prepare(`SELECT date, AVG(pricePerKg) as avgPrice FROM buys WHERE userId = ? AND date >= date('now', '-30 days') GROUP BY date ORDER BY date DESC`).bind(storeId).all(),
            db.prepare(`SELECT date, AVG(pricePerKg) as avgPrice FROM sells WHERE userId = ? AND date >= date('now', '-30 days') GROUP BY date ORDER BY date DESC`).bind(storeId).all(),
            db.prepare(`
                SELECT * FROM (
                    SELECT 'buy' as type, id, date, total, farmerName as name, farmerId as partyId, created_at
                    FROM buys WHERE userId = ?
                    UNION ALL
                    SELECT 'sell' as type, id, date, total, buyerName as name, factoryId as partyId, created_at
                    FROM sells WHERE userId = ?
                ) ORDER BY date DESC, created_at DESC LIMIT 10
            `).bind(storeId, storeId).all()
        ]);

        const settingsMap = {};
        if (settings?.results) {
            settingsMap.dailyPrice = settings.results.find(s => s.key === 'daily_price')?.value || '0';
            settingsMap.chemicalSettings = settings.results.find(s => s.key === 'chemicalSettings')?.value || null;
        }

        const income = isStaff ? '***' : ((monthSellsLatex?.totalAmount || 0) + (monthSellsCupLump?.totalAmount || 0));
        const buyCost = ((monthBuysLatex?.totalAmount || 0) + (monthBuysCupLump?.totalAmount || 0));
        const otherCost = ((monthExp?.total || 0) + (monthWage?.total || 0));
        const cost = isStaff ? '***' : (buyCost + otherCost);
        const profit = isStaff ? '***' : (income - cost);

        return jsonResponse({
            status: 'success',
            summary: {
                buys: {
                    latex: todayBuysLatex || { totalWeight: 0, totalAmount: 0, count: 0, avgDrc: 0 },
                    cupLump: todayBuysCupLump || { totalWeight: 0, totalAmount: 0, count: 0 },
                    totalAmount: isStaff ? '***' : ((todayBuysLatex?.totalAmount || 0) + (todayBuysCupLump?.totalAmount || 0)),
                    totalWeight: (todayBuysLatex?.totalWeight || 0) + (todayBuysCupLump?.totalWeight || 0)
                },
                sells: {
                    latex: todaySellsLatex || { totalAmount: 0 },
                    cupLump: todaySellsCupLump || { totalAmount: 0 },
                    totalAmount: isStaff ? '***' : ((todaySellsLatex?.totalAmount || 0) + (todaySellsCupLump?.totalAmount || 0))
                },
                expenses: isStaff ? '***' : ((todayExp?.total || 0) + (todayWage?.total || 0)),
                month: { income, cost, profit },
                unpaid: unpaid?.count || 0,
                dailyPrice: settingsMap.dailyPrice,
                chemicalSettings: settingsMap.chemicalSettings,
                history: {
                    buys: buyHistory?.results || [],
                    sells: sellHistory?.results || []
                },
                recentRecords: recentRecords?.results || []
            },
            marketPrices: marketPrices?.results || [],
            filter: { today: dateParam, month: dateParam.substring(0, 7) }
        });
    } catch (e) {
        console.error("[GET /api/stats Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
