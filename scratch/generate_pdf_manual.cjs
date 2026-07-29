const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load images as Base64
const assetsDir = path.join(__dirname, '../src/assets/features');
const getBase64Image = (filename) => {
    try {
        const filePath = path.join(assetsDir, filename);
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath);
            return `data:image/png;base64,${fileData.toString('base64')}`;
        }
    } catch (e) {
        console.error(`Failed to read image ${filename}:`, e);
    }
    return '';
};

const imgBuy = getBase64Image('preview_buy.png');
const imgExpenses = getBase64Image('preview_expenses.png');
const imgPayment = getBase64Image('preview_payment.png');
const imgPromotions = getBase64Image('preview_promotions.png');
const imgSettings = getBase64Image('preview_settings.png');

const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>คู่มือการใช้งานระบบ RubberTrade Co., Ltd. (User Manual v1.4.0)</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Sarabun:wght@300;400;500;600;700&display=swap');

        @page {
            size: A4;
            margin: 12mm 15mm 15mm 15mm;
            @bottom-right {
                content: counter(page);
            }
        }

        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        body {
            font-family: 'Sarabun', 'Prompt', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #1f2937;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
        }

        h1, h2, h3, h4 {
            font-family: 'Prompt', sans-serif;
            color: #111827;
            margin-top: 0;
        }

        .cover-page {
            page-break-after: always;
            height: 98vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            text-align: center;
            padding: 60px 20px 40px 20px;
            background: linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%);
            color: white;
            border-radius: 20px;
        }

        .cover-logo {
            font-size: 42px;
            font-weight: 800;
            letter-spacing: -1px;
            background: rgba(255, 255, 255, 0.15);
            padding: 15px 40px;
            border-radius: 30px;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.3);
            margin-bottom: 20px;
        }

        .cover-title {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            line-height: 1.3;
        }

        .cover-subtitle {
            font-size: 18px;
            font-weight: 300;
            opacity: 0.9;
            max-width: 600px;
            margin: 0 auto 30px auto;
        }

        .cover-badge {
            display: inline-block;
            background: #f59e0b;
            color: #78350f;
            font-size: 14px;
            font-weight: 700;
            padding: 6px 20px;
            border-radius: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 40px;
        }

        .cover-meta {
            font-size: 13px;
            opacity: 0.85;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            padding-top: 20px;
            width: 100%;
        }

        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #059669;
            padding-bottom: 8px;
            margin-bottom: 20px;
        }

        .page-header h2 {
            font-size: 20px;
            font-weight: 700;
            color: #047857;
            margin: 0;
        }

        .page-header .badge {
            background: #ecfdf5;
            color: #047857;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 12px;
            border: 1px solid #a7f3d0;
        }

        .section-block {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }

        .step-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-left: 4px solid #059669;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 12px;
        }

        .step-title {
            font-weight: 700;
            font-size: 15px;
            color: #111827;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
        }

        .step-number {
            background: #059669;
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            font-size: 12px;
            margin-right: 10px;
            flex-shrink: 0;
        }

        .img-container {
            text-align: center;
            margin: 15px 0;
            page-break-inside: avoid;
        }

        .img-container img {
            max-width: 100%;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }

        .img-caption {
            font-size: 12px;
            color: #6b7280;
            margin-top: 6px;
            font-style: italic;
        }

        .callout-info {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-left: 4px solid #3b82f6;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 13px;
            color: #1e40af;
            margin: 15px 0;
        }

        .callout-warning {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 13px;
            color: #92400e;
            margin: 15px 0;
        }

        .callout-tip {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-left: 4px solid #10b981;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 13px;
            color: #065f46;
            margin: 15px 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 13px;
        }

        th, td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }

        th {
            background: #f3f4f6;
            font-weight: 700;
            color: #374151;
        }

        .page-break {
            page-break-before: always;
        }

        .toc-list {
            list-style: none;
            padding: 0;
        }

        .toc-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #e5e7eb;
            font-size: 14px;
        }

        .toc-name {
            font-weight: 500;
            color: #111827;
        }

        .toc-num {
            font-weight: 700;
            color: #059669;
        }
    </style>
</head>
<body>

    <!-- COVER PAGE -->
    <div class="cover-page">
        <div>
            <div class="cover-logo">🚜 RubberTrade</div>
            <div class="cover-title">คู่มือการใช้งานระบบบริหารจัดการลานรับซื้อยางพารา</div>
            <div class="cover-subtitle">คู่มือขั้นตอนการปฏิบัติงานสำหรับผู้ใช้งาน ตั้งแต่ระดับเริ่มต้น (Step 0) ถึงระดับผู้เชี่ยวชาญ</div>
            <div class="cover-badge">เวอร์ชันระบบ v1.4.0 (Production Release)</div>
        </div>

        <div style="width: 100%; max-width: 500px; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; backdrop-filter: blur(5px);">
            <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">คุณสมบัติเด่นของแพลตฟอร์ม:</div>
            <div style="font-size: 13px; text-align: left; opacity: 0.9; line-height: 1.8;">
                ✓ ระบบ Local-First รับซื้อได้รวดเร็ว ทำงานออฟไลน์ได้ 100%<br>
                ✓ ระบบหักหนี้เงินกู้และเงินล่วงหน้าเกษตรกรอัตโนมัติในใบเสร็จ<br>
                ✓ ระบบจัดการคิว 3 สถานี พร้อมหน้าจอเรียกคิวสด (Queue Monitor)<br>
                ✓ พิมพ์สลิปความร้อน Bluetooth ไร้สายผ่าน Web Browser<br>
                ✓ พยากรณ์อากาศและผลผลิตน้ำยางประจำวันด้วย AI (Yield Forecast)
            </div>
        </div>

        <div class="cover-meta">
            <strong>ผู้จัดทำ:</strong> ทีมพัฒนา RubberTrade Co., Ltd. & Antigravity AI Assistant<br>
            <strong>วันที่อัปเดตล่าสุด:</strong> กรกฎาคม 2026 | <strong>สิทธิ์ใช้งาน:</strong> ลานรับซื้อยางพาราและสาขาในเครือ
        </div>
    </div>

    <!-- TABLE OF CONTENTS -->
    <div class="page-header">
        <h2>📑 สารบัญคู่มือการใช้งาน</h2>
        <span class="badge">TABLE OF CONTENTS</span>
    </div>

    <ul class="toc-list">
        <li class="toc-item"><span class="toc-name">1. บทนำและแนวคิดระบบ Local-First Hybrid Cloud</span><span class="toc-num">หน้า 2</span></li>
        <li class="toc-item"><span class="toc-name">2. ขั้นตอนที่ 0: การเข้าสู่ระบบและการเลือกสาขา (Login & Store Selection)</span><span class="toc-num">หน้า 2</span></li>
        <li class="toc-item"><span class="toc-name">3. ขั้นตอนที่ 1: การตั้งค่าเริ่มต้นร้านค้าและราคายางประจำวัน (Initial Setup)</span><span class="toc-num">หน้า 3</span></li>
        <li class="toc-item"><span class="toc-name">4. ขั้นตอนที่ 2: การจัดการข้อมูลเกษตรกร พนักงาน และทีมงาน (Master Data)</span><span class="toc-num">หน้า 3</span></li>
        <li class="toc-item"><span class="toc-name">5. ขั้นตอนที่ 3: ระบบสัญญาเงินกู้และเงินล่วงหน้าเกษตรกร (Farmer Loans System)</span><span class="toc-num">หน้า 4</span></li>
        <li class="toc-item"><span class="toc-name">6. ขั้นตอนที่ 4: การรับซื้อน้ำยางสดและขี้ยางพารา (Buy Operations & Loan Deductions)</span><span class="toc-num">หน้า 5</span></li>
        <li class="toc-item"><span class="toc-name">7. ขั้นตอนที่ 5: ระบบคิวอัจฉริยะ 3 สถานีและจอแสดงคิวสด (3-Station Smart Queue)</span><span class="toc-num">หน้า 6</span></li>
        <li class="toc-item"><span class="toc-name">8. ขั้นตอนที่ 6: การพิมพ์ใบเสร็จความร้อนและ E-Slip (Thermal Bluetooth Printing)</span><span class="toc-num">หน้า 7</span></li>
        <li class="toc-item"><span class="toc-name">9. ขั้นตอนที่ 7: การส่งขายยางเข้าโรงงานและการคิดน้ำหนักสูญหาย (Sell Operations)</span><span class="toc-num">หน้า 8</span></li>
        <li class="toc-item"><span class="toc-name">10. ขั้นตอนที่ 8: การบันทึกค่าใช้จ่ายและบริหารภาษี (Expenses & Tax Management)</span><span class="toc-num">หน้า 9</span></li>
        <li class="toc-item"><span class="toc-name">11. ขั้นตอนที่ 9: รายงาน การวิเคราะห์ และพยากรณ์ผลผลิต AI (Reports & Yield Forecast)</span><span class="toc-num">หน้า 10</span></li>
        <li class="toc-item"><span class="toc-name">12. ขั้นตอนที่ 10: การต่ออายุสมาชิกและการสำรองข้อมูล (Subscriptions & Backup)</span><span class="toc-num">หน้า 11</span></li>
    </ul>

    <div class="callout-info">
        💡 <strong>คำแนะนำสำหรับการอ่านคู่มือ:</strong> สามารถใช้งานระบบ RubberTrade ได้ทั้งบนคอมพิวเตอร์พิวเตอร์ (PC/Mac), สมาร์ตโฟน (Android/iOS) และแท็บเล็ต โดยอินเทอร์เฟซจะปรับเปลี่ยนการแสดงผลให้เหมาะสมกับอุปกรณ์โดยอัตโนมัติ
    </div>

    <!-- SECTION 1 & 2 -->
    <div class="section-block">
        <div class="page-header">
            <h2>1. บทนำและแนวคิดระบบ & 2. ขั้นตอนที่ 0: การเข้าสู่ระบบ</h2>
            <span class="badge">STEP 0: GETTING STARTED</span>
        </div>

        <h3>1. บทนำและแนวคิดระบบ Local-First Hybrid Cloud</h3>
        <p>ระบบ <strong>RubberTrade</strong> ถูกพัฒนาขึ้นเพื่อแก้ปัญหาการทำงานหน้าลานรับซื้อยางพาราโดยเฉพาะ โดยผสมผสานจุดเด่นของเทคโนโลยี Local-First และ Cloud Database ดังนี้:</p>
        <ul>
            <li><strong>การบันทึกข้อมูลความเร็วสูง (< 10ms):</strong> ข้อมูลบิลและคิวจะถูกบันทึกลงในฐานข้อมูล Dexie (IndexedDB) บนเครื่องเบราว์เซอร์ทันทีที่กดบันทึก ทำให้ทำงานได้ลื่นไหล ไม่ต้องรอเน็ตเวิร์ก</li>
            <li><strong>การทำงานออฟไลน์สมบูรณ์แบบ (Offline Capability):</strong> แม้สัญญาณอินเทอร์เน็ตหน้าลานจะหลุด ระบบยังคงสามารถลงรายการรับซื้อ ชั่งน้ำหนัก วัด DRC และพิมพ์ใบเสร็จความร้อนได้ตามปกติ</li>
            <li><strong>การซิงค์ข้อมูลเบื้องหลังอัตโนมัติ (Background Auto-Sync):</strong> เมื่อสัญญาณอินเทอร์เน็ตกลับมา ข้อมูลจะซิงค์ขึ้นสู่ระบบคลาวด์ Cloudflare D1 โดยอัตโนมัติ</li>
        </ul>

        <h3>2. ขั้นตอนการเข้าสู่ระบบและการเลือกสาขา (Login & Store Switcher)</h3>
        
        <div class="step-card">
            <div class="step-title"><span class="step-number">1</span>เปิดเว็บแอปพลิเคชันและลงชื่อเข้าใช้</div>
            เปิดโปรแกรมบนเบราว์เซอร์ (แนะนำ Google Chrome / Safari) ➔ กรอก <strong>Email / Username</strong> และ <strong>Password</strong> ➔ กดปุ่ม <strong>"เข้าสู่ระบบ"</strong> (หรือกดล็อกอินผ่าน LINE LIFF)
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">2</span>การเลือกสาขา/ร้านค้า (สำหรับบัญชีที่มีหลายสาขา)</div>
            ที่แถบเมนูด้านบนขวา จะมีช่องป๊อปอัป <strong>"🏠 เลือกสาขา"</strong> ให้คลิกเลือกสาขาที่ต้องการดูหรือปฏิบัติงาน ระบบจะสลับคลังข้อมูลออฟไลน์และออนไลน์ไปยังสาขานั้นๆ โดยเด็ดขาด ไม่นำข้อมูลมารวมกัน
        </div>

        <div class="callout-tip">
            ✅ <strong>ข้อแนะนำสิทธิ์ผู้ใช้งาน:</strong> บัญชีผู้ใช้ถูกแบ่งเป็น 4 ระดับ คือ <code>Owner</code> (เจ้าของร้าน), <code>Admin</code> (ผู้ดูแล), <code>Staff</code> (พนักงานหน้าลาน) และ <code>Super Admin</code> (ผู้ดูแลระบบกลาง)
        </div>
    </div>

    <!-- SECTION 3 & 4 -->
    <div class="page-break"></div>
    <div class="section-block">
        <div class="page-header">
            <h2>3. ขั้นตอนที่ 1: ตั้งค่าร้านค้า & 4. ขั้นตอนที่ 2: จัดการข้อมูลพื้นฐาน</h2>
            <span class="badge">STEP 1 & 2: SETUP & MASTER DATA</span>
        </div>

        <h3>3. การตั้งค่าเริ่มต้นร้านค้าและราคายางประจำวัน</h3>

        <div class="step-card">
            <div class="step-title"><span class="step-number">1</span>ตั้งค่าข้อมูลร้านค้าและใบเสร็จ</div>
            ไปที่เมนู <strong>"ตั้งค่าร้าน" ➔ "ข้อมูลร้านค้า"</strong> ➔ ใส่ชื่อร้าน, ที่อยู่, เบอร์โทร, เลขผู้เสียภาษี ➔ ไปที่ย่อย <strong>"รูปแบบใบเสร็จ"</strong> กำหนดขนาดกระดาษ (58mm/80mm) และข้อความท้ายบิล
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">2</span>ประกาศราคากลางประจำวัน (Price Settings)</div>
            ไปที่เมนู <strong>"ตั้งค่าร้าน" ➔ "ราคากลางวันนี้"</strong> ➔ กรอกราคาน้ำยางสด (DRC 100%) และราคาขี้ยางประจำวัน ➔ หากต้องการประกาศราคาส่งตรงเข้า LINE เกษตรกร ให้กดปุ่ม <strong>"ประกาศราคาผ่าน LINE OA"</strong>
        </div>

        ${imgSettings ? `
        <div class="img-container">
            <img src="${imgSettings}" alt="หน้าตั้งค่าระบบ RubberTrade">
            <div class="img-caption">รูปที่ 1: ภาพรวมหน้าตั้งค่าระบบและการจัดการข้อมูลร้านค้า (Settings Module)</div>
        </div>
        ` : ''}

        <h3>4. การจัดการข้อมูลเกษตรกร พนักงาน และทีมงาน</h3>

        <div class="step-card">
            <div class="step-title"><span class="step-number">1</span>การเพิ่มข้อมูลเกษตรกรและอัตราโบนัส</div>
            ไปที่ <strong>"ตั้งค่าร้าน" ➔ "เกษตรกรและลูกจ้าง"</strong> ➔ กด <strong>"+ เพิ่มเกษตรกรใหม่"</strong> ➔ ระบุชื่อ, เบอร์โทร, ประเภทสมาชิก (เช่น VIP รับโบนัสบวกเพิ่มบาท/กก. อัตโนมัติ) และเลขบัญชีธนาคาร ➔ กดบันทึก
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">2</span>การจัดการพนักงานและสิทธิ์ผู้ใช้งาน</div>
            บันทึกรายชื่อคนขับรถขนส่งในย่อย <strong>"พนักงานประจำ"</strong> และจัดการสิทธิ์ผู้ใช้งานในย่อย <strong>"จัดการทีม"</strong>
        </div>
    </div>

    <!-- SECTION 5 -->
    <div class="page-break"></div>
    <div class="section-block">
        <div class="page-header">
            <h2>5. ขั้นตอนที่ 3: ระบบสัญญาเงินกู้และเงินล่วงหน้าเกษตรกร</h2>
            <span class="badge">STEP 3: FARMER LOANS SYSTEM</span>
        </div>

        <p>ระบบช่วยจัดการการปล่อยเงินกู้/เงินล่วงหน้าให้แก่เกษตรกร และนำไปหักชำระจากยอดเงินรับซื้อน้ำยางโดยอัตโนมัติ ช่วยป้องกันการลืมหักหนี้และคำนวณยอดหนี้คงเหลือให้อย่างแม่นยำ</p>

        <div class="step-card">
            <div class="step-title"><span class="step-number">1</span>เปิดหน้าบริหารจัดการเงินกู้</div>
            ไปที่เมนูหลัก <strong>"ระบบเงินกู้ & หนี้สิน"</strong> (URL: <code>/loans</code>)
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">2</span>ทำสัญญาเงินกู้ใหม่ (Create Contract)</div>
            กดปุ่ม <strong>"+ ทำสัญญาเงินกู้ใหม่"</strong> ➔ เลือกชื่อเกษตรกรผู้กู้ ➔ กรอกยอดเงินกู้ (Principal Amount) เช่น <code>50,000</code> บาท
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">3</span>เลือกเงื่อนไขรูปแบบการหักชำระหนี้ (Deduction Method)</div>
            เลือกรูปแบบการหักเงินในใบเสร็จรับซื้อ:
            <ul>
                <li><strong>Full (หักเต็มจำนวน):</strong> หักเงินค่าขายยางทั้งหมดในบิลเข้าชำระหนี้ จนกว่ายอดหนี้จะหมด</li>
                <li><strong>Percentage (หักตามเปอร์เซ็นต์):</strong> หัก % จากยอดเงินรับซื้อในบิล เช่น หัก 20% ของยอดขายทุกครั้ง</li>
                <li><strong>Fixed (หักจำนวนเงินคงที่):</strong> หักจำนวนเงินคงที่ต่อบิล เช่น หักบิลละ 1,000 บาท</li>
            </ul>
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">4</span>อนุมัติสัญญาเงินกู้</div>
            ตรวจสอบรายละเอียด ➔ กดปุ่ม <strong>"อนุมัติสัญญาและปล่อยเงินกู้"</strong> ระบบจะบันทึกยอดหนี้คงค้างและเปิดสัญญาพร้อมหักชำระทันที
        </div>

        <div class="callout-warning">
            ⚠️ <strong>การหักชำระอัตโนมัติ:</strong> เมื่อเกษตรกรที่มีสัญญาเงินกู้มาทำรายการขายยางในหน้า <strong>BuyForm</strong> ระบบจะดึงยอดหนี้และเงื่อนไขมาคำนวณยอดหักชำระ <code>Loan Deduction</code> ให้อัตโนมัติ โดยที่พนักงานไม่ต้องคำนวณด้วยมือ!
        </div>
    </div>

    <!-- SECTION 6 -->
    <div class="page-break"></div>
    <div class="section-block">
        <div class="page-header">
            <h2>6. ขั้นตอนที่ 4: การรับซื้อน้ำยางสดและขี้ยางพารา</h2>
            <span class="badge">STEP 4: BUY OPERATIONS & LOAN DEDUCTIONS</span>
        </div>

        <p>โมดูลรับซื้อน้ำยางพารา (Buy Module) เป็นหัวใจสำคัญของลาน รองรับทั้งน้ำยางสด ขี้ยางพารา พร้อมระบบคำนวณราคา โบนัส และหักหนี้เงินกู้อัตโนมัติ</p>

        ${imgBuy ? `
        <div class="img-container">
            <img src="${imgBuy}" alt="หน้าบันทึกรับซื้อน้ำยาง RubberTrade">
            <div class="img-caption">รูปที่ 2: หน้าจอการทำรายการรับซื้อน้ำยางพารา (Buy Operations Module)</div>
        </div>
        ` : ''}

        <div class="step-card">
            <div class="step-title"><span class="step-number">1</span>เลือกเกษตรกรผู้ขาย</div>
            ไปที่เมนู <strong>"รับซื้อน้ำยาง"</strong> (<code>/buy</code>) ➔ ค้นหาและเลือกชื่อเกษตรกร
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">2</span>ลงรายการตามประเภทสินค้า</div>
            <ul>
                <li>💧 <strong>น้ำยางสด:</strong> กรอกน้ำหนักชั่งรวม (Gross) ➔ น้ำหนักถังเปล่า (Tare) ➔ ระบบคำนวณน้ำหนักสุทธิ ➔ กรอกเปอร์เซ็นต์ DRC % ➔ ระบบคิดราคาสุทธิ + โบนัสสมาชิกให้อัตโนมัติ</li>
                <li>🪨 <strong>ขี้ยางพารา (Cup Lump):</strong> กรอกน้ำหนักขี้ยางสุทธิ ➔ ระบบซ่อนสูตร DRC และคำนวณราคาตามราคากลางขี้ยางประจำวัน</li>
            </ul>
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">3</span>การหักชำระหนี้กู้ยืมและบันทึกบิล</div>
            หากเกษตรกรมีหนี้กู้ยืม ยอดหักชำระหนี้จะปรากฏในช่อง <strong>Loan Deduction</strong> ➔ ยอดเงินจ่ายสุทธิ (Net Pay) จะถูกลบให้อัตโนมัติ ➔ กดปุ่ม <strong>"บันทึกบิลรับซื้อ"</strong>
        </div>

        <div class="callout-tip">
            ⚡ <strong>Optimistic Saving:</strong> เมื่อกดบันทึก ข้อมูลบิลจะลงตารางทันทีใน 0.01 วินาที โดยไม่หายไปจากหน้าจอ แม้เน็ตเวิร์กจะดีเลย์ก็ตาม!
        </div>
    </div>

    <!-- SECTION 7 -->
    <div class="page-break"></div>
    <div class="section-block">
        <div class="page-header">
            <h2>7. ขั้นตอนที่ 5: ระบบคิวอัจฉริยะ 3 สถานีและจอแสดงคิวสด</h2>
            <span class="badge">STEP 5: 3-STATION SMART QUEUE</span>
        </div>

        <p>สำหรับลานซื้อขนาดใหญ่ที่มีการแยกพนักงานปฏิบัติงานตามจุดต่างๆ เพื่อความรวดเร็วและเป็นระเบียบ:</p>

        <table>
            <thead>
                <tr>
                    <th>สถานีปฏิบัติงาน</th>
                    <th>หน้าที่และขั้นตอนการทำงาน</th>
                    <th>ไฟล์โมดูลระบบ</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>จุดที่ 0: ออกคิว</strong></td>
                    <td>ออกหมายเลขคิว (เช่น A001) ให้เกษตรกรที่นำยางมาส่ง</td>
                    <td><code>Queue.jsx</code></td>
                </tr>
                <tr>
                    <td><strong>Station 1: จุดชั่งน้ำหนัก</strong></td>
                    <td>เลือกคิว ➔ ชั่งน้ำหนักรวม (Gross) และถังเปล่า (Tare) ➔ กดส่งต่อ Station 2</td>
                    <td><code>QueueStation1.jsx</code></td>
                </tr>
                <tr>
                    <td><strong>Station 2: จุดวัด DRC</strong></td>
                    <td>เลือกคิว ➔ ป้อนผลตรวจ % DRC ➔ ระบบคำนวณเงิน ➔ กดเสร็จสิ้นคิว</td>
                    <td><code>QueueStation2.jsx</code></td>
                </tr>
                <tr>
                    <td><strong>จุดคิดเงิน & ออกบิล</strong></td>
                    <td>ดึงข้อมูลคิวที่เสร็จสมบูรณ์เข้าสู่ใบรับซื้อ ➔ พิมพ์สลิปและจ่ายเงิน</td>
                    <td><code>ServiceQueueStation.jsx</code></td>
                </tr>
                <tr>
                    <td><strong>Queue Live Monitor</strong></td>
                    <td>หน้าจอแสดงสถานะคิวสดและเรียกคิวสำหรับติดตั้งหน้าลาน</td>
                    <td><code>QueueMonitor.jsx</code></td>
                </tr>
            </tbody>
        </table>

        <div class="callout-info">
            📺 <strong>การใช้งาน Queue Monitor:</strong> เปิดหน้า <code>/queue/monitor</code> บนทีวีมอนิเตอร์ หรือแท็บเล็ตหน้าลาน หน้าจอจะอัปเดตเรียกหมายเลขคิวและแสดงสถานะสดแบบ Real-time โดยอัตโนมัติ
        </div>
    </div>

    <!-- SECTION 8 -->
    <div class="page-break"></div>
    <div class="section-block">
        <div class="page-header">
            <h2>8. ขั้นตอนที่ 6: การพิมพ์ใบเสร็จความร้อนและ E-Slip</h2>
            <span class="badge">STEP 6: THERMAL PRINTING & E-SLIP</span>
        </div>

        <p>รองรับการพิมพ์ใบเสร็จสลิปความร้อนทั้งแบบต่อตรงไร้สาย (Web Bluetooth) และแอป RawBT บน Android</p>

        <div class="step-card">
            <div class="step-title"><span class="step-number">1</span>การต่อเครื่องพิมพ์ Web Bluetooth Direct Print (ไม่ต้องผ่านแอป)</div>
            ไปที่ <strong>"ตั้งค่าร้าน" ➔ "รูปแบบใบเสร็จ"</strong> ➔ เลือกโหมด <strong>"Web Bluetooth Direct Print"</strong> ➔ กด <strong>"ค้นหาเครื่องพิมพ์ Bluetooth"</strong> ➔ เลือกเครื่องพิมพ์ความร้อน (เช่น POS-58 / InnerPrinter) ➔ เชื่อมต่อสำเร็จ
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">2</span>การพิมพ์สลิปและส่ง E-Slip ผ่าน LINE</div>
            เมื่อกดบันทึกบิลรับซื้อ เครื่องพิมพ์จะพิมพ์สลิปภาษาไทยออกมาโดยอัตโนมัติ หรือกดปุ่ม <strong>"แชร์ E-Slip"</strong> เพื่อส่งรูปภาพใบเสร็จเข้า LINE เกษตรกร
        </div>

        ${imgPayment ? `
        <div class="img-container">
            <img src="${imgPayment}" alt="รูปแบบใบเสร็จและการชำระเงิน RubberTrade">
            <div class="img-caption">รูปที่ 3: รูปแบบสลิปใบเสร็จการรับซื้อน้ำยางพารา (Thermal Paper Slip & E-Slip)</div>
        </div>
        ` : ''}
    </div>

    <!-- SECTION 9 & 10 -->
    <div class="page-break"></div>
    <div class="section-block">
        <div class="page-header">
            <h2>9. ขั้นตอนที่ 7: ส่งขายโรงงาน & 10. ขั้นตอนที่ 8: บันทึกค่าใช้จ่าย & ภาษี</h2>
            <span class="badge">STEP 7 & 8: SELL, EXPENSES & TAX</span>
        </div>

        <h3>9. การส่งขายน้ำยางเข้าโรงงานและการคิดน้ำหนักสูญหาย (Sell Module)</h3>
        
        <div class="step-card">
            <div class="step-title"><span class="step-number">1</span>บันทึกการส่งขายโรงงาน</div>
            ไปที่เมนู <strong>"ส่งขายโรงงาน"</strong> (<code>/sell</code>) ➔ เลือกโรงงานปลายทาง และทะเบียนรถขนส่ง ➔ กรอกน้ำหนักและ DRC % ต้นทาง (ออกจากลาน)
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">2</span>บันทึกผลชั่งโรงงานปลายทางและคิด % สูญหาย</div>
            เมื่อได้ใบชั่งจากโรงงาน ให้กรอกน้ำหนักและ DRC % ปลายทาง ➔ ระบบจะคำนวณ <strong>% น้ำหนักสูญหาย (Shrinkage/Loss)</strong> และสรุปกำไร/ขาดทุนสุทธิให้อัตโนมัติ
        </div>

        <h3>10. การบันทึกค่าใช้จ่ายและบริหารภาษี (Expenses & Tax Management)</h3>

        ${imgExpenses ? `
        <div class="img-container">
            <img src="${imgExpenses}" alt="หน้าจัดการค่าใช้จ่าย RubberTrade">
            <div class="img-caption">รูปที่ 4: หน้าการบันทึกค่าใช้จ่ายร้านและการจัดการภาษี (Expenses & Tax Module)</div>
        </div>
        ` : ''}

        <div class="step-card">
            <div class="step-title"><span class="step-number">1</span>การบันทึกค่าใช้จ่ายร้าน</div>
            ไปที่เมนู <strong>"ค่าใช้จ่าย"</strong> (<code>/expenses</code>) ➔ กด <strong>"+ บันทึกค่าใช้จ่ายใหม่"</strong> ➔ เลือกหมวดหมู่ (ค่าน้ำมัน, สารเคมี, ค่าแรง) ➔ ระบุภาษี VAT 7% หรือภาษีหัก ณ ที่จ่าย (WHT 1%/3%) ➔ บันทึก
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">2</span>การออกรายงานสรุปภาษีประจำเดือน</div>
            ไปที่เมนู <strong>"รายงาน" ➔ "ระบบบัญชี & ภาษีสรรพากร"</strong> (<code>/tax-report</code>) สรุปยอดภาษีซื้อ ภาษีขาย และภาษีหัก ณ ที่จ่าย ส่งสำนักงานบัญชี
        </div>
    </div>

    <!-- SECTION 11 & 12 -->
    <div class="page-break"></div>
    <div class="section-block">
        <div class="page-header">
            <h2>11. ขั้นตอนที่ 9: รายงาน & AI Forecast & 12. ขั้นตอนที่ 10: สมาชิก & สำรองข้อมูล</h2>
            <span class="badge">STEP 9 & 10: REPORTS, FORECAST & BACKUP</span>
        </div>

        <h3>11. รายงาน การวิเคราะห์ และพยากรณ์ผลผลิต AI (Yield AI Forecast)</h3>
        <p>ระบบ AI พยากรณ์อากาศดึงข้อมูลสภาพอากาศช่วงเวลา 00:00 - 08:00 น. (ช่วงเวลากรีดยาง) เพื่อคำนวณ <strong>% Yield Forecast (แนวโน้มผลผลิตยางประจำวัน)</strong> ช่วยให้ลานบริหารจัดการเงินสดสำรองรับซื้อได้อย่างแม่นยำ</p>
        <p>นอกจากนี้ สามารถตรวจสอบรายงานสรุปปิดยอดประจำวัน (Daily Summary), รายงานปรับปรุงสต็อก (Stock Adjustments) และรายงานยอดขายประจำเดือนได้ในเมนู <strong>"รายงาน"</strong></p>

        ${imgPromotions ? `
        <div class="img-container">
            <img src="${imgPromotions}" alt="หน้าโปรโมชั่นและรายงานการวิเคราะห์">
            <div class="img-caption">รูปที่ 5: หน้าการตั้งค่าโปรโมชั่นและสถิติการวิเคราะห์ (Analytics & Promotions)</div>
        </div>
        ` : ''}

        <h3>12. การต่ออายุสมาชิกและการสำรองข้อมูล (Subscriptions & Backup)</h3>
        
        <div class="step-card">
            <div class="step-title"><span class="step-number">1</span>การตรวจสอบและต่ออายุสมาชิก</div>
            ไปที่ <strong>"ตั้งค่าร้าน" ➔ "สถานะและการสมัครสมาชิก"</strong> (<code>/subscription</code>) ➔ สแกน QR Code ชำระเงินและแนบสลิปเพื่อต่ออายุแพ็กเกจ
        </div>

        <div class="step-card">
            <div class="step-title"><span class="step-number">2</span>การซิงค์ออฟไลน์และการสำรองข้อมูล (Offline Backup)</div>
            ดูรายการรอซิงค์ใน <strong>"ตั้งค่าร้าน" ➔ "คิวซิงค์ออฟไลน์"</strong> และดาวน์โหลดไฟล์สำรองข้อมูลใน <strong>"ตั้งค่าร้าน" ➔ "จัดการข้อมูล (Import/Export)"</strong>
        </div>

        <div class="callout-tip" style="text-align: center; margin-top: 30px;">
            🎉 <strong>เสร็จสิ้นคู่มือการใช้งานระบบ RubberTrade Co., Ltd. v1.4.0</strong><br>
            หากมีข้อสงสัยเพิ่มเติม สามารถติดต่อทีมงานผู้ดูแลระบบได้ตลอด 24 ชั่วโมง
        </div>
    </div>

</body>
</html>`;

const htmlPath = path.join(__dirname, 'manual.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Generated manual.html');

// Output PDF paths
const rootPdfPath = path.join(__dirname, '../User_Manual_RubberTrade.pdf');
const obsidianPdfPath = 'D:\\PonD_Azelruz\\AzelRuz\\Antigravity\\Rubbertrade.Co.LTD\\User_Manual_RubberTrade.pdf';

const edgePath = 'C:\\Program Files (x86)\\Microsoft+Edge\\Application\\msedge.exe'.replace('Microsoft+Edge', 'Microsoft\\Edge');

console.log('Converting HTML to PDF via Edge Headless...');
try {
    const cmd = `"${edgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${rootPdfPath}" "${htmlPath}"`;
    execSync(cmd);
    console.log(`PDF created successfully at: ${rootPdfPath}`);

    // Copy to Obsidian Vault
    if (fs.existsSync(rootPdfPath)) {
        fs.copyFileSync(rootPdfPath, obsidianPdfPath);
        console.log(`Copied PDF to Obsidian Vault at: ${obsidianPdfPath}`);
    }
} catch (err) {
    console.error('Error generating PDF with Edge:', err);
}
