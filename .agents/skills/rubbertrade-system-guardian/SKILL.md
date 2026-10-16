---
name: rubbertrade-system-guardian
description: RubberTrade automated system health and daily auditor. Use when asked to run health check, check system status, audit branches, or generate morning/afternoon reports for RubberTrade.
---

# 🛡️ RubberTrade System Guardian Skill

Skill สำหรับตรวจสอบสุขภาพและความพร้อมของระบบ RubberTrade แบบอัตโนมัติ ทั้งช่วงเช้า (06:00 น.) และช่วงบ่าย (15:00 น.) พร้อมบันทึกรายงานลง Obsidian โดยอัตโนมัติ

## 📌 คำสั่งที่พร้อมใช้งาน (Commands Cheatsheet)

### 1. ตรวจสอบความพร้อมก่อนเปิดร้าน (Morning Audit - 06:00 น.)
ตรวจสอบ Live Branches 3 สาขา, Ping Response, Unit Tests 33 รายการ, ความสมบูรณ์ของ Git Workspace
```bash
npm run guardian:morning
```

### 2. สรุปงานประจำวันและปิดรอบ (Afternoon Audit - 15:00 น.)
สรุปยอดรับซื้อประจำวัน, บิล, สภาพแวดล้อมระบบ และความเสถียรของ Service
```bash
npm run guardian:afternoon
```

### 3. ตรวจสอบสุขภาพระบบสดทันที (Ad-hoc Health Check)
```bash
npm run guardian
```

## 📂 ปลายทางของรายงาน
รายงานจะถูกบันทึกอัตโนมัติลงใน:
`D:\PonD_Azelruz\AzelRuz\Antigravity\Rubbertrade.Co.LTD\Logs\YYYY-MM-DD.md`
