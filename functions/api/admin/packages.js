import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

// Specific middleware for super admin
const withSuperAdmin = (handler) => {
    return withAuth(async (context) => {
        const superAdminEmail = 'narapong.an@gmail.com';
        const superAdminUser = 'narapong.an';
        if (context.user.role !== 'super_admin' && 
            context.user.email !== superAdminEmail && 
            context.user.username !== superAdminUser) {
            return errorResponse('Forbidden: Super Admin access required', 403);
        }
        return handler(context);
    });
};

async function handlePost(context) {
    try {
        const db = context.env.DB;
        const body = await context.request.json();
        
        if (body.action === 'create' || body.action === 'update') {
            const { name, days, price, maxStaff } = body.payload;
            if (!name || !days || price === undefined) {
                return errorResponse('Missing package details', 400);
            }
            
            const id = body.payload.id || 'pkg_' + Date.now();
            const staffLimit = parseInt(maxStaff) || 1;
            
            await db.prepare("INSERT INTO subscription_packages (id, name, days, price, maxStaff) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, days=excluded.days, price=excluded.price, maxStaff=excluded.maxStaff")
                .bind(id, name, parseInt(days), parseFloat(price), staffLimit)
                .run();
                
            return jsonResponse({ status: 'success', id });
        } else if (body.action === 'delete') {
            if (!body.id) return errorResponse('Missing package ID', 400);
            await db.prepare("DELETE FROM subscription_packages WHERE id = ?").bind(body.id).run();
            return jsonResponse({ status: 'success' });
        }

        return errorResponse('Invalid action', 400);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export const onRequestPost = withSuperAdmin(handlePost);
