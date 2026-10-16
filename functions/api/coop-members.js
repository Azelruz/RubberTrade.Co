import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function handleGet(context) {
    try {
        const url = new URL(context.request.url);
        const search = url.searchParams.get('search');
        const status = url.searchParams.get('status');
        const orgPosition = url.searchParams.get('orgPosition');

        let query = `
            SELECT cm.*, f.address as farmerAddress, f.phone as farmerPhone
            FROM coop_members cm
            LEFT JOIN farmers f ON cm.farmerId = f.id
            WHERE cm.userId = ?
        `;
        const params = [context.user.storeId];

        if (status) {
            query += ` AND cm.status = ?`;
            params.push(status);
        }

        if (orgPosition) {
            query += ` AND cm.orgPosition = ?`;
            params.push(orgPosition);
        }

        if (search) {
            query += ` AND (cm.name LIKE ? OR cm.memberNo LIKE ? OR cm.phone LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s);
        }

        query += ` ORDER BY 
            CASE 
                WHEN cm.orgPosition = 'chairman' THEN 1
                WHEN cm.orgPosition = 'vice_chairman' THEN 2
                WHEN cm.orgPosition = 'treasurer' THEN 3
                WHEN cm.orgPosition = 'secretary' THEN 4
                WHEN cm.orgPosition = 'procurement' THEN 5
                WHEN cm.orgPosition = 'auditor' THEN 6
                WHEN cm.orgPosition = 'advisor' THEN 7
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
        let payloads = [];
        if (body.action === 'bulk' && Array.isArray(body.payloads)) {
            payloads = body.payloads;
        } else {
            payloads = [body.payload || body];
        }

        for (const payload of payloads) {
            const id = payload.id || crypto.randomUUID();
            const {
                memberNo,
                farmerId = null,
                name,
                phone = '',
                idCard = '',
                bankAccount = '',
                bankName = '',
                address = '',
                orgPosition = 'member',
                positionAllowance = 0,
                totalShares = 0,
                shareValue = 0,
                status = 'active',
                joinedDate = new Date().toISOString().split('T')[0]
            } = payload;

            if (!name) return errorResponse("Missing member name");

            // Check if member already exists
            const existingMember = await context.env.DB.prepare(
                "SELECT id, totalShares, shareValue FROM coop_members WHERE id = ? AND userId = ?"
            ).bind(id, context.user.storeId).first();

            // Auto-generate memberNo with station_code if not provided
            let finalMemberNo = memberNo;
            if (!finalMemberNo) {
                const stationSetting = await context.env.DB.prepare(
                    "SELECT value FROM settings WHERE key = 'station_code' AND userId = ?"
                ).bind(context.user.storeId).first();
                const stationCode = stationSetting?.value ? stationSetting.value.trim().toUpperCase() : '';

                const countRes = await context.env.DB.prepare(
                    "SELECT COUNT(*) as count FROM coop_members WHERE userId = ?"
                ).bind(context.user.storeId).first();
                const nextNo = (countRes?.count || 0) + 1;
                const prefix = stationCode ? `${stationCode}-MB` : 'MB';
                finalMemberNo = `${prefix}-${String(nextNo).padStart(3, '0')}`;
            }

            await context.env.DB.prepare(`
                INSERT INTO coop_members (
                    id, memberNo, farmerId, name, phone, idCard, bankAccount, bankName,
                    address, orgPosition, positionAllowance, totalShares, shareValue,
                    status, joinedDate, userId
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    memberNo = excluded.memberNo,
                    farmerId = excluded.farmerId,
                    name = excluded.name,
                    phone = excluded.phone,
                    idCard = excluded.idCard,
                    bankAccount = excluded.bankAccount,
                    bankName = excluded.bankName,
                    address = excluded.address,
                    orgPosition = excluded.orgPosition,
                    positionAllowance = excluded.positionAllowance,
                    totalShares = excluded.totalShares,
                    shareValue = excluded.shareValue,
                    status = excluded.status,
                    joinedDate = excluded.joinedDate
            `).bind(
                id, finalMemberNo, farmerId || null, name, phone, idCard, bankAccount, bankName,
                address, orgPosition, Number(positionAllowance) || 0, Number(totalShares) || 0,
                Number(shareValue) || 0, status, joinedDate, context.user.storeId
            ).run();

            // If creating a NEW member with initial shares > 0, auto-create initial share transaction!
            if (!existingMember && Number(totalShares) > 0) {
                const txId = 'TX-INIT-' + crypto.randomUUID();
                const pps = Number(totalShares) > 0 ? (Number(shareValue) / Number(totalShares)) : 100;
                await context.env.DB.prepare(`
                    INSERT INTO share_transactions (
                        id, memberId, date, type, shares, pricePerShare, totalAmount,
                        paymentMethod, note, userId
                    ) VALUES (?, ?, ?, 'buy', ?, ?, ?, 'cash', 'หุ้นแรกเข้าเมื่อสมัครสมาชิก', ?)
                `).bind(
                    txId, id, joinedDate, Number(totalShares), pps, Number(shareValue), context.user.storeId
                ).run();
            }

            // Auto-create initial savings account ("ออมทรัพย์สัจจะทั่วไป") for new members
            if (!existingMember) {
                const accId = 'ACC-INIT-' + crypto.randomUUID();
                const accNo = `SA-${finalMemberNo}-01`;
                await context.env.DB.prepare(`
                    INSERT INTO savings_accounts (
                        id, memberId, accountNo, accountName, accountType, balance,
                        status, openedDate, userId
                    ) VALUES (?, ?, ?, 'ออมทรัพย์สัจจะทั่วไป', 'savings', 0, 'active', ?, ?)
                `).bind(accId, id, accNo, joinedDate, context.user.storeId).run();
            }
        }

        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);
export const onRequestPatch = withAuth(handlePost);

async function handleDelete(context) {
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        if (!id) return errorResponse("Missing Member ID");

        await context.env.DB.prepare(
            "DELETE FROM coop_members WHERE id = ? AND userId = ?"
        ).bind(id, context.user.storeId).run();

        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
