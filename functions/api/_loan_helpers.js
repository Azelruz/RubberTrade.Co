export async function refundLoanDeductions(db, buyId, storeId) {
    // 1. Fetch all deductions for this buy bill
    const { results: deductions } = await db.prepare(
        "SELECT * FROM loan_deductions WHERE userId = ? AND buyId = ?"
    ).bind(storeId, buyId).all();

    if (!deductions || deductions.length === 0) return;

    for (const ded of deductions) {
        const { borrowerId, amount: refundAmt } = ded;
        if (!refundAmt || refundAmt <= 0) continue;

        // 2. Fetch all loans for this borrower ordered by date/created_at DESC (LIFO refund)
        // Find loans where remainingAmount < amount
        const { results: loans } = await db.prepare(
            "SELECT * FROM loans WHERE userId = ? AND borrowerId = ? AND remainingAmount < amount ORDER BY date DESC, created_at DESC"
        ).bind(storeId, borrowerId).all();

        let remainingToRefund = refundAmt;
        for (const loan of loans) {
            if (remainingToRefund <= 0) break;

            const maxRefundable = loan.amount - loan.remainingAmount;
            if (maxRefundable <= 0) continue;

            let refundToThisLoan = 0;
            if (maxRefundable >= remainingToRefund) {
                refundToThisLoan = remainingToRefund;
                remainingToRefund = 0;
            } else {
                refundToThisLoan = maxRefundable;
                remainingToRefund -= maxRefundable;
            }

            await db.prepare(
                "UPDATE loans SET remainingAmount = remainingAmount + ? WHERE id = ?"
            ).bind(refundToThisLoan, loan.id).run();
        }
    }

    // 3. Delete deduction records
    await db.prepare(
        "DELETE FROM loan_deductions WHERE userId = ? AND buyId = ?"
    ).bind(storeId, buyId).run();
}
