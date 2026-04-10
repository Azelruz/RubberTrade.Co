-- Migration: Add Subscription Packages & modifications

CREATE TABLE IF NOT EXISTS subscription_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    days INTEGER NOT NULL,
    price REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Note: D1 SQLite backend supports ADD COLUMN
-- Optional: Wrap in try/catch or let wrapper handle it if they already exist, but raw D1 doesn't have IF NOT EXISTS for columns
ALTER TABLE subscription_requests ADD COLUMN package_name TEXT;
ALTER TABLE subscription_requests ADD COLUMN requested_days INTEGER;

-- Seed default packages
INSERT OR IGNORE INTO subscription_packages (id, name, days, price) VALUES ('pkg_1', '1 เดือน', 30, 299);
INSERT OR IGNORE INTO subscription_packages (id, name, days, price) VALUES ('pkg_2', '3 เดือน', 90, 800);
INSERT OR IGNORE INTO subscription_packages (id, name, days, price) VALUES ('pkg_3', '6 เดือน', 180, 1500);
INSERT OR IGNORE INTO subscription_packages (id, name, days, price) VALUES ('pkg_4', '1 ปี', 365, 2900);
