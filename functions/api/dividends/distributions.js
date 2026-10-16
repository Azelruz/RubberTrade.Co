import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

async function handleGet(context) {
    try {
        const url = new URL(context.request.url);
        const periodId = url.searchParams.get('periodId');
        const memberId = url.searchParams.get('memberId');

        let query = `
            SELECT dd.*, cm.memberNo, cm.phone as memberPhone, cm.bankAccount as memberBankAcc, cm.bankName as memberBankName
            FROM dividend_distributions dd
            JOIN coop_members cm ON dd.memberId = cm.id
            WHERE dd.userId = ?
        `;
        const params = [context.user.storeId];

        if (periodId) {
            query += ` AND dd.periodId = ?`;
            params.push(periodId);
        }

        if (memberId) {
            query += ` AND dd.memberId = ?`;
            params.push(memberId);
        }

        query += ` ORDER BY 
            CASE 
                WHEN dd.orgPosition = 'chairman' THEN 1
                WHEN dd.orgPosition = 'vice_chairman' THEN 2
                WHEN dd.orgPosition = 'treasurer' THEN 3
                WHEN dd.orgPosition = 'secretary' THEN 4
                WHEN dd.orgPosition = 'procurement' THEN 5
                WHEN dd.orgPosition = 'auditor' THEN 6
                WHEN dd.orgPosition = 'advisor' THEN 7
                ELSE 8
            END,
            cm.memberNo ASC`;

        const { results } = await context.env.DB.prepare(query).bind(...params).all();
        return jsonResponse(results || []);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        const storeId = context.user.storeId;
        const { periodId, distributions } = body;

        if (!periodId || !Array.isArray(distributions)) {
            return errorResponse("Missing periodId or distributions array");
        }

        // Save distributions in batch
        const stmts = [];
        for (const d of distributions) {
            const id = d.id || crypto.randomUUID();
            stmts.push(context.env.DB.prepare(`
                INSERT INTO dividend_distributions (
                    id, periodId, memberId, farmerId, memberName, orgPosition,
                    shareCount, shareValue, dividendShareAmount,
                    businessVolumeKg, businessDryRubberKg, businessTotalAmount,
                    patronageRefundAmount, boardBonusAmount, grossPayout,
                    deductedLoanAmount, netPayout, payoutStatus, paidDate,
                    payoutMethod, receiptUrl, note, userId
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    dividendShareAmount = excluded.dividendShareAmount,
                    businessVolumeKg = excluded.businessVolumeKg,
                    businessDryRubberKg = excluded.businessDryRubberKg,
                    businessTotalAmount = excluded.businessTotalAmount,
                    patronageRefundAmount = excluded.patronageRefundAmount,
                    boardBonusAmount = excluded.boardBonusAmount,
                    grossPayout = excluded.grossPayout,
                    deductedLoanAmount = excluded.deductedLoanAmount,
                    netPayout = excluded.netPayout,
                    payoutStatus = excluded.payoutStatus,
                    paidDate = excluded.paidDate,
                    payoutMethod = excluded.payoutMethod,
                    note = excluded.note
            `).bind(
                id, periodId, d.memberId, d.farmerId || null, d.memberName, d.orgPosition || 'member',
                Number(d.shareCount) || 0, Number(d.shareValue) || 0, Number(d.dividendShareAmount) || 0,
                Number(d.businessVolumeKg) || 0, Number(d.businessDryRubberKg) || 0, Number(d.businessTotalAmount) || 0,
                Number(d.patronageRefundAmount) || 0, Number(d.boardBonusAmount) || 0, Number(d.grossPayout) || 0,
                Number(d.deductedLoanAmount) || 0, Number(d.netPayout) || 0, d.payoutStatus || 'pending',
                d.paidDate || null, d.payoutMethod || null, d.receiptUrl || null, d.note || null, storeId
            ));
        }

        if (stmts.length > 0) {
            await context.env.DB.batch(stmts);
        }

        return jsonResponse({ status: 'success', count: stmts.length });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);

async function handlePatch(context) {
    try {
        const body = await context.request.json();
        const payload = body.payload || body;
        const storeId = context.user.storeId;
        const { id, boardBonusAmount, payoutStatus, payoutMethod, paidDate, deductedLoanAmount, note } = payload;

        if (!id) return errorResponse("Missing distribution ID");

        // Fetch current distribution record
        const dist = await context.env.DB.prepare(
            "SELECT * FROM dividend_distributions WHERE id = ? AND userId = ?"
        ).bind(id, storeId).first();

        if (!dist) return errorResponse("Distribution record not found");

        const updatedBoardBonus = boardBonusAmount !== undefined ? Number(boardBonusAmount) : dist.boardBonusAmount;
        const updatedGrossPayout = dist.dividendShareAmount + dist.patronageRefundAmount + updatedBoardBonus;
        const updatedDeductedLoan = deductedLoanAmount !== undefined ? Number(deductedLoanAmount) : dist.deductedLoanAmount;
        const updatedNetPayout = Math.max(0, updatedGrossPayout - updatedDeductedLoan);
        const updatedStatus = payoutStatus || dist.payoutStatus;
        const updatedMethod = payoutMethod || dist.payoutMethod || 'transfer';
        const updatedPaidDate = paidDate || (updatedStatus === 'paid' ? new Date().toISOString().split('T')[0] : dist.paidDate);

        // If status changes to 'paid' and there is deducted loan amount
        if (updatedStatus === 'paid' && dist.payoutStatus !== 'paid' && updatedDeductedLoan > 0 && dist.farmerId) {
            const borrowerId = dist.farmerId;
            let remainingDeduct = updatedDeductedLoan;

            // Fetch borrower loans ordered by date ASC (FIFO payoff)
            const { results: loans } = await context.env.DB.prepare(
                "SELECT * FROM loans WHERE userId = ? AND borrowerId = ? AND remainingAmount > 0 ORDER BY date ASC, created_at ASC"
            ).bind(storeId, borrowerId).all();

            for (const loan of (loans || [])) {
                if (remainingDeduct <= 0) break;
                const deductAmt = Math.min(remainingDeduct, loan.remainingAmount);
                const remainingDebtAfter = loan.remainingAmount - deductAmt;

                await context.env.DB.prepare(
                    "UPDATE loans SET remainingAmount = ? WHERE id = ?"
                ).bind(remainingDebtAfter, loan.id).run();

                // Insert loan deduction audit record
                const dedId = 'DED-DIV-' + crypto.randomUUID().substring(0, 8);
                const fakeBuyId = `DIV-${dist.periodId}-${dist.memberId}`;
                await context.env.DB.prepare(`
                    INSERT INTO loan_deductions (id, buyId, borrowerType, borrowerId, amount, remainingDebtAfter, userId)
                    VALUES (?, ?, 'farmer', ?, ?, ?, ?)
                `).bind(dedId, fakeBuyId, borrowerId, deductAmt, remainingDebtAfter, storeId).run();

                remainingDeduct -= deductAmt;
            }
        }

        // If payout method is 'reinvest_share' and status becomes 'paid' or 'reinvested'
        if ((updatedStatus === 'paid' || updatedStatus === 'reinvested') && updatedMethod === 'reinvest_share' && dist.payoutStatus === 'pending') {
            const reinvestAmount = updatedNetPayout;
            if (reinvestAmount > 0) {
                // Fetch member to get par value
                const member = await context.env.DB.prepare(
                    "SELECT * FROM coop_members WHERE id = ? AND userId = ?"
                ).bind(dist.memberId, storeId).first();

                const parValue = 100; // default 100 baht per share
                const newShares = Math.floor(reinvestAmount / parValue);
                const actualReinvestValue = newShares * parValue;

                if (newShares > 0) {
                    const txId = 'TX-REINVEST-' + crypto.randomUUID().substring(0, 8);
                    await context.env.DB.prepare(`
                        INSERT INTO share_transactions (
                            id, memberId, date, type, shares, pricePerShare, totalAmount,
                            paymentMethod, receiptUrl, note, userId
                        ) VALUES (?, ?, ?, 'dividend_reinvest', ?, ?, ?, 'dividend_offset', null, ?, ?)
                    `).bind(
                        txId, dist.memberId, updatedPaidDate || new Date().toISOString().split('T')[0],
                        newShares, parValue, actualReinvestValue,
                        `ทบยอดปันผลรอบ ${dist.periodId} เป็นทุนเรือนหุ้น`, storeId
                    ).run();

                    await context.env.DB.prepare(`
                        UPDATE coop_members 
                        SET totalShares = totalShares + ?, shareValue = shareValue + ? 
                        WHERE id = ? AND userId = ?"
                    `).bind(newShares, actualReinvestValue, dist.memberId, storeId).run();
                }
            }
        }

        // Update distribution record
        await context.env.DB.prepare(`
            UPDATE dividend_distributions SET
                boardBonusAmount = ?,
                grossPayout = ?,
                deductedLoanAmount = ?,
                netPayout = ?,
                payoutStatus = ?,
                payoutMethod = ?,
                paidDate = ?,
                note = ?
            WHERE id = ? AND userId = ?
        `).bind(
            updatedBoardBonus, updatedGrossPayout, updatedDeductedLoan,
            updatedNetPayout, updatedStatus, updatedMethod, updatedPaidDate,
            note || dist.note, id, storeId
        ).run();

        return jsonResponse({
            status: 'success',
            grossPayout: updatedGrossPayout,
            netPayout: updatedNetPayout,
            payoutStatus: updatedStatus
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPatch = withAuth(handlePatch);
