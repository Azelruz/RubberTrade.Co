import { jsonResponse, errorResponse, withAuth } from '../_utils.js';

async function handleScan(context) {
    try {
        const formData = await context.request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return errorResponse("กรุณาแนบไฟล์รูปภาพใบเสร็จ/สลิปค่าใช้จ่าย", 400);
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

        // Retrieve Gemini API Key from Env (both GEMINI_API_KEY & GOOGLE_AI_KEY) or Request Header
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
                                text: `คุณคือ AI ผู้ช่วยอ่านใบเสร็จและสลิปการโอนเงินภาษาไทยสำหรับระบบบัญชีลานยางพารา
กรุณาอ่านรูปภาพใบเสร็จนี้แล้วสกัดข้อมูลเป็น JSON ภาษาไทยตามโครงสร้างนี้เท่านั้น:
{
  "category": "เลือกจาก ['ค่าน้ำมัน', 'ค่าซ่อมบำรุง', 'ค่าอุปกรณ์', 'ค่าสาธารณูปโภค', 'ค่าขนส่ง', 'ค่าอาหาร', 'ค่าแอมโมเนีย', 'ยาขาว', 'ค่าเช่าบ้าน', 'อื่นๆ']",
  "amount": ยอดเงินจ่ายจริงรวมสุทธิเป็นตัวเลขเท่านั้น (เช่น 1300.00),
  "date": "วันที่ในรูปแบบ YYYY-MM-DD (หากเป็น พ.ศ. ให้ลบ 543 แปลงเป็น ค.ศ. เช่น 2569 -> 2026)",
  "tax_type": "จำแนกประเภทภาษี: 'vat_7' (ใบกำกับภาษี/VAT), 'wht_1' (ขนส่งหัก1%), 'wht_3' (บริการ/ซ่อมบำรุงหัก3%), 'wht_5' (ค่าเช่าหัก5%), 'none' (ไม่มีภาษี)",
  "description": "ชื่อร้านค้าหรือสรุปรายการสินค้าภาษาไทยสั้นๆ"
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
                    maxOutputTokens: 500
                }
            };

            // Valid Google Gemini API Model Endpoint IDs (Supports v1beta and v1)
            const candidateModels = [
                { id: 'gemini-1.5-flash', apiVersion: 'v1beta', label: 'Google Gemini 1.5 Flash' },
                { id: 'gemini-2.0-flash', apiVersion: 'v1beta', label: 'Google Gemini 2.0 Flash' },
                { id: 'gemini-1.5-flash', apiVersion: 'v1', label: 'Google Gemini 1.5 Flash (v1)' },
                { id: 'gemini-1.5-pro', apiVersion: 'v1beta', label: 'Google Gemini 1.5 Pro' },
                { id: 'gemini-1.5-pro', apiVersion: 'v1', label: 'Google Gemini 1.5 Pro (v1)' }
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
                const promptText = `Analyze this receipt image and return JSON: {"category":"ค่าน้ำมัน|ค่าซ่อมบำรุง|ค่าอุปกรณ์|ค่าสาธารณูปโภค|ค่าขนส่ง|อื่นๆ","amount":1450.00,"date":"YYYY-MM-DD","tax_type":"none|vat_7|wht_1|wht_3|wht_5","description":"Thai shop summary"}`;

                const aiResult = await context.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                    image: imageArray,
                    prompt: promptText,
                    max_tokens: 300
                });

                rawOutput = typeof aiResult === 'string' ? aiResult : (aiResult?.response || aiResult?.description || JSON.stringify(aiResult || {}));
            }
        } else if (context.env.AI) {
            // --- FALLBACK TO CLOUDFLARE WORKERS AI LLAMA 3.2 VISION ---
            modelUsed = 'Cloudflare Workers AI (ยังพบว่าไม่มี GEMINI_API_KEY ในโหมด Preview)';
            const imageArray = Array.from(uint8Array);
            const promptText = `Analyze this receipt image and return JSON: {"category":"ค่าน้ำมัน|ค่าซ่อมบำรุง|ค่าอุปกรณ์|ค่าสาธารณูปโภค|ค่าขนส่ง|อื่นๆ","amount":1450.00,"date":"YYYY-MM-DD","tax_type":"none|vat_7|wht_1|wht_3|wht_5","description":"Thai shop summary"}`;

            const aiResult = await context.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                image: imageArray,
                prompt: promptText,
                max_tokens: 300
            });

            rawOutput = typeof aiResult === 'string' ? aiResult : (aiResult?.response || aiResult?.description || JSON.stringify(aiResult || {}));
        } else {
            return errorResponse("กรุณาตั้งค่า GEMINI_API_KEY ใน Cloudflare Pages Environment Secret", 500);
        }

        console.log("[AI Vision Raw Response]", rawOutput);

        let category = 'อื่นๆ';
        let amount = 0;
        let date = null;
        let tax_type = 'none';
        let description = '';

        // Clean & Parse JSON
        const cleanContent = String(rawOutput || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleanContent.indexOf('{');
        const lastBrace = cleanContent.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const jsonSubStr = cleanContent.substring(firstBrace, lastBrace + 1);
            try {
                const parsed = JSON.parse(jsonSubStr);
                
                // 1. Amount Extraction (supports amount, total, total_amount, grand_total, net_amount, price, etc.)
                const rawAmt = parsed.amount ?? parsed.total ?? parsed.total_amount ?? parsed.grand_total ?? parsed.net_amount ?? parsed.sum ?? parsed.price;
                if (rawAmt !== undefined && rawAmt !== null) {
                    const cleanAmt = String(rawAmt).replace(/,/g, '');
                    const parsedNum = parseFloat(cleanAmt);
                    if (!isNaN(parsedNum) && parsedNum > 0) amount = parsedNum;
                }

                // 2. Category Extraction & Fuzzy Thai Mapping
                const rawCat = String(parsed.category || '').trim();
                const validCategories = ['ค่าน้ำมัน', 'ค่าซ่อมบำรุง', 'ค่าอุปกรณ์', 'ค่าสาธารณูปโภค', 'ค่าขนส่ง', 'ค่าอาหาร', 'ค่าแอมโมเนีย', 'ยาขาว', 'ค่าเช่าบ้าน', 'อื่นๆ'];
                if (validCategories.includes(rawCat)) {
                    category = rawCat;
                } else if (/น้ำมัน|ปตท|บางจาก|เชลล์|คาลเท็กซ์|PT/i.test(rawCat || rawOutput)) {
                    category = 'ค่าน้ำมัน';
                } else if (/ซ่อม|ยาง|อะไหล่|ช่าง|บำรุง/i.test(rawCat || rawOutput)) {
                    category = 'ค่าซ่อมบำรุง';
                } else if (/ไฟ|น้ำ|ไฟฟ้า|ประปา|โทรศัพท์|เน็ต/i.test(rawCat || rawOutput)) {
                    category = 'ค่าสาธารณูปโภค';
                } else if (/ขนส่ง|พัสดุ|ค่าส่ง|แฟลช|ไปรษณีย์|J&T/i.test(rawCat || rawOutput)) {
                    category = 'ค่าขนส่ง';
                } else if (/อาหาร|ข้าว|ก๋วยเตี๋ยว|กาแฟ|ร้านอาหาร/i.test(rawCat || rawOutput)) {
                    category = 'ค่าอาหาร';
                } else if (/แอมโมเนีย/i.test(rawCat || rawOutput)) {
                    category = 'ค่าแอมโมเนีย';
                } else if (/ยาขาว/i.test(rawCat || rawOutput)) {
                    category = 'ยาขาว';
                } else if (/เช่า/i.test(rawCat || rawOutput)) {
                    category = 'ค่าเช่าบ้าน';
                }

                // 3. Date Extraction & Buddhist Era Conversion
                const rawDate = String(parsed.date || parsed.transaction_date || parsed.receipt_date || '').trim();
                if (rawDate && rawDate !== 'null') {
                    // Match YYYY-MM-DD
                    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                        let year = parseInt(rawDate.substring(0, 4), 10);
                        if (year > 2500) year -= 543;
                        date = `${year}-${rawDate.substring(5)}`;
                    } else {
                        date = rawDate;
                    }
                }

                // 4. Tax Type Extraction
                if (parsed.tax_type && ['none', 'vat_7', 'wht_1', 'wht_3', 'wht_5'].includes(parsed.tax_type)) {
                    tax_type = parsed.tax_type;
                }

                // 5. Description / Merchant Name Extraction
                const rawDesc = String(parsed.description || parsed.shop_name || parsed.vendor || parsed.merchant || parsed.title || '').trim();
                if (rawDesc) description = rawDesc;

            } catch (e) {
                console.warn("[JSON Parse Failed]", e);
            }
        }

        // Robust Fallbacks if JSON parsing missed amount
        if (!amount) {
            const matches = [...cleanContent.matchAll(/([\d,]+\.\d{2}|[\d,]+)/g)];
            const candidates = matches.map(m => parseFloat(m[1].replace(/,/g, ''))).filter(n => !isNaN(n) && n > 0 && n < 500000 && n !== 2026 && n !== 2569);
            if (candidates.length > 0) amount = Math.max(...candidates);
        }

        if (!description) {
            description = 'ใบเสร็จค่าใช้จ่าย';
        }

        return jsonResponse({
            status: 'success',
            model: modelUsed,
            debugError: debugError ? debugError.substring(0, 200) : undefined,
            data: {
                category,
                amount,
                date,
                tax_type,
                description
            }
        });

    } catch (e) {
        console.error("[AI Expense Scan Error]", e);
        return errorResponse("เกิดข้อผิดพลาดในการสแกนใบเสร็จด้วย AI: " + e.message);
    }
}

export const onRequestPost = withAuth(handleScan);
