-- Activity/Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entityType, entityId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
