-- Migration 0024: Optimize farmer_employees query with composite indexes for JOINs & Filter
-- Fixes high row reads (97.32k) on Cloudflare D1 farmer_employees queries

CREATE INDEX IF NOT EXISTS idx_fe_user_farmer_emp ON farmer_employees(userId, farmerId, employeeId, isDefault);
CREATE INDEX IF NOT EXISTS idx_employees_id_name ON employees(id, name, phone);
CREATE INDEX IF NOT EXISTS idx_farmers_id_name ON farmers(id, name);
