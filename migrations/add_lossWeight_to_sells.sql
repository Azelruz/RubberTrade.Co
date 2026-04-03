-- Migration: Add lossWeight column to sells table
ALTER TABLE sells ADD COLUMN lossWeight REAL DEFAULT 0;
