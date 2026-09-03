-- Migration 0017: Optimize chemical_usage query with composite (userId, date DESC, created_at DESC) index

CREATE INDEX IF NOT EXISTS idx_chemical_usage_user_date ON chemical_usage(userId, date DESC, created_at DESC);
