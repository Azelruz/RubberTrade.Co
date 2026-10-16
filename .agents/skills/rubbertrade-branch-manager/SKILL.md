---
name: rubbertrade-branch-manager
description: Manage and provision RubberTrade branches. Use when the user asks to create a new branch, provision Cloudflare D1/Pages for a branch, list all branches, deploy a single branch, or deploy to all branches.
---

# RubberTrade Branch Manager Skill

Use this skill when managing RubberTrade branches across Cloudflare Pages and Cloudflare D1 databases.

## 📌 Available Commands Cheatsheet

### 1. List All Active Branches
Displays all branches registered in `branches/registry.json`:
```bash
npm run branch:list
```

### 2. Create / Provision a New Branch (1-Click Automation)
Automatically:
1. Creates D1 Database `rubertrade-<slug>-db`
2. Applies 42-table schema (`schema_clean.sql`)
3. Creates Cloudflare Pages project `rubertrade-<slug>`
4. Binds D1 `DB`, R2 `BUCKET`, Workers AI `AI`
5. Sets production secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
6. Builds project and deploys to Cloudflare Pages
7. Registers branch in `branches/registry.json` and D1 `system_branches` table

```bash
# Non-interactive CLI:
node scripts/branch_manager.cjs create --slug="<slug>" --name="<branch_name>" --code="<station_code>"

# Interactive CLI:
npm run branch:create
```

### 3. Deploy to a Single Branch
Builds the app and deploys to the specified branch:
```bash
npm run branch:deploy -- --slug=<slug>
```

### 4. Deploy to ALL Branches (Production Rollout)
Builds the app once and deploys to all active branches in parallel/sequence:
```bash
npm run branch:deploy-all
```

## 🛠️ Key Reference Files
- Engine Script: [`scripts/branch_manager.cjs`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/scripts/branch_manager.cjs)
- Registry: [`branches/registry.json`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/branches/registry.json)
- Schema: [`schema_clean.sql`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/schema_clean.sql)
- Branch Switcher UI: [`src/components/Layout.jsx`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/src/components/Layout.jsx)
