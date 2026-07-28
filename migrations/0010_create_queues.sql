-- Migration: Create queues table for 3-Station Smart Queue workflow
CREATE TABLE IF NOT EXISTS queues (
    id TEXT PRIMARY KEY,
    queue_no INTEGER NOT NULL,
    farmer_id TEXT NOT NULL,
    farmer_name TEXT NOT NULL,
    rubber_type TEXT DEFAULT 'fresh_latex',
    weight REAL DEFAULT 0,
    bucket_weight REAL DEFAULT 0,
    drc REAL DEFAULT 0,
    status TEXT DEFAULT 'waiting_drc',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    called_at DATETIME,
    completed_at DATETIME,
    userId TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_queues_user_status ON queues(userId, status);
CREATE INDEX IF NOT EXISTS idx_queues_date ON queues(userId, created_at);
