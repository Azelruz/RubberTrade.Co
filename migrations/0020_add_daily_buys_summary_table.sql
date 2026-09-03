-- Migration 0020: Create daily_buys_summary table for ultrafast dashboard aggregation (~30 rows read max)

CREATE TABLE IF NOT EXISTS daily_buys_summary (
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    totalWeight REAL DEFAULT 0,
    latexTotal REAL DEFAULT 0,
    cupLumpTotal REAL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (userId, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_buys_user_date ON daily_buys_summary(userId, date DESC);

-- Backfill initial daily_buys_summary data from existing buys table
INSERT INTO daily_buys_summary (userId, date, totalAmount, totalWeight, latexTotal, cupLumpTotal)
SELECT 
    userId,
    date,
    SUM(total) as totalAmount,
    SUM(weight - bucketWeight) as totalWeight,
    SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN total ELSE 0 END) as latexTotal,
    SUM(CASE WHEN (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN total ELSE 0 END) as cupLumpTotal
FROM buys
GROUP BY userId, date
ON CONFLICT(userId, date) DO UPDATE SET
    totalAmount = excluded.totalAmount,
    totalWeight = excluded.totalWeight,
    latexTotal = excluded.latexTotal,
    cupLumpTotal = excluded.cupLumpTotal,
    updated_at = datetime('now');
