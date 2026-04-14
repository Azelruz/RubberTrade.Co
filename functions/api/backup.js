import { jsonResponse, errorResponse, withAuth } from './_utils.js';

/**
 * GET: List backups for the current user
 */
async function handleGet(context) {
    try {
        const db = context.env.DB;
        const userId = context.user.id;
        
        const backups = await db.prepare("SELECT * FROM backups WHERE userId = ? ORDER BY createdAt DESC")
            .bind(userId)
            .all();
            
        return jsonResponse(backups.results);
    } catch (e) {
        return errorResponse('Failed to list backups: ' + e.message);
    }
}

/**
 * POST: Trigger a new backup
 */
async function handlePost(context) {
    try {
        const db = context.env.DB;
        const bucket = context.env.BUCKET;
        const userId = context.user.id;
        
        if (!bucket) {
            return errorResponse('R2 Bucket not configured', 500);
        }

        // 1. Snapshot all data for the user
        const tables = [
            'farmers', 'staff', 'employees', 'buys', 'sells', 
            'expenses', 'wages', 'promotions', 'chemical_usage', 
            'settings', 'factories', 'trucks'
        ];
        
        const snapshot = {
            version: "1.0",
            backupDate: new Date().toISOString(),
            userId: userId,
            data: {}
        };

        for (const table of tables) {
            // Some tables might not have userId (like factories, trucks if they are shared, 
            // but in this multitenant app they should have it or be accessible).
            // Based on schema review, most have userId.
            const { results } = await db.prepare(`SELECT * FROM ${table} WHERE userId = ?`)
                .bind(userId)
                .all();
            snapshot.data[table] = results;
        }

        // 2. Upload to R2
        const timestamp = Date.now();
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `backup_${dateStr}_${timestamp}.json`;
        const r2Key = `backups/${userId}/${filename}`;
        
        const jsonString = JSON.stringify(snapshot);
        const encoder = new TextEncoder();
        const data = encoder.encode(jsonString);

        await bucket.put(r2Key, data, {
            httpMetadata: { contentType: 'application/json' },
            customMetadata: {
                userId: userId,
                type: 'auto'
            }
        });

        // 3. Record in DB
        const backupId = crypto.randomUUID();
        await db.prepare(`
            INSERT INTO backups (id, userId, filename, r2Key, fileSize, type)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(backupId, userId, filename, r2Key, data.length, 'auto').run();

        // 4. Cleanup old backups (> 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const cutoffDate = ninetyDaysAgo.toISOString().replace('T', ' ').substring(0, 19);

        const oldBackups = await db.prepare("SELECT * FROM backups WHERE userId = ? AND createdAt < ?")
            .bind(userId, cutoffDate)
            .all();

        for (const old of oldBackups.results) {
            try {
                // Delete from R2
                await bucket.delete(old.r2Key);
                // Delete from DB
                await db.prepare("DELETE FROM backups WHERE id = ?").bind(old.id).run();
            } catch (cleanupErr) {
                console.error(`[Cleanup Error] Failed to delete backup ${old.id}:`, cleanupErr);
            }
        }

        return jsonResponse({
            status: 'success',
            message: 'Backup completed and stored in Cloudflare R2',
            backup: {
                id: backupId,
                filename,
                size: data.length
            }
        });
        
    } catch (e) {
        console.error('[Backup Error]', e);
        return errorResponse('Backup failed: ' + e.message);
    }
}

/**
 * DELETE: Remove a specific backup
 */
async function handleDelete(context) {
    try {
        const db = context.env.DB;
        const bucket = context.env.BUCKET;
        const userId = context.user.id;
        
        const url = new URL(context.request.url);
        const backupId = url.searchParams.get('id');
        
        if (!backupId) return errorResponse('Missing backup ID', 400);

        const backup = await db.prepare("SELECT * FROM backups WHERE id = ? AND userId = ?")
            .bind(backupId, userId)
            .first();

        if (!backup) return errorResponse('Backup not found', 404);

        // Delete from R2
        try {
            await bucket.delete(backup.r2Key);
        } catch (r2Err) {
            console.error('[R2 Delete Error]', r2Err);
            // Continue with DB deletion even if R2 fails (file might already be gone)
        }

        // Delete from DB
        await db.prepare("DELETE FROM backups WHERE id = ?").bind(backupId).run();

        return jsonResponse({ status: 'success', message: 'Backup deleted' });
    } catch (e) {
        return errorResponse('Deletion failed: ' + e.message);
    }
}

export const onRequestGet = withAuth(handleGet);
export const onRequestPost = withAuth(handlePost);
export const onRequestDelete = withAuth(handleDelete);
