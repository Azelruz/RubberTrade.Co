import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatReceiptDate } from '../../utils/dateUtils';

const SellPaperReceipt = ({ printingRecord, printRef, settings, paperSlipConfig }) => {
    if (!printingRecord) return null;

    const isCupLump = printingRecord.rubberType === 'cup_lump' || printingRecord.rubber_type === 'cup_lump';
    const dryRubber = Number(printingRecord.dryWeight || printingRecord.dry_weight || printingRecord.dryRubber || 0);
    
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
        showBillType: true, showBillId: true, showDateTime: true, showFarmerName: true, 
        showRawWeight: true, showNetWeight: true, showDrc: true, 
        showDryWeight: true, showActualPrice: true,
        footerText: '=== ขอบคุณที่ใช้บริการ ===',
        headerTitle: isCupLump ? 'ใบส่งสินค้า (ขี้ยางก้อน)' : 'ใบส่งสินค้า / DELIVERY NOTE',
        labels: {
            rawWeight: 'น้ำหนักรวมขาย',
            lossWeight: Number(printingRecord.lossWeight) > 0 ? 'ปรับปรุงสต๊อก (เพิ่ม)' : 'ส่วนต่าง/สูญเสีย',
            netWeight: 'น้ำหนักสุทธิ',
            drc: 'DRC',
            dryWeight: 'แห้ง',
            pricePerKg: 'ราคาขาย',
            actualPrice: 'ราคาสุทธิ'
        }
    };

    const labels = config.labels;
    const headerTitle = config.headerTitle;
    const rawWeightLabel = labels.rawWeight;

    return (
        <div style={{ display: 'none' }}>
            <div ref={printRef} className="receipt-content">
                {/* Top Note */}
                {config.topNote && (
                    <div style={{ textAlign: 'center', fontSize: '2.5mm', fontStyle: 'italic', marginBottom: '1mm' }}>
                        {config.topNote}
                    </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '4mm', borderBottom: '1px dashed #000', paddingBottom: '2mm' }}>
                    <div style={{ height: '10mm', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2mm' }}>
                        {(config.showLogo !== false && settings.logoUrl) && (
                            <img src={settings.logoUrl} alt="Logo" style={{ maxHeight: '100%', filter: 'grayscale(1) contrast(2)' }} />
                        )}
                    </div>
                    {config.showStoreName !== false && <h2 style={{ margin: '0', fontSize: `${(config.fontSizeStoreName || 12) * 0.4}mm`, fontWeight: 'bold' }}>{settings.factoryName || 'ร้านรับซื้อน้ำยางพารา'}</h2>}
                    {config.showAddress !== false && <p style={{ margin: '1mm 0', fontSize: `${(config.fontSizeAddress || 8) * 0.4}mm` }}>{settings.address || '-'}</p>}
                    {config.showPhone !== false && <p style={{ margin: '0', fontSize: `${(config.fontSizePhone || 8) * 0.4}mm`, fontWeight: 'bold' }}>โทร: {settings.phone || '-'}</p>}
                    {config.showBillType !== false && (
                        <div style={{ 
                            marginTop: '2mm', 
                            padding: '1mm 4mm', 
                            border: '1.5px solid #000', 
                            display: 'inline-block', 
                            fontSize: `${(config.fontSizeHeaderTitle || 10) * 0.35}mm`, 
                            fontWeight: 'bold',
                            borderRadius: '0.5mm'
                        }}>
                            {headerTitle}
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: '3mm', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${(config.fontSizeDateTimeValue || 9) * 0.32}mm` }}>
                        <span style={{ fontSize: `${(config.fontSizeDateTimeLabel || 7) * 0.32}mm` }}>วันที่:</span>
                        <span style={{ fontWeight: 'bold' }}>{formatReceiptDate(printingRecord, 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${(config.fontSizeBillIdValue || 9) * 0.32}mm` }}>
                        <span style={{ fontSize: `${(config.fontSizeBillIdLabel || 7) * 0.32}mm` }}>เลขที่:</span>
                        <span style={{ fontWeight: 'bold' }}>SELL-{printingRecord.id?.toString().slice(-6).toUpperCase()}</span>
                    </div>
                    <div style={{ borderBottom: '0.5px solid #eee', margin: '1mm 0' }}></div>
                    <div style={{ fontSize: `${(config.fontSizeFarmerNameValue || 10) * 0.35}mm` }}>
                        <span style={{ fontSize: `${(config.fontSizeFarmerNameLabel || 9) * 0.32}mm` }}>ผู้ซื้อ: </span>
                        <span style={{ fontWeight: 'bold' }}>{printingRecord.buyerName}</span>
                    </div>
                    {printingRecord.truckInfo && <div style={{ fontSize: `${(config.fontSizeFarmerNameValue || 10) * 0.32}mm` }}>ทะเบียนรถ: <span style={{ fontWeight: 'bold' }}>{printingRecord.truckInfo}</span></div>}
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #000', borderTop: '1px solid #000', fontSize: '3.2mm' }}>
                            <th style={{ textAlign: 'left', padding: '1mm 0' }}>{rawWeightLabel}</th>
                            <th style={{ textAlign: 'right', padding: '1mm 0' }}>จำนวน</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: '1.5mm 0' }}>
                                <div style={{ fontSize: `${(config.fontSizeRawWeightLabel || 9) * 0.35}mm` }}>{isCupLump ? 'ขี้ยางพารา' : 'น้ำยางพารา'}</div>
                                {!isCupLump && <div style={{ fontSize: `${(config.fontSizeDrcLabel || 8) * 0.35}mm`, color: '#666' }}>{labels.drc}: {Number(printingRecord.drc).toFixed(2)}%</div>}
                            </td>
                            <td style={{ textAlign: 'right', padding: '1.5mm 0' }}>
                                <div style={{ fontSize: `${(config.fontSizeRawWeightValue || 10) * 0.35}mm`, fontWeight: 'bold' }}>{Number(printingRecord.weight).toLocaleString()} <span style={{ fontSize: '2.5mm' }}>กก.</span></div>
                                {!isCupLump && <div style={{ fontSize: `${(config.fontSizeDryWeightValue || 11) * 0.35}mm` }}>{labels.dryWeight}: {dryRubber.toLocaleString()}</div>}
                            </td>
                        </tr>
                        {Number(printingRecord.lossWeight) !== 0 && (
                            <tr>
                                <td style={{ padding: '0.5mm 0', fontSize: '2.8mm', fontStyle: 'italic' }}>
                                    {labels.lossWeight}
                                </td>
                                <td style={{ textAlign: 'right', padding: '0.5mm 0', fontSize: '2.8mm' }}>
                                    {Number(printingRecord.lossWeight) > 0 ? '+' : '-'} {Math.abs(Number(printingRecord.lossWeight))} กก.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div style={{ 
                    borderTop: '1px solid #000', 
                    paddingTop: '2mm', 
                    fontSize: `${(config.fontSizeNetWeightValue || 20) * 0.25}mm`, 
                    fontWeight: 'bold', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '2mm'
                }}>
                    <span style={{ fontSize: `${(config.fontSizeNetWeightLabel || 10) * 0.35}mm` }}>{labels.netWeight}:</span>
                    <span>{dryRubber.toLocaleString()} {isCupLump ? 'กก.' : 'กก.แห้ง'}</span>
                </div>

                {config.showActualPrice !== false && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4mm' }}>
                        <span style={{ fontSize: `${(config.fontSizeActualPriceLabel || 10) * 0.35}mm` }}>{labels.pricePerKg || 'ราคาขาย'}:</span>
                        <span style={{ fontSize: `${(config.fontSizeActualPriceValue || 12) * 0.35}mm` }}>฿{Number(printingRecord.pricePerKg || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                    </div>
                )}

                {/* Extra Message Area */}
                {config.extraMessage && (
                    <div style={{ fontSize: `${(config.fontSizeExtraMessage || 7) * 0.4}mm`, fontStyle: 'italic', marginBottom: '4mm', padding: '2mm', border: '0.5px solid #000', borderRadius: '0.5mm' }}>
                        {config.extraMessage}
                    </div>
                )}

                {printingRecord.note && (
                    <div style={{ fontSize: '2.8mm', fontStyle: 'italic', marginBottom: '4mm', padding: '1mm', backgroundColor: '#f9f9f9', borderRadius: '0.5mm' }}>
                        หมายเหตุ: {printingRecord.note}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6mm', fontSize: '3mm' }}>
                    <div style={{ textAlign: 'center', width: '45%' }}>
                        <div style={{ borderBottom: '1px solid #000', height: '8mm' }}></div>
                        <div style={{ marginTop: '1mm' }}>ผู้ส่งของ</div>
                    </div>
                    <div style={{ textAlign: 'center', width: '45%' }}>
                        <div style={{ borderBottom: '1px solid #000', height: '8mm' }}></div>
                        <div style={{ marginTop: '1mm' }}>ผู้รับของ</div>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '6mm', color: '#999', borderTop: '0.5px solid #eee', paddingTop: '1mm' }}>
                    <div style={{ fontWeight: 'bold', color: '#000', marginBottom: '1mm', fontSize: `${(config.fontSizeFooterText || 10) * 0.3}mm` }}>{config.footerText}</div>
                    <div style={{ fontSize: '2.5mm' }}>พิมพ์เมื่อ: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: th })}</div>
                </div>
            </div>
        </div>
    );
};

export default SellPaperReceipt;
