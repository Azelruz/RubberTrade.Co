import React from 'react';
import { Users, User, ChevronRight } from 'lucide-react';

export const TeamSummaryReportTab = ({
    teamSummary = [],
    expandedCreator,
    setExpandedCreator
}) => {
    return (
        <div className="overflow-x-auto p-6">
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center space-x-3">
                <Users className="text-blue-600" size={24} />
                <div>
                    <h3 className="text-sm font-black text-gray-900">สรุปยอดซื้อทีมน้ำยาง</h3>
                    <p className="text-xs font-medium text-gray-500">แสดงผลงานยอดรวมสะสมของพนักงานแต่ละคนที่รับซื้อน้ำยางและขี้ยางสดในระบบ</p>
                </div>
            </div>

            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-[#1e293b] text-white font-bold">
                        <tr>
                            <th className="px-6 py-4">ผู้บันทึกรายการ</th>
                            <th className="px-6 py-4 text-center">จำนวนบิล</th>
                            <th className="px-6 py-4 text-right">น้ำหนักสุทธิรวม (กก.)</th>
                            <th className="px-6 py-4 text-right">เนื้อยางแห้งรวม (กก.)</th>
                            <th className="px-6 py-4 text-right bg-rubber-600">ยอดเงินรวม</th>
                            <th className="px-6 py-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {teamSummary.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-medium">ไม่พบข้อมูลการบันทึกของทีมงานในช่วงเวลานี้</td>
                            </tr>
                        ) : (
                            teamSummary.map((group, idx) => {
                                const isExpanded = expandedCreator === group.creator;
                                return (
                                    <React.Fragment key={group.creator || idx}>
                                        <tr 
                                            onClick={() => setExpandedCreator(isExpanded ? null : group.creator)}
                                            className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 border-r border-gray-50">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-gray-100 rounded-xl text-gray-600 group-hover:bg-rubber-50 group-hover:text-rubber-600 transition-all">
                                                        <User size={16} />
                                                    </div>
                                                    <span className="font-black text-gray-900">{group.creator}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono font-bold text-gray-600">{group.billsCount}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-600">{group.totalNetWeight.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                            <td className="px-6 py-4 text-right font-mono text-blue-600 font-bold">{group.totalDryRubber.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                            <td className="px-6 py-4 text-right font-black text-gray-900 font-mono bg-rubber-50/30">฿{group.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                            <td className="px-6 py-4 text-center">
                                                <button className="text-rubber-600 hover:text-rubber-800 font-bold text-xs flex items-center justify-center space-x-1 mx-auto bg-rubber-50 group-hover:bg-rubber-100 px-3 py-1.5 rounded-lg transition-all">
                                                    <span>{isExpanded ? 'ซ่อนรายละเอียด' : 'ดูบิลแยกตามบุคคล'}</span>
                                                    <ChevronRight size={14} className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expanded Row */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan="6" className="p-0 bg-gray-50/50">
                                                    <div className="p-6 border-t border-b border-gray-100">
                                                        <div className="bg-white rounded-xl border border-gray-100 shadow-inner overflow-hidden">
                                                            <table className="w-full text-xs text-left border-collapse">
                                                                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                                                                    <tr>
                                                                        <th className="px-4 py-3">เลขที่บิล</th>
                                                                        <th className="px-4 py-3">วันที่</th>
                                                                        <th className="px-4 py-3">เกษตรกร</th>
                                                                        <th className="px-4 py-3 text-center">ประเภท</th>
                                                                        <th className="px-4 py-3 text-right">น้ำหนักสุทธิ (กก.)</th>
                                                                        <th className="px-4 py-3 text-center">%DRC</th>
                                                                        <th className="px-4 py-3 text-right">ยอดเงินรวม</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                    {group.records.map((rec, rIdx) => {
                                                                        const recNet = Number(rec.netWeight || (Number(rec.weight || 0) - Number(rec.bucketWeight || 0)));
                                                                        const typeLabel = (rec.rubberType === 'cup_lump' || rec.rubberType === 'ขี้ยาง') ? 'ขี้ยาง' : 'น้ำยางสด';
                                                                        return (
                                                                            <tr key={rec.id || rIdx} className="hover:bg-gray-50 transition-colors">
                                                                                <td className="px-4 py-3 font-bold text-gray-800">{rec.id}</td>
                                                                                <td className="px-4 py-3 text-gray-500">{rec.date}</td>
                                                                                <td className="px-4 py-3 font-bold text-gray-900">{rec.farmerName}</td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeLabel === 'ขี้ยาง' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                                                                        {typeLabel}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-right font-mono font-bold text-gray-600">{recNet.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                                                                <td className="px-4 py-3 text-center font-mono font-bold text-blue-600">{typeLabel === 'น้ำยางสด' ? `${Number(rec.drc || 0).toFixed(1)}%` : '-'}</td>
                                                                                <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">฿{Number(rec.total || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                    {teamSummary.length > 0 && (
                        <tfoot className="bg-gray-900 text-white font-black border-t-2 border-rubber-600">
                            <tr className="divide-x divide-white/10 uppercase text-sm tracking-tight">
                                <td className="px-6 py-4 text-rubber-400">รวมทั้งหมด ({teamSummary.length} คน)</td>
                                <td className="px-6 py-4 text-center font-mono">{teamSummary.reduce((sum, t) => sum + t.billsCount, 0)}</td>
                                <td className="px-6 py-4 text-right font-mono">{teamSummary.reduce((sum, t) => sum + t.totalNetWeight, 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-6 py-4 text-right font-mono text-blue-400">{teamSummary.reduce((sum, t) => sum + t.totalDryRubber, 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-6 py-4 text-right font-mono text-white bg-rubber-900/50">฿{teamSummary.reduce((sum, t) => sum + t.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-6 py-4"></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default TeamSummaryReportTab;
