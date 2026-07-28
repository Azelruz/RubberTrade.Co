import React from 'react';
import { X, Leaf, User, Package, ChevronDown, Coins, Eye } from 'lucide-react';
import { format, parseISO, addYears } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatReceiptDate, formatSelectedDate, formatRecordingDate } from '../../utils/dateUtils';

const HistoryESlipModal = ({ viewingEslip, handleCloseEslip, activeTab, settings, farmers, memberTypes, paperSlipConfig }) => {
    if (!viewingEslip) return null;

    const isCupLump = viewingEslip.rubberType === 'cup_lump' || viewingEslip.rubber_type === 'cup_lump';
    
    // Resolve configuration from Multi-Template / Multi-Platform schema
    const resolveConfig = () => {
        if (!paperSlipConfig || !paperSlipConfig.templates) return null;
        
        // Find assigned default template for the rubber type
        const templateId = isCupLump ? paperSlipConfig.defaultCupLumpId : paperSlipConfig.defaultLatexId;
        const template = paperSlipConfig.templates.find(t => t.id === templateId) || paperSlipConfig.templates[0];
        
        if (!template) return null;

        return {
            ...(template.common || {}),
            ...(template.eslip || {}), // Specific configuration for digital E-Slip
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
        headerTitle: isCupLump 
            ? (activeTab === 'buy' ? 'ใบรับซื้อขี้ยางพารา' : 'ใบส่งขี้ยางก้อน (Delivery Note)')
            : (activeTab === 'buy' ? 'ใบรับซื้อน้ำยางพารา' : 'ใบส่งสินค้า / DELIVERY NOTE'),
        labels: {
            rawWeight: activeTab === 'buy' ? (isCupLump ? 'น้ำหนักขี้ยาง' : 'น้ำหนักยางดิบ') : 'น้ำหนักยางดิบ/รวมขาย',
            bucketWeight: 'หักถังยาง',
            netWeight: 'น้ำหนักสุทธิ',
            drc: '% DRC',
            dryWeight: 'เนื้อยางแห้ง',
            basePrice: 'ราคากลาง',
            bonusDrc: 'โบนัส DRC',
            bonusFsc: 'โบนัส FSC',
            bonusMember: 'โบนัสสมาชิก',
            actualPrice: 'ราคาจริง (สุทธิ)',
            farmerSplit: 'เกษตรกร',
        }
    };

    const labels = config.labels;
    const headerTitle = config.headerTitle;
    const rawWeightLabel = labels.rawWeight;
    const farmerId = viewingEslip.farmerId || viewingEslip.farmer_id;
    const farmer = (farmers || []).find(f => f.id === farmerId);
    const fscId = viewingEslip.fscId || viewingEslip.fsc_id || farmer?.fscId || farmer?.fsc_id;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 no-print sm:p-4">
            <div className="bg-white rounded-[1.2rem] shadow-2xl max-w-[280px] w-full max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300">
                {/* Close Button */}
                <button 
                    onClick={handleCloseEslip}
                    className="absolute right-3 top-3 z-20 bg-black/10 hover:bg-black/20 text-white p-1 rounded-full transition-all hover:scale-110 active:scale-95"
                >
                    <X size={14} />
                </button>

                <div className="flex flex-col font-sans">
                    {/* Header: Dark Green (Branded) */}
                    <div className="bg-[#2d5a3f] py-4 px-3 text-center text-white relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                        <div className="absolute left-0 bottom-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                        
                        <div className="flex justify-center mb-2">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl overflow-hidden">
                                {(config.showLogo !== false && (settings.logo_url || settings.logoUrl || settings.logo_Url)) ? (
                                    <img src={settings.logo_url || settings.logoUrl || settings.logo_Url} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Leaf size={24} className="text-white opacity-80" />
                                )}
                            </div>
                        </div>
                        {config.showStoreName !== false && (
                            <h1 style={{ fontSize: `${(config.fontSizeStoreName || 14) * 1.7}px` }} className="font-black tracking-tight mb-0.5 leading-tight px-4 text-center">
                                {settings.factory_name || settings.factoryName || 'ร้านรับซื้อน้ำยางพารา'}
                            </h1>
                        )}
                        {(config.showAddress !== false || config.showPhone !== false) && (
                            <p style={{ fontSize: `${(config.fontSizePhone || 9)}px` }} className="opacity-70 font-bold mb-2 max-w-[280px] mx-auto text-center leading-tight">
                                {config.showAddress !== false && (settings.address || '-')} {config.showPhone !== false && `โทร: ${settings.phone || '-'}`}
                            </p>
                        )}
                        
                        {config.showBillType !== false && (
                            <div style={{ fontSize: `${config.fontSizeHeaderTitle || 10}px` }} className="inline-block px-3 py-1 bg-white/20 rounded-full border border-white/10 backdrop-blur-sm font-black tracking-[0.2em] leading-none uppercase">
                                {headerTitle}
                            </div>
                        )}

                        {config.topNote && (
                            <div style={{ fontSize: `${config.fontSizeTopNote || 10}px` }} className="mt-2 font-black bg-yellow-400 text-black px-3 py-0.5 rounded-full shadow-lg inline-block mx-auto animate-pulse">
                                {config.topNote}
                            </div>
                        )}
                    </div>

                    <div className="px-3 pt-3 pb-4 bg-white">
                        {/* Transaction ID & Date Bar */}
                        {(config.showBillId !== false || config.showSelectedDate !== false || config.showRecordingTime !== false) && (
                            <div className="flex flex-col mb-3 font-black text-gray-400 bg-gray-50/80 px-2 py-1.5 rounded-lg border border-gray-100 gap-0.5">
                                {config.showBillId !== false && (
                                    <div className="flex justify-between items-center border-b border-gray-100 pb-0.5 mb-0.5">
                                        <span style={{ fontSize: `${config.fontSizeBillIdLabel || config.fontSizeBillId || 7}px` }} className="opacity-40 font-bold small-caps">ID:</span>
                                        <span style={{ fontSize: `${config.fontSizeBillIdValue || config.fontSizeBillId || 7}px` }} className="text-gray-900 mono">{viewingEslip.id?.substring(0, 14)}</span>
                                    </div>
                                )}
                                {config.showSelectedDate !== false && (
                                    <div className="flex justify-between items-center">
                                        <span style={{ fontSize: `${(config.fontSizeDateTimeLabel || config.fontSizeDateTime || 7)}px` }} className="opacity-40">{(config.labels?.selectedDate || 'วันที่ทำรายการ')}:</span>
                                        <span style={{ fontSize: `${config.fontSizeDateTimeValue || config.fontSizeDateTime || 7}px` }} className="text-gray-900">{formatSelectedDate(viewingEslip, 'dd MMM yy')}</span>
                                    </div>
                                )}
                                {config.showRecordingTime !== false && (
                                    <div className="flex justify-between items-center">
                                        <span style={{ fontSize: `${(config.fontSizeDateTimeLabel || config.fontSizeDateTime || 7)}px` }} className="opacity-40">{(config.labels?.recordingTime || 'เวลาบันทึก')}:</span>
                                        <span style={{ fontSize: `${config.fontSizeDateTimeValue || config.fontSizeDateTime || 7}px` }} className="text-gray-900">{formatRecordingDate(viewingEslip, 'dd MMM yy HH:mm')}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Customer/Factory Info Card */}
                        <div className="mb-3">
                            <p style={{ fontSize: `${(config.fontSizeFarmerNameLabel || 9) - 2}px` }} className="font-black text-gray-400 mb-1 uppercase tracking-widest flex items-center">
                                <User size={8} className="mr-1 opacity-40" />
                                {activeTab === 'buy' ? 'ข้อมูลเกษตรกร' : 'ข้อมูลลูกค้า (โรงงาน)'}
                            </p>
                            <div className="flex items-center justify-between border-b border-dotted border-gray-100 pb-2.5">
                                <div>
                                    <h2 style={{ fontSize: `${config.fontSizeFarmerNameValue || config.fontSizeFarmerName || 18}px` }} className="font-black text-gray-800 leading-none mb-0.5">
                                        {activeTab === 'buy' ? (viewingEslip.farmerName || 'ลูกค้าทั่วไป') : (viewingEslip.buyerName || '-')}
                                    </h2>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        <div style={{ fontSize: `${(config.fontSizeSubData || 8) - 1}px` }} className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded font-bold text-gray-500">
                                            รหัส: {activeTab === 'buy' ? (viewingEslip.farmerId || '-') : (viewingEslip.factoryId || '-')}
                                        </div>
                                        {(activeTab === 'buy' && config.showFscCode !== false && fscId) && (
                                            <div style={{ fontSize: `${(config.fontSizeSubData || 8) - 1}px` }} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#fff9eb] text-[#d97706] border border-[#fde68a] rounded font-bold">
                                                <Leaf size={10} className="text-[#d97706]" />
                                                <span>{fscId}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                                    {activeTab === 'buy' ? <User size={20} className="text-gray-200" /> : <Package size={20} className="text-gray-200" />}
                                </div>
                            </div>
                        </div>

                        {/* Details Table */}
                        <div className="space-y-1 mb-3">
                            {config.showPurchaseDetailsHeader !== false && (
                                <p style={{ fontSize: `${(config.fontSizeLabel || 9) - 2}px` }} className="font-black text-gray-400 mb-1 uppercase tracking-widest">รายละเอียดพารามิเตอร์</p>
                            )}
                            
                            {config.showRawWeight !== false && (
                                <div className="flex justify-between items-center">
                                    <span style={{ fontSize: `${config.fontSizeRawWeightLabel || config.fontSizeLabel || 9}px` }} className="font-bold text-gray-400">{rawWeightLabel}</span>
                                    <span style={{ fontSize: `${config.fontSizeRawWeightValue || config.fontSizeValue || 11}px` }} className="font-black text-gray-900 decoration-rubber-100">{Number(viewingEslip.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] font-bold text-gray-400">กก.</span></span>
                                </div>
                            )}

                            {(config.showBucketWeight !== false && (Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)) > 0) && (
                                <div className="flex justify-between items-center">
                                    <span style={{ fontSize: `${config.fontSizeBucketWeightLabel || config.fontSizeSubData || 8}px` }} className="font-bold text-red-300 ml-2 flex items-center"><ChevronDown size={10} className="mr-1" /> {labels.bucketWeight}</span>
                                    <span style={{ fontSize: `${config.fontSizeBucketWeightValue || config.fontSizeSubData || 8}px` }} className="font-bold text-red-500">-{Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                            )}

                            {(config.showNetWeight !== false && (Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)) > 0) && (
                                <div className="flex justify-between items-center border-t border-dotted border-gray-100 pt-0.5 mt-0.5">
                                    <span style={{ fontSize: `${config.fontSizeNetWeightLabel || config.fontSizeLabel || 9}px` }} className="font-bold text-gray-600">{labels.netWeight}</span>
                                    <span style={{ fontSize: `${config.fontSizeNetWeightValue || config.fontSizeValue || 10}px` }} className="font-black text-gray-900">{(Number(viewingEslip.weight || 0) - Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] font-bold text-gray-400">กก.</span></span>
                                </div>
                            )}

                            {!isCupLump && config.showDrc !== false && (
                                <div className="flex justify-between items-center">
                                    <span style={{ fontSize: `${config.fontSizeDrcLabel || config.fontSizeLabel || 9}px` }} className="font-bold text-gray-400">{labels.drc}</span>
                                    <span style={{ fontSize: `${config.fontSizeDrcValue || config.fontSizeValue || 11}px` }} className="font-black text-gray-900">{Number(viewingEslip.drc || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                </div>
                            )}

                            {!isCupLump && config.showDryWeight !== false && (
                                <div className="flex justify-between items-center py-1 border-y border-gray-100 font-black bg-gray-50/50 px-2 rounded-lg my-0.5">
                                    <span style={{ fontSize: `${(config.fontSizeDryWeightLabel || config.fontSizeLabel || 9) - 1}px` }} className="text-gray-700">{labels.dryWeight}</span>
                                    <span style={{ fontSize: `${config.fontSizeDryWeightValue || config.fontSizeValue || 13}px` }} className="text-rubber-600">
                                        {Number(viewingEslip.dry_weight ?? viewingEslip.dry_rubber ?? viewingEslip.dryRubber ?? ((Number(viewingEslip.weight || 0) * Number(viewingEslip.drc || 0)) / 100)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px]">กก.</span>
                                    </span>
                                </div>
                            )}

                            {activeTab === 'buy' && (
                                <>
                                    {config.showBasePrice !== false && (
                                        <div className="flex justify-between items-center pt-0.5">
                                            <span style={{ fontSize: `${(config.fontSizeBasePriceLabel || config.fontSizeLabel || 9) - 1}px` }} className="font-bold text-gray-400">{labels.basePrice}</span>
                                            <span style={{ fontSize: `${(config.fontSizeBasePriceValue || config.fontSizeValue || 10) - 1}px` }} className="font-black text-gray-900 mono">
                                                ฿{Number(viewingEslip.base_price ?? viewingEslip.basePrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                            </span>
                                        </div>
                                    )}

                                    {config.showBonusDrc !== false && (
                                        <div className="flex justify-between items-center">
                                            <span style={{ fontSize: `${config.fontSizeBonusDrcLabel || config.fontSizeSubData || 8}px` }} className="font-bold text-gray-400">{labels.bonusDrc}</span>
                                            <span style={{ fontSize: `${config.fontSizeBonusDrcValue || config.fontSizeSubData || 8}px` }} className="font-bold text-green-600 mono">
                                                +฿{Number(viewingEslip.bonus_drc ?? viewingEslip.bonusDrc ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                            </span>
                                        </div>
                                    )}

                                    {config.showBonusFsc !== false && (Number(viewingEslip.fscBonus ?? viewingEslip.fsc_bonus ?? 0)) > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span style={{ fontSize: `${config.fontSizeBonusFscLabel || config.fontSizeSubData || 8}px` }} className="font-bold text-gray-400">{labels.bonusFsc}</span>
                                            <span style={{ fontSize: `${config.fontSizeBonusFscValue || config.fontSizeSubData || 8}px` }} className="font-bold text-amber-600 mono">
                                                +฿{Number(viewingEslip.fscBonus ?? viewingEslip.fsc_bonus ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                            </span>
                                        </div>
                                    )}
                                    {config.showBonusMember !== false && Number(viewingEslip.bonusMemberType ?? viewingEslip.bonus_member_type ?? (farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id)).memberTypeId)?.bonus : 0)) > 0 && (
                                        <div className="flex justify-between items-center px-1 py-0.5 bg-rubber-50 rounded">
                                            <span style={{ fontSize: `${config.fontSizeBonusMemberLabel || config.fontSizeSubData || 8}px` }} className="font-black text-rubber-700">{memberTypes.find(mt => mt.id === (viewingEslip.memberTypeId || viewingEslip.member_type_id || farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id))?.memberTypeId))?.name || labels.bonusMember}</span>
                                            <span style={{ fontSize: `${config.fontSizeBonusMemberValue || config.fontSizeSubData || 8}px` }} className="font-black text-rubber-700 mono">
                                                +฿{Number(viewingEslip.bonusMemberType ?? viewingEslip.bonus_member_type ?? (viewingEslip.farmerId && farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id)).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] font-black italic">/กก.</span>
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

                            {activeTab !== 'buy' || config.showActualPrice !== false && (
                                <div className="flex justify-between items-center pt-1 border-t border-dotted border-gray-200 mt-0.5 font-black">
                                    <span style={{ fontSize: `${config.fontSizeActualPriceLabel || config.fontSizeLabel || 9}px` }} className="text-gray-800">{labels.actualPrice}</span>
                                    <span style={{ fontSize: `${config.fontSizeActualPriceValue || config.fontSizeValue || 10}px` }} className="font-black text-gray-900 mono">
                                        ฿{Number(activeTab === 'buy' 
                                            ? (viewingEslip.actual_price ?? viewingEslip.actualPrice ?? viewingEslip.price_per_kg ?? viewingEslip.pricePerKg ?? 0)
                                            : (viewingEslip.price_per_kg ?? viewingEslip.pricePerKg ?? 0)
                                        ).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Extra Message Area */}
                        {config.extraMessage && (
                            <div style={{ fontSize: `${config.fontSizeExtraMessage || 7}px` }} className="mb-3 p-2 bg-gray-50 border border-gray-100 rounded-lg text-gray-500 italic leading-snug text-center">
                                {config.extraMessage}
                            </div>
                        )}

                        {/* Footer Final Total */}
                        {activeTab === 'buy' && config.showSplits !== false && (
                            <div className="bg-gray-50 rounded-[1.2rem] p-3 border border-gray-100 space-y-2 mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1 bg-rubber-100 rounded-md"><Coins size={12} className="text-rubber-600" /></div>
                                    <p style={{ fontSize: `${config.fontSizeLabel - 3 || 6}px` }} className="font-black text-rubber-700 uppercase tracking-widest">การจัดสรรเงิน</p>
                                </div>
                                
                                <div className="space-y-1 pt-1 border-t border-dotted border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <span style={{ fontSize: `${config.fontSizeFarmerSplitLabel || config.fontSizeSplit || 9}px` }} className="font-bold text-orange-400 flex items-center"><Coins size={12} className="mr-1.5" /> {labels.farmerSplit} ({(100 - Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0))}%)</span>
                                        <span style={{ fontSize: `${config.fontSizeFarmerSplitValue || config.fontSizeSplit || 9}px` }} className="font-black text-[#5ba2d7] mono">฿{Math.floor(Number(viewingEslip.total || 0) * (100 - Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                    </div>
                                    
                                    {Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0) > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span style={{ fontSize: `${config.fontSizeEmployeeSplitLabel || config.fontSizeSplit || 9}px` }} className="font-bold text-[#a855f7] flex items-center"><User size={12} className="mr-1.5" /> {labels.employeeSplit} ({Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0)}%)</span>
                                            <span style={{ fontSize: `${config.fontSizeEmployeeSplitValue || config.fontSizeSplit || 9}px` }} className="font-black text-[#a855f7] mono">฿{Math.floor(Number(viewingEslip.total || 0) * Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-[#2d5a3f] rounded-xl p-3 flex justify-between items-center text-white shadow-xl shadow-green-900/30 relative overflow-hidden group/total mb-1.5">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover/total:scale-150 duration-700"></div>
                            <span style={{ fontSize: `${config.fontSizeTotalLabel || 10}px` }} className="font-black uppercase tracking-widest">{activeTab === 'buy' ? 'ยอดรวมจ่าย' : 'ยอดสุทธิรวม'}</span>
                            <div className="text-right relative z-10">
                                <span style={{ fontSize: `${config.fontSizeTotalValue || 24}px` }} className="font-black leading-none tracking-tighter tabular-nums drop-shadow-md">
                                    ฿{Number(viewingEslip.total || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                </span>
                                <p style={{ fontSize: `${config.fontSizeFooterText || 7}px` }} className="opacity-40 font-bold">{config.footerText}</p>
                            </div>
                        </div>

                        {(viewingEslip.receipt_url || viewingEslip.receiptUrl) && (
                            <div className="mt-8 text-center">
                                <a 
                                    href={viewingEslip.receipt_url || viewingEslip.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-xl text-xs font-black text-gray-400 hover:text-rubber-600 hover:bg-rubber-50 transition-all border border-gray-100"
                                >
                                    <Eye size={14} className="mr-2" />
                                    OPEN ORIGINAL CLOUD IMAGE
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HistoryESlipModal;
