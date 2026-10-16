/**
 * Cooperative Financial Calculations Module
 * Pure calculation functions for savings interest & dividend distributions.
 */

/**
 * Calculate annual/periodic savings interest for cooperative members.
 * @param {Array} members - List of coop members [{ id, name, memberNo, savingsBalance }]
 * @param {number} ratePerYear - Interest rate per year (e.g. 2.5 for 2.5%)
 * @param {number} periodMonths - Calculation period in months (1, 3, 6, 12)
 * @returns {Object} { distributions, summary: { totalEligibleMembers, totalSavingsPrincipal, estimatedTotalInterest } }
 */
export const calculateCoopSavingsInterest = (members = [], ratePerYear = 2.0, periodMonths = 12) => {
    const rate = Number(ratePerYear) || 0;
    const months = Number(periodMonths) || 12;
    const yearFraction = months / 12;

    const distributions = [];
    let totalSavingsPrincipal = 0;
    let estimatedTotalInterest = 0;

    members.forEach(member => {
        const currentBalance = Number(member.savingsBalance || 0);
        if (currentBalance > 0) {
            totalSavingsPrincipal += currentBalance;
            // Interest = Principal * (Rate / 100) * (Months / 12)
            const rawInterest = currentBalance * (rate / 100) * yearFraction;
            const interestAmount = Math.round(rawInterest * 100) / 100;
            const newBalance = Math.round((currentBalance + interestAmount) * 100) / 100;

            if (interestAmount > 0) {
                distributions.push({
                    memberId: member.id,
                    memberName: member.name,
                    memberNo: member.memberNo,
                    currentBalance,
                    interestAmount,
                    newBalance
                });
                estimatedTotalInterest += interestAmount;
            }
        }
    });

    return {
        status: 'success',
        ratePerYear: rate,
        periodMonths: months,
        summary: {
            totalEligibleMembers: distributions.length,
            totalSavingsPrincipal: Math.round(totalSavingsPrincipal * 100) / 100,
            estimatedTotalInterest: Math.round(estimatedTotalInterest * 100) / 100
        },
        distributions
    };
};

/**
 * Calculate Cooperative Annual Dividend & Patronage Refund Distribution.
 * @param {Object} params - Distribution parameters
 * @returns {Object} Simulation & summary breakdown
 */
export const calculateCoopDividendDistribution = ({
    allocatedProfit = 0,
    dividendShareRate = 0,
    patronageFormulaType = 'dry_rubber', // 'dry_rubber' or 'sales_amount'
    patronageRefundRate = 0,
    reservePct = 10,
    welfarePct = 5,
    boardBonusPct = 5,
    members = []
}) => {
    const profit = Math.max(0, Number(allocatedProfit) || 0);
    const reserveAmount = Math.round((profit * (Number(reservePct) || 0)) / 100);
    const welfareAmount = Math.round((profit * (Number(welfarePct) || 0)) / 100);
    const boardBonusAmount = Math.round((profit * (Number(boardBonusPct) || 0)) / 100);

    const remainingForMembers = Math.max(0, profit - reserveAmount - welfareAmount - boardBonusAmount);

    let totalShareDividend = 0;
    let totalPatronageRefund = 0;

    const distributions = members.map(m => {
        const shareAmount = Number(m.shareAmount || 0);
        const dryRubberKg = Number(m.totalDryRubberKg || 0);
        const salesAmount = Number(m.totalSalesAmount || 0);

        // Share Dividend calculation
        const shareDividend = Math.round((shareAmount * (Number(dividendShareRate) || 0)) / 100);

        // Patronage Refund calculation
        let patronageRefund = 0;
        if (patronageFormulaType === 'dry_rubber') {
            patronageRefund = Math.round(dryRubberKg * (Number(patronageRefundRate) || 0));
        } else if (patronageFormulaType === 'sales_amount') {
            patronageRefund = Math.round((salesAmount * (Number(patronageRefundRate) || 0)) / 100);
        }

        const totalPayout = shareDividend + patronageRefund;
        totalShareDividend += shareDividend;
        totalPatronageRefund += patronageRefund;

        return {
            memberId: m.id,
            memberName: m.name,
            memberNo: m.memberNo,
            shareAmount,
            dryRubberKg,
            salesAmount,
            shareDividend,
            patronageRefund,
            totalPayout
        };
    });

    return {
        summary: {
            allocatedProfit: profit,
            reserveAmount,
            welfareAmount,
            boardBonusAmount,
            remainingForMembers,
            totalShareDividend,
            totalPatronageRefund,
            totalMemberPayout: totalShareDividend + totalPatronageRefund
        },
        distributions
    };
};
