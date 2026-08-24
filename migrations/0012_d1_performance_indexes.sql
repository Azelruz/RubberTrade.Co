-- Index optimizations for Cloudflare D1 performance & Rows Read reduction

CREATE INDEX IF NOT EXISTS idx_buys_user_date ON buys(userId, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buys_user_updated ON buys(userId, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_buys_farmer ON buys(userId, farmerId);

CREATE INDEX IF NOT EXISTS idx_sells_user_date ON sells(userId, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sells_user_updated ON sells(userId, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_farmers_user ON farmers(userId);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(userId);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(userId, date DESC);
CREATE INDEX IF NOT EXISTS idx_wages_user_date ON wages(userId, date DESC);
