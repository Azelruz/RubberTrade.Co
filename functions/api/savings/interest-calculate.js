import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const {
            ratePerYear = 2.0, // Annual interest rate in %
            periodMonths = 12, // 12 for annual, 6 for semi-annual
            asOfDate = new Date().toISOString().split('T')[0]
        } = body;

        const rate = parseFloat(ratePerYear);
        if (isNaN(rate) || rate <= 0) {
            return errorResponse("อัตราดอกเบี้ยต่อปีต้องมากกว่า 0%");
        }

        const months = parseInt(periodMonths) || 12;
        const timeFraction = months / 12;

        // Fetch all active accounts with balance > 0
        const { results: accounts } = await context.env.DB.prepare(`
            SELECT sa.id as accountId, sa.accountNo, sa.accountName, sa.balance,
                   cm.id as memberId, cm.memberNo, cm.name as memberName, cm.phone
            FROM savings_accounts sa
            JOIN coop_members cm ON sa.memberId = cm.id
            WHERE sa.userId = ? AND sa.status = 'active' AND sa.balance > 0 AND cm.status = 'active'
            ORDER BY cm.memberNo ASC, sa.accountNo ASC
        `).bind(context.user.storeId).all();

        let totalEligibleAccounts = 0;
        let totalSavingsPrincipal = 0;
        let estimatedTotalInterest = 0;

        const distributions = [];

        for (const acc of (accounts || [])) {
            const principal = Number(acc.balance || 0);
            if (principal <= 0) continue;

            const rawInterest = principal * (rate / 100) * timeFraction;
            const interest = Math.round(rawInterest * 100) / 100;

            if (interest > 0) {
                totalEligibleAccounts++;
                totalSavingsPrincipal += principal;
                estimatedTotalInterest += interest;

                distributions.push({
                    accountId: acc.accountId,
                    accountNo: acc.accountNo,
                    accountName: acc.accountName,
                    memberId: acc.memberId,
                    memberNo: acc.memberNo,
                    memberName: acc.memberName,
                    phone: acc.phone,
                    currentBalance: principal,
                    interestRate: rate,
                    periodMonths: months,
                    interestAmount: interest,
                    newBalance: Math.round((principal + interest) * 100) / 100
                });
            }
        }

        totalSavingsPrincipal = Math.round(totalSavingsPrincipal * 100) / 100;
        estimatedTotalInterest = Math.round(estimatedTotalInterest * 100) / 100;

        return jsonResponse({
            status: 'success',
            asOfDate,
            ratePerYear: rate,
            periodMonths: months,
            summary: {
                totalEligibleMembers: new Set(distributions.map(d => d.memberId)).size,
                totalEligibleAccounts,
                totalSavingsPrincipal,
                estimatedTotalInterest
            },
            distributions
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
