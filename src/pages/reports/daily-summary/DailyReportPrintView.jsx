import React from 'react';
import ReportPrintHeader from '../../../components/ReportPrintHeader';

export const DailyReportPrintView = ({ settings, startDate, endDate, dailyData }) => {
    const recNetWeight = (b) => b.netWeight || (Number(b.weight || 0) - Number(b.bucketWeight || 0));

    return (
        <div id="daily-report-print-view" className="hidden print:block text-black p-4 font-sans bg-white">
            <ReportPrintHeader 
                settings={settings}
                title="รายงานสรุปประวัติการรับซื้อ-ขายและรายจ่ายประจำวัน"
                subtitle={`ประจำวันที่: ${startDate} ถึง ${endDate}`}
            />

            {/* Summary Table in A4 Print View */}
            <div className="mb-4">
                <h3 className="text-sm font-bold border-b border-black pb-1 mb-2">สรุปภาพรวม</h3>
                <table className="w-full border-collapse border border-black text-xs text-center">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black">
                            <th className="border border-black p-1">รายการ</th>
                            <th className="border border-black p-1">จำนวนบิล</th>
                            <th className="border border-black p-1">ปริมาณสุทธิ (กก.)</th>
                            <th className="border border-black p-1">ยางแห้งรวม (กก.)</th>
                            <th className="border border-black p-1">ยอดรวม (฿)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 text-left font-bold">รับซื้อน้ำยางสด</td>
                            <td className="border border-black p-1">{dailyData.buys.filter(b => (b.rubberType || 'latex') === 'latex').length}</td>
                            <td className="border border-black p-1">{dailyData.buys.filter(b => (b.rubberType || 'latex') === 'latex').reduce((sum, b) => sum + Number(recNetWeight(b)), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                            <td className="border border-black p-1">{dailyData.buys.filter(b => (b.rubberType || 'latex') === 'latex').reduce((sum, b) => sum + Number(b.dryRubber || b.dryWeight || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                            <td className="border border-black p-1 font-bold">฿{dailyData.buys.filter(b => (b.rubberType || 'latex') === 'latex').reduce((sum, b) => sum + Number(b.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-left font-bold">รับซื้อขี้ยาง</td>
                            <td className="border border-black p-1">{dailyData.buys.filter(b => (b.rubberType || 'latex') === 'cup_lump').length}</td>
                            <td className="border border-black p-1">{dailyData.buys.filter(b => (b.rubberType || 'latex') === 'cup_lump').reduce((sum, b) => sum + Number(recNetWeight(b)), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                            <td className="border border-black p-1">-</td>
                            <td className="border border-black p-1 font-bold">฿{dailyData.buys.filter(b => (b.rubberType || 'latex') === 'cup_lump').reduce((sum, b) => sum + Number(b.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-left font-bold">ยอดส่งขายโรงงาน</td>
                            <td className="border border-black p-1">{dailyData.sells.length}</td>
                            <td className="border border-black p-1">{dailyData.sells.reduce((sum, s) => sum + Number(s.weight || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                            <td className="border border-black p-1">-</td>
                            <td className="border border-black p-1 font-bold">฿{dailyData.sells.reduce((sum, s) => sum + Number(s.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 text-left font-bold">รายจ่ายรวม (ค่าใช้จ่าย+ค่าจ้าง)</td>
                            <td className="border border-black p-1">{dailyData.expenses.length + dailyData.wages.length}</td>
                            <td className="border border-black p-1">-</td>
                            <td className="border border-black p-1">-</td>
                            <td className="border border-black p-1 font-bold text-red-600">฿{(dailyData.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0) + dailyData.wages.reduce((sum, w) => sum + Number(w.total || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Detail Table */}
            <div>
                <h3 className="text-sm font-bold border-b border-black pb-1 mb-2">ตารางรายละเอียดบิลรับซื้อน้ำยางสด</h3>
                <table className="w-full border-collapse border border-black text-[11px]">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black">
                            <th className="border border-black p-1 text-center">ลำดับ</th>
                            <th className="border border-black p-1 text-left">วันที่</th>
                            <th className="border border-black p-1 text-left">เกษตรกร</th>
                            <th className="border border-black p-1 text-right">สุทธิ (กก.)</th>
                            <th className="border border-black p-1 text-center">% DRC</th>
                            <th className="border border-black p-1 text-right">ยางแห้ง (กก.)</th>
                            <th className="border border-black p-1 text-right">ราคา/กก. (฿)</th>
                            <th className="border border-black p-1 text-right">ยอดรวม (฿)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dailyData.buys.filter(b => (b.rubberType || 'latex') === 'latex').map((item, index) => (
                            <tr key={item.id || index} className="border-b border-gray-300">
                                <td className="border border-black p-1 text-center">{index + 1}</td>
                                <td className="border border-black p-1">{item.date}</td>
                                <td className="border border-black p-1 font-bold">{item.farmerName}</td>
                                <td className="border border-black p-1 text-right">{Number(recNetWeight(item)).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="border border-black p-1 text-center">{Number(item.drc || 0).toFixed(1)}%</td>
                                <td className="border border-black p-1 text-right">{Number(item.dryRubber || item.dryWeight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                <td className="border border-black p-1 text-right">฿{Number(item.pricePerKg || 0).toFixed(2)}</td>
                                <td className="border border-black p-1 text-right font-bold">฿{Number(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DailyReportPrintView;
