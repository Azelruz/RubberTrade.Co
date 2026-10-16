---
name: rubbertrade-savings-manager
description: Manage member savings accounts, deposits, withdrawals, passbook printing, and interest distribution for RubberTrade Cooperatives. Use when the user asks to manage member savings, check deposit balances, perform deposit/withdrawal, distribute savings interest, or troubleshoot cooperative passbooks.
---

# RubberTrade Member Savings & Passbook Manager Skill

Use this skill when managing member savings accounts, processing deposits and withdrawals, computing and distributing interest, or reviewing savings transactions for the RubberTrade cooperative module.

## 📌 Key Capabilities

### 1. Multi-Account Passbook Architecture
- Members can hold multiple savings accounts (`savings_accounts` table):
  - `SA-<memberNo>-01`: Default passbook ("ออมทรัพย์สัจจะทั่วไป")
  - Custom passbooks: Education savings, emergency funds, welfare savings
- Total member balance is cached in `coop_members.savingsBalance`.

### 2. Processing Deposits & Withdrawals
- **Deposit**: Adds amount to account balance, increases member total savings balance, records transaction with payment method (cash/transfer).
- **Withdrawal**: Verifies available funds before execution (`account.balance >= amount`). Prevents overdraft. Reduces account and member balance.
- **Rollback on Deletion**: When an erroneous transaction is deleted, the balance is cleanly restored.

### 3. Automated Interest Distribution Wizard
- Simulates interest payout:
  ```http
  GET /api/savings/calculate-interest?rate=2.0&months=12
  ```
- Posts batch interest payouts:
  ```http
  POST /api/savings-transactions
  {
    "action": "bulk_interest",
    "distributions": [{ "accountId": "...", "memberId": "...", "amount": 150.0 }],
    "note": "ดอกเบี้ยเงินฝากสะสม"
  }
  ```

### 4. Thermal Receipt & Statement Printing
- Integrates with ESC/POS Bluetooth thermal printers (58mm/80mm) and A4 print engines (`SavingsReceiptModal.jsx`).
- Passbook transaction statement view and printout.

## 🛠️ Key Reference Files
- Frontend UI:
  - [`src/pages/cooperatives/SavingsTab.jsx`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/src/pages/cooperatives/SavingsTab.jsx)
  - [`src/pages/cooperatives/OpenAccountModal.jsx`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/src/pages/cooperatives/OpenAccountModal.jsx)
  - [`src/pages/cooperatives/SavingsReceiptModal.jsx`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/src/pages/cooperatives/SavingsReceiptModal.jsx)
  - [`src/pages/cooperatives/MemberQRModal.jsx`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/src/pages/cooperatives/MemberQRModal.jsx)
- Backend APIs:
  - [`functions/api/savings-accounts.js`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/functions/api/savings-accounts.js)
  - [`functions/api/savings-transactions.js`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/functions/api/savings-transactions.js)
  - [`functions/api/savings/calculate-interest.js`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/functions/api/savings/calculate-interest.js)
- Schema:
  - [`migrations/0033_member_savings_accounts.sql`](file:///d:/pond/Antigravity/Rubertrade-Co-Ltd/migrations/0033_member_savings_accounts.sql)
