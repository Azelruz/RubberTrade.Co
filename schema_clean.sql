PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE farmers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    bankAccount TEXT,
    bankName TEXT,
    address TEXT,
    note TEXT,
    lineId TEXT UNIQUE,
    lineName TEXT,
    linePicture TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, fscId TEXT, memberTypeId TEXT, updated_at DATETIME DEFAULT '2024-01-01 00:00:00', lastBuyDate TEXT, buyCount INTEGER DEFAULT 0);
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
, updated_at DATETIME DEFAULT '2024-01-01 00:00:00');
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    farmerId TEXT,
    profitSharePct REAL,
    phone TEXT,
    bankAccount TEXT,
    bankName TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT '2024-01-01 00:00:00',
    FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE SET NULL
);
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, bonusMemberType REAL DEFAULT 0, rubberType TEXT DEFAULT 'latex', updated_at DATETIME DEFAULT '2024-01-01 00:00:00', createdBy TEXT, employeeId TEXT, landPlotId TEXT,
    FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE SET NULL
);
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
    userId TEXT, updated_at DATETIME DEFAULT '2024-01-01 00:00:00', rubberType TEXT DEFAULT 'latex',
    FOREIGN KEY (employeeId) REFERENCES staff(id) ON DELETE SET NULL,
    FOREIGN KEY (factoryId) REFERENCES factories(id) ON DELETE SET NULL,
    FOREIGN KEY (truckId) REFERENCES trucks(id) ON DELETE SET NULL
);
CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    category TEXT,
    description TEXT,
    amount REAL,
    note TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, updated_at DATETIME DEFAULT '2024-01-01 00:00:00', tax_type TEXT DEFAULT 'none', tax_amount REAL DEFAULT 0);
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
    userId TEXT, updated_at DATETIME DEFAULT '2024-01-01 00:00:00',
    FOREIGN KEY (staffId) REFERENCES staff(id) ON DELETE CASCADE
);
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
CREATE TABLE settings (
    key TEXT,
    value TEXT,
    userId TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (key, userId)
);
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'owner' or 'admin'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, subscription_expiry DATETIME, subscription_status TEXT DEFAULT 'trial', email TEXT, store_name TEXT, parentId TEXT, maxStaffLimit INTEGER DEFAULT 1);
CREATE TABLE factories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    shortName TEXT,
    taxId TEXT,
    address TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE trucks (
    id TEXT PRIMARY KEY,
    licensePlate TEXT NOT NULL,
    chassisNumber TEXT,
    brand TEXT,
    model TEXT,
    prbExpiry TEXT,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, driverName TEXT, capacity REAL, note TEXT);
CREATE TABLE chemical_usage (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            chemicalId TEXT NOT NULL,
            amount REAL NOT NULL,
            unit TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        , userId TEXT, updated_at DATETIME DEFAULT '2024-01-01 00:00:00');
CREATE TABLE subscription_requests (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    slipUrl TEXT NOT NULL,
    amount REAL,
    status TEXT DEFAULT 'pending',
    requestedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    approvedAt DATETIME, package_name TEXT, requested_days INTEGER,
    FOREIGN KEY (userId) REFERENCES users(id)
);
CREATE TABLE subscription_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    days INTEGER NOT NULL,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, maxStaff INTEGER DEFAULT 1);
CREATE TABLE farmer_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bonus REAL DEFAULT 0,
    userId TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE user_usage_stats (
    userId TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    queryCount INTEGER DEFAULT 0,
    rowsRead INTEGER DEFAULT 0,
    rowsWritten INTEGER DEFAULT 0,
    rowsDeleted INTEGER DEFAULT 0,
    storageEstKb REAL DEFAULT 0,
    PRIMARY KEY (userId, date)
);
CREATE TABLE member_types (id TEXT PRIMARY KEY, name TEXT NOT NULL, bonus REAL DEFAULT 0, userId TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE market_prices (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    price REAL NOT NULL,
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
, userId TEXT);
CREATE TABLE api_rate_limits (key TEXT, minute INTEGER, count INTEGER, PRIMARY KEY (key, minute));
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    username TEXT,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    entityType TEXT NOT NULL, -- 'buys', 'sells', 'farmers', etc.
    entityId TEXT NOT NULL,
    oldData TEXT, -- JSON snapshot before change
    newData TEXT, -- JSON snapshot after change
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE backups (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    filename TEXT NOT NULL,
    r2Key TEXT NOT NULL,
    fileSize INTEGER,
    status TEXT DEFAULT 'completed',
    type TEXT DEFAULT 'auto', -- 'auto' or 'manual'
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
);
CREATE TABLE counters (
    table_name TEXT NOT NULL,
    id_prefix TEXT NOT NULL,
    userId TEXT NOT NULL,
    last_seq INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (table_name, id_prefix, userId)
);
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE weather_forecasts (id TEXT PRIMARY KEY, userId TEXT NOT NULL, forecast_date DATE NOT NULL, rain_probability REAL, tapping_hours_rain REAL, weather_code INTEGER, estimated_yield_pct REAL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(userId, forecast_date));
CREATE TABLE queues (id TEXT PRIMARY KEY, queue_no INTEGER NOT NULL, farmer_id TEXT NOT NULL, farmer_name TEXT NOT NULL, rubber_type TEXT DEFAULT 'fresh_latex', weight REAL DEFAULT 0, bucket_weight REAL DEFAULT 0, drc REAL DEFAULT 0, status TEXT DEFAULT 'waiting_drc', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, called_at DATETIME, completed_at DATETIME, userId TEXT NOT NULL);
CREATE TABLE loans (id TEXT PRIMARY KEY, borrowerType TEXT NOT NULL, borrowerId TEXT NOT NULL, borrowerName TEXT NOT NULL, date TEXT NOT NULL, amount REAL NOT NULL, remainingAmount REAL NOT NULL, deductionMethod TEXT DEFAULT 'full', deductionValue REAL DEFAULT 0, note TEXT, userId TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE loan_deductions (id TEXT PRIMARY KEY, buyId TEXT NOT NULL, borrowerType TEXT NOT NULL, borrowerId TEXT NOT NULL, amount REAL NOT NULL, remainingDebtAfter REAL NOT NULL, userId TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE service_catalog (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            unit_type TEXT NOT NULL,
            price_per_unit REAL DEFAULT 0,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            userId TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
CREATE TABLE service_queues (
            id TEXT PRIMARY KEY,
            service_no TEXT NOT NULL,
            farmer_id TEXT,
            customer_name TEXT NOT NULL,
            phone TEXT,
            service_id TEXT,
            service_name TEXT,
            unit_type TEXT,
            unit_price REAL DEFAULT 0,
            quantity REAL DEFAULT 1,
            total_amount REAL DEFAULT 0,
            appointment_date TEXT,
            staff_id TEXT,
            staff_name TEXT,
            location_note TEXT,
            status TEXT DEFAULT 'pending',
            payment_status TEXT DEFAULT 'unpaid',
            payment_method TEXT,
            paid_at TEXT,
            userId TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
CREATE TABLE farmer_employees (
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
CREATE TABLE daily_buys_summary (
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    totalWeight REAL DEFAULT 0,
    latexTotal REAL DEFAULT 0,
    cupLumpTotal REAL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (userId, date)
);
CREATE TABLE daily_sells_summary (
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    totalWeight REAL DEFAULT 0,
    latexTotal REAL DEFAULT 0,
    cupLumpTotal REAL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (userId, date)
);
CREATE TABLE land_plots (
            id TEXT PRIMARY KEY,
            farmerId TEXT NOT NULL,
            employeeId TEXT,
            plotName TEXT,
            deedNumber TEXT,
            deedType TEXT,
            rai REAL DEFAULT 0,
            ngan REAL DEFAULT 0,
            sqWah REAL DEFAULT 0,
            geojson TEXT,
            lat REAL,
            lng REAL,
            note TEXT,
            userId TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE CASCADE,
            FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE SET NULL
        );
CREATE TABLE store_stock_summary (userId TEXT PRIMARY KEY, latexBuyWeight REAL DEFAULT 0, cupLumpBuyWeight REAL DEFAULT 0, totalDrcWeight REAL DEFAULT 0, ammonia REAL DEFAULT 0, water REAL DEFAULT 0, whiteMedicine REAL DEFAULT 0, latexSellWeight REAL DEFAULT 0, latexSellLoss REAL DEFAULT 0, cupLumpSellWeight REAL DEFAULT 0, updated_at TEXT DEFAULT (datetime('now')));
CREATE TABLE coop_members (
    id TEXT PRIMARY KEY,
    memberNo TEXT NOT NULL,
    farmerId TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    idCard TEXT,
    bankAccount TEXT,
    bankName TEXT,
    address TEXT,
    orgPosition TEXT DEFAULT 'member',
    positionAllowance REAL DEFAULT 0,
    totalShares INTEGER DEFAULT 0,
    shareValue REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    joinedDate TEXT NOT NULL,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, savingsBalance REAL DEFAULT 0,
    FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE SET NULL
);
CREATE TABLE share_transactions (
    id TEXT PRIMARY KEY,
    memberId TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    shares INTEGER NOT NULL,
    pricePerShare REAL NOT NULL,
    totalAmount REAL NOT NULL,
    paymentMethod TEXT DEFAULT 'cash',
    receiptUrl TEXT,
    note TEXT,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memberId) REFERENCES coop_members(id) ON DELETE CASCADE
);
CREATE TABLE dividend_periods (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    title TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    netProfit REAL NOT NULL,
    allocatedProfit REAL NOT NULL,
    reservePct REAL DEFAULT 10,
    reserveAmount REAL DEFAULT 0,
    welfarePct REAL DEFAULT 5,
    welfareAmount REAL DEFAULT 0,
    boardBonusPct REAL DEFAULT 5,
    boardBonusAmount REAL DEFAULT 0,
    dividendShareRate REAL DEFAULT 0,
    dividendShareTotal REAL DEFAULT 0,
    patronageFormulaType TEXT DEFAULT 'dry_rubber',
    patronageRefundRate REAL DEFAULT 0,
    patronageRefundTotal REAL DEFAULT 0,
    totalDistributed REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    approvedAt DATETIME,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE dividend_distributions (
    id TEXT PRIMARY KEY,
    periodId TEXT NOT NULL,
    memberId TEXT NOT NULL,
    farmerId TEXT,
    memberName TEXT NOT NULL,
    orgPosition TEXT,
    shareCount INTEGER DEFAULT 0,
    shareValue REAL DEFAULT 0,
    dividendShareAmount REAL DEFAULT 0,
    businessVolumeKg REAL DEFAULT 0,
    businessDryRubberKg REAL DEFAULT 0,
    businessTotalAmount REAL DEFAULT 0,
    patronageRefundAmount REAL DEFAULT 0,
    boardBonusAmount REAL DEFAULT 0,
    grossPayout REAL DEFAULT 0,
    deductedLoanAmount REAL DEFAULT 0,
    netPayout REAL DEFAULT 0,
    payoutStatus TEXT DEFAULT 'pending',
    paidDate TEXT,
    payoutMethod TEXT,
    receiptUrl TEXT,
    note TEXT,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (periodId) REFERENCES dividend_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (memberId) REFERENCES coop_members(id) ON DELETE CASCADE
);
CREATE TABLE plot_activities (
    id TEXT PRIMARY KEY,
    plotId TEXT NOT NULL,
    farmerId TEXT NOT NULL,
    activityType TEXT NOT NULL, -- 'fertilizer', 'mowing', 'weed_control', 'disease_treatment', 'service_fee', 'other'
    date DATE NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    fertilizerFormula TEXT, -- สูตรปุ๋ย เช่น 29-5-18, 20-8-20, อินทรีย์, โดโลไมท์
    brand TEXT, -- ยี่ห้อปุ๋ย
    amountKg REAL DEFAULT 0, -- ปริมาณรวม (กก.)
    bags REAL DEFAULT 0, -- จำนวนกระสอบ (50 กก.)
    cost REAL DEFAULT 0, -- ค่าใช้จ่าย/ค่าบริการที่จ่ายไป (บาท)
    serviceProvider TEXT, -- ผู้รับจ้าง/ร้านค้า เช่น 'จ้างนายสมศักดิ์', 'ร้านปุ๋ยการเกษตร'
    isPaid INTEGER DEFAULT 1, -- 1 = จ่ายแล้ว, 0 = ค้างจ่าย
    nextDueDate DATE, -- วันครบกำหนดรอบถัดไป (สำหรับปุ๋ย หรือ ตัดหญ้า)
    note TEXT,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plotId) REFERENCES land_plots(id) ON DELETE CASCADE,
    FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE CASCADE
);
CREATE TABLE savings_accounts (
    id TEXT PRIMARY KEY,
    memberId TEXT NOT NULL,
    accountNo TEXT NOT NULL,
    accountName TEXT NOT NULL, -- e.g. 'ออมทรัพย์สัจจะทั่วไป', 'เงินออมเพื่อการศึกษาบุตร', 'เงินฝากพิเศษ'
    accountType TEXT DEFAULT 'savings', -- 'savings', 'fixed', 'welfare', 'other'
    balance REAL DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'closed'
    openedDate TEXT NOT NULL,
    interestRate REAL DEFAULT 0,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memberId) REFERENCES coop_members(id) ON DELETE CASCADE
);
CREATE TABLE savings_transactions (
    id TEXT PRIMARY KEY,
    accountId TEXT,
    memberId TEXT NOT NULL,
    accountNo TEXT,
    date TEXT NOT NULL,
    type TEXT NOT NULL, -- 'deposit', 'withdraw', 'interest'
    amount REAL NOT NULL,
    balanceAfter REAL NOT NULL,
    paymentMethod TEXT DEFAULT 'cash',
    receiptUrl TEXT,
    note TEXT,
    recordedBy TEXT,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES savings_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (memberId) REFERENCES coop_members(id) ON DELETE CASCADE
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_farmers_userId ON farmers(userId);
CREATE INDEX idx_buys_userId ON buys(userId);
CREATE INDEX idx_sells_userId ON sells(userId);
CREATE INDEX idx_expenses_userId ON expenses(userId);
CREATE INDEX idx_wages_userId ON wages(userId);
CREATE INDEX idx_promotions_userId ON promotions(userId);
CREATE INDEX idx_settings_userId ON settings(userId);
CREATE INDEX idx_factories_userId ON factories(userId);
CREATE INDEX idx_trucks_userId ON trucks(userId);
CREATE INDEX idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entityType, entityId);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_backups_userId ON backups(userId);
CREATE INDEX idx_backups_createdAt ON backups(createdAt);
CREATE INDEX idx_counters_lookup ON counters(table_name, id_prefix, userId);
CREATE INDEX idx_weather_forecasts_user_date ON weather_forecasts(userId, forecast_date);
CREATE INDEX idx_queues_user_status ON queues(userId, status);
CREATE INDEX idx_queues_date ON queues(userId, created_at);
CREATE INDEX idx_loans_borrower ON loans(userId, borrowerId);
CREATE INDEX idx_loan_deductions_buy ON loan_deductions(userId, buyId);
CREATE INDEX idx_loan_deductions_borrower ON loan_deductions(userId, borrowerId);
CREATE INDEX idx_buys_user_date ON buys(userId, date DESC, created_at DESC);
CREATE INDEX idx_buys_user_updated ON buys(userId, updated_at DESC);
CREATE INDEX idx_buys_farmer ON buys(userId, farmerId);
CREATE INDEX idx_sells_user_date ON sells(userId, date DESC, created_at DESC);
CREATE INDEX idx_sells_user_updated ON sells(userId, updated_at DESC);
CREATE INDEX idx_farmers_user ON farmers(userId);
CREATE INDEX idx_employees_user ON employees(userId);
CREATE INDEX idx_expenses_user_date ON expenses(userId, date DESC);
CREATE INDEX idx_wages_user_date ON wages(userId, date DESC);
CREATE INDEX idx_farmer_emp_farmer ON farmer_employees(farmerId, userId);
CREATE INDEX idx_farmer_emp_employee ON farmer_employees(employeeId, userId);
CREATE INDEX idx_buys_dashboard_chart ON buys(userId, date, rubberType, total, pricePerKg);
CREATE INDEX idx_sells_dashboard_chart ON sells(userId, date, rubberType, total, pricePerKg);
CREATE INDEX idx_farmer_emp_user_default ON farmer_employees(userId, isDefault DESC);
CREATE INDEX idx_farmers_user_name ON farmers(userId, name ASC);
CREATE INDEX idx_employees_user_name ON employees(userId, name ASC);
CREATE INDEX idx_staff_user_name ON staff(userId, name ASC);
CREATE INDEX idx_chemical_usage_user_date ON chemical_usage(userId, date DESC, created_at DESC);
CREATE INDEX idx_buys_user_date_farmer ON buys(userId, date, farmerId);
CREATE INDEX idx_daily_buys_user_date ON daily_buys_summary(userId, date DESC);
CREATE INDEX idx_daily_sells_user_date ON daily_sells_summary(userId, date DESC);
CREATE INDEX idx_loans_user_date ON loans(userId, date DESC, created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(userId, created_at DESC);
CREATE INDEX idx_buys_user_date_unpaid ON buys(userId, date, farmerStatus, employeeStatus);
CREATE INDEX idx_buys_chart_data ON buys(userId, date, rubberType, total, pricePerKg);
CREATE INDEX idx_fe_user_farmer_emp ON farmer_employees(userId, farmerId, employeeId, isDefault);
CREATE INDEX idx_employees_id_name ON employees(id, name, phone);
CREATE INDEX idx_farmers_id_name ON farmers(id, name);
CREATE INDEX idx_land_plots_user_farmer ON land_plots(userId, farmerId)
    ;
CREATE INDEX idx_buys_promo_stats ON buys(userId, farmerId, dryRubber, rubberType, weight, bucketWeight, drc);
CREATE INDEX idx_buys_search_lookup ON buys(userId, farmerName, id);
CREATE INDEX idx_buys_farmer_fk ON buys(farmerId);
CREATE INDEX idx_promotions_farmer_fk ON promotions(farmerId);
CREATE INDEX idx_land_plots_farmer_fk ON land_plots(farmerId);
CREATE INDEX idx_buys_user_farmer_date ON buys(userId, farmerId, date DESC);
CREATE INDEX idx_coop_members_user ON coop_members(userId);
CREATE INDEX idx_coop_members_user_status ON coop_members(userId, status);
CREATE INDEX idx_coop_members_farmer ON coop_members(userId, farmerId);
CREATE INDEX idx_coop_members_position ON coop_members(userId, orgPosition);
CREATE INDEX idx_coop_members_search ON coop_members(userId, name, memberNo, phone);
CREATE INDEX idx_share_tx_user ON share_transactions(userId);
CREATE INDEX idx_share_tx_user_member ON share_transactions(userId, memberId);
CREATE INDEX idx_share_tx_user_date ON share_transactions(userId, date DESC, created_at DESC);
CREATE INDEX idx_div_periods_user_year ON dividend_periods(userId, year DESC);
CREATE INDEX idx_div_periods_user_status ON dividend_periods(userId, status);
CREATE INDEX idx_div_dist_user_period ON dividend_distributions(userId, periodId);
CREATE INDEX idx_div_dist_user_member ON dividend_distributions(userId, memberId);
CREATE INDEX idx_div_dist_user_status ON dividend_distributions(userId, payoutStatus);
CREATE INDEX idx_div_dist_period_payout ON dividend_distributions(periodId, payoutStatus);
CREATE INDEX idx_plot_activities_plot_date ON plot_activities(plotId, date DESC);
CREATE INDEX idx_plot_activities_user_farmer ON plot_activities(userId, farmerId, date DESC);
CREATE INDEX idx_plot_activities_type ON plot_activities(plotId, activityType, date DESC);
CREATE INDEX idx_buys_landplot ON buys(landPlotId);
CREATE INDEX idx_savings_acc_user_member ON savings_accounts(userId, memberId);
CREATE INDEX idx_savings_acc_user_no ON savings_accounts(userId, accountNo);
CREATE INDEX idx_savings_acc_user_status ON savings_accounts(userId, status);
CREATE INDEX idx_savings_tx_user_date ON savings_transactions(userId, date DESC, created_at DESC);
CREATE INDEX idx_savings_tx_user_member ON savings_transactions(userId, memberId, date DESC);
CREATE INDEX idx_savings_tx_user_acc ON savings_transactions(userId, accountId, date DESC);
CREATE INDEX idx_savings_tx_user_type ON savings_transactions(userId, type);
CREATE TRIGGER update_farmers_timestamp AFTER UPDATE ON farmers
BEGIN
    UPDATE farmers SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;
CREATE TRIGGER update_staff_timestamp AFTER UPDATE ON staff
BEGIN
    UPDATE staff SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;
CREATE TRIGGER update_buys_timestamp AFTER UPDATE ON buys
BEGIN
    UPDATE buys SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;
CREATE TRIGGER update_sells_timestamp AFTER UPDATE ON sells
BEGIN
    UPDATE sells SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;
