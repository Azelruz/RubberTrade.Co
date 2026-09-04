-- Migration 0030: Secondary audit indexes for Yield Forecast, Staff Wages, LINE Broadcast & Chemical Usage (v1.7.6)

-- 1. Yield Forecast Latex Buys Index
CREATE INDEX IF NOT EXISTS idx_buys_user_type_date 
ON buys(userId, rubberType, date DESC);

-- 2. Staff Wages History Index
CREATE INDEX IF NOT EXISTS idx_wages_user_staff_date 
ON wages(userId, staffId, date DESC);

-- 3. LINE Broadcast Subscribers Covering Index
CREATE INDEX IF NOT EXISTS idx_farmers_user_lineid 
ON farmers(userId, lineId);

-- 4. Chemical Usage Breakdown Index
CREATE INDEX IF NOT EXISTS idx_chemical_usage_user_chem_date 
ON chemical_usage(userId, chemicalId, date DESC);
