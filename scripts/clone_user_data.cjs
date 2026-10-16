const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_DB = 'Rubertrade-Co-Ltd-db';
const TARGET_DB = 'rubertrade-ache2-db';
const TARGET_EMAIL = process.argv[2] || 'supawadee165@gmail.com';
const ROOT_DIR = path.resolve(__dirname, '..');

function queryRemote(dbName, sql) {
    const cmd = `npx wrangler d1 execute ${dbName} --remote --json --command="${sql.replace(/"/g, '\\"')}"`;
    try {
        const out = execSync(cmd, { cwd: ROOT_DIR, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024 });
        const json = JSON.parse(out.toString());
        return json[0]?.results || [];
    } catch (e) {
        // If error or table doesn't exist, return empty
        return [];
    }
}

function escapeSqlVal(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 1 : 0;
    return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
    console.log('=============================================================');
    console.log(`🚀 กำลังคัดลอกข้อมูลของบัญชี: ${TARGET_EMAIL}`);
    console.log(`📦 จากฐานข้อมูล: ${SOURCE_DB} (สำนักงานใหญ่)`);
    console.log(`🎯 สู่ฐานข้อมูล: ${TARGET_DB} (สาขาอาเช่2)`);
    console.log('=============================================================\n');

    // 1. Find User
    const userRows = queryRemote(SOURCE_DB, `SELECT * FROM users WHERE LOWER(email) = LOWER('${TARGET_EMAIL}')`);
    if (!userRows || userRows.length === 0) {
        console.error(`❌ ไม่พบบัญชีผู้ใช้ที่มีอีเมล: ${TARGET_EMAIL} ในฐานข้อมูลหลัก`);
        process.exit(1);
    }

    const mainUser = userRows[0];
    const userId = mainUser.id;
    console.log(`✅ พบบัญชีผู้ใช้: ID = ${userId}, Username = ${mainUser.username}, Role = ${mainUser.role}`);

    // Find staff accounts under this user
    const staffUserRows = queryRemote(SOURCE_DB, `SELECT * FROM users WHERE parentId = '${userId}'`);
    const allUserIds = [userId, ...staffUserRows.map(u => u.id)];
    const idListStr = allUserIds.map(id => `'${id}'`).join(', ');

    console.log(`👥 บัญชีผู้ใช้หลัก + พนักงานในสังกัด รวม ${allUserIds.length} บัญชี\n`);

    // Tables to clone
    const tables = [
        'users',
        'settings',
        'farmers',
        'farmer_types',
        'staff',
        'employees',
        'farmer_employees',
        'factories',
        'trucks',
        'buys',
        'sells',
        'expenses',
        'wages',
        'chemicals',
        'chemical_usage',
        'promotions',
        'land_plots',
        'plot_activities',
        'coop_members',
        'savings_accounts',
        'savings_transactions',
        'loans',
        'loan_deductions',
        'share_transactions',
        'dividend_periods',
        'dividend_distributions',
        'store_stock_summary'
    ];

    let totalRowsCloned = 0;
    const tempSqlFile = path.join(ROOT_DIR, 'scratch', 'temp_clone.sql');
    if (!fs.existsSync(path.dirname(tempSqlFile))) fs.mkdirSync(path.dirname(tempSqlFile), { recursive: true });

    const sqlStatements = ['PRAGMA foreign_keys = OFF;'];

    for (const table of tables) {
        let rows = [];
        if (table === 'users') {
            rows = [...userRows, ...staffUserRows];
        } else {
            // Check if table has userId column
            rows = queryRemote(SOURCE_DB, `SELECT * FROM ${table} WHERE userId IN (${idListStr})`);
        }

        if (rows && rows.length > 0) {
            console.log(`📋 ตาราง ${table}: พบข้อมูล ${rows.length} รายการ`);
            totalRowsCloned += rows.length;

            for (const row of rows) {
                const cols = Object.keys(row);
                const colNames = cols.map(c => `"${c}"`).join(', ');
                const valStrings = cols.map(c => escapeSqlVal(row[c])).join(', ');
                sqlStatements.push(`INSERT OR REPLACE INTO "${table}" (${colNames}) VALUES (${valStrings});`);
            }
        }
    }

    sqlStatements.push('PRAGMA foreign_keys = ON;');

    if (totalRowsCloned === 0) {
        console.log('ℹ️ ไม่พบข้อมูลที่เกี่ยวข้องกับผู้ใช้นี้ในตารางใดๆ');
        return;
    }

    console.log(`\n💾 กำลังเขียนไฟล์คำสั่ง SQL จำนวน ${sqlStatements.length} คำสั่ง (รวม ${totalRowsCloned} แถว)...`);
    fs.writeFileSync(tempSqlFile, sqlStatements.join('\n'), 'utf8');

    console.log(`🚀 กำลังนำเข้าข้อมูลเข้าสู่ ${TARGET_DB}...`);
    try {
        execSync(`npx wrangler d1 execute ${TARGET_DB} --remote --file="${tempSqlFile}"`, {
            cwd: ROOT_DIR,
            stdio: 'inherit'
        });
        console.log('\n=============================================================');
        console.log('🎉🎉🎉 คัดลอกข้อมูลสู่สาขาอาเช่2 สำเร็จสมบูรณ์ 100%! 🎉🎉🎉');
        console.log(`📊 ยอดข้อมูลทั้งหมดที่คัดลอก: ${totalRowsCloned} รายการ`);
        console.log(`🏢 บัญชี ${TARGET_EMAIL} สามารถล็อกอินและเข้าใช้งานข้อมูลในสาขาอาเช่2 ได้ทันที`);
        console.log(`🌐 เข้าใช้งานได้ที่: https://rubertrade-ache2.pages.dev`);
        console.log('=============================================================\n');
    } catch (err) {
        console.error('❌ นำเข้าข้อมูลล้มเหลว:', err.message);
    } finally {
        if (fs.existsSync(tempSqlFile)) {
            fs.unlinkSync(tempSqlFile);
        }
    }
}

main().catch(console.error);
