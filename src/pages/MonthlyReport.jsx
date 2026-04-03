import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
    Calendar, Download, TrendingUp, TrendingDown, 
    Droplets, ShoppingCart, BarChart3, ChevronLeft, 
    ChevronRight, Filter, FileSpreadsheet
} from 'lucide-react';
import { fetchBuyRecords, fetchSellRecords, fetchExpenses, fetchWages, isCached } from '../services/apiService';
import { truncateOneDecimal } from '../utils/calculations';

export const MonthlyReport = () => {
    const [loading, setLoading] = useState(true);
    const [buys, setBuys] = useState([]);
    const [sells, setSells] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [wages, setWages] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!isCached('buys', 'sells', 'expenses', 'wages')) setLoading(true);
        try {
            const [b, s, exp, w] = await Promise.all([
                fetchBuyRecords(),
                fetchSellRecords(),
                fetchExpenses(),
                fetchWages()
            ]);
            setBuys(Array.isArray(b) ? b : []);
            setSells(Array.isArray(s) ? s : []);
            setExpenses(Array.isArray(exp) ? exp : []);
            setWages(Array.isArray(w) ? w : []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const reportData = useMemo(() => {
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);
        const days = eachDayOfInterval({ start, end });

        const dailyData = days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            
            const dayBuys = buys.filter(b => b.date === dateStr);
            const daySells = sells.filter(s => s.date === dateStr);
            const dayExp = expenses.filter(e => e.date === dateStr);
            const dayWage = wages.filter(w => w.date === dateStr);

            const buyTotal = dayBuys.reduce((sum, b) => sum + Number(b.total || 0), 0);
            const sellTotal = daySells.reduce((sum, s) => sum + Number(s.total || 0), 0);
            const expTotal = dayExp.reduce((sum, e) => sum + Number(e.amount || 0), 0) + 
                             dayWage.reduce((sum, w) => sum + Number(w.total || 0), 0);
            
            const profit = sellTotal - buyTotal - expTotal;

            return {
                date: day,
                dateStr,
                buyTotal,
                sellTotal,
                expTotal,
                profit
            };
        });

        const totalBuy = dailyData.reduce((sum, d) => sum + d.buyTotal, 0);
        const totalSell = dailyData.reduce((sum, d) => sum + d.sellTotal, 0);
        const totalExp = dailyData.reduce((sum, d) => sum + d.expTotal, 0);
        const totalProfit = totalSell - totalBuy - totalExp;

        return {
            dailyData,
            totals: {
                buy: totalBuy,
                sell: totalSell,
                expenses: totalExp,
                profit: totalProfit
            }
        };
    }, [buys, sells, expenses, wages, selectedMonth]);

    const handlePrevMonth = () => {
        setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const exportToCSV = () => {
        const headers = ['วันที่', 'ยอดซื้อ (บาท)', 'ยอดขาย (บาท)', 'ค่าใช้จ่าย (บาท)', 'กำไร/ขาดทุน (บาท)'];
        const rows = reportData.dailyData.map(d => [
            format(d.date, 'dd/MM/yyyy'),
            d.buyTotal.toFixed(2),
            d.sellTotal.toFixed(2),
            d.expTotal.toFixed(2),
            d.profit.toFixed(2)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `รายงานยอดขาย_${format(selectedMonth, 'MMMM_yyyy', { locale: th })}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center">
                        <BarChart3 className="mr-3 text-rubber-600" size={28} />
                        รายงานยอดขายประจำเดือน
                    </h1>
                    <p className="text-gray-500 font-medium">สรุปรายรับ-รายจ่ายรายวัน ประจำเดือน {format(selectedMonth, 'MMMM yyyy', { locale: th })}</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="px-4 py-1 text-sm font-black text-gray-900 min-w-[140px] text-center">
                            {format(selectedMonth, 'MMMM yyyy', { locale: th })}
                        </span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <button 
                        onClick={exportToCSV}
                        className="flex items-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-md shadow-green-100 text-sm whitespace-nowrap"
                    >
                        <FileSpreadsheet size={18} className="mr-2" />
                        Export CSV
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rubber-600"></div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <ShoppingCart size={12} className="mr-2 text-blue-500" /> ยอดรับซื้อรวม
                                </p>
                                <p className="text-2xl font-black text-gray-900 italic">
                                    ฿{reportData.totals.buy.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-orange-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <TrendingUp size={12} className="mr-2 text-orange-500" /> ยอดขายรวม
                                </p>
                                <p className="text-2xl font-black text-gray-900 italic">
                                    ฿{reportData.totals.sell.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500 z-0"></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <TrendingDown size={12} className="mr-2 text-red-500" /> ค่าใช้จ่ายรวม
                                </p>
                                <p className="text-2xl font-black text-gray-900 italic">
                                    ฿{reportData.totals.expenses.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </p>
                            </div>
                        </div>

                        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden group transition-all ${reportData.totals.profit >= 0 ? 'bg-white border-gray-100' : 'bg-red-50 border-red-100'}`}>
                            <div className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full group-hover:scale-150 transition-transform duration-500 z-0 ${reportData.totals.profit >= 0 ? 'bg-green-50' : 'bg-red-100/50'}`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    {reportData.totals.profit >= 0 ? <TrendingUp size={12} className="mr-2 text-green-500" /> : <TrendingDown size={12} className="mr-2 text-red-500" />}
                                    กำไรสุทธิจริง
                                </p>
                                <p className={`text-2xl font-black italic ${reportData.totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {reportData.totals.profit >= 0 ? '+' : ''}฿{reportData.totals.profit.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Table section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">รายละเอียดรายวัน</h3>
                            <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-tighter">
                                <Filter size={12} className="mr-1.5" /> แสดงข้อมูลเฉพาะวันที่มีความเคลื่อนไหว
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">วันที่</th>
                                        <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">ยอดรับซื้อ (฿)</th>
                                        <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">ยอดขาย (฿)</th>
                                        <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">ค่าใช้จ่าย (฿)</th>
                                        <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">สุทธิ (฿)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {reportData.dailyData.filter(d => d.buyTotal > 0 || d.sellTotal > 0 || d.expTotal > 0).map((day, idx) => (
                                        <tr key={day.dateStr} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-900">{format(day.date, 'dd MMMM yyyy', { locale: th })}</div>
                                                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{format(day.date, 'EEEE', { locale: th })}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-sm font-bold text-blue-600">
                                                    {day.buyTotal > 0 ? day.buyTotal.toLocaleString(undefined, { minimumFractionDigits: 1 }) : '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-sm font-bold text-orange-600">
                                                    {day.sellTotal > 0 ? day.sellTotal.toLocaleString(undefined, { minimumFractionDigits: 1 }) : '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-red-500 text-sm font-bold">
                                                {day.expTotal > 0 ? day.expTotal.toLocaleString(undefined, { minimumFractionDigits: 1 }) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className={`text-sm font-black ${day.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {day.profit !== 0 ? (day.profit > 0 ? '+' : '') + day.profit.toLocaleString(undefined, { minimumFractionDigits: 1 }) : '0.0'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {reportData.dailyData.filter(d => d.buyTotal > 0 || d.sellTotal > 0 || d.expTotal > 0).length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">
                                                ไม่มีรายการเคลื่อนไหวในเดือนนี้
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-gray-900 text-white">
                                    <tr>
                                        <td className="px-6 py-4 font-black text-sm">ยอดรวมทั้งเดือน</td>
                                        <td className="px-6 py-4 text-right font-black text-sm text-blue-400">
                                            {reportData.totals.buy.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-sm text-orange-400">
                                            {reportData.totals.sell.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-sm text-red-400">
                                            {reportData.totals.expenses.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-black text-sm ${reportData.totals.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {reportData.totals.profit.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MonthlyReport;
