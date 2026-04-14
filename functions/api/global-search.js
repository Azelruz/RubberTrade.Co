import { jsonResponse, errorResponse, withAuth, trackUsage } from './_utils.js';

async function handleGet(context) {
    try {
        const userId = context.user.id;
        const url = new URL(context.request.url);
        const query = url.searchParams.get('q');
        
        if (!query || query.length < 2) {
            return jsonResponse({ results: {} });
        }

        const searchPattern = `%${query}%`;
        const stmts = [];

        // 1. Buys (ID, FarmerName)
        stmts.push(context.env.DB.prepare(`
            SELECT 'buy' as type, id, date, farmerName as title, total as subtitle 
            FROM buys 
            WHERE userId = ? AND (id LIKE ? OR farmerName LIKE ?) 
            ORDER BY date DESC LIMIT 5
        `).bind(userId, searchPattern, searchPattern));

        // 2. Sells (ID, BuyerName)
        stmts.push(context.env.DB.prepare(`
            SELECT 'sell' as type, id, date, buyerName as title, total as subtitle 
            FROM sells 
            WHERE userId = ? AND (id LIKE ? OR buyerName LIKE ?) 
            ORDER BY date DESC LIMIT 5
        `).bind(userId, searchPattern, searchPattern));

        // 3. Farmers (Name, Phone, ID)
        stmts.push(context.env.DB.prepare(`
            SELECT 'farmer' as type, id, name as title, phone as subtitle, '' as date 
            FROM farmers 
            WHERE userId = ? AND (name LIKE ? OR phone LIKE ? OR id LIKE ?) 
            LIMIT 5
        `).bind(userId, searchPattern, searchPattern, searchPattern));

        // 4. Employees & Staff
        stmts.push(context.env.DB.prepare(`
            SELECT 'employee' as type, id, name as title, phone as subtitle, '' as date 
            FROM employees 
            WHERE userId = ? AND (name LIKE ? OR phone LIKE ?) 
            LIMIT 3
        `).bind(userId, searchPattern, searchPattern));

        stmts.push(context.env.DB.prepare(`
            SELECT 'staff' as type, id, name as title, phone as subtitle, '' as date 
            FROM staff 
            WHERE userId = ? AND (name LIKE ? OR phone LIKE ?) 
            LIMIT 3
        `).bind(userId, searchPattern, searchPattern));

        // 5. Factories & Trucks
        stmts.push(context.env.DB.prepare(`
            SELECT 'factory' as type, id, name as title, code as subtitle, '' as date 
            FROM factories 
            WHERE userId = ? AND (name LIKE ? OR code LIKE ?) 
            LIMIT 3
        `).bind(userId, searchPattern, searchPattern));

        stmts.push(context.env.DB.prepare(`
            SELECT 'truck' as type, id, licensePlate as title, brand as subtitle, '' as date 
            FROM trucks 
            WHERE userId = ? AND (licensePlate LIKE ? OR brand LIKE ?) 
            LIMIT 3
        `).bind(userId, searchPattern, searchPattern));

        // 6. Expenses & Wages (Description, Category)
        stmts.push(context.env.DB.prepare(`
            SELECT 'expense' as type, id, description as title, category as subtitle, date 
            FROM expenses 
            WHERE userId = ? AND (description LIKE ? OR category LIKE ?) 
            ORDER BY date DESC LIMIT 3
        `).bind(userId, searchPattern, searchPattern));

        stmts.push(context.env.DB.prepare(`
            SELECT 'wage' as type, id, staffName as title, total as subtitle, date 
            FROM wages 
            WHERE userId = ? AND (staffName LIKE ? OR description LIKE ?) 
            ORDER BY date DESC LIMIT 3
        `).bind(userId, searchPattern, searchPattern));

        const batchRes = await context.env.DB.batch(stmts);
        
        const results = {};
        const types = ['buy', 'sell', 'farmer', 'employee', 'staff', 'factory', 'truck', 'expense', 'wage'];
        
        batchRes.forEach((res, idx) => {
            const type = types[idx];
            if (res.results && res.results.length > 0) {
                results[type] = res.results;
            }
        });

        // Track usage
        const totalFound = Object.values(results).reduce((sum, list) => sum + list.length, 0);
        context.waitUntil?.(trackUsage(context, { rowsRead: totalFound }));

        return jsonResponse({ results });
    } catch (e) {
        console.error("[Global Search Error]", e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
