-- Migration 0015: Optimize farmer_employees query index by userId and isDefault

CREATE INDEX IF NOT EXISTS idx_farmer_emp_user_default ON farmer_employees(userId, isDefault DESC);
