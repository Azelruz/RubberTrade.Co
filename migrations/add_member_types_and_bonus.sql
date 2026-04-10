-- Migration: Add Member Types and Bonuses
CREATE TABLE IF NOT EXISTS farmer_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bonus REAL DEFAULT 0,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add column to farmers if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for columns easily in older versions, 
-- but D1 supports standard ALTER TABLE.
ALTER TABLE farmers ADD COLUMN memberTypeId TEXT;

-- Add column to buys for historical bonus tracking
ALTER TABLE buys ADD COLUMN bonusMemberType REAL DEFAULT 0;
