import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const url = new URL(context.request.url);
        const memberId = url.searchParams.get('memberId');

        // Auto-heal / backfill: insert missing share_transactions in a single bulk query
        await context.env.DB.prepare(`
            INSERT INTO share_transactions (
                id, memberId, date, type, shares, pricePerShare, totalAmount,
                paymentMethod, note, userId
            )
            SELECT 
                'TX-INIT-' || lower(hex(randomblob(16))),
                cm.id,
                COALESCE(cm.joinedDate, date('now')),
                'buy',
                COALESCE(cm.totalShares, 0),
                CASE WHEN COALESCE(cm.totalShares, 0) > 0 THEN (COALESCE(cm.shareValue, 0) / cm.totalShares) ELSE 100 END,
                COALESCE(cm.shareValue, 0),
                'cash',
                'หุ้นแรกเข้าเมื่อสมัครสมาชิก',
                cm.userId
            FROM coop_members cm
            LEFT JOIN share_transactions st ON cm.id = st.memberId AND cm.userId = st.userId
            WHERE cm.userId = ? AND cm.totalShares > 0 AND st.id IS NULL
        `).bind(context.user.storeId).run().catch(e => console.warn('[Auto-create share_transactions]', e.message));

        let query = `
            SELECT st.*, cm.name as memberName, cm.memberNo
            FROM share_transactions st
            JOIN coop_members cm ON st.memberId = cm.id
            WHERE st.userId = ?
        `;
        const params = [context.user.storeId];

        if (memberId) {
            query += ` AND st.memberId = ?`;
            params.push(memberId);
        }

        query += ` ORDER BY st.date DESC, st.created_at DESC`;

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
        const payload = body.payload || body;
        const id = payload.id || crypto.randomUUID();
        const {
            memberId,
            date = new Date().toISOString().split('T')[0],
            type = 'buy', // 'buy', 'redeem', 'transfer', 'dividend_reinvest'
            shares = 0,
            pricePerShare = 100,
            totalAmount = 0,
            paymentMethod = 'cash',
            receiptUrl = '',
            note = ''
        } = payload;

        if (!memberId) return errorResponse("Missing memberId");
        const numShares = parseInt(shares) || 0;
        const pps = Number(pricePerShare) || 100;
        const total = Number(totalAmount) || (numShares * pps);

        // 1. Insert share transaction
        await context.env.DB.prepare(`
            INSERT INTO share_transactions (
                id, memberId, date, type, shares, pricePerShare, totalAmount,
                paymentMethod, receiptUrl, note, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                date = excluded.date,
                type = excluded.type,
                shares = excluded.shares,
                pricePerShare = excluded.pricePerShare,
                totalAmount = excluded.totalAmount,
                paymentMethod = excluded.paymentMethod,
                receiptUrl = excluded.receiptUrl,
                note = excluded.note
        `).bind(
            id, memberId, date, type, numShares, pps, total,
            paymentMethod, receiptUrl, note, context.user.storeId
        ).run();

        // 2. Recalculate member totalShares & shareValue
        const { results: allTx } = await context.env.DB.prepare(`
            SELECT type, shares, pricePerShare, totalAmount 
            FROM share_transactions 
            WHERE memberId = ? AND userId = ?
        `).bind(memberId, context.user.storeId).all();

        let netShares = 0;
        let netValue = 0;
        for (const tx of (allTx || [])) {
            if (tx.type === 'buy' || tx.type === 'dividend_reinvest') {
                netShares += Number(tx.shares || 0);
                netValue += Number(tx.totalAmount || 0);
            } else if (tx.type === 'redeem') {
                netShares -= Number(tx.shares || 0);
                netValue -= Number(tx.totalAmount || 0);
            }
        }
        netShares = Math.max(0, netShares);
        netValue = Math.max(0, netValue);

        await context.env.DB.prepare(`
            UPDATE coop_members 
            SET totalShares = ?, shareValue = ? 
            WHERE id = ? AND userId = ?
        `).bind(netShares, netValue, memberId, context.user.storeId).run();

        return jsonResponse({ status: 'success', id, netShares, netValue });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);

async function handleDelete(context) {
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        if (!id) return errorResponse("Missing Transaction ID");

        // Fetch transaction to know memberId before deleting
        const tx = await context.env.DB.prepare(
            "SELECT memberId FROM share_transactions WHERE id = ? AND userId = ?"
        ).bind(id, context.user.storeId).first();

        if (tx) {
            await context.env.DB.prepare(
                "DELETE FROM share_transactions WHERE id = ? AND userId = ?"
            ).bind(id, context.user.storeId).run();

            // Recalculate
            const { results: allTx } = await context.env.DB.prepare(`
                SELECT type, shares, totalAmount 
                FROM share_transactions 
                WHERE memberId = ? AND userId = ?
            `).bind(tx.memberId, context.user.storeId).all();

            let netShares = 0;
            let netValue = 0;
            for (const t of (allTx || [])) {
                if (t.type === 'buy' || t.type === 'dividend_reinvest') {
                    netShares += Number(t.shares || 0);
                    netValue += Number(t.totalAmount || 0);
                } else if (t.type === 'redeem') {
                    netShares -= Number(t.shares || 0);
                    netValue -= Number(t.totalAmount || 0);
                }
            }
            await context.env.DB.prepare(`
                UPDATE coop_members 
                SET totalShares = ?, shareValue = ? 
                WHERE id = ? AND userId = ?
            `).bind(Math.max(0, netShares), Math.max(0, netValue), tx.memberId, context.user.storeId).run();
        }

        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
