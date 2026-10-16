-- Migration 0032: Plot Activities, Fertilizer Logs & Care Management (v1.8.2)

CREATE TABLE IF NOT EXISTS plot_activities (
    id TEXT PRIMARY KEY,
    plotId TEXT NOT NULL,
    farmerId TEXT NOT NULL,
    activityType TEXT NOT NULL, -- 'fertilizer', 'mowing', 'weed_control', 'disease_treatment', 'service_fee', 'other'
    date DATE NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    fertilizerFormula TEXT, -- สูตรปุ๋ย เช่น 29-5-18, 20-8-20, อินทรีย์, โดโลไมท์
    brand TEXT, -- ยี่ห้อปุ๋ย
    amountKg REAL DEFAULT 0, -- ปริมาณรวม (กก.)
    bags REAL DEFAULT 0, -- จำนวนกระสอบ (50 กก.)
    cost REAL DEFAULT 0, -- ค่าใช้จ่าย/ค่าบริการที่จ่ายไป (บาท)
    serviceProvider TEXT, -- ผู้รับจ้าง/ร้านค้า เช่น 'จ้างนายสมศักดิ์', 'ร้านปุ๋ยการเกษตร'
    isPaid INTEGER DEFAULT 1, -- 1 = จ่ายแล้ว, 0 = ค้างจ่าย
    nextDueDate DATE, -- วันครบกำหนดรอบถัดไป (สำหรับปุ๋ย หรือ ตัดหญ้า)
    note TEXT,
    userId TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plotId) REFERENCES land_plots(id) ON DELETE CASCADE,
    FOREIGN KEY (farmerId) REFERENCES farmers(id) ON DELETE CASCADE
);

-- Covering Indexes
CREATE INDEX IF NOT EXISTS idx_plot_activities_plot_date ON plot_activities(plotId, date DESC);
CREATE INDEX IF NOT EXISTS idx_plot_activities_user_farmer ON plot_activities(userId, farmerId, date DESC);
CREATE INDEX IF NOT EXISTS idx_plot_activities_type ON plot_activities(plotId, activityType, date DESC);
