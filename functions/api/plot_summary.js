import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const db = context.env.DB;
        const storeId = context.user.storeId || context.user.id;
        const url = new URL(context.request.url);

        const farmerId = url.searchParams.get('farmerId');
        const plotId = url.searchParams.get('plotId');
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const lat = parseFloat(url.searchParams.get('lat'));
        const lng = parseFloat(url.searchParams.get('lng'));

        if (!farmerId) {
            return errorResponse('Missing farmerId parameter', 400);
        }

        // 1. Fetch Farmer Info (relaxed userId check to support shared store data)
        let farmer = await db.prepare(
            "SELECT * FROM farmers WHERE id = ? AND userId = ?"
        ).bind(farmerId, storeId).first();

        if (!farmer) {
            farmer = await db.prepare(
                "SELECT * FROM farmers WHERE id = ?"
            ).bind(farmerId).first();
        }

        if (!farmer) {
            return errorResponse('Farmer not found', 404);
        }

        const effectiveStoreId = farmer.userId || storeId;

        // 2. Build Buys Query for the Selected Time Period
        let buysQuery = "SELECT * FROM buys WHERE userId = ? AND (farmerId = ? OR farmerName = ?)";
        const buysParams = [effectiveStoreId, farmerId, farmer.name];

        if (plotId) {
            buysQuery += " AND (landPlotId = ? OR landPlotId IS NULL OR landPlotId = '')";
            buysParams.push(plotId);
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
            // Fallback if landPlotId has issue
            console.warn('[plot_summary buysQuery fallback]', e.message);
            const fallbackRes = await db.prepare(
                "SELECT * FROM buys WHERE userId = ? AND (farmerId = ? OR farmerName = ?) ORDER BY date DESC LIMIT 50"
            ).bind(effectiveStoreId, farmerId, farmer.name).all();
            buysList = fallbackRes?.results || [];
        }

        // Aggregations for period
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

        // 3. Tappers & Employees Breakdown
        const employeesRes = await db.prepare(`
            SELECT fe.*, e.name as employeeName, e.phone as employeePhone
            FROM farmer_employees fe
            JOIN employees e ON fe.employeeId = e.id
            WHERE fe.farmerId = ?
        `).bind(farmerId).all().catch(() => ({ results: [] }));

        const employeeMap = {};
        (employeesRes?.results || []).forEach(emp => {
            employeeMap[emp.employeeId] = {
                id: emp.employeeId,
                name: emp.employeeName || 'คนกรีดยาง',
                phone: emp.employeePhone || '',
                profitSharePct: emp.profitSharePct != null ? emp.profitSharePct : 50,
                totalEarned: 0,
                tapCount: 0
            };
        });

        // Sum earnings from buys in period
        buysList.forEach(b => {
            if (b.employeeId && employeeMap[b.employeeId]) {
                employeeMap[b.employeeId].totalEarned += parseFloat(b.employeeTotal) || 0;
                employeeMap[b.employeeId].tapCount += 1;
            }
        });

        const tappersList = Object.values(employeeMap);

        // 4. Cumulative Rubber Volume (All-Time in Group)
        const cumRes = await db.prepare(`
            SELECT 
                SUM(weight) as cumWeight, 
                SUM(dryRubber) as cumDryRubber, 
                SUM(total) as cumTotal,
                COUNT(id) as totalTransactions
            FROM buys 
            WHERE userId = ? AND (farmerId = ? OR farmerName = ?)
        `).bind(effectiveStoreId, farmerId, farmer.name).first().catch(() => ({}));

        const cumulativeWeight = parseFloat(cumRes?.cumWeight) || 0;
        const cumulativeDryRubber = parseFloat(cumRes?.cumDryRubber) || 0;
        const cumulativeTotal = parseFloat(cumRes?.cumTotal) || 0;

        // 5. Promotion Loyalty Points
        const pointsSetting = await db.prepare(
            "SELECT value FROM settings WHERE userId = ? AND key = 'pointsPerKg' LIMIT 1"
        ).bind(effectiveStoreId).first().catch(() => null);
        const pointsPerKg = pointsSetting ? (parseFloat(pointsSetting.value) || 10) : 10;

        const promosRes = await db.prepare(`
            SELECT SUM(pointsUsed) as totalUsed 
            FROM promotions 
            WHERE userId = ? AND (farmerId = ? OR farmerName = ?)
        `).bind(effectiveStoreId, farmerId, farmer.name).first().catch(() => ({}));

        const usedPoints = parseFloat(promosRes?.totalUsed) || 0;
        const earnedPoints = Math.floor(cumulativeDryRubber / pointsPerKg);
        const currentPoints = Math.max(0, earnedPoints - usedPoints);

        // 6. Cooperative Membership & Dividends
        let coopMember = null;
        try {
            coopMember = await db.prepare(
                "SELECT * FROM coop_members WHERE userId = ? AND farmerId = ?"
            ).bind(effectiveStoreId, farmerId).first();
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
                        boardBonus: parseFloat(distRes.boardBonusAmount) || 0,
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

        // 7. Plot Activities (Fertilizer, Mowing, Costs)
        let activities = [];
        try {
            let actQuery = "SELECT * FROM plot_activities WHERE userId = ? AND farmerId = ?";
            const actParams = [effectiveStoreId, farmerId];
            if (plotId) {
                actQuery += " AND plotId = ?";
                actParams.push(plotId);
            }
            actQuery += " ORDER BY date DESC, created_at DESC LIMIT 30";
            const actRes = await db.prepare(actQuery).bind(...actParams).all();
            activities = actRes?.results || [];
        } catch (e) {}

        // Last fertilizer log
        const lastFertilizer = activities.find(a => a.activityType === 'fertilizer');
        // Last mowing log
        const lastMowing = activities.find(a => a.activityType === 'mowing' || a.activityType === 'weed_control');

        let mowingDaysAgo = null;
        let mowingStatus = 'unknown'; // clean | due_soon | overdue
        if (lastMowing && lastMowing.date) {
            const diffTime = Math.abs(new Date() - new Date(lastMowing.date));
            mowingDaysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (mowingDaysAgo <= 35) mowingStatus = 'clean';
            else if (mowingDaysAgo <= 50) mowingStatus = 'due_soon';
            else mowingStatus = 'overdue';
        }

        // Sum service / maintenance costs in period
        let totalActivityCosts = 0;
        activities.forEach(a => {
            if ((!startDate || a.date >= startDate) && (!endDate || a.date <= endDate)) {
                totalActivityCosts += parseFloat(a.cost) || 0;
            }
        });

        // Net plot profit
        const netPlotProfit = farmerTotal - totalActivityCosts;

        // 8. Hyper-local Weather Forecast & Tapping Feasibility
        let weather = null;
        const targetLat = !isNaN(lat) && lat !== 0 ? lat : null;
        const targetLng = !isNaN(lng) && lng !== 0 ? lng : null;

        if (targetLat && targetLng) {
            try {
                const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLng}&hourly=precipitation_probability,precipitation,temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FBangkok&forecast_days=1`;
                const wRes = await fetch(weatherUrl, { headers: { 'User-Agent': 'RubberTrade-App' } });
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
            } catch (e) {
                console.warn('[Weather API Warning]', e.message);
            }
        }

        return jsonResponse({
            status: 'success',
            data: {
                farmer: {
                    id: farmer.id,
                    name: farmer.name,
                    phone: farmer.phone,
                    address: farmer.address
                },
                periodSummary: {
                    startDate: startDate || null,
                    endDate: endDate || null,
                    totalWeight: Math.round(totalWeight * 100) / 100,
                    totalDryRubber: Math.round(totalDryRubber * 100) / 100,
                    avgDrc,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    farmerTotal: Math.round(farmerTotal * 100) / 100,
                    employeeTotal: Math.round(employeeTotal * 100) / 100,
                    buyCount: buysList.length,
                    recentBuys: buysList.slice(0, 7)
                },
                tappers: tappersList,
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
                    activities: activities.slice(0, 10),
                    totalActivityCosts: Math.round(totalActivityCosts * 100) / 100,
                    netPlotProfit: Math.round(netPlotProfit * 100) / 100
                },
                weather
            }
        });
    } catch (e) {
        console.error('[plot_summary Error]', e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
