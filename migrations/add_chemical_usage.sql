CREATE TABLE IF NOT EXISTS chemical_usage (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    chemicalId TEXT NOT NULL,
    amount REAL NOT NULL,
    unit TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
