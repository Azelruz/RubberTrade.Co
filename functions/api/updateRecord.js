import { jsonResponse, errorResponse, withAuth } from './_utils.js';

/**
 * Column Whitelists for Standard Users
 * Prevents editing sensitive fields like 'id', 'userId', 'role', etc.
 */
const TABLE_WHITELISTS = {
    'farmers': ['name', 'fscId', 'phone', 'bankAccount', 'bankName', 'address', 'note', 'memberTypeId'],
    'staff': ['name', 'phone'],
    'employees': ['name', 'farmerId', 'phone'],
    'buys': [
        'date', 'farmerId', 'farmerName', 'weight', 'drc', 'pricePerKg', 'total', 
        'dryRubber', 'empPct', 'employeeTotal', 'farmerTotal', 'note', 'status', 
        'farmerStatus', 'employeeStatus', 'receiptUrl', 'bucketWeight',
        'basePrice', 'bonusDrc', 'actualPrice', 'bonusMemberType', 'rubberType'
    ],
    'sells': [
        'date', 'buyerName', 'factoryId', 'employeeId', 'truckId', 'truckInfo',
        'weight', 'drc', 'pricePerKg', 'lossWeight', 'total', 
        'profitShareAmount', 'receiptUrl', 'note', 'rubberType'
    ],
    'expenses': ['date', 'title', 'category', 'amount', 'note', 'status'],
    'wages': ['date', 'staffId', 'type', 'amount', 'status', 'note'],
    'promotions': ['title', 'description', 'isActive'],
    'trucks': ['plateNo', 'factoryId'],
    'factories': ['name', 'code'],
    'chemical_usage': ['date', 'totalFreshWeight']
};

async function handleUpdate(context) {
    try {
        const body = await context.request.json();
        const { sheetName, id, updates } = body;
        const user = context.user;
        const isSuperAdmin = user.role === 'super_admin';

        if (!sheetName || !id || !updates) {
            return errorResponse('Missing required fields (sheetName, id, updates)', 400);
        }

        const validTables = Object.keys(TABLE_WHITELISTS);
        let tableName = sheetName.toLowerCase();
        
        // Map frontend table names to actual database table names if they differ
        const tableMap = {
            'chemicals': 'chemical_usage'
        };
        
        if (tableMap[tableName]) {
            tableName = tableMap[tableName];
        }
        
        if (!validTables.includes(tableName)) {
            return errorResponse('Invalid table name: ' + sheetName, 400);
        }

        // --- SECURITY: Column Whitelisting ---
        let keysToUpdate = Object.keys(updates);
        
        if (!isSuperAdmin) {
            // Filter keys based on whitelist for standard users
            const whitelist = TABLE_WHITELISTS[tableName] || [];
            keysToUpdate = keysToUpdate.filter(k => whitelist.includes(k));
        }
        // If super_admin, we skip whitelist filtering to allow updating userId (Import/Move logic) or any system field.

        if (keysToUpdate.length === 0) {
            return jsonResponse({ status: 'success', message: 'No valid columns provided for update' });
        }

        // Build SQL
        const setClause = keysToUpdate.map(k => `${k} = ?`).join(', ');
        const values = keysToUpdate.map(k => updates[k]);
        
        // Add ID and User constraints
        values.push(id);
        
        let query;
        if (isSuperAdmin) {
            // SuperAdmin can update any record regardless of userId if they want, 
            // but for safety in generic updateRecord, we check if they provided a target userId in updates.
            // If they didn't, we still allow them to edit any ID globally.
            query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
        } else {
            // Standard User: strictly restricted to their own data
            query = `UPDATE ${tableName} SET ${setClause} WHERE id = ? AND userId = ?`;
            values.push(user.id);
        }

        const res = await context.env.DB.prepare(query).bind(...values).run();

        if (res.meta.rows_written === 0) {
            return errorResponse('Record not found or unauthorized', 404);
        }

        return jsonResponse({ status: 'success' });
    } catch (e) {
        console.error("[API Update Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestPost = withAuth(handleUpdate);
