CREATE TABLE IF NOT EXISTS user_usage_stats (
    userId TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    queryCount INTEGER DEFAULT 0,
    rowsRead INTEGER DEFAULT 0,
    rowsWritten INTEGER DEFAULT 0,
    rowsDeleted INTEGER DEFAULT 0,
    storageEstKb REAL DEFAULT 0,
    PRIMARY KEY (userId, date)
);
