ALTER TABLE users ADD COLUMN subscription_expiry DATETIME;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'trial';

CREATE TABLE IF NOT EXISTS subscription_requests (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    slipUrl TEXT NOT NULL,
    amount REAL,
    status TEXT DEFAULT 'pending',
    requestedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    approvedAt DATETIME,
    FOREIGN KEY (userId) REFERENCES users(id)
);

UPDATE users 
SET subscription_status = 'trial', 
    subscription_expiry = datetime('now', '+7 days')
WHERE subscription_expiry IS NULL;
