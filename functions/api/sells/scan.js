import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

function parseDateString(str) {
    if (!str) return null;
    str = String(str).trim();

    // Standard YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        let year = parseInt(str.substring(0, 4), 10);
        if (year > 2500) year -= 543;
        return `${year}-${str.substring(5)}`;
    }

    // DD-MMM-YY or DD-MMM-YYYY e.g. 20-Aug-26 or 20-Aug-2026
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const matchMmm = str.match(/^(\d{1,2})[-/\s]([a-zA-Z]{3})[-/\s](\d{2,4})$/);
    if (matchMmm) {
        const day = matchMmm[1].padStart(2, '0');
        const mStr = matchMmm[2].toLowerCase();
        const month = months[mStr] || '01';
        let yr = parseInt(matchMmm[3], 10);
        if (yr < 100) yr += 2000;
        if (yr > 2500) yr -= 543;
        return `${yr}-${month}-${day}`;
    }

    // DD/MM/YYYY or DD/MM/YY
    const matchSlash = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (matchSlash) {
        const day = matchSlash[1].padStart(2, '0');
        const month = matchSlash[2].padStart(2, '0');
        let yr = parseInt(matchSlash[3], 10);
        if (yr < 100) yr += 2000;
        if (yr > 2500) yr -= 543;
        return `${yr}-${month}-${day}`;
    }

    return str;
}

async function handleScan(context) {
    try {
        const formData = await context.request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return errorResponse("กรุณาแนบไฟล์รูปภาพใบเสร็จ/ใบชั่งน้ำหนักโรงงาน", 400);
        }

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const mimeType = file.type || 'image/jpeg';

        // Convert Uint8Array to Base64 for Gemini API
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Image = btoa(binary);

        // Retrieve Gemini API Key from Env (GEMINI_API_KEY & GOOGLE_AI_KEY) or Request Header
        const rawApiKey = context.env.GEMINI_API_KEY || context.env.GOOGLE_AI_KEY || context.request.headers.get('X-Gemini-API-Key');
        const apiKey = String(rawApiKey || '').trim();

        let rawOutput = '';
        let modelUsed = '';
        let debugError = '';

        if (apiKey) {
            const geminiPayload = {
                contents: [
                    {
                        parts: [
                            {
                                text: `คุณคือ AI ผู้ช่วยอ่านใบชั่งน้ำหนัก สลิป และใบสรุปยอดรับซื้อน้ำยางพาราภาษาไทยสำหรับโรงงานและลานยาง
กรุณาอ่านรูปภาพเอกสารใบชั่ง/ใบเสร็จนี้อย่างละเอียด แล้วสกัดข้อมูลเป็น JSON ภาษาไทยตามโครงสร้างนี้เท่านั้น:
{
  "date": "วันที่ส่งน้ำยาง เช่น YYYY-MM-DD (เช่น 2026-08-20)",
  "buyerName": "ชื่อบริษัท หรือ โรงงานรับซื้อ หรือ ปลายทาง (เช่น TOP GLOVE TECHNOLOGY (THAILAND) CO.,LTD.)",
  "licensePlate": "ทะเบียนรถขนส่ง หรือ VEHICLE NO. (เช่น 825952, 818338, 830448, 80-1234) **ข้อสำคัญ: TICKET NO. หรือเลขตั๋วชั่งเช่น W16A-060239 ไม่ใช่ทะเบียนรถ ห้ามนำ TICKET NO. มาใส่ใน licensePlate เด็ดขาด**",
  "grossWeight": น้ำหนักรวมชั่งเข้า (กก.) เป็นตัวเลข หรือ null,
  "tareWeight": น้ำหนักรถเปล่า/หัก (กก.) เป็นตัวเลข หรือ null,
  "netWeight": น้ำหนักยางสดสุทธิรวม (NET WEIGHT กก.) เป็นตัวเลขเท่านั้น (เช่น 23040.0 หรือ 8300.0),
  "drc": เปอร์เซ็นต์ยางแห้ง DRC (%) เป็นตัวเลขเท่านั้น (เช่น 33.63),
  "dryWeight": น้ำหนักยางแห้งสุทธิจากเอกสาร (DRY WEIGHT กก.) เป็นตัวเลขตรงจากรูปเท่านั้น (เช่น 7340.0 หรือ 2791.0),
  "pricePerKg": ราคาขายต่อกิโลกรัม (BASE PRICE/NET PRICE บาท) เป็นตัวเลขเท่านั้น (เช่น 74.20),
  "total": ยอดเงินรวมสุทธิจากเอกสาร (NET AMOUNT / AMOUNT BEFORE W/H TAX บาท) เป็นตัวเลขตรงจากรูปเท่านั้น (เช่น 544628.00 หรือ 207092.20),
  "ticketNo": "เลขที่ใบชั่ง/เลขที่ตั๋ว/TICKET NO. (เช่น W16A-060239)",
  "rubberType": "ประเภทยาง: 'latex' (น้ำยางสด) หรือ 'cup_lump' (ขี้ยาง)",
  "items": [
    {
      "date": "YYYY-MM-DD",
      "ticketNo": "เลขที่ตั๋ว TICKET NO. (เช่น W16A-060239)",
      "licensePlate": "ทะเบียนรถ VEHICLE NO. (เช่น 825952)",
      "netWeight": น้ำหนักสด (NET WEIGHT กก. เช่น 8300.0),
      "drc": DRC (% เช่น 33.63),
      "dryWeight": น้ำหนักยางแห้งสุทธิจากเอกสาร (DRY WEIGHT กก. เช่น 2791.0),
      "pricePerKg": ราคาต่อ กก. (NET PRICE บาท เช่น 74.20),
      "total": ยอดเงินรวมสุทธิจากเอกสาร (NET AMOUNT บาท เช่น 207092.20)
    }
  ]
}`
                            },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Image
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    response_mime_type: "application/json",
                    temperature: 0.1,
                    maxOutputTokens: 1500
                }
            };

            // Valid Google Gemini API Model Endpoint IDs
            const candidateModels = [
                { id: 'gemini-3.1-flash', apiVersion: 'v1beta', label: 'Google Gemini 3.1 Flash' },
                { id: 'gemini-3.1-flash-lite', apiVersion: 'v1beta', label: 'Google Gemini 3.1 Flash Lite' },
                { id: 'gemini-2.0-flash', apiVersion: 'v1beta', label: 'Google Gemini 2.0 Flash' },
                { id: 'gemini-1.5-flash', apiVersion: 'v1beta', label: 'Google Gemini 1.5 Flash' },
                { id: 'gemini-1.5-flash', apiVersion: 'v1', label: 'Google Gemini 1.5 Flash (v1)' },
                { id: 'gemini-1.5-pro', apiVersion: 'v1beta', label: 'Google Gemini 1.5 Pro' }
            ];

            let geminiSuccess = false;

            for (const m of candidateModels) {
                try {
                    const geminiUrl = `https://generativelanguage.googleapis.com/${m.apiVersion || 'v1beta'}/models/${m.id}:generateContent?key=${apiKey}`;
                    const geminiRes = await fetch(geminiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(geminiPayload)
                    });

                    if (geminiRes.ok) {
                        const geminiJson = await geminiRes.json();
                        const parts = geminiJson?.candidates?.[0]?.content?.parts || [];
                        const fullText = parts.map(p => p.text || '').join('\n').trim();

                        if (fullText) {
                            rawOutput = fullText;
                            modelUsed = m.label;
                            geminiSuccess = true;
                            break;
                        }
                    } else {
                        const errText = await geminiRes.text();
                        console.warn(`[Gemini Model ${m.id} failed]`, errText);
                        try {
                            const errObj = JSON.parse(errText);
                            debugError = errObj?.error?.message || errText;
                        } catch (e) {
                            debugError = errText;
                        }
                    }
                } catch (err) {
                    console.warn(`[Gemini Model ${m.id} exception]`, err?.message);
                    debugError = err?.message;
                }
            }

            if (!geminiSuccess && context.env.AI) {
                console.warn("All Gemini models failed, falling back to Workers AI. Error details:", debugError);
                modelUsed = `Cloudflare Workers AI (สำรอง - Gemini แจ้ง: ${debugError.substring(0, 80)})`;
                const imageArray = Array.from(uint8Array);
                const promptText = `Analyze this rubber factory receipt image and return JSON: {"date":"YYYY-MM-DD","buyerName":"Factory Name","licensePlate":"Vehicle No","netWeight":8300,"drc":33.63,"dryWeight":2791.0,"pricePerKg":74.2,"total":207092.2,"ticketNo":"W16A-060239","rubberType":"latex"}`;

                const aiResult = await context.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                    image: imageArray,
                    prompt: promptText,
                    max_tokens: 500
                });

                rawOutput = typeof aiResult === 'string' ? aiResult : (aiResult?.response || aiResult?.description || JSON.stringify(aiResult || {}));
            }
        } else if (context.env.AI) {
            modelUsed = 'Cloudflare Workers AI (ยังพบว่าไม่มี GEMINI_API_KEY)';
            const imageArray = Array.from(uint8Array);
            const promptText = `Analyze this rubber factory receipt image and return JSON: {"date":"YYYY-MM-DD","buyerName":"Factory Name","licensePlate":"Vehicle No","netWeight":8300,"drc":33.63,"dryWeight":2791.0,"pricePerKg":74.2,"total":207092.2,"ticketNo":"W16A-060239","rubberType":"latex"}`;

            const aiResult = await context.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                image: imageArray,
                prompt: promptText,
                max_tokens: 500
            });

            rawOutput = typeof aiResult === 'string' ? aiResult : (aiResult?.response || aiResult?.description || JSON.stringify(aiResult || {}));
        } else {
            return errorResponse("กรุณาตั้งค่า GEMINI_API_KEY ใน Cloudflare Pages Environment Secret", 500);
        }

        console.log("[AI Sell Vision Raw Response]", rawOutput);

        let date = null;
        let buyerName = '';
        let licensePlate = '';
        let grossWeight = null;
        let tareWeight = null;
        let netWeight = 0;
        let drc = 0;
        let dryWeight = 0;
        let pricePerKg = 0;
        let total = 0;
        let ticketNo = '';
        let rubberType = 'latex';
        let items = [];

        // Clean & Parse JSON
        const cleanContent = String(rawOutput || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleanContent.indexOf('{');
        const lastBrace = cleanContent.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const jsonSubStr = cleanContent.substring(firstBrace, lastBrace + 1);
            try {
                const parsed = JSON.parse(jsonSubStr);
                
                date = parseDateString(parsed.date);
                buyerName = String(parsed.buyerName || parsed.factoryName || parsed.buyer || '').trim();
                licensePlate = String(parsed.licensePlate || parsed.truckPlate || parsed.plate || '').trim();
                ticketNo = String(parsed.ticketNo || parsed.ticket_no || parsed.slipNo || '').trim();

                // Clean license plate if AI incorrectly assigned ticketNo to licensePlate
                if (licensePlate && (licensePlate.toLowerCase() === ticketNo.toLowerCase() || /^W\d+[A-Z]?-\d+/i.test(licensePlate))) {
                    licensePlate = '';
                }

                if (parsed.grossWeight) grossWeight = parseFloat(String(parsed.grossWeight).replace(/,/g, '')) || null;
                if (parsed.tareWeight) tareWeight = parseFloat(String(parsed.tareWeight).replace(/,/g, '')) || null;

                const rawNet = parsed.netWeight ?? parsed.weight ?? parsed.net_weight;
                if (rawNet) netWeight = parseFloat(String(rawNet).replace(/,/g, '')) || 0;

                const rawDrc = parsed.drc ?? parsed.drcPercent ?? parsed.drc_percent;
                if (rawDrc) drc = parseFloat(String(rawDrc).replace(/,/g, '')) || 0;

                const rawDry = parsed.dryWeight ?? parsed.dry_rubber ?? parsed.dry_weight;
                if (rawDry) dryWeight = parseFloat(String(rawDry).replace(/,/g, '')) || 0;

                const rawPrice = parsed.pricePerKg ?? parsed.price ?? parsed.unit_price ?? parsed.base_price ?? parsed.net_price;
                if (rawPrice) pricePerKg = parseFloat(String(rawPrice).replace(/,/g, '')) || 0;

                const rawTotal = parsed.total ?? parsed.totalAmount ?? parsed.grand_total ?? parsed.net_amount;
                if (rawTotal) total = parseFloat(String(rawTotal).replace(/,/g, '')) || 0;

                if (parsed.rubberType && ['latex', 'cup_lump'].includes(parsed.rubberType)) {
                    rubberType = parsed.rubberType;
                }

                // Process sub-items if present
                if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                    items = parsed.items.map(it => {
                        let itemPlate = String(it.licensePlate || it.vehicleNo || it.truckPlate || '').trim();
                        let itemTicket = String(it.ticketNo || it.ticket_no || '').trim();
                        if (itemPlate && (itemPlate.toLowerCase() === itemTicket.toLowerCase() || /^W\d+[A-Z]?-\d+/i.test(itemPlate))) {
                            itemPlate = '';
                        }
                        return {
                            date: parseDateString(it.date) || date,
                            ticketNo: itemTicket,
                            licensePlate: itemPlate,
                            netWeight: parseFloat(String(it.netWeight || it.weight || 0).replace(/,/g, '')) || 0,
                            drc: parseFloat(String(it.drc || 0).replace(/,/g, '')) || 0,
                            dryWeight: parseFloat(String(it.dryWeight || 0).replace(/,/g, '')) || 0,
                            pricePerKg: parseFloat(String(it.pricePerKg || it.price || 0).replace(/,/g, '')) || 0,
                            total: parseFloat(String(it.total || it.amount || 0).replace(/,/g, '')) || 0
                        };
                    });

                    if (netWeight === 0 && items.length > 0) {
                        netWeight = items.reduce((sum, item) => sum + item.netWeight, 0);
                    }
                    if (dryWeight === 0 && items.length > 0) {
                        dryWeight = items.reduce((sum, item) => sum + item.dryWeight, 0);
                    }
                    if (total === 0 && items.length > 0) {
                        total = items.reduce((sum, item) => sum + item.total, 0);
                    }
                    if (pricePerKg === 0 && items[0]?.pricePerKg > 0) {
                        pricePerKg = items[0].pricePerKg;
                    }
                    if (!licensePlate && items[0]?.licensePlate) {
                        licensePlate = items[0].licensePlate;
                    }
                    if (!ticketNo && items[0]?.ticketNo) {
                        ticketNo = items[0].ticketNo;
                    }
                }
            } catch (e) {
                console.warn("[JSON Parse Failed]", e);
            }
        }

        // Calculation fallbacks ONLY if missing
        if (netWeight > 0 && drc > 0 && dryWeight === 0) {
            dryWeight = Math.round((netWeight * drc / 100) * 100) / 100;
        }
        if (dryWeight > 0 && pricePerKg > 0 && total === 0) {
            total = Math.round((dryWeight * pricePerKg) * 100) / 100;
        }

        return jsonResponse({
            status: 'success',
            model: modelUsed,
            debugError: debugError ? debugError.substring(0, 200) : undefined,
            data: {
                date,
                buyerName,
                licensePlate,
                grossWeight,
                tareWeight,
                netWeight,
                drc,
                dryWeight,
                pricePerKg,
                total,
                ticketNo,
                rubberType,
                items
            }
        });

    } catch (e) {
        console.error("[AI Sell Scan Error]", e);
        return errorResponse("เกิดข้อผิดพลาดในการสแกนใบเสร็จด้วย AI: " + e.message);
    }
}

export const onRequestPost = withAuth(handleScan);
