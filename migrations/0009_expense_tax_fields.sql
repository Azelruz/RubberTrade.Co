-- Migration: Add tax_type and tax_amount to expenses table
ALTER TABLE expenses ADD COLUMN tax_type TEXT DEFAULT 'none';
ALTER TABLE expenses ADD COLUMN tax_amount REAL DEFAULT 0;
