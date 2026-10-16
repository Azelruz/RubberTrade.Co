import { jsonResponse, errorResponse } from '../_utils.js';

export async function onRequestGet(context) {
    try {
        const db = context.env.DB;
        const url = new URL(context.request.url);

        const memberId = url.searchParams.get('id');
        const memberNo = url.searchParams.get('memberNo');
        const cleanId = (memberId || '').trim();
        const cleanNo = (memberNo || '').trim();
        const target = cleanId || cleanNo;

        // 1. Fetch Member (Flexible: match ID, memberNo, phone, or farmerId)
        let member = null;
        if (target) {
            member = await db.prepare(`
                SELECT * FROM coop_members 
                WHERE id = ? 
                   OR memberNo = ? COLLATE NOCASE 
                   OR phone = ?
                   OR farmerId = ? COLLATE NOCASE
                LIMIT 1
            `).bind(target, target, target, target).first();

            // If not found in coop_members, search in farmers table (for regular rubber-selling farmers)
            if (!member) {
                const farmer = await db.prepare(`
                    SELECT * FROM farmers
                    WHERE id = ? COLLATE NOCASE
                       OR phone = ?
                    LIMIT 1
                `).bind(target, target).first();

                if (farmer) {
                    // Check if farmer is linked to a coop_member
                    const linkedMember = await db.prepare(`
                        SELECT * FROM coop_members WHERE farmerId = ? LIMIT 1
                    `).bind(farmer.id).first();

                    if (linkedMember) {
                        member = linkedMember;
                    } else {
                        // Regular Rubber-Selling Farmer (เกษตรกรขายยางทั่วไป)
                        member = {
                            id: farmer.id,
                            memberNo: farmer.id,
                            name: farmer.name,
                            phone: farmer.phone || '',
                            idCard: farmer.fscId || '',
                            bankAccount: farmer.bankAccount || '',
                            bankName: farmer.bankName || '',
                            address: farmer.address || '',
                            orgPosition: 'เกษตรกรขายยาง (ทั่วไป)',
                            joinedDate: farmer.created_at ? farmer.created_at.split(' ')[0] : '',
                            totalShares: 0,
                            shareValue: 0,
                            savingsBalance: 0,
                            farmerId: farmer.id,
                            userId: farmer.userId || null,
                            isFarmerOnly: true
                        };
                    }
                }
            }

            // If not found in farmers, search in employees table (for rubber tappers / workers)
            if (!member) {
                const employee = await db.prepare(`
                    SELECT * FROM employees
                    WHERE id = ? COLLATE NOCASE
                       OR phone = ?
                    LIMIT 1
                `).bind(target, target).first();

                if (employee) {
                    // Check if employee is registered in coop_members
                    let linkedMember = null;
                    if (employee.phone) {
                        linkedMember = await db.prepare(`
                            SELECT * FROM coop_members WHERE phone = ? LIMIT 1
                        `).bind(employee.phone).first().catch(() => null);
                    }
                    if (!linkedMember && employee.name) {
                        linkedMember = await db.prepare(`
                            SELECT * FROM coop_members WHERE name = ? LIMIT 1
                        `).bind(employee.name).first().catch(() => null);
                    }

                    if (linkedMember) {
                        member = {
                            ...linkedMember,
                            employeeId: employee.id,
                            profitSharePct: employee.profitSharePct || 50,
                            isTapper: true
                        };
                    } else {
                        member = {
                            id: employee.id,
                            memberNo: employee.id,
                            name: employee.name,
                            phone: employee.phone || '',
                            idCard: '',
                            bankAccount: employee.bankAccount || '',
                            bankName: employee.bankName || '',
                            address: '',
                            orgPosition: 'คนกรีดยาง / ผู้ช่วยกรีด',
                            joinedDate: employee.created_at ? employee.created_at.split(' ')[0] : '',
                            totalShares: 0,
                            shareValue: 0,
                            savingsBalance: 0,
                            employeeId: employee.id,
                            farmerId: employee.farmerId || null,
                            userId: employee.userId || null,
                            isTapperOnly: true,
                            isTapper: true,
                            profitSharePct: employee.profitSharePct || 50
                        };
                    }
                }
            }
        }

        // If member was found from coop_members, check if they are also registered as an employee (tapper)
        if (member && !member.employeeId && member.userId) {
            let matchedEmployee = null;
            if (member.phone) {
                matchedEmployee = await db.prepare(
                    "SELECT * FROM employees WHERE phone = ? AND userId = ? LIMIT 1"
                ).bind(member.phone, member.userId).first().catch(() => null);
            }
            if (!matchedEmployee && member.name) {
                matchedEmployee = await db.prepare(
                    "SELECT * FROM employees WHERE name = ? AND userId = ? LIMIT 1"
                ).bind(member.name, member.userId).first().catch(() => null);
            }
            if (matchedEmployee) {
                member.employeeId = matchedEmployee.id;
                member.isTapper = true;
                member.profitSharePct = matchedEmployee.profitSharePct || 50;
            }
        }

        if (!member) {
            return jsonResponse({
                status: 'error',
                message: target ? `ไม่พบข้อมูลสำหรับ "${target}" (กรุณาตรวจสอบรหัสสมาชิก, รหัสเกษตรกร, รหัสคนกรีดยาง หรือเบอร์โทรศัพท์)` : 'กรุณาระบุรหัสในลิงก์'
            }, 404);
        }

        // 2. Fetch Store / Co-op Settings
        let settingsRes = null;
        if (member.userId) {
            settingsRes = await db.prepare(
                "SELECT key, value FROM settings WHERE userId = ?"
            ).bind(member.userId).all().catch(() => ({ results: [] }));
        } else {
            settingsRes = await db.prepare(
                "SELECT key, value FROM settings LIMIT 50"
            ).all().catch(() => ({ results: [] }));
        }

        const settingsMap = {};
        (settingsRes?.results || []).forEach(s => {
            settingsMap[s.key] = s.value;
        });

        let accounts = [];
        let savingsTransactions = [];
        let shareTransactions = [];
        let dividendInfo = null;

        if (!member.isFarmerOnly && member.userId) {
            // 3. Fetch All Savings Accounts for this Member
            const accountsRes = await db.prepare(
                "SELECT * FROM savings_accounts WHERE memberId = ? AND userId = ? AND status = 'active' ORDER BY accountNo ASC"
            ).bind(member.id, member.userId).all().catch(() => ({ results: [] }));
            accounts = accountsRes?.results || [];

            // 4. Fetch Recent Savings Transactions
            const savingsTxRes = await db.prepare(`
                SELECT st.*, sa.accountName
                FROM savings_transactions st
                LEFT JOIN savings_accounts sa ON st.accountId = sa.id
                WHERE st.memberId = ? AND st.userId = ?
                ORDER BY st.date DESC, st.created_at DESC
                LIMIT 15
            `).bind(member.id, member.userId).all().catch(() => ({ results: [] }));
            savingsTransactions = savingsTxRes?.results || [];

            // 5. Fetch Recent Share Transactions
            const shareTxRes = await db.prepare(`
                SELECT * FROM share_transactions
                WHERE memberId = ? AND userId = ?
                ORDER BY date DESC, created_at DESC
                LIMIT 10
            `).bind(member.id, member.userId).all().catch(() => ({ results: [] }));
            shareTransactions = shareTxRes?.results || [];

            // 6. Fetch Latest Dividend Info
            try {
                const distRes = await db.prepare(`
                    SELECT dd.*, dp.year, dp.title as periodTitle
                    FROM dividend_distributions dd
                    JOIN dividend_periods dp ON dd.periodId = dp.id
                    WHERE dd.memberId = ? AND dd.userId = ?
                    ORDER BY dp.year DESC, dd.created_at DESC
                    LIMIT 1
                `).bind(member.id, member.userId).first();

                if (distRes) {
                    dividendInfo = {
                        periodTitle: distRes.periodTitle || `รอบปี ${distRes.year}`,
                        year: distRes.year,
                        shareDividend: Number(distRes.dividendShareAmount) || 0,
                        patronageRefund: Number(distRes.patronageRefundAmount) || 0,
                        netPayout: Number(distRes.netPayout) || 0,
                        payoutStatus: distRes.payoutStatus,
                        paidDate: distRes.paidDate
                    };
                }
            } catch (e) {}
        }

        // 7. Check if member has rubber plots and recent buys
        let hasPlots = false;
        let farmerPlots = [];
        let recentBuys = [];

        if (member.employeeId && member.farmerId) {
            const buysQuery = "SELECT id, date, farmerId, farmerName, weight, drc, pricePerKg, total, dryRubber, empPct, employeeTotal, farmerTotal, note, status, farmerStatus, employeeStatus, rubberType, created_at FROM buys WHERE " + (member.userId ? "userId = ? AND " : "") + "(employeeId = ? OR farmerId = ?) ORDER BY date DESC, created_at DESC LIMIT 50";
            const binds = member.userId ? [member.userId, member.employeeId, member.farmerId] : [member.employeeId, member.farmerId];
            const buysRes = await db.prepare(buysQuery).bind(...binds).all().catch((err) => { console.error('Buys query error:', err); return { results: [] }; });
            recentBuys = buysRes?.results || [];

            const plotQuery = "SELECT * FROM land_plots WHERE " + (member.userId ? "userId = ? AND " : "") + "(employeeId = ? OR farmerId = ?) ORDER BY created_at ASC";
            const plotBinds = member.userId ? [member.userId, member.employeeId, member.farmerId] : [member.employeeId, member.farmerId];
            const plotCountRes = await db.prepare(plotQuery).bind(...plotBinds).all().catch(() => ({ results: [] }));
            farmerPlots = plotCountRes?.results || [];
            hasPlots = farmerPlots.length > 0;
        } else if (member.employeeId) {
            const buysQuery = "SELECT id, date, farmerId, farmerName, weight, drc, pricePerKg, total, dryRubber, empPct, employeeTotal, farmerTotal, note, status, farmerStatus, employeeStatus, rubberType, created_at FROM buys WHERE " + (member.userId ? "userId = ? AND " : "") + "employeeId = ? ORDER BY date DESC, created_at DESC LIMIT 50";
            const binds = member.userId ? [member.userId, member.employeeId] : [member.employeeId];
            const buysRes = await db.prepare(buysQuery).bind(...binds).all().catch((err) => { console.error('Buys query error:', err); return { results: [] }; });
            recentBuys = buysRes?.results || [];

            const plotQuery = "SELECT * FROM land_plots WHERE " + (member.userId ? "userId = ? AND " : "") + "(employeeId = ? OR (farmerId = ? AND farmerId IS NOT NULL)) ORDER BY created_at ASC";
            const plotBinds = member.userId ? [member.userId, member.employeeId, member.farmerId || ''] : [member.employeeId, member.farmerId || ''];
            const plotCountRes = await db.prepare(plotQuery).bind(...plotBinds).all().catch(() => ({ results: [] }));
            farmerPlots = plotCountRes?.results || [];
            hasPlots = farmerPlots.length > 0;
        } else if (member.farmerId) {
            const plotQuery = "SELECT * FROM land_plots WHERE " + (member.userId ? "userId = ? AND " : "") + "farmerId = ? ORDER BY created_at ASC";
            const plotBinds = member.userId ? [member.userId, member.farmerId] : [member.farmerId];
            const plotCountRes = await db.prepare(plotQuery).bind(...plotBinds).all().catch(() => ({ results: [] }));
            farmerPlots = plotCountRes?.results || [];
            hasPlots = farmerPlots.length > 0;

            const buysQuery = "SELECT id, date, farmerId, farmerName, weight, drc, pricePerKg, total, dryRubber, empPct, employeeTotal, farmerTotal, note, status, farmerStatus, employeeStatus, rubberType, created_at FROM buys WHERE " + (member.userId ? "userId = ? AND " : "") + "(farmerId = ? OR farmerName = ?) ORDER BY date DESC, created_at DESC LIMIT 50";
            const binds = member.userId ? [member.userId, member.farmerId, member.name] : [member.farmerId, member.name];
            const buysRes = await db.prepare(buysQuery).bind(...binds).all().catch((err) => { console.error('Buys query error:', err); return { results: [] }; });
            recentBuys = buysRes?.results || [];
        }

        const res = jsonResponse({
            status: 'success',
            data: {
                member: {
                    id: member.id,
                    memberNo: member.memberNo,
                    name: member.name,
                    phone: member.phone,
                    idCard: member.idCard ? `${member.idCard.slice(0, 3)}-xxxx-xxx${member.idCard.slice(-3)}` : '',
                    bankAccount: member.bankAccount,
                    bankName: member.bankName,
                    address: member.address,
                    orgPosition: member.orgPosition,
                    joinedDate: member.joinedDate,
                    totalShares: member.totalShares || 0,
                    shareValue: member.shareValue || 0,
                    savingsBalance: member.savingsBalance || 0,
                    farmerId: member.farmerId,
                    hasPlots,
                    farmerPlots,
                    recentBuys,
                    isFarmerOnly: !!member.isFarmerOnly,
                    isTapperOnly: !!member.isTapperOnly,
                    isTapper: !!(member.isTapper || member.employeeId || member.isTapperOnly),
                    profitSharePct: member.profitSharePct || 0,
                    employeeId: member.employeeId || null
                },
                store: {
                    factoryName: settingsMap.factoryName || 'กลุ่มเกษตรกรและสหกรณ์ยางพารา',
                    address: settingsMap.address || '',
                    stationCode: settingsMap.station_code || ''
                },
                accounts,
                savingsTransactions,
                shareTransactions,
                dividendInfo
            }
        });

        res.headers.set('Cache-Control', 'public, max-age=15, s-maxage=15');
        return res;
    } catch (e) {
        return errorResponse(e.message);
    }
}
