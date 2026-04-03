-- Add missing price component columns to the buys table
ALTER TABLE buys ADD COLUMN basePrice REAL DEFAULT 0;
ALTER TABLE buys ADD COLUMN bonusDrc REAL DEFAULT 0;
ALTER TABLE buys ADD COLUMN actualPrice REAL DEFAULT 0;
