-- Migration: Add userId to all tables for multi-tenancy
-- Note: SQLite doesn't support adding a column with a DEFAULT and NOT NULL in one step if there's existing data without a default.
-- We'll add them as nullable first.

ALTER TABLE farmers ADD COLUMN userId TEXT;
ALTER TABLE staff ADD COLUMN userId TEXT;
ALTER TABLE employees ADD COLUMN userId TEXT;
ALTER TABLE buys ADD COLUMN userId TEXT;
ALTER TABLE sells ADD COLUMN userId TEXT;
ALTER TABLE expenses ADD COLUMN userId TEXT;
ALTER TABLE wages ADD COLUMN userId TEXT;
ALTER TABLE promotions ADD COLUMN userId TEXT;
-- Recreate settings table with composite PRIMARY KEY (key, userId)
-- This is necessary because SQLite doesn't allow changing PRIMARY KEY with ALTER TABLE
CREATE TABLE settings_new (
    key TEXT,
    value TEXT,
    userId TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (key, userId)
);

INSERT INTO settings_new (key, value, userId, updated_at) 
SELECT key, value, 'root', updated_at FROM settings;

DROP TABLE settings;
ALTER TABLE settings_new RENAME TO settings;

-- Create indexes for performance
CREATE INDEX idx_farmers_userId ON farmers(userId);
CREATE INDEX idx_staff_userId ON staff(userId);
CREATE INDEX idx_employees_userId ON employees(userId);
CREATE INDEX idx_buys_userId ON buys(userId);
CREATE INDEX idx_sells_userId ON sells(userId);
CREATE INDEX idx_expenses_userId ON expenses(userId);
CREATE INDEX idx_wages_userId ON wages(userId);
CREATE INDEX idx_settings_userId ON settings(userId);
