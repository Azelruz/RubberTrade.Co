import React from 'react';
import PaginationFooter from './PaginationFooter';
import { truncateOneDecimal } from '../../../utils/calculations';

export const LatexBuysTab = ({
    dailyData,
    currentPage,
    setCurrentPage,
    itemsPerPage = 15
}) => {
    const filtered = dailyData.buys.filter(b => (b.rubberType || 'latex') === 'latex');
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-[#1e293b] text-white font-bold">
                    <tr>
                        <th className="px-5 py-5 border-r border-white/10">เกษตรกร</th>
                        <th className="px-5 py-5 text-right border-r border-white/10">น้ำยางดิบ</th>
                        <th className="px-5 py-5 text-right border-r border-white/10">ถัง</th>
                        <th className="px-5 py-5 text-right border-r border-white/10 bg-[#334155]">สุทธิ</th>
                        <th className="px-5 py-5 text-center border-r border-white/10">%DRC</th>
                        <th className="px-5 py-5 text-right border-r border-white/10 bg-blue-600">ยางแห้ง</th>
                        <th className="px-5 py-5 text-right border-r border-white/10">ราคาซื้อ</th>
                        <th className="px-5 py-5 text-right border-r border-white/10 bg-rubber-600">ยอดเงินรวม</th>
                        <th className="px-5 py-5 text-right border-r border-white/10">แบ่ง%</th>
                        <th className="px-5 py-5 text-right border-r border-white/10 bg-emerald-600">ยอดเกษตรกร</th>
                        <th className="px-5 py-5 text-right border-r border-white/10">แบ่ง%</th>
                        <th className="px-5 py-5 text-right bg-orange-600">ยอดลูกจ้าง</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan="12" className="px-5 py-20 text-center text-gray-400 font-medium">ไม่พบข้อมูลการรับซื้อน้ำยางสดในวันที่เลือก</td>
                        </tr>
                    ) : (
                        paginated.map((b, idx) => {
                            const netWeight = Number(b.netWeight || (Number(b.weight || 0) - Number(b.bucketWeight || 0)));
                            const farmerPct = 100 - (Number(b.empPct) || 0);
                            return (
                                <tr key={b.id || idx} className="hover:bg-gray-50/80 transition-colors group">
                                    <td className="px-5 py-4 border-r border-gray-50">
                                        <div className="font-black text-gray-900">{b.farmerName}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">ID: {b.farmerId || '-'}</div>
                                    </td>
                                    <td className="px-5 py-4 text-right font-mono font-bold text-gray-600">{Number(b.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                    <td className="px-5 py-4 text-right font-mono text-red-500 font-medium">-{Number(b.bucketWeight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                    <td className="px-5 py-4 text-right font-black text-gray-900 font-mono bg-gray-50/50">{netWeight.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-black text-xs border border-blue-100 italic">
                                            {Number(b.drc || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}%
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right font-black text-blue-700 font-mono bg-blue-50/30">{(Number(b.dryRubber || b.dryWeight || 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                    <td className="px-5 py-4 text-right text-gray-500 font-mono font-bold">฿{Number(b.pricePerKg || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                    <td className="px-5 py-4 text-right font-black text-gray-900 font-mono bg-rubber-50/30">฿{Number(b.total || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                    <td className="px-5 py-4 text-right text-[10px] text-gray-400 font-black">{farmerPct}%</td>
                                    <td className="px-5 py-4 text-right font-black text-emerald-700 font-mono bg-emerald-50/30">฿{Number(b.farmerTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                    <td className="px-5 py-4 text-right text-[10px] text-gray-400 font-black">{Number(b.empPct || 0)}%</td>
                                    <td className="px-5 py-4 text-right font-black text-orange-700 font-mono bg-orange-50/30">฿{Number(b.employeeTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
                <tfoot className="bg-gray-900 text-white font-black border-t-4 border-rubber-600">
                    {(() => {
                        if (filtered.length === 0) return null;
                        
                        const totalWeight = filtered.reduce((sum, b) => sum + Number(b.weight || 0), 0);
                        const totalBucket = filtered.reduce((sum, b) => sum + Number(b.bucketWeight || 0), 0);
                        const totalNet = filtered.reduce((sum, b) => sum + Number(b.netWeight || (Number(b.weight || 0) - Number(b.bucketWeight || 0))), 0);
                        const totalDry = filtered.reduce((sum, b) => sum + Number(b.dryRubber || b.dryWeight || 0), 0);
                        const totalValue = filtered.reduce((sum, b) => sum + Number(b.total || 0), 0);
                        const totalFarmer = filtered.reduce((sum, b) => sum + Number(b.farmerTotal || 0), 0);
                        const totalEmp = filtered.reduce((sum, b) => sum + Number(b.employeeTotal || 0), 0);
                        
                        const avgDrc = totalNet > 0 ? truncateOneDecimal((totalDry / totalNet) * 100) : 0;
                        const avgPrice = totalDry > 0 ? (totalValue / totalDry) : 0;

                        return (
                            <tr className="divide-x divide-white/10 uppercase text-sm tracking-tight">
                                <td className="px-5 py-5 text-rubber-400">ยอดรวม {filtered.length} บิล</td>
                                <td className="px-5 py-5 text-right font-mono text-gray-400">{totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-5 py-5 text-right font-mono text-red-400">-{totalBucket.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-5 py-5 text-right font-mono text-white bg-gray-800">{totalNet.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-5 py-5 text-center">
                                    <div className="text-[10px] text-gray-400 leading-none mb-1">เฉลี่ย</div>
                                    <span className="text-blue-300">{avgDrc.toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                </td>
                                <td className="px-5 py-5 text-right font-mono text-blue-400 bg-blue-900/50">{totalDry.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-5 py-5 text-right">
                                    <div className="text-[10px] text-gray-400 leading-none mb-1">เฉลี่ย</div>
                                    <span className="text-gray-300">฿{avgPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                                </td>
                                <td className="px-5 py-5 text-right font-mono text-rubber-400">฿{totalValue.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-5 py-5"></td>
                                <td className="px-5 py-5 text-right font-mono text-emerald-400 bg-emerald-900/50">฿{totalFarmer.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-5 py-5"></td>
                                <td className="px-5 py-5 text-right font-mono text-orange-400 bg-orange-900/50">฿{totalEmp.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                            </tr>
                        );
                    })()}
                </tfoot>
            </table>
            <PaginationFooter totalCount={filtered.length} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} />
        </div>
    );
};

export default LatexBuysTab;
