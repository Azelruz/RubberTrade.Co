import { jsonResponse, errorResponse } from '../_utils.js';

export async function onRequestGet(context) {
    try {
        const db = context.env.DB;
        const url = new URL(context.request.url);

        const farmerId = url.searchParams.get('id') || url.searchParams.get('farmerId');
        const plotId = url.searchParams.get('plotId');
        const period = url.searchParams.get('period') || 'month'; // 'today', '7days', 'month', 'year', 'all'

        if (!farmerId) {
            return errorResponse('กรุณาระบุรหัสเกษตรกร (id)', 400);
        }

        // 1. Fetch Farmer or Tapper Info (by ID or Phone)
        let farmer = await db.prepare(
            "SELECT id, name, phone, address, userId FROM farmers WHERE id = ? OR phone = ? LIMIT 1"
        ).bind(farmerId, farmerId).first();

        let isTapper = false;
        let tapperInfo = null;
        if (!farmer) {
            const employee = await db.prepare(
                "SELECT id, name, phone, farmerId, profitSharePct, userId FROM employees WHERE id = ? OR phone = ? LIMIT 1"
            ).bind(farmerId, farmerId).first();
            if (employee) {
                isTapper = true;
                tapperInfo = employee;
                farmer = {
                    id: employee.id,
                    name: employee.name,
                    phone: employee.phone || '',
                    address: '',
                    farmerId: employee.farmerId || null,
                    profitSharePct: employee.profitSharePct || 50,
                    userId: employee.userId
                };
            }
        }

        if (!farmer) {
            return errorResponse('ไม่พบข้อมูลเกษตรกรหรือคนกรีดยางในระบบ', 404);
        }

        const tenantId = farmer.userId;

        // 2. Fetch All Plots of this Farmer or Tapper
        let plotsRes = null;
        if (isTapper) {
            plotsRes = await db.prepare(
                "SELECT * FROM land_plots WHERE employeeId = ? OR (farmerId = ? AND farmerId IS NOT NULL) ORDER BY created_at ASC"
            ).bind(farmer.id, farmer.farmerId || '').all();
        } else {
            plotsRes = await db.prepare(
                "SELECT * FROM land_plots WHERE farmerId = ? ORDER BY created_at ASC"
            ).bind(farmerId).all();
        }
        const plotsList = plotsRes?.results || [];

        // Determine target plot
        let targetPlot = null;
        if (plotId) {
            targetPlot = plotsList.find(p => p.id === plotId);
        }
        if (!targetPlot && plotsList.length > 0) {
            targetPlot = plotsList[0];
        }

        // 3. Compute Dates based on period
        const now = new Date();
        const formatYMD = (d) => d.toISOString().split('T')[0];
        const todayStr = formatYMD(now);
        let startDate = '';
        let endDate = todayStr;

        if (period === 'today') {
            startDate = todayStr;
        } else if (period === '7days') {
            const past7 = new Date(now);
            past7.setDate(past7.getDate() - 7);
            startDate = formatYMD(past7);
        } else if (period === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate = formatYMD(firstDay);
        } else if (period === 'year') {
            const firstJan = new Date(now.getFullYear(), 0, 1);
            startDate = formatYMD(firstJan);
        }

        // 4. Buys in Period (Scoped to tenantId)
        let buysQuery = "";
        let buysParams = [];
        if (tenantId) {
            buysQuery = isTapper 
                ? "SELECT * FROM buys WHERE userId = ? AND employeeId = ?"
                : "SELECT * FROM buys WHERE userId = ? AND (farmerId = ? OR (farmerId IS NULL AND farmerName = ?))";
            buysParams = isTapper ? [tenantId, farmer.id] : [tenantId, farmerId, farmer.name];
        } else {
            buysQuery = isTapper 
                ? "SELECT * FROM buys WHERE employeeId = ?"
                : "SELECT * FROM buys WHERE (farmerId = ? OR farmerName = ?)";
            buysParams = isTapper ? [farmer.id] : [farmerId, farmer.name];
        }

        if (targetPlot?.id) {
            buysQuery += " AND (landPlotId = ? OR landPlotId IS NULL OR landPlotId = '')";
            buysParams.push(targetPlot.id);
        }

        if (startDate) {
            buysQuery += " AND date >= ?";
            buysParams.push(startDate);
        }
        if (endDate) {
            buysQuery += " AND date <= ?";
            buysParams.push(endDate);
        }

        buysQuery += " ORDER BY date DESC, created_at DESC";

        let buysList = [];
        try {
            const buysRes = await db.prepare(buysQuery).bind(...buysParams).all();
            buysList = buysRes?.results || [];
        } catch (e) {
            const fallbackQuery = tenantId
                ? (isTapper ? "SELECT * FROM buys WHERE userId = ? AND employeeId = ? ORDER BY date DESC LIMIT 30" : "SELECT * FROM buys WHERE userId = ? AND (farmerId = ? OR farmerName = ?) ORDER BY date DESC LIMIT 30")
                : (isTapper ? "SELECT * FROM buys WHERE employeeId = ? ORDER BY date DESC LIMIT 30" : "SELECT * FROM buys WHERE farmerId = ? OR farmerName = ? ORDER BY date DESC LIMIT 30");
            const fallbackParams = tenantId
                ? (isTapper ? [tenantId, farmer.id] : [tenantId, farmerId, farmer.name])
                : (isTapper ? [farmer.id] : [farmerId, farmer.name]);
            const fallbackRes = await db.prepare(fallbackQuery).bind(...fallbackParams).all();
            buysList = fallbackRes?.results || [];
        }

        let totalWeight = 0;
        let totalDryRubber = 0;
        let totalAmount = 0;
        let farmerTotal = 0;
        let employeeTotal = 0;
        let drcSum = 0;
        let drcCount = 0;

        buysList.forEach(b => {
            const w = parseFloat(b.weight) || 0;
            const dr = parseFloat(b.dryRubber) || 0;
            const t = parseFloat(b.total) || 0;
            const ft = parseFloat(b.farmerTotal) || (parseFloat(b.total) || 0);
            const et = parseFloat(b.employeeTotal) || 0;
            const drc = parseFloat(b.drc) || 0;

            totalWeight += w;
            totalDryRubber += dr;
            totalAmount += t;
            farmerTotal += ft;
            employeeTotal += et;

            if (drc > 0) {
                drcSum += drc;
                drcCount += 1;
            }
        });

        const avgDrc = drcCount > 0 ? (drcSum / drcCount).toFixed(1) : '0.0';

        // 5. Cumulative Rubber Volume (All-Time, Scoped to tenantId)
        let cumQuery = "";
        let cumParams = [];
        if (tenantId) {
            cumQuery = isTapper
                ? "SELECT SUM(weight) as cumWeight, SUM(dryRubber) as cumDryRubber, SUM(total) as cumTotal, SUM(employeeTotal) as cumEmployeeTotal FROM buys WHERE userId = ? AND employeeId = ?"
                : "SELECT SUM(weight) as cumWeight, SUM(dryRubber) as cumDryRubber, SUM(total) as cumTotal, SUM(farmerTotal) as cumFarmerTotal FROM buys WHERE userId = ? AND (farmerId = ? OR (farmerId IS NULL AND farmerName = ?))";
            cumParams = isTapper ? [tenantId, farmer.id] : [tenantId, farmerId, farmer.name];
        } else {
            cumQuery = isTapper
                ? "SELECT SUM(weight) as cumWeight, SUM(dryRubber) as cumDryRubber, SUM(total) as cumTotal, SUM(employeeTotal) as cumEmployeeTotal FROM buys WHERE employeeId = ?"
                : "SELECT SUM(weight) as cumWeight, SUM(dryRubber) as cumDryRubber, SUM(total) as cumTotal, SUM(farmerTotal) as cumFarmerTotal FROM buys WHERE farmerId = ? OR farmerName = ?";
            cumParams = isTapper ? [farmer.id] : [farmerId, farmer.name];
        }
        const cumRes = await db.prepare(cumQuery).bind(...cumParams).first().catch(() => ({}));

        const cumulativeWeight = parseFloat(cumRes?.cumWeight) || 0;
        const cumulativeDryRubber = parseFloat(cumRes?.cumDryRubber) || 0;
        const cumulativeTotal = parseFloat(cumRes?.cumTotal) || 0;
        const cumulativeEmployeeTotal = parseFloat(cumRes?.cumEmployeeTotal) || 0;

        // 6. Promotion Loyalty Points (Scoped to tenantId)
        const pointsSetting = await db.prepare(
            tenantId
                ? "SELECT value FROM settings WHERE userId = ? AND key = 'pointsPerKg' LIMIT 1"
                : "SELECT value FROM settings WHERE key = 'pointsPerKg' LIMIT 1"
        ).bind(...(tenantId ? [tenantId] : [])).first().catch(() => null);
        const pointsPerKg = pointsSetting ? (parseFloat(pointsSetting.value) || 10) : 10;

        const promosRes = await db.prepare(
            tenantId
                ? "SELECT SUM(pointsUsed) as totalUsed FROM promotions WHERE userId = ? AND (farmerId = ? OR farmerName = ?)"
                : "SELECT SUM(pointsUsed) as totalUsed FROM promotions WHERE farmerId = ? OR farmerName = ?"
        ).bind(...(tenantId ? [tenantId, farmerId, farmer.name] : [farmerId, farmer.name])).first().catch(() => ({}));

        const usedPoints = parseFloat(promosRes?.totalUsed) || 0;
        const earnedPoints = Math.floor(cumulativeDryRubber / pointsPerKg);
        const currentPoints = Math.max(0, earnedPoints - usedPoints);

        // 7. Cooperative Membership & Dividends (Scoped to tenantId)
        let coopMember = null;
        try {
            coopMember = await db.prepare(
                tenantId
                    ? "SELECT * FROM coop_members WHERE userId = ? AND farmerId = ?"
                    : "SELECT * FROM coop_members WHERE farmerId = ?"
            ).bind(...(tenantId ? [tenantId, farmerId] : [farmerId])).first();
        } catch (e) {}

        let dividendInfo = null;
        if (coopMember) {
            try {
                const distRes = await db.prepare(`
                    SELECT dd.*, dp.year, dp.name as periodName
                    FROM dividend_distributions dd
                    JOIN dividend_periods dp ON dd.periodId = dp.id
                    WHERE dd.memberId = ?
                    ORDER BY dp.year DESC, dd.created_at DESC
                    LIMIT 1
                `).bind(coopMember.id).first();

                dividendInfo = {
                    isMember: true,
                    memberNo: coopMember.memberNo,
                    shareCount: coopMember.totalShares || 0,
                    shareValue: (coopMember.totalShares || 0) * 100,
                    orgPosition: coopMember.orgPosition,
                    latestDistribution: distRes ? {
                        periodName: distRes.periodName || `รอบปี ${distRes.year}`,
                        year: distRes.year,
                        shareDividend: parseFloat(distRes.dividendShareAmount) || 0,
                        patronageRefund: parseFloat(distRes.patronageRefundAmount) || 0,
                        netPayout: parseFloat(distRes.netPayout) || 0,
                        payoutStatus: distRes.payoutStatus,
                        paidDate: distRes.paidDate
                    } : null
                };
            } catch (e) {
                dividendInfo = { isMember: true, memberNo: coopMember.memberNo, shareCount: coopMember.totalShares || 0 };
            }
        } else {
            dividendInfo = { isMember: false };
        }

        // 8. Plot Activities (Scoped to tenantId)
        let activities = [];
        try {
            let actQuery = tenantId
                ? "SELECT * FROM plot_activities WHERE userId = ? AND farmerId = ?"
                : "SELECT * FROM plot_activities WHERE farmerId = ?";
            const actParams = tenantId ? [tenantId, farmerId] : [farmerId];
            if (targetPlot?.id) {
                actQuery += " AND plotId = ?";
                actParams.push(targetPlot.id);
            }
            actQuery += " ORDER BY date DESC, created_at DESC LIMIT 20";
            const actRes = await db.prepare(actQuery).bind(...actParams).all();
            activities = actRes?.results || [];
        } catch (e) {}

        const lastFertilizer = activities.find(a => a.activityType === 'fertilizer');
        const lastMowing = activities.find(a => a.activityType === 'mowing' || a.activityType === 'weed_control');

        let mowingDaysAgo = null;
        let mowingStatus = 'unknown';
        if (lastMowing && lastMowing.date) {
            const diffTime = Math.abs(new Date() - new Date(lastMowing.date));
            mowingDaysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (mowingDaysAgo <= 35) mowingStatus = 'clean';
            else if (mowingDaysAgo <= 50) mowingStatus = 'due_soon';
            else mowingStatus = 'overdue';
        }

        let totalActivityCosts = 0;
        activities.forEach(a => {
            if ((!startDate || a.date >= startDate) && (!endDate || a.date <= endDate)) {
                totalActivityCosts += parseFloat(a.cost) || 0;
            }
        });

        const netPlotProfit = farmerTotal - totalActivityCosts;

        // 9. Hyper-local Weather for Plot
        let weather = null;
        const targetLat = targetPlot?.lat ? parseFloat(targetPlot.lat) : null;
        const targetLng = targetPlot?.lng ? parseFloat(targetPlot.lng) : null;

        if (targetLat && targetLng && !isNaN(targetLat) && !isNaN(targetLng)) {
            try {
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLng}&hourly=precipitation_probability,precipitation,temperature_2m,relative_humidity_2m&timezone=Asia%2FBangkok&forecast_days=1`;
                const wRes = await fetch(weatherUrl, { headers: { 'User-Agent': 'RubberTrade-Portal' } });
                if (wRes.ok) {
                    const wData = await wRes.json();
                    const hourly = wData.hourly;
                    if (hourly && hourly.time) {
                        let maxRainProb = 0;
                        let totalRain = 0;
                        let tempSum = 0;
                        let humidSum = 0;

                        for (let h = 1; h <= 6; h++) {
                            if (hourly.precipitation_probability && hourly.precipitation_probability[h] > maxRainProb) {
                                maxRainProb = hourly.precipitation_probability[h];
                            }
                            if (hourly.precipitation && hourly.precipitation[h]) {
                                totalRain += hourly.precipitation[h];
                            }
                            if (hourly.temperature_2m && hourly.temperature_2m[h]) {
                                tempSum += hourly.temperature_2m[h];
                            }
                            if (hourly.relative_humidity_2m && hourly.relative_humidity_2m[h]) {
                                humidSum += hourly.relative_humidity_2m[h];
                            }
                        }

                        let canTap = 'yes';
                        let canTapText = 'กรีดได้ปกติ';
                        let canTapColor = 'emerald';

                        if (maxRainProb >= 65 || totalRain > 2.0) {
                            canTap = 'no';
                            canTapText = 'งดกรีดเด็ดขาด (ฝนตกชุก)';
                            canTapColor = 'red';
                        } else if (maxRainProb >= 30 || totalRain > 0.3) {
                            canTap = 'warning';
                            canTapText = 'เสี่ยงฝนตกช่วงเช้ามืด';
                            canTapColor = 'amber';
                        }

                        weather = {
                            canTap,
                            canTapText,
                            canTapColor,
                            rainProbability: maxRainProb,
                            totalRainMm: totalRain.toFixed(1),
                            avgTemp: (tempSum / 6).toFixed(1),
                            avgHumidity: Math.round(humidSum / 6)
                        };
                    }
                }
            } catch (e) {}
        }

        const res = jsonResponse({
            status: 'success',
            data: {
                farmer,
                plots: plotsList,
                selectedPlot: targetPlot,
                periodSummary: {
                    period,
                    startDate,
                    endDate,
                    totalWeight: Math.round(totalWeight * 100) / 100,
                    totalDryRubber: Math.round(totalDryRubber * 100) / 100,
                    avgDrc,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    farmerTotal: Math.round(farmerTotal * 100) / 100,
                    employeeTotal: Math.round(employeeTotal * 100) / 100,
                    buyCount: buysList.length,
                    recentBuys: buysList.slice(0, 10)
                },
                cumulativeGroup: {
                    weight: Math.round(cumulativeWeight * 100) / 100,
                    dryRubber: Math.round(cumulativeDryRubber * 100) / 100,
                    revenue: Math.round(cumulativeTotal * 100) / 100
                },
                promotions: {
                    pointsPerKg,
                    earnedPoints,
                    usedPoints,
                    currentPoints
                },
                cooperative: dividendInfo,
                plotCare: {
                    lastFertilizer: lastFertilizer || null,
                    lastMowing: lastMowing ? { ...lastMowing, daysAgo: mowingDaysAgo, status: mowingStatus } : null,
                    activities: activities.slice(0, 5),
                    totalActivityCosts: Math.round(totalActivityCosts * 100) / 100,
                    netPlotProfit: Math.round(netPlotProfit * 100) / 100
                },
                weather
            }
        });

        res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
        return res;
    } catch (e) {
        console.error('[Public Farmer Plot Error]', e);
        return errorResponse(e.message);
    }
}
