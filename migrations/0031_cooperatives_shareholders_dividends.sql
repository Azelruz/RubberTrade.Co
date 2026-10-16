-- Migration 0031: Cooperatives, Shareholders, Org Structure & Dividend Distribution (v1.8.0)

-- 1. Table for Cooperative Members & Shareholders
CREATE TABLE IF NOT EXISTS coop_members (
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE SET NULL
);

-- Indexes for coop_members
CREATE INDEX IF NOT EXISTS idx_coop_members_user ON coop_members(userId);
CREATE INDEX IF NOT EXISTS idx_coop_members_user_status ON coop_members(userId, status);
CREATE INDEX IF NOT EXISTS idx_coop_members_farmer ON coop_members(userId, farmerId);
CREATE INDEX IF NOT EXISTS idx_coop_members_position ON coop_members(userId, orgPosition);
CREATE INDEX IF NOT EXISTS idx_coop_members_search ON coop_members(userId, name, memberNo, phone);

-- 2. Table for Share Capital Transactions (Buy, Redeem, Transfer, Dividend Reinvest)
CREATE TABLE IF NOT EXISTS share_transactions (
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

-- Indexes for share_transactions
CREATE INDEX IF NOT EXISTS idx_share_tx_user ON share_transactions(userId);
CREATE INDEX IF NOT EXISTS idx_share_tx_user_member ON share_transactions(userId, memberId);
CREATE INDEX IF NOT EXISTS idx_share_tx_user_date ON share_transactions(userId, date DESC, created_at DESC);

-- 3. Table for Dividend Fiscal Periods
CREATE TABLE IF NOT EXISTS dividend_periods (
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

-- Indexes for dividend_periods
CREATE INDEX IF NOT EXISTS idx_div_periods_user_year ON dividend_periods(userId, year DESC);
CREATE INDEX IF NOT EXISTS idx_div_periods_user_status ON dividend_periods(userId, status);

-- 4. Table for Individual Member Dividend & Patronage Distribution
CREATE TABLE IF NOT EXISTS dividend_distributions (
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

-- Indexes for dividend_distributions
CREATE INDEX IF NOT EXISTS idx_div_dist_user_period ON dividend_distributions(userId, periodId);
CREATE INDEX IF NOT EXISTS idx_div_dist_user_member ON dividend_distributions(userId, memberId);
CREATE INDEX IF NOT EXISTS idx_div_dist_user_status ON dividend_distributions(userId, payoutStatus);
CREATE INDEX IF NOT EXISTS idx_div_dist_period_payout ON dividend_distributions(periodId, payoutStatus);
