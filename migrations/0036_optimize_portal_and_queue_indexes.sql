-- Migration 0036: Optimize Portal and Queue Indexes
-- Speeds up public portal lookup and prevents table scans

CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone);
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);
CREATE INDEX IF NOT EXISTS idx_buys_user_farmername ON buys(userId, farmerName);
