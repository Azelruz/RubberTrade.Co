import { jsonResponse, errorResponse, withAuth, withRateLimit, getTodayDateStr, getNowByTimezone } from './_utils.js';

async function handleGet(context) {
    try {
        const db = context.env.DB;
        const storeId = context.user.storeId;
        const role = context.user.role;
        
        // Date helpers (Dynamic based on user location)
        const tz = context.user.timezone || 'Asia/Bangkok';
        const today = getTodayDateStr(tz);
        const monthStart = `${today.substring(0, 7)}-01`;
        
        // We'll use 30 days window for price charts and dashboard overall
        const thirtyDaysAgo = new Date(getNowByTimezone(tz).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [
            farmersCount,
            staff,
            settings,
            priceSetting,
            // Summaries
            todayBuysStats,
            monthBuysTotal,
            unpaidBillsStats,
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
            
            // Buy stats: Today stats (filtered strictly by date = today to scan only today's rows)
            db.prepare(`
                SELECT 
                    SUM(total) as todayTotal,
                    SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN total ELSE 0 END) as todayLatexTotal,
                    SUM(CASE WHEN (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN total ELSE 0 END) as todayCupLumpTotal,
                    SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN weight - bucketWeight ELSE 0 END) as todayLatexWeight,
                    SUM(CASE WHEN (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN weight - bucketWeight ELSE 0 END) as todayCupLumpWeight,
                    SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN CASE WHEN dryRubber > 0 THEN dryRubber ELSE (weight - bucketWeight) * (drc/100) END ELSE 0 END) as todayLatexDry
                FROM buys WHERE userId = ? AND date = ?
            `).bind(storeId, today).first(),

            // Buy stats: Month Total (Daily Summary Table - ~30 rows read max)
            db.prepare("SELECT SUM(totalAmount) as monthTotal FROM daily_buys_summary WHERE userId = ? AND date >= ?").bind(storeId, monthStart).first(),

            // Buy stats: Unpaid Bills Count (Index-Only Scan via idx_buys_user_date_unpaid)
            db.prepare(`
                SELECT COUNT(*) as unpaidBills FROM buys 
                WHERE userId = ? AND date >= ? AND (
                    COALESCE(farmerStatus, '') NOT IN ('Paid', 'จ่ายแล้ว') OR 
                    COALESCE(employeeStatus, '') NOT IN ('Paid', 'จ่ายแล้ว')
                )
            `).bind(storeId, monthStart).first(),

            // Sell stats: Today and Month
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN date = ? THEN total ELSE 0 END) as todayTotal,
                    SUM(CASE WHEN date >= ? THEN total ELSE 0 END) as monthTotal
                FROM sells WHERE userId = ? AND date >= ?
            `).bind(today, monthStart, storeId, monthStart).first(),

            // Expense stats
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN date = ? THEN amount ELSE 0 END) as todayTotal,
                    SUM(CASE WHEN date >= ? THEN amount ELSE 0 END) as monthTotal
                FROM expenses WHERE userId = ? AND date >= ?
            `).bind(today, monthStart, storeId, monthStart).first(),

            // Wage stats
            db.prepare(`
                SELECT 
                    SUM(CASE WHEN date = ? THEN total ELSE 0 END) as todayTotal,
                    SUM(CASE WHEN date >= ? THEN total ELSE 0 END) as monthTotal
                FROM wages WHERE userId = ? AND date >= ?
            `).bind(today, monthStart, storeId, monthStart).first(),

            // Chart data buys (Last 30 days from daily_buys_summary - max 30 rows read!)
            db.prepare(`
                SELECT 
                    date, 
                    totalAmount as total, 
                    (CASE WHEN totalWeight > 0 THEN totalAmount / totalWeight ELSE 0 END) as avgPrice,
                    'latex' as rubberType
                FROM daily_buys_summary 
                WHERE userId = ? AND date >= ? 
                ORDER BY date ASC
            `).bind(storeId, thirtyDaysAgo).all(),

            // Chart data sells (Last 30 days from daily_sells_summary - max 30 rows read!)
            db.prepare(`
                SELECT 
                    date, 
                    totalAmount as total, 
                    (CASE WHEN totalWeight > 0 THEN totalAmount / totalWeight ELSE 0 END) as avgPrice,
                    'latex' as rubberType
                FROM daily_sells_summary 
                WHERE userId = ? AND date >= ? 
                ORDER BY date ASC
            `).bind(storeId, thirtyDaysAgo).all(),

            // Recent Transactions (No JOIN needed since farmerName is stored directly in buys)
            db.prepare("SELECT * FROM buys WHERE userId = ? ORDER BY date DESC, created_at DESC LIMIT 10").bind(storeId).all(),
            db.prepare("SELECT * FROM sells WHERE userId = ? ORDER BY date DESC, created_at DESC LIMIT 10").bind(storeId).all()
        ]);

        // Process Settings
        const settingsList = settings?.results || [];
        const settingsMap = {};
        settingsList.forEach(s => { if (s.key) settingsMap[s.key] = s.value; });

        const dailyPrice = {
            price: priceSetting ? (priceSetting.value || '0') : '0',
            date: priceSetting ? (priceSetting.updated_at || '').split(' ')[0] : '',
            cupLumpPrice: settingsMap.cupLumpPrice || '0'
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
        const monthIncome = Number(sellsStats?.monthTotal || 0);
        const monthCost = (Number(monthBuysTotal?.monthTotal || 0) + Number(expensesStats?.monthTotal || 0) + Number(wagesStats?.monthTotal || 0));
        const monthProfit = isStaff ? '***' : (monthIncome - monthCost);

        const res = jsonResponse({
            farmers: [], 
            staff: staff?.results || [],
            settings: settingsMap,
            dailyPrice: dailyPrice,
            
            stats: {
                todayBuy: Number(todayBuysStats?.todayTotal || 0),
                todayLatexBuy: Number(todayBuysStats?.todayLatexTotal || 0),
                todayCupLumpBuy: Number(todayBuysStats?.todayCupLumpTotal || 0),
                todaySell: Number(sellsStats?.todayTotal || 0),
                todayLatexWeight: Number(todayBuysStats?.todayLatexWeight || 0),
                todayCupLumpWeight: Number(todayBuysStats?.todayCupLumpWeight || 0),
                todayBuyWeight: Number(todayBuysStats?.todayLatexWeight || 0) + Number(todayBuysStats?.todayCupLumpWeight || 0),
                todayExpense: Number(expensesStats?.todayTotal || 0) + Number(wagesStats?.todayTotal || 0),
                todayAvgDrc: (Number(todayBuysStats?.todayLatexWeight || 0) > 1) ? (Number(todayBuysStats?.todayLatexDry || 0) / Number(todayBuysStats?.todayLatexWeight)) * 100 : 0,
                
                monthIncome: monthIncome,
                monthCost: monthCost,
                monthProfit: monthProfit,
                
                unpaidBills: Number(unpaidBillsStats?.unpaidBills || 0),
                totalMembers: Number(farmersCount?.count || 0)
            },
            
            charts: {
                buys: buysChart?.results || [],
                sells: sellsChart?.results || []
            },
            
            recentTransactions: mixedRecent,
            buys: recentBuys?.results || [], 
            sells: recentSells?.results || []
        });

        res.headers.set('Vary', 'Accept-Encoding, Authorization, X-Switch-Store-ID');
        res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        return res;
    } catch (e) {
        console.error("[GET /dashboard Optimized Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(withRateLimit(handleGet));
