-- Final Schema for Rubber Latex System (camelCase for Frontend Compatibility) --

DROP TABLE IF EXISTS farmers;
CREATE TABLE farmers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    bankAccount TEXT,
    bankName TEXT,
    address TEXT,
    note TEXT,
    fscId TEXT,
    lineId TEXT UNIQUE,
    lineName TEXT,
    linePicture TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS staff;
CREATE TABLE staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    salary REAL,
    bonus REAL,
    note TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS employees;
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    farmerId TEXT,
    profitSharePct REAL,
    phone TEXT,
    bankAccount TEXT,
    bankName TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS buys;
CREATE TABLE buys (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    farmerId TEXT,
    farmerName TEXT,
    weight REAL,
    drc REAL,
    pricePerKg REAL,
    total REAL,
    dryRubber REAL,
    empPct REAL,
    employeeTotal REAL,
    farmerTotal REAL,
    note TEXT,
    status TEXT,
    farmerStatus TEXT DEFAULT 'Pending',
    employeeStatus TEXT DEFAULT 'Pending',
    receiptUrl TEXT,
    bucketWeight REAL DEFAULT 0,
    basePrice REAL DEFAULT 0,
    bonusDrc REAL DEFAULT 0,
    actualPrice REAL DEFAULT 0,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS sells;
CREATE TABLE sells (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    buyerName TEXT,
    factoryId TEXT,
    employeeId TEXT,
    truckId TEXT,
    truckInfo TEXT,
    weight REAL,
    drc REAL,
    pricePerKg REAL,
    lossWeight REAL DEFAULT 0,
    total REAL,
    profitShareAmount REAL,
    receiptUrl TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    userId TEXT,
    FOREIGN KEY (employeeId) REFERENCES staff(id) ON DELETE SET NULL,
    FOREIGN KEY (factoryId) REFERENCES factories(id) ON DELETE SET NULL,
    FOREIGN KEY (truckId) REFERENCES trucks(id) ON DELETE SET NULL
);

DROP TABLE IF EXISTS expenses;
CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    category TEXT,
    description TEXT,
    amount REAL,
    note TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS wages;
CREATE TABLE wages (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    staffId TEXT,
    staffName TEXT,
    dailyWage REAL,
    bonus REAL,
    workDays REAL,
    total REAL,
    description TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    userId TEXT,
    FOREIGN KEY (staffId) REFERENCES staff(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS promotions;
CREATE TABLE promotions (
    id TEXT PRIMARY KEY,
    date TEXT,
    farmerId TEXT,
    farmerName TEXT,
    pointsUsed REAL,
    rewardName TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    userId TEXT,
    FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS chemical_usage;
CREATE TABLE chemical_usage (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    chemicalId TEXT NOT NULL,
    amount REAL NOT NULL,
    unit TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS settings;
CREATE TABLE settings (
    key TEXT,
    value TEXT,
    userId TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (key, userId)
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('daily_price', '50.00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('factoryName', 'ร้านรับซื้อน้ำยางพารา');
INSERT OR IGNORE INTO settings (key, value) VALUES ('pointsPerKg', '10');
INSERT OR IGNORE INTO settings (key, value) VALUES ('address', 'เลขที่ 123 หมู่ 4 ต.ยางพารา อ.เมือง จ.สุราษฎร์ธานี');

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'owner', 'admin', 'super_admin'
    store_name TEXT,
    subscription_status TEXT DEFAULT 'trial',
    subscription_expiry DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default users (Passwords are plaintext for now as per simple requirement, or simple hash)
INSERT OR IGNORE INTO users (id, username, password, role, subscription_status, subscription_expiry) VALUES ('u1', 'owner', 'owner123', 'owner', 'trial', datetime('now', '+7 days'));
INSERT OR IGNORE INTO users (id, username, password, role, subscription_status, subscription_expiry) VALUES ('u2', 'admin', 'admin123', 'admin', 'active', datetime('now', '+100 years'));
INSERT OR IGNORE INTO users (id, username, password, role, subscription_status, subscription_expiry) VALUES ('u3', 'super_admin', 'super123', 'super_admin', 'active', datetime('now', '+100 years'));

DROP TABLE IF EXISTS subscription_requests;
CREATE TABLE subscription_requests (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    slipUrl TEXT NOT NULL,
    amount REAL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requestedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    approvedAt DATETIME,
    package_name TEXT,
    requested_days INTEGER,
    FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS factories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    shortName TEXT,
    taxId TEXT,
    address TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for trucks used for delivery
CREATE TABLE IF NOT EXISTS trucks (
    id TEXT PRIMARY KEY,
    licensePlate TEXT NOT NULL,
    chassisNumber TEXT,
    brand TEXT,
    model TEXT,
    prbExpiry TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed data for factories from provided list
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_1', 'บริษัท หน่ำฮั้ว จำกัด', '2600', 'สกต. (สงขลา)');
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_2', 'บริษัท รับเบอร์แลนด์ จำกัด', '2010', 'สกต. (สงขลา)');
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_3', 'บริษัท ไทยรับเบอร์ลาเท็คซ์กรุ๊พ จำกัด', 'KD', 'สกต. (สงขลา)');
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_4', 'บริษัท ถาวรอุตสาหกรรม จำกัด', '800021', 'สกต. (สงขลา)');
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_5', 'บริษัท ท้อปโกลฟ จำกัด', 'F2-SK 1300', 'สกต. (สงขลา)');
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_6', 'บริษัท ST ลาเท็กซ์ จำกัด', '013/12', 'สกต. (สงขลา)');
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_7', 'บริษัท สะเดาอุตสาหกรรมยางพารา (1988) จำกัด', '002', 'สกต. (สงขลา)');
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_8', 'บริษัท ออมนิสตาร์ จำกัด', 'OS-10', 'สกต. (สงขลา)');
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_9', 'บริษัท อีฮับฮวด จำกัด', '170', 'สกต. (สงขลา)');
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_10', 'บริษัท บีเทค จำกัด', '100375', 'สกต. (สงขลา)');
INSERT OR IGNORE INTO factories (id, name, code, shortName) VALUES ('fac_11', 'บริษัท มาล์เทครับเบอร์ จำกัด', 'S0028', 'สกต. (สงขลา)');
