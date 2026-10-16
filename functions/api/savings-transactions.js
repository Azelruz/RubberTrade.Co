import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const url = new URL(context.request.url);
        const memberId = url.searchParams.get('memberId');
        const accountId = url.searchParams.get('accountId');
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const type = url.searchParams.get('type');

        let query = `
            SELECT st.*, 
                   cm.name as memberName, 
                   cm.memberNo, 
                   cm.phone as memberPhone, 
                   cm.savingsBalance as currentSavingsBalance,
                   COALESCE(sa.accountName, 'ออมทรัพย์สัจจะทั่วไป') as accountName
            FROM savings_transactions st
            JOIN coop_members cm ON st.memberId = cm.id
            LEFT JOIN savings_accounts sa ON st.accountId = sa.id
            WHERE st.userId = ?
        `;
        const params = [context.user.storeId];

        if (memberId) {
            query += ` AND st.memberId = ?`;
            params.push(memberId);
        }

        if (accountId) {
            query += ` AND st.accountId = ?`;
            params.push(accountId);
        }

        if (startDate) {
            query += ` AND st.date >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            query += ` AND st.date <= ?`;
            params.push(endDate);
        }

        if (type && type !== 'all') {
            query += ` AND st.type = ?`;
            params.push(type);
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

        // 1. Case: Batch Interest Distribution
        if (body.action === 'bulk_interest' && Array.isArray(body.distributions)) {
            const { distributions, date = new Date().toISOString().split('T')[0], note = 'ดอกเบี้ยเงินฝากสะสม' } = body;
            const recordedBy = context.user.username || context.user.email || 'Admin';

            let creditedCount = 0;
            for (const item of distributions) {
                const interestAmount = Number(item.interestAmount || 0);
                if (interestAmount <= 0 || !item.memberId) continue;

                // Find target account (either item.accountId or member's primary account)
                let account = null;
                if (item.accountId) {
                    account = await context.env.DB.prepare(
                        "SELECT * FROM savings_accounts WHERE id = ? AND userId = ?"
                    ).bind(item.accountId, context.user.storeId).first();
                } else {
                    account = await context.env.DB.prepare(
                        "SELECT * FROM savings_accounts WHERE memberId = ? AND userId = ? AND status = 'active' ORDER BY accountNo ASC LIMIT 1"
                    ).bind(item.memberId, context.user.storeId).first();
                }

                if (!account) continue;

                const currentAccBal = Number(account.balance || 0);
                const newAccBal = Math.round((currentAccBal + interestAmount) * 100) / 100;
                const txId = item.id || 'TX-INT-' + crypto.randomUUID();

                await context.env.DB.prepare(`
                    INSERT INTO savings_transactions (
                        id, accountId, memberId, accountNo, date, type, amount, balanceAfter,
                        paymentMethod, note, recordedBy, userId
                    ) VALUES (?, ?, ?, ?, ?, 'interest', ?, ?, 'transfer', ?, ?, ?)
                `).bind(
                    txId, account.id, item.memberId, account.accountNo, date, interestAmount, newAccBal,
                    item.note || note, recordedBy, context.user.storeId
                ).run();

                // Update account balance
                await context.env.DB.prepare(
                    "UPDATE savings_accounts SET balance = ? WHERE id = ? AND userId = ?"
                ).bind(newAccBal, account.id, context.user.storeId).run();

                // Update member's total savingsBalance across all accounts
                await context.env.DB.prepare(`
                    UPDATE coop_members 
                    SET savingsBalance = (
                        SELECT COALESCE(SUM(balance), 0) FROM savings_accounts WHERE memberId = ? AND userId = ? AND status = 'active'
                    )
                    WHERE id = ? AND userId = ?
                `).bind(item.memberId, context.user.storeId, item.memberId, context.user.storeId).run();

                creditedCount++;
            }

            return jsonResponse({ status: 'success', creditedCount });
        }

        // 2. Case: Single Deposit / Withdrawal / Interest
        const payload = body.payload || body;
        const id = payload.id || crypto.randomUUID();
        const {
            memberId,
            accountId,
            date = new Date().toISOString().split('T')[0],
            type = 'deposit', // 'deposit', 'withdraw', 'interest'
            amount = 0,
            paymentMethod = 'cash',
            receiptUrl = '',
            note = ''
        } = payload;

        if (!memberId) return errorResponse("กรุณาระบุรหัสสมาชิก");
        const txAmount = parseFloat(amount);
        if (isNaN(txAmount) || txAmount <= 0) return errorResponse("จำนวนเงินต้องมากกว่า 0 บาท");

        // Fetch Member
        const member = await context.env.DB.prepare(
            "SELECT id, name, memberNo, savingsBalance FROM coop_members WHERE id = ? AND userId = ?"
        ).bind(memberId, context.user.storeId).first();

        if (!member) return errorResponse("ไม่พบข้อมูลสมาชิกในระบบ");

        // Fetch Target Account (or find/create default account)
        let account = null;
        if (accountId) {
            account = await context.env.DB.prepare(
                "SELECT * FROM savings_accounts WHERE id = ? AND userId = ?"
            ).bind(accountId, context.user.storeId).first();
        } else {
            account = await context.env.DB.prepare(
                "SELECT * FROM savings_accounts WHERE memberId = ? AND userId = ? AND status = 'active' ORDER BY accountNo ASC LIMIT 1"
            ).bind(memberId, context.user.storeId).first();
        }

        // If member still has no account, auto-create account 01
        if (!account) {
            const accId = 'ACC-INIT-' + crypto.randomUUID();
            const accNo = `SA-${member.memberNo}-01`;
            await context.env.DB.prepare(`
                INSERT INTO savings_accounts (
                    id, memberId, accountNo, accountName, accountType, balance,
                    status, openedDate, userId
                ) VALUES (?, ?, ?, 'ออมทรัพย์สัจจะทั่วไป', 'savings', 0, 'active', ?, ?)
            `).bind(accId, member.id, accNo, date, context.user.storeId).run();

            account = { id: accId, accountNo: accNo, accountName: 'ออมทรัพย์สัจจะทั่วไป', balance: 0 };
        }

        const currentAccBalance = Number(account.balance || 0);
        let newAccBalance = currentAccBalance;

        if (type === 'withdraw') {
            if (txAmount > currentAccBalance) {
                return errorResponse(`ยอดเงินในบัญชี ${account.accountName} (${account.accountNo}) ไม่พอสำหรับการถอน (ยอดคงเหลือของเล่มนี้: ${currentAccBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท)`);
            }
            newAccBalance = currentAccBalance - txAmount;
        } else if (type === 'deposit' || type === 'interest') {
            newAccBalance = currentAccBalance + txAmount;
        } else {
            return errorResponse("ประเภทธุรกรรมไม่ถูกต้อง");
        }

        newAccBalance = Math.round(newAccBalance * 100) / 100;
        const recordedBy = context.user.username || context.user.email || 'Admin';

        // 1. Insert transaction
        await context.env.DB.prepare(`
            INSERT INTO savings_transactions (
                id, accountId, memberId, accountNo, date, type, amount, balanceAfter,
                paymentMethod, receiptUrl, note, recordedBy, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, account.id, memberId, account.accountNo, date, type, txAmount, newAccBalance,
            paymentMethod, receiptUrl, note.trim(), recordedBy, context.user.storeId
        ).run();

        // 2. Update specific account balance
        await context.env.DB.prepare(
            "UPDATE savings_accounts SET balance = ? WHERE id = ? AND userId = ?"
        ).bind(newAccBalance, account.id, context.user.storeId).run();

        // 3. Update member's total savingsBalance across all active accounts
        const { total: memberTotalRes } = await context.env.DB.prepare(`
            SELECT COALESCE(SUM(balance), 0) as total 
            FROM savings_accounts 
            WHERE memberId = ? AND userId = ? AND status = 'active'
        `).bind(memberId, context.user.storeId).first();

        const memberTotal = Math.round((Number(memberTotalRes) || 0) * 100) / 100;
        await context.env.DB.prepare(
            "UPDATE coop_members SET savingsBalance = ? WHERE id = ? AND userId = ?"
        ).bind(memberTotal, memberId, context.user.storeId).run();

        return jsonResponse({
            status: 'success',
            id,
            type,
            amount: txAmount,
            balanceAfter: newAccBalance,
            accountId: account.id,
            accountNo: account.accountNo,
            accountName: account.accountName,
            memberId,
            memberName: member.name,
            memberTotalSavings: memberTotal
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
        if (!id) return errorResponse("Missing Transaction ID");

        // Fetch transaction to delete
        const tx = await context.env.DB.prepare(
            "SELECT * FROM savings_transactions WHERE id = ? AND userId = ?"
        ).bind(id, context.user.storeId).first();

        if (!tx) return errorResponse("ไม่พบรายการธุรกรรมที่ต้องการลบ");

        // Delete the transaction
        await context.env.DB.prepare(
            "DELETE FROM savings_transactions WHERE id = ? AND userId = ?"
        ).bind(id, context.user.storeId).run();

        // Recalculate specific account balance from remaining transactions
        if (tx.accountId) {
            const { results: remainingAccTx } = await context.env.DB.prepare(`
                SELECT type, amount 
                FROM savings_transactions 
                WHERE accountId = ? AND userId = ?
                ORDER BY date ASC, created_at ASC
            `).bind(tx.accountId, context.user.storeId).all();

            let netAccBalance = 0;
            for (const t of (remainingAccTx || [])) {
                const amt = Number(t.amount || 0);
                if (t.type === 'deposit' || t.type === 'interest') netAccBalance += amt;
                else if (t.type === 'withdraw') netAccBalance -= amt;
            }
            netAccBalance = Math.max(0, Math.round(netAccBalance * 100) / 100);

            await context.env.DB.prepare(
                "UPDATE savings_accounts SET balance = ? WHERE id = ? AND userId = ?"
            ).bind(netAccBalance, tx.accountId, context.user.storeId).run();
        }

        // Recalculate member total balance across all accounts
        const { total: memberTotalRes } = await context.env.DB.prepare(`
            SELECT COALESCE(SUM(balance), 0) as total 
            FROM savings_accounts 
            WHERE memberId = ? AND userId = ? AND status = 'active'
        `).bind(tx.memberId, context.user.storeId).first();

        const memberTotal = Math.round((Number(memberTotalRes) || 0) * 100) / 100;
        await context.env.DB.prepare(
            "UPDATE coop_members SET savingsBalance = ? WHERE id = ? AND userId = ?"
        ).bind(memberTotal, tx.memberId, context.user.storeId).run();

        return jsonResponse({ 
            status: 'success', 
            memberId: tx.memberId, 
            accountId: tx.accountId, 
            newMemberTotal: memberTotal 
        });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
