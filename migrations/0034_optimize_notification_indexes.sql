-- Migration 0034: Optimize notification query indexes for Loans and Subscription Requests
-- Purpose: Accelerate /api/notifications polling queries and minimize Cloudflare D1 Rows Read quota consumption

-- 1. Partial Index for Active Loans (only indexes rows where remainingAmount > 0)
-- Avoids full scan of paid historical loans when computing store active debt stats
CREATE INDEX IF NOT EXISTS idx_loans_active_debt 
ON loans(userId, remainingAmount) 
WHERE remainingAmount > 0;

-- 2. Partial Index for Pending Subscription Requests for Super Admin
-- Avoids full table scan when checking for pending subscription approval count
CREATE INDEX IF NOT EXISTS idx_subscription_pending 
ON subscription_requests(status) 
WHERE status = 'pending';
