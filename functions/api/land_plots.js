import { jsonResponse, errorResponse, withAuth } from './_utils.js';

// Auto-ensure table exists in D1 database
async function ensureTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS land_plots (
            id TEXT PRIMARY KEY,
            farmerId TEXT NOT NULL,
            employeeId TEXT,
            plotName TEXT,
            deedNumber TEXT,
            deedType TEXT,
            rai REAL DEFAULT 0,
            ngan REAL DEFAULT 0,
            sqWah REAL DEFAULT 0,
            geojson TEXT,
            lat REAL,
            lng REAL,
            note TEXT,
            userId TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE CASCADE,
            FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE SET NULL
        )
    `).run().catch(() => {});

    await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_land_plots_user_farmer ON land_plots(userId, farmerId)
    `).run().catch(() => {});
}

async function handleGet(context) {
    try {
        await ensureTable(context.env.DB);
        const storeId = context.user.storeId || context.user.id;
        const { results } = await context.env.DB.prepare(
            "SELECT * FROM land_plots WHERE userId = ? ORDER BY created_at DESC"
        ).bind(storeId).all();
        
        return jsonResponse(results || []);
    } catch (e) {
        console.error('[land_plots GET Error]', e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);

async function handlePost(context) {
    try {
        await ensureTable(context.env.DB);
        const body = await context.request.json();
        const storeId = context.user.storeId || context.user.id;
        const payload = body.payload || body;

        const id = payload.id || `plot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const { farmerId, employeeId, plotName, deedNumber, deedType, rai, ngan, sqWah, geojson, lat, lng, note } = payload;

        if (!farmerId) {
            return errorResponse('Missing farmerId', 400);
        }

        await context.env.DB.prepare(`
            INSERT INTO land_plots (
                id, farmerId, employeeId, plotName, deedNumber, deedType,
                rai, ngan, sqWah, geojson, lat, lng, note, userId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                farmerId = excluded.farmerId,
                employeeId = excluded.employeeId,
                plotName = excluded.plotName,
                deedNumber = excluded.deedNumber,
                deedType = excluded.deedType,
                rai = excluded.rai,
                ngan = excluded.ngan,
                sqWah = excluded.sqWah,
                geojson = excluded.geojson,
                lat = excluded.lat,
                lng = excluded.lng,
                note = excluded.note,
                updated_at = CURRENT_TIMESTAMP
        `).bind(
            id,
            farmerId,
            employeeId || null,
            plotName || 'แปลงสวนยาง',
            deedNumber || '',
            deedType || 'น.ส.4',
            parseFloat(rai) || 0,
            parseFloat(ngan) || 0,
            parseFloat(sqWah) || 0,
            typeof geojson === 'object' ? JSON.stringify(geojson) : (geojson || ''),
            parseFloat(lat) || null,
            parseFloat(lng) || null,
            note || '',
            storeId
        ).run();

        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error('[land_plots POST Error]', e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handlePost);
export const onRequestPut = withAuth(handlePost);

async function handleDelete(context) {
    try {
        await ensureTable(context.env.DB);
        const url = new URL(context.request.url);
        let id = url.searchParams.get('id');
        if (!id) {
            const parts = url.pathname.split('/');
            id = parts[parts.length - 1];
        }
        
        const storeId = context.user.storeId || context.user.id;

        if (!id || id === 'land_plots') {
            return errorResponse('Missing land plot ID', 400);
        }

        await context.env.DB.prepare(
            "DELETE FROM land_plots WHERE id = ? AND userId = ?"
        ).bind(id, storeId).run();

        return jsonResponse({ status: 'success', id });
    } catch (e) {
        console.error('[land_plots DELETE Error]', e);
        return errorResponse(e.message);
    }
}

export const onRequestDelete = withAuth(handleDelete);
