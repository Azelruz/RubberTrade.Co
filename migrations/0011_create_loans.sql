-- Migration: Create loans and loan_deductions tables for Cash Advance workflow
CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    borrowerType TEXT NOT NULL,
    borrowerId TEXT NOT NULL,
    borrowerName TEXT NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    remainingAmount REAL NOT NULL,
    deductionMethod TEXT DEFAULT 'full',
    deductionValue REAL DEFAULT 0,
    note TEXT,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(userId, borrowerId);

CREATE TABLE IF NOT EXISTS loan_deductions (
    id TEXT PRIMARY KEY,
    buyId TEXT NOT NULL,
    borrowerType TEXT NOT NULL,
    borrowerId TEXT NOT NULL,
    amount REAL NOT NULL,
    remainingDebtAfter REAL NOT NULL,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loan_deductions_buy ON loan_deductions(userId, buyId);
CREATE INDEX IF NOT EXISTS idx_loan_deductions_borrower ON loan_deductions(userId, borrowerId);
