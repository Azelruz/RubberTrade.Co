import React from 'react';
import { RefreshCw, Search, User, Printer, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

const HistoryTable = ({ loading, filteredRecords, activeTab, handlePrintBuy, handlePrintSell, setViewingEslip }) => {
    return (
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden no-print">
            <div className="overflow-x-auto text-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <RefreshCw className="animate-spin text-rubber-500" size={32} />
                        <p className="text-gray-400 font-bold italic tracking-wider">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">วันที่/เวลา</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">{activeTab === 'buy' ? 'เกษตรกร' : 'โรงงาน/ผู้ซื้อ'}</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-center">น้ำหนัก (กก.)</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-center">% DRC</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-center">ราคา/กก.</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-right">ยอดรวม (฿)</th>
                                <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-24 text-center">
                                        <Search size={48} className="mx-auto mb-4 text-gray-200" />
                                        <p className="text-gray-400 font-black text-lg">ไม่พบข้อมูลประจำวันที่คุณเลือก</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((r) => (
                                    <tr key={r.id} className="group hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-gray-600 whitespace-nowrap">
                                                {format(parseISO(r.date), 'dd ม.ค. yyyy', { locale: th })}
                                            </div>
                                            <div className="text-[10px] font-black text-gray-300 uppercase tracking-tighter mt-1 italic">
                                                {r.id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                                                    <User size={14} />
                                                </div>
                                                <span className="font-black text-gray-800 text-sm">
                                                    <span className="flex items-center gap-2">
                                                        {activeTab === 'buy' ? (r.farmerName || 'ลูกค้าทั่วไป') : r.buyerName}
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                                                            (r.rubberType === 'cup_lump' || r.rubber_type === 'cup_lump') 
                                                                ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                        }`}>
                                                            {(r.rubberType === 'cup_lump' || r.rubber_type === 'cup_lump') ? 'ขี้ยาง' : 'น้ำยาง'}
                                                        </span>
                                                    </span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="font-black text-gray-900 text-base">{Number(r.weight || 0).toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-red-400">-{Number(r.bucket_weight ?? r.bucketWeight ?? 0).toFixed(1)} (ถัง)</div>
                                            <div className="text-[10px] font-black text-gray-400 mt-0.5">
                                                {Number((r.weight || 0) - (r.bucket_weight ?? r.bucketWeight ?? 0)).toFixed(1)} <span className="opacity-50">สุทธิ</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="font-bold text-gray-600">{Number(r.drc || 0).toFixed(1)}%</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="font-bold text-gray-600">
                                                {Number(activeTab === 'buy' 
                                                    ? (r.actual_price ?? r.actualPrice ?? r.price_per_kg ?? r.pricePerKg ?? 0) 
                                                    : (r.pricePerKg ?? r.price_per_kg ?? 0)
                                                ).toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="font-black text-rubber-500 text-lg">
                                                {Number(r.total).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center space-x-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => activeTab === 'buy' ? handlePrintBuy(r) : handlePrintSell(r)}
                                                    className="p-2.5 bg-gray-50 text-gray-500 hover:text-rubber-600 hover:bg-rubber-50 rounded-xl transition-all shadow-sm"
                                                    title="พิมพ์"
                                                >
                                                    <Printer size={20} />
                                                </button>
                                                
                                                <button 
                                                    onClick={() => setViewingEslip(r)}
                                                    className="p-2.5 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-xl transition-all shadow-sm"
                                                    title="ดู E-Slip"
                                                >
                                                    <Eye size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default HistoryTable;
