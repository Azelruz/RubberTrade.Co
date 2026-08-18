import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { 
    Calendar, Download, ChevronRight, PieChart, 
    RefreshCw, Factory, TrendingUp, TrendingDown,
    Search, Filter, ChevronLeft, PackageCheck, AlertCircle, Printer
} from 'lucide-react';
import { fetchSellRecords, getSettings } from '../services/apiService';
import { truncateOneDecimal } from '../utils/calculations';
import ReportPrintHeader from '../components/ReportPrintHeader';

const StockAdjustmentReport = () => {
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [sells, setSells] = useState([]);
    const [settings, setSettings] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [data, setRes] = await Promise.all([
                fetchSellRecords(),
                getSettings()
            ]);
            setSells(Array.isArray(data) ? data : []);
            if (setRes && setRes.status === 'success') {
                setSettings(setRes.data || {});
            }
        } catch (error) {
            console.error('Error loading adjustments:', error);
        } finally {
            setLoading(false);
        }
    };

    const adjustmentData = useMemo(() => {
        // Filter by date and non-zero adjustments
        const filtered = sells.filter(item => {
            const dateMatch = item.date >= startDate && item.date <= endDate;
            const hasAdjustment = Number(item.lossWeight || 0) !== 0;
            const searchMatch = !searchTerm || 
                item.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.id?.toLowerCase().includes(searchTerm.toLowerCase());
            
            return dateMatch && hasAdjustment && searchMatch;
        });

        // Sort by date descending
        return filtered.sort((a, b) => b.date.localeCompare(a.date));
    }, [sells, startDate, endDate, searchTerm]);

    const stats = useMemo(() => {
        let totalLoss = 0;
        let totalGain = 0;
        let lossCount = 0;
        let gainCount = 0;

        adjustmentData.forEach(item => {
            const val = Number(item.lossWeight || 0);
            if (val > 0) {
                totalLoss += val;
                lossCount++;
            } else {
                totalGain += Math.abs(val);
                gainCount++;
            }
        });

        return {
            totalLoss: truncateOneDecimal(totalLoss),
            totalGain: truncateOneDecimal(totalGain),
            netAdjustment: truncateOneDecimal(totalGain - totalLoss),
            lossCount,
            gainCount
        };
    }, [adjustmentData]);

    const handleExportCSV = () => {
        const headers = ['วันที่', 'โรงงาน/ผู้ซื้อ', 'รหัสอ้างอิง', 'ประเภท', 'น้ำหนักที่บันทึก', 'น้ำหนักจริงจากโรงงาน', 'ส่วนต่าง (กก.)', 'สถานะ'];
        const data = adjustmentData.map(item => {
            const adj = Number(item.lossWeight || 0);
            const status = adj > 0 ? 'สูญหาย' : 'สต็อกเพิ่ม';
            const factoryWeight = Number(item.weight || 0) - adj;
            
            return [
                item.date,
                item.buyerName,
                item.id?.substring(0, 8),
                item.rubberType === 'latex' ? 'น้ำยางสด' : 'ขี้ยาง',
                item.weight,
                factoryWeight,
                adj > 0 ? `-${adj}` : `+${Math.abs(adj)}`,
                status
            ];
        });

        const csvContent = "\uFEFF" + [headers.join(','), ...data.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Stock_Adjustments_${startDate}_to_${endDate}.csv`;
        link.click();
    };

    const paginatedData = adjustmentData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const totalPages = Math.ceil(adjustmentData.length / ITEMS_PER_PAGE);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rubber-600"></div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">กำลังดึงข้อมูลการปรับปรุง...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 bg-gray-50/30 min-h-screen pb-20">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    html, body, #root, main, div { overflow: visible !important; height: auto !important; max-height: none !important; }
                    .no-print { display: none !important; }
                    tr { page-break-inside: avoid; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }
            ` }} />
            <div className="no-print space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center space-x-4">
                    <div className="p-4 bg-gradient-to-br from-rubber-500 to-rubber-700 rounded-2xl shadow-xl shadow-rubber-200 ring-4 ring-white">
                        <RefreshCw className="text-white animate-spin-slow" size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">รายงานการปรับปรุงสต็อก</h1>
                        <p className="text-sm font-medium text-gray-400">ตรวจสอบความถูกต้องของเนื้อยางและส่วนต่างจากการขาย</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center space-x-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-rubber-500/20 transition-all flex-1 sm:flex-none">
                        <Calendar className="text-rubber-600" size={18} />
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border-none focus:ring-0 text-sm font-black text-gray-700 p-0 cursor-pointer w-full bg-transparent"
                        />
                    </div>
                    <div className="flex items-center space-x-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-rubber-500/20 transition-all flex-1 sm:flex-none">
                        <Calendar className="text-rubber-600" size={18} />
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border-none focus:ring-0 text-sm font-black text-gray-700 p-0 cursor-pointer w-full bg-transparent"
                        />
                    </div>
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center space-x-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg active:scale-95 w-full sm:w-auto justify-center"
                    >
                        <Download size={18} />
                        <span>CSV</span>
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-100 active:scale-95 w-full sm:w-auto justify-center border border-emerald-700"
                        title="พิมพ์รายงานสรุป"
                    >
                        <Printer size={18} />
                        <span>พิมพ์รายงาน</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Losses */}
                <div className="bg-white rounded-3xl p-6 border border-red-50 shadow-xl shadow-red-100/20 flex items-center group hover:scale-[1.02] transition-all duration-300">
                    <div className="p-4 rounded-2xl bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <TrendingDown size={28} />
                    </div>
                    <div className="ml-5">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">สต็อกขาด (สูญหายรวม)</p>
                        <div className="flex items-baseline space-x-2">
                            <h3 className="text-2xl font-black text-gray-900">-{stats.totalLoss.toLocaleString()}</h3>
                            <span className="text-xs font-bold text-gray-400">กก.</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">ทั้งหมด {stats.lossCount} รายการ</p>
                    </div>
                </div>

                {/* Total Gains */}
                <div className="bg-white rounded-3xl p-6 border border-emerald-50 shadow-xl shadow-emerald-100/20 flex items-center group hover:scale-[1.02] transition-all duration-300">
                    <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <TrendingUp size={28} />
                    </div>
                    <div className="ml-5">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">สต็อกเกิน (กำไรเนื้อยางรวม)</p>
                        <div className="flex items-baseline space-x-2">
                            <h3 className="text-2xl font-black text-gray-900">+{stats.totalGain.toLocaleString()}</h3>
                            <span className="text-xs font-bold text-gray-400">กก.</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">ทั้งหมด {stats.gainCount} รายการ</p>
                    </div>
                </div>

                {/* Net Adjustment */}
                <div className={`rounded-3xl p-6 shadow-xl flex items-center group hover:scale-[1.02] transition-all duration-300
                    ${stats.netAdjustment >= 0 
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-200' 
                        : 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-red-200'}`}>
                    <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-md">
                        <PackageCheck size={28} />
                    </div>
                    <div className="ml-5">
                        <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">ส่วนต่างสุทธิ</p>
                        <div className="flex items-baseline space-x-2">
                            <h3 className="text-2xl font-black">{stats.netAdjustment.toLocaleString()}</h3>
                            <span className="text-xs font-bold text-white/60">กก.</span>
                        </div>
                        <p className="text-[10px] text-white/50 font-bold mt-1">อ้างอิงจากยอดขาย {adjustmentData.length} รายการ</p>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text"
                        placeholder="ค้นหาชื่อโรงงาน หรือ รหัสอ้างอิง..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-rubber-500/20 transition-all"
                    />
                </div>
                <div className="flex items-center space-x-2 px-4 border-l border-gray-100 hidden sm:flex">
                    <Filter className="text-gray-400" size={18} />
                    <span className="text-xs font-black text-gray-400 uppercase">กรองข้อมูล</span>
                </div>
            </div>

            {/* Adjustment Table */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-[#1e293b] text-white">
                            <tr>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px]">วันที่</th>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px]">โรงงาน / ผู้ซื้อ</th>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px] text-center">ประเภท</th>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px] text-right">บันทึก</th>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px] text-right">โรงงานจริง</th>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px] text-right bg-gray-800">ส่วนต่าง</th>
                                <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px] text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center space-y-3">
                                            <div className="p-4 bg-gray-50 rounded-full">
                                                <AlertCircle className="text-gray-300" size={40} />
                                            </div>
                                            <p className="text-gray-400 font-bold">ไม่พบข้อมูลการปรับปรุงในช่วงเวลาที่เลือก</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((item, idx) => {
                                    const adj = Number(item.lossWeight || 0);
                                    const factoryWeight = Number(item.weight || 0) - adj;
                                    const isLoss = adj > 0;
                                    
                                    return (
                                        <tr key={item.id || idx} className="hover:bg-gray-50/80 transition-all group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors">
                                                        <Calendar size={14} className="text-gray-400" />
                                                    </div>
                                                    <span className="font-black text-gray-900">{format(new Date(item.date), 'dd/MM/yyyy')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="font-black text-gray-900">{item.buyerName}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">REF: {item.id?.substring(0, 8)}</div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                                                    ${item.rubberType === 'latex' 
                                                        ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                                        : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                    {item.rubberType === 'latex' ? 'น้ำยางสด' : 'ขี้ยาง'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right font-mono font-bold text-gray-400">{Number(item.weight || 0).toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right font-mono font-black text-gray-900">{factoryWeight.toLocaleString()}</td>
                                            <td className={`px-6 py-5 text-right font-mono font-black text-lg
                                                ${isLoss ? 'text-red-600 bg-red-50/30' : 'text-emerald-600 bg-emerald-50/30'}`}>
                                                {isLoss ? '-' : '+'}{Math.abs(adj).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className={`inline-flex items-center space-x-1 font-black text-[10px] uppercase tracking-widest
                                                    ${isLoss ? 'text-red-500' : 'text-emerald-600'}`}>
                                                    {isLoss ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                                    <span>{isLoss ? 'สูญหาย' : 'สต็อกเพิ่ม'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-6 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            แสดง {Math.min(adjustmentData.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(adjustmentData.length, currentPage * ITEMS_PER_PAGE)} จาก {adjustmentData.length} รายการ
                        </p>
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-rubber-600 hover:border-rubber-200 disabled:opacity-30 transition-all shadow-sm"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 flex items-center space-x-2 shadow-sm font-black">
                                <span className="text-gray-900">{currentPage}</span>
                                <span className="text-gray-300">/</span>
                                <span className="text-gray-400">{totalPages}</span>
                            </div>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-rubber-600 hover:border-rubber-200 disabled:opacity-30 transition-all shadow-sm"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="flex items-center space-x-3 p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <PieChart size={20} />
                </div>
                <p className="text-xs font-bold text-blue-800 leading-relaxed">
                    <span className="font-black uppercase tracking-wider mr-2">Tip:</span>
                    ตัวเลขในรายงานนี้สรุปจากการบันทึกส่วนต่างในขั้นตอนการ "ขายน้ำยาง" หากน้ำหนักโรงงานน้อยกว่าสต็อกในระบบจะถูกนับเป็น "สูญหาย" และหากมากกว่าจะถูกนับเป็น "สต็อกเพิ่ม" เพื่อใช้ในการกระทบยอดสต็อกปลายงวด
                </p>
            </div>
            {/* Close no-print wrapper */}

            {/* A4 Printable View */}
            <div className="hidden print:block text-black p-4 font-sans bg-white">
                <ReportPrintHeader 
                    settings={settings}
                    title="รายงานการปรับปรุงสต็อกและส่วนต่างน้ำหนัก"
                    subtitle={`ประจำวันที่: ${startDate} ถึง ${endDate}`}
                />

                {/* Summary Stats Box */}
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 border border-black rounded bg-gray-50 text-center text-xs">
                    <div>
                        <span className="block text-[10px] font-bold text-gray-600">สต็อกขาด (สูญหายรวม)</span>
                        <span className="text-sm font-bold text-red-600">-{stats.totalLoss.toLocaleString()} กก. ({stats.lossCount} รายการ)</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-600">สต็อกเกิน (เพิ่มขึ้นรวม)</span>
                        <span className="text-sm font-bold text-emerald-600">+{stats.totalGain.toLocaleString()} กก. ({stats.gainCount} รายการ)</span>
                    </div>
                </div>

                {/* Table Details */}
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black">
                            <th className="border border-black p-1 text-center">ลำดับ</th>
                            <th className="border border-black p-1 text-left">วันที่</th>
                            <th className="border border-black p-1 text-left">โรงงาน/ผู้ซื้อ</th>
                            <th className="border border-black p-1 text-right">น้ำหนักสุทธิ (กก.)</th>
                            <th className="border border-black p-1 text-right">ส่วนต่างสต็อก (กก.)</th>
                            <th className="border border-black p-1 text-center">สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adjustmentData.map((item, idx) => {
                            const loss = Number(item.lossWeight || 0);
                            const isLoss = loss > 0;
                            return (
                                <tr key={item.id || idx} className="border-b border-gray-300">
                                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                                    <td className="border border-black p-1">{item.date}</td>
                                    <td className="border border-black p-1 font-bold">{item.buyerName || item.factoryId}</td>
                                    <td className="border border-black p-1 text-right">{Number(item.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                    <td className="border border-black p-1 text-right font-bold">{isLoss ? `-${loss}` : `+${Math.abs(loss)}`}</td>
                                    <td className="border border-black p-1 text-center font-bold">{isLoss ? 'สต็อกขาด' : 'สต็อกเกิน'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);
};

export default StockAdjustmentReport;
