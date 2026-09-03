-- Migration 0014: Optimize Dashboard Chart Queries and Reduce Rows Read

CREATE INDEX IF NOT EXISTS idx_buys_dashboard_chart ON buys(userId, date, rubberType, total, pricePerKg);
CREATE INDEX IF NOT EXISTS idx_sells_dashboard_chart ON sells(userId, date, rubberType, total, pricePerKg);
