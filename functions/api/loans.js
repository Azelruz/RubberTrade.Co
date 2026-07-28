import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const { searchParams } = new URL(context.request.url);
        const borrowerId = searchParams.get('borrowerId');

        if (borrowerId) {
            const { results } = await context.env.DB.prepare(
                "SELECT * FROM loans WHERE userId = ? AND borrowerId = ? ORDER BY date DESC, created_at DESC"
            ).bind(context.user.storeId, borrowerId).all();
            return jsonResponse(results);
        }

        const { results } = await context.env.DB.prepare(
            "SELECT * FROM loans WHERE userId = ? ORDER BY date DESC, created_at DESC"
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
        
        // Accept both single payload and bulk payload formats (for sync hydration support)
        let payloads = [];
        if (body.action === 'bulk' && Array.isArray(body.payloads)) {
            payloads = body.payloads;
        } else {
            payloads = [body.payload || body];
        }

        for (const payload of payloads) {
            const id = payload.id || crypto.randomUUID();
            const {
                borrowerType,
                borrowerId,
                borrowerName,
                date,
                amount,
                note,
                deductionMethod = 'full',
                deductionValue = 0,
                remainingAmount
            } = payload;

            // If remainingAmount is not specified, initialize it as the full amount
            const initialRemaining = remainingAmount !== undefined ? remainingAmount : amount;

            await context.env.DB.prepare(
                `INSERT INTO loans (
                    id, borrowerType, borrowerId, borrowerName, date, amount, remainingAmount, 
                    deductionMethod, deductionValue, note, userId
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    borrowerType = excluded.borrowerType,
                    borrowerId = excluded.borrowerId,
                    borrowerName = excluded.borrowerName,
                    date = excluded.date,
                    amount = excluded.amount,
                    remainingAmount = excluded.remainingAmount,
                    deductionMethod = excluded.deductionMethod,
                    deductionValue = excluded.deductionValue,
                    note = excluded.note`
            ).bind(
                id, borrowerType, borrowerId, borrowerName, date, amount, initialRemaining,
                deductionMethod, deductionValue, note || '', context.user.storeId
            ).run();
        }

        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
