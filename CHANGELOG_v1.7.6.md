# 🚀 Release Notes & Changelog — RubberTrade Co., Ltd. v1.7.6

**วันที่อัปเดต:** 3 กันยายน 2026  
**เวอร์ชันระบบ:** `v1.7.6`  
**สถานะการปรับปรุง:** Completed & Deployed to Test Branch

---

## 📌 สรุปไฮไลต์ประจำเวอร์ชัน (Release Highlights)

ในเวอร์ชัน `v1.7.6` ได้ปรับปรุงโครงสร้างดัชนีฐานข้อมูล (Database Indexes) ครั้งใหญ่เพื่อเพิ่มความเร็วในการสแกนข้อมูล ป้องกันปัญหา **Filesort** และลด **D1 Rows Read** ลงได้มากกว่า 99.9% รวมทั้งสิ้น **46 Indexes** ครอบคลุมการทำงานของระบบทุกโมดูล

---

## 🛠️ รายละเอียดการปรับปรุงในเวอร์ชัน v1.7.6

### 1. 🗄️ Database Index Optimizations (Migrations 0029 & 0030)
- **Migration 0029:**
  - `idx_sells_search_lookup`: ค้นหาบิลส่งขายยางด่วนใน Global Search
  - `idx_promotions_user_date`: ประวัติแลกของรางวัลแบบ Pre-sorted
  - `idx_loans_user_borrower_date`: ประวัติเงินเบิกล่วงหน้ารายคนแบบ Pre-sorted
  - `idx_loans_deduct_lookup`: ระบบหักชำระหนี้อัตโนมัติและคืนหนี้ LIFO ท้ายบิล
  - `idx_audit_logs_user_entity_created`: ค้นหาบันทึกกิจกรรมแยกระบบ (Buys, Sells, Farmers)
  - `idx_expenses_user_category_date`: รายงานรายจ่ายแยกหมวดหมู่
  - `idx_land_plots_user_created`: ตารางโฉนดแปลงสวนยางพารา
  - `idx_farmers_user_search`: ค้นหาเกษตรกรจากชื่อและเบอร์โทรศัพท์ (Covering Index)
  - `idx_employees_farmer_fk` & `idx_wages_staff_fk`: ป้องกัน Full Table Scan เมื่อลบเกษตรกรหรือพนักงาน
- **Migration 0030:**
  - `idx_buys_user_type_date`: คำนวณ Yield พยากรณ์อากาศย้อนหลัง 60 วันเฉพาะบิลน้ำยางสด
  - `idx_wages_user_staff_date`: สลิปและประวัติค่าแรงพนักงานเจาะจงรายคน
  - `idx_farmers_user_lineid`: บรอดแคสต์ราคายางทาง LINE ผ่าน Index-Only Scan
  - `idx_chemical_usage_user_chem_date`: รายงานสารเคมีคงเหลือแยกประเภท

### 2. 📄 Documentation & System Schema
- อัปเดต `schema_final.sql` รวมคำสั่งสร้าง Index ทั้งหมดสำหรับสภาพแวดล้อมใหม่
- อัปเดต `Database_Indexes_Summary.md` เป็นเวอร์ชัน v1.7.6 สรุป Index ทั้งหมด 46 ดัชนี
