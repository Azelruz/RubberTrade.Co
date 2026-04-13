-- Migration: Add rubberType column to buys and sells tables
ALTER TABLE buys ADD COLUMN rubberType TEXT DEFAULT 'latex';
ALTER TABLE sells ADD COLUMN rubberType TEXT DEFAULT 'latex';
