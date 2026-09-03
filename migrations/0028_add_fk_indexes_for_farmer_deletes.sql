-- Migration 0028: Add direct foreign key indexes on farmerId across child tables to optimize DELETE FROM farmers
CREATE INDEX IF NOT EXISTS idx_buys_farmer_fk ON buys(farmerId);
CREATE INDEX IF NOT EXISTS idx_promotions_farmer_fk ON promotions(farmerId);
CREATE INDEX IF NOT EXISTS idx_land_plots_farmer_fk ON land_plots(farmerId);
