import React from 'react';
import { Printer, X, Leaf } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { th } from 'date-fns/locale';
import { truncateOneDecimal, calculateDrcBonus } from '../../utils/calculations';

const BuyPaperReceipt = ({ printingReceipt, printRef, setPrintingReceipt, settings, drcBonuses, farmers, memberTypes }) => {
    if (!printingReceipt) return null;

    const isCupLump = printingReceipt.rubberType === 'cup_lump' || printingReceipt.rubber_type === 'cup_lump';

    return (
        <div style={{ display: 'none' }}>
            <div ref={printRef}>
                <div className="receipt-content text-black text-[16px] leading-snug p-4 font-sans" style={{ width: '57mm', background: 'white' }}>
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
                        {/* Header - High Contrast for Thermal */}
                        <div className="text-center mb-4 border-b-2 border-black pb-2">
                            <div className="h-16 flex items-center justify-center mb-2">
                                {settings.logoUrl && (
                                    <img src={settings.logoUrl} alt="Logo" className="h-16 mx-auto object-contain" style={{ filter: 'grayscale(1) contrast(2)' }} />
                                )}
                            </div>
                            <h1 className="text-2xl font-bold leading-tight">{settings.factoryName || 'ร้านรับซื้อน้ำยางพารา'}</h1>
                            <p className="text-[14px] font-medium">{settings.address || '-'}</p>
                            <p className="text-lg font-bold">โทร: {settings.phone || '-'}</p>
                            <div className="mt-2 font-bold border-2 border-black inline-block px-6 py-1 text-[16px]">
                                {isCupLump ? 'ใบรับซื้อขี้ยางพารา' : 'ใบรับซื้อน้ำยางพารา'}
                            </div>
                        </div>

                        {/* Customer Info Section */}
                        <div className="mb-4">
                            <div className="text-center text-[14px] font-bold border-y border-black py-0.5 mb-2 uppercase">=== ข้อมูลลูกค้า ===</div>
                            <div className="flex justify-between text-[14px] mb-2 font-mono">
                                <span>เลขที่: <span className="font-bold">{printingReceipt.id || '-'}</span></span>
                                <span className="font-bold">{format(addYears(new Date(printingReceipt.timestamp || printingReceipt.date || new Date()), 543), 'dd/MM/yyyy HH:mm', { locale: th })}</span>
                            </div>
                            <h2 className="text-lg font-bold">{printingReceipt.farmerName || 'ลูกค้าทั่วไป'}</h2>
                        </div>

                        {/* Purchase Details Section */}
                        <div className="mb-4">
                            <div className="text-center text-[14px] font-bold border-y border-black py-0.5 mb-2 uppercase">=== รายละเอียดรับซื้อ ===</div>
                            
                            <div className="flex justify-between items-center text-[15px] mt-2">
                                <span>{isCupLump ? 'น้ำหนักขี้ยาง' : 'น้ำหนักยางดิบ'}</span>
                                <span>{Number(printingReceipt.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                            <div className="flex justify-between items-center text-[14px] text-black italic">
                                <span>น้ำหนักถัง (หัก)</span>
                                <span>-{Number(printingReceipt.bucketWeight || printingReceipt.bucket_weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>น้ำหนักสุทธิ</span>
                                <span className="text-lg font-bold border-b-2 border-black">{(Number(printingReceipt.weight || 0) - Number(printingReceipt.bucketWeight || printingReceipt.bucket_weight || 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                            
                            {!isCupLump && (
                                <>
                                    <div className="flex justify-between items-center mt-1">
                                        <span>% DRC</span>
                                        <span className="text-lg font-bold border-b border-black">{Number(printingReceipt.drc).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span>ยางแห้ง</span>
                                        <span className="text-lg font-bold border-b border-black">{Number(printingReceipt.dryWeight || printingReceipt.dryRubber || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                    </div>
                                </>
                            )}
                            
                            <div className="my-2 border-t border-dashed border-black"></div>

                            <div className="flex justify-between items-center text-[16px]">
                                <span>ราคากลาง</span>
                                <span>{Number(printingReceipt.basePrice || (Number(printingReceipt.actualPrice || printingReceipt.pricePerKg) - (printingReceipt.bonusDrc !== undefined ? Number(printingReceipt.bonusDrc) : calculateDrcBonus(printingReceipt.drc, drcBonuses)))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>
                            
                            {!isCupLump && (
                                <>
                                    <div className="flex justify-between items-center text-[16px] font-medium">
                                        <span>โบนัส DRC</span>
                                        <span>+{Number(printingReceipt.bonusDrc !== undefined ? printingReceipt.bonusDrc : calculateDrcBonus(printingReceipt.drc, drcBonuses)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                    </div>
                                    {Number(printingReceipt.fscBonus || (farmers.find(f => f.id === printingReceipt.farmerId)?.fscId ? (settings.fsc_bonus || 1) : 0)) > 0 && (
                                        <div className="flex justify-between items-center text-[16px] font-medium text-black">
                                            <span>โบนัส FSC</span>
                                            <span>+{Number(printingReceipt.fscBonus || (farmers.find(f => f.id === printingReceipt.farmerId)?.fscId ? (settings.fsc_bonus || 1) : 0)).toLocaleString(undefined, { minimumFractionDigits: 0 })}/กก.</span>
                                        </div>
                                    )}
                                    {Number(printingReceipt.bonusMemberType || (farmers.find(f => f.id === printingReceipt.farmerId)?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === printingReceipt.farmerId).memberTypeId)?.bonus : 0)) > 0 && (
                                        <div className="flex justify-between items-center text-[16px] font-black bg-gray-100 px-1 rounded">
                                            <span>{memberTypes.find(mt => mt.id === (printingReceipt.memberTypeId || farmers.find(f => f.id === printingReceipt.farmerId)?.memberTypeId))?.name || 'โบนัสสมาชิก'}</span>
                                            <span>+{Number(printingReceipt.bonusMemberType || (farmers.find(f => f.id === printingReceipt.farmerId)?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === printingReceipt.farmerId).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="flex justify-between items-center font-bold border-t-2 border-black pt-2 mt-2">
                                <span>ราคาจริง (สุทธิ)</span>
                                <span className="text-lg font-bold border-b-2 border-black">{truncateOneDecimal(Number(printingReceipt.actualPrice || (Number(printingReceipt.pricePerKg) || (Number(printingReceipt.basePrice || 0) + Number(printingReceipt.bonusDrc || 0) + (Number(printingReceipt.fscBonus) || (farmers.find(f => f.id === printingReceipt.farmerId)?.fscId ? 1 : 0)))))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>
                        </div>

                        {/* Splits */}
                        {!isCupLump && (
                            <div className="py-2 border-t-2 border-black my-2 space-y-2">
                                <div className="flex justify-between items-center font-bold text-lg">
                                    <span>เกษตรกร ({100 - (Number(printingReceipt.empPct) || 0)}%)</span>
                                    <span className="font-bold text-2xl">{Math.floor(Number(printingReceipt.farmerTotal || printingReceipt.total)).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                </div>
                                {Number(printingReceipt.empPct) > 0 && (
                                    <div className="flex justify-between items-center text-lg">
                                        <span>ลูกจ้าง ({Number(printingReceipt.empPct)}%)</span>
                                        <span className="font-bold text-2xl">{Math.floor(Number(printingReceipt.employeeTotal || 0)).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Total Footer */}
                        <div className="border-t-4 border-double border-black py-3 mt-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm uppercase">ยอดรวมสุทธิ</span>
                                <span className="font-bold text-3xl">{Math.floor(Number(printingReceipt.total)).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                            </div>
                        </div>

                        {/* Footer Message */}
                        <div className="text-center mt-4 border-t border-black pt-2">
                            <p className="text-[10px] font-bold">=== ขอบคุณที่ใช้บริการ ===</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuyPaperReceipt;
