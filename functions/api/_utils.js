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

// In-Memory Auth Cache for Worker Isolates (TTL 60s)
const userAuthMap = new Map();

export const invalidateUserAuthCache = (userId) => {
    if (userId) userAuthMap.delete(userId);
    else userAuthMap.clear();
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
        
        // Fetch user subscription info from In-Memory Cache or DB (TTL 60s)
        const cachedUser = userAuthMap.get(userId);
        let userRecord = null;

        if (cachedUser && (Date.now() - cachedUser._timestamp < 60000)) {
            userRecord = cachedUser.data;
        } else {
            userRecord = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
            if (userRecord) {
                userAuthMap.set(userId, { data: userRecord, _timestamp: Date.now() });
            }
        }
        
        // --- NEW: Invited Email Linkage ---
        if (!userRecord && payload.email) {
            // Check if there's a placeholder record for this email (invited_email)
            const invitedRecord = await db.prepare("SELECT * FROM users WHERE email = ? AND id LIKE 'invited_%'").bind(payload.email).first();
            if (invitedRecord) {
                // "Claim" the placeholder record
                await db.prepare("UPDATE users SET id = ? WHERE id = ?").bind(userId, invitedRecord.id).run();
                userRecord = { ...invitedRecord, id: userId };
                userAuthMap.set(userId, { data: userRecord, _timestamp: Date.now() });
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
            userAuthMap.set(userId, { data: userRecord, _timestamp: Date.now() });
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
        context.user.storeId = userId;

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
        } else if (context.user.role === 'owner') {
            const switchStoreId = context.request.headers.get('X-Switch-Store-ID');
            if (switchStoreId) {
                const isMyStaff = await db.prepare("SELECT 1 FROM users WHERE id = ? AND parentId = ?")
                    .bind(switchStoreId, userId).first();
                if (isMyStaff) {
                    context.user.storeId = switchStoreId;
                    context.user.isSwitched = true;
                }
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

export const updateFarmerStats = async (db, farmerId, storeId) => {
    if (!farmerId || !db) return;
    try {
        await db.prepare(`
            UPDATE farmers 
            SET 
                lastBuyDate = s.maxDate,
                buyCount = s.recentCount
            FROM (
                SELECT 
                    MAX(date) as maxDate,
                    COUNT(CASE WHEN date >= date('now', '-60 days') THEN 1 END) as recentCount
                FROM buys 
                WHERE farmerId = ? AND userId = ?
            ) s
            WHERE farmers.id = ? AND farmers.userId = ?
        `).bind(farmerId, storeId, farmerId, storeId).run();
    } catch (e) {
        console.error('[updateFarmerStats Error]', e);
    }
};

export const syncStoreStockSummary = async (db, storeId, delta = null) => {
    if (!storeId || !db) return;
    try {
        if (delta && typeof delta === 'object' && Object.keys(delta).length > 0) {
            // Incremental Delta Update for 99.9% D1 Rows Read reduction
            await db.prepare(`
                INSERT INTO store_stock_summary (
                    userId, latexBuyWeight, cupLumpBuyWeight, totalDrcWeight, 
                    ammonia, water, whiteMedicine, 
                    latexSellWeight, latexSellLoss, cupLumpSellWeight, updated_at
                )
                VALUES (
                    ?,
                    MAX(0, COALESCE(?, 0)), MAX(0, COALESCE(?, 0)), MAX(0, COALESCE(?, 0)),
                    MAX(0, COALESCE(?, 0)), MAX(0, COALESCE(?, 0)), MAX(0, COALESCE(?, 0)),
                    MAX(0, COALESCE(?, 0)), MAX(0, COALESCE(?, 0)), MAX(0, COALESCE(?, 0)),
                    datetime('now')
                )
                ON CONFLICT(userId) DO UPDATE SET
                    latexBuyWeight = MAX(0, latexBuyWeight + COALESCE(excluded.latexBuyWeight, 0)),
                    cupLumpBuyWeight = MAX(0, cupLumpBuyWeight + COALESCE(excluded.cupLumpBuyWeight, 0)),
                    totalDrcWeight = MAX(0, totalDrcWeight + COALESCE(excluded.totalDrcWeight, 0)),
                    ammonia = MAX(0, ammonia + COALESCE(excluded.ammonia, 0)),
                    water = MAX(0, water + COALESCE(excluded.water, 0)),
                    whiteMedicine = MAX(0, whiteMedicine + COALESCE(excluded.whiteMedicine, 0)),
                    latexSellWeight = MAX(0, latexSellWeight + COALESCE(excluded.latexSellWeight, 0)),
                    latexSellLoss = MAX(0, latexSellLoss + COALESCE(excluded.latexSellLoss, 0)),
                    cupLumpSellWeight = MAX(0, cupLumpSellWeight + COALESCE(excluded.cupLumpSellWeight, 0)),
                    updated_at = datetime('now')
            `).bind(
                storeId,
                delta.latexBuyWeight || 0,
                delta.cupLumpBuyWeight || 0,
                delta.totalDrcWeight || 0,
                delta.ammonia || 0,
                delta.water || 0,
                delta.whiteMedicine || 0,
                delta.latexSellWeight || 0,
                delta.latexSellLoss || 0,
                delta.cupLumpSellWeight || 0
            ).run();
            return;
        }

        // Full Sync Fallback
        await db.prepare(`
            INSERT INTO store_stock_summary (
                userId, latexBuyWeight, cupLumpBuyWeight, totalDrcWeight, 
                ammonia, water, whiteMedicine, 
                latexSellWeight, latexSellLoss, cupLumpSellWeight, updated_at
            )
            SELECT 
                ? as userId,
                COALESCE(b.latexBuyWeight, 0),
                COALESCE(b.cupLumpBuyWeight, 0),
                COALESCE(b.totalDrcWeight, 0),
                COALESCE(c.ammonia, 0),
                COALESCE(c.water, 0),
                COALESCE(c.whiteMedicine, 0),
                COALESCE(s.latexSellWeight, 0),
                COALESCE(s.latexSellLoss, 0),
                COALESCE(s.cupLumpSellWeight, 0),
                datetime('now')
            FROM (SELECT ? as storeId) u
            LEFT JOIN (
                SELECT 
                    SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN (weight - bucketWeight) ELSE 0 END) as latexBuyWeight,
                    SUM(CASE WHEN (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN (weight - bucketWeight) ELSE 0 END) as cupLumpBuyWeight,
                    SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN ((weight - bucketWeight) * drc) ELSE 0 END) as totalDrcWeight
                FROM buys WHERE userId = ?
            ) b ON 1=1
            LEFT JOIN (
                SELECT 
                    SUM(CASE WHEN chemicalId = 'ammonia' THEN amount ELSE 0 END) as ammonia,
                    SUM(CASE WHEN chemicalId = 'water' THEN amount ELSE 0 END) as water,
                    SUM(CASE WHEN chemicalId = 'whiteMedicine' THEN amount ELSE 0 END) as whiteMedicine
                FROM chemical_usage WHERE userId = ?
            ) c ON 1=1
            LEFT JOIN (
                SELECT 
                    SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN weight ELSE 0 END) as latexSellWeight,
                    SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN lossWeight ELSE 0 END) as latexSellLoss,
                    SUM(CASE WHEN (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN weight ELSE 0 END) as cupLumpSellWeight
                FROM sells WHERE userId = ?
            ) s ON 1=1
            ON CONFLICT(userId) DO UPDATE SET
                latexBuyWeight = excluded.latexBuyWeight,
                cupLumpBuyWeight = excluded.cupLumpBuyWeight,
                totalDrcWeight = excluded.totalDrcWeight,
                ammonia = excluded.ammonia,
                water = excluded.water,
                whiteMedicine = excluded.whiteMedicine,
                latexSellWeight = excluded.latexSellWeight,
                latexSellLoss = excluded.latexSellLoss,
                cupLumpSellWeight = excluded.cupLumpSellWeight,
                updated_at = datetime('now')
        `).bind(storeId, storeId, storeId, storeId, storeId).run();
    } catch (e) {
        console.error("[syncStoreStockSummary Error]", e);
    }
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

/**
 * Synchronizes daily_buys_summary table for specific dates of a store.
 * Ensures pre-calculated daily metrics for fast dashboard queries (~30 rows read max).
 */
export const syncDailyBuysSummary = async (db, storeId, dates) => {
    if (!db || !storeId || !dates || dates.length === 0) return;
    const uniqueDates = [...new Set(dates.filter(Boolean))];
    for (const date of uniqueDates) {
        try {
            const row = await db.prepare(`
                SELECT 
                    COALESCE(SUM(total), 0) as totalAmount,
                    COALESCE(SUM(weight - bucketWeight), 0) as totalWeight,
                    COALESCE(SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN total ELSE 0 END), 0) as latexTotal,
                    COALESCE(SUM(CASE WHEN (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN total ELSE 0 END), 0) as cupLumpTotal
                FROM buys
                WHERE userId = ? AND date = ?
            `).bind(storeId, date).first();

            const totalAmount = Number(row?.totalAmount || 0);
            const totalWeight = Number(row?.totalWeight || 0);
            const latexTotal = Number(row?.latexTotal || 0);
            const cupLumpTotal = Number(row?.cupLumpTotal || 0);

            if (totalAmount === 0 && totalWeight === 0) {
                await db.prepare("DELETE FROM daily_buys_summary WHERE userId = ? AND date = ?").bind(storeId, date).run();
            } else {
                await db.prepare(`
                    INSERT INTO daily_buys_summary (userId, date, totalAmount, totalWeight, latexTotal, cupLumpTotal, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(userId, date) DO UPDATE SET
                        totalAmount = excluded.totalAmount,
                        totalWeight = excluded.totalWeight,
                        latexTotal = excluded.latexTotal,
                        cupLumpTotal = excluded.cupLumpTotal,
                        updated_at = datetime('now')
                `).bind(storeId, date, totalAmount, totalWeight, latexTotal, cupLumpTotal).run();
            }
        } catch (e) {
            console.error("[syncDailyBuysSummary Error]", e);
        }
    }
};

/**
 * Synchronizes daily_sells_summary table for specific dates of a store.
 * Ensures pre-calculated daily metrics for fast sells summary queries (~30 rows read max).
 */
export const syncDailySellsSummary = async (db, storeId, dates) => {
    if (!db || !storeId || !dates || dates.length === 0) return;
    const uniqueDates = [...new Set(dates.filter(Boolean))];
    for (const date of uniqueDates) {
        try {
            const row = await db.prepare(`
                SELECT 
                    COALESCE(SUM(total), 0) as totalAmount,
                    COALESCE(SUM(weight), 0) as totalWeight,
                    COALESCE(SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN total ELSE 0 END), 0) as latexTotal,
                    COALESCE(SUM(CASE WHEN (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN total ELSE 0 END), 0) as cupLumpTotal
                FROM sells
                WHERE userId = ? AND date = ?
            `).bind(storeId, date).first();

            const totalAmount = Number(row?.totalAmount || 0);
            const totalWeight = Number(row?.totalWeight || 0);
            const latexTotal = Number(row?.latexTotal || 0);
            const cupLumpTotal = Number(row?.cupLumpTotal || 0);

            if (totalAmount === 0 && totalWeight === 0) {
                await db.prepare("DELETE FROM daily_sells_summary WHERE userId = ? AND date = ?").bind(storeId, date).run();
            } else {
                await db.prepare(`
                    INSERT INTO daily_sells_summary (userId, date, totalAmount, totalWeight, latexTotal, cupLumpTotal, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(userId, date) DO UPDATE SET
                        totalAmount = excluded.totalAmount,
                        totalWeight = excluded.totalWeight,
                        latexTotal = excluded.latexTotal,
                        cupLumpTotal = excluded.cupLumpTotal,
                        updated_at = datetime('now')
                `).bind(storeId, date, totalAmount, totalWeight, latexTotal, cupLumpTotal).run();
            }
        } catch (e) {
            console.error("[syncDailySellsSummary Error]", e);
        }
    }
};
