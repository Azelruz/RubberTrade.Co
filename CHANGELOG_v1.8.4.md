# 🚀 Release Notes & Changelog — RubberTrade Co., Ltd. v1.8.4

**วันที่อัปเดต:** 19 ตุลาคม 2026  
**เวอร์ชันระบบ:** `v1.8.4`  
**สถานะการปรับปรุง:** Completed & Deployed to All Production Branches

---

## 📌 สรุปไฮไลต์ประจำเวอร์ชัน (Release Highlights)

ในเวอร์ชัน `v1.8.4` มุ่งเน้นการแก้ปัญหาความถูกต้องของข้อมูลออฟไลน์และการซิงค์ข้อมูล (Offline Data Integrity & Auto-Sync Engine):
1. **แก้ปัญหาข้อมูลรับซื้อซ้ำซ้อน 2 แถวบนหน้าจอ (Offline Deduplication):** ขจัดปัญหาการแสดงผลเลขบิลซ้ำซ้อนระหว่าง UUID ชั่วคราวกับเลขบิลจริง (`B-XXXX`)
2. **ระบบป้องกันข้อมูลชนกันและการแย่งคิว (Race Condition Prevention):** ใช้ Shared Promise ควบคุมการทำงานร่วมกันระหว่าง `syncQueueToServer` และ `hydrateLocalDB`
3. **ระบบป้องกันเซิร์ฟเวอร์สร้างบิลซ้ำ (Cloudflare D1 Idempotency Check):** ตรวจสอบ Nonce Suffix 6 ตัวท้าย ป้องกันเลขบิลเบิ้ลและตัวนับ Sequence Counter กระโดดข้าม
4. **แก้ไขระบบซิงค์อัตโนมัติเมื่อเน็ตกลับมา (Auto-Sync Reconnection Engine):** แก้ไขข้อผิดพลาด `ReferenceError: supabase is not defined` และเปลี่ยนไปใช้ `getFastSession()` ความเร็วสูง พร้อมเพิ่มตัวดักจับเมื่อคลิกสลับกลับมาที่หน้าจอ (`focus` / `visibilitychange`)
5. **Production Rollout (Deploy All):** ติดตั้งเวอร์ชันใหม่พร้อมกันทั้ง 3 สาขา Production (สำนักงานใหญ่, ปาดังเบซาร์, อาเช่ 2)

---

## 🛠️ รายละเอียดการปรับปรุงในเวอร์ชัน v1.8.4

### 1. 🛡️ การกำจัดข้อมูลซ้ำซ้อนในตารางรับซื้อ (Offline Deduplication)
- **`src/pages/Buy.jsx` (`mergeRecords`):**
  - เพิ่มระบบตรวจจับ 6-character Nonce Suffix (`-NONCE`) จากเลขบิลจริงที่เพิ่งได้รับจากเซิร์ฟเวอร์
  - เมื่อพบว่าบิลจริงมีรหัส Nonce ตรงกับรายการ UUID ชั่วคราวเดิมในหน้าจอ ระบบจะตัดรายการ UUID ออกทันที ทำให้บิลเปลี่ยนเป็นเลขจริงในแถวเดิมอย่างเนียนตา ไม่แสดงรายการซ้ำ 2 บรรทัด
- **`src/services/api/apiClient.js` & `src/services/syncService.js`:**
  - เพิ่มฟังก์ชัน `markPendingDelete(table, id)` เพื่อมาร์กรหัส UUID เดิมลงในถังขยะชั่วคราว ป้องกันไม่ให้กระบวนการผสานข้อมูลในเครื่องนำรหัสเดิมกลับมาแสดง

### 2. ⚡ ระบบป้องกัน Race Condition ระหว่างส่งคิวและรีเฟรชข้อมูล
- **`src/services/syncService.js`:**
  - เปลี่ยนตัวแปรล็อกสถานะ `isSyncing` เป็น **Shared Promise (`activeSyncPromise`)**
  - ในฟังก์ชัน `hydrateLocalDB()` เพิ่มคำสั่งรอ `await activeSyncPromise` ให้การส่งคิวออฟไลน์เสร็จสมบูรณ์และลบออกจาก `db.sync_queue` ก่อน จึงจะเริ่มดึงข้อมูลรอบใหม่ ขจัดปัญหาข้อมูลผีค้างใน IndexedDB

### 3. 🗄️ ระบบ Idempotency ใน Cloudflare D1 Backend
- **`functions/api/_id_utils.js` (`generateNextId`):**
  - เพิ่มการตรวจสอบก่อนออกเลขบิลและบวกตัวนับ: หากบิลที่ส่งเข้ามามีรหัส Nonce (มาจากออฟไลน์) ระบบจะค้นหาในฐานข้อมูลก่อนว่ามีบิลของร้านค้านี้ที่ลงท้ายด้วย `-NONCE` อยู่แล้วหรือไม่
  - หากพบว่ามีบิลเดิมอยู่แล้ว จะคืนค่าเลขบิลเดิมทันที ป้องกันบิลเบิ้ลและป้องกัน Sequence Counter กระโดดข้ามเมื่อสัญญาณเน็ตหลุดระหว่างส่งคำขอ

### 4. 🔄 แก้ไขระบบซิงค์อัตโนมัติเมื่อเน็ตกลับมา (Auto-Sync Reconnection)
- **`src/services/syncService.js` (`startBackgroundSync`):**
  - แก้ไข Silent Crash จากการเรียก `supabase.auth.getSession()` โดยไม่ได้ import ตัวแปร โดยเปลี่ยนมาใช้ `getFastSession()` ที่อ่านโทเค็นจาก In-Memory RAM ทันที
  - เพิ่ม Event Listener สำหรับ `focus` และ `visibilitychange` เพื่อสั่งซิงค์ทันทีเมื่อผู้ใช้คลิกกลับเข้ามาที่หน้าต่างโปรแกรม
  - ปรับลดรอบเวลา Background Polling สำรองจาก 60 วินาที เหลือ 20 วินาที
  - เพิ่มตัวป้องกันการลงทะเบียน Listener ซ้ำซ้อน (`isBackgroundSyncStarted`)

### 5. 🌐 Production Deployment (Deploy All 3 Branches)
- ปรับปรุงเลขเวอร์ชันระบบใน `package.json`, `Layout.jsx` และ `LandPlots.jsx` เป็น `v1.8.4`
- ทำการ Build และ Deploy สู่ระบบ Production ครบทุกสาขา:
  - **สำนักงานใหญ่:** https://rubertrade-co-ltd.pages.dev
  - **สาขาปาดังเบซาร์:** https://rubertrade-padang.pages.dev
  - **สาขาอาเช่ 2:** https://rubertrade-ache2.pages.dev
