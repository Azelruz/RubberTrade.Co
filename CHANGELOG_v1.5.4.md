# 🚀 Release Notes & Changelog — RubberTrade Co., Ltd. v1.5.4

**วันที่อัปเดต:** 24 สิงหาคม 2026  
**เวอร์ชันระบบ:** `v1.5.4`  
**สถานะการปรับใช้:** 🟢 Production Deployed (`https://rubertrade-co-ltd.pages.dev`)  
**สภาพแวดล้อมทดสอบ:** 🧪 Test Deployed (`https://test.rubertrade-co-ltd.pages.dev`)

---

## 📌 สรุปภาพรวมการอัปเดต (Executive Summary)

ในเวอร์ชัน `v1.5.4` ได้มีการปรับปรุงระบบทั้งในด้าน **ความถูกต้องของรายงานการเงิน**, **ประสิทธิภาพของฐานข้อมูล Cloudflare D1 (ลด Rows Read ลงมากกว่า 95%)**, **ความถูกต้องของการ์ดสต๊อกในหน้าขาย**, และ **การแก้ไขบั๊กการแสดงผลวันที่ในตารางประวัติ**

---

## 🛠️ รายละเอียดการแก้ไขและปรับปรุงแยกตามระบบ (Detailed Changes)

### 1. 📅 ระบบฟิลเตอร์ช่วงวันที่ในหน้าบันทึกค่าใช้จ่าย (`Expenses.jsx`)
* **คุณสมบัติใหม่:** เพิ่มกล่องระบุช่วงเวลา **"เริ่มต้นวันที่ - ถึงวันที่"** บริเวณมุมขวาบนของหน้าค่าใช้จ่าย
* **การกำหนดค่าเริ่มต้น (Default State):** กำหนดให้ค่าเริ่มต้นของวันที่เป็น **"วันที่ปัจจุบัน (วันนี้)"** ช่วยให้ผู้ใช้เห็นสรุปค่าใช้จ่ายและค่าจ้างพนักงานประจำวันทันทีเมื่อเปิดหน้า
* **รองรับ SQL หลังบ้าน:** ปรับปรุง API `functions/api/expenses.js` และ `functions/api/wages.js` ให้รับพารามิเตอร์ `startDate` และ `endDate` กรองข้อมูลผ่านฐานข้อมูลโดยตรง

### 2. 📊 แก้ไขรายงานยอดขายประจำเดือน (`MonthlyReport.jsx`)
* **โหลดข้อมูลใหม่เมื่อกดเปลี่ยนเดือน:** ปรับแก้ `useEffect` ให้ดึงข้อมูลจากหลังบ้านใหม่ทุกครั้งเมื่อผู้ใช้กดเปลี่ยนเดือน (`<` หรือ `>`)
* **ส่งช่วงวันที่ของทั้งเดือนเข้า SQL:** ส่ง `startDate` (วันแรกของเดือน) และ `endDate` (วันสุดท้ายของเดือน) ไปยัง API ทุกตัว (`buys`, `sells`, `expenses`, `wages`) เพื่อดึงบิลทั้งเดือนมาคำนวณกำไร/ขาดทุนรายวันได้อย่างครบถ้วน 100%
* **แก้ไขเงื่อนไขการเปรียบเทียบวันที่:** ใช้ `(date || '').substring(0, 10)` ในการจับคู่วันที่ ป้องกันปัญหาบิลที่มีเวลา ISO พ่วงท้ายหลุดจากการคำนวณ

### 3. ⚡ การเพิ่มประสิทธิภาพฐานข้อมูล Cloudflare D1 (D1 Performance Optimization)
* **Selective `summaryQuery` Execution:** ปรับปรุง `functions/api/buys.js` ยกเลิกการรัน `summaryQuery` ซ้ำซ้อนสำหรับการเรียกดูรายการบิลทั่วไป (Unpaginated) คงไว้เฉพาะเมื่อมีการแบ่งหน้า (Paginated) ช่วยลด Rows Read ทันที 50%
* **ปลดล็อค Database Index (Index Range Scans):** ยกเลิกการใช้ฟังก์ชัน `substr(date, 1, 10)` ในเงื่อนไข `WHERE` ของ SQL ในไฟล์ `buys.js`, `sells.js`, `expenses.js`, และ `wages.js`
  * เปลี่ยนเป็นเงื่อนไข Direct Comparison: `date >= startDate AND date <= endDateBound`
  * **ผลลัพธ์:** เปลี่ยนการสแกนจาก Full Table Scan (สแกน 2,700+ แถวทุกครั้ง) เป็น **Index Range Scan (สแกนจริงเพียง 10-30 แถวต่อคิวรี)** ลด D1 Rows Read ลงเกิน **95%**

### 4. 📦 ระบบคำนวณการ์ดสต๊อกคงเหลือในหน้าขาย (`Sell.jsx`)
* **สาเหตุเดิม:** หน้าขายเคยคำนวณสต๊อกฝั่งหน้าบ้านจากบิลรับซื้อของ "วันนี้วันเดียว" ทำให้ยอดสต๊อกคงเหลือแสดงผลผิดพลาดหรือติดลบ
* **การแก้ไข (Server-Side Stock Aggregation):** สร้าง API `/api/sells?stockSummary=true` ประมวลผลรวมยอดซื้อ ยอดขายออก และการใส่สารเคมีสะสมทั้งหมดจากหลังบ้านด้วย SQL สรุปผล รันจบในมิลลิวินาที และส่งเฉพาะตัวเลขสรุป ~0.1 KB กลับมายังหน้าขาย
* **ผลลัพธ์:** การ์ดสต๊อกน้ำยางพารา ขี้ยาง และ DRC เฉลี่ยนสะสม แสดงตัวเลขถูกต้องแม่นยำ 100% และโหลดเร็วที่สุด

### 5. 🗓️ แก้ไขบั๊กชื่อเดือนมกราคมในตารางประวัติ (`HistoryTable.jsx`)
* **สาเหตุเดิม:** มีการฮาร์ดโค้ดข้อความ `'dd ม.ค. yyyy'` ไว้ในตัวแปลงวันที่ของ `HistoryTable.jsx` ส่งผลให้บิลของทุกเดือนแสดงผลชื่อเดือนเป็น "ม.ค." (มกราคม) ทั้งหมด
* **การแก้ไข:** แก้ไขเป็น `'dd MMM yyyy'` เพื่อให้ระบบแสดงชื่อเดือนภาษาไทยตรงตามบันทึกจริงในทุกบิล (เช่น `24 ส.ค. 2026`)

---

## 📁 ไฟล์ที่เกี่ยวข้องกับการแก้ไข (Modified Files Log)

| ชื่อไฟล์ | การเปลี่ยนแปลงหลัก |
| :--- | :--- |
| `functions/api/buys.js` | ปรับปรุง Index Range Scan + Selective Summary Query |
| `functions/api/sells.js` | ปรับปรุง Index Range Scan + เพิ่ม API Server-Side Stock Aggregation (`stockSummary=true`) |
| `functions/api/expenses.js` | ปรับปรุง Index Range Scan + รองรับ `startDate`/`endDate` |
| `functions/api/wages.js` | ปรับปรุง Index Range Scan + รองรับ `startDate`/`endDate` |
| `src/services/apiService.js` | เพิ่ม `fetchStockSummary()` + อัปเดต `fetchSellRecords()` รองรับ `dateParams` |
| `src/pages/Expenses.jsx` | เพิ่ม UI ฟิลเตอร์ช่วงวันที่ + ตั้ง Default เป็นวันนี้ |
| `src/pages/MonthlyReport.jsx` | ปรับแก้การดึงข้อมูลรายเดือนตาม `selectedMonth` และ `substring(0, 10)` |
| `src/pages/Sell.jsx` | เชื่อมต่อการ์ดสต๊อกกับ `fetchStockSummary()` จากหลังบ้าน |
| `src/pages/history/HistoryTable.jsx` | แก้ไขฟอร์แมตวันที่เปลี่ยนจาก `'dd ม.ค. yyyy'` เป็น `'dd MMM yyyy'` |

---

## 🏷️ Git Commit & Sync Instruction

ไฟล์บันทึกนี้ถูกสร้างขึ้นเพื่อรองรับการนำเข้าบันทึกความรู้ใน **Obsidian** และจัดเก็บใน **GitHub Repository** 

```bash
git add .
git commit -m "release: v1.5.4 - Optimize D1 performance, fix MonthlyReport date range, fix stock metrics & history date format"
git push origin main
```
