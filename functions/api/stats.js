import { jsonResponse, errorResponse, withAuth, getTodayDateStr, getTimezoneOffset } from './_utils.js';

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
        const tz = context.user.timezone || 'Asia/Bangkok';
        const dateParam = url.searchParams.get('date') || getTodayDateStr(tz);
        const tzOffset = getTimezoneOffset(tz);
        
        const dateOnly = dateParam.split('T')[0];
        const monthPrefix = dateOnly.substring(0, 7);
        const monthStart = `${monthPrefix}-01`;
        const monthEnd = `${monthPrefix}-31`;
        const isStaff = role === 'staff';

        const [
            todayBuysRow,
            todaySellsRow,
            todayExp,
            todayWage,
            monthBuysRow,
            monthSellsRow,
            monthExp,
            monthWage,
            unpaid,
            settings,
            marketPrices,
            buyHistory,
            sellHistory,
            recentBuys,
            recentSells
        ] = await Promise.all([
            // --- TODAY'S DATA (Consolidated latex + cup_lump in 1 query each, exact date = ?) ---
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN rubberType = 'latex' OR rubberType IS NULL THEN weight - bucketWeight ELSE 0 END) as latexWeight,
                    SUM(CASE WHEN rubberType = 'latex' OR rubberType IS NULL THEN total ELSE 0 END) as latexAmount,
                    SUM(CASE WHEN rubberType = 'latex' OR rubberType IS NULL THEN 1 ELSE 0 END) as latexCount,
                    SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL) THEN (weight - bucketWeight) * drc ELSE 0 END) as latexDrcWeight,
                    SUM(CASE WHEN rubberType = 'cup_lump' THEN weight - bucketWeight ELSE 0 END) as cupLumpWeight,
                    SUM(CASE WHEN rubberType = 'cup_lump' THEN total ELSE 0 END) as cupLumpAmount,
                    SUM(CASE WHEN rubberType = 'cup_lump' THEN 1 ELSE 0 END) as cupLumpCount
                FROM buys WHERE userId = ? AND date = ?
            `).bind(storeId, dateOnly).first(),
            
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN rubberType = 'latex' OR rubberType IS NULL THEN total ELSE 0 END) as latexAmount,
                    SUM(CASE WHEN rubberType = 'cup_lump' THEN total ELSE 0 END) as cupLumpAmount
                FROM sells WHERE userId = ? AND date = ?
            `).bind(storeId, dateOnly).first(),
            
            db.prepare(`SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND date = ?`).bind(storeId, dateOnly).first(),
            db.prepare(`SELECT SUM(total) as total FROM wages WHERE userId = ? AND date = ?`).bind(storeId, dateOnly).first(),
            
            // --- MONTHLY DATA (Consolidated latex + cup_lump in 1 query each, indexed range scan) ---
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN rubberType = 'latex' OR rubberType IS NULL THEN total ELSE 0 END) as latexAmount,
                    SUM(CASE WHEN rubberType = 'cup_lump' THEN total ELSE 0 END) as cupLumpAmount
                FROM buys WHERE userId = ? AND date >= ? AND date <= ?
            `).bind(storeId, monthStart, monthEnd).first(),
            
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN rubberType = 'latex' OR rubberType IS NULL THEN total ELSE 0 END) as latexAmount,
                    SUM(CASE WHEN rubberType = 'cup_lump' THEN total ELSE 0 END) as cupLumpAmount
                FROM sells WHERE userId = ? AND date >= ? AND date <= ?
            `).bind(storeId, monthStart, monthEnd).first(),
            
            db.prepare(`SELECT SUM(amount) as total FROM expenses WHERE userId = ? AND date >= ? AND date <= ?`).bind(storeId, monthStart, monthEnd).first(),
            db.prepare(`SELECT SUM(total) as total FROM wages WHERE userId = ? AND date >= ? AND date <= ?`).bind(storeId, monthStart, monthEnd).first(),
            
            // --- OTHERS ---
            db.prepare(`SELECT COUNT(*) as count FROM buys WHERE userId = ? AND (farmerStatus != 'Paid' OR employeeStatus != 'Paid')`).bind(storeId).first(),
            db.prepare("SELECT key, value FROM settings WHERE userId = ?").bind(storeId).all(),
            db.prepare("SELECT id, date, price, source FROM market_prices WHERE userId IS NULL OR userId = ? ORDER BY date DESC LIMIT 30").bind(storeId).all(),
            db.prepare(`SELECT date, AVG(pricePerKg) as avgPrice FROM buys WHERE userId = ? AND date >= date('now', ?, '-30 days') GROUP BY date ORDER BY date DESC`).bind(storeId, tzOffset).all(),
            db.prepare(`SELECT date, AVG(pricePerKg) as avgPrice FROM sells WHERE userId = ? AND date >= date('now', ?, '-30 days') GROUP BY date ORDER BY date DESC`).bind(storeId, tzOffset).all(),
            db.prepare("SELECT 'buy' as type, id, date, total, farmerName as name, farmerId as partyId, created_at FROM buys WHERE userId = ? ORDER BY date DESC, created_at DESC LIMIT 10").bind(storeId).all(),
            db.prepare("SELECT 'sell' as type, id, date, total, buyerName as name, factoryId as partyId, created_at FROM sells WHERE userId = ? ORDER BY date DESC, created_at DESC LIMIT 10").bind(storeId).all()
        ]);

        const todayBuysLatex = {
            totalWeight: todayBuysRow?.latexWeight || 0,
            totalAmount: todayBuysRow?.latexAmount || 0,
            count: todayBuysRow?.latexCount || 0,
            avgDrc: (todayBuysRow?.latexWeight > 0) ? (todayBuysRow.latexDrcWeight / todayBuysRow.latexWeight) : 0
        };

        const todayBuysCupLump = {
            totalWeight: todayBuysRow?.cupLumpWeight || 0,
            totalAmount: todayBuysRow?.cupLumpAmount || 0,
            count: todayBuysRow?.cupLumpCount || 0
        };

        const todaySellsLatex = { totalAmount: todaySellsRow?.latexAmount || 0 };
        const todaySellsCupLump = { totalAmount: todaySellsRow?.cupLumpAmount || 0 };

        const monthBuysLatex = { totalAmount: monthBuysRow?.latexAmount || 0 };
        const monthBuysCupLump = { totalAmount: monthBuysRow?.cupLumpAmount || 0 };

        const monthSellsLatex = { totalAmount: monthSellsRow?.latexAmount || 0 };
        const monthSellsCupLump = { totalAmount: monthSellsRow?.cupLumpAmount || 0 };

        const combinedRecent = [
            ...(recentBuys?.results || []),
            ...(recentSells?.results || [])
        ].sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return (b.created_at || '').localeCompare(a.created_at || '');
        }).slice(0, 10);

        const settingsMap = {};
        if (settings?.results) {
            settingsMap.dailyPrice = settings.results.find(s => s.key === 'daily_price')?.value || '0';
            settingsMap.chemicalSettings = settings.results.find(s => s.key === 'chemicalSettings')?.value || null;
        }

        const income = ((monthSellsLatex?.totalAmount || 0) + (monthSellsCupLump?.totalAmount || 0));
        const buyCost = ((monthBuysLatex?.totalAmount || 0) + (monthBuysCupLump?.totalAmount || 0));
        const otherCost = ((monthExp?.total || 0) + (monthWage?.total || 0));
        const cost = (buyCost + otherCost);
        const profit = isStaff ? '***' : (income - cost);

        return jsonResponse({
            status: 'success',
            summary: {
                buys: {
                    latex: todayBuysLatex || { totalWeight: 0, totalAmount: 0, count: 0, avgDrc: 0 },
                    cupLump: todayBuysCupLump || { totalWeight: 0, totalAmount: 0, count: 0 },
                    totalAmount: ((todayBuysLatex?.totalAmount || 0) + (todayBuysCupLump?.totalAmount || 0)),
                    totalWeight: (todayBuysLatex?.totalWeight || 0) + (todayBuysCupLump?.totalWeight || 0)
                },
                sells: {
                    latex: todaySellsLatex || { totalAmount: 0 },
                    cupLump: todaySellsCupLump || { totalAmount: 0 },
                    totalAmount: ((todaySellsLatex?.totalAmount || 0) + (todaySellsCupLump?.totalAmount || 0))
                },
                expenses: ((todayExp?.total || 0) + (todayWage?.total || 0)),
                month: { income, cost, profit },
                unpaid: unpaid?.count || 0,
                dailyPrice: settingsMap.dailyPrice,
                chemicalSettings: settingsMap.chemicalSettings,
                history: {
                    buys: buyHistory?.results || [],
                    sells: sellHistory?.results || []
                },
                recentRecords: combinedRecent
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
