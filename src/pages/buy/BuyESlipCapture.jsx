import React from 'react';
import { Leaf, User, Coins } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatReceiptDate, formatSelectedDate, formatRecordingDate } from '../../utils/dateUtils';

const BuyESlipCapture = ({ eslipRef, settings, watch, watchRubberType, printingReceipt, editingRecord, selectedFarmer, farmers, memberTypes, currentEmpPct, calculateDryRubber, calculateTotal, paperSlipConfig, selectedTemplateId }) => {
    const isCupLump = watchRubberType === 'cup_lump' || printingReceipt?.rubberType === 'cup_lump';
    
    // Resolve configuration from Multi-Template / Multi-Platform schema
    const resolveConfig = () => {
        if (!paperSlipConfig || !paperSlipConfig.templates) return null;
        
        // Use user-selected template ID if provided, otherwise find assigned default for the rubber type
        const templateId = selectedTemplateId || (isCupLump ? paperSlipConfig.defaultCupLumpId : paperSlipConfig.defaultLatexId);
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
    const farmerId = printingReceipt?.farmerId || watch('farmerId');
    const farmer = farmers.find(f => f.id === farmerId);
    const fscId = printingReceipt?.fscId || printingReceipt?.fsc_id || farmer?.fscId || farmer?.fsc_id;

    let finalFscBonus = 0;
    if (printingReceipt) {
        if (printingReceipt.fscBonus !== undefined) {
            finalFscBonus = Number(printingReceipt.fscBonus);
        } else {
            const derived = Number(printingReceipt.basePrice) > 0 
                ? Math.max(0, Math.round((Number(printingReceipt.actualPrice || printingReceipt.pricePerKg) - Number(printingReceipt.basePrice) - Number(printingReceipt.bonusDrc || 0) - Number(printingReceipt.memberTypeId ? (memberTypes?.find(mt => mt.id === printingReceipt.memberTypeId)?.bonus || 0) : (printingReceipt.bonusMemberType || 0))) * 10) / 10)
                : (fscId ? (settings.fscBonus || 1) : 0);
            finalFscBonus = derived;
        }
    } else {
        finalFscBonus = (fscId && watch('enableFsc') !== false) ? (Number(settings.fscBonus) || 1) : 0;
    }

    return (
        <div style={{ display: 'none', position: 'fixed', left: '-9999px', top: '0', zIndex: 9999 }} ref={eslipRef}>
            <div className="eslip-capture w-[500px] bg-white flex flex-col font-sans">
                {/* Header: Dark Green */}
                <div className="bg-[#2d5a3f] py-6 px-8 text-center text-white relative">
                    <div className="flex justify-center mb-3">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md overflow-hidden">
                            {(config.showLogo !== false && (settings.logoUrl || settings.logo_url || settings.logo_Url)) ? (
                                <img src={settings.logoUrl || settings.logo_url || settings.logo_Url} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <Leaf size={36} className="text-white" />
                            )}
                        </div>
                    </div>
                    {config.showStoreName !== false && (
                        <h1 style={{ fontSize: `${(config.fontSizeStoreName || 14) * 3}px` }} className="font-black tracking-tight mb-1 leading-tight">
                            {settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา'}
                        </h1>
                    )}
                    {(config.showAddress !== false || config.showPhone !== false) && (
                        <p style={{ fontSize: `${(config.fontSizeAddress || 8) * 2}px` }} className="opacity-70 font-medium mb-4">
                            {config.showAddress !== false && (settings.address || '-')} {config.showPhone !== false && `โทร: ${settings.phone || '-'}`}
                        </p>
                    )}

                        <div style={{ fontSize: `${(config.fontSizeHeader || 10) * 1.8}px` }} className="inline-block px-6 py-1.5 bg-white/20 rounded-full border border-white/10 backdrop-blur-sm font-black tracking-widest leading-none">
                            {headerTitle}
                        </div>

                    {config.topNote && (
                        <div className="mt-2 px-3 py-1 bg-yellow-400 text-black text-[14px] font-black rounded-full shadow-lg inline-block mx-auto">
                            {config.topNote}
                        </div>
                    )}
                </div>

                <div className="px-8 pt-6 pb-8 bg-white">
                    {/* Transaction ID & Date Bar */}
                        <div className="flex flex-col mb-4 text-[18px] font-black text-gray-500 bg-gray-100/80 px-4 py-2 rounded-lg gap-1">
                            {config.showBillId !== false && (
                                <div className="flex justify-between border-b border-gray-200/50 pb-1">
                                    <span>เลขที่:</span>
                                    <span className="text-gray-700">{(editingRecord?.id || printingReceipt?.id || ('buy_' + Date.now())).substring(0, 14)}</span>
                                </div>
                            )}
                            {config.showSelectedDate !== false && (
                                <div className="flex justify-between">
                                    <span>{(config.labels?.selectedDate || 'วันที่ทำรายการ')}:</span>
                                    <span className="text-gray-700">{formatSelectedDate(printingReceipt, 'dd MMM yy')}</span>
                                </div>
                            )}
                            {config.showRecordingTime !== false && (
                                <div className="flex justify-between">
                                    <span>{(config.labels?.recordingTime || 'เวลาบันทึก')}:</span>
                                    <span className="text-gray-700">{formatRecordingDate(printingReceipt, 'dd MMM yy HH:mm')}</span>
                                </div>
                            )}
                        </div>

                    {/* Customer Info Card */}
                    {config.showFarmerName !== false && (
                        <div className="mb-6">
                            <p style={{ fontSize: `${(config.fontSizeHeader || 10) * 1.8}px` }} className="font-bold text-gray-400 mb-1">ข้อมูลลูกค้า</p>
                            <div className="flex items-center justify-between border-b-2 border-dotted border-gray-100 pb-4">
                                <div>
                                    <h2 style={{ fontSize: `${(config.fontSizeStoreName || 14) * 3}px` }} className="font-black text-gray-800 leading-tight">
                                        {printingReceipt?.farmerName || farmers.find(f => f.id === watch('farmerId'))?.name || 'ลูกค้าทั่วไป'}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-[20px] font-bold text-gray-400">
                                            รหัส: {printingReceipt?.farmerId || watch('farmerId') || '-'}
                                        </p>
                                        {(config.showFscCode !== false && fscId) && (
                                            <div className="bg-[#fff9eb] text-[#d97706] border border-[#fde68a] px-2.5 py-0.5 rounded-lg font-mono text-[14px] font-black flex items-center gap-1 select-none">
                                                <Leaf size={12} className="text-[#d97706]" />
                                                <span>{fscId}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-2xl">
                                    <User size={40} className="text-gray-400" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Details Table */}
                    <div className="space-y-3 mb-6">
                        {config.showPurchaseDetailsHeader !== false && (
                            <p className="text-[18px] font-bold text-gray-400 mb-2">รายละเอียดการรับซื้อ</p>
                        )}

                            <div style={{ fontSize: `${(config.fontSizeBody || 10) * 2.4}px` }} className="flex justify-between items-center">
                                <span className="font-bold text-gray-600">{rawWeightLabel}</span>
                                <span className="font-black text-gray-900">{(Number(watch('weight')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>

                        {(config.showBucketWeight !== false && Number(watch('bucketWeight')) > 0) && (
                            <div style={{ fontSize: `${(config.fontSizeBody || 10) * 2.4}px` }} className="flex justify-between items-center">
                                <span className="font-bold text-red-500 ml-4 italic">- {labels.bucketWeight}</span>
                                <span className="font-bold text-red-500">-{Number(watch('bucketWeight')).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                        )}

                        {(config.showNetWeight !== false && Number(watch('bucketWeight')) > 0) && (
                            <div style={{ fontSize: `${(config.fontSizeBody || 10) * 2.6}px` }} className="flex justify-between items-center py-1 border-t border-dotted border-gray-50">
                                <span className="font-bold text-gray-700">{labels.netWeight}</span>
                                <span className="font-black text-gray-900">{(Number(watch('weight')) - Number(watch('bucketWeight'))).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                        )}

                        {!isCupLump && (
                            <>
                                {config.showDrc !== false && (
                                    <div className="flex justify-between items-center text-[24px]">
                                        <span className="font-bold text-gray-600">{labels.drc}</span>
                                        <span className="font-black text-gray-900">{(Number(watch('drc')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                    </div>
                                )}

                                {config.showDryWeight !== false && (
                                    <div className="flex justify-between items-center text-[30px] py-3 border-y-2 border-gray-100 font-black bg-gray-50/50 px-2 rounded-lg">
                                        <span className="text-gray-700">{labels.dryWeight}</span>
                                        <span className="text-gray-900">{calculateDryRubber().toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                    </div>
                                )}
                            </>
                        )}

                        {config.showBasePrice !== false && (
                            <div className="flex justify-between items-center text-[24px] pt-2">
                                <span className="font-bold text-gray-600">{labels.basePrice}</span>
                                <span className="font-bold text-gray-900 font-mono">฿{(Number(printingReceipt?.basePrice ?? watch('basePrice')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>
                        )}

                        {!isCupLump && (
                            <>
                                {config.showBonusDrc !== false && (
                                    <div className="flex justify-between items-center text-[24px]">
                                        <span className="font-bold text-gray-600">{labels.bonusDrc}</span>
                                        <span className="font-bold text-green-600 font-mono">+฿{(Number(printingReceipt?.bonusDrc ?? watch('bonusDrc')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                    </div>
                                )}
                                {config.showBonusFsc !== false && finalFscBonus > 0 && (
                                    <div className="flex justify-between items-center text-[24px] text-amber-600">
                                        <span className="font-bold">{labels.bonusFsc}</span>
                                        <span className="font-bold font-mono">+฿{finalFscBonus.toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                    </div>
                                )}

                                {config.showBonusMember !== false && (Number(printingReceipt?.bonusMemberType ?? (farmers.find(f => f.id === watch('farmerId'))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === watch('farmerId')).memberTypeId)?.bonus : 0))) > 0 && (
                                    <div className="flex justify-between items-center text-[24px] text-rubber-700 bg-rubber-50 px-2 rounded-lg">
                                        <span className="font-black">{memberTypes.find(mt => mt.id === (printingReceipt?.memberTypeId || farmers.find(f => f.id === watch('farmerId'))?.memberTypeId))?.name || labels.bonusMember}</span>
                                        <span className="font-black font-mono">+฿{Number(printingReceipt?.bonusMemberType ?? (farmers.find(f => f.id === watch('farmerId'))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === watch('farmerId')).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                    </div>
                                )}
                            </>
                        )}

                        {config.showActualPrice !== false && (
                            <div style={{ fontSize: `${(config.fontSizeBody || 10) * 2.8}px` }} className="flex justify-between items-center pt-2 border-t border-dotted border-gray-100 mt-2 font-black">
                                <span className="text-gray-800">{labels.actualPrice}</span>
                                <span className="text-gray-900 font-mono">฿{(Number(printingReceipt?.actualPrice ?? (Number(watch('basePrice') || 0) + Number(watch('bonusDrc') || 0) + ((watch('enableFsc') !== false && selectedFarmer?.fscId) ? (Number(settings.fscBonus) || 1) : 0) + (selectedFarmer?.memberTypeId ? (Number(memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId)?.bonus) || 0) : 0))) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>
                        )}
                    </div>

                    {/* Shares / Splits */}
                    {(!isCupLump && config.showSplits !== false) && (
                        <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 space-y-6">
                            <div className="flex items-center space-x-4 mb-2">
                                <div className="p-2 bg-rubber-100 rounded-xl"><Coins size={24} className="text-rubber-600" /></div>
                                <p className="text-[14px] font-black text-rubber-700 uppercase tracking-widest">การจัดสรรเงิน</p>
                            </div>

                            {(() => {
                                // Deductions checking
                                let hasFarmerDed = false;
                                let hasEmployeeDed = false;
                                let farmerNet = 0;
                                let employeeNet = 0;

                                if (printingReceipt) {
                                    farmerNet = Number(printingReceipt.farmerTotal || 0);
                                    employeeNet = Number(printingReceipt.employeeTotal || 0);
                                    hasFarmerDed = Array.isArray(printingReceipt.loanDeductions) && printingReceipt.loanDeductions.some(d => d.borrowerType === 'farmer');
                                    hasEmployeeDed = Array.isArray(printingReceipt.loanDeductions) && printingReceipt.loanDeductions.some(d => d.borrowerType === 'employee');
                                } else {
                                    const fDed = parseFloat(watch('farmerDeduction')) || 0;
                                    const eDed = parseFloat(watch('employeeDeduction')) || 0;
                                    const gross = calculateTotal() || 0;
                                    const fGross = (gross * (100 - currentEmpPct)) / 100;
                                    const eGross = (gross * currentEmpPct) / 100;
                                    farmerNet = Math.floor(fGross - fDed);
                                    employeeNet = Math.floor(eGross - eDed);
                                    hasFarmerDed = fDed > 0;
                                    hasEmployeeDed = eDed > 0;
                                }

                                return (
                                    <div className="space-y-4 pt-6 mt-6 border-t border-dotted border-gray-100">
                                        <div className="flex justify-between items-center text-[22px]">
                                            <div className="flex items-center space-x-3">
                                                <Coins size={32} className="text-orange-400" />
                                                <span className="font-bold text-orange-400">{labels.farmerSplit} ({(100 - currentEmpPct)}%)</span>
                                            </div>
                                            <span className="font-black text-[#5ba2d7] font-mono italic">
                                                ฿{Math.floor(farmerNet).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                                {hasFarmerDed ? '*' : ''}
                                            </span>
                                        </div>

                                        {currentEmpPct > 0 && (
                                            <div className="flex justify-between items-center text-[22px]">
                                                <div className="flex items-center space-x-3">
                                                    <User size={32} className="text-[#a855f7]" />
                                                    <span className="font-bold text-[#a855f7]">{labels.employeeSplit} ({currentEmpPct}%)</span>
                                                </div>
                                                <span className="font-black text-[#a855f7] font-mono italic">
                                                    ฿{Math.floor(employeeNet).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                                    {hasEmployeeDed ? '*' : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Extra Message */}
                    {config.extraMessage && (
                        <div className="mt-8 p-6 bg-gray-50 rounded-[32px] border border-gray-100 text-[16px] text-gray-500 italic leading-relaxed text-center">
                            {config.extraMessage}
                        </div>
                    )}

                    {/* Note */}
                    {watch('note') && (
                        <div className="mt-8 p-5 bg-amber-50 rounded-2xl border border-amber-100 text-[14px] text-amber-700 font-medium italic">
                            หมายเหตุ: {watch('note')}
                        </div>
                    )}
                </div>

                {(() => {
                    let totalNet = 0;
                    let hasAnyDed = false;
                    if (printingReceipt) {
                        totalNet = Number(printingReceipt.total || 0);
                        hasAnyDed = Array.isArray(printingReceipt.loanDeductions) && printingReceipt.loanDeductions.length > 0;
                    } else {
                        const fDed = parseFloat(watch('farmerDeduction')) || 0;
                        const eDed = parseFloat(watch('employeeDeduction')) || 0;
                        const gross = calculateTotal() || 0;
                        totalNet = Math.floor(gross - fDed - eDed);
                        hasAnyDed = fDed > 0 || eDed > 0;
                    }

                    return (
                        <div className="bg-[#2d5a3f] p-6 flex justify-between items-center text-white">
                            <span style={{ fontSize: `${(config.fontSizeTotal || 20) * 1.4}px` }} className="font-black uppercase">ยอดรวมจ่าย</span>
                            <div className="text-right">
                                <span style={{ fontSize: `${(config.fontSizeTotal || 20) * 4}px` }} className="font-black leading-none tabular-nums tracking-tighter">
                                    ฿{Math.floor(totalNet).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                    {hasAnyDed ? '*' : ''}
                                </span>
                                <p style={{ fontSize: `${(config.fontSizeFooter || 8) * 1.5}px` }} className="font-bold opacity-60">{config.footerText}</p>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default BuyESlipCapture;
