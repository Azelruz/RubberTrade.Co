import { jsonResponse, errorResponse, withAuth, withRateLimit } from './_utils.js';

async function handleGet(context) {
    try {
        const db = context.env.DB;
        const storeId = context.user.storeId;
        const role = context.user.role;
        
        // Date helpers
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const monthStart = `${today.substring(0, 7)}-01`;
        
        // We'll use 30 days window for price charts and dashboard overall
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [
            farmersCount,
            staff,
            settings,
            priceSetting,
            // Summaries
            buysStats,
            sellsStats,
            expensesStats,
            wagesStats,
            // Chart Data (Aggregated)
            buysChart,
            sellsChart,
            // Recent Records (Limited)
            recentBuys,
            recentSells
        ] = await Promise.all([
            db.prepare("SELECT COUNT(*) as count FROM farmers WHERE userId = ?").bind(storeId).first(),
            db.prepare("SELECT * FROM staff WHERE userId = ?").bind(storeId).all(),
            db.prepare("SELECT * FROM settings WHERE userId = ?").bind(storeId).all(),
            db.prepare("SELECT value, updated_at FROM settings WHERE userId = ? AND key = 'daily_price'").bind(storeId).first(),
            
            // Buy stats: Today and Month
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN date = ? THEN total ELSE 0 END) as todayTotal,
                    SUM(CASE WHEN date = ? AND (rubberType = 'latex' OR rubberType IS NULL) THEN total ELSE 0 END) as todayLatexTotal,
                    SUM(CASE WHEN date = ? AND (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN total ELSE 0 END) as todayCupLumpTotal,
                    SUM(CASE WHEN date = ? AND (rubberType = 'latex' OR rubberType IS NULL) THEN weight - bucketWeight ELSE 0 END) as todayLatexWeight,
                    SUM(CASE WHEN date = ? AND (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN weight - bucketWeight ELSE 0 END) as todayCupLumpWeight,
                    SUM(CASE WHEN date = ? AND (rubberType = 'latex' OR rubberType IS NULL) THEN CASE WHEN dryRubber > 0 THEN dryRubber ELSE (weight - bucketWeight) * (drc/100) END ELSE 0 END) as todayLatexDry,
                    SUM(CASE WHEN date >= ? THEN total ELSE 0 END) as monthTotal,
                    COUNT(CASE WHEN (farmerStatus != 'Paid' AND farmerStatus != 'จ่ายแล้ว') OR (employeeStatus != 'Paid' AND employeeStatus != 'จ่ายแล้ว') THEN 1 END) as unpaidBills
                FROM buys WHERE userId = ?
            `).bind(today, today, today, today, today, today, monthStart, storeId).first(),

            // Sell stats: Today and Month
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN date = ? THEN total ELSE 0 END) as todayTotal,
                    SUM(CASE WHEN date >= ? THEN total ELSE 0 END) as monthTotal
                FROM sells WHERE userId = ?
            `).bind(today, monthStart, storeId).first(),

            // Expense stats
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN date = ? THEN amount ELSE 0 END) as todayTotal,
                    SUM(CASE WHEN date >= ? THEN amount ELSE 0 END) as monthTotal
                FROM expenses WHERE userId = ?
            `).bind(today, monthStart, storeId).first(),

            // Wage stats
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN date = ? THEN total ELSE 0 END) as todayTotal,
                    SUM(CASE WHEN date >= ? THEN total ELSE 0 END) as monthTotal
                FROM wages WHERE userId = ?
            `).bind(today, monthStart, storeId).first(),

            // Chart data buys (Last 30 days aggregated by date)
            db.prepare(`
                SELECT 
                    date, 
                    SUM(total) as total, 
                    AVG(pricePerKg) as avgPrice,
                    rubberType
                FROM buys 
                WHERE userId = ? AND date >= ? 
                GROUP BY date, rubberType
            `).bind(storeId, thirtyDaysAgo).all(),

            // Chart data sells (Last 30 days)
            db.prepare(`
                SELECT 
                    date, 
                    SUM(total) as total, 
                    AVG(pricePerKg) as avgPrice,
                    rubberType
                FROM sells 
                WHERE userId = ? AND date >= ? 
                GROUP BY date, rubberType
            `).bind(storeId, thirtyDaysAgo).all(),

            // Recent Transactions
            db.prepare("SELECT b.*, f.name as farmerName FROM buys b LEFT JOIN farmers f ON b.farmerId = f.id WHERE b.userId = ? ORDER BY b.date DESC, b.created_at DESC LIMIT 10").bind(storeId).all(),
            db.prepare("SELECT * FROM sells WHERE userId = ? ORDER BY date DESC, created_at DESC LIMIT 10").bind(storeId).all()
        ]);

        // Process Settings
        const settingsList = settings?.results || [];
        const settingsMap = {};
        settingsList.forEach(s => { if (s.key) settingsMap[s.key] = s.value; });

        const dailyPrice = {
            price: priceSetting ? (priceSetting.value || '0') : '0',
            date: priceSetting ? (priceSetting.updated_at || '').split(' ')[0] : ''
        };

        // Combine recent transactions for the "Recent" list
        const mixedRecent = [
            ...(recentBuys?.results || []).map(b => ({ ...b, type: 'buy' })),
            ...(recentSells?.results || []).map(s => ({ ...s, type: 'sell' }))
        ].sort((a, b) => {
            const dateA = new Date(a.timestamp || a.date);
            const dateB = new Date(b.timestamp || b.date);
            return dateB - dateA;
        }).slice(0, 5);

        const isStaff = role === 'staff';
        const monthIncome = isStaff ? 0 : Number(sellsStats?.monthTotal || 0);
        const monthCost = isStaff ? 0 : (Number(buysStats?.monthTotal || 0) + Number(expensesStats?.monthTotal || 0) + Number(wagesStats?.monthTotal || 0));
        const monthProfit = isStaff ? 0 : (monthIncome - monthCost);

        return jsonResponse({
            farmers: [], 
            staff: staff?.results || [],
            settings: settingsMap,
            dailyPrice: dailyPrice,
            
            stats: {
                todayBuy: Number(buysStats?.todayTotal || 0),
                todayLatexBuy: Number(buysStats?.todayLatexTotal || 0),
                todayCupLumpBuy: Number(buysStats?.todayCupLumpTotal || 0),
                todaySell: Number(sellsStats?.todayTotal || 0),
                todayLatexWeight: Number(buysStats?.todayLatexWeight || 0),
                todayCupLumpWeight: Number(buysStats?.todayCupLumpWeight || 0),
                todayBuyWeight: Number(buysStats?.todayLatexWeight || 0) + Number(buysStats?.todayCupLumpWeight || 0),
                todayExpense: Number(expensesStats?.todayTotal || 0) + Number(wagesStats?.todayTotal || 0),
                todayAvgDrc: (Number(buysStats?.todayLatexWeight || 0) > 0) ? (Number(buysStats?.todayLatexDry || 0) / Number(buysStats?.todayLatexWeight)) * 100 : 0,
                
                monthIncome: monthIncome,
                monthCost: monthCost,
                monthProfit: monthProfit,
                
                unpaidBills: Number(buysStats?.unpaidBills || 0),
                totalMembers: Number(farmersCount?.count || 0)
            },
            
            charts: {
                buys: isStaff ? [] : (buysChart?.results || []),
                sells: isStaff ? [] : (sellsChart?.results || [])
            },
            
            recentTransactions: mixedRecent,
            buys: recentBuys?.results || [], 
            sells: recentSells?.results || []
        });
    } catch (e) {
        console.error("[GET /dashboard Optimized Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(withRateLimit(handleGet));
