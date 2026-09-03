-- Migration 0013: Add farmer_employees junction table and employeeId to buys table

CREATE TABLE IF NOT EXISTS farmer_employees (
    id TEXT PRIMARY KEY,
    farmerId TEXT NOT NULL,
    employeeId TEXT NOT NULL,
    profitSharePct REAL DEFAULT 50,
    isDefault INTEGER DEFAULT 0,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE CASCADE,
    FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(farmerId, employeeId)
);

-- Index for fast lookup by farmer or employee
CREATE INDEX IF NOT EXISTS idx_farmer_emp_farmer ON farmer_employees(farmerId, userId);
CREATE INDEX IF NOT EXISTS idx_farmer_emp_employee ON farmer_employees(employeeId, userId);

-- Migrate existing employee-farmer relationships from employees table
INSERT INTO farmer_employees (id, farmerId, employeeId, profitSharePct, isDefault, userId)
SELECT 
    'fe_' || id,
    farmerId,
    id,
    COALESCE(profitSharePct, 50),
    1,
    userId
FROM employees
WHERE farmerId IS NOT NULL AND farmerId != ''
ON CONFLICT(farmerId, employeeId) DO NOTHING;

-- Add employeeId to buys table
ALTER TABLE buys ADD COLUMN employeeId TEXT;
