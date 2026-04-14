-- Migration: Add backups table to track automated/manual database exports
CREATE TABLE IF NOT EXISTS backups (
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

CREATE INDEX IF NOT EXISTS idx_backups_userId ON backups(userId);
CREATE INDEX IF NOT EXISTS idx_backups_createdAt ON backups(createdAt);
