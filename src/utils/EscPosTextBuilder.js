/**
 * EscPosTextBuilder.js - Dynamic Text ESC/POS Generator driven by Receipt Designer Config
 */
import { encodeThaiTis620 } from './WebBluetoothPrintService';

/**
 * Calculate actual horizontal display width of Thai string (excluding zero-width combining vowels & accents)
 */
export const getThaiDisplayWidth = (str = '') => {
    return String(str).replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, '').length;
};

/**
 * Format two-column line with left and right aligned text padded with spaces
 */
export const formatTwoColumn = (leftStr = '', rightStr = '', colWidth = 32) => {
    const leftLen = getThaiDisplayWidth(leftStr);
    const rightLen = getThaiDisplayWidth(rightStr);
    const spaces = Math.max(1, colWidth - leftLen - rightLen);
    return leftStr + ' '.repeat(spaces) + rightStr;
};

/**
 * Resolve Paper Slip Configuration from root settings
 */
export const resolvePaperSlipConfig = (paperSlipConfig, isCupLump) => {
    if (!paperSlipConfig || !paperSlipConfig.templates) return null;
    const templateId = isCupLump ? paperSlipConfig.defaultCupLumpId : paperSlipConfig.defaultLatexId;
    const template = paperSlipConfig.templates.find(t => t.id === templateId) || paperSlipConfig.templates[0];
    if (!template) return null;
    return {
        ...(template.common || {}),
        ...(template.paper || {})
    };
};

/**
 * Build ESC/POS Byte Buffer driven dynamically by Receipt Designer Config (Toggles, Labels, Notes)
 */
export const buildEscPosTextPayload = (record = {}, settings = {}, paperSlipConfig = {}, colWidth = 32) => {
    const isCupLump = record.rubberType === 'cup_lump' || record.rubber_type === 'cup_lump';
    
    // Parse Full Paper Config
    let parsedConfig = paperSlipConfig;
    if (typeof paperSlipConfig === 'string') {
        try { parsedConfig = JSON.parse(paperSlipConfig); } catch (e) {}
    }
    if (!parsedConfig && settings.paperSlipConfig) {
        try { parsedConfig = typeof settings.paperSlipConfig === 'string' ? JSON.parse(settings.paperSlipConfig) : settings.paperSlipConfig; } catch (e) {}
    }

    const cfg = resolvePaperSlipConfig(parsedConfig, isCupLump) || {};

    const storeName = settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา';
    const address = settings.address || '';
    const phone = settings.phone || '';

    const labels = cfg.labels || {
        rawWeight: isCupLump ? 'น้ำหนักขี้ยาง' : 'น้ำหนักยางดิบ',
        bucketWeight: 'หักถังยาง',
        netWeight: 'น้ำหนักสุทธิ',
        drc: '% DRC',
        dryWeight: 'ยางแห้ง',
        basePrice: 'ราคากลาง',
        bonusDrc: 'โบนัส DRC',
        bonusFsc: 'โบนัส FSC',
        bonusMember: 'โบนัสสมาชิก',
        actualPrice: 'ราคาจริง (สุทธิ)',
        farmerSplit: 'เกษตรกร',
        employeeSplit: 'ลูกจ้าง'
    };

    const headerTitle = cfg.headerTitle || (isCupLump ? 'ใบรับซื้อขี้ยางพารา' : 'ใบรับซื้อน้ำยางพารา');
    const footerText = cfg.footerText || '=== ขอบคุณที่ใช้บริการ ===';
    const topNote = cfg.topNote || '';
    const extraMessage = cfg.extraMessage || '';

    const farmerName = record.farmerName || record.farmer_name || 'ลูกค้าทั่วไป';
    const fscId = record.fscId || record.fsc_id || '';

    const dateStr = record.date ? record.date.split('T')[0] : new Date().toLocaleDateString('th-TH');
    const timeStr = record.created_at ? new Date(record.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';
    
    const weight = Number(record.weight || 0).toLocaleString('th-TH', { minimumFractionDigits: 1 });
    const bucket = Number(record.bucketWeight || record.bucket_weight || 0);
    const bucketStr = bucket.toLocaleString('th-TH', { minimumFractionDigits: 1 });
    const netWeight = (Number(record.weight || 0) - bucket).toLocaleString('th-TH', { minimumFractionDigits: 1 });
    const drc = Number(record.drc || 0).toLocaleString('th-TH', { minimumFractionDigits: 1 });
    const dryWeight = Number(record.dryWeight || record.dryRubber || 0).toLocaleString('th-TH', { minimumFractionDigits: 1 });
    
    const basePrice = Number(record.basePrice || record.base_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 1 });
    const bonusDrc = Number(record.bonusDrc || record.bonus_drc || 0);
    const bonusFsc = Number(record.fscBonus || record.fsc_bonus || 0);
    const bonusMember = Number(record.bonusMemberType || record.bonus_member_type || 0);
    const actualPrice = Number(record.actualPrice || record.pricePerKg || 0).toLocaleString('th-TH', { minimumFractionDigits: 1 });

    const total = Math.floor(Number(record.total || 0)).toLocaleString('th-TH');
    const farmerTotal = Math.floor(Number(record.farmerTotal || record.farmer_total || record.total || 0)).toLocaleString('th-TH');
    const employeeTotal = Math.floor(Number(record.employeeTotal || record.employee_total || 0)).toLocaleString('th-TH');
    const empPct = Number(record.empPct || record.emp_pct || 0);

    const lineStr = '-'.repeat(colWidth);
    const doubleLineStr = '='.repeat(colWidth);

    // ESC/POS Commands
    const CMD_INIT = [0x1B, 0x40, 0x1B, 0x74, 26];
    const CMD_ALIGN_LEFT = [0x1B, 0x61, 0];
    const CMD_ALIGN_CENTER = [0x1B, 0x61, 1];
    
    const CMD_SIZE_NORMAL = [0x1D, 0x21, 0x00];
    const CMD_SIZE_DOUBLE_HEIGHT = [0x1D, 0x21, 0x01];
    const CMD_SIZE_DOUBLE_BOTH = [0x1D, 0x21, 0x11];
    
    const CMD_BOLD_ON = [0x1B, 0x45, 1];
    const CMD_BOLD_OFF = [0x1B, 0x45, 0];

    const bytesList = [];

    const appendCmd = (cmd) => bytesList.push(...cmd);
    const appendText = (textStr) => {
        const encoded = encodeThaiTis620(textStr + '\n');
        bytesList.push(...encoded);
    };

    // 1. Initialize
    appendCmd(CMD_INIT);

    // Top Note
    if (topNote) {
        appendCmd(CMD_ALIGN_CENTER);
        appendText(topNote);
        appendText(lineStr);
    }

    // 2. Store Header
    appendCmd(CMD_ALIGN_CENTER);
    if (cfg.showStoreName !== false) {
        appendCmd(CMD_BOLD_ON);
        appendCmd(CMD_SIZE_DOUBLE_BOTH);
        appendText(storeName);
        appendCmd(CMD_SIZE_NORMAL);
        appendCmd(CMD_BOLD_OFF);
    }

    if (cfg.showAddress !== false && address) appendText(address);
    if (cfg.showPhone !== false && phone) appendText(`โทร: ${phone}`);

    // 3. Document Title
    if (cfg.showBillType !== false) {
        appendText(doubleLineStr);
        appendCmd(CMD_BOLD_ON);
        appendCmd(CMD_SIZE_DOUBLE_HEIGHT);
        appendText(`[ ${headerTitle} ]`);
        appendCmd(CMD_SIZE_NORMAL);
        appendCmd(CMD_BOLD_OFF);
    }
    appendText(lineStr);

    // 4. Meta Data (Left Aligned)
    appendCmd(CMD_ALIGN_LEFT);
    if (cfg.showBillId !== false) appendText(`เลขที่บิล: ${record.id || '-'}`);
    if (cfg.showSelectedDate !== false) appendText(`วันที่ทำรายการ: ${dateStr}`);
    if (cfg.showRecordingTime !== false && timeStr) appendText(`เวลาบันทึก: ${timeStr}`);
    if (cfg.showFarmerName !== false) {
        appendCmd(CMD_BOLD_ON);
        appendText(`ชื่อลูกค้า: ${farmerName}`);
        appendCmd(CMD_BOLD_OFF);
    }
    if (cfg.showFscCode !== false && fscId) appendText(`รหัส FSC: ${fscId}`);
    appendText(lineStr);

    // 5. Purchase Details
    if (cfg.showPurchaseDetailsHeader !== false) {
        appendCmd(CMD_ALIGN_CENTER);
        appendCmd(CMD_BOLD_ON);
        appendText(`=== รายละเอียดรับซื้อ ===`);
        appendCmd(CMD_BOLD_OFF);
    }

    appendCmd(CMD_ALIGN_LEFT);
    if (cfg.showRawWeight !== false) {
        appendText(formatTwoColumn(`${labels.rawWeight}:`, `${weight} กก.`, colWidth));
    }
    if (cfg.showBucketWeight !== false && bucket > 0) {
        appendText(formatTwoColumn(`${labels.bucketWeight}:`, `-${bucketStr} กก.`, colWidth));
    }
    if (cfg.showNetWeight !== false) {
        appendCmd(CMD_BOLD_ON);
        appendText(formatTwoColumn(`${labels.netWeight}:`, `${netWeight} กก.`, colWidth));
        appendCmd(CMD_BOLD_OFF);
    }

    if (!isCupLump) {
        if (cfg.showDrc !== false) appendText(formatTwoColumn(`${labels.drc}:`, `${drc}%`, colWidth));
        if (cfg.showDryWeight !== false) {
            appendCmd(CMD_BOLD_ON);
            appendText(formatTwoColumn(`${labels.dryWeight}:`, `${dryWeight} กก.`, colWidth));
            appendCmd(CMD_BOLD_OFF);
        }
    }

    appendText(lineStr);
    if (cfg.showBasePrice !== false) appendText(formatTwoColumn(`${labels.basePrice}:`, `${basePrice} บ./กก.`, colWidth));
    if (!isCupLump && cfg.showBonusDrc !== false && bonusDrc > 0) {
        appendText(formatTwoColumn(`${labels.bonusDrc}:`, `+${bonusDrc.toFixed(1)} บ./กก.`, colWidth));
    }
    if (cfg.showBonusFsc !== false && bonusFsc > 0) {
        appendText(formatTwoColumn(`${labels.bonusFsc}:`, `+${bonusFsc.toFixed(1)} บ./กก.`, colWidth));
    }
    if (cfg.showBonusMember !== false && bonusMember > 0) {
        appendText(formatTwoColumn(`${labels.bonusMember}:`, `+${bonusMember.toFixed(1)} บ./กก.`, colWidth));
    }
    if (cfg.showActualPrice !== false) {
        appendCmd(CMD_BOLD_ON);
        appendText(formatTwoColumn(`${labels.actualPrice}:`, `${actualPrice} บ./กก.`, colWidth));
        appendCmd(CMD_BOLD_OFF);
    }

    if (!isCupLump && cfg.showSplits !== false && empPct > 0) {
        appendText(lineStr);
        appendText(formatTwoColumn(`${labels.farmerSplit} (${100 - empPct}%):`, `${farmerTotal} บาท`, colWidth));
        appendText(formatTwoColumn(`${labels.employeeSplit} (${empPct}%):`, `${employeeTotal} บาท`, colWidth));
    }

    // Extra Message
    if (extraMessage) {
        appendText(lineStr);
        appendCmd(CMD_ALIGN_CENTER);
        appendText(extraMessage);
    }

    // 6. Total Amount
    appendText(doubleLineStr);
    appendCmd(CMD_ALIGN_CENTER);
    appendCmd(CMD_BOLD_ON);
    appendCmd(CMD_SIZE_DOUBLE_BOTH);
    appendText(`ยอดรวม: ${total} บาท`);
    appendCmd(CMD_SIZE_NORMAL);
    appendCmd(CMD_BOLD_OFF);
    appendText(doubleLineStr);

    // 7. Footer Message
    if (footerText) {
        appendCmd(CMD_ALIGN_CENTER);
        appendText(footerText);
    }

    // Line Feeds & Cut (0x0A x 4, ESC m)
    appendCmd([0x0A, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x42, 0x00]);

    return new Uint8Array(bytesList);
};
