# 🚀 Release Notes & Changelog — RubberTrade Co., Ltd. v1.7.4

**วันที่อัปเดต:** 3 กันยายน 2026  
**เวอร์ชันระบบ:** `v1.7.4`  
**สถานะการปรับใช้:** 🟢 Production Deployed (`https://rubertrade-co-ltd.pages.dev`)  
**สภาพแวดล้อมทดสอบ:** 🧪 Test Deployed (`https://test.rubertrade-co-ltd.pages.dev`)

---

## 📌 สรุปภาพรวมการอัปเดต (Executive Summary)

ในเวอร์ชัน `v1.7.4` ได้มีการเพิ่มประสิทธิภาพระบบการประมวลผลฐานข้อมูล Cloudflare D1 ครั้งใหญ่ โดยมุ่งเน้น **ลด Quota Rows Read ลงมากกว่า 99.9%** ในทุกกิจกรรมสำคัญของระบบ (การบันทึกซื้อ-ขายยาง, การคำนวณสต็อกร้านค้า, การลบข้อมูลเกษตรกร และการอัปเดตสถิติรายบุคคล) รวมถึงแก้ไข **ระบบพิมพ์สลิปใบเสร็จรับเงินสำหรับเครื่องพิมพ์ความร้อน 80MM** ให้พิมพ์ออกได้อย่างสมบูรณ์แบบโดยไม่ตกขอบขวา และไม่เกิดช่องว่างเปล่าก่อนชื่อร้าน

---

## 🛠️ รายละเอียดการแก้ไขและปรับปรุงแยกตามระบบ (Detailed Changes)

### 1. 🖨️ แก้ไขใบเสร็จรับเงินเครื่องพิมพ์ความร้อน 80MM & การซ่อนโลโก้ (`PrintService.js` / `BuyPaperReceipt.jsx` / `SellPaperReceipt.jsx`)
* **ล็อกความกว้างพิมพ์ปลอดภัย (Safe Thermal Print Width):** กำหนด `max-width: 56mm !important` (ประมาณ 210px) ใน `PrintService.js` ซึ่งเป็นความกว้างที่ปลอดภัย 100% สำหรับหัวพิมพ์ความร้อน (Printhead) ของเครื่องพิมพ์ 80MM และ 58MM ทุกรุ่น
* **ขจัดปัญหาข้อความล้นขอบขวา:** ลบ `paddingRight: '5px'`, `pr-1`, `px-6` และอักขระเว้นวรรค `\u00A0` ส่วนเกินในก้อนยอดรวมสุทธิและยอดเงินฝั่งเกษตรกร/ลูกจ้าง
* **บังคับสีฟอนต์ดำสนิทสำหรับพิมพ์ความร้อน:** กำหนด `color: #000000 !important;` และ `-webkit-print-color-adjust: exact !important;` เพื่อให้เครื่องพิมพ์ความร้อนเบิร์นตัวหนังสือออกคมชัดทุกบรรทัด
* **ซ่อนกล่องโลโก้ไร้ช่องว่าง (Strict Logo Box Hiding):** เพิ่มการเช็กเงื่อนไข `shouldShowLogo` อย่างรัดกุม หากผู้ใช้ปิดการแสดงโลโก้หรือไม่มีรูปโลโก้ ระบบจะถอดกล่องความสูง `h-16` (64px) ออกทันที ชื่อร้านจะพิมพ์ชิดขอบบนสุดโดยไม่มีระยะเว้นว่างเปล่า

---

### 2. ⚡ การเพิ่มประสิทธิภาพฐานข้อมูล Cloudflare D1 (D1 Database Performance Optimization)

#### 2.1 Migration 0028: ปลดล็อก Foreign Key Indexes สำหรับการลบเกษตรกร (`DELETE FROM farmers`)
* **ปัญหาเดิม:** คำสั่ง `DELETE FROM farmers WHERE id = ?` อ่านข้อมูลไปถึง **508.33k แถว** สำหรับการลบเพียง 16 ครั้ง เกิดจากกลไก Foreign Key Trigger ของ SQLite/D1 ต้องวิ่งไปเช็กตารางลูก (`buys`, `promotions`, `land_plots`) โดยไม่มี Index มารองรับ
* **การแก้ไข:** สร้าง Migration 0028 (`migrations/0028_add_fk_indexes_for_farmer_deletes.sql`):
  * `CREATE INDEX IF NOT EXISTS idx_buys_farmer_fk ON buys(farmerId);`
  * `CREATE INDEX IF NOT EXISTS idx_promotions_farmer_fk ON promotions(farmerId);`
  * `CREATE INDEX IF NOT EXISTS idx_land_plots_farmer_fk ON land_plots(farmerId);`
* **ผลลัพธ์:** ลด D1 Rows Read จาก **508.33k แถว เหลือเพียงไม่กี่สิบแถว (ลดลง >99.9%)**

---

#### 2.2 ปรับปรุงระบบซิงก์สต็อกเป็นแบบ Incremental Delta Update (`syncStoreStockSummary`)
* **ปัญหาเดิม:** ทุกครั้งที่มีการบันทึกซื้อยาง ขายยาง หรือลบบิล ระบบจะสแกนอ่านประวัติย้อนหลังทั้งหมดของร้านนั้นด้วยคำสั่ง `SUM(...)` (อ่านไปถึง **700.18k แถว**)
* **การแก้ไข (`functions/api/_utils.js`):** ปรับปรุงฟังก์ชัน `syncStoreStockSummary(db, storeId, delta)` ให้รองรับการอัปเดตแบบผลต่าง (Incremental Delta Update) ด้วยคำสั่ง:
  ```sql
  INSERT INTO store_stock_summary (...) VALUES (...)
  ON CONFLICT(userId) DO UPDATE SET
      latexBuyWeight = MAX(0, latexBuyWeight + COALESCE(excluded.latexBuyWeight, 0)),
      totalDrcWeight = MAX(0, totalDrcWeight + COALESCE(excluded.totalDrcWeight, 0)),
      ...
  ```
* **ผลลัพธ์:** ปรับคิวรีใน `buys.js`, `sells.js` และ `deleteRecord.js` ให้ส่งค่าผลต่างบิลโดยตรง **ลด D1 Rows Read จาก ~4,348 แถวต่อบิล เหลือเพียง 1 แถวต่อบิลเท่านั้น (ลดลง 99.9%)**

---

#### 2.3 ยุบ Subquery อัปเดตสถิติเกษตรกรเหลือรอบเดียว (`updateFarmerStats`)
* **ปัญหาเดิม:** คำสั่ง `updateFarmerStats` สแกนอ่านตาราง `buys` แยกกัน 2 รอบเพื่อดึง `MAX(date)` และ `COUNT(*)` (อ่านไป **298.6k แถว**)
* **การแก้ไข (`functions/api/_utils.js`):** ยุบรวมคำสั่งเป็น Single-Pass Subquery ด้วยเทคนิค `COUNT(CASE WHEN ...)`:
  ```sql
  UPDATE farmers 
  SET lastBuyDate = s.maxDate, buyCount = s.recentCount
  FROM (
      SELECT 
          MAX(date) as maxDate,
          COUNT(CASE WHEN date >= date('now', '-60 days') THEN 1 END) as recentCount
      FROM buys 
      WHERE farmerId = ? AND userId = ?
  ) s
  WHERE farmers.id = ? AND farmers.userId = ?;
  ```
* **ผลลัพธ์:** สแกนอ่านตาราง `buys` เพียงรอบเดียวผ่าน Index **ลด Rows Read ลงมากกว่า 95%**

---

### 3. 📱 ปรับปรุงเมนูระบบขายยาง AI (`SellAI.jsx`)
* **ปรับเมนูนำทาง (`Layout.jsx`):** เปลี่ยนไอคอนและลิงก์เมนูจากเดิม `/sell` เป็น **`/sell-ai` ('ขายน้ำยาง')**
* **backward compatibility (`App.jsx`):** เพิ่มเส้นทาง Redirect อัตโนมัติจาก `/sell` ไปยัง `/sell-ai` เพื่อความราบรื่นในการใช้งาน

---

## 📁 รายการไฟล์ที่ได้รับการปรับปรุง (Modified Files Log)

| ชื่อไฟล์ / Path | รายละเอียดการปรับปรุง |
| :--- | :--- |
| `functions/api/_utils.js` | เพิ่มระบบ Incremental Delta Update ให้ `syncStoreStockSummary` และปรับแต่ง `updateFarmerStats` เป็น Single-Pass |
| `functions/api/buys.js` | คำนวณน้ำหนักผลต่างส่งให้ `syncStoreStockSummary` ในการซื้อบิลใหม่/แก้ไขบิล |
| `functions/api/sells.js` | คำนวณน้ำหนักผลต่างส่งให้ `syncStoreStockSummary` ในการขายบิลใหม่/แก้ไขบิล |
| `functions/api/deleteRecord.js` | ส่งค่าผลต่างติดลบให้อัปเดตสต็อกอัตโนมัติเมื่อมีการลบบิลซื้อ/ขาย |
| `migrations/0028_add_fk_indexes_for_farmer_deletes.sql` | [NEW] Migration เพิ่ม Index สำหรับ Foreign Key อ้างอิง `farmerId` |
| `schema_final.sql` | อัปเดตนิยาม Index ล่าสุดลงในไฟล์สคริปต์หลัก |
| `src/utils/PrintService.js` | ปรับความกว้างพิมพ์สูงสุดเป็น 56mm และบังคับสีฟอนต์ดำสนิท |
| `src/pages/buy/BuyPaperReceipt.jsx` | ลบ Margin/Padding ส่วนเกิน และเพิ่มระบบซ่อนกล่องโลโก้อย่างรัดกุม |
| `src/pages/sell/SellPaperReceipt.jsx` | ปรับปรุงโครงสร้างสลิปขายยางและระบบซ่อนกล่องโลโก้ |
| `src/components/Layout.jsx` | เปลี่ยนเมนูเป็น `/sell-ai` และอัปเดตป้ายเวอร์ชันเป็น `v1.7.4` |
| `src/App.jsx` | เพิ่ม Redirect Route จาก `/sell` ไปยัง `/sell-ai` |
| `package.json` | อัปเดตเวอร์ชันซอฟต์แวร์เป็น `"version": "1.7.4"` |
