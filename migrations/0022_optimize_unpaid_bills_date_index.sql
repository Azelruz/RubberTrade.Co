-- Migration 0022: Optimize unpaid bills query with date-first composite index
-- Fixes high row reads (391k) on Cloudflare D1 Dashboard queries

DROP INDEX IF EXISTS idx_buys_user_status;

-- Index with (userId, date, farmerStatus, employeeStatus) allows SQLite to B-Tree range scan date >= monthStart first, then filter status in index
CREATE INDEX IF NOT EXISTS idx_buys_user_date_unpaid ON buys(userId, date, farmerStatus, employeeStatus);
