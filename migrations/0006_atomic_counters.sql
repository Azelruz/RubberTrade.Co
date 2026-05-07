-- Migration: Add counters table for atomic sequence generation
-- This table prevents duplicate IDs in concurrent environments

CREATE TABLE IF NOT EXISTS counters (
    table_name TEXT NOT NULL,
    id_prefix TEXT NOT NULL,
    userId TEXT NOT NULL,
    last_seq INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (table_name, id_prefix, userId)
);

-- Index for performance when checking existing counters
CREATE INDEX IF NOT EXISTS idx_counters_lookup ON counters(table_name, id_prefix, userId);
