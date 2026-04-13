import { jsonResponse, errorResponse, withAuth } from './_utils.js';

/**
 * Enhanced Aggregated Statistics API
 * Handles server-side calculations for Dashboard KPIs
 * Returns:
 *  - today: Today's summary (weight, amount, drc)
 *  - month: Current month totals (income, cost, profit)
 *  - unpaid: Unpaid bill count
 *  - marketPrices: Last 30 days
 */
async function handleGet(context) {
    try {
        const db = context.env.DB;
        const userId = context.user.id;
        const url = new URL(context.request.url);
        const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        
        const todayPattern = `${dateParam}%`;
        const monthPattern = `${dateParam.substring(0, 7)}%`;

        const [
            todayBuysLatex, todayBuysCupLump, todaySellsLatex, todaySellsCupLump, 
            todayExp, todayWage, 
            monthBuysLatex, monthBuysCupLump, monthSellsLatex, monthSellsCupLump, 
            monthExp, monthWage, 
            unpaid, settings, marketPrices, buyHistory, sellHistory, recentRecords
        ] = await Promise.all([
            // --- TODAY'S DATA (Split by Type) ---
            db.prepare(`
                SELECT SUM(weight - bucketWeight) as totalWeight, SUM(total) as totalAmount, COUNT(*) as count,
                       CASE WHEN SUM(weight - bucketWeight) > 0 THEN (SUM((weight - bucketWeight) * drc) / SUM(weight - bucketWeight)) ELSE 0 END as avgDrc
                FROM buys WHERE userId = ? AND date LIKE ? AND (rubberType = 'latex' OR rubberType IS NULL)
            `).bind(userId, todayPattern).first(),
            
            db.prepare(`
                SELECT SUM(weight - bucketWeight) as totalWeight, SUM(total) as totalAmount, COUNT(*) as count
                FROM buys WHERE userId = ? AND date LIKE ? AND rubberType = 'cup_lump'
            `).bind(userId, todayPattern).first(),
            
            db.prepare(`SELECT SUM(total) as totalAmount FROM sells WHERE userId = ? AND date LIKE ? AND (rubberType = 'latex' OR rubberType IS NULL)`).bind(userId, todayPattern).first(),
            db.prepare(`SELECT SUM(total) as totalAmount FROM sells WHERE userId = ? AND date LIKE ? AND rubberType = 'cup_lump'`).bind(userId, todayPattern).first(),
            
            db.prepare(`SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND date LIKE ?`).bind(userId, todayPattern).first(),
            db.prepare(`SELECT SUM(total) as total FROM wages WHERE userId = ? AND date LIKE ?`).bind(userId, todayPattern).first(),

            // --- MONTHLY DATA (Split by Type) ---
            db.prepare(`SELECT SUM(total) as totalAmount FROM buys WHERE userId = ? AND date LIKE ? AND (rubberType = 'latex' OR rubberType IS NULL)`).bind(userId, monthPattern).first(),
            db.prepare(`SELECT SUM(total) as totalAmount FROM buys WHERE userId = ? AND date LIKE ? AND rubberType = 'cup_lump'`).bind(userId, monthPattern).first(),
            
            db.prepare(`SELECT SUM(total) as totalAmount FROM sells WHERE userId = ? AND date LIKE ? AND (rubberType = 'latex' OR rubberType IS NULL)`).bind(userId, monthPattern).first(),
            db.prepare(`SELECT SUM(total) as totalAmount FROM sells WHERE userId = ? AND date LIKE ? AND rubberType = 'cup_lump'`).bind(userId, monthPattern).first(),
            
            db.prepare(`SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND date LIKE ?`).bind(userId, monthPattern).first(),
            db.prepare(`SELECT SUM(total) as total FROM wages WHERE userId = ? AND date LIKE ?`).bind(userId, monthPattern).first(),

            // --- UNPAID DATA ---
            db.prepare(`SELECT COUNT(*) as count FROM buys WHERE userId = ? AND (farmerStatus != 'Paid' OR employeeStatus != 'Paid')`).bind(userId).first(),

            // --- GLOBAL / SETTINGS ---
            db.prepare("SELECT key, value FROM settings WHERE userId = ?").bind(userId).all(),
            db.prepare("SELECT id, date, price, source FROM market_prices WHERE userId IS NULL OR userId = ? ORDER BY date DESC LIMIT 30").bind(userId).all(),

            // --- PRICE HISTORY (LAST 30 DAYS) ---
            db.prepare(`SELECT date, AVG(pricePerKg) as avgPrice FROM buys WHERE userId = ? AND date >= date('now', '-30 days') GROUP BY date ORDER BY date DESC`).bind(userId).all(),
            db.prepare(`SELECT date, AVG(pricePerKg) as avgPrice FROM sells WHERE userId = ? AND date >= date('now', '-30 days') GROUP BY date ORDER BY date DESC`).bind(userId).all(),

            // --- RECENT RECORDS (NEW) ---
            db.prepare(`
                SELECT * FROM (
                    SELECT 'buy' as type, id, date, total, farmerName as name, farmerId as partyId, created_at
                    FROM buys WHERE userId = ?
                    UNION ALL
                    SELECT 'sell' as type, id, date, total, buyerName as name, factoryId as partyId, created_at
                    FROM sells WHERE userId = ?
                ) ORDER BY date DESC, created_at DESC LIMIT 10
            `).bind(userId, userId).all()
        ]);

        // Process Settings
        const settingsMap = {};
        if (settings?.results) {
            settingsMap.dailyPrice = settings.results.find(s => s.key === 'daily_price')?.value || '0';
            settingsMap.chemicalSettings = settings.results.find(s => s.key === 'chemicalSettings')?.value || null;
        }

        // Month totals already handled in the return object below
        // Cleaning up unused variables logic

        return jsonResponse({
            status: 'success',
            summary: {
                buys: {
                    latex: todayBuysLatex || { totalWeight: 0, totalAmount: 0, count: 0, avgDrc: 0 },
                    cupLump: todayBuysCupLump || { totalWeight: 0, totalAmount: 0, count: 0 },
                    totalAmount: (todayBuysLatex?.totalAmount || 0) + (todayBuysCupLump?.totalAmount || 0),
                    totalWeight: (todayBuysLatex?.totalWeight || 0) + (todayBuysCupLump?.totalWeight || 0)
                },
                sells: {
                    latex: todaySellsLatex || { totalAmount: 0 },
                    cupLump: todaySellsCupLump || { totalAmount: 0 },
                    totalAmount: (todaySellsLatex?.totalAmount || 0) + (todaySellsCupLump?.totalAmount || 0)
                },
                expenses: (todayExp?.total || 0) + (todayWage?.total || 0),
                dailyPrice: settingsMap.dailyPrice,
                month: {
                    income: (monthSellsLatex?.totalAmount || 0) + (monthSellsCupLump?.totalAmount || 0),
                    cost: (monthBuysLatex?.totalAmount || 0) + (monthBuysCupLump?.totalAmount || 0) + (monthExp?.total || 0) + (monthWage?.total || 0),
                    profit: ((monthSellsLatex?.totalAmount || 0) + (monthSellsCupLump?.totalAmount || 0)) - 
                           ((monthBuysLatex?.totalAmount || 0) + (monthBuysCupLump?.totalAmount || 0) + (monthExp?.total || 0) + (monthWage?.total || 0))
                },
                unpaid: unpaid?.count || 0,
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
