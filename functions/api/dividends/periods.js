import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

async function handleGet(context) {
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');

        if (id) {
            const period = await context.env.DB.prepare(
                "SELECT * FROM dividend_periods WHERE id = ? AND userId = ?"
            ).bind(id, context.user.storeId).first();
            return jsonResponse(period || null);
        }

        const { results } = await context.env.DB.prepare(
            "SELECT * FROM dividend_periods WHERE userId = ? ORDER BY year DESC, created_at DESC"
        ).bind(context.user.storeId).all();

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
            year,
            title,
            startDate,
            endDate,
            netProfit = 0,
            allocatedProfit = 0,
            reservePct = 10,
            reserveAmount = 0,
            welfarePct = 5,
            welfareAmount = 0,
            boardBonusPct = 5,
            boardBonusAmount = 0,
            dividendShareRate = 0,
            dividendShareTotal = 0,
            patronageFormulaType = 'dry_rubber',
            patronageRefundRate = 0,
            patronageRefundTotal = 0,
            totalDistributed = 0,
            status = 'draft',
            approvedAt = null
        } = payload;

        if (!year || !startDate || !endDate) {
            return errorResponse("Missing required fields (year, startDate, endDate)");
        }

        await context.env.DB.prepare(`
            INSERT INTO dividend_periods (
                id, year, title, startDate, endDate, netProfit, allocatedProfit,
                reservePct, reserveAmount, welfarePct, welfareAmount,
                boardBonusPct, boardBonusAmount, dividendShareRate, dividendShareTotal,
                patronageFormulaType, patronageRefundRate, patronageRefundTotal,
                totalDistributed, status, approvedAt, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                year = excluded.year,
                title = excluded.title,
                startDate = excluded.startDate,
                endDate = excluded.endDate,
                netProfit = excluded.netProfit,
                allocatedProfit = excluded.allocatedProfit,
                reservePct = excluded.reservePct,
                reserveAmount = excluded.reserveAmount,
                welfarePct = excluded.welfarePct,
                welfareAmount = excluded.welfareAmount,
                boardBonusPct = excluded.boardBonusPct,
                boardBonusAmount = excluded.boardBonusAmount,
                dividendShareRate = excluded.dividendShareRate,
                dividendShareTotal = excluded.dividendShareTotal,
                patronageFormulaType = excluded.patronageFormulaType,
                patronageRefundRate = excluded.patronageRefundRate,
                patronageRefundTotal = excluded.patronageRefundTotal,
                totalDistributed = excluded.totalDistributed,
                status = excluded.status,
                approvedAt = excluded.approvedAt
        `).bind(
            id, parseInt(year), title || `รอบปันผลและเฉลี่ยคืน ประจำปี ${year}`,
            startDate, endDate, Number(netProfit) || 0, Number(allocatedProfit) || 0,
            Number(reservePct) || 0, Number(reserveAmount) || 0,
            Number(welfarePct) || 0, Number(welfareAmount) || 0,
            Number(boardBonusPct) || 0, Number(boardBonusAmount) || 0,
            Number(dividendShareRate) || 0, Number(dividendShareTotal) || 0,
            patronageFormulaType || 'dry_rubber',
            Number(patronageRefundRate) || 0, Number(patronageRefundTotal) || 0,
            Number(totalDistributed) || 0, status || 'draft',
            approvedAt, context.user.storeId
        ).run();

        return jsonResponse({ status: 'success', id });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);

async function handleDelete(context) {
    try {
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        if (!id) return errorResponse("Missing Period ID");

        // Delete cascade distributions
        await context.env.DB.prepare(
            "DELETE FROM dividend_distributions WHERE periodId = ? AND userId = ?"
        ).bind(id, context.user.storeId).run();

        await context.env.DB.prepare(
            "DELETE FROM dividend_periods WHERE id = ? AND userId = ?"
        ).bind(id, context.user.storeId).run();

        return jsonResponse({ status: 'success' });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
