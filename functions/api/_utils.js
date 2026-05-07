import { jwtVerify, createRemoteJWKSet } from 'jose';

export const jsonResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, X-Requested-With",
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
        context.db = db;
        const userId = payload.sub;
        
        // Fetch user subscription info from DB
        let userRecord = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
        
        // --- NEW: Invited Email Linkage ---
        if (!userRecord && payload.email) {
            // Check if there's a placeholder record for this email (invited_email)
            const invitedRecord = await db.prepare("SELECT * FROM users WHERE email = ? AND id LIKE 'invited_%'").bind(payload.email).first();
            if (invitedRecord) {
                // "Claim" the placeholder record
                await db.prepare("UPDATE users SET id = ? WHERE id = ?").bind(userId, invitedRecord.id).run();
                userRecord = { ...invitedRecord, id: userId };
                console.log(`[Auth] User ${payload.email} claimed invitation ${invitedRecord.id}`);
            }
        }

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
            subscription_expiry: userRecord.subscription_expiry,
            parentId: userRecord.parentId,
            maxStaffLimit: userRecord.maxStaffLimit || 1
        };

        // Determine Effective Store ID (Shared data access)
        context.user.storeId = userRecord.parentId || userId || userId;

        // --- NEW: Super Admin Store Switching ---
        const superAdminEmail = context.env.SUPER_ADMIN_EMAIL || 'narapong.an@gmail.com';
        const superAdminUser = context.env.SUPER_ADMIN_USERNAME || 'narapong.an';
        const isSuperAdmin = context.user.role === 'super_admin' || 
                             context.user.email === superAdminEmail || 
                             context.user.username === superAdminUser;

        if (isSuperAdmin) {
            const switchStoreId = context.request.headers.get('X-Switch-Store-ID');
            if (switchStoreId) {
                context.user.storeId = switchStoreId;
                context.user.isSwitched = true;
            }
        }

        // --- NEW: Timezone Detection ---
        const clientTz = context.request.headers.get('X-User-Timezone');
        context.user.timezone = clientTz || context.request.cf?.timezone || 'Asia/Bangkok';

        // If staff, we need to respect the owner's subscription status
        let effectiveSubscriptionExpiry = userRecord.subscription_expiry;
        if (userRecord.parentId) {
            const ownerRecord = await db.prepare("SELECT subscription_status, subscription_expiry FROM users WHERE id = ?").bind(userRecord.parentId).first();
            if (ownerRecord) {
                effectiveSubscriptionExpiry = ownerRecord.subscription_expiry;
                context.user.subscription_status = ownerRecord.subscription_status;
                context.user.subscription_expiry = ownerRecord.subscription_expiry;
            }
        }
        
        // Check if subscription is expired (based on owner's record)
        const method = context.request.method;
        const isExpired = effectiveSubscriptionExpiry && new Date(effectiveSubscriptionExpiry) < new Date();
        
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
        // Use environment variables if available, otherwise fallback to hardcoded defaults
        const superAdminEmail = context.env.SUPER_ADMIN_EMAIL || 'narapong.an@gmail.com';
        const superAdminUser = context.env.SUPER_ADMIN_USERNAME || 'narapong.an';
        
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
        const date = metrics.date || getTodayDateStr(context.user?.timezone || 'Asia/Bangkok');

        await db.prepare(`
            INSERT INTO user_usage_stats (userId, date, queryCount, rowsRead, rowsWritten, rowsDeleted)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(userId, date) DO UPDATE SET
                queryCount = queryCount + excluded.queryCount,
                rowsRead = rowsRead + excluded.rowsRead,
                rowsWritten = rowsWritten + excluded.rowsWritten,
                rowsDeleted = rowsDeleted + excluded.rowsDeleted
        `).bind(
            userId ?? 'unknown', 
            date ?? getTodayDateStr('Asia/Bangkok'), 
            queryCount ?? 0, 
            rowsRead ?? 0, 
            rowsWritten ?? 0, 
            rowsDeleted ?? 0
        ).run();
    } catch (e) {
        console.error('Usage Tracking Error:', e.message);
    }
};

/**
 * Activity Logging Utility
 * Records actions (CREATE, UPDATE, DELETE) for auditing.
 * Uses context.waitUntil to avoid blocking the main response.
 */
export const recordAuditLog = async (context, { action, entityType, entityId, oldData, newData }) => {
    try {
        const db = context.env.DB;
        const user = context.user;
        const ip = context.request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const ua = context.request.headers.get('User-Agent') || 'Unknown';
        
        const logPromise = db.prepare(`
            INSERT INTO audit_logs (userId, username, action, entityType, entityId, oldData, newData, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            user?.id ?? 'system',
            user?.username ?? 'System',
            action ?? 'UNKNOWN',
            entityType ?? 'unknown',
            entityId ?? 'unknown',
            oldData ? JSON.stringify(oldData) : null,
            newData ? JSON.stringify(newData) : null,
            ip ?? '0.0.0.0',
            ua ?? 'Unknown'
        ).run();

        // Run in background if possible
        if (context.waitUntil) {
            context.waitUntil(logPromise);
        } else {
            await logPromise;
        }
    } catch (e) {
        console.error('[AuditLog Error]', e.message);
    }
};


/**
 * Rate Limiting Middleware
 * @param {Function} handler - The next handler in the chain
 * @param {Number} limit - Max requests per minute
 */
export const withRateLimit = (handler, limit = 60) => {
    return async (context) => {
        const db = context.env.DB;
        
        // Use User ID if available (from withAuth), otherwise fallback to IP
        const userId = context.user?.id;
        const ip = context.request.headers.get('CF-Connecting-IP') || '0.0.0.0';
        const key = userId ? `user_${userId}` : `ip_${ip}`;
        const minute = Math.floor(Date.now() / 60000);

        try {
            // Increment count for the current minute
            await db.prepare(`
                INSERT INTO api_rate_limits (key, minute, count)
                VALUES (?, ?, 1)
                ON CONFLICT(key, minute) DO UPDATE SET count = count + 1
            `).bind(key, minute).run();

            // Check new count
            const record = await db.prepare("SELECT count FROM api_rate_limits WHERE key = ? AND minute = ?")
                .bind(key, minute).first();

            if (record && record.count > limit) {
                return jsonResponse({ 
                    status: 'error', 
                    message: `Too many requests. Limit is ${limit} per minute.` 
                }, 429);
            }
            
            // Cleanup old records occasionally (1% chance per request)
            if (Math.random() < 0.01) {
                context.waitUntil?.(db.prepare("DELETE FROM api_rate_limits WHERE minute < ?").bind(minute - 5).run());
            }
        } catch (e) {
            console.error('[RateLimit Error]', e.message);
            // Fail open: allow request if rate limiter fails
        }

        return handler(context);
    };
};
/**
 * Helper to get current Date object in a specific timezone
 * @param {String} tz - Timezone string (e.g., 'Asia/Bangkok')
 * @returns {Date} - Current date object (shifted to local values but in UTC internally)
 */
export const getNowByTimezone = (tz = 'Asia/Bangkok') => {
    const now = new Date();
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(now);
        const dateMap = {};
        parts.forEach(p => dateMap[p.type] = p.value);
        
        // Return a date that represents the LOCAL time as if it were UTC
        return new Date(`${dateMap.year}-${dateMap.month}-${dateMap.day}T${dateMap.hour}:${dateMap.minute}:${dateMap.second}.000Z`);
    } catch (e) {
        // Fallback to TH (GMT+7)
        return new Date(now.getTime() + (7 * 60 * 60 * 1000));
    }
};

/**
 * Gets the current date string (YYYY-MM-DD) for a specific timezone
 */
export const getTodayDateStr = (tz = 'Asia/Bangkok') => {
    try {
        return getNowByTimezone(tz).toISOString().split('T')[0];
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
};

/**
 * Gets the timezone offset string for SQLite (e.g., "+7 hours")
 */
export const getTimezoneOffset = (tz = 'Asia/Bangkok') => {
    try {
        const now = new Date();
        const local = getNowByTimezone(tz);
        const diffMs = local.getTime() - now.getTime();
        const hours = Math.round(diffMs / (1000 * 60 * 60));
        return hours >= 0 ? `+${hours} hours` : `${hours} hours`;
    } catch (e) {
        return '+7 hours';
    }
};
