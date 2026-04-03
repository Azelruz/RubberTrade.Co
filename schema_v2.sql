-- Update Farmers Table
DROP TABLE IF EXISTS farmers;
CREATE TABLE farmers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    bankAccount TEXT,
    bankName TEXT,
    address TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Employees Table (ลูกจ้างของเกษตรกร)
DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    farmerId TEXT,
    profitSharePct REAL,
    phone TEXT,
    bankAccount TEXT,
    bankName TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Update Staff Table (พนักงานประจำ)
DROP TABLE IF EXISTS staff;
CREATE TABLE staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    salary REAL,
    bonus REAL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
