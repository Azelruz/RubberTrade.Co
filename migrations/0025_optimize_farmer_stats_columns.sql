-- Migration 0025: Add lastBuyDate and buyCount directly to farmers table
-- Eliminates heavy subquery (reading 3.6k rows) on buys table

ALTER TABLE farmers ADD COLUMN lastBuyDate TEXT;
ALTER TABLE farmers ADD COLUMN buyCount INTEGER DEFAULT 0;

-- Backfill initial lastBuyDate and 60-day buyCount for existing farmers
UPDATE farmers
SET 
    lastBuyDate = (
        SELECT MAX(date) FROM buys WHERE buys.farmerId = farmers.id
    ),
    buyCount = (
        SELECT COUNT(*) FROM buys WHERE buys.farmerId = farmers.id AND buys.date >= date('now', '-60 days')
    );
