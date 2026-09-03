-- Migration 0019: Optimize farmer stats buys query with composite (userId, date, farmerId) index

CREATE INDEX IF NOT EXISTS idx_buys_user_date_farmer ON buys(userId, date, farmerId);
