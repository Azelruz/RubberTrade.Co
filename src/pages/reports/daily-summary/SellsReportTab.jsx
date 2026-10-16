import React from 'react';
import PaginationFooter from './PaginationFooter';

export const SellsReportTab = ({
    dailyData,
    currentPage,
    setCurrentPage,
    itemsPerPage = 15
}) => {
    const paginated = dailyData.sells.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-[#1e293b] text-white font-bold">
                    <tr>
                        <th className="px-8 py-5">ผู้ซื้อ / พิกัด</th>
                        <th className="px-8 py-5">รถขนส่ง</th>
                        <th className="px-8 py-5 text-right">น้ำหนักรวม (กก.)</th>
                        <th className="px-8 py-5 text-center">DRC (%)</th>
                        <th className="px-8 py-5 text-right">น้ำยางแห้ง (กก.)</th>
                        <th className="px-8 py-5 text-right">ราคาขาย (บ)</th>
                        <th className="px-8 py-5 text-right bg-rubber-600">ยอดขายสุทธิ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {dailyData.sells.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="px-8 py-20 text-center text-gray-400 font-medium">ไม่พบข้อมูลการขายในวันที่เลือก</td>
                        </tr>
                    ) : (
                        paginated.map((s, idx) => (
                            <tr key={s.id || idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-8 py-5">
                                    <div className="font-black text-gray-900">{s.buyerName}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">REF: {s.id?.substring(0,8)}</div>
                                </td>
                                <td className="px-8 py-5 text-gray-600 font-medium">{s.truckInfo || '-'}</td>
                                <td className="px-8 py-5 text-right font-mono font-bold text-gray-700">{Number(s.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-8 py-5 text-center">
                                    <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg font-black text-xs border border-orange-100">
                                        {Number(s.drc || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}%
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right font-mono font-black text-orange-600">{(Number(s.weight || 0) * Number(s.drc || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-8 py-5 text-right text-gray-500 font-mono font-bold">฿{Number(s.pricePerKg || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="px-8 py-5 text-right font-black text-gray-900 font-mono bg-rubber-50/30">฿{Number(s.total || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                            </tr>
                        ))
                    )}
                </tbody>
                {dailyData.sells.length > 0 && (
                    <tfoot className="bg-gray-900 text-white font-black border-t-4 border-rubber-600">
                        <tr className="divide-x divide-white/10 uppercase text-sm tracking-tight">
                            <td colSpan="2" className="px-8 py-5 text-rubber-400 text-left">ยอดรวม {dailyData.sells.length} รายการ</td>
                            <td className="px-8 py-5 text-right font-mono text-gray-400">{dailyData.sells.reduce((sum, s) => sum + Number(s.weight || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                            <td className="px-8 py-5"></td>
                            <td className="px-8 py-5 text-right font-mono text-orange-400">
                                {dailyData.sells.reduce((sum, s) => sum + (Number(s.weight || 0) * Number(s.drc || 0) / 100), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                            </td>
                            <td className="px-8 py-5"></td>
                            <td className="px-8 py-5 text-right font-mono text-white bg-rubber-900/50">
                                ฿{dailyData.sells.reduce((sum, s) => sum + Number(s.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                            </td>
                        </tr>
                    </tfoot>
                )}
            </table>
            <PaginationFooter totalCount={dailyData.sells.length} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} />
        </div>
    );
};

export default SellsReportTab;
