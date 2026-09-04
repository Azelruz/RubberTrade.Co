# 🗄️ Database Indexes Summary — RubberTrade Co., Ltd.

**วันที่อัปเดต:** 3 กันยายน 2026  
**เวอร์ชันระบบ:** `v1.7.6`  
**จำนวน Index ทั้งหมด:** 46 Indexes  
**ฐานข้อมูล:** Cloudflare D1 (SQLite)

---

## 📌 สรุปภาพรวม (Executive Summary)

ระบบฐานข้อมูล RubberTrade ถูกออกแบบด้วยสถาปัตยกรรม **Multi-Tenancy** โดยใช้คอลัมน์ `userId` ในการแยกข้อมูลของแต่ละร้านค้า ทุกตารางดัชนี (Index) ถูกสร้างขึ้นเพื่อเร่งความเร็วในการดึงข้อมูลแบบ **Index Range Scan** และป้องกันปัญหา **Full Table Scan** ในกลไก Foreign Key Triggers ของ SQLite ส่งผลให้ระบบประหยัด Quota การอ่านข้อมูล (D1 Rows Read) ลงได้มากกว่า 99.9%

---

## 🛠️ รายละเอียด Index ทั้งหมดในระบบ (Categorized Index Reference)

### 1. 🛒 หมวดการรับซื้อน้ำยาง (Buys Management & Analytics)

| ชื่อ Index | คอลัมน์ที่สแกน (Columns) | หน้าที่และการทำงานในระบบ |
| :--- | :--- | :--- |
| **`idx_buys_user_date`** | `buys(userId, date DESC, created_at DESC)` | **เร่งความเร็วตารางรับซื้อประจำวัน/ประจำเดือน**: ดึงรายการซื้อยางตามช่วงวันที่เลือก |
| **`idx_buys_user_updated`** | `buys(userId, updated_at DESC)` | **ซิงก์ข้อมูลออฟไลน์ (PWA Offline Sync)**: ดึงเฉพาะบิลที่มีการแก้ไขล่าสุดส่งไปอัปเดตบนมือถือ/แท็บเล็ต |
| **`idx_buys_farmer`** | `buys(userId, farmerId)` | **ดึงประวัติซื้อแยกรายคน**: ค้นหาบิลรับซื้อทั้งหมดของเกษตรกรรายนั้นๆ |
| **`idx_buys_farmer_fk`** ⭐ *(v1.7.4)* | `buys(farmerId)` | **ป้องกัน Full Scan ตอนลบเกษตรกร**: รองรับ Foreign Key (`ON DELETE SET NULL`) ลด Rows Read ลง 99.9% |
| **`idx_buys_dashboard_chart`** | `buys(userId, date, rubberType, total, pricePerKg)` | **โหลดกราฟแดชบอร์ดพริบตา**: ดึงตัวเลขสรุปยอดซื้อสร้างกราฟจาก Index โดยตรง (Covering Index) |
| **`idx_buys_user_status`** | `buys(userId, farmerStatus, employeeStatus, date)` | **ตารางค้างจ่ายค่ายาง (`Payments.jsx`)**: ดึงบิลที่สถานะยังไม่ได้จ่ายเงิน (`Pending`) |
| **`idx_buys_promo_stats`** | `buys(userId, farmerId, dryRubber, ...)` | **คำนวณแต้มโปรโมชัน**: สรุปยอดน้ำหนักยางสะสมและ DRC ของเกษตรกร |
| **`idx_buys_search_lookup`** | `buys(userId, farmerName, id)` | **ช่องค้นหาด่วน (Global Search)**: ค้นหาด้วยชื่อเกษตรกรหรือเลขบิลรับซื้อ |
| **`idx_buys_user_type_date`** ⭐ *(v1.7.6)* | `buys(userId, rubberType, date DESC)` | **คำนวณ Yield พยากรณ์อากาศย้อนหลัง**: ดึงบิลน้ำยางสด ('latex') 60 วันย้อนหลังตรงเข้า Index Range Scan |
| **`idx_daily_buys_summary_user_date`** | `daily_buys_summary(userId, date DESC)` | **สรุปยอดซื้อรายวัน**: ดึงตัวเลขสรุปยอดซื้อรวมประจำวันไปแสดงบนหน้าแรก |

---

### 2. 🚛 หมวดการขายยางส่งโรงงาน (Sells Management & Stock)

| ชื่อ Index | คอลัมน์ที่สแกน (Columns) | หน้าที่และการทำงานในระบบ |
| :--- | :--- | :--- |
| **`idx_sells_user_date`** | `sells(userId, date DESC, created_at DESC)` | **ตารางประวัติส่งขายยาง**: ดึงรายการขายยางส่งโรงงานตามช่วงวันที่ |
| **`idx_sells_user_updated`** | `sells(userId, updated_at DESC)` | **ซิงก์ข้อมูลออฟไลน์การขาย**: ดึงบิลขายยางที่มีการปรับปรุงล่าสุด |
| **`idx_sells_dashboard_chart`** | `sells(userId, date, rubberType, total, pricePerKg)` | **กราฟรายได้การขาย**: ดึงข้อมูลไปสร้างกราฟเปรียบเทียบยอดขายบนแดชบอร์ด |
| **`idx_daily_sells_summary_user_date`** | `daily_sells_summary(userId, date DESC)` | **สรุปยอดขายรายวัน**: ดึงยอดยางส่งโรงงานรายวันไปแสดงหน้าสรุป |
| **`idx_sells_search_lookup`** ⭐ *(v1.7.5)* | `sells(userId, buyerName, id)` | **ค้นหาบิลขายยางด่วน (Global Search)**: ค้นหาชื่อโรงงาน/ผู้ซื้อ หรือเลขที่บิลส่งขายยาง |

---

### 3. 👥 หมวดจัดการข้อมูลเกษตรกร, ลูกจ้าง & รายจ่าย (Farmers, Employees, Staff & Expenses)

| ชื่อ Index | คอลัมน์ที่สแกน (Columns) | หน้าที่และการทำงานในระบบ |
| :--- | :--- | :--- |
| **`idx_farmers_user`** | `farmers(userId)` | **ดึงรายชื่อเกษตรกรทั้งหมด**: ใช้ในหน้าจัดการเกษตรกร |
| **`idx_farmers_user_name`** | `farmers(userId, name ASC)` | **ดรอปดาวน์เลือกชื่อเกษตรกร**: ค้นหาและเรียงลำดับชื่อเกษตรกรตามตัวอักษร ก-ฮ |
| **`idx_farmers_user_search`** ⭐ *(v1.7.5)* | `farmers(userId, name, phone)` | **ค้นหาเกษตรกรด้วยชื่อ/เบอร์โทร**: รองรับ Covering Index ในช่อง Global Search |
| **`idx_farmers_user_lineid`** ⭐ *(v1.7.6)* | `farmers(userId, lineId)` | **ดึงรายชื่อแจ้งเตือนราคายางทาง LINE**: บรอดแคสต์ราคายางประจำวันผ่าน Index-Only Scan |
| **`idx_employees_user`** | `employees(userId)` | **ดึงรายชื่อคนกรีดยาง/ลูกจ้างสวน**: ใช้ในหน้าจัดการลูกจ้าง |
| **`idx_employees_user_name`** | `employees(userId, name ASC)` | **ดรอปดาวน์เลือกชื่อลูกจ้าง**: เรียงลำดับชื่อลูกจ้างตามตัวอักษร |
| **`idx_employees_farmer_fk`** ⭐ *(v1.7.5)* | `employees(farmerId)` | **ป้องกัน Full Scan ตอนลบเกษตรกร**: รองรับ Foreign Key Cascade บนตารางลูกจ้าง |
| **`idx_staff_user_name`** | `staff(userId, name ASC)` | **รายชื่อพนักงานลานยาง**: ค้นหาพนักงานประจำร้าน |
| **`idx_wages_user_staff_date`** ⭐ *(v1.7.6)* | `wages(userId, staffId, date DESC)` | **สลิปและประวัติค่าแรงรายบุคคล**: ดึงรายการค่าแรงพนักงานเจาะจงรายคนเรียงตามวันที่ |
| **`idx_wages_staff_fk`** ⭐ *(v1.7.5)* | `wages(staffId)` | **ป้องกัน Full Scan ตอนลบพนักงาน**: รองรับ Foreign Key Cascade (`ON DELETE CASCADE`) |
| **`idx_expenses_user_category_date`** ⭐ *(v1.7.5)* | `expenses(userId, category, date DESC)` | **รายงานรายจ่ายแยกหมวดหมู่**: ดึงข้อมูลค่าน้ำมัน ค่าเคมี ซ่อมบำรุง ตามหมวดหมู่และช่วงเวลา |
| **`idx_farmer_emp_user_default`** | `farmer_employees(userId, isDefault DESC)` | **ดึงคนกรีดขาประจำอัตโนมัติ**: ดึงชื่อคนกรีดและ % ส่วนแบ่งเมื่อเลือกเกษตรกร |
| **`idx_fe_user_farmer_emp`** | `farmer_employees(userId, farmerId, ...)` | **เร่งความเร็ว JOIN ตารางส่วนแบ่ง**: คำนวณยอดเงินโอนแบ่งระหว่างเจ้าของสวนกับคนกรีด |

---

### 4. 💸 หมวดเงินเบิกล่วงหน้า & หักหนี้อัตโนมัติ (Loans & Deductions)

| ชื่อ Index | คอลัมน์ที่สแกน (Columns) | หน้าที่และการทำงานในระบบ |
| :--- | :--- | :--- |
| **`idx_loans_borrower`** | `loans(userId, borrowerId)` | **เช็กยอดหนี้คงเหลือรายคน**: ค้นหายอดเงินเบิกสะสมเมื่อเปิดหน้าชำระเงิน |
| **`idx_loans_user_date`** | `loans(userId, date DESC, created_at DESC)` | **ตารางประวัติเบิกเงิน**: ดึงรายการเบิกเงินล่วงหน้าเรียงตามวันที่ |
| **`idx_loans_user_borrower_date`** ⭐ *(v1.7.5)* | `loans(userId, borrowerId, date DESC, ...)` | **ประวัติเบิกเงินรายคนแบบ Pre-sorted**: อ่านข้อมูลตรงตามลำดับเวลา ปราศจาก Filesort |
| **`idx_loans_deduct_lookup`** ⭐ *(v1.7.5)* | `loans(userId, borrowerId, remainingAmount, ...)`| **หักหนี้อัตโนมัติ & คืนหนี้ LIFO**: ค้นหารายการกู้ยืมที่ค้างชำระหักหนี้ท้ายบิล |
| **`idx_loan_deductions_buy`** | `loan_deductions(userId, buyId)` | **ตรวจสอบการหักหนี้ท้ายบิล**: ดูยอดหักชำระหนี้ท้ายบิลรับซื้อเพื่อพิมพ์ใบเสร็จ |
| **`idx_loan_deductions_borrower`**| `loan_deductions(userId, borrowerId)` | **ประวัติผ่อนชำระรายคน**: ดูประวัติการผ่อนชำระหนี้ทั้งหมดของเกษตรกร/ลูกจ้างคนนั้น |

---

### 5. 🏷️ หมวดโปรโมชัน สวนยาง & สารเคมี (Promotions, Land Plots & Chemicals)

| ชื่อ Index | คอลัมน์ที่สแกน (Columns) | หน้าที่และการทำงานในระบบ |
| :--- | :--- | :--- |
| **`idx_promotions_farmer_fk`** ⭐ *(v1.7.4)* | `promotions(farmerId)` | **ป้องกัน Full Scan ตอนลบเกษตรกร**: รองรับ Foreign Key เมื่อลบเกษตรกรที่มีประวัติแลกโปรโมชัน |
| **`idx_promotions_user_date`** ⭐ *(v1.7.5)* | `promotions(userId, date DESC, created_at DESC)` | **ตารางประวัติแลกรางวัล**: ดึงประวัติแลกของรางวัลเรียงตามวันที่สร้าง |
| **`idx_land_plots_user_farmer`** | `land_plots(userId, farmerId)` | **แผนที่โฉนดสวนยาง (GIS Map)**: ค้นหาแปลงสวนยางพาราแยกตามเกษตรกรเจ้าของสวน |
| **`idx_land_plots_user_created`** ⭐ *(v1.7.5)* | `land_plots(userId, created_at DESC)` | **ตารางแปลงสวนยางทั้งหมด**: ดึงรายการแปลงสวนยางเรียงตามวันที่บันทึก |
| **`idx_land_plots_farmer_fk`** ⭐ *(v1.7.4)* | `land_plots(farmerId)` | **ป้องกัน Full Scan ตอนลบเกษตรกร**: รองรับ Foreign Key เมื่อลบเกษตรกรที่มีแปลงโฉนด |
| **`idx_chemical_usage_user_date`**| `chemical_usage(userId, date DESC)` | **รายงานการใช้เคมี**: ดึงประวัติการใส่แอมโมเนีย/ยาขาวตามช่วงวันที่ |
| **`idx_chemical_usage_user_chem_date`** ⭐ *(v1.7.6)* | `chemical_usage(userId, chemicalId, date DESC)` | **คัดกรองสารเคมีเจาะจงชนิด**: ดึงประวัติการใช้สารเคมีแยกตามประเภท (ammonia/water/medicine) |

---

### 6. ⏱️ หมวดระบบคิว & บันทึกระบบ (Queues, Audits & Counters)

| ชื่อ Index | คอลัมน์ที่สแกน (Columns) | หน้าที่และการทำงานในระบบ |
| :--- | :--- | :--- |
| **`idx_queues_user_status`** | `queues(userId, status)` | **ระบบคิว 3 สถานี (`QueueStation`)**: ดึงคิวที่อยู่ระหว่าง "รอตรวจ DRC" หรือ "รอชำระเงิน" |
| **`idx_queues_date`** | `queues(userId, created_at)` | **รีเซ็ตคิวประจำวัน**: ล้างและจัดลำดับคิวใหม่ในแต่ละวัน |
| **`idx_audit_logs_user_created`** | `audit_logs(userId, created_at DESC)` | **บันทึกการใช้งานระบบ (Audit Log)**: ดูประวัติการสร้าง/แก้ไข/ลบข้อมูลของผู้ใช้ |
| **`idx_audit_logs_user_entity_created`** ⭐ *(v1.7.5)* | `audit_logs(userId, entityType, created_at DESC)` | **ค้นหา Audit Log แยกตาม Feature**: ดึงประวัติกิจกรรมเจาะจงประเภทวัตถุ (Buys, Sells, Farmers) |
| **`idx_counters_lookup`** | `counters(table_name, id_prefix, userId)`| **สร้างเลขที่บิลอัตโนมัติ (Atomic Bill No)**: ป้องกันเลขที่บิลซ้ำกันเมื่อมีผู้ใช้บันทึกพร้อมกันหลายเครื่อง |
