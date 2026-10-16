const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const USER_ID = '5a15e421-c70d-4c9b-82b1-532329495246';

const tables = [
    'farmers', 'staff', 'employees', 'buys', 'sells', 'expenses', 'wages',
    'promotions', 'settings', 'users', 'factories', 'trucks', 'chemical_usage',
    'subscription_requests', 'subscription_packages', 'farmer_types',
    'user_usage_stats', 'member_types', 'market_prices', 'api_rate_limits',
    'audit_logs', 'backups', 'counters', 'weather_forecasts', 'queues',
    'loans', 'loan_deductions', 'service_catalog', 'service_queues',
    'farmer_employees', 'daily_buys_summary', 'daily_sells_summary',
    'land_plots', 'store_stock_summary', 'coop_members', 'share_transactions',
    'dividend_periods', 'dividend_distributions', 'plot_activities',
    'savings_accounts', 'savings_transactions'
];

async function scan() {
    console.log(`Scanning all tables in Rubertrade-Co-Ltd-db for userId: ${USER_ID}...`);
    for (const t of tables) {
        try {
            const sql = `SELECT COUNT(*) as count FROM "${t}" WHERE userId = '${USER_ID}';`;
            const out = execSync(`npx wrangler d1 execute Rubertrade-Co-Ltd-db --remote --json --command="${sql}"`, {
                cwd: ROOT_DIR, stdio: ['pipe', 'pipe', 'pipe']
            });
            const res = JSON.parse(out.toString())[0]?.results[0]?.count;
            if (res > 0) {
                console.log(`✅ Table ${t}: ${res} rows`);
            }
        } catch (e) {
            // column userId might not exist
            try {
                const sql2 = `SELECT COUNT(*) as count FROM "${t}";`;
                const out2 = execSync(`npx wrangler d1 execute Rubertrade-Co-Ltd-db --remote --json --command="${sql2}"`, {
                    cwd: ROOT_DIR, stdio: ['pipe', 'pipe', 'pipe']
                });
                const res2 = JSON.parse(out2.toString())[0]?.results[0]?.count;
                // console.log(`Table ${t} (no userId column, total: ${res2})`);
            } catch (err) {}
        }
    }
}

scan().catch(console.error);
