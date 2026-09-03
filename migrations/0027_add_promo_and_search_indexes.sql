-- Migration 0027: Add covering indexes for promotions stats and global search

CREATE INDEX IF NOT EXISTS idx_buys_promo_stats 
ON buys(userId, farmerId, dryRubber, rubberType, weight, bucketWeight, drc);

CREATE INDEX IF NOT EXISTS idx_buys_search_lookup 
ON buys(userId, farmerName, id);
