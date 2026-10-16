import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload || body;
        const storeId = context.user.storeId;

        const {
            startDate,
            endDate,
            allocatedProfit: userAllocatedProfit,
            reservePct = 10,
            welfarePct = 5,
            boardBonusPct = 5,
            dividendShareRate = 5, // 5% of share value
            patronageFormulaType = 'dry_rubber', // 'dry_rubber' or 'sales_amount'
            patronageRefundRate = 0.5, // 0.50 baht/kg DRC, or % if sales_amount
            customBoardBonuses = {}
        } = payload;

        if (!startDate || !endDate) {
            return errorResponse("Missing startDate or endDate");
        }

        // 1. Calculate P&L Net Profit in the date range
        const [sellsRes, buysRes, expRes, wagesRes] = await Promise.all([
            context.env.DB.prepare(
                "SELECT SUM(total) as revenue FROM sells WHERE userId = ? AND date BETWEEN ? AND ?"
            ).bind(storeId, startDate, endDate).first(),
            context.env.DB.prepare(
                "SELECT SUM(total) as rawCost FROM buys WHERE userId = ? AND date BETWEEN ? AND ?"
            ).bind(storeId, startDate, endDate).first(),
            context.env.DB.prepare(
                "SELECT SUM(amount) as expCost FROM expenses WHERE userId = ? AND date BETWEEN ? AND ?"
            ).bind(storeId, startDate, endDate).first(),
            context.env.DB.prepare(
                "SELECT SUM(total) as wagesCost FROM wages WHERE userId = ? AND date BETWEEN ? AND ?"
            ).bind(storeId, startDate, endDate).first()
        ]);

        const revenue = Number(sellsRes?.revenue || 0);
        const rawCost = Number(buysRes?.rawCost || 0);
        const expCost = Number(expRes?.expCost || 0);
        const wagesCost = Number(wagesRes?.wagesCost || 0);
        const autoNetProfit = revenue - rawCost - expCost - wagesCost;

        let finalAllocatedProfit = 0;
        if (userAllocatedProfit !== undefined) {
            finalAllocatedProfit = Number(userAllocatedProfit);
        } else if (payload.retainedEarnings !== undefined && payload.retainedEarnings !== null && payload.retainedEarnings !== '') {
            finalAllocatedProfit = Math.max(0, Number(payload.retainedEarnings) + autoNetProfit);
        } else {
            finalAllocatedProfit = Math.max(0, autoNetProfit);
        }

        // 2. Fetch all active cooperative members
        const { results: members } = await context.env.DB.prepare(`
            SELECT * FROM coop_members 
            WHERE userId = ? AND status = 'active'
            ORDER BY 
                CASE 
                    WHEN orgPosition = 'chairman' THEN 1
                    WHEN orgPosition = 'vice_chairman' THEN 2
                    WHEN orgPosition = 'treasurer' THEN 3
                    WHEN orgPosition = 'secretary' THEN 4
                    WHEN orgPosition = 'procurement' THEN 5
                    WHEN orgPosition = 'auditor' THEN 6
                    WHEN orgPosition = 'advisor' THEN 7
                    ELSE 8
                END,
                memberNo ASC
        `).bind(storeId).all();

        // 3. Aggregate purchases for members linked to a farmerId in this date range
        const { results: farmerBuys } = await context.env.DB.prepare(`
            SELECT 
                farmerId,
                SUM(weight - bucketWeight) as volumeKg,
                SUM(
                    CASE 
                        WHEN dryRubber IS NOT NULL AND dryRubber > 0 THEN dryRubber
                        WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') 
                             THEN ((weight - bucketWeight) * drc) / 100.0
                        ELSE (weight - bucketWeight)
                    END
                ) as dryRubberKg,
                SUM(total) as totalBuyAmount
            FROM buys
            WHERE userId = ? AND date BETWEEN ? AND ? AND farmerId IS NOT NULL
            GROUP BY farmerId
        `).bind(storeId, startDate, endDate).all();

        const buysMap = {};
        (farmerBuys || []).forEach(b => {
            buysMap[b.farmerId] = {
                volumeKg: Number(b.volumeKg || 0),
                dryRubberKg: Number(b.dryRubberKg || 0),
                totalBuyAmount: Number(b.totalBuyAmount || 0)
            };
        });

        // 4. Query current loan debts for farmer members
        const { results: loans } = await context.env.DB.prepare(`
            SELECT borrowerId, SUM(remainingAmount) as debt
            FROM loans
            WHERE userId = ? AND remainingAmount > 0
            GROUP BY borrowerId
        `).bind(storeId).all();

        const debtMap = {};
        (loans || []).forEach(l => {
            debtMap[l.borrowerId] = Number(l.debt || 0);
        });

        // 5. Calculate Board Bonus Weights
        const boardMembers = (members || []).filter(m => m.orgPosition && m.orgPosition !== 'member' && m.orgPosition !== 'none');
        const posWeights = {
            chairman: 3,
            vice_chairman: 2,
            treasurer: 2,
            secretary: 2,
            procurement: 1.5,
            auditor: 1.5,
            advisor: 1
        };
        const totalWeight = boardMembers.reduce((sum, m) => sum + (posWeights[m.orgPosition] || 1), 0);
        const poolBoardBonus = (finalAllocatedProfit * Number(boardBonusPct || 0)) / 100;

        // 6. Calculate individual distributions (Only if finalAllocatedProfit > 0)
        const canDistribute = finalAllocatedProfit > 0;
        let totalShareDividend = 0;
        let totalPatronageRefund = 0;
        let totalBoardBonusDistributed = 0;

        const distributions = (members || []).map(member => {
            const shareCount = Number(member.totalShares || 0);
            const shareValue = Number(member.shareValue || 0);

            // Dividend on Shares (0 if loss / no allocated profit)
            const dividendShareAmount = canDistribute 
                ? (shareValue * Number(dividendShareRate || 0)) / 100 
                : 0;
            totalShareDividend += dividendShareAmount;

            // Patronage Refund (0 if loss / no allocated profit)
            let businessVolumeKg = 0;
            let businessDryRubberKg = 0;
            let businessTotalAmount = 0;
            let patronageRefundAmount = 0;

            if (member.farmerId && buysMap[member.farmerId]) {
                const b = buysMap[member.farmerId];
                businessVolumeKg = b.volumeKg;
                businessDryRubberKg = b.dryRubberKg;
                businessTotalAmount = b.totalBuyAmount;

                if (canDistribute) {
                    if (patronageFormulaType === 'dry_rubber') {
                        patronageRefundAmount = businessDryRubberKg * Number(patronageRefundRate || 0);
                    } else {
                        patronageRefundAmount = (businessTotalAmount * Number(patronageRefundRate || 0)) / 100;
                    }
                }
            }
            totalPatronageRefund += patronageRefundAmount;

            // Board Bonus (0 if loss / no allocated profit)
            let boardBonusAmount = 0;
            if (canDistribute) {
                if (customBoardBonuses && customBoardBonuses[member.id] !== undefined) {
                    boardBonusAmount = Number(customBoardBonuses[member.id]) || 0;
                } else if (member.orgPosition && member.orgPosition !== 'member' && member.orgPosition !== 'none' && totalWeight > 0) {
                    const weight = posWeights[member.orgPosition] || 1;
                    boardBonusAmount = Math.round((poolBoardBonus * (weight / totalWeight)) * 100) / 100;
                }
            }
            totalBoardBonusDistributed += boardBonusAmount;

            // Gross Payout
            const grossPayout = dividendShareAmount + patronageRefundAmount + boardBonusAmount;

            // Check outstanding loan
            const borrowerId = member.farmerId || member.id;
            const remainingDebt = debtMap[borrowerId] || 0;
            const deductedLoanAmount = Math.min(grossPayout, remainingDebt);
            const netPayout = Math.max(0, grossPayout - deductedLoanAmount);

            return {
                memberId: member.id,
                farmerId: member.farmerId,
                memberNo: member.memberNo,
                memberName: member.name,
                phone: member.phone,
                idCard: member.idCard,
                bankAccount: member.bankAccount,
                bankName: member.bankName,
                orgPosition: member.orgPosition,
                shareCount,
                shareValue,
                dividendShareAmount: Math.round(dividendShareAmount * 100) / 100,
                businessVolumeKg: Math.round(businessVolumeKg * 10) / 10,
                businessDryRubberKg: Math.round(businessDryRubberKg * 100) / 100,
                businessTotalAmount: Math.round(businessTotalAmount * 100) / 100,
                patronageRefundAmount: Math.round(patronageRefundAmount * 100) / 100,
                boardBonusAmount: Math.round(boardBonusAmount * 100) / 100,
                grossPayout: Math.round(grossPayout * 100) / 100,
                remainingDebt: Math.round(remainingDebt * 100) / 100,
                deductedLoanAmount: Math.round(deductedLoanAmount * 100) / 100,
                netPayout: Math.round(netPayout * 100) / 100,
                payoutStatus: 'pending'
            };
        });

        const reserveAmount = canDistribute ? (finalAllocatedProfit * Number(reservePct || 0)) / 100 : 0;
        const welfareAmount = canDistribute ? (finalAllocatedProfit * Number(welfarePct || 0)) / 100 : 0;
        const totalDistributed = totalShareDividend + totalPatronageRefund + totalBoardBonusDistributed;
        const isOverAllocated = canDistribute && totalDistributed > finalAllocatedProfit;
        const overAllocatedAmount = isOverAllocated ? (totalDistributed - finalAllocatedProfit) : 0;

        return jsonResponse({
            summary: {
                revenue: Math.round(revenue * 100) / 100,
                rawCost: Math.round(rawCost * 100) / 100,
                expensesCost: Math.round(expCost * 100) / 100,
                wagesCost: Math.round(wagesCost * 100) / 100,
                autoNetProfit: Math.round(autoNetProfit * 100) / 100,
                allocatedProfit: Math.round(finalAllocatedProfit * 100) / 100,
                isLoss: autoNetProfit < 0,
                canDistribute,
                isOverAllocated,
                overAllocatedAmount: Math.round(overAllocatedAmount * 100) / 100,
                reservePct: Number(reservePct),
                reserveAmount: Math.round(reserveAmount * 100) / 100,
                welfarePct: Number(welfarePct),
                welfareAmount: Math.round(welfareAmount * 100) / 100,
                boardBonusPct: Number(boardBonusPct),
                boardBonusAmount: Math.round(totalBoardBonusDistributed * 100) / 100,
                dividendShareRate: Number(dividendShareRate),
                dividendShareTotal: Math.round(totalShareDividend * 100) / 100,
                patronageFormulaType,
                patronageRefundRate: Number(patronageRefundRate),
                patronageRefundTotal: Math.round(totalPatronageRefund * 100) / 100,
                totalDistributed: Math.round(totalDistributed * 100) / 100,
                memberCount: members ? members.length : 0
            },
            distributions
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
