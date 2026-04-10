import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
    Calendar, Droplets, Truck, Wallet, Filter, 
    Download, ChevronRight, Calculator, PieChart, 
    Target, User, Users, FileText
} from 'lucide-react';
import { 
    fetchBuyRecords, 
    fetchSellRecords, 
    fetchExpenses, 
    fetchWages, 
    getSettings 
} from '../services/apiService';
import { truncateOneDecimal } from '../utils/calculations';

const DailySummaryReport = () => {
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [activeTab, setActiveTab] = useState('buys'); // buys, sells, expenses
    
    const [buys, setBuys] = useState([]);
    const [sells, setSells] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [wages, setWages] = useState([]);
    const [settings, setSettings] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [b, s, e, w, setRes] = await Promise.all([
                fetchBuyRecords(),
                fetchSellRecords(),
                fetchExpenses(),
                fetchWages(),
                getSettings()
            ]);
            
            setBuys(Array.isArray(b) ? b : []);
            setSells(Array.isArray(s) ? s : []);
            setExpenses(Array.isArray(e) ? e : []);
            setWages(Array.isArray(w) ? w : []);
            if (setRes && setRes.status === 'success') {
                setSettings(setRes.data || {});
            }
        } catch (error) {
            console.error('Error loading report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const dailyData = useMemo(() => {
        const filterFn = item => item.date >= startDate && item.date <= endDate;
        
        // Sort buys by Farmer ID
        const filteredBuys = buys.filter(filterFn).sort((a, b) => {
            const idA = String(a.farmerId || '');
            const idB = String(b.farmerId || '');
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });

        const filteredSells = sells.filter(filterFn);
        const filteredExpenses = expenses.filter(filterFn);
        const filteredWages = wages.filter(filterFn);
        
        return {
            buys: filteredBuys,
            sells: filteredSells,
            expenses: filteredExpenses,
            wages: filteredWages
        };
    }, [buys, sells, expenses, wages, startDate, endDate]);

    const handleExportCSV = () => {
        let data = [];
        let filename = `Report_${startDate}_to_${endDate}_${activeTab}.csv`;
        let headers = [];

        if (activeTab === 'buys') {
            headers = ['เกษตรกร', 'รหัส', 'น้ำหนักรวม', 'ถัง', 'น้ำหนักสุทธิ', '%DRC', 'ยางแห้ง', 'ราคาซื้อ', 'ยอดเงินรวม', 'แบ่งเกษตรกร', 'ยอดเกษตรกร', 'แบ่งลูกจ้าง', 'ยอดลูกจ้าง'];
            data = dailyData.buys.map(b => [
                b.farmerName,
                b.farmerId || '-',
                b.weight,
                b.bucketWeight || 0,
                Number(b.netWeight || (Number(b.weight || 0) - Number(b.bucketWeight || 0))),
                b.drc,
                b.dryRubber || b.dryWeight || 0,
                b.pricePerKg,
                b.total,
                `${100 - (Number(b.empPct) || 0)}%`,
                b.farmerTotal,
                `${b.empPct || 0}%`,
                b.employeeTotal
            ]);
            // Calculate Totals for CSV
            const totalWeight = dailyData.buys.reduce((sum, b) => sum + Number(b.weight || 0), 0);
            const totalBucket = dailyData.buys.reduce((sum, b) => sum + Number(b.bucketWeight || 0), 0);
            const totalNet = dailyData.buys.reduce((sum, b) => sum + Number(b.netWeight || (Number(b.weight || 0) - Number(b.bucketWeight || 0))), 0);
            const totalDry = dailyData.buys.reduce((sum, b) => sum + Number(b.dryRubber || b.dryWeight || 0), 0);
            const totalValue = dailyData.buys.reduce((sum, b) => sum + Number(b.total || 0), 0);
            const totalFarmer = dailyData.buys.reduce((sum, b) => sum + Number(b.farmerTotal || 0), 0);
            const totalEmp = dailyData.buys.reduce((sum, b) => sum + Number(b.employeeTotal || 0), 0);
            
            const avgDrc = totalNet > 0 ? (totalDry / totalNet) * 100 : 0;
            const avgPrice = totalDry > 0 ? (totalValue / totalDry) : 0;

            const totalRow = [
                'รวม/เฉลี่ย',
                '-',
                totalWeight,
                totalBucket,
                totalNet,
                avgDrc.toFixed(1) + '%',
                totalDry,
                avgPrice.toFixed(1),
                totalValue,
                '-',
                totalFarmer,
                '-',
                totalEmp
            ];
            data.push(totalRow);
        } else if (activeTab === 'sells') {
            headers = ['ผู้ซื้อ', 'รถขนส่ง', 'น้ำหนักรวม', 'DRC', 'น้ำยางแห้ง', 'ราคาขาย', 'ยอดขายสุทธิ'];
            data = dailyData.sells.map(s => [
                s.buyerName,
                s.truckInfo || '-',
                s.weight,
                s.drc,
                (Number(s.weight || 0) * Number(s.drc || 0) / 100),
                s.pricePerKg,
                s.total
            ]);
            
            // Add totals for Sells
            const totalWeight = dailyData.sells.reduce((sum, s) => sum + Number(s.weight || 0), 0);
            const totalDry = dailyData.sells.reduce((sum, s) => sum + (Number(s.weight || 0) * Number(s.drc || 0) / 100), 0);
            const totalValue = dailyData.sells.reduce((sum, s) => sum + Number(s.total || 0), 0);
            
            data.push([
                'รวม',
                '-',
                totalWeight,
                '-',
                totalDry,
                '-',
                totalValue
            ]);
        } else {
            headers = ['รายการ', 'หมวดหมู่', 'จำนวนเงิน'];
            const ex = dailyData.expenses.map(e => [e.title, e.category || 'ทั่วไป', e.amount]);
            const wa = dailyData.wages.map(w => [w.staffName || 'พนักงาน', 'ค่าจ้าง', w.total]);
            data = [...ex, ...wa];
        }

        const csvContent = "\uFEFF" + [headers.join(','), ...data.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const tabs = [
        { id: 'buys', name: 'ยอดรับซื้อ', icon: <Droplets size={18} /> },
        { id: 'sells', name: 'ยอดขาย', icon: <Truck size={18} /> },
        { id: 'expenses', name: 'รายจ่าย', icon: <Wallet size={18} /> }
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rubber-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 bg-gray-50/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-rubber-600 rounded-2xl shadow-lg shadow-rubber-200">
                        <PieChart className="text-white" size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">รายงานสรุปข้อมูล</h1>
                        <p className="text-sm font-medium text-gray-400">สรุปรายละเอียดการซื้อขายและรายจ่ายตามช่วงเวลา</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex items-center space-x-2 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-rubber-500/20 transition-all">
                        <Calendar className="text-rubber-600" size={18} />
                        <span className="text-[10px] font-black text-gray-400 uppercase">เริ่ม</span>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border-none focus:ring-0 text-sm font-black text-gray-700 p-0 cursor-pointer"
                        />
                    </div>
                    <div className="flex items-center space-x-2 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-rubber-500/20 transition-all">
                        <Calendar className="text-rubber-600" size={18} />
                        <span className="text-[10px] font-black text-gray-400 uppercase">สิ้นสุด</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="border-none focus:ring-0 text-sm font-black text-gray-700 p-0 cursor-pointer"
                        />
                    </div>
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center space-x-2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-95 w-full sm:w-auto justify-center"
                    >
                        <Download size={18} />
                        <span className="hidden lg:inline">ออกรายงาน (CSV)</span>
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex p-1.5 bg-gray-200/50 backdrop-blur-md rounded-2xl w-fit border border-gray-200/50">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-black transition-all duration-300
                            ${activeTab === tab.id 
                                ? 'bg-white text-rubber-700 shadow-md transform scale-105' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}
                    >
                        {tab.icon}
                        <span>{tab.name}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden transition-all">
                {activeTab === 'buys' && (
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
                                {dailyData.buys.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="px-5 py-20 text-center text-gray-400 font-medium">ไม่พบข้อมูลการรับซื้อในวันที่เลือก</td>
                                    </tr>
                                ) : (
                                    dailyData.buys.map((b, idx) => {
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
                                                <td className="px-5 py-4 text-right font-black text-emerald-700 font-mono bg-emerald-50/30 animate-pulse-subtle">฿{Number(b.farmerTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                                <td className="px-5 py-4 text-right text-[10px] text-gray-400 font-black">{Number(b.empPct || 0)}%</td>
                                                <td className="px-5 py-4 text-right font-black text-orange-700 font-mono bg-orange-50/30">฿{Number(b.employeeTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {dailyData.buys.length > 0 && (
                                <tfoot className="bg-gray-900 text-white font-black border-t-4 border-rubber-600">
                                    <tr className="divide-x divide-white/10 uppercase text-sm tracking-tight">
                                        {(() => {
                                            const totalWeight = dailyData.buys.reduce((sum, b) => sum + Number(b.weight || 0), 0);
                                            const totalBucket = dailyData.buys.reduce((sum, b) => sum + Number(b.bucketWeight || 0), 0);
                                            const totalNet = dailyData.buys.reduce((sum, b) => sum + Number(b.netWeight || (Number(b.weight || 0) - Number(b.bucketWeight || 0))), 0);
                                            const totalDry = dailyData.buys.reduce((sum, b) => sum + Number(b.dryRubber || b.dryWeight || 0), 0);
                                            const totalValue = dailyData.buys.reduce((sum, b) => sum + Number(b.total || 0), 0);
                                            const totalFarmer = dailyData.buys.reduce((sum, b) => sum + Number(b.farmerTotal || 0), 0);
                                            const totalEmp = dailyData.buys.reduce((sum, b) => sum + Number(b.employeeTotal || 0), 0);
                                            
                                            // Averages (Weighted)
                                            const avgDrc = totalNet > 0 ? (totalDry / totalNet) * 100 : 0;
                                            const avgPrice = totalDry > 0 ? (totalValue / totalDry) : 0;

                                            return (
                                                <>
                                                    <td className="px-5 py-5 text-rubber-400">ยอดรวม {dailyData.buys.length} บิล</td>
                                                    <td className="px-5 py-5 text-right font-mono text-gray-400">{totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                                    <td className="px-5 py-5 text-right font-mono text-red-400">-{totalBucket.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                                    <td className="px-5 py-5 text-right font-mono text-white bg-gray-800">
                                                        {totalNet.toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                                    </td>
                                                    <td className="px-5 py-5 text-center">
                                                        <div className="text-[10px] text-gray-400 leading-none mb-1">เฉลี่ย</div>
                                                        <span className="text-blue-300">{avgDrc.toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                                    </td>
                                                    <td className="px-5 py-5 text-right font-mono text-blue-400 bg-blue-900/50">
                                                        {totalDry.toLocaleString(undefined, { minimumFractionDigits: 1 })} 
                                                    </td>
                                                    <td className="px-5 py-5 text-right">
                                                        <div className="text-[10px] text-gray-400 leading-none mb-1">เฉลี่ย</div>
                                                        <span className="text-gray-300">฿{avgPrice.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                                                    </td>
                                                    <td className="px-5 py-5 text-right font-mono text-rubber-400">฿{totalValue.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                                    <td className="px-5 py-5"></td>
                                                    <td className="px-5 py-5 text-right font-mono text-emerald-400 bg-emerald-900/50">฿{totalFarmer.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                                    <td className="px-5 py-5"></td>
                                                    <td className="px-5 py-5 text-right font-mono text-orange-400 bg-orange-900/50">฿{totalEmp.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                                </>
                                            );
                                        })()}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}

                {activeTab === 'sells' && (
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
                                    dailyData.sells.map((s, idx) => (
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
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                        {/* General Expenses */}
                        <div className="p-0">
                            <div className="bg-[#1e293b] px-8 py-5 flex justify-between items-center text-white">
                                <h3 className="font-black flex items-center tracking-tight">
                                    <Wallet size={20} className="mr-3 text-red-400" />
                                    ค่าใช้จ่ายทั่วไป
                                </h3>
                                <span className="bg-red-500/20 text-red-400 px-5 py-2 rounded-2xl text-base font-black shadow-inner border border-red-500/20">
                                    รวม: ฿{dailyData.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <tbody className="divide-y divide-gray-100">
                                        {dailyData.expenses.length === 0 ? (
                                            <tr>
                                                <td className="px-8 py-20 text-center text-gray-400 font-medium italic">ไม่มีข้อมูลค่าใช้จ่ายทั่วไป</td>
                                            </tr>
                                        ) : (
                                            dailyData.expenses.map((e, idx) => (
                                                <tr key={e.id || idx} className="hover:bg-red-50/30 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className="font-black text-gray-900 group-hover:text-red-700 transition-colors">{e.title}</div>
                                                        <div className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{e.category || 'ทั่วไป'}</div>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-black text-red-600 font-mono text-base">฿{Number(e.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Wages */}
                        <div className="p-0">
                            <div className="bg-[#1e293b] px-8 py-5 flex justify-between items-center text-white border-l border-white/10">
                                <h3 className="font-black flex items-center tracking-tight">
                                    <Users size={20} className="mr-3 text-orange-400" />
                                    ค่าจ้างพนักงาน
                                </h3>
                                <span className="bg-orange-500/20 text-orange-400 px-5 py-2 rounded-2xl text-base font-black shadow-inner border border-orange-500/20">
                                    รวม: ฿{dailyData.wages.reduce((sum, w) => sum + Number(w.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <tbody className="divide-y divide-gray-100">
                                        {dailyData.wages.length === 0 ? (
                                            <tr>
                                                <td className="px-8 py-20 text-center text-gray-400 font-medium italic">ไม่มีข้อมูลค่าจ้างพนักงาน</td>
                                            </tr>
                                        ) : (
                                            dailyData.wages.map((w, idx) => (
                                                <tr key={w.id || idx} className="hover:bg-orange-50/30 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className="font-black text-gray-900 group-hover:text-orange-700 transition-colors">{w.staffName || 'พนักงาน'}</div>
                                                        <div className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{w.role || 'ลูกจ้าง'}</div>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-black text-orange-600 font-mono text-base">฿{Number(w.total || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Daily Overall Summary Footer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pb-12">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-between group hover:border-blue-500 transition-all hover:-translate-y-1">
                    <div className="flex items-center space-x-5">
                        <div className="p-4 bg-blue-50 rounded-2xl group-hover:bg-blue-600 transition-colors duration-500 shadow-inner group-hover:rotate-6">
                            <Droplets className="text-blue-600 group-hover:text-white transition-colors duration-500" size={32} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">ยอดรับซื้อรวม</p>
                            <p className="text-4xl font-black text-gray-900">฿{dailyData.buys.reduce((sum, b) => sum + Number(b.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex items-center justify-between group hover:border-orange-500 transition-all hover:-translate-y-1">
                    <div className="flex items-center space-x-5">
                        <div className="p-4 bg-orange-50 rounded-2xl group-hover:bg-orange-600 transition-colors duration-500 shadow-inner group-hover:-rotate-6">
                            <Truck className="text-orange-600 group-hover:text-white transition-colors duration-500" size={32} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">ยอดขายรวม</p>
                            <p className="text-4xl font-black text-gray-900">฿{dailyData.sells.reduce((sum, s) => sum + Number(s.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
                        </div>
                    </div>
                </div>

                <div className={`p-8 rounded-[2.5rem] border shadow-2xl transition-all transform hover:scale-105 duration-500 cursor-default shadow-rubber-200/50
                    ${(dailyData.sells.reduce((sum, s) => sum + Number(s.total || 0), 0) - dailyData.buys.reduce((sum, b) => sum + Number(b.total || 0), 0) - dailyData.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0) - dailyData.wages.reduce((sum, w) => sum + Number(w.total || 0), 0)) >= 0
                        ? 'bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] border-emerald-400 ring-8 ring-emerald-50' 
                        : 'bg-gradient-to-br from-red-600 via-red-700 to-red-800 border-red-500 ring-8 ring-red-50'}`}>
                    <div className="flex items-center space-x-5">
                        <div className="p-4 bg-white/20 rounded-2xl shadow-lg backdrop-blur-md animate-bounce-subtle"><PieChart className="text-white" size={32} /></div>
                        <div>
                            <p className="text-xs font-black text-white/70 uppercase tracking-[0.2em] mb-1">กำไรสุทธิวันนี้</p>
                            <p className="text-4xl font-black text-white drop-shadow-md">
                                ฿{(dailyData.sells.reduce((sum, s) => sum + Number(s.total || 0), 0) - dailyData.buys.reduce((sum, b) => sum + Number(b.total || 0), 0) - dailyData.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0) - dailyData.wages.reduce((sum, w) => sum + Number(w.total || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailySummaryReport;
