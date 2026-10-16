---
name: rubbertrade-data-cloner
description: Clone and transfer tenant data (farmers, staff, buys, settings, counters) between RubberTrade Cloudflare D1 branch databases. Use when the user asks to copy user data from one branch to another or migrate a user to a new branch.
---

# RubberTrade Tenant Data Cloner Skill

Use this skill when copying, migrating, or cloning farmer data, staff, buy transaction history, counters, and settings between Cloudflare D1 databases for RubberTrade.

## 📌 Usage Instructions

### Step 1: Identify User ID
Look up user's UUID from their email:
```bash
npx wrangler d1 execute Rubertrade-Co-Ltd-db --remote --command="SELECT id, email FROM user_profiles WHERE email = '<target_email>';"
```
Or check Supabase Auth.

### Step 2: Run Core Data Cloner
Clones `farmers`, `staff`, `employees`, `farmer_employees`, `buys`, and `counters`:
```bash
node scripts/clone_user_data.cjs --source="<source_db>" --dest="<dest_db>" --user="<user_id_or_email>"
```

### Step 3: Run Supplementary Tables Cloner
Clones `settings`, `daily_buys_summary`, `price_adjustments`, `activity_logs`, and other auxiliary tables:
```bash
node scripts/copy_additional_tables.cjs --source="<source_db>" --dest="<dest_db>" --user="<user_id_or_email>"
```

### Step 4: Verify Row Counts & Indices
Confirm data was transferred accurately:
```bash
npx wrangler d1 execute <dest_db> --remote --command="SELECT 'farmers', count(*) FROM farmers WHERE user_id = '<user_id>' UNION ALL SELECT 'buys', count(*) FROM buys WHERE user_id = '<user_id>';"
```

## 🛠️ Key Reference Files
- Core Cloner Script: [`scripts/clone_user_data.cjs`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/scripts/clone_user_data.cjs)
- Supplementary Cloner Script: [`scripts/copy_additional_tables.cjs`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/scripts/copy_additional_tables.cjs)
- Schema: [`schema_clean.sql`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/schema_clean.sql)
