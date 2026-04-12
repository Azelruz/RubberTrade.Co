import { jsonResponse, errorResponse, withSuperAdmin, trackUsage } from '../_utils.js';

/**
 * Super Admin Usage API
 */
async function handleGet(context) {
    try {
        const db = context.env.DB;
        const url = new URL(context.request.url);
        const action = url.searchParams.get('action'); // 'getStats', 'backfill'
        const targetUserId = url.searchParams.get('userId');

        if (action === 'backfill') {
            return await handleBackfill(context);
        }

        if (action === 'getStats') {
            if (!targetUserId) return errorResponse('Missing userId', 400);

            // 1. Get Daily History
            const daily = await db.prepare(`
                SELECT date, queryCount, rowsRead, rowsWritten, rowsDeleted, storageEstKb
                FROM user_usage_stats
                WHERE userId = ?
                ORDER BY date DESC
                LIMIT 30
            `).bind(targetUserId).all();

            // 2. Get Monthly aggregation
            const monthly = await db.prepare(`
                SELECT SUBSTR(date, 1, 7) as month, 
                       SUM(queryCount) as queryCount, 
                       SUM(rowsRead) as rowsRead, 
                       SUM(rowsWritten) as rowsWritten, 
                       SUM(rowsDeleted) as rowsDeleted
                FROM user_usage_stats
                WHERE userId = ?
                GROUP BY month
                ORDER BY month DESC
                LIMIT 12
            `).bind(targetUserId).all();

            // 3. Current Total Snapshot & Real-time Storage Est
            const tables = [
                { name: 'buys', size: 0.25 },
                { name: 'sells', size: 0.30 },
                { name: 'farmers', size: 0.40 },
                { name: 'staff', size: 0.30 },
                { name: 'employees', size: 0.20 },
                { name: 'expenses', size: 0.15 },
                { name: 'wages', size: 0.20 },
                { name: 'chemical_usage', size: 0.10 },
                { name: 'factories', size: 0.20 },
                { name: 'trucks', size: 0.20 }
            ];

            let totalRows = 0;
            let totalStorageKb = 0;
            const tableStats = [];

            for (const table of tables) {
                try {
                    const countRes = await db.prepare(`SELECT COUNT(*) as count FROM ${table.name} WHERE userId = ?`).bind(targetUserId).first();
                    const count = countRes?.count || 0;
                    const estSize = count * table.size;
                    totalRows += count;
                    totalStorageKb += estSize;
                    tableStats.push({ name: table.name, count, estSizeKb: estSize });
                } catch (e) {
                    // Table might not have userId yet or not exist
                }
            }

            return jsonResponse({
                daily: daily?.results || [],
                monthly: monthly?.results || [],
                snapshot: {
                    totalRows,
                    totalStorageKb,
                    tableStats
                }
            });
        }

        return errorResponse('Invalid action', 400);
    } catch (e) {
        return errorResponse(e.message);
    }
}

async function handleBackfill(context) {
    const db = context.env.DB;
    const tables = ['buys', 'sells', 'farmers', 'staff', 'employees', 'expenses', 'wages', 'chemical_usage', 'factories', 'trucks'];
    
    // Clear existing to avoid doubling
    await db.prepare("DELETE FROM user_usage_stats").run();

    let logsCreated = 0;

    for (const table of tables) {
        try {
            // Find appropriate date column
            const dateCol = (table === 'farmers' || table === 'staff' || table === 'employees' || table === 'factories' || table === 'trucks') 
                ? 'SUBSTR(created_at, 1, 10)' 
                : 'date';

            const results = await db.prepare(`
                SELECT userId, ${dateCol} as day, COUNT(*) as count 
                FROM ${table} 
                WHERE userId IS NOT NULL
                GROUP BY userId, day
            `).all();

            if (results?.results) {
                for (const row of results.results) {
                    await db.prepare(`
                        INSERT INTO user_usage_stats (userId, date, rowsWritten)
                        VALUES (?, ?, ?)
                        ON CONFLICT(userId, date) DO UPDATE SET
                            rowsWritten = rowsWritten + excluded.rowsWritten
                    `).bind(row.userId, row.day, row.count).run();
                    logsCreated++;
                }
            }
        } catch (e) {
            console.error(`Backfill Error for table ${table}:`, e.message);
        }
    }

    return jsonResponse({ status: 'success', message: `Backfilled ${logsCreated} daily log entries` });
}

export const onRequestGet = withSuperAdmin(handleGet);
