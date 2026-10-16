-- Migration 0033: Member Savings Accounts (Multi-Account), Transactions & Interest (v1.8.3)

-- 1. Add savingsBalance column to coop_members (Stores cached total across all accounts for fast reads)
ALTER TABLE coop_members ADD COLUMN savingsBalance REAL DEFAULT 0;

-- 2. Create savings_accounts table for multiple passbooks/accounts per member
CREATE TABLE IF NOT EXISTS savings_accounts (
    id TEXT PRIMARY KEY,
    memberId TEXT NOT NULL,
    accountNo TEXT NOT NULL,
    accountName TEXT NOT NULL, -- e.g. 'ออมทรัพย์สัจจะทั่วไป', 'เงินออมเพื่อการศึกษาบุตร', 'เงินฝากพิเศษ'
    accountType TEXT DEFAULT 'savings', -- 'savings', 'fixed', 'welfare', 'other'
    balance REAL DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'closed'
    openedDate TEXT NOT NULL,
    interestRate REAL DEFAULT 0,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memberId) REFERENCES coop_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_savings_acc_user_member ON savings_accounts(userId, memberId);
CREATE INDEX IF NOT EXISTS idx_savings_acc_user_no ON savings_accounts(userId, accountNo);
CREATE INDEX IF NOT EXISTS idx_savings_acc_user_status ON savings_accounts(userId, status);

-- 3. Create savings_transactions table for deposits, withdrawals, and interest per account
CREATE TABLE IF NOT EXISTS savings_transactions (
    id TEXT PRIMARY KEY,
    accountId TEXT,
    memberId TEXT NOT NULL,
    accountNo TEXT,
    date TEXT NOT NULL,
    type TEXT NOT NULL, -- 'deposit', 'withdraw', 'interest'
    amount REAL NOT NULL,
    balanceAfter REAL NOT NULL,
    paymentMethod TEXT DEFAULT 'cash',
    receiptUrl TEXT,
    note TEXT,
    recordedBy TEXT,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES savings_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (memberId) REFERENCES coop_members(id) ON DELETE CASCADE
);

-- 4. High-performance covering indexes for D1
CREATE INDEX IF NOT EXISTS idx_savings_tx_user_date ON savings_transactions(userId, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_savings_tx_user_member ON savings_transactions(userId, memberId, date DESC);
CREATE INDEX IF NOT EXISTS idx_savings_tx_user_acc ON savings_transactions(userId, accountId, date DESC);
CREATE INDEX IF NOT EXISTS idx_savings_tx_user_type ON savings_transactions(userId, type);
