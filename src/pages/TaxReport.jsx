import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import { Download, FileText, Search, Calendar, Filter, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { fetchBuyRecords, fetchSellRecords, fetchFactories, fetchFarmers, isCached } from '../services/apiService';
import toast from 'react-hot-toast';

export const TaxReport = () => {
    const [loading, setLoading] = useState(true);
    const [buys, setBuys] = useState([]);
    const [sells, setSells] = useState([]);
    const [factories, setFactories] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [dateRange, setDateRange] = useState(format(new Date(), 'yyyy-MM'));
    const [activeTab, setActiveTab] = useState('purchase'); // purchase, sales

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!isCached('buys', 'sells', 'factories', 'farmers')) setLoading(true);
        try {
            const [b, s, f, fm] = await Promise.all([
                fetchBuyRecords(),
                fetchSellRecords(),
                fetchFactories(),
                fetchFarmers()
            ]);
            setBuys(Array.isArray(b) ? b : []);
            setSells(Array.isArray(s) ? s : []);
            setFactories(Array.isArray(f) ? f : []);
            setFarmers(Array.isArray(fm) ? fm : []);
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    const filteredData = useMemo(() => {
        const [year, month] = dateRange.split('-');
        const targetDate = new Date(parseInt(year), parseInt(month) - 1);
        const start = startOfMonth(targetDate);
        const end = endOfMonth(targetDate);

        const filterFn = item => {
            const date = parseISO(item.date);
            return isWithinInterval(date, { start, end });
        };

        return {
            buys: buys.filter(filterFn),
            sells: sells.filter(filterFn)
        };
    }, [buys, sells, dateRange]);

    const exportToCSV = (type) => {
        const data = type === 'purchase' ? filteredData.buys : filteredData.sells;
        if (data.length === 0) {
            toast.error('ไม่มีข้อมูลสำหรับออกรายงาน');
            return;
        }

        let csvContent = "\uFEFF"; // Add BOM for UTF-8 support in Excel
        
        if (type === 'purchase') {
            csvContent += "วันที่,ชื่อเกษตรกร,เลขบัตรประชาชน,น้ำหนัก(กก.),ยอดเงิน(บาท)\n";
            data.forEach(item => {
                const farmer = farmers.find(f => f.id === item.farmerId);
                csvContent += `${item.date},${farmer?.name || item.farmerName || '-'},${farmer?.idCard || '-'},${item.weight},${item.total}\n`;
            });
        } else {
            csvContent += "วันที่,ชื่อโรงงาน,เลขผู้เสียภาษี,น้ำหนัก(กก.),%DRC,ยอดขาย(บาท)\n";
            data.forEach(item => {
                const factory = factories.find(f => f.id === item.factoryId);
                csvContent += `${item.date},${item.buyerName || '-'},${factory?.taxId || '-'},${item.weight},${item.drc},${item.total}\n`;
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `tax_report_${type}_${dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <FileText className="mr-3 text-rubber-600" size={28} />
                        รายงานบัญชีสำหรับสรรพากร
                    </h1>
                    <p className="text-gray-500">สรุปรายการซื้อ-ขาย ประจำเดือนเพื่อใช้ยื่นภาษี</p>
                </div>

                <div className="flex items-center space-x-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                    <Calendar size={20} className="text-gray-400 ml-2" />
                    <input 
                        type="month" 
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="border-none focus:ring-0 text-gray-900 font-bold"
                    />
                </div>
            </div>

            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-full md:w-fit">
                <button
                    onClick={() => setActiveTab('purchase')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${activeTab === 'purchase' ? 'bg-white text-rubber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ArrowDownLeft size={18} className="mr-2" />
                    รายงานภาษีซื้อ (จากเกษตรกร)
                </button>
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${activeTab === 'sales' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ArrowUpRight size={18} className="mr-2" />
                    รายงานภาษีขาย (ส่งโรงงาน)
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="font-bold text-gray-800 flex items-center">
                        {activeTab === 'purchase' ? 'รายการซื้อน้ำยางสดประจำเดือน' : 'รายการขายน้ำยางส่งโรงงานประจำเดือน'}
                        <span className="ml-3 px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-mono">
                            {activeTab === 'purchase' ? filteredData.buys.length : filteredData.sells.length} รายการ
                        </span>
                    </h2>
                    <button 
                        onClick={() => exportToCSV(activeTab)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold shadow-sm"
                    >
                        <Download size={18} className="mr-2" />
                        Export CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            {activeTab === 'purchase' ? (
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">วันที่</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ชื่อเกษตรกร</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">เลขบัตรประชาชน</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">น้ำหนัก (กก.)</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ยอดรวม (฿)</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">วันที่</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">โรงงานปลายทาง</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">เลขผู้เสียภาษี</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">น้ำหนัก (กก.)</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ยอดขาย (฿)</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">กำลังโหลดข้อมูล...</td></tr>
                            ) : (activeTab === 'purchase' ? filteredData.buys : filteredData.sells).length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">ไม่มีข้อมูลในช่วงเวลาที่เลือก</td></tr>
                            ) : (
                                (activeTab === 'purchase' ? filteredData.buys : filteredData.sells).map((item) => {
                                    if (activeTab === 'purchase') {
                                        const farmer = farmers.find(f => f.id === item.farmerId);
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{farmer?.name || item.farmerName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">{farmer?.idCard || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">{Number(item.weight).toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-rubber-600">{Number(item.total).toLocaleString()}</td>
                                            </tr>
                                        );
                                    } else {
                                        const factory = factories.find(f => f.id === item.factoryId);
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.date}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.buyerName}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">{factory?.taxId || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">{Number(item.weight).toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-orange-600">{Number(item.total).toLocaleString()}</td>
                                            </tr>
                                        );
                                    }
                                })
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold">
                            <tr>
                                <td colSpan="3" className="px-6 py-4 text-right text-sm text-gray-500">รวมทั้งสิ้น</td>
                                <td className="px-6 py-4 text-right text-sm font-mono">
                                    {(activeTab === 'purchase' ? filteredData.buys : filteredData.sells).reduce((sum, i) => sum + Number(i.weight), 0).toLocaleString()}
                                </td>
                                <td className={`px-6 py-4 text-right text-lg font-black ${activeTab === 'purchase' ? 'text-rubber-600' : 'text-orange-600'}`}>
                                    {(activeTab === 'purchase' ? filteredData.buys : filteredData.sells).reduce((sum, i) => sum + Number(i.total), 0).toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start space-x-4">
                <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
                    <FileText size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-blue-900 mb-1 italic">ข้อแนะนำสำหรับสรรพากร</h3>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc pl-4 opacity-80">
                        <li>รายงานนี้สรุปตามยอดที่มีการบันทึกในระบบจริง</li>
                        <li>เลขบัตรประชาชนเกษตรกรใช้แทนเลขผู้เสียภาษีบุคคลธรรมดา</li>
                        <li>กรุณาตรวจสอบความถูกต้องของเลขผู้เสียภาษีโรงงานในหน้าตั้งค่าก่อนออกรายงาน</li>
                        <li>คุณสามารถนำไฟล์ CSV ไปเปิดใน Excel เพื่อจัดทำใบขวางยอดหรือรายงานภาษีแยกตามเขตพื้นที่ได้</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TaxReport;
