import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

async function handleGet(context) {
    try {
        const { results } = await context.env.DB.prepare(
            "SELECT * FROM loan_deductions WHERE userId = ? ORDER BY created_at DESC"
        ).bind(context.user.storeId).all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        const body = await context.request.json();
        let payloads = [];
        if (body.action === 'bulk' && Array.isArray(body.payloads)) {
            payloads = body.payloads;
        } else {
            payloads = [body.payload || body];
        }

        for (const payload of payloads) {
            const id = payload.id || crypto.randomUUID();
            const { buyId, borrowerType, borrowerId, amount, remainingDebtAfter } = payload;
            await context.env.DB.prepare(
                `INSERT INTO loan_deductions (id, buyId, borrowerType, borrowerId, amount, remainingDebtAfter, userId)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                    buyId = excluded.buyId,
                    borrowerType = excluded.borrowerType,
                    borrowerId = excluded.borrowerId,
                    amount = excluded.amount,
                    remainingDebtAfter = excluded.remainingDebtAfter`
            ).bind(id, buyId, borrowerType, borrowerId, amount, remainingDebtAfter, context.user.storeId).run();
        }
        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
