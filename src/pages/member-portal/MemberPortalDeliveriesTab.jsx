import React from 'react';
import { Calendar, DollarSign, Droplets, Users, Award } from 'lucide-react';

export const MemberPortalDeliveriesTab = ({
    member,
    isTapper,
    deliveryPeriod,
    setDeliveryPeriod,
    periodSummary,
    recentBuysList = [],
    selectedPlot,
    promotions
}) => {
    if (!member?.farmerId && !isTapper) return null;

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Period Selector Pills */}
            <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-500 flex items-center">
                    <Calendar size={13} className="mr-1 text-emerald-600" />
                    ช่วงเวลาข้อมูล:
                </span>
                <div className="inline-flex p-1 bg-gray-200/70 rounded-2xl text-[11px] font-bold">
                    {[
                        { id: 'month', label: 'เดือนนี้' },
                        { id: '7days', label: '7 วัน' },
                        { id: 'today', label: 'วันนี้' },
                        { id: 'all', label: 'ทั้งหมด' }
                    ].map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setDeliveryPeriod(t.id)}
                            className={`px-2.5 py-1 rounded-xl transition-all ${
                                deliveryPeriod === t.id ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-gray-500'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 4 Summary Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5">
                {/* Card 1: ค่ากรีดที่ได้รับ หรือ เงินเข้ากระเป๋าเจ้าของสวน */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 p-3.5 rounded-3xl border border-emerald-200 shadow-xs">
                    <span className="text-[11px] font-bold text-emerald-800 flex items-center space-x-1 mb-1">
                        <DollarSign size={14} className="text-emerald-600" />
                        <span>{isTapper ? 'ค่ากรีดยางที่ได้รับ' : 'เงินเข้ากระเป๋า'}</span>
                    </span>
                    <div className="text-xl font-black text-emerald-950 font-mono">
                        {isTapper ? (
                            (periodSummary?.employeeTotal !== undefined 
                                ? Number(periodSummary.employeeTotal).toLocaleString() 
                                : recentBuysList.reduce((acc, b) => acc + (Number(b.employeeTotal) || 0), 0).toLocaleString())
                        ) : (
                            (periodSummary?.farmerTotal !== undefined 
                                ? Number(periodSummary.farmerTotal).toLocaleString() 
                                : recentBuysList.reduce((acc, b) => acc + (Number(b.farmerTotal || b.finalTotalPrice || b.total) || 0), 0).toLocaleString())
                        )} 
                        <span className="text-xs font-bold text-emerald-700 font-sans ml-1">฿</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 mt-0.5 block">
                        {isTapper ? `(ส่วนแบ่ง ${member?.profitSharePct || 50}% สุทธิ)` : '(หักส่วนแบ่งคนกรีดแล้ว)'}
                    </span>
                </div>

                {/* Card 2: น้ำหนักยางรอบนี้ */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5 rounded-3xl border border-amber-200 shadow-xs">
                    <span className="text-[11px] font-bold text-amber-800 flex items-center space-x-1 mb-1">
                        <Droplets size={14} className="text-amber-600" />
                        <span>น้ำหนักยางรอบนี้</span>
                    </span>
                    <div className="text-xl font-black text-amber-950 font-mono">
                        {periodSummary?.totalWeight !== undefined 
                            ? Number(periodSummary.totalWeight).toLocaleString() 
                            : (recentBuysList.reduce((acc, b) => acc + (Number(b.totalNetWeight || b.weight) || 0), 0).toLocaleString())} 
                        <span className="text-xs font-bold text-amber-700 font-sans ml-1">กก.</span>
                    </div>
                    <span className="text-[10px] text-amber-700 mt-0.5 block">
                        DRC {periodSummary?.totalDryRubber !== undefined ? Number(periodSummary.totalDryRubber).toLocaleString() : (recentBuysList.reduce((acc, b) => acc + (Number(b.dryRubber || b.dryWeight) || 0), 0).toFixed(1))} กก.
                    </span>
                </div>

                {/* Card 3: มูลค่ายางรวมทั้งสิ้น หรือ ส่วนแบ่งคนกรีด */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 p-3.5 rounded-3xl border border-blue-200 shadow-xs">
                    <span className="text-[11px] font-bold text-blue-800 flex items-center space-x-1 mb-1">
                        <Users size={14} className="text-blue-600" />
                        <span>{isTapper ? 'มูลค่ายางทั้งแปลง' : 'ส่วนแบ่งคนกรีด'}</span>
                    </span>
                    <div className="text-xl font-black text-blue-950 font-mono">
                        {isTapper ? (
                            (periodSummary?.totalAmount !== undefined 
                                ? Number(periodSummary.totalAmount).toLocaleString() 
                                : recentBuysList.reduce((acc, b) => acc + (Number(b.total) || 0), 0).toLocaleString())
                        ) : (
                            (periodSummary?.employeeTotal !== undefined 
                                ? Number(periodSummary.employeeTotal).toLocaleString() 
                                : '0')
                        )} 
                        <span className="text-xs font-bold text-blue-700 font-sans ml-1">฿</span>
                    </div>
                    <span className="text-[10px] text-blue-700 mt-0.5 block truncate">
                        {isTapper ? `เจ้าของ: ${recentBuysList[0]?.farmerName || 'เจ้าของสวน'}` : (selectedPlot?.employeeName || 'กรีดเอง 100%')}
                    </span>
                </div>

                {/* Card 4: %DRC เฉลี่ย & แต้มสะสม */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50/60 p-3.5 rounded-3xl border border-purple-200 shadow-xs">
                    <span className="text-[11px] font-bold text-purple-800 flex items-center space-x-1 mb-1">
                        <Award size={14} className="text-purple-600" />
                        <span>%DRC เฉลี่ย</span>
                    </span>
                    <div className="text-xl font-black text-purple-950 font-mono">
                        {periodSummary?.avgDrc || '0.0'} <span className="text-xs font-bold text-purple-700 font-sans">%</span>
                    </div>
                    <span className="text-[10px] text-purple-700 mt-0.5 block truncate">
                        {isTapper ? `กรีดส่ง ${recentBuysList.length} ครั้ง` : (promotions?.currentPoints ? `แต้มสะสม: ${promotions.currentPoints} แต้ม` : 'สิทธิประโยชน์กลุ่ม')}
                    </span>
                </div>
            </div>

            {/* Detailed Buys Ledger */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center">
                        <Droplets size={15} className="mr-1.5 text-emerald-600" />
                        {isTapper ? 'ประวัติงานกรีดยาง & รายการรับเงิน' : 'ประวัติส่งน้ำยางสดที่จุดรับซื้อ'}
                    </h4>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                        {recentBuysList.length} รายการ
                    </span>
                </div>

                {recentBuysList.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 font-sans text-xs bg-gray-50 rounded-2xl space-y-1">
                        <Droplets size={24} className="mx-auto text-gray-300" />
                        <p>ยังไม่มีประวัติการส่งน้ำยางในช่วงเวลานี้</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {recentBuysList.map(b => (
                            <div key={b.id} className="p-3 bg-gray-50/80 hover:bg-emerald-50/30 border border-gray-100 rounded-2xl transition-all space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-800 flex items-center">
                                        <Calendar size={12} className="mr-1 text-gray-400" />
                                        {b.date}
                                    </span>
                                    {isTapper ? (
                                        <div className="text-right">
                                            <span className="text-[10px] text-gray-400 block font-sans">ค่ากรีดที่ได้รับ</span>
                                            <span className="font-mono font-black text-emerald-700 text-sm">
                                                ฿{Number(b.employeeTotal || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="font-mono font-black text-emerald-700 text-sm">
                                            ฿{Number(b.farmerTotal || b.finalTotalPrice || b.total || 0).toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-gray-200/50 text-[11px] font-mono">
                                    <div>
                                        <span className="text-[10px] text-gray-400 block font-sans">น้ำหนักสด</span>
                                        <span className="font-bold text-gray-700">
                                            {Number(b.totalNetWeight || b.weight || 0).toLocaleString()} กก.
                                        </span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] text-gray-400 block font-sans">%DRC</span>
                                        <span className="font-bold text-blue-600">
                                            {Number(b.drc || 0).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-gray-400 block font-sans">เนื้อยางแห้ง</span>
                                        <span className="font-bold text-emerald-800">
                                            {Number(b.dryRubber || b.dryWeight || 0).toFixed(2)} กก.
                                        </span>
                                    </div>
                                </div>

                                {isTapper ? (
                                    <div className="text-[10px] text-gray-500 flex justify-between bg-white/90 p-2 rounded-xl border border-gray-100">
                                        <span className="truncate">🌿 สวนของ: <strong className="text-gray-700">{b.farmerName || 'เจ้าของสวน'}</strong></span>
                                        <span className="shrink-0 font-mono text-gray-400">ยอดรวม: ฿{Number(b.total || 0).toLocaleString()} (ส่วนแบ่ง {b.empPct || member?.profitSharePct || 50}%)</span>
                                    </div>
                                ) : (
                                    (b.employeeTotal > 0 || b.employeeName) && (
                                        <div className="text-[10px] text-gray-500 flex justify-between bg-white/80 px-2 py-1 rounded-lg">
                                            <span>ส่วนแบ่งคนกรีด ({b.employeeName || 'คนกรีด'}):</span>
                                            <span className="font-mono font-bold text-blue-600">฿{Number(b.employeeTotal).toLocaleString()}</span>
                                        </div>
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemberPortalDeliveriesTab;
