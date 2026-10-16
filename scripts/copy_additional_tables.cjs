const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_DB = 'Rubertrade-Co-Ltd-db';
const TARGET_DB = 'rubertrade-ache2-db';
const USER_ID = '5a15e421-c70d-4c9b-82b1-532329495246';
const ROOT_DIR = path.resolve(__dirname, '..');

function queryRemote(dbName, sql) {
    const cmd = `npx wrangler d1 execute ${dbName} --remote --json --command="${sql.replace(/"/g, '\\"')}"`;
    try {
        const out = execSync(cmd, { cwd: ROOT_DIR, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024 });
        const json = JSON.parse(out.toString());
        return json[0]?.results || [];
    } catch (e) {
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
    console.log('--- คัดลอกข้อมูลเพิ่มเติม: counters, daily summaries, stats, forecasts ---');
    const extraTables = [
        'counters',
        'daily_buys_summary',
        'daily_sells_summary',
        'user_usage_stats',
        'weather_forecasts'
    ];

    const tempSqlFile = path.join(ROOT_DIR, 'scratch', 'extra_clone.sql');
    const sqlStatements = ['PRAGMA foreign_keys = OFF;'];
    let total = 0;

    for (const table of extraTables) {
        const rows = queryRemote(SOURCE_DB, `SELECT * FROM ${table} WHERE userId = '${USER_ID}'`);
        if (rows && rows.length > 0) {
            console.log(`📋 ตาราง ${table}: ${rows.length} รายการ`);
            total += rows.length;
            for (const row of rows) {
                const cols = Object.keys(row);
                const colNames = cols.map(c => `"${c}"`).join(', ');
                const valStrings = cols.map(c => escapeSqlVal(row[c])).join(', ');
                sqlStatements.push(`INSERT OR REPLACE INTO "${table}" (${colNames}) VALUES (${valStrings});`);
            }
        }
    }

    sqlStatements.push('PRAGMA foreign_keys = ON;');

    if (total > 0) {
        fs.writeFileSync(tempSqlFile, sqlStatements.join('\n'), 'utf8');
        execSync(`npx wrangler d1 execute ${TARGET_DB} --remote --file="${tempSqlFile}"`, {
            cwd: ROOT_DIR,
            stdio: 'inherit'
        });
        fs.unlinkSync(tempSqlFile);
        console.log(`✅ นำเข้าข้อมูลเพิ่มเติม ${total} รายการเรียบร้อย!`);
    } else {
        console.log('ไม่พบข้อมูลเพิ่มเติม');
    }
}

main().catch(console.error);
