-- Migration 0018: Optimize unpaid bills query with composite status index

CREATE INDEX IF NOT EXISTS idx_buys_user_status ON buys(userId, farmerStatus, employeeStatus, date);
