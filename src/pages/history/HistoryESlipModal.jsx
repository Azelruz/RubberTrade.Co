import React from 'react';
import { X, Leaf, User, Package, ChevronDown, Coins, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

const HistoryESlipModal = ({ viewingEslip, handleCloseEslip, activeTab, settings, farmers, memberTypes }) => {
    if (!viewingEslip) return null;

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
                                {(settings.logo_url || settings.logoUrl) ? (
                                    <img src={settings.logo_url || settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Leaf size={24} className="text-white opacity-80" />
                                )}
                            </div>
                        </div>
                        <h1 className="text-lg font-black tracking-tight mb-0.5 leading-tight">
                            {settings.factory_name || settings.factoryName || 'ร้านรับซื้อน้ำยางพารา'}
                        </h1>
                        <p className="text-[9px] opacity-70 font-medium mb-2 max-w-[280px] mx-auto">
                            {settings.address || '-'} โทร: {settings.phone || '-'}
                        </p>
                        
                        <div className="inline-block px-3 py-1 bg-white/20 rounded-full border border-white/10 backdrop-blur-sm text-[9px] font-black tracking-[0.2em] leading-none uppercase">
                            {activeTab === 'buy' ? 'ใบรับซื้อน้ำยางพารา' : 'ใบส่งสินค้า / ใบกำกับสี'}
                        </div>
                    </div>

                    <div className="px-3 pt-3 pb-4 bg-white">
                        {/* Transaction ID & Date Bar */}
                        <div className="flex justify-between items-center mb-3 text-[9px] font-black text-gray-400 bg-gray-50/80 px-2 py-1.5 rounded-lg border border-gray-100">
                            <span className="flex items-center"><span className="opacity-40 mr-1 font-bold small-caps">ID:</span> <span className="text-gray-900 mono">{viewingEslip.id?.substring(0, 14)}</span></span>
                            <span>{format(parseISO(viewingEslip.date || viewingEslip.timestamp), 'dd MMM yy HH:mm', { locale: th })}</span>
                        </div>

                        {/* Customer/Factory Info Card */}
                        <div className="mb-3">
                            <p className="text-[8px] font-black text-gray-400 mb-1 uppercase tracking-widest flex items-center">
                                <User size={8} className="mr-1 opacity-40" />
                                {activeTab === 'buy' ? 'ข้อมูลเกษตรกร' : 'ข้อมูลลูกค้า (โรงงาน)'}
                            </p>
                            <div className="flex items-center justify-between border-b border-dotted border-gray-100 pb-2.5">
                                <div>
                                    <h2 className="text-[18px] font-black text-gray-800 leading-none mb-0.5">
                                        {activeTab === 'buy' ? (viewingEslip.farmerName || 'ลูกค้าทั่วไป') : (viewingEslip.buyerName || '-')}
                                    </h2>
                                    <div className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-500">
                                        รหัส: {activeTab === 'buy' ? (viewingEslip.farmerId || '-') : (viewingEslip.factoryId || '-')}
                                    </div>
                                </div>
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                                    {activeTab === 'buy' ? <User size={20} className="text-gray-200" /> : <Package size={20} className="text-gray-200" />}
                                </div>
                            </div>
                        </div>

                        {/* Details Table */}
                        <div className="space-y-1 mb-3">
                            <p className="text-[8px] font-black text-gray-400 mb-1 uppercase tracking-widest">รายละเอียดพารามิเตอร์</p>
                            
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-400">น้ำหนักยางดิบ</span>
                                <span className="font-black text-gray-900 decoration-rubber-100">{Number(viewingEslip.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] font-bold text-gray-400">กก.</span></span>
                            </div>

                            {(Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)) > 0 && (
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-red-300 ml-2 flex items-center"><ChevronDown size={10} className="mr-1" /> น้ำหนักถังยาง</span>
                                    <span className="font-bold text-red-500">-{Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                            )}

                            {(Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)) > 0 && (
                                <div className="flex justify-between items-center text-xs border-t border-dotted border-gray-100 pt-0.5 mt-0.5">
                                    <span className="font-bold text-gray-600">น้ำหนักสุทธิ</span>
                                    <span className="font-black text-gray-900">{(Number(viewingEslip.weight || 0) - Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] font-bold text-gray-400">กก.</span></span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-400">% DRC</span>
                                <span className="font-black text-gray-900">{Number(viewingEslip.drc || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                            </div>

                            <div className="flex justify-between items-center text-sm py-1 border-y border-gray-100 font-black bg-gray-50/50 px-2 rounded-lg my-0.5">
                                <span className="text-gray-700">เนื้อยางแห้ง</span>
                                <span className="text-rubber-600">
                                    {Number(viewingEslip.dry_weight ?? viewingEslip.dry_rubber ?? viewingEslip.dryRubber ?? ((Number(viewingEslip.weight || 0) * Number(viewingEslip.drc || 0)) / 100)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px]">กก.</span>
                                </span>
                            </div>

                            {activeTab === 'buy' && (
                                <>
                                    <div className="flex justify-between items-center text-xs pt-0.5">
                                        <span className="font-bold text-gray-400">ราคากลาง</span>
                                        <span className="font-black text-gray-900 mono">
                                            ฿{Number(viewingEslip.base_price ?? viewingEslip.basePrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-400">โบนัส DRC</span>
                                        <span className="font-bold text-green-600 mono">
                                            +฿{Number(viewingEslip.bonus_drc ?? viewingEslip.bonusDrc ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                        </span>
                                    </div>

                                    {(Number(viewingEslip.fsc_bonus ?? viewingEslip.fscBonus ?? 0)) > 0 && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-gray-400">โบนัส FSC</span>
                                            <span className="font-bold text-amber-600 mono">
                                                +฿{Number(viewingEslip.fsc_bonus ?? viewingEslip.fscBonus ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                            </span>
                                        </div>
                                    )}
                                {Number(viewingEslip.bonusMemberType ?? viewingEslip.bonus_member_type ?? (farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id)).memberTypeId)?.bonus : 0)) > 0 && (
                                    <div className="flex justify-between items-center text-xs px-1 py-0.5 bg-rubber-50 rounded">
                                        <span className="font-black text-rubber-700">{memberTypes.find(mt => mt.id === (viewingEslip.memberTypeId || viewingEslip.member_type_id || farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id))?.memberTypeId))?.name || 'โบนัสสมาชิก'}</span>
                                        <span className="font-black text-rubber-700 mono">
                                            +฿{Number(viewingEslip.bonusMemberType ?? viewingEslip.bonus_member_type ?? (viewingEslip.farmerId && farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id)).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] font-black italic">/กก.</span>
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                            <div className="flex justify-between items-center text-sm pt-1 border-t border-dotted border-gray-200 mt-0.5 font-black">
                                <span className="text-gray-800">ราคาจริง (สุทธิ)</span>
                                <span className="font-black text-gray-900 mono">
                                    ฿{Number(activeTab === 'buy' 
                                        ? (viewingEslip.actual_price ?? viewingEslip.actualPrice ?? viewingEslip.price_per_kg ?? viewingEslip.pricePerKg ?? 0)
                                        : (viewingEslip.price_per_kg ?? viewingEslip.pricePerKg ?? 0)
                                    ).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                </span>
                            </div>
                        </div>

                        {/* Footer Final Total */}
                        {activeTab === 'buy' && (
                            <div className="bg-gray-50 rounded-[1.2rem] p-3 border border-gray-100 space-y-2 mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="p-1 bg-rubber-100 rounded-md"><Coins size={12} className="text-rubber-600" /></div>
                                    <p className="text-[9px] font-black text-rubber-700 uppercase tracking-widest">การจัดสรรเงิน</p>
                                </div>
                                
                                <div className="space-y-1 pt-1 border-t border-dotted border-gray-200">
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="font-bold text-orange-400 flex items-center"><Coins size={12} className="mr-1.5" /> เกษตรกร ({(100 - Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0))}%)</span>
                                        <span className="font-black text-[#5ba2d7] mono">฿{Math.floor(Number(viewingEslip.total || 0) * (100 - Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                    </div>
                                    
                                    {Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0) > 0 && (
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-[#a855f7] flex items-center"><User size={12} className="mr-1.5" /> ลูกจ้าง ({Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0)}%)</span>
                                            <span className="font-black text-[#a855f7] mono">฿{Math.floor(Number(viewingEslip.total || 0) * Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-[#2d5a3f] rounded-xl p-3 flex justify-between items-center text-white shadow-xl shadow-green-900/30 relative overflow-hidden group/total mb-1.5">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover/total:scale-150 duration-700"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">ยอดรวมจ่าย</span>
                            <div className="text-right relative z-10">
                                <span className="text-[22px] font-black leading-none tracking-tighter tabular-nums drop-shadow-md">
                                    ฿{Number(viewingEslip.total || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                </span>
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
