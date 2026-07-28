import React from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatReceiptDate, formatSelectedDate, formatRecordingDate } from '../../utils/dateUtils';

const HistoryPrintTemplates = ({ 
    printingReceipt, printingSellRecord, buyPrintRef, sellPrintRef, 
    settings, farmers, memberTypes, drcBonuses, calculateDrcBonus, truncateOneDecimal,
    paperSlipConfig
}) => {
    return (
        <div style={{ display: 'none' }}>
            {/* Hidden Buy Print Container (Thermal) */}
            <div ref={buyPrintRef}>
                {printingReceipt && (() => {
                    const isCupLump = printingReceipt.rubberType === 'cup_lump' || printingReceipt.rubber_type === 'cup_lump';
                    
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
                        showRawWeight: true, showBucketWeight: true, showNetWeight: true, showDrc: true, 
                        showDryWeight: true, showBasePrice: true, showBonusDrc: true, showBonusFsc: true, 
                        showBonusMember: true, showActualPrice: true, showSplits: true,
                        footerText: '=== ขอบคุณที่ใช้บริการ ===',
                        headerTitle: isCupLump ? 'ใบรับซื้อขี้ยางพารา' : 'ใบรับซื้อน้ำยางพารา',
                        labels: {
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
                        }
                    };

                    const labels = config.labels;
                    const headerTitle = config.headerTitle;
                    const rawWeightLabel = labels.rawWeight;
                    const farmer = farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id));
                    const fscId = printingReceipt.fscId || printingReceipt.fsc_id || farmer?.fscId || farmer?.fsc_id;

                    return (
                        <div className="receipt-content text-black text-[12px] leading-snug p-1 pr-[5px] font-sans" style={{ width: '100%', maxWidth: '76mm', margin: '0', paddingRight: '5px', background: 'white', boxSizing: 'border-box' }}>
                            {/* Top Note */}
                            {config.topNote && (
                                <div style={{ fontSize: `${(config.fontSizeTopNote || 7) * 2}px` }} className="text-center italic border-b border-black mb-1 pb-1">
                                    {config.topNote}
                                </div>
                            )}

                            {/* Header - High Contrast for Thermal */}
                            <div className="text-center mb-3 border-b-2 border-black pb-2">
                                    {(config.showLogo !== false && (settings.logo_url || settings.logoUrl)) && (
                                        <div className="h-12 flex items-center justify-center mb-2">
                                            <img src={settings.logo_url || settings.logoUrl} alt="Logo" className="h-12 mx-auto object-contain" style={{ filter: 'grayscale(1) contrast(2)' }} />
                                        </div>
                                    )}
                                {config.showStoreName !== false && <h1 style={{ fontSize: `${(config.fontSizeStoreName || 12) * 2}px` }} className="font-bold leading-tight">{settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา'}</h1>}
                                {config.showAddress !== false && <p style={{ fontSize: `${(config.fontSizeAddress || 7) * 2}px` }} className="font-medium leading-tight">{settings.address || '-'}</p>}
                                {config.showPhone !== false && <p style={{ fontSize: `${(config.fontSizePhone || 8) * 2}px` }} className="font-bold">โทร: {settings.phone || '-'}</p>}
                                {config.showBillType !== false && (
                                    <div style={{ fontSize: `${(config.fontSizeHeaderTitle || 10) * 2}px` }} className="mt-2 font-bold border-2 border-black inline-block px-4 py-0.5 uppercase tracking-widest">
                                        {headerTitle}
                                    </div>
                                )}
                            </div>

                            {/* Invoice Info */}
                            {(config.showBillId !== false || config.showSelectedDate !== false || config.showRecordingTime !== false) && (
                                <div className="mb-3 border-b border-black pb-1 font-mono">
                                    {config.showBillId !== false && (
                                        <div className="flex justify-between" style={{ fontSize: `${(config.fontSizeBillIdValue || config.fontSizeBillId || 7) * 2}px` }}>
                                            <span style={{ fontSize: `${(config.fontSizeBillIdLabel || config.fontSizeBillId || 7) * 2}px` }}>เลขที่:</span>
                                            <span className="font-bold">{printingReceipt.id?.substring(0, 14)}</span>
                                        </div>
                                    )}
                                    {config.showSelectedDate !== false && (
                                        <div className="flex justify-between" style={{ fontSize: `${(config.fontSizeDateTimeValue || config.fontSizeDateTime || 7) * 2}px` }}>
                                            <span style={{ fontSize: `${(config.fontSizeDateTimeLabel || config.fontSizeDateTime || 7) * 2}px` }}>{(config.labels?.selectedDate || 'วันที่ทำรายการ')}:</span>
                                            <span className="font-bold">{formatSelectedDate(printingReceipt, 'dd/MM/yyyy')}</span>
                                        </div>
                                    )}
                                    {config.showRecordingTime !== false && (
                                        <div className="flex justify-between" style={{ fontSize: `${(config.fontSizeDateTimeValue || config.fontSizeDateTime || 7) * 2}px` }}>
                                            <span style={{ fontSize: `${(config.fontSizeDateTimeLabel || config.fontSizeDateTime || 7) * 2}px` }}>{(config.labels?.recordingTime || 'เวลาบันทึก')}:</span>
                                            <span className="font-bold">{formatRecordingDate(printingReceipt, 'dd/MM/yyyy HH:mm')}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Farmer Info */}
                            {config.showFarmerName !== false && (
                                <div className="mb-3">
                                    <div className="flex items-baseline gap-1">
                                        <span style={{ fontSize: `${(config.fontSizeFarmerNameLabel || 9) * 2}px` }}>ชื่อลูกค้า: </span>
                                        <h2 style={{ fontSize: `${(config.fontSizeFarmerNameValue || config.fontSizeFarmerName || 10) * 2}px` }} className="font-bold">{printingReceipt.farmerName || 'ลูกค้าทั่วไป'}</h2>
                                    </div>
                                    {(config.showFscCode !== false && fscId) && (
                                        <div style={{ fontSize: `${((config.fontSizeFarmerNameValue || config.fontSizeFarmerName || 10) - 2) * 2}px` }} className="font-mono text-gray-700 leading-tight mt-0.5">
                                            <span>{(config.labels?.fscCode || 'รหัส FSC')}: </span>
                                            <span className="font-bold">{fscId}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Details */}
                            <div className="py-2 border-t border-black space-y-1">
                                {config.showRawWeight !== false && (
                                    <div style={{ fontSize: `${(config.fontSizeRawWeightLabel || config.fontSizeLabel || 9) * 2}px` }} className="flex justify-between items-center">
                                        <span>{rawWeightLabel}</span>
                                        <span style={{ fontSize: `${(config.fontSizeRawWeightValue || config.fontSizeValue || 10) * 2}px` }} className="font-bold">{Number(printingReceipt.weight).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                    </div>
                                )}
                                {(config.showBucketWeight !== false && Number(printingReceipt.bucketWeight ?? printingReceipt.bucket_weight ?? 0) > 0) && (
                                    <div style={{ fontSize: `${(config.fontSizeBucketWeightLabel || config.fontSizeSubData || 8) * 2}px` }} className="flex justify-between items-center text-black italic mb-1">
                                        <span>{labels.bucketWeight}</span>
                                        <span style={{ fontSize: `${(config.fontSizeBucketWeightValue || config.fontSizeSubData || 8) * 2}px` }}>-{Number(printingReceipt.bucketWeight ?? printingReceipt.bucket_weight ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                    </div>
                                )}
                                {config.showNetWeight !== false && (
                                    <div style={{ fontSize: `${(config.fontSizeNetWeightLabel || config.fontSizeLabel || 9) * 2}px` }} className="flex justify-between items-center font-bold">
                                        <span>{labels.netWeight}</span>
                                        <span style={{ fontSize: `${(config.fontSizeNetWeightValue || config.fontSizeValue || 11) * 2}px` }} className="border-b border-black">{(Number(printingReceipt.weight) - Number(printingReceipt.bucketWeight ?? printingReceipt.bucket_weight ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                    </div>
                                )}
                                {!isCupLump && (
                                    <>
                                        {config.showDrc !== false && (
                                            <div style={{ fontSize: `${(config.fontSizeDrcLabel || config.fontSizeLabel || 9) * 2}px` }} className="flex justify-between items-center">
                                                <span>{labels.drc}</span>
                                                <span style={{ fontSize: `${(config.fontSizeDrcValue || config.fontSizeValue || 10) * 2}px` }} className="font-bold border-b border-black">{Number(printingReceipt.drc).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                            </div>
                                        )}
                                        {config.showDryWeight !== false && (
                                            <div style={{ fontSize: `${(config.fontSizeDryWeightLabel || config.fontSizeLabel || 9) * 2}px` }} className="flex justify-between items-center">
                                                <span>{labels.dryWeight}</span>
                                                <span style={{ fontSize: `${(config.fontSizeDryWeightValue || config.fontSizeValue || 11) * 2}px` }} className="font-bold border-b border-black">{Number(printingReceipt.dryWeight ?? printingReceipt.dry_weight ?? printingReceipt.dryRubber ?? printingReceipt.dry_rubber ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="my-2 border-t border-dashed border-black"></div>

                                {config.showBasePrice !== false && (
                                    <div style={{ fontSize: `${(config.fontSizeBasePriceLabel || config.fontSizeLabel || 8) * 2}px` }} className="flex justify-between items-center">
                                        <span>{labels.basePrice}</span>
                                        <span style={{ fontSize: `${(config.fontSizeBasePriceValue || config.fontSizeValue || 10) * 2}px` }}>{Number(printingReceipt.basePrice ?? printingReceipt.base_price ?? ((printingReceipt.actualPrice ?? printingReceipt.actual_price ?? printingReceipt.pricePerKg ?? printingReceipt.price_per_kg ?? 0) - (printingReceipt.bonusDrc ?? printingReceipt.bonus_drc ?? calculateDrcBonus(printingReceipt.drc, drcBonuses)))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                    </div>
                                )}
                                {!isCupLump && (
                                    <>
                                        {config.showBonusDrc !== false && (
                                            <div style={{ fontSize: `${(config.fontSizeBonusDrcLabel || config.fontSizeSubData || 8) * 2}px` }} className="flex justify-between items-center font-medium">
                                                <span>{labels.bonusDrc}</span>
                                                <span style={{ fontSize: `${(config.fontSizeBonusDrcValue || config.fontSizeSubData || 8) * 2}px` }}>+{Number(printingReceipt.bonusDrc ?? printingReceipt.bonus_drc ?? calculateDrcBonus(printingReceipt.drc, drcBonuses)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                            </div>
                                        )}
                                        {(config.showBonusFsc !== false && Number(printingReceipt.fscBonus ?? printingReceipt.fsc_bonus ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.fscId ? (settings.fscBonus || settings.fsc_bonus || 1) : 0)) > 0) && (
                                            <div style={{ fontSize: `${(config.fontSizeBonusFscLabel || config.fontSizeSubData || 8) * 2}px` }} className="flex justify-between items-center font-medium text-black">
                                                <span>{labels.bonusFsc}</span>
                                                <span style={{ fontSize: `${(config.fontSizeBonusFscValue || config.fontSizeSubData || 8) * 2}px` }}>+{Number(printingReceipt.fscBonus ?? printingReceipt.fsc_bonus ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.fscId ? (settings.fscBonus || settings.fsc_bonus || 1) : 0)).toLocaleString(undefined, { minimumFractionDigits: 0 })}/กก.</span>
                                            </div>
                                        )}
                                        {(config.showBonusMember !== false && Number(printingReceipt.bonusMemberType ?? printingReceipt.bonus_member_type ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id)).memberTypeId)?.bonus : 0)) > 0) && (
                                            <div style={{ fontSize: `${(config.fontSizeBonusMemberLabel || config.fontSizeSubData || 8) * 2}px` }} className="flex justify-between items-center font-black text-rubber-700 bg-rubber-50 px-1 rounded">
                                                <span>{memberTypes.find(mt => mt.id === (printingReceipt.memberTypeId || printingReceipt.member_type_id || farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId))?.name || labels.bonusMember}</span>
                                                <span style={{ fontSize: `${(config.fontSizeBonusMemberValue || config.fontSizeSubData || 8) * 2}px` }}>+{Number(printingReceipt.bonusMemberType ?? printingReceipt.bonus_member_type ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id)).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                {config.showActualPrice !== false && (
                                    <div style={{ fontSize: `${(config.fontSizeActualPriceLabel || config.fontSizeLabel || 10) * 2}px` }} className="flex justify-between items-center font-bold border-t border-black pt-1 mt-1">
                                        <span>{labels.actualPrice}</span>
                                        <span style={{ fontSize: `${(config.fontSizeActualPriceValue || config.fontSizeValue || 12) * 2}px` }} className="font-bold border-b border-black">{truncateOneDecimal(Number(printingReceipt.actualPrice ?? printingReceipt.actual_price ?? printingReceipt.pricePerKg ?? printingReceipt.price_per_kg ?? (Number(printingReceipt.basePrice ?? printingReceipt.base_price ?? 0) + Number(printingReceipt.bonusDrc ?? printingReceipt.bonus_drc ?? 0) + Number(printingReceipt.fscBonus ?? printingReceipt.fsc_bonus ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.fscId ? (settings.fscBonus || settings.fsc_bonus || 1) : 0)) + Number(printingReceipt.bonusMemberType ?? printingReceipt.bonus_member_type ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId ? 1 : 0))))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                    </div>
                                )}
                            </div>

                            {/* Splits */}
                            {config.showSplits !== false && (
                                <div className="py-2 border-t-2 border-black my-2 space-y-1">
                                    <div style={{ fontSize: `${(config.fontSizeFarmerSplitLabel || config.fontSizeSplit || 9) * 2}px` }} className="flex justify-between items-center font-bold">
                                        <span>{labels.farmerSplit} ({100 - (Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0))}%)</span>
                                        <span style={{ fontSize: `${(config.fontSizeFarmerSplitValue || config.fontSizeSplit + 2 || 11) * 2}px`, paddingRight: '5px' }} className="font-bold text-right ml-auto pr-1">{Math.floor(Number(printingReceipt.farmerTotal ?? printingReceipt.farmer_total ?? (Number(printingReceipt.total) * (100 - (Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0))) / 100))).toLocaleString(undefined, { minimumFractionDigits: 0 })}{'\u00A0'}</span>
                                    </div>
                                    {Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0) > 0 && (
                                        <div style={{ fontSize: `${(config.fontSizeEmployeeSplitLabel || config.fontSizeSplit - 1 || 8) * 2}px` }} className="flex justify-between items-center opacity-80">
                                            <span>{labels.employeeSplit} ({Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0)}%)</span>
                                            <span style={{ fontSize: `${(config.fontSizeEmployeeSplitValue || config.fontSizeSplit || 9) * 2}px`, paddingRight: '5px' }} className="font-bold text-right ml-auto pr-1">{Math.floor(Number(printingReceipt.employeeTotal ?? printingReceipt.employee_total ?? (Number(printingReceipt.total) * (Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0)) / 100))).toLocaleString(undefined, { minimumFractionDigits: 0 })}{'\u00A0'}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Extra Message Area */}
                            {config.extraMessage && (
                                <div style={{ fontSize: `${(config.fontSizeExtraMessage || 7) * 2}px` }} className="mt-2 p-2 border border-black italic leading-tight text-center">
                                    {config.extraMessage}
                                </div>
                            )}

                            {/* Total Footer */}
                            <div className="border-t-4 border-double border-black py-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span style={{ fontSize: `${(config.fontSizeTotalLabel || 10) * 2}px` }} className="font-bold uppercase">ยอดรวมสุทธิ</span>
                                    <span style={{ fontSize: `${(config.fontSizeTotalValue || 20) * 2}px`, paddingRight: '5px' }} className="font-bold text-right ml-auto pr-1">{Math.floor(Number(printingReceipt.total)).toLocaleString(undefined, { minimumFractionDigits: 0 })}{'\u00A0'}</span>
                                </div>
                            </div>

                            {/* Footer Message */}
                            <div className="text-center mt-4 border-t border-black pt-2">
                                <p style={{ fontSize: `${(config.fontSizeFooterText || 8) * 1.35}px` }} className="font-bold">{config.footerText || '=== ขอบคุณที่ใช้บริการ ==='}</p>
                            </div>
                        </div>
                    )
                })()}
            </div>

            {/* Hidden Sell Print Container (Delivery Note Copy) */}
            <div ref={sellPrintRef}>
                {printingSellRecord && (() => {
                    const isCupLump = printingSellRecord.rubberType === 'cup_lump' || printingSellRecord.rubber_type === 'cup_lump';
                    
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
                            rawWeight: 'น้ำหนักยางดิบ/รวมขาย',
                            rawWeightCupLump: 'น้ำหนักรวมขี้ยางพารา',
                            lossWeight: Number(printingSellRecord.lossWeight) > 0 ? 'ปรับปรุงสต๊อก (เพิ่ม)' : 'ส่วนต่าง/สูญเสีย',
                            netWeight: 'น้ำหนักสุทธิ',
                            drc: 'DRC',
                            dryWeight: 'แห้ง',
                            pricePerKg: 'ราคาขาย',
                            actualPrice: 'ราคาสุทธิ',
                            farmerSplit: 'เกษตรกร',
                            employeeSplit: 'ลูกจ้าง'
                        }
                    };

                    const labels = config.labels;
                    const headerTitle = config.headerTitle;
                    const rawWeightLabel = labels.rawWeight;

                    return (
                        <div className="print:opacity-100 opacity-100 p-4 sm:p-12 overflow-visible w-full max-w-4xl mx-auto font-sans" style={{ background: 'white' }}>
                            <div className="max-w-4xl mx-auto text-black font-sans border-2 border-black p-8">
                                {/* Top Note */}
                                {config.topNote && (
                                    <div style={{ fontSize: `${(config.fontSizeTopNote || 10) * 1.5}px` }} className="text-center mb-4 italic font-bold border-b border-black pb-2">
                                        {config.topNote}
                                    </div>
                                )}

                                <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
                                    <div className="flex space-x-4">
                                        {(config.showLogo !== false && (settings.logo_url || settings.logoUrl || settings.logo_Url)) && <img src={settings.logo_url || settings.logoUrl || settings.logo_Url} className="w-16 h-16 grayscale" />}
                                        <div>
                                            {config.showStoreName !== false && <h1 style={{ fontSize: `${(config.fontSizeStoreName || 12) * 2.5}px` }} className="font-black leading-tight">{settings.factory_name || settings.factoryName || 'ร้านรับซื้อน้ำยางพารา'}</h1>}
                                            {config.showAddress !== false && <p style={{ fontSize: `${(config.fontSizeAddress || 8) * 1.5}px` }} className="font-bold">{settings.address}</p>}
                                            {config.showPhone !== false && <p style={{ fontSize: `${(config.fontSizePhone || 8) * 1.5}px` }} className="font-bold">โทร: {settings.phone}</p>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {config.showBillType !== false && (
                                            <>
                                                <h1 style={{ fontSize: `${(config.fontSizeHeaderTitle || 10) * 3}px` }} className="font-black italic leading-none">{headerTitle}</h1>
                                                <p style={{ fontSize: `${(config.fontSizeFooterText || 8) * 1.2}px` }} className="font-black uppercase tracking-widest opacity-40">Duplicate Delivery Note</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    {config.showFarmerName !== false && (
                                        <div className="border border-black p-4 rounded-xl">
                                            <p style={{ fontSize: `${(config.fontSizeFarmerNameLabel || 9) * 1.5}px` }} className="font-black uppercase mb-1">สั่งจ่าย / ส่งถึง</p>
                                            <p style={{ fontSize: `${(config.fontSizeFarmerNameValue || 14) * 1.5}px` }} className="font-black">{printingSellRecord.buyerName}</p>
                                            <p className="text-sm font-bold opacity-60">รหัสโรงงาน: {printingSellRecord.factoryId || '-'}</p>
                                            <p className="text-sm font-bold">ทะเบียนรถ: {printingSellRecord.truckInfo || '-'}</p>
                                        </div>
                                    )}
                                    <div className="space-y-2 text-sm font-bold">
                                        {config.showBillId !== false && <div className="flex justify-between border-b border-black">
                                            <span style={{ fontSize: `${(config.fontSizeBillIdLabel || 7) * 1.5}px` }}>เลขที่บิล:</span>
                                            <span style={{ fontSize: `${(config.fontSizeBillIdValue || 7) * 1.5}px` }}>{printingSellRecord.id}</span>
                                        </div>}
                                        {config.showSelectedDate !== false && (
                                            <div className="flex justify-between border-b border-black">
                                                <span style={{ fontSize: `${(config.fontSizeDateTimeLabel || 7) * 1.5}px` }}>{(config.labels?.selectedDate || 'วันที่ทำรายการ')}:</span>
                                                <span style={{ fontSize: `${(config.fontSizeDateTimeValue || 7) * 1.5}px` }}>{formatSelectedDate(printingSellRecord, 'dd MMMM yyyy')}</span>
                                            </div>
                                        )}
                                        {config.showRecordingTime !== false && (
                                            <div className="flex justify-between border-b border-black">
                                                <span style={{ fontSize: `${(config.fontSizeDateTimeLabel || 7) * 1.5}px` }}>{(config.labels?.recordingTime || 'เวลาบันทึก')}:</span>
                                                <span style={{ fontSize: `${(config.fontSizeDateTimeValue || 7) * 1.5}px` }}>{formatRecordingDate(printingSellRecord, 'dd MMMM yyyy HH:mm')}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between border-b border-black opacity-30 italic"><span>วันที่พิมพ์ซ้ำ:</span><span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
                                    </div>
                                </div>

                                <table className="w-full border-collapse border-2 border-black mb-8 text-black">
                                    <thead className="bg-black text-white text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-2 border border-black">รายการ</th>
                                            <th style={{ fontSize: `${(config.fontSizeRawWeightLabel || 9) * 1.2}px` }} className="p-2 border border-black text-right">{rawWeightLabel}</th>
                                            <th style={{ fontSize: `${(config.fontSizeDrcLabel || 9) * 1.2}px` }} className="p-2 border border-black text-center">{labels.drc} (%)</th>
                                            <th style={{ fontSize: `${(config.fontSizeDryWeightLabel || 9) * 1.2}px` }} className="p-2 border border-black text-right">{labels.dryWeight} (กก.)</th>
                                            <th style={{ fontSize: `${(config.fontSizeActualPriceLabel || 10) * 1.2}px` }} className="p-2 border border-black text-right">{labels.pricePerKg || 'ราคา'} (บาท/กก.)</th>
                                            <th className="p-2 border border-black text-right">จำนวนเงิน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-bold">
                                        <tr>
                                            <td className="p-3 border border-black">{isCupLump ? 'ขี้ยางพารา (Cup Lump)' : 'น้ำยางสดคุณภาพสูง (Field Latex)'}</td>
                                            <td style={{ fontSize: `${(config.fontSizeRawWeightValue || 10) * 1.5}px` }} className="p-3 border border-black text-right">{Number(printingSellRecord.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                            <td style={{ fontSize: `${(config.fontSizeDrcValue || 10) * 1.5}px` }} className="p-3 border border-black text-center">{Number(printingSellRecord.drc || 0).toFixed(1)}%</td>
                                            <td style={{ fontSize: `${(config.fontSizeDryWeightValue || 11) * 1.5}px` }} className="p-3 border border-black text-right">{(Number(printingSellRecord.weight || 0) * Number(printingSellRecord.drc || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                            <td style={{ fontSize: `${(config.fontSizeActualPriceValue || 12) * 1.5}px` }} className="p-3 border border-black text-right">{Number(printingSellRecord.price_per_kg ?? printingSellRecord.pricePerKg ?? 0).toFixed(1)}</td>
                                            <td style={{ fontSize: `${(config.fontSizeTotalValue || 14) * 1.5}px` }} className="p-3 border border-black text-right">{Number(printingSellRecord.total || 0).toLocaleString()}</td>
                                        </tr>
                                        {Number(printingSellRecord.lossWeight) !== 0 && (
                                            <tr>
                                                <td className="p-3 border border-black italic">{labels.lossWeight}</td>
                                                <td className="p-3 border border-black text-right">{Number(printingSellRecord.lossWeight) > 0 ? '+' : '-'} {Math.abs(Number(printingSellRecord.lossWeight))} กก.</td>
                                                <td colSpan="4" className="border border-black"></td>
                                            </tr>
                                        )}
                                        {[...Array(2)].map((_, i) => <tr key={i}><td className="p-4 border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>)}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-100/50">
                                            <td colSpan="4" className="p-4 border border-black text-center italic text-sm">*** จำนวนเงินทั้งหมดรวมภาษีมูลค่าเพิ่มเรียบร้อยแล้ว ***</td>
                                            <td style={{ fontSize: `${(config.fontSizeTotalLabel || 10) * 1.5}px` }} className="p-4 border border-black text-right font-black">ยอดสุทธิ</td>
                                            <td className="p-4 border border-black text-right font-black">
                                                <span style={{ fontSize: `${(config.fontSizeTotalValue || 20) * 1.5}px` }}>฿ {Math.floor(printingSellRecord.total).toLocaleString()}</span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {/* Extra Message Area */}
                                {config.extraMessage && (
                                    <div style={{ fontSize: `${(config.fontSizeExtraMessage || 12) * 1.2}px` }} className="mb-8 p-4 bg-gray-50 border-2 border-dashed border-black rounded-xl text-center font-bold text-gray-600">
                                        {config.extraMessage}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-20 mt-20 text-center">
                                    <div><div className="border-b-2 border-black mb-1 h-10"></div><p className="font-black">ผู้ส่งของ</p></div>
                                    <div><div className="border-b-2 border-black mb-1 h-10"></div><p className="font-black">ผู้รับของ (โรงงาน)</p></div>
                                </div>
                                <div style={{ fontSize: `${(config.fontSizeFooterText || 8) * 1.2}px` }} className="text-center mt-12 font-black opacity-30 uppercase tracking-widest">
                                    {config.footerText}
                                </div>
                            </div>
                        </div>
                    )
                })()}
            </div>
        </div>
    );
};

export default HistoryPrintTemplates;
