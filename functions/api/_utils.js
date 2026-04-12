import { jwtVerify, createRemoteJWKSet } from 'jose';

export const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
    });
};

export const errorResponse = (message, status = 500) => {
    return jsonResponse({ status: 'error', message }, status);
};

export const isUUID = (id) => {
    if (!id || typeof id !== 'string') return false;
    // Basic UUID check (8-4-4-4-12 hex chars)
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// Supabase JWKS Cache
let jwksSet = null;

export const verifyJWT = async (request, env) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    let SUPABASE_URL = env.SUPABASE_URL;
    
    if (!SUPABASE_URL) {
        console.error('AUTH_ERROR: SUPABASE_URL is not defined in environment variables. Check Cloudflare Dashboard Settings > Variables.');
        return null;
    }

    // Normalize URL: remove trailing slash if exists
    if (SUPABASE_URL.endsWith('/')) {
        SUPABASE_URL = SUPABASE_URL.slice(0, -1);
    }

    try {
        if (!jwksSet) {
            jwksSet = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
        }

        const { payload } = await jwtVerify(token, jwksSet, {
            issuer: `${SUPABASE_URL}/auth/v1`,
            audience: 'authenticated'
        });

        return payload;
    } catch (e) {
        console.error('AUTH_ERROR: JWT Verification Failed:', e.message);
        console.error('DEBUG_INFO: Issuer expected:', `${SUPABASE_URL}/auth/v1`);
        return null;
    }
};

export const withAuth = (handler) => {
    return async (context) => {
        const payload = await verifyJWT(context.request, context.env);
        if (!payload) {
            return errorResponse('Unauthorized', 401);
        }
        
        const db = context.env.DB;
        const userId = payload.sub;
        
        // Fetch user subscription info from DB
        let userRecord = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
        
        // If user record doesn't exist (new signup auto-migration), create it with 7 days trial
        if (!userRecord) {
            const now = new Date();
            const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const expiryStr = expiry.toISOString().replace('T', ' ').substring(0, 19);
            
            await db.prepare("INSERT INTO users (id, username, email, password, role, subscription_status, subscription_expiry) VALUES (?, ?, ?, ?, ?, ?, ?)")
                .bind(userId, payload.email?.split('@')[0] || 'User', payload.email || '', 'oauth_login', 'owner', 'trial', expiryStr)
                .run();
                
            userRecord = {
                id: userId,
                role: 'owner',
                subscription_status: 'trial',
                subscription_expiry: expiryStr
            };
        }

        // Add user info to context
        context.user = {
            id: userId,
            email: payload.email,
            username: userRecord.username,
            role: userRecord.role || payload.role || 'owner',
            subscription_status: userRecord.subscription_status,
            subscription_expiry: userRecord.subscription_expiry
        };
        
        // Check if subscription is expired (only for write/system-critical operations if requested,
        // but the plan says "restrict from saving new items and exporting data").
        // We will pass the status and let the specific handlers or a central gatekeeper handle it.
        const method = context.request.method;
        const isExpired = userRecord.subscription_expiry && new Date(userRecord.subscription_expiry) < new Date();
        
        // Block modification if expired (POST, PUT, DELETE)
        // Exceptions: login, subscription requests, settings view
        const url = new URL(context.request.url);
        const isPermittedPath = url.pathname.includes('/subscriptions') || url.pathname.includes('/settings');
        
        if (isExpired && (method === 'POST' || method === 'PUT' || method === 'DELETE') && !isPermittedPath) {
            return errorResponse('Subscription expired. Please renew to continue saving data.', 402);
        }
        
        // Track the query hit
        context.waitUntil?.(trackUsage(context, { queryCount: 1 }));
        
        return handler(context);
    };
};

// Specific middleware for super admin
export const withSuperAdmin = (handler) => {
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

/**
 * Usage Tracking Utility
 */
export const trackUsage = async (context, metrics = {}) => {
    try {
        const db = context.env.DB;
        const userId = context.user?.id || metrics.userId;
        if (!userId) return;

        const queryCount = metrics.queryCount || 0;
        const rowsRead = metrics.rowsRead || 0;
        const rowsWritten = metrics.rowsWritten || 0;
        const rowsDeleted = metrics.rowsDeleted || 0;
        const date = metrics.date || new Date().toISOString().split('T')[0];

        await db.prepare(`
            INSERT INTO user_usage_stats (userId, date, queryCount, rowsRead, rowsWritten, rowsDeleted)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(userId, date) DO UPDATE SET
                queryCount = queryCount + excluded.queryCount,
                rowsRead = rowsRead + excluded.rowsRead,
                rowsWritten = rowsWritten + excluded.rowsWritten,
                rowsDeleted = rowsDeleted + excluded.rowsDeleted
        `).bind(userId, date, queryCount, rowsRead, rowsWritten, rowsDeleted).run();
    } catch (e) {
        console.error('Usage Tracking Error:', e.message);
    }
};

