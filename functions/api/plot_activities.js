import { jsonResponse, errorResponse, withAuth } from './_utils.js';

async function ensureTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS plot_activities (
            id TEXT PRIMARY KEY,
            plotId TEXT NOT NULL,
            farmerId TEXT NOT NULL,
            activityType TEXT NOT NULL,
            date DATE NOT NULL,
            title TEXT NOT NULL,
            details TEXT,
            fertilizerFormula TEXT,
            brand TEXT,
            amountKg REAL DEFAULT 0,
            bags REAL DEFAULT 0,
            cost REAL DEFAULT 0,
            serviceProvider TEXT,
            isPaid INTEGER DEFAULT 1,
            nextDueDate DATE,
            note TEXT,
            userId TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (plotId) REFERENCES land_plots(id) ON DELETE CASCADE,
            FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE CASCADE
        )
    `).run().catch(() => {});

    await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_plot_activities_plot_date ON plot_activities(plotId, date DESC)
    `).run().catch(() => {});
    await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_plot_activities_user_farmer ON plot_activities(userId, farmerId, date DESC)
    `).run().catch(() => {});
    await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_plot_activities_type ON plot_activities(plotId, activityType, date DESC)
    `).run().catch(() => {});
}

async function handleGet(context) {
    try {
        await ensureTable(context.env.DB);
        const storeId = context.user.storeId || context.user.id;
        const url = new URL(context.request.url);
        const plotId = url.searchParams.get('plotId');
        const farmerId = url.searchParams.get('farmerId');
        const activityType = url.searchParams.get('activityType');

        let query = "SELECT * FROM plot_activities WHERE userId = ?";
        const params = [storeId];

        if (plotId) {
            query += " AND plotId = ?";
            params.push(plotId);
        }
        if (farmerId) {
            query += " AND farmerId = ?";
            params.push(farmerId);
        }
        if (activityType) {
            query += " AND activityType = ?";
            params.push(activityType);
        }

        query += " ORDER BY date DESC, created_at DESC";

        const { results } = await context.env.DB.prepare(query).bind(...params).all();
        return jsonResponse(results || []);
    } catch (e) {
        console.error('[plot_activities GET Error]', e);
        return errorResponse(e.message);
    }
}

async function handlePost(context) {
    try {
        await ensureTable(context.env.DB);
        const body = await context.request.json();
        const storeId = context.user.storeId || context.user.id;
        const payload = body.payload || body;

        const id = payload.id || `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const {
            plotId,
            farmerId,
            activityType,
            date,
            title,
            details,
            fertilizerFormula,
            brand,
            amountKg,
            bags,
            cost,
            serviceProvider,
            isPaid,
            nextDueDate,
            note
        } = payload;

        if (!plotId || !farmerId || !activityType || !date) {
            return errorResponse('Missing required fields: plotId, farmerId, activityType, date', 400);
        }

        await context.env.DB.prepare(`
            INSERT INTO plot_activities (
                id, plotId, farmerId, activityType, date, title, details,
                fertilizerFormula, brand, amountKg, bags, cost, serviceProvider,
                isPaid, nextDueDate, note, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                plotId = excluded.plotId,
                farmerId = excluded.farmerId,
                activityType = excluded.activityType,
                date = excluded.date,
                title = excluded.title,
                details = excluded.details,
                fertilizerFormula = excluded.fertilizerFormula,
                brand = excluded.brand,
                amountKg = excluded.amountKg,
                bags = excluded.bags,
                cost = excluded.cost,
                serviceProvider = excluded.serviceProvider,
                isPaid = excluded.isPaid,
                nextDueDate = excluded.nextDueDate,
                note = excluded.note
        `).bind(
            id,
            plotId,
            farmerId,
            activityType,
            date,
            title || 'กิจกรรมดูแลสวน',
            details || '',
            fertilizerFormula || '',
            brand || '',
            parseFloat(amountKg) || 0,
            parseFloat(bags) || 0,
            parseFloat(cost) || 0,
            serviceProvider || '',
            isPaid !== undefined ? (isPaid ? 1 : 0) : 1,
            nextDueDate || null,
            note || '',
            storeId
        ).run();

        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error('[plot_activities POST Error]', e);
        return errorResponse(e.message);
    }
}

async function handleDelete(context) {
    try {
        await ensureTable(context.env.DB);
        const url = new URL(context.request.url);
        const id = url.searchParams.get('id');
        const storeId = context.user.storeId || context.user.id;

        if (!id) return errorResponse('Missing activity id', 400);

        await context.env.DB.prepare(
            "DELETE FROM plot_activities WHERE id = ? AND userId = ?"
        ).bind(id, storeId).run();

        return jsonResponse({ status: 'success', message: 'Activity deleted' });
    } catch (e) {
        console.error('[plot_activities DELETE Error]', e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
export const onRequestPost = withAuth(handlePost);
export const onRequestDelete = withAuth(handleDelete);
