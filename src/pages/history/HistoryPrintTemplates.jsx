import React from 'react';
import { format, addYears } from 'date-fns';
import { th } from 'date-fns/locale';

const HistoryPrintTemplates = ({ 
    printingReceipt, printingSellRecord, buyPrintRef, sellPrintRef, 
    settings, farmers, memberTypes, drcBonuses, calculateDrcBonus, truncateOneDecimal 
}) => {
    return (
        <div style={{ display: 'none' }}>
            {/* Style is already in main component via dangerouslySetInnerHTML or can be added here if needed */}
            
            {/* Hidden Buy Print Container (Thermal) */}
            <div ref={buyPrintRef}>
                {printingReceipt && (
                    <div className="receipt-content text-black text-[12px] leading-snug p-4 font-sans" style={{ width: '57mm', background: 'white' }}>
                        {/* Header - High Contrast for Thermal */}
                        <div className="text-center mb-3 border-b-2 border-black pb-2">
                        <div className="h-12 flex items-center justify-center mb-2">
                            {(settings.logoUrl || settings.logo_url) && (
                                <img src={settings.logoUrl || settings.logo_url} alt="Logo" className="h-12 mx-auto object-contain" style={{ filter: 'grayscale(1) contrast(2)' }} />
                            )}
                        </div>
                            <h1 className="text-lg font-bold leading-tight">{settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา'}</h1>
                            <p className="text-[10px] font-medium">{settings.address || '-'}</p>
                            <p className="text-sm font-bold">โทร: {settings.phone || '-'}</p>
                            <div className="mt-2 font-bold border border-black inline-block px-4 py-0.5 text-[11px]">
                                ใบรับซื้อน้ำยางพารา
                            </div>
                        </div>

                        {/* Invoice Info */}
                        <div className="flex justify-between text-[10px] mb-3 border-b border-black pb-1 font-mono">
                            <span>เลขที่: <span className="font-bold">{printingReceipt.id?.substring(0, 14)}</span></span>
                            <span className="font-bold">{format(addYears(new Date(printingReceipt.timestamp || printingReceipt.date || new Date()), 543), 'dd/MM/yyyy HH:mm', { locale: th })}</span>
                        </div>

                        {/* Farmer Info */}
                        <div className="mb-3">
                            <h2 className="text-sm font-bold">{printingReceipt.farmerName || 'ลูกค้าทั่วไป'}</h2>
                        </div>

                        {/* Details */}
                        <div className="py-2 border-t border-black space-y-1">
                            <div className="flex justify-between items-center">
                                <span>น้ำหนักยางดิบ</span>
                                <span className="text-sm font-bold">{Number(printingReceipt.weight).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-black italic mb-1">
                                <span>น้ำหนักถัง</span>
                                <span>-{Number(printingReceipt.bucketWeight ?? printingReceipt.bucket_weight ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>น้ำหนักสุทธิ</span>
                                <span className="text-sm font-bold border-b border-black">{(Number(printingReceipt.weight) - Number(printingReceipt.bucketWeight ?? printingReceipt.bucket_weight ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>% DRC</span>
                                <span className="text-sm font-bold border-b border-black">{Number(printingReceipt.drc).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>ยางแห้ง</span>
                                <span className="text-sm font-bold border-b border-black">{Number(printingReceipt.dryWeight ?? printingReceipt.dry_weight ?? printingReceipt.dryRubber ?? printingReceipt.dry_rubber ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>

                            <div className="my-2 border-t border-dashed border-black"></div>

                            <div className="flex justify-between items-center text-[12px]">
                                <span>ราคากลาง</span>
                                <span>{Number(printingReceipt.basePrice ?? printingReceipt.base_price ?? ((printingReceipt.actualPrice ?? printingReceipt.actual_price ?? printingReceipt.pricePerKg ?? printingReceipt.price_per_kg ?? 0) - (printingReceipt.bonusDrc ?? printingReceipt.bonus_drc ?? calculateDrcBonus(printingReceipt.drc, drcBonuses)))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>
                            <div className="flex justify-between items-center text-[12px] font-medium">
                                <span>โบนัส DRC</span>
                                <span>+{Number(printingReceipt.bonusDrc ?? printingReceipt.bonus_drc ?? calculateDrcBonus(printingReceipt.drc, drcBonuses)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>
                            {Number(printingReceipt.fscBonus ?? printingReceipt.fsc_bonus ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.fscId ? (settings.fsc_bonus || 1) : 0)) > 0 && (
                                <div className="flex justify-between items-center text-[12px] font-medium text-black">
                                    <span>โบนัส FSC</span>
                                    <span>+{Number(printingReceipt.fscBonus ?? printingReceipt.fsc_bonus ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.fscId ? (settings.fsc_bonus || 1) : 0)).toLocaleString(undefined, { minimumFractionDigits: 0 })}/กก.</span>
                                </div>
                            )}
                            {Number(printingReceipt.bonusMemberType ?? printingReceipt.bonus_member_type ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id)).memberTypeId)?.bonus : 0)) > 0 && (
                                <div className="flex justify-between items-center text-[12px] font-black text-rubber-700 bg-rubber-50 px-1 rounded">
                                    <span>{memberTypes.find(mt => mt.id === (printingReceipt.memberTypeId || printingReceipt.member_type_id || farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId))?.name || 'โบนัสสมาชิก'}</span>
                                    <span>+{Number(printingReceipt.bonusMemberType ?? printingReceipt.bonus_member_type ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id)).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center font-bold border-t border-black pt-1 mt-1">
                                <span>ราคาจริง (สุทธิ)</span>
                                <span className="text-sm font-bold border-b border-black">{truncateOneDecimal(Number(printingReceipt.actualPrice ?? printingReceipt.actual_price ?? printingReceipt.pricePerKg ?? printingReceipt.price_per_kg ?? (Number(printingReceipt.basePrice ?? printingReceipt.base_price ?? 0) + Number(printingReceipt.bonusDrc ?? printingReceipt.bonus_drc ?? 0) + Number(printingReceipt.fscBonus ?? printingReceipt.fsc_bonus ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.fscId ? 1 : 0)) + Number(printingReceipt.bonusMemberType ?? printingReceipt.bonus_member_type ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId ? 1 : 0))))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>
                        </div>

                        {/* Splits */}
                        <div className="py-2 border-t-2 border-black my-2 space-y-1">
                            <div className="flex justify-between items-center font-bold">
                                <span>เกษตรกร ({100 - (Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0))}%)</span>
                                <span className="font-bold text-xl">{Math.floor(Number(printingReceipt.farmerTotal ?? printingReceipt.farmer_total ?? (Number(printingReceipt.total) * (100 - (Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0))) / 100))).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                            </div>
                            {Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0) > 0 && (
                                <div className="flex justify-between items-center">
                                    <span>ลูกจ้าง ({Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0)}%)</span>
                                    <span className="font-bold text-xl">{Math.floor(Number(printingReceipt.employeeTotal ?? printingReceipt.employee_total ?? (Number(printingReceipt.total) * (Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0)) / 100))).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                </div>
                            )}
                        </div>

                        {/* Total Footer */}
                        <div className="border-t-4 border-double border-black py-2 mt-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-xs uppercase">ยอดรวมสุทธิ</span>
                                <span className="font-bold text-xl">{Math.floor(Number(printingReceipt.total)).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                            </div>
                        </div>

                        {/* Footer Message */}
                        <div className="text-center mt-4 border-t border-black pt-2">
                            <p className="text-[10px] font-bold">=== ขอบคุณที่ใช้บริการ ===</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden Sell Print Container (Delivery Note Copy) */}
            <div ref={sellPrintRef}>
                {printingSellRecord && (
                    <div className="print:opacity-100 opacity-100 p-4 sm:p-12 overflow-visible w-full max-w-4xl mx-auto font-sans" style={{ background: 'white' }}>
                        <div className="max-w-4xl mx-auto text-black font-sans border-2 border-black p-8">
                            <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
                                <div className="flex space-x-4">
                                    {(settings.logo_url || settings.logoUrl) && <img src={settings.logo_url || settings.logoUrl} className="w-16 h-16 grayscale" />}
                                    <div>
                                        <h1 className="text-3xl font-black">{settings.factory_name || settings.factoryName}</h1>
                                        <p className="text-xs font-bold">{settings.address}</p>
                                        <p className="text-xs font-bold">โทร: {settings.phone}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h1 className="text-4xl font-black italic">สำเนาใบส่งของ</h1>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Duplicate Delivery Note</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div className="border border-black p-4 rounded-xl">
                                    <p className="text-[10px] font-black uppercase mb-1">สั่งจ่าย / ส่งถึง</p>
                                    <p className="text-xl font-black">{printingSellRecord.buyerName}</p>
                                    <p className="text-sm font-bold opacity-60">รหัสโรงงาน: {printingSellRecord.factoryId || '-'}</p>
                                    <p className="text-sm font-bold">ทะเบียนรถ: {printingSellRecord.truckInfo || '-'}</p>
                                </div>
                                <div className="space-y-2 text-sm font-bold">
                                    <div className="flex justify-between border-b border-black"><span>เลขที่บิล:</span><span>{printingSellRecord.id}</span></div>
                                    <div className="flex justify-between border-b border-black"><span>วันที่ขาย:</span><span>{format(new Date(printingSellRecord.date), 'dd MMMM yyyy', { locale: th })}</span></div>
                                    <div className="flex justify-between border-b border-black opacity-30 italic"><span>วันที่พิมพ์ซ้ำ:</span><span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
                                </div>
                            </div>

                            <table className="w-full border-collapse border-2 border-black mb-8 text-black">
                                <thead className="bg-black text-white text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-2 border border-black">รายการ</th>
                                        <th className="p-2 border border-black text-right">น้ำหนักรวม (กก.)</th>
                                        <th className="p-2 border border-black text-center">DRC (%)</th>
                                        <th className="p-2 border border-black text-right">น้ำยางแห้ง (กก.)</th>
                                        <th className="p-2 border border-black text-right">ราคา (บาท/กก.)</th>
                                        <th className="p-2 border border-black text-right">จำนวนเงิน</th>
                                    </tr>
                                </thead>
                                <tbody className="font-bold">
                                    <tr>
                                        <td className="p-3 border border-black">น้ำยางสดคุณภาพสูง (Field Latex)</td>
                                        <td className="p-3 border border-black text-right">{Number(printingSellRecord.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                        <td className="p-3 border border-black text-center">{Number(printingSellRecord.drc || 0).toFixed(1)}%</td>
                                        <td className="p-3 border border-black text-right">{(Number(printingSellRecord.weight || 0) * Number(printingSellRecord.drc || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                        <td className="p-3 border border-black text-right">{Number(printingSellRecord.price_per_kg ?? printingSellRecord.pricePerKg ?? 0).toFixed(1)}</td>
                                        <td className="p-3 border border-black text-right">{Number(printingSellRecord.total || 0).toLocaleString()}</td>
                                    </tr>
                                    {[...Array(3)].map((_, i) => <tr key={i}><td className="p-4 border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>)}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100/50">
                                        <td colSpan="4" className="p-4 border border-black text-center italic text-sm">*** จำนวนเงินทั้งหมดรวมภาษีมูลค่าเพิ่มเรียบร้อยแล้ว ***</td>
                                        <td className="p-4 border border-black text-right font-black">ยอดสุทธิ</td>
                                        <td className="p-4 border border-black text-right text-2xl font-black">฿ {Math.floor(printingSellRecord.total).toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="grid grid-cols-2 gap-20 mt-20 text-center">
                                <div><div className="border-b-2 border-black mb-1 h-10"></div><p className="font-black">ผู้ส่งของ</p></div>
                                <div><div className="border-b-2 border-black mb-1 h-10"></div><p className="font-black">ผู้รับของ (โรงงาน)</p></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPrintTemplates;
