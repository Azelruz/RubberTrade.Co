import { jsonResponse, errorResponse, withSuperAdmin } from '../_utils.js';

const DEFAULT_BRANCHES = [
    {
        slug: 'main',
        name: 'สำนักงานใหญ่ / สาขาหลัก',
        code: 'RTB',
        project: 'rubertrade-co-ltd',
        url: 'https://rubertrade-co-ltd.pages.dev',
        database: 'Rubertrade-Co-Ltd-db',
        databaseId: '5212b4bc-ec93-4fce-8949-fcaf98280c8c',
        createdAt: '2026-04-09T05:35:10.907Z',
        status: 'active'
    },
    {
        slug: 'padang',
        name: 'สาขาปาดังเบซาร์',
        code: 'PDG',
        project: 'rubertrade-padang',
        url: 'https://rubertrade-padang.pages.dev',
        database: 'rubertrade-padang-db',
        databaseId: '2e7882b9-be8c-45a1-831c-704b0c0c8cae',
        createdAt: '2026-09-27T06:40:24.000Z',
        status: 'active'
    }
];

async function ensureTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS system_branches (
            slug TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            project TEXT NOT NULL,
            url TEXT NOT NULL,
            database TEXT NOT NULL,
            databaseId TEXT,
            createdAt TEXT NOT NULL,
            status TEXT DEFAULT 'active'
        )
    `).run();

    const countRes = await db.prepare("SELECT COUNT(*) as count FROM system_branches").first();
    if (!countRes || countRes.count === 0) {
        for (const b of DEFAULT_BRANCHES) {
            await db.prepare(`
                INSERT OR IGNORE INTO system_branches 
                (slug, name, code, project, url, database, databaseId, createdAt, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(b.slug, b.name, b.code, b.project, b.url, b.database, b.databaseId, b.createdAt, b.status).run();
        }
    }
}

async function handleGet(context) {
    try {
        const db = context.env.DB;
        await ensureTable(db);

        const { results } = await db.prepare("SELECT * FROM system_branches ORDER BY createdAt ASC").all();
        return jsonResponse(results && results.length > 0 ? results : DEFAULT_BRANCHES);
    } catch (e) {
        console.error('Error fetching branches:', e);
        return jsonResponse(DEFAULT_BRANCHES);
    }
}

async function handlePost(context) {
    try {
        const db = context.env.DB;
        await ensureTable(db);
        const body = await context.request.json();

        if (body.action === 'delete') {
            if (!body.slug) return errorResponse('Missing branch slug', 400);
            if (body.slug === 'main') return errorResponse('ไม่สามารถลบสาขาหลักได้', 400);
            
            await db.prepare("DELETE FROM system_branches WHERE slug = ?").bind(body.slug).run();
            return jsonResponse({ status: 'success', message: 'ลบข้อมูลสาขาออกจากรายการเรียบร้อย' });
        }

        if (body.action === 'toggle_status') {
            if (!body.slug) return errorResponse('Missing branch slug', 400);
            const current = await db.prepare("SELECT status FROM system_branches WHERE slug = ?").bind(body.slug).first();
            const nextStatus = current?.status === 'active' ? 'maintenance' : 'active';
            await db.prepare("UPDATE system_branches SET status = ? WHERE slug = ?").bind(nextStatus, body.slug).run();
            return jsonResponse({ status: 'success', newStatus: nextStatus });
        }

        // Register or update branch
        const { slug, name, code, project, url, database, databaseId, status } = body;
        if (!slug || !name || !code) {
            return errorResponse('กรุณาระบุข้อมูลสาขาให้ครบถ้วน (slug, name, code)', 400);
        }

        const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const cleanCode = code.trim().toUpperCase();
        const branchProject = project || `rubertrade-${cleanSlug}`;
        const branchUrl = url || `https://${branchProject}.pages.dev`;
        const branchDb = database || `rubertrade-${cleanSlug}-db`;
        const createdAt = body.createdAt || new Date().toISOString();

        await db.prepare(`
            INSERT INTO system_branches (slug, name, code, project, url, database, databaseId, createdAt, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET
                name = excluded.name,
                code = excluded.code,
                project = excluded.project,
                url = excluded.url,
                database = excluded.database,
                databaseId = COALESCE(excluded.databaseId, system_branches.databaseId),
                status = excluded.status
        `).bind(
            cleanSlug, 
            name.trim(), 
            cleanCode, 
            branchProject, 
            branchUrl, 
            branchDb, 
            databaseId || null, 
            createdAt, 
            status || 'active'
        ).run();

        return jsonResponse({ status: 'success', slug: cleanSlug });
    } catch (e) {
        console.error('Error modifying branch:', e);
        return errorResponse(e.message);
    }
}

export const onRequestGet = withSuperAdmin(handleGet);
export const onRequestPost = withSuperAdmin(handlePost);
