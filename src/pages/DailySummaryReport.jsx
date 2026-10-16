import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { 
    Calendar, Droplets, Truck, Wallet, 
    Download, PieChart, Users, Printer,
    FileDown, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    fetchBuyRecords, 
    fetchSellRecords, 
    fetchExpenses, 
    fetchWages, 
    getSettings 
} from '../services/apiService';
import { truncateOneDecimal } from '../utils/calculations';
import { exportElementToPDF } from '../utils/pdfExport';

import LatexBuysTab from './reports/daily-summary/LatexBuysTab';
import CupLumpBuysTab from './reports/daily-summary/CupLumpBuysTab';
import SellsReportTab from './reports/daily-summary/SellsReportTab';
import ExpensesReportTab from './reports/daily-summary/ExpensesReportTab';
import TeamSummaryReportTab from './reports/daily-summary/TeamSummaryReportTab';
import DailyReportFooter from './reports/daily-summary/DailyReportFooter';
import DailyReportPrintView from './reports/daily-summary/DailyReportPrintView';

const DailySummaryReport = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [activeTab, setActiveTab] = useState('buys_latex'); // buys_latex, buys_cup_lump, sells, expenses, buys_team
    const [expandedCreator, setExpandedCreator] = useState(null);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const ITEMS_PER_PAGE = 15;

    // Reset page on tab/date change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, startDate, endDate]);
    
    const [buys, setBuys] = useState([]);
    const [sells, setSells] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [wages, setWages] = useState([]);
    const [settings, setSettings] = useState({});

    useEffect(() => {
        loadData();
    }, [startDate, endDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const dateParams = { startDate, endDate };
            const [b, s, e, w, setRes] = await Promise.all([
                fetchBuyRecords(true, dateParams),
                fetchSellRecords(true, dateParams),
                fetchExpenses(dateParams, true),
                fetchWages(dateParams, true),
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

    const recNetWeight = (b) => b.netWeight || (Number(b.weight || 0) - Number(b.bucketWeight || 0));

    const dailyData = useMemo(() => {
        const filterFn = item => {
            const itemDate = (item.date || '').substring(0, 10);
            return itemDate >= startDate && itemDate <= endDate;
        };
        
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

    const teamSummary = useMemo(() => {
        const groups = {};
        
        dailyData.buys.forEach(b => {
            const creator = b.createdBy || 'ไม่ระบุ (หรือเจ้าของร้าน)';
            if (!groups[creator]) {
                groups[creator] = {
                    creator,
                    billsCount: 0,
                    totalWeight: 0,
                    totalNetWeight: 0,
                    totalDryRubber: 0,
                    totalAmount: 0,
                    records: []
                };
            }
            const netW = Number(recNetWeight(b));
            groups[creator].billsCount += 1;
            groups[creator].totalWeight += Number(b.weight || 0);
            groups[creator].totalNetWeight += netW;
            if ((b.rubberType || 'latex') === 'latex') {
                groups[creator].totalDryRubber += Number(b.dryRubber || b.dryWeight || 0);
            }
            groups[creator].totalAmount += Number(b.total || 0);
            groups[creator].records.push(b);
        });
        
        return Object.values(groups).sort((a, b) => b.totalAmount - a.totalAmount);
    }, [dailyData.buys]);

    const handleExportCSV = () => {
        let data = [];
        let filename = `Report_${startDate}_to_${endDate}_${activeTab}.csv`;
        let headers = [];

        if (activeTab === 'buys_latex' || activeTab === 'buys_cup_lump') {
            const isCupLumpTab = activeTab === 'buys_cup_lump';
            const filteredBuys = dailyData.buys.filter(b => {
                const type = b.rubberType || 'latex';
                return isCupLumpTab ? (type === 'cup_lump' || type === 'ขี้ยาง') : (type === 'latex');
            });

            if (isCupLumpTab) {
                headers = ['เกษตรกร', 'รหัส', 'น้ำหนักรวม', 'ถัง', 'น้ำหนักสุทธิ', 'ราคาซื้อ', 'ยอดเงินรวม', 'แบ่งเกษตรกร', 'ยอดเกษตรกร', 'แบ่งลูกจ้าง', 'ยอดลูกจ้าง'];
                data = filteredBuys.map(b => [
                    b.farmerName,
                    b.farmerId || '-',
                    b.weight,
                    b.bucketWeight || 0,
                    Number(b.netWeight || (Number(b.weight || 0) - Number(b.bucketWeight || 0))),
                    b.pricePerKg,
                    b.total,
                    `${100 - (Number(b.empPct) || 0)}%`,
                    b.farmerTotal,
                    `${b.empPct || 0}%`,
                    b.employeeTotal
                ]);
                
                const totalWeight = filteredBuys.reduce((sum, b) => sum + Number(b.weight || 0), 0);
                const totalNet = filteredBuys.reduce((sum, b) => sum + Number(b.netWeight || (Number(b.weight || 0) - Number(b.bucketWeight || 0))), 0);
                const totalValue = filteredBuys.reduce((sum, b) => sum + Number(b.total || 0), 0);
                const totalFarmer = filteredBuys.reduce((sum, b) => sum + Number(b.farmerTotal || 0), 0);
                const totalEmp = filteredBuys.reduce((sum, b) => sum + Number(b.employeeTotal || 0), 0);

                data.push(['รวม', '-', totalWeight, '-', totalNet, '-', totalValue, '-', totalFarmer, '-', totalEmp]);
            } else {
                headers = ['เกษตรกร', 'รหัส', 'น้ำหนักรวม', 'ถัง', 'น้ำหนักสุทธิ', '%DRC', 'ยางแห้ง', 'ราคาซื้อ', 'ยอดเงินรวม', 'แบ่งเกษตรกร', 'ยอดเกษตรกร', 'แบ่งลูกจ้าง', 'ยอดลูกจ้าง'];
                data = filteredBuys.map(b => [
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

                const totalWeight = filteredBuys.reduce((sum, b) => sum + Number(b.weight || 0), 0);
                const totalNet = filteredBuys.reduce((sum, b) => sum + Number(b.netWeight || (Number(b.weight || 0) - Number(b.bucketWeight || 0))), 0);
                const totalDry = filteredBuys.reduce((sum, b) => sum + Number(b.dryRubber || b.dryWeight || 0), 0);
                const totalValue = filteredBuys.reduce((sum, b) => sum + Number(b.total || 0), 0);
                const totalFarmer = filteredBuys.reduce((sum, b) => sum + Number(b.farmerTotal || 0), 0);
                const totalEmp = filteredBuys.reduce((sum, b) => sum + Number(b.employeeTotal || 0), 0);
                
                const avgDrc = totalNet > 0 ? truncateOneDecimal((totalDry / totalNet) * 100) : 0;
                const avgPrice = totalDry > 0 ? (totalValue / totalDry) : 0;

                data.push(['รวม/เฉลี่ย', '-', totalWeight, '-', totalNet, avgDrc.toFixed(1) + '%', totalDry, avgPrice.toFixed(1), totalValue, '-', totalFarmer, '-', totalEmp]);
            }
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
        } else if (activeTab === 'buys_team') {
            headers = ['ผู้บันทึกรายการ', 'จำนวนบิล', 'น้ำหนักสุทธิรวม (กก.)', 'เนื้อยางแห้งรวม (กก.)', 'ยอดเงินรวม (บาท)'];
            data = teamSummary.map(t => [
                t.creator,
                t.billsCount,
                t.totalNetWeight,
                t.totalDryRubber,
                t.totalAmount
            ]);
            
            const totalBills = teamSummary.reduce((sum, t) => sum + t.billsCount, 0);
            const totalNet = teamSummary.reduce((sum, t) => sum + t.totalNetWeight, 0);
            const totalDry = teamSummary.reduce((sum, t) => sum + t.totalDryRubber, 0);
            const totalAmount = teamSummary.reduce((sum, t) => sum + t.totalAmount, 0);
            
            data.push(['รวมทั้งหมด', totalBills, totalNet, totalDry, totalAmount]);
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

    const handleExportPDF = async () => {
        const printViewEl = document.getElementById('daily-report-print-view');
        if (!printViewEl) {
            return toast.error('ไม่พบส่วนแสดงผลสำหรับออกรายงาน PDF');
        }
        setIsExportingPDF(true);
        const toastId = toast.loading('กำลังสร้างไฟล์ PDF รายงาน...');
        try {
            const filename = `Report_${startDate}_to_${endDate}.pdf`;
            await exportElementToPDF(printViewEl, filename);
            toast.success('ดาวน์โหลดไฟล์ PDF เรียบร้อยแล้ว', { id: toastId });
        } catch (err) {
            toast.error('สร้างไฟล์ PDF ไม่สำเร็จ: ' + err.message, { id: toastId });
        } finally {
            setIsExportingPDF(false);
        }
    };

    const tabs = [
        { id: 'buys_latex', name: 'น้ำยางสด', icon: <Droplets size={18} /> },
        { id: 'buys_cup_lump', name: 'ขี้ยาง', icon: <Droplets size={18} className="text-orange-500" /> },
        { id: 'sells', name: 'ยอดขาย', icon: <Truck size={18} /> },
        { id: 'expenses', name: 'รายจ่าย', icon: <Wallet size={18} /> },
        { id: 'buys_team', name: 'สรุปยอดซื้อทีม', icon: <Users size={18} /> }
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
                            className="flex items-center space-x-2 bg-gray-900 text-white px-4 py-2.5 rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-95 w-full sm:w-auto justify-center"
                        >
                            <Download size={18} />
                            <span className="hidden lg:inline">ออกรายงาน (CSV)</span>
                        </button>
                        <button 
                            onClick={handleExportPDF}
                            disabled={isExportingPDF}
                            className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white px-4 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-rose-200 active:scale-95 w-full sm:w-auto justify-center border border-rose-700"
                            title="ดาวน์โหลดรายงานสรุปเป็นไฟล์ PDF"
                        >
                            {isExportingPDF ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                            <span className="hidden lg:inline">{isExportingPDF ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
                        </button>
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-200 active:scale-95 w-full sm:w-auto justify-center border border-emerald-700"
                            title="พิมพ์รายงานสรุป"
                        >
                            <Printer size={18} />
                            <span className="hidden lg:inline">พิมพ์รายงาน</span>
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
                    {activeTab === 'buys_latex' && (
                        <LatexBuysTab
                            dailyData={dailyData}
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            itemsPerPage={ITEMS_PER_PAGE}
                        />
                    )}

                    {activeTab === 'buys_cup_lump' && (
                        <CupLumpBuysTab
                            dailyData={dailyData}
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            itemsPerPage={ITEMS_PER_PAGE}
                        />
                    )}

                    {activeTab === 'sells' && (
                        <SellsReportTab
                            dailyData={dailyData}
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            itemsPerPage={ITEMS_PER_PAGE}
                        />
                    )}

                    {activeTab === 'expenses' && (
                        <ExpensesReportTab
                            dailyData={dailyData}
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            itemsPerPage={ITEMS_PER_PAGE}
                        />
                    )}

                    {activeTab === 'buys_team' && (
                        <TeamSummaryReportTab
                            teamSummary={teamSummary}
                            expandedCreator={expandedCreator}
                            setExpandedCreator={setExpandedCreator}
                        />
                    )}
                </div>

                {/* Daily Overall Summary Footer */}
                <DailyReportFooter dailyData={dailyData} user={user} />
            </div>

            {/* A4 Printable View */}
            <DailyReportPrintView 
                settings={settings}
                startDate={startDate}
                endDate={endDate}
                dailyData={dailyData}
            />
        </div>
    );
};

export default DailySummaryReport;
