import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatReceiptDate, formatSelectedDate, formatRecordingDate } from '../../utils/dateUtils';
import { truncateTwoDecimals } from '../../utils/calculations';

const SellPaperReceipt = ({ printingRecord, printRef, settings, paperSlipConfig, staff }) => {
    if (!printingRecord) return null;

    const isCupLump = printingRecord.rubberType === 'cup_lump' || printingRecord.rubber_type === 'cup_lump';
    const employee = staff?.find(s => String(s.id) === String(printingRecord.employeeId));
    const employeeName = employee ? employee.name : '-';
    
    // Resolve configuration from Multi-Template / Multi-Platform schema
    const resolveConfig = () => {
        if (!paperSlipConfig || !paperSlipConfig.templates) return null;
        
        // Find assigned default template for the rubber type
        const templateId = isCupLump ? paperSlipConfig.defaultCupLumpId : paperSlipConfig.defaultLatexId;
        const template = paperSlipConfig.templates.find(t => t.id === templateId) || paperSlipConfig.templates[0];
        
        if (!template) return null;

        return {
            ...(template.common || {}),
            ...(template.paper || {}), // Specific configuration for thermal paper
        };
    };

    const config = resolveConfig() || { 
        showLogo: true, showStoreName: true, showAddress: true, showPhone: true, 
        showBillType: true, showBillId: true, showDateTime: true, showSelectedDate: true, showRecordingTime: true, showFarmerName: true, 
        showRawWeight: true, showNetWeight: true, showDrc: true, 
        showDryWeight: true, showActualPrice: true,
        footerText: '=== ขอบคุณที่ใช้บริการ ===',
        headerTitle: isCupLump ? 'ใบส่งสินค้า (ขี้ยางก้อน)' : 'ใบส่งสินค้า / DELIVERY NOTE',
        labels: {
            rawWeight: 'น้ำหนักยางสด',
            lossWeight: Number(printingRecord.lossWeight) > 0 ? 'ปรับปรุงสต๊อก (เพิ่ม)' : 'ส่วนต่าง/สูญเสีย',
            netWeight: 'น้ำหนักสุทธิ',
            drc: 'DRC',
            dryWeight: 'แห้ง',
            pricePerKg: 'ราคาขาย',
            actualPrice: 'ราคาสุทธิ'
        }
    };

    const headerTitle = config.headerTitle || (isCupLump ? 'ใบส่งสินค้า (ขี้ยางก้อน)' : 'ใบส่งสินค้า / DELIVERY NOTE');

    return (
        <div style={{ display: 'none' }}>
            <div ref={printRef}>
                <div className="receipt-content text-black text-[16px] leading-snug p-1 pr-[5px] font-sans" style={{ width: '100%', maxWidth: '100%', margin: '0', paddingRight: '5px', background: 'white', boxSizing: 'border-box' }}>
                    <div className="receipt-content-inner">
                        {/* Top Note */}
                        {config.topNote && (
                            <div style={{ fontSize: `${(config.fontSizeTopNote || 7) * 2}px` }} className="text-center italic border-b border-black mb-1 pb-1">
                                {config.topNote}
                            </div>
                        )}

                        {/* Header */}
                        <div className="text-center mb-4 border-b-2 border-black pb-2">
                            {(config.showLogo !== false && (settings.logoUrl || settings.logo_url || settings.logo_Url)) && (
                                <div className="h-16 flex items-center justify-center mb-2">
                                    <img 
                                        src={settings.logoUrl || settings.logo_url || settings.logo_Url} 
                                        alt="Logo" 
                                        className="h-16 mx-auto object-contain" 
                                        style={{ filter: 'grayscale(1) contrast(2)' }} 
                                    />
                                </div>
                            )}
                            {config.showStoreName !== false && (
                                <h1 style={{ fontSize: `${(config.fontSizeStoreName || 12) * 2}px` }} className="font-bold leading-tight">
                                    {settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา'}
                                </h1>
                            )}
                            {(config.showAddress !== false || config.showPhone !== false) && (
                                <div className="leading-tight">
                                    {config.showAddress !== false && (
                                        <p style={{ fontSize: `${(config.fontSizeAddress || 8) * 1.8}px` }}>
                                            {settings.address || '-'}
                                        </p>
                                    )}
                                    {config.showPhone !== false && (
                                        <p style={{ fontSize: `${(config.fontSizePhone || 8) * 1.8}px` }} className="font-bold">
                                            โทร: {settings.phone || '-'}
                                        </p>
                                    )}
                                </div>
                            )}
                            {config.showBillType !== false && (
                                <div style={{ fontSize: `${(config.fontSizeHeaderTitle || 10) * 2}px` }} className="mt-2 font-bold border-2 border-black inline-block px-6 py-1">
                                    {headerTitle}
                                </div>
                            )}
                        </div>

                        {/* Invoice & Buyer Info */}
                        <div className="mb-4">
                            <div className="mb-2 font-mono border-b border-black pb-1">
                                {config.showBillId !== false && (
                                    <div className="flex justify-between" style={{ fontSize: `${(config.fontSizeBillIdValue || config.fontSizeBillId || 7) * 2}px` }}>
                                        <span style={{ fontSize: `${(config.fontSizeBillIdLabel || config.fontSizeBillId || 7) * 2}px` }}>เลขที่บิล:</span>
                                        <span className="font-bold">SELL-{printingRecord.id?.toString().slice(-6).toUpperCase()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between" style={{ fontSize: `${(config.fontSizeDateTimeValue || config.fontSizeDateTime || 7) * 2}px` }}>
                                    <span style={{ fontSize: `${(config.fontSizeDateTimeLabel || config.fontSizeDateTime || 7) * 2}px` }}>
                                        วันที่ส่งสินค้า:
                                    </span>
                                    <span className="font-bold">{formatSelectedDate(printingRecord, 'dd/MM/yyyy')}</span>
                                </div>
                                {config.showRecordingTime !== false && (
                                    <div className="flex justify-between" style={{ fontSize: `${(config.fontSizeDateTimeValue || config.fontSizeDateTime || 7) * 2}px` }}>
                                        <span style={{ fontSize: `${(config.fontSizeDateTimeLabel || config.fontSizeDateTime || 7) * 2}px` }}>
                                            เวลาบันทึก:
                                        </span>
                                        <span className="font-bold">{formatRecordingDate(printingRecord, 'dd/MM/yyyy HH:mm')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between" style={{ fontSize: `${(config.fontSizeDateTimeValue || config.fontSizeDateTime || 7) * 2}px` }}>
                                    <span style={{ fontSize: `${(config.fontSizeDateTimeLabel || config.fontSizeDateTime || 7) * 2}px` }}>
                                        ชื่อพนักงาน:
                                    </span>
                                    <span className="font-bold">{employeeName}</span>
                                </div>
                            </div>

                            <div className="mb-2">
                                <div className="flex justify-between items-baseline" style={{ fontSize: `${(config.fontSizeFarmerNameValue || config.fontSizeFarmerName || 10) * 2}px` }}>
                                    <span style={{ fontSize: `${(config.fontSizeFarmerNameLabel || 9) * 2}px` }}>โรงงานที่ส่ง: </span>
                                    <span className="font-bold text-right leading-tight max-w-[65%]">
                                        {printingRecord.buyerName}
                                    </span>
                                </div>
                                <div className="flex justify-between" style={{ fontSize: `${(config.fontSizeFarmerNameValue || 10) * 1.8}px` }}>
                                    <span>ทะเบียนรถ: </span>
                                    <span className="font-bold">{printingRecord.truckInfo || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Details (Only Raw Weight / Fresh Latex Weight is shown) */}
                        <div className="mb-6 border-t border-black pt-2">
                            {config.showRawWeight !== false && (
                                <div style={{ fontSize: `${(config.fontSizeRawWeightLabel || config.fontSizeLabel || 10) * 2}px` }} className="flex justify-between items-center mt-1">
                                    <span className="font-bold">น้ำหนักยางสด:</span>
                                    <span style={{ fontSize: `${(config.fontSizeRawWeightValue || config.fontSizeValue || 11) * 2}px` }} className="font-black border-b-2 border-black">
                                        {Number(printingRecord.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Signature Area */}
                        <div className="flex justify-between mt-6 text-sm border-t border-dashed border-black pt-4">
                            <div className="text-center w-[45%]">
                                <div className="border-b border-black h-8 mb-1"></div>
                                <span>ผู้ส่งของ</span>
                            </div>
                            <div className="text-center w-[45%]">
                                <div className="border-b border-black h-8 mb-1"></div>
                                <span>ผู้รับของ</span>
                            </div>
                        </div>

                        {/* Footer Message */}
                        <div className="text-center mt-6 border-t border-black pt-2">
                            <p style={{ fontSize: `${(config.fontSizeFooterText || 8) * 2}px` }} className="font-bold">
                                {config.footerText || '=== ขอบคุณที่ใช้บริการ ==='}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1 font-mono">
                                พิมพ์เมื่อ: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: th })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellPaperReceipt;
