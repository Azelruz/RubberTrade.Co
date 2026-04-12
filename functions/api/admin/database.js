import { jsonResponse, errorResponse, withSuperAdmin } from '../_utils.js';

/**
 * Super Admin Database Management API
 * Allows Exporting and Importing tables for specific users
 */

async function handleGet(context) {
    try {
        const db = context.env.DB;
        const url = new URL(context.request.url);
        const action = url.searchParams.get('action');
        const userId = url.searchParams.get('userId');
        let table = url.searchParams.get('table');

        // Normalization
        if (table === 'chemicals') table = 'chemical_usage';
        if (table === 'member-types') table = 'farmer_types';

        if (action === 'export') {
            if (!userId || !table) return errorResponse('Missing userId or table', 400);
            
            const allowedTables = ['farmers', 'staff', 'employees', 'factories', 'trucks', 'buys', 'sells', 'expenses', 'wages', 'chemical_usage', 'promotions', 'farmer_types'];
            if (!allowedTables.includes(table)) return errorResponse(`Invalid table for export: ${table}`, 400);

            const { results } = await db.prepare(`SELECT * FROM ${table} WHERE userId = ? ORDER BY created_at DESC`).bind(userId).all();
            return jsonResponse(results);
        }

        return errorResponse('Invalid action', 400);
    } catch (e) {
        return errorResponse(e.message);
    }
}

const TABLE_COLUMNS = {
    farmers: ['id', 'name', 'phone', 'bankAccount', 'bankName', 'address', 'note', 'fscId', 'lineId', 'lineName', 'linePicture', 'memberTypeId'],
    staff: ['id', 'name', 'phone', 'address', 'salary', 'bonus', 'note'],
    employees: ['id', 'name', 'farmerId', 'profitSharePct', 'phone', 'bankAccount', 'bankName'],
    factories: ['id', 'name', 'code', 'shortName', 'taxId', 'address'],
    trucks: ['id', 'licensePlate', 'chassisNumber', 'brand', 'model', 'prbExpiry'],
    buys: ['id', 'date', 'farmerId', 'farmerName', 'weight', 'drc', 'pricePerKg', 'total', 'dryRubber', 'empPct', 'employeeTotal', 'farmerTotal', 'note', 'status', 'farmerStatus', 'employeeStatus', 'receiptUrl', 'bucketWeight', 'basePrice', 'bonusDrc', 'actualPrice', 'bonusMemberType'],
    sells: ['id', 'date', 'buyerName', 'factoryId', 'employeeId', 'truckId', 'truckInfo', 'weight', 'drc', 'pricePerKg', 'lossWeight', 'total', 'profitShareAmount', 'receiptUrl', 'note', 'bonusMemberType'],
    expenses: ['id', 'date', 'category', 'description', 'amount', 'note'],
    wages: ['id', 'date', 'staffId', 'staffName', 'dailyWage', 'bonus', 'workDays', 'total', 'description', 'note'],
    chemical_usage: ['id', 'date', 'chemicalId', 'amount', 'unit'],
    promotions: ['id', 'date', 'farmerId', 'farmerName', 'pointsUsed', 'rewardName'],
    farmer_types: ['id', 'name', 'bonus'],
    settings: ['key', 'value']
};

async function handlePost(context) {
    try {
        const db = context.env.DB;
        const url = new URL(context.request.url);
        const action = url.searchParams.get('action');
        const targetUserId = url.searchParams.get('userId');
        const purge = url.searchParams.get('purge') === 'true';
        let table = url.searchParams.get('table');

        // Normalization for common naming variations
        if (table === 'chemicals') table = 'chemical_usage';
        if (table === 'member-types') table = 'farmer_types';

        if (action === 'import') {
            if (!targetUserId || !table) return errorResponse('Missing targetUserId or table', 400);
            
            const allowedTables = Object.keys(TABLE_COLUMNS);
            if (!allowedTables.includes(table)) return errorResponse(`Invalid table for import: ${table}`, 400);

            const body = await context.request.json();
            const rows = Array.isArray(body) ? body : [body];

            if (rows.length === 0) return jsonResponse({ status: 'success', count: 0 });

            // 0. OPTIONAL PURGE: Clear existing data for this user in this table
            if (purge) {
                console.log(`[PURGE] Clearing existing ${table} for user ${targetUserId}`);
                await db.prepare(`DELETE FROM ${table} WHERE userId = ?`).bind(targetUserId).run();
            }

            // 1. HARD FILTER columns based on TABLE_COLUMNS whitelist
            const validCols = TABLE_COLUMNS[table];
            const processedRows = rows.map(row => {
                // STRICT FILTERING: Build a clean row with ONLY whitelisted columns + userId
                const cleanRow = { userId: targetUserId };
                validCols.forEach(col => {
                    // Try to match column case-insensitively just in case
                    const sourceKey = Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase());
                    cleanRow[col] = sourceKey !== undefined ? row[sourceKey] : null;
                });
                return cleanRow;
            });

            // 2. Process Import (Detect columns from whitelist)
            const colNames = [...validCols, 'userId'].join(', ');
            const placeholders = new Array(validCols.length + 1).fill('?').join(', ');
            const query = `INSERT OR REPLACE INTO ${table} (${colNames}) VALUES (${placeholders})`;

            const BATCH_SIZE = 50;
            let totalImported = 0;
            
            for (let i = 0; i < processedRows.length; i += BATCH_SIZE) {
                const batch = processedRows.slice(i, i + BATCH_SIZE);
                const stmts = batch.map(row => {
                    const values = validCols.map(col => row[col]);
                    values.push(targetUserId); 
                    return db.prepare(query).bind(...values);
                });
                await db.batch(stmts);
                totalImported += batch.length;
            }

            return jsonResponse({ status: 'success', count: totalImported });
        }

        return errorResponse('Invalid action', 400);
    } catch (e) {
         let message = e.message;
        if (message.includes('FOREIGN KEY constraint failed')) {
            message = `[ข้อผิดพลาดการอ้างอิงข้อมูล] แทรกข้อมูลไม่สำเร็จ เนื่องจากมีรหัส (เช่น รหัสเกษตรกร พนักงาน หรือโรงงาน) ที่ไม่อยู่ในระบบ หรือคุณกำลังนำเข้าผิดลำดับ กรุณานำเข้าข้อมูลพื้นฐานก่อนครับ`;
        }
        return errorResponse(message);
    }
}

export const onRequestGet = withSuperAdmin(handleGet);
export const onRequestPost = withSuperAdmin(handlePost);
