-- Migration 0021: Create daily_sells_summary table and additional performance indexes for loans and audit logs

CREATE TABLE IF NOT EXISTS daily_sells_summary (
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    totalWeight REAL DEFAULT 0,
    latexTotal REAL DEFAULT 0,
    cupLumpTotal REAL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (userId, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_sells_user_date ON daily_sells_summary(userId, date DESC);

-- Backfill initial daily_sells_summary data from existing sells table
INSERT INTO daily_sells_summary (userId, date, totalAmount, totalWeight, latexTotal, cupLumpTotal)
SELECT 
    userId,
    date,
    SUM(total) as totalAmount,
    SUM(weight) as totalWeight,
    SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN total ELSE 0 END) as latexTotal,
    SUM(CASE WHEN (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN total ELSE 0 END) as cupLumpTotal
FROM sells
GROUP BY userId, date
ON CONFLICT(userId, date) DO UPDATE SET
    totalAmount = excluded.totalAmount,
    totalWeight = excluded.totalWeight,
    latexTotal = excluded.latexTotal,
    cupLumpTotal = excluded.cupLumpTotal,
    updated_at = datetime('now');

-- Index for loans date and borrower query (Item 10)
CREATE INDEX IF NOT EXISTS idx_loans_user_date ON loans(userId, date DESC, created_at DESC);

-- Index for audit logs query (Item 12)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(userId, created_at DESC);
