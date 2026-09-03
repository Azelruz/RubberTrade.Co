-- Migration 0016: Optimize farmers, employees, and staff queries with composite (userId, name ASC) indexes

CREATE INDEX IF NOT EXISTS idx_farmers_user_name ON farmers(userId, name ASC);
CREATE INDEX IF NOT EXISTS idx_employees_user_name ON employees(userId, name ASC);
CREATE INDEX IF NOT EXISTS idx_staff_user_name ON staff(userId, name ASC);
