-- Migration 0026: Create store_stock_summary table for ultrafast 1-row stock aggregation

CREATE TABLE IF NOT EXISTS store_stock_summary (
    userId TEXT PRIMARY KEY,
    latexBuyWeight REAL DEFAULT 0,
    cupLumpBuyWeight REAL DEFAULT 0,
    totalDrcWeight REAL DEFAULT 0,
    ammonia REAL DEFAULT 0,
    water REAL DEFAULT 0,
    whiteMedicine REAL DEFAULT 0,
    latexSellWeight REAL DEFAULT 0,
    latexSellLoss REAL DEFAULT 0,
    cupLumpSellWeight REAL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Backfill initial store_stock_summary data for all existing users
INSERT INTO store_stock_summary (
    userId, 
    latexBuyWeight, 
    cupLumpBuyWeight, 
    totalDrcWeight, 
    ammonia, 
    water, 
    whiteMedicine, 
    latexSellWeight, 
    latexSellLoss, 
    cupLumpSellWeight
)
SELECT 
    u.id as userId,
    COALESCE(b.latexBuyWeight, 0),
    COALESCE(b.cupLumpBuyWeight, 0),
    COALESCE(b.totalDrcWeight, 0),
    COALESCE(c.ammonia, 0),
    COALESCE(c.water, 0),
    COALESCE(c.whiteMedicine, 0),
    COALESCE(s.latexSellWeight, 0),
    COALESCE(s.latexSellLoss, 0),
    COALESCE(s.cupLumpSellWeight, 0)
FROM users u
LEFT JOIN (
    SELECT 
        userId,
        SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN (weight - bucketWeight) ELSE 0 END) as latexBuyWeight,
        SUM(CASE WHEN (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN (weight - bucketWeight) ELSE 0 END) as cupLumpBuyWeight,
        SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN ((weight - bucketWeight) * drc) ELSE 0 END) as totalDrcWeight
    FROM buys GROUP BY userId
) b ON u.id = b.userId
LEFT JOIN (
    SELECT 
        userId,
        SUM(CASE WHEN chemicalId = 'ammonia' THEN amount ELSE 0 END) as ammonia,
        SUM(CASE WHEN chemicalId = 'water' THEN amount ELSE 0 END) as water,
        SUM(CASE WHEN chemicalId = 'whiteMedicine' THEN amount ELSE 0 END) as whiteMedicine
    FROM chemical_usage GROUP BY userId
) c ON u.id = c.userId
LEFT JOIN (
    SELECT 
        userId,
        SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN weight ELSE 0 END) as latexSellWeight,
        SUM(CASE WHEN (rubberType = 'latex' OR rubberType IS NULL OR rubberType = '') THEN lossWeight ELSE 0 END) as latexSellLoss,
        SUM(CASE WHEN (rubberType = 'cup_lump' OR rubberType = 'ขี้ยาง') THEN weight ELSE 0 END) as cupLumpSellWeight
    FROM sells GROUP BY userId
) s ON u.id = s.userId
ON CONFLICT(userId) DO UPDATE SET
    latexBuyWeight = excluded.latexBuyWeight,
    cupLumpBuyWeight = excluded.cupLumpBuyWeight,
    totalDrcWeight = excluded.totalDrcWeight,
    ammonia = excluded.ammonia,
    water = excluded.water,
    whiteMedicine = excluded.whiteMedicine,
    latexSellWeight = excluded.latexSellWeight,
    latexSellLoss = excluded.latexSellLoss,
    cupLumpSellWeight = excluded.cupLumpSellWeight,
    updated_at = datetime('now');
