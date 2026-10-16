import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const url = new URL(context.request.url);
        const memberId = url.searchParams.get('memberId');
        const status = url.searchParams.get('status') || 'active';

        // 1. Auto-create default first account ("ออมทรัพย์สัจจะทั่วไป") for any member who has none (in a single bulk statement)
        await context.env.DB.prepare(`
            INSERT INTO savings_accounts (
                id, memberId, accountNo, accountName, accountType, balance,
                status, openedDate, userId
            )
            SELECT 
                'ACC-INIT-' || lower(hex(randomblob(16))),
                cm.id,
                'SA-' || cm.memberNo || '-01',
                'ออมทรัพย์สัจจะทั่วไป',
                'savings',
                COALESCE(cm.savingsBalance, 0),
                'active',
                COALESCE(cm.joinedDate, date('now')),
                cm.userId
            FROM coop_members cm
            LEFT JOIN savings_accounts sa ON cm.id = sa.memberId AND cm.userId = sa.userId
            WHERE cm.userId = ? AND sa.id IS NULL
        `).bind(context.user.storeId).run().catch(e => console.warn('[Auto-create savings_accounts]', e.message));

        // 2. Query accounts
        let query = `
            SELECT sa.*, cm.name as memberName, cm.memberNo, cm.phone as memberPhone
            FROM savings_accounts sa
            JOIN coop_members cm ON sa.memberId = cm.id
            WHERE sa.userId = ?
        `;
        const params = [context.user.storeId];

        if (memberId) {
            query += ` AND sa.memberId = ?`;
            params.push(memberId);
        }

        if (status && status !== 'all') {
            query += ` AND sa.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY cm.memberNo ASC, sa.accountNo ASC`;

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
            accountName = 'ออมทรัพย์สัจจะทั่วไป',
            accountType = 'savings',
            initialDeposit = 0,
            openedDate = new Date().toISOString().split('T')[0],
            customAccountNo = '',
            note = ''
        } = payload;

        if (!memberId) return errorResponse("กรุณาระบุรหัสสมาชิก");

        // Fetch Member
        const member = await context.env.DB.prepare(
            "SELECT id, memberNo, name, savingsBalance FROM coop_members WHERE id = ? AND userId = ?"
        ).bind(memberId, context.user.storeId).first();

        if (!member) return errorResponse("ไม่พบข้อมูลสมาชิกในระบบ");

        // Generate Account No if not specified
        let accountNo = customAccountNo?.trim();
        if (!accountNo) {
            const countRes = await context.env.DB.prepare(
                "SELECT COUNT(*) as count FROM savings_accounts WHERE memberId = ? AND userId = ?"
            ).bind(memberId, context.user.storeId).first();
            const nextSeq = (countRes?.count || 0) + 1;
            accountNo = `SA-${member.memberNo}-${String(nextSeq).padStart(2, '0')}`;
        }

        const depositAmt = parseFloat(initialDeposit) || 0;

        // 1. Insert Savings Account
        await context.env.DB.prepare(`
            INSERT INTO savings_accounts (
                id, memberId, accountNo, accountName, accountType, balance,
                status, openedDate, userId
            ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
        `).bind(
            id, memberId, accountNo, accountName.trim(), accountType,
            depositAmt, openedDate, context.user.storeId
        ).run();

        // 2. If initial deposit > 0, insert transaction and update member's total savingsBalance
        if (depositAmt > 0) {
            const txId = 'TX-OPEN-' + crypto.randomUUID();
            const recordedBy = context.user.username || context.user.email || 'Admin';

            await context.env.DB.prepare(`
                INSERT INTO savings_transactions (
                    id, accountId, memberId, accountNo, date, type, amount, balanceAfter,
                    paymentMethod, note, recordedBy, userId
                ) VALUES (?, ?, ?, ?, ?, 'deposit', ?, ?, 'cash', ?, ?, ?)
            `).bind(
                txId, id, memberId, accountNo, openedDate, depositAmt, depositAmt,
                note || 'เงินฝากแรกเข้าตอนเปิดบัญชี', recordedBy, context.user.storeId
            ).run();

            // Recalculate member total balance
            const newTotalBalance = Number(member.savingsBalance || 0) + depositAmt;
            await context.env.DB.prepare(
                "UPDATE coop_members SET savingsBalance = ? WHERE id = ? AND userId = ?"
            ).bind(newTotalBalance, memberId, context.user.storeId).run();
        }

        return jsonResponse({
            status: 'success',
            id,
            accountNo,
            accountName,
            balance: depositAmt,
            memberName: member.name
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);

async function handleDelete(context) {
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        if (!id) return errorResponse("Missing Account ID");

        const acc = await context.env.DB.prepare(
            "SELECT * FROM savings_accounts WHERE id = ? AND userId = ?"
        ).bind(id, context.user.storeId).first();

        if (!acc) return errorResponse("ไม่พบบัญชีเงินฝากที่ต้องการปิด");

        if (Number(acc.balance || 0) > 0) {
            return errorResponse(`ไม่สามารถปิดบัญชีได้เนื่องจากมียอดเงินคงเหลือ ${acc.balance} บาท กรุณาถอนเงินออกให้หมดก่อน`);
        }

        // Delete account and any associated transactions
        await context.env.DB.prepare(
            "DELETE FROM savings_accounts WHERE id = ? AND userId = ?"
        ).bind(id, context.user.storeId).run();

        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
