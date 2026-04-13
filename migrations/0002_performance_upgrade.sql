-- Surgical Migration to support Scalability & Cup Lump Module --

-- 1. Add rubberType to buys
ALTER TABLE buys ADD COLUMN rubberType TEXT DEFAULT 'latex';

-- 2. Add updated_at to core tables for Incremental Sync
-- (Excluding 'settings' as it already has this column)
ALTER TABLE farmers ADD COLUMN updated_at DATETIME DEFAULT '2024-01-01 00:00:00';
ALTER TABLE staff ADD COLUMN updated_at DATETIME DEFAULT '2024-01-01 00:00:00';
ALTER TABLE employees ADD COLUMN updated_at DATETIME DEFAULT '2024-01-01 00:00:00';
ALTER TABLE buys ADD COLUMN updated_at DATETIME DEFAULT '2024-01-01 00:00:00';
ALTER TABLE sells ADD COLUMN updated_at DATETIME DEFAULT '2024-01-01 00:00:00';
ALTER TABLE expenses ADD COLUMN updated_at DATETIME DEFAULT '2024-01-01 00:00:00';
ALTER TABLE wages ADD COLUMN updated_at DATETIME DEFAULT '2024-01-01 00:00:00';
ALTER TABLE chemical_usage ADD COLUMN updated_at DATETIME DEFAULT '2024-01-01 00:00:00';

-- 3. Create market_prices table
CREATE TABLE IF NOT EXISTS market_prices (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    price REAL NOT NULL,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Set up Triggers for automated timestamp management
CREATE TRIGGER IF NOT EXISTS update_farmers_timestamp AFTER UPDATE ON farmers
BEGIN
    UPDATE farmers SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS update_staff_timestamp AFTER UPDATE ON staff
BEGIN
    UPDATE staff SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS update_buys_timestamp AFTER UPDATE ON buys
BEGIN
    UPDATE buys SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;

CREATE TRIGGER IF NOT EXISTS update_sells_timestamp AFTER UPDATE ON sells
BEGIN
    UPDATE sells SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;
