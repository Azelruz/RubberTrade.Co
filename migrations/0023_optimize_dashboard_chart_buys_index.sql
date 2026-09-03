-- Migration 0023: Optimize chart buys query with covering index
-- Fixes high row reads (363k) on Cloudflare D1 Dashboard chart queries

CREATE INDEX IF NOT EXISTS idx_buys_chart_data ON buys(userId, date, rubberType, total, pricePerKg);
