import React from 'react';
import { Printer, X, Leaf } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatReceiptDate, formatSelectedDate, formatRecordingDate } from '../../utils/dateUtils';
import { truncateOneDecimal, calculateDrcBonus } from '../../utils/calculations';

const BuyPaperReceipt = ({ printingReceipt, printRef, setPrintingReceipt, settings, drcBonuses, farmers, memberTypes, paperSlipConfig, selectedTemplateId }) => {
    if (!printingReceipt) return null;

    const isCupLump = printingReceipt.rubberType === 'cup_lump' || printingReceipt.rubber_type === 'cup_lump';
    
    // Resolve configuration from Multi-Template / Multi-Platform schema
    const resolveConfig = () => {
        if (!paperSlipConfig || !paperSlipConfig.templates) return null;
        
        // Use user-selected template ID if provided, otherwise find assigned default for the rubber type
        const templateId = selectedTemplateId || (isCupLump ? paperSlipConfig.defaultCupLumpId : paperSlipConfig.defaultLatexId);
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
        showPurchaseDetailsHeader: true,
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
    const farmer = farmers.find(f => f.id === printingReceipt.farmerId);
    const fscId = printingReceipt.fscId || printingReceipt.fsc_id || farmer?.fscId || farmer?.fsc_id;
    
    let finalFscBonus = 0;
    if (printingReceipt.fscBonus !== undefined) {
        finalFscBonus = Number(printingReceipt.fscBonus);
    } else {
        const derived = Number(printingReceipt.basePrice) > 0 
            ? Math.max(0, Math.round((Number(printingReceipt.actualPrice || printingReceipt.pricePerKg) - Number(printingReceipt.basePrice) - Number(printingReceipt.bonusDrc || 0) - Number(printingReceipt.memberTypeId ? (memberTypes.find(mt => mt.id === printingReceipt.memberTypeId)?.bonus || 0) : (printingReceipt.bonusMemberType || 0))) * 10) / 10)
            : (fscId ? (settings.fscBonus || 1) : 0);
        finalFscBonus = derived;
    }

    return (
        <div style={{ display: 'none' }}>
            <div ref={printRef}>
                <div className="receipt-content text-black text-[16px] leading-snug p-1 pr-[5px] font-sans" style={{ width: '100%', maxWidth: '100%', margin: '0', paddingRight: '5px', background: 'white', boxSizing: 'border-box' }}>
                    {/* Control Bar - Hidden on Print */}
                    <div className="w-full flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200 no-print sticky top-0 z-20">
                        <button 
                            onClick={() => setPrintingReceipt(null)}
                            className="flex items-center space-x-2 text-gray-600 font-bold px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                            <span>ปิด</span>
                        </button>
                        <div className="flex space-x-3">
                            <button 
                                onClick={() => window.print()}
                                className="flex items-center space-x-2 bg-rubber-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-rubber-700 shadow-md transition-all active:scale-95"
                            >
                                <Printer size={20} />
                                <span>พิมพ์บิล</span>
                            </button>
                        </div>
                    </div>

                    <div className="receipt-content-inner">
                        {/* Top Note */}
                        {config.topNote && (
                            <div style={{ fontSize: `${(config.fontSizeTopNote || 7) * 2}px` }} className="text-center italic border-b border-black mb-1 pb-1">
                                {config.topNote}
                            </div>
                        )}

                        {/* Header - High Contrast for Thermal */}
                        <div className="text-center mb-4 border-b-2 border-black pb-2">
                            {(config.showLogo !== false && (settings.logoUrl || settings.logo_url || settings.logo_Url)) && (
                                <div className="h-16 flex items-center justify-center mb-2">
                                    <img src={settings.logoUrl || settings.logo_url || settings.logo_Url} alt="Logo" className="h-16 mx-auto object-contain" style={{ filter: 'grayscale(1) contrast(2)' }} />
                                </div>
                            )}
                            {config.showStoreName !== false && <h1 style={{ fontSize: `${(config.fontSizeStoreName || 12) * 2}px` }} className="font-bold leading-tight">{settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา'}</h1>}
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

                        {/* Customer Info Section */}
                        <div className="mb-4">
                            {(config.showBillId !== false || config.showSelectedDate !== false || config.showRecordingTime !== false) && (
                                <div className="mb-2 font-mono border-b border-black pb-1">
                                    {config.showBillId !== false && (
                                        <div className="flex justify-between" style={{ fontSize: `${(config.fontSizeBillIdValue || config.fontSizeBillId || 7) * 2}px` }}>
                                            <span style={{ fontSize: `${(config.fontSizeBillIdLabel || config.fontSizeBillId || 7) * 2}px` }}>เลขที่:</span>
                                            <span className="font-bold">{printingReceipt.id || '-'}</span>
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
                            {config.showFarmerName !== false && (
                                <div className="mb-2">
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
                        </div>

                        {/* Purchase Details Section */}
                        <div className="mb-4">
                            {config.showPurchaseDetailsHeader !== false && (
                                <div className="text-center text-[14px] font-bold border-y border-black py-0.5 mb-2 uppercase">=== รายละเอียดรับซื้อ ===</div>
                            )}
                            
                            {config.showRawWeight !== false && (
                                <div style={{ fontSize: `${(config.fontSizeRawWeightLabel || config.fontSizeLabel || 9) * 2}px` }} className="flex justify-between items-center mt-2">
                                    <span>{rawWeightLabel}</span>
                                    <span style={{ fontSize: `${(config.fontSizeRawWeightValue || config.fontSizeValue || 10) * 2}px` }} className="font-bold text-right ml-auto">{Number(printingReceipt.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                            )}
                            {(config.showBucketWeight !== false && Number(printingReceipt.bucketWeight || printingReceipt.bucket_weight || 0) > 0) && (
                                <div style={{ fontSize: `${(config.fontSizeBucketWeightLabel || config.fontSizeSubData || 8) * 2}px` }} className="flex justify-between items-center text-black italic">
                                    <span>{labels.bucketWeight}</span>
                                    <span style={{ fontSize: `${(config.fontSizeBucketWeightValue || config.fontSizeSubData || 8) * 2}px` }} className="text-right ml-auto">-{Number(printingReceipt.bucketWeight || printingReceipt.bucket_weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                            )}
                            {config.showNetWeight !== false && (
                                <div style={{ fontSize: `${(config.fontSizeNetWeightLabel || config.fontSizeLabel || 9) * 2}px` }} className="flex justify-between items-center">
                                    <span>{labels.netWeight}</span>
                                    <span style={{ fontSize: `${(config.fontSizeNetWeightValue || config.fontSizeValue || 11) * 2}px` }} className="font-bold text-right ml-auto border-b-2 border-black">{(Number(printingReceipt.weight || 0) - Number(printingReceipt.bucketWeight || printingReceipt.bucket_weight || 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                            )}
                            
                            {!isCupLump && (
                                <>
                                    {config.showDrc !== false && (
                                        <div style={{ fontSize: `${(config.fontSizeDrcLabel || config.fontSizeLabel || 9) * 2}px` }} className="flex justify-between items-center mt-1">
                                            <span>{labels.drc}</span>
                                            <span style={{ fontSize: `${(config.fontSizeDrcValue || config.fontSizeValue || 10) * 2}px` }} className="font-bold text-right ml-auto border-b border-black">{Number(printingReceipt.drc).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                        </div>
                                    )}
                                    {config.showDryWeight !== false && (
                                        <div style={{ fontSize: `${(config.fontSizeDryWeightLabel || config.fontSizeLabel || 9) * 2}px` }} className="flex justify-between items-center mt-1">
                                            <span>{labels.dryWeight}</span>
                                            <span style={{ fontSize: `${(config.fontSizeDryWeightValue || config.fontSizeValue || 11) * 2}px` }} className="font-bold text-right ml-auto border-b border-black">{Number(printingReceipt.dryWeight || printingReceipt.dryRubber || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            <div className="my-2 border-t border-dashed border-black"></div>

                            {config.showBasePrice !== false && (
                                <div style={{ fontSize: `${(config.fontSizeBasePriceLabel || config.fontSizeLabel || 9) * 2}px` }} className="flex justify-between items-center">
                                    <span>{labels.basePrice}</span>
                                    <span style={{ fontSize: `${(config.fontSizeBasePriceValue || config.fontSizeValue || 10) * 2}px` }} className="text-right ml-auto">{Number(printingReceipt.basePrice || (Number(printingReceipt.actualPrice || printingReceipt.pricePerKg) - (printingReceipt.bonusDrc !== undefined ? Number(printingReceipt.bonusDrc) : calculateDrcBonus(printingReceipt.drc, drcBonuses)))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                </div>
                            )}
                            
                            {!isCupLump && (
                                <>
                                    {config.showBonusDrc !== false && (
                                        <div style={{ fontSize: `${(config.fontSizeBonusDrcLabel || config.fontSizeSubData || 8) * 2}px` }} className="flex justify-between items-center font-medium">
                                            <span>{labels.bonusDrc}</span>
                                            <span style={{ fontSize: `${(config.fontSizeBonusDrcValue || config.fontSizeSubData || 8) * 2}px` }} className="text-right ml-auto">+{Number(printingReceipt.bonusDrc !== undefined ? printingReceipt.bonusDrc : calculateDrcBonus(printingReceipt.drc, drcBonuses)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                        </div>
                                    )}
                                    {(config.showBonusFsc !== false && finalFscBonus > 0) && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${(config.fontSizeBonusFscLabel || config.fontSizeSubData || 8) * 2}px`, fontFamily: 'monospace' }}>
                                            <span>+ {labels.bonusFsc}</span>
                                            <span style={{ fontSize: `${(config.fontSizeBonusFscValue || config.fontSizeSubData || 8) * 2}px` }} className="text-right ml-auto">+{finalFscBonus.toLocaleString(undefined, { minimumFractionDigits: 0 })}/กก.</span>
                                        </div>
                                    )}
                                    {(config.showBonusMember !== false && Number(printingReceipt.memberTypeId || farmers.find(f => f.id === printingReceipt.farmerId)?.memberTypeId) > 0) && (
                                        <div style={{ fontSize: `${(config.fontSizeBonusMemberLabel || config.fontSizeSubData || 8) * 2}px` }} className="flex justify-between items-center font-black bg-gray-100 px-1 rounded">
                                            <span>{memberTypes.find(mt => mt.id === (printingReceipt.memberTypeId || farmers.find(f => f.id === printingReceipt.farmerId)?.memberTypeId))?.name || labels.bonusMember}</span>
                                            <span style={{ fontSize: `${(config.fontSizeBonusMemberValue || config.fontSizeSubData || 8) * 2}px` }} className="text-right ml-auto">+{Number(printingReceipt.bonusMemberType || (farmers.find(f => f.id === printingReceipt.farmerId)?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === printingReceipt.farmerId).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                        </div>
                                    )}
                                </>
                            )}
                            {config.showActualPrice !== false && (
                                <div style={{ fontSize: `${(config.fontSizeActualPriceLabel || config.fontSizeLabel || 10) * 2}px` }} className="flex justify-between items-center font-bold border-t-2 border-black pt-2 mt-2">
                                    <span>{labels.actualPrice}</span>
                                    <span style={{ fontSize: `${(config.fontSizeActualPriceValue || config.fontSizeValue || 12) * 2}px` }} className="font-bold text-right ml-auto border-b-2 border-black">{truncateOneDecimal(Number(printingReceipt.actualPrice || printingReceipt.pricePerKg)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                </div>
                            )}
                        </div>

                        {/* Splits */}
                        {(!isCupLump && config.showSplits !== false) && (
                            <div className="py-2 border-t-2 border-black my-2 space-y-2">
                                <div style={{ fontSize: `${(config.fontSizeFarmerSplitLabel || config.fontSizeSplit || 9) * 2}px` }} className="flex justify-between items-center font-bold">
                                    <span>{labels.farmerSplit} ({100 - (Number(printingReceipt.empPct) || 0)}%)</span>
                                    <span style={{ fontSize: `${(config.fontSizeFarmerSplitValue || config.fontSizeSplit + 2 || 11) * 2}px`, paddingRight: '5px' }} className="font-bold text-right ml-auto pr-1">
                                        {Math.floor(Number(printingReceipt.farmerTotal)).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                        {(Array.isArray(printingReceipt.loanDeductions) && printingReceipt.loanDeductions.some(d => d.borrowerType === 'farmer')) ? '*' : ''}
                                        {'\u00A0'}
                                    </span>
                                </div>
                                {Number(printingReceipt.empPct) > 0 && (
                                    <div style={{ fontSize: `${(config.fontSizeEmployeeSplitLabel || config.fontSizeSplit - 1 || 8) * 2}px` }} className="flex justify-between items-center">
                                        <span>{labels.employeeSplit} ({Number(printingReceipt.empPct)}%)</span>
                                        <span style={{ fontSize: `${(config.fontSizeEmployeeSplitValue || config.fontSizeSplit || 9) * 2}px`, paddingRight: '5px' }} className="font-bold text-right ml-auto pr-1">
                                            {Math.floor(Number(printingReceipt.employeeTotal)).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                            {(Array.isArray(printingReceipt.loanDeductions) && printingReceipt.loanDeductions.some(d => d.borrowerType === 'employee')) ? '*' : ''}
                                            {'\u00A0'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Extra Message Area */}
                        {config.extraMessage && (
                            <div style={{ fontSize: `${(config.fontSizeExtraMessage || 7) * 2}px` }} className="mt-2 p-2 border border-black italic leading-tight">
                                {config.extraMessage}
                            </div>
                        )}

                        {/* Total Footer */}
                        <div className="border-t-4 border-double border-black py-3 mt-2">
                            <div className="flex justify-between items-center">
                                <span style={{ fontSize: `${(config.fontSizeTotalLabel || 10) * 2}px` }} className="font-bold uppercase">ยอดรวมสุทธิ</span>
                                <span style={{ fontSize: `${(config.fontSizeTotalValue || 16) * 2}px`, paddingRight: '5px' }} className="font-bold text-right ml-auto pr-1">
                                    {Math.floor(Number(printingReceipt.total)).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                    {(Array.isArray(printingReceipt.loanDeductions) && printingReceipt.loanDeductions.length > 0) ? '*' : ''}
                                    {'\u00A0'}
                                </span>
                            </div>
                        </div>

                        {/* Footer Message */}
                        <div className="text-center mt-4 border-t border-black pt-2">
                            <p style={{ fontSize: `${(config.fontSizeFooterText || 8) * 2}px` }} className="font-bold">{config.footerText || '=== ขอบคุณที่ใช้บริการ ==='}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuyPaperReceipt;
