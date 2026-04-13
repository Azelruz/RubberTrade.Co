import React from 'react';
import { Leaf, User, Coins } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { th } from 'date-fns/locale';

const BuyESlipCapture = ({ eslipRef, settings, watch, watchRubberType, printingReceipt, editingRecord, selectedFarmer, farmers, memberTypes, currentEmpPct, calculateDryRubber, calculateTotal }) => {
    const isCupLump = watchRubberType === 'cup_lump' || printingReceipt?.rubberType === 'cup_lump';

    return (
        <div style={{ display: 'none', position: 'fixed', left: '-9999px', top: '0', zIndex: 9999 }} ref={eslipRef}>
            <div className="eslip-capture w-[500px] bg-white flex flex-col font-sans">
                {/* Header: Dark Green */}
                <div className="bg-[#2d5a3f] py-6 px-8 text-center text-white relative">
                    <div className="flex justify-center mb-3">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md overflow-hidden">
                            {settings.logoUrl ? (
                                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <Leaf size={36} className="text-white" />
                            )}
                        </div>
                    </div>
                    <h1 className="text-[42px] font-black tracking-tight mb-1 leading-tight">
                        {settings.factoryName || 'ร้านรับซื้อน้ำยางพารา'}
                    </h1>
                    <p className="text-[16px] opacity-70 font-medium mb-4">
                        {settings.address || '-'} โทร: {settings.phone || '-'}
                    </p>

                    <div className="inline-block px-6 py-1.5 bg-white/20 rounded-full border border-white/10 backdrop-blur-sm text-[18px] font-black tracking-widest leading-none">
                        {isCupLump ? 'ใบรับซื้อขี้ยางพารา' : 'ใบรับซื้อน้ำยางพารา'}
                    </div>
                </div>

                <div className="px-8 pt-6 pb-8 bg-white">
                    {/* Transaction ID & Date Bar */}
                    <div className="flex justify-between items-center mb-4 text-[18px] font-black text-gray-500 bg-gray-100/80 px-4 py-2 rounded-lg">
                        <span>เลขที่: <span className="text-gray-700">{(editingRecord?.id || ('buy_' + Date.now())).substring(0, 14)}</span></span>
                        <span>{format(addYears(new Date(), 543), 'dd MMMM yyyy HH:mm', { locale: th })}</span>
                    </div>

                    {/* Customer Info Card */}
                    <div className="mb-6">
                        <p className="text-[18px] font-bold text-gray-400 mb-1">ข้อมูลลูกค้า</p>
                        <div className="flex items-center justify-between border-b-2 border-dotted border-gray-100 pb-4">
                            <div>
                                <h2 className="text-[42px] font-black text-gray-800 leading-tight">
                                    {printingReceipt?.farmerName || farmers.find(f => f.id === watch('farmerId'))?.name || 'ลูกค้าทั่วไป'}
                                </h2>
                                <p className="text-[20px] font-bold text-gray-400">
                                    รหัส: {printingReceipt?.lineId || farmers.find(f => f.id === watch('farmerId'))?.lineId || '-'}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-2xl">
                                <User size={40} className="text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Details Table */}
                    <div className="space-y-3 mb-6">
                        <p className="text-[18px] font-bold text-gray-400 mb-2">รายละเอียดการรับซื้อ</p>

                        <div className="flex justify-between items-center text-[24px]">
                            <span className="font-bold text-gray-600">{isCupLump ? 'น้ำหนักขี้ยาง' : 'น้ำหนักยางดิบ'}</span>
                            <span className="font-black text-gray-900">{(Number(watch('weight')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                        </div>

                        {Number(watch('bucketWeight')) > 0 && (
                            <div className="flex justify-between items-center text-[24px]">
                                <span className="font-bold text-red-500 ml-4 italic">- น้ำหนักถังยาง</span>
                                <span className="font-bold text-red-500">-{Number(watch('bucketWeight')).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                        )}

                        {Number(watch('bucketWeight')) > 0 && (
                            <div className="flex justify-between items-center text-[26px] py-1 border-t border-dotted border-gray-50">
                                <span className="font-bold text-gray-700">น้ำหนักสุทธิ</span>
                                <span className="font-black text-gray-900">{(Number(watch('weight')) - Number(watch('bucketWeight'))).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                        )}

                        {!isCupLump && (
                            <>
                                <div className="flex justify-between items-center text-[24px]">
                                    <span className="font-bold text-gray-600">% DRC</span>
                                    <span className="font-black text-gray-900">{(Number(watch('drc')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                </div>

                                <div className="flex justify-between items-center text-[30px] py-3 border-y-2 border-gray-100 font-black bg-gray-50/50 px-2 rounded-lg">
                                    <span className="text-gray-700">ยางแห้ง</span>
                                    <span className="text-gray-900">{calculateDryRubber().toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                            </>
                        )}

                        <div className="flex justify-between items-center text-[24px] pt-2">
                            <span className="font-bold text-gray-600">ราคากลาง</span>
                            <span className="font-bold text-gray-900 font-mono">฿{(Number(printingReceipt?.basePrice ?? watch('basePrice')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                        </div>

                        {!isCupLump && (
                            <div className="flex justify-between items-center text-[24px]">
                                <span className="font-bold text-gray-600">โบนัส DRC</span>
                                <span className="font-bold text-green-600 font-mono">+฿{(Number(printingReceipt?.bonusDrc ?? watch('bonusDrc')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>
                        )}
                        {!isCupLump && (
                            <>
                                {(Number(printingReceipt?.fscBonus || (farmers.find(f => f.id === watch('farmerId'))?.fscId ? (settings.fsc_bonus || 1) : 0))) > 0 && (
                                    <div className="flex justify-between items-center text-[24px] text-amber-600">
                                        <span className="font-bold">โบนัส FSC</span>
                                        <span className="font-bold font-mono">+฿{Number(printingReceipt?.fscBonus || (farmers.find(f => f.id === watch('farmerId'))?.fscId ? (settings.fsc_bonus || 1) : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                    </div>
                                )}

                                {(Number(printingReceipt?.bonusMemberType ?? (farmers.find(f => f.id === watch('farmerId'))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === watch('farmerId')).memberTypeId)?.bonus : 0))) > 0 && (
                                    <div className="flex justify-between items-center text-[24px] text-rubber-700 bg-rubber-50 px-2 rounded-lg">
                                        <span className="font-black">{memberTypes.find(mt => mt.id === (printingReceipt?.memberTypeId || farmers.find(f => f.id === watch('farmerId'))?.memberTypeId))?.name || 'โบนัสสมาชิก'}</span>
                                        <span className="font-black font-mono">+฿{Number(printingReceipt?.bonusMemberType ?? (farmers.find(f => f.id === watch('farmerId'))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === watch('farmerId')).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="flex justify-between items-center text-[28px] pt-2 border-t border-dotted border-gray-100 mt-2 font-black">
                            <span className="text-gray-800">ราคาจริง (สุทธิ)</span>
                            <span className="text-gray-900 font-mono">฿{Math.floor(Number(printingReceipt?.actualPrice ?? (Number(watch('basePrice') || 0) + Number(watch('bonusDrc') || 0) + (selectedFarmer?.fscId ? (Number(settings.fsc_bonus) || 1) : 0) + (selectedFarmer?.memberTypeId ? (Number(memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId)?.bonus) || 0) : 0))) || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}/กก.</span>
                        </div>
                    </div>

                    {/* Shares / Splits */}
                    {!isCupLump && (
                        <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 space-y-6">
                            <div className="flex items-center space-x-4 mb-2">
                                <div className="p-2 bg-rubber-100 rounded-xl"><Coins size={24} className="text-rubber-600" /></div>
                                <p className="text-[14px] font-black text-rubber-700 uppercase tracking-widest">การจัดสรรเงิน</p>
                            </div>

                            <div className="space-y-4 pt-6 mt-6 border-t border-dotted border-gray-100">
                                <div className="flex justify-between items-center text-[22px]">
                                    <div className="flex items-center space-x-3">
                                        <Coins size={32} className="text-orange-400" />
                                        <span className="font-bold text-orange-400">เกษตรกรได้รับ ({(100 - currentEmpPct)}%)</span>
                                    </div>
                                    <span className="font-black text-[#5ba2d7] font-mono italic">฿{Math.floor((calculateTotal() * (100 - currentEmpPct)) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                </div>

                                {currentEmpPct > 0 && (
                                    <div className="flex justify-between items-center text-[22px]">
                                        <div className="flex items-center space-x-3">
                                            <User size={32} className="text-[#a855f7]" />
                                            <span className="font-bold text-[#a855f7]">ลูกจ้างได้รับ ({currentEmpPct}%)</span>
                                        </div>
                                        <span className="font-black text-[#a855f7] font-mono italic">฿{Math.floor((calculateTotal() * currentEmpPct) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Note */}
                    {watch('note') && (
                        <div className="mt-8 p-5 bg-amber-50 rounded-2xl border border-amber-100 text-[14px] text-amber-700 font-medium italic">
                            หมายเหตุ: {watch('note')}
                        </div>
                    )}
                </div>

                {/* Footer: Large Green Footer */}
                <div className="bg-[#2d5a3f] p-6 flex justify-between items-center text-white">
                    <span className="text-[28px] font-black uppercase">รวมจ่าย</span>
                    <span className="text-[80px] font-black leading-none tabular-nums tracking-tighter">
                        ฿{Math.floor(calculateTotal()).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default BuyESlipCapture;
