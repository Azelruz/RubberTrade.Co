-- Migration 0035: Add realName and idCard to farmers table for RAOT and formal government reporting
-- Safe nullable column additions (no data loss)
ALTER TABLE farmers ADD COLUMN realName TEXT;
ALTER TABLE farmers ADD COLUMN idCard TEXT;

-- Composite search indexes for quick lookups by citizen ID or real name
CREATE INDEX IF NOT EXISTS idx_farmers_user_idcard ON farmers(userId, idCard);
CREATE INDEX IF NOT EXISTS idx_farmers_user_realname ON farmers(userId, realName);
