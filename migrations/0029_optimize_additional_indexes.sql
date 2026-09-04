-- Migration 0029: Optimize additional indexes for Sells Search, Promotions, Loans, Audit Logs, Expenses, Land Plots, Farmers & FK Cascades (v1.7.5)

-- 1. Sells Global Search Index
CREATE INDEX IF NOT EXISTS idx_sells_search_lookup 
ON sells(userId, buyerName, id);

-- 2. Promotions History Index
CREATE INDEX IF NOT EXISTS idx_promotions_user_date 
ON promotions(userId, date DESC, created_at DESC);

-- 3. Loans Borrower History Index
CREATE INDEX IF NOT EXISTS idx_loans_user_borrower_date 
ON loans(userId, borrowerId, date DESC, created_at DESC);

-- 4. Loans Deduction Lookup Index (Auto-deduction & LIFO refund)
CREATE INDEX IF NOT EXISTS idx_loans_deduct_lookup 
ON loans(userId, borrowerId, remainingAmount, date ASC, created_at ASC);

-- 5. Audit Logs Entity Filtering Index
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_entity_created 
ON audit_logs(userId, entityType, created_at DESC);

-- 6. Expenses Category Breakdown Index
CREATE INDEX IF NOT EXISTS idx_expenses_user_category_date 
ON expenses(userId, category, date DESC);

-- 7. Land Plots Ordering Index
CREATE INDEX IF NOT EXISTS idx_land_plots_user_created 
ON land_plots(userId, created_at DESC);

-- 8. Farmers Search Lookup Index (Name & Phone)
CREATE INDEX IF NOT EXISTS idx_farmers_user_search 
ON farmers(userId, name, phone);

-- 9. Foreign Key Cascade Indexes for Employees & Wages
CREATE INDEX IF NOT EXISTS idx_employees_farmer_fk 
ON employees(farmerId);

CREATE INDEX IF NOT EXISTS idx_wages_staff_fk 
ON wages(staffId);
