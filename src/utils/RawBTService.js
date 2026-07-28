/**
 * RawBTService.js - Android Direct 1-Click ESC/POS Thermal Printing via RawBT App Intent
 */
import { ensureHtml2Canvas } from './WebBluetoothPrintService';

/**
 * Format receipt object into full detailed text for Thermal Printer (58mm / 80mm)
 */
export const formatReceiptToPlainText = (record, settings = {}, config = {}) => {
    if (!record) return '';

    const isCupLump = record.rubberType === 'cup_lump' || record.rubber_type === 'cup_lump';
    const storeName = settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา';
    const address = settings.address || '';
    const phone = settings.phone || '';
    const headerTitle = isCupLump ? 'ใบรับซื้อขี้ยางพารา' : 'ใบรับซื้อน้ำยางพารา';
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

    const line = '--------------------------------';
    const doubleLine = '================================';

    let txt = '';
    txt += `${storeName}\n`;
    if (address) txt += `${address}\n`;
    if (phone) txt += `โทร: ${phone}\n`;
    txt += `${doubleLine}\n`;
    txt += `     ${headerTitle}\n`;
    txt += `${line}\n`;
    txt += `เลขที่บิล: ${record.id || '-'}\n`;
    txt += `วันที่ทำรายการ: ${dateStr}\n`;
    if (timeStr) txt += `เวลาบันทึก: ${timeStr}\n`;
    txt += `ชื่อลูกค้า: ${farmerName}\n`;
    if (fscId) txt += `รหัส FSC: ${fscId}\n`;
    txt += `${line}\n`;

    txt += `=== รายละเอียดรับซื้อ ===\n`;
    txt += `น้ำหนักดิบ:  ${weight} กก.\n`;
    if (bucket > 0) {
        txt += `หักถังยาง:   -${bucketStr} กก.\n`;
    }
    txt += `น้ำหนักสุทธิ: ${netWeight} กก.\n`;

    if (!isCupLump) {
        txt += `% DRC:        ${drc}%\n`;
        txt += `ยางแห้ง:      ${dryWeight} กก.\n`;
    }

    txt += `${line}\n`;
    txt += `ราคากลาง:    ${basePrice} บ./กก.\n`;
    if (!isCupLump && bonusDrc > 0) {
        txt += `โบนัส DRC:   +${bonusDrc.toFixed(1)} บ./กก.\n`;
    }
    if (bonusFsc > 0) {
        txt += `โบนัส FSC:   +${bonusFsc.toFixed(1)} บ./กก.\n`;
    }
    if (bonusMember > 0) {
        txt += `โบนัสสมาชิก: +${bonusMember.toFixed(1)} บ./กก.\n`;
    }
    txt += `ราคาจริงสุทธิ:${actualPrice} บ./กก.\n`;

    if (!isCupLump && empPct > 0) {
        txt += `${line}\n`;
        txt += `ส่วนเกษตรกร (${100 - empPct}%): ${farmerTotal} บาท\n`;
        txt += `ส่วนลูกจ้าง (${empPct}%):    ${employeeTotal} บาท\n`;
    }

    txt += `${doubleLine}\n`;
    txt += `ยอดรวมสุทธิ:  ${total} บาท\n`;
    txt += `${doubleLine}\n`;
    txt += `=== ขอบคุณที่ใช้บริการ ===\n\n\n\n`;

    return txt;
};

/**
 * Send receipt plain text directly to RawBT Android Driver
 */
export const printViaRawBT = (receiptText) => {
    try {
        const base64Data = btoa(unescape(encodeURIComponent(receiptText)));
        const intentUrl = `intent:base64,${base64Data}#Intent;scheme=rawbt;package=ru.a404.rawbtprinter;S.mime=text/plain;end;`;
        window.location.href = intentUrl;
        return true;
    } catch (error) {
        console.error('[RawBTService] Failed to launch RawBT intent:', error);
        return false;
    }
};

/**
 * Send HTML receipt element as 100% Pixel-Perfect PNG image to RawBT Android Driver
 */
export const printElementViaRawBT = async (element) => {
    try {
        const html2canvas = await ensureHtml2Canvas();

        const clone = element.cloneNode(true);
        clone.style.display = 'block';
        clone.style.visibility = 'visible';
        clone.style.position = 'fixed';
        clone.style.left = '-9999px';
        clone.style.top = '0px';
        clone.style.width = '384px';
        clone.style.background = '#ffffff';
        document.body.appendChild(clone);

        let canvas;
        try {
            canvas = await html2canvas(clone, {
                scale: 2,
                width: 384,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });
        } finally {
            if (clone.parentNode) {
                clone.parentNode.removeChild(clone);
            }
        }

        const dataUrl = canvas.toDataURL('image/png');
        const base64Png = dataUrl.split(',')[1];

        const intentUrl = `intent:base64,${base64Png}#Intent;scheme=rawbt;package=ru.a404.rawbtprinter;S.mime=image/png;end;`;
        window.location.href = intentUrl;
        return true;
    } catch (error) {
        console.error('[RawBTService] Failed to launch RawBT image intent:', error);
        return false;
    }
};
