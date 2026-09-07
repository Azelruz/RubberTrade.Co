-- Migration 0029: Add composite index for buys (userId, farmerId, date DESC) to optimize updateFarmerStats
CREATE INDEX IF NOT EXISTS idx_buys_user_farmer_date ON buys(userId, farmerId, date DESC);
