const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ACCOUNT_ID = '2b00394b61f63fdb6d5b87d7fb2df0ff';
const SUPABASE_URL = 'https://lmlxvruuwdsubhggoewc.supabase.co';
const VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtbHh2cnV1d2RzdWJoZ2dvZXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2OTg5NjMsImV4cCI6MjA5MTI3NDk2M30.nLECyltanRQfxmEL7g_SPqsLZxnSJc-TbrBMIofc7-E';
const VITE_SENTRY_DSN = 'https://ca791170bc46f0d35ebaf7fa6661d98d@o4512198695190528.ingest.de.sentry.io/4512198733201488';
const BUCKET_NAME = 'rubertrade-co-ltd-bucket';

const ROOT_DIR = path.resolve(__dirname, '..');
const REGISTRY_FILE = path.join(ROOT_DIR, 'branches', 'registry.json');
const SCHEMA_FILE = path.join(ROOT_DIR, 'schema_clean.sql');

function getAuthToken() {
    if (process.env.CLOUDFLARE_API_TOKEN) {
        return process.env.CLOUDFLARE_API_TOKEN;
    }
    const tokenFile = 'C:\\Users\\pond_\\AppData\\Roaming\\xdg.config\\.wrangler\\config\\default.toml';
    if (fs.existsSync(tokenFile)) {
        const content = fs.readFileSync(tokenFile, 'utf8');
        const m = content.match(/oauth_token\s*=\s*"([^"]+)"/);
        if (m) return m[1];
    }
    throw new Error('Cloudflare Auth Token not found. Please log in with wrangler login.');
}

function getRegistry() {
    if (!fs.existsSync(REGISTRY_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function saveRegistry(registry) {
    const dir = path.dirname(REGISTRY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
}

async function cfApi(endpoint, options = {}) {
    const token = getAuthToken();
    const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });
    const json = await res.json();
    return json;
}

// 1. LIST BRANCHES
function listBranches() {
    const reg = getRegistry();
    console.log('\n=============================================================');
    console.log('         🌿 RUBBERTRADE REGISTERED BRANCHES (SUPER ADMIN)      ');
    console.log('=============================================================');
    if (reg.length === 0) {
        console.log('ยังไม่มีสาขาที่ลงทะเบียน');
        return;
    }
    console.table(reg.map(b => ({
        'Slug': b.slug,
        'รหัสสาขา': b.code,
        'ชื่อสาขา': b.name,
        'Project Name': b.project,
        'URL': b.url,
        'Database': b.database
    })));
    console.log(`รวมทั้งหมด ${reg.length} สาขา\n`);
}

// 2. CREATE BRANCH (1-CLICK PROVISION)
async function createBranch(rawSlug, rawCode, rawName) {
    const slug = (rawSlug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
    const code = (rawCode || '').trim().toUpperCase();
    const name = (rawName || `สาขา ${slug}`).trim();

    if (!slug) throw new Error('กรุณาระบุชื่อย่อภาษาอังกฤษสำหรับ URL (เช่น padang, surat, hatyai)');
    if (!code) throw new Error('กรุณาระบุรหัสสถานี (Station Code เช่น PDG, SRT, HYI)');

    const registry = getRegistry();
    if (registry.some(b => b.slug === slug)) {
        throw new Error(`สาขา "${slug}" มีอยู่ในระบบแล้ว! กรุณาใช้คำสั่ง deploy หากต้องการอัปเดตโค้ด`);
    }

    const projectName = `rubertrade-${slug}`;
    const dbName = `rubertrade-${slug}-db`;
    const branchUrl = `https://${projectName}.pages.dev`;

    console.log('\n=============================================================');
    console.log(`🚀 กำลังสร้างสาขาใหม่: ${name} (${code})`);
    console.log(`🌐 Project URL: ${branchUrl}`);
    console.log(`🗄️ Database: ${dbName}`);
    console.log('=============================================================\n');

    // Step 2.1: Create D1 Database
    console.log('📦 ขั้นตอนที่ 1/5: สร้างฐานข้อมูล Cloudflare D1...');
    let dbId = null;
    const d1Res = await cfApi('/d1/database', {
        method: 'POST',
        body: JSON.stringify({ name: dbName })
    });
    if (d1Res.success && d1Res.result?.uuid) {
        dbId = d1Res.result.uuid;
        console.log(`✅ สร้างฐานข้อมูลสำเร็จ: ${dbName} (ID: ${dbId})`);
    } else {
        // Fallback: check if DB already exists
        const listRes = await cfApi('/d1/database');
        const existing = (listRes.result || []).find(d => d.name === dbName);
        if (existing) {
            dbId = existing.uuid;
            console.log(`ℹ️ พบฐานข้อมูลเดิม: ${dbName} (ID: ${dbId})`);
        } else {
            throw new Error(`สร้างฐานข้อมูลล้มเหลว: ${JSON.stringify(d1Res.errors)}`);
        }
    }

    // Step 2.2: Execute Schema & Initial Branch Settings
    console.log('\n📦 ขั้นตอนที่ 2/5: ติดตั้งตารางระบบ 42 ตารางเข้าสู่ฐานข้อมูล...');
    if (!fs.existsSync(SCHEMA_FILE)) {
        throw new Error(`ไม่พบไฟล์โครงสร้างฐานข้อมูล: ${SCHEMA_FILE}`);
    }
    
    try {
        execSync(`npx wrangler d1 execute ${dbName} --remote --file="${SCHEMA_FILE}"`, {
            cwd: ROOT_DIR,
            stdio: 'inherit'
        });
        console.log('✅ ติดตั้งตารางระบบสำเร็จ!');

        // Insert initial branch settings (name & station code)
        console.log(`⚙️ ตั้งค่าเริ่มต้นสาขา: ${name} | รหัสสถานี: ${code}...`);
        const initSettingsSql = `INSERT INTO settings (key, value, userId, updated_at) VALUES ('factoryName', '${name}', 'root', CURRENT_TIMESTAMP), ('station_code', '${code}', 'root', CURRENT_TIMESTAMP) ON CONFLICT(key, userId) DO UPDATE SET value = excluded.value;`;
        execSync(`npx wrangler d1 execute ${dbName} --remote --command="${initSettingsSql}"`, {
            cwd: ROOT_DIR,
            stdio: 'pipe'
        });
        console.log('✅ ตั้งค่าสาขาเริ่มต้นเรียบร้อย');
    } catch (err) {
        throw new Error(`การรัน Schema ล้มเหลว: ${err.message}`);
    }

    // Step 2.3: Create Pages Project if not exists
    console.log('\n📦 ขั้นตอนที่ 3/5: สร้างโปรเจกต์ Cloudflare Pages...');
    try {
        execSync(`npx wrangler pages project create ${projectName} --production-branch main`, {
            cwd: ROOT_DIR,
            stdio: 'pipe'
        });
        console.log(`✅ สร้างโปรเจกต์ Pages "${projectName}" สำเร็จ`);
    } catch (e) {
        console.log(`ℹ️ โปรเจกต์ "${projectName}" อาจมีอยู่แล้ว ดำเนินการต่อ...`);
    }

    // Step 2.4: Patch Bindings & Secrets via API
    console.log('\n📦 ขั้นตอนที่ 4/5: ผูกฐานข้อมูล D1, R2, AI และคีย์ความปลอดภัย...');
    const patchPayload = {
        deployment_configs: {
            preview: {
                env_vars: {
                    SUPABASE_URL: { type: 'secret_text', value: SUPABASE_URL },
                    VITE_SUPABASE_URL: { type: 'secret_text', value: SUPABASE_URL },
                    VITE_SUPABASE_ANON_KEY: { type: 'secret_text', value: VITE_SUPABASE_ANON_KEY },
                    VITE_SENTRY_DSN: { type: 'secret_text', value: VITE_SENTRY_DSN }
                },
                d1_databases: { DB: { id: dbId } },
                r2_buckets: { BUCKET: { name: BUCKET_NAME } },
                ai_bindings: { AI: {} },
                compatibility_date: '2024-03-12'
            },
            production: {
                env_vars: {
                    SUPABASE_URL: { type: 'secret_text', value: SUPABASE_URL },
                    VITE_SUPABASE_URL: { type: 'secret_text', value: SUPABASE_URL },
                    VITE_SUPABASE_ANON_KEY: { type: 'secret_text', value: VITE_SUPABASE_ANON_KEY },
                    VITE_SENTRY_DSN: { type: 'secret_text', value: VITE_SENTRY_DSN }
                },
                d1_databases: { DB: { id: dbId } },
                r2_buckets: { BUCKET: { name: BUCKET_NAME } },
                ai_bindings: { AI: {} },
                compatibility_date: '2024-03-12'
            }
        }
    };


    const patchRes = await cfApi(`/pages/projects/${projectName}`, {
        method: 'PATCH',
        body: JSON.stringify(patchPayload)
    });
    if (!patchRes.success) {
        console.warn('คำเตือน: การ Patch Config ผ่าน API มีข้อความ:', patchRes.errors);
    } else {
        console.log(`✅ ผูก Database D1 (${dbId}) และ Secrets เรียบร้อย`);
    }

    // Generate branch-specific wrangler config
    const branchTomlPath = path.join(ROOT_DIR, 'branches', `wrangler.${slug}.toml`);
    const tomlContent = `name = "${projectName}"
pages_build_output_dir = "dist"
compatibility_date = "2024-03-12"

[[d1_databases]]
binding = "DB"
database_name = "${dbName}"
database_id = "${dbId}"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "${BUCKET_NAME}"

[ai]
binding = "AI"
`;
    fs.writeFileSync(branchTomlPath, tomlContent, 'utf8');

    // Step 2.5: Build and Deploy to the new project
    console.log('\n📦 ขั้นตอนที่ 5/5: คอมไพล์และ Deploy เว็บไซต์สาขาขึ้น Cloudflare...');
    deployProjectWithConfig(branchTomlPath, projectName, 'main');

    // Save into registry
    const newBranch = {
        slug,
        name,
        code,
        project: projectName,
        url: branchUrl,
        database: dbName,
        databaseId: dbId,
        createdAt: new Date().toISOString(),
        status: 'active'
    };
    registry.push(newBranch);
    saveRegistry(registry);

    // Sync to main D1 system_branches table
    try {
        const syncSql = `CREATE TABLE IF NOT EXISTS system_branches (slug TEXT PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL, project TEXT NOT NULL, url TEXT NOT NULL, database TEXT NOT NULL, databaseId TEXT, createdAt TEXT NOT NULL, status TEXT DEFAULT 'active'); INSERT INTO system_branches (slug, name, code, project, url, database, databaseId, createdAt, status) VALUES ('${slug}', '${name}', '${code}', '${projectName}', '${branchUrl}', '${dbName}', '${dbId}', '${newBranch.createdAt}', 'active') ON CONFLICT(slug) DO UPDATE SET name=excluded.name, code=excluded.code, project=excluded.project, url=excluded.url, database=excluded.database, databaseId=excluded.databaseId;`;
        execSync(`npx wrangler d1 execute Rubertrade-Co-Ltd-db --remote --command="${syncSql}"`, {
            cwd: ROOT_DIR,
            stdio: 'pipe'
        });
        console.log('✅ ซิงค์ข้อมูลสาขาลงฐานข้อมูลระบบหลัก (D1) เรียบร้อย');
    } catch (e) {
        console.warn('⚠️ ซิงค์ข้อมูลลง D1 หลักไม่สำเร็จ:', e.message);
    }

    console.log('\n=============================================================');
    console.log('🎉🎉🎉 สร้างสาขาใหม่สำเร็จสมบูรณ์ 100%! 🎉🎉🎉');
    console.log(`🏢 ชื่อสาขา: ${name} (รหัสสถานี: ${code})`);
    console.log(`🌐 เข้าใช้งานได้ที่: ${branchUrl}`);
    console.log(`🗄️ ฐานข้อมูล D1: ${dbName} (ID: ${dbId})`);
    console.log('=============================================================\n');
    return newBranch;
}

// 3. DEPLOY FUNCTION HELPER
function deployProjectWithConfig(tomlPath, projectName, branchName = 'main') {
    const mainTomlPath = path.join(ROOT_DIR, 'wrangler.toml');
    const backupTomlPath = path.join(ROOT_DIR, 'wrangler.backup.toml');

    const hasBackup = fs.existsSync(mainTomlPath);
    if (hasBackup) {
        fs.copyFileSync(mainTomlPath, backupTomlPath);
    }

    try {
        fs.copyFileSync(tomlPath, mainTomlPath);
        console.log(`🚀 กำลัง Deploy สู่ ${projectName} (branch: ${branchName})...`);
        execSync(`npx wrangler pages deploy dist --project-name ${projectName} --branch ${branchName}`, {
            cwd: ROOT_DIR,
            stdio: 'inherit'
        });
        console.log(`✨ Deploy สู่ ${projectName} สำเร็จเรียบร้อย!`);
    } finally {
        if (hasBackup && fs.existsSync(backupTomlPath)) {
            fs.copyFileSync(backupTomlPath, mainTomlPath);
            fs.unlinkSync(backupTomlPath);
        }
    }
}

// 4. DEPLOY SPECIFIC BRANCH
function deployBranch(slug, branchName = 'main') {
    const registry = getRegistry();
    const branch = registry.find(b => b.slug === slug);
    if (!branch) {
        throw new Error(`ไม่พบสาขา "${slug}" ในระบบ (พิมพ์ npm run branch:list เพื่อดูรายชื่อ)`);
    }

    let tomlPath = path.join(ROOT_DIR, 'branches', `wrangler.${slug}.toml`);
    if (!fs.existsSync(tomlPath)) {
        if (slug === 'main') {
            tomlPath = path.join(ROOT_DIR, 'wrangler.toml');
        } else {
            throw new Error(`ไม่พบไฟล์คอนฟิก: ${tomlPath}`);
        }
    }

    console.log(`\n🔄 เริ่มกระบวนการ Deploy สาขา: ${branch.name} (${branch.project})...`);
    console.log('🛠️ คอมไพล์โค้ดล่าสุด (npm run build)...');
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });

    deployProjectWithConfig(tomlPath, branch.project, branchName);
}

// 5. DEPLOY ALL BRANCHES
function deployAll() {
    const registry = getRegistry();
    if (registry.length === 0) {
        console.log('ยังไม่มีสาขาในระบบ');
        return;
    }

    console.log(`\n🚀 เริ่มกระบวนการ Deploy โค้ดล่าสุดไปยังทุกสาขา (ทั้งหมด ${registry.length} สาขา)...`);
    console.log('🛠️ คอมไพล์โค้ดล่าสุด 1 ครั้งสำหรับทุกสาขา (npm run build)...');
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });

    for (const b of registry) {
        console.log(`\n-------------------------------------------------------------`);
        console.log(`📦 กำลังอัปเดตสาขา: ${b.name} (${b.project})...`);
        let tomlPath = path.join(ROOT_DIR, 'branches', `wrangler.${b.slug}.toml`);
        if (!fs.existsSync(tomlPath)) {
            tomlPath = path.join(ROOT_DIR, 'branches', 'wrangler.main.toml');
        }
        deployProjectWithConfig(tomlPath, b.project, 'main');
    }
    console.log('\n=============================================================');
    console.log('🎉 อัปเดตโค้ดล่าสุดไปยังทุกสาขาสำเร็จครบถ้วน 100%!');
    console.log('=============================================================\n');
}

function parseArgs(rawArgs) {
    const parsed = { _: [] };
    for (let i = 0; i < rawArgs.length; i++) {
        const arg = rawArgs[i];
        if (arg.startsWith('--')) {
            const parts = arg.slice(2).split('=');
            const key = parts[0];
            const val = parts.length > 1 ? parts.slice(1).join('=') : (rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-') ? rawArgs[++i] : true);
            parsed[key] = val;
        } else if (arg.startsWith('-')) {
            const key = arg.slice(1);
            const val = rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-') ? rawArgs[++i] : true;
            parsed[key] = val;
        } else {
            parsed._.push(arg);
        }
    }
    return parsed;
}

// CLI RUNNER
async function main() {
    const rawArgs = process.argv.slice(2);
    const parsed = parseArgs(rawArgs);
    const command = parsed._[0] || 'list';

    try {
        switch (command) {
            case 'list':
                listBranches();
                break;
            case 'create':
                const slug = parsed.slug || parsed._[1];
                const code = parsed.code || parsed._[2];
                const name = parsed.name || parsed._[3];
                if (!slug || !code) {
                    console.log('วิธีใช้: npm run branch:create -- --slug=<slug> --code=<code> [--name=<name>]');
                    console.log('หรือ: node scripts/branch_manager.cjs create <slug> <station-code> [ชื่อสาขา]');
                    console.log('ตัวอย่าง: npm run branch:create -- --slug=ache2 --code=SUP --name="อาเช่2"');
                    process.exit(1);
                }
                await createBranch(slug, code, name);
                break;
            case 'deploy':
                const targetSlug = parsed.slug || parsed._[1];
                if (!targetSlug) {
                    console.log('วิธีใช้: npm run branch:deploy -- --slug=<slug>');
                    console.log('หรือ: node scripts/branch_manager.cjs deploy <slug>');
                    process.exit(1);
                }
                deployBranch(targetSlug, parsed.branch || parsed._[2] || 'main');
                break;
            case 'deploy-all':
                deployAll();
                break;
            default:
                console.log(`คำสั่งไม่ถูกต้อง: ${command}`);
                console.log('คำสั่งที่รองรับ: list, create, deploy, deploy-all');
                process.exit(1);
        }
    } catch (err) {
        console.error('\n❌ เกิดข้อผิดพลาด:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    listBranches,
    createBranch,
    deployBranch,
    deployAll,
    getRegistry
};
