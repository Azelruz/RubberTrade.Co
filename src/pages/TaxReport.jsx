import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
    Download, FileText, Calendar, ArrowUpRight, ArrowDownLeft, 
    TrendingUp, TrendingDown, DollarSign, Briefcase, Award, Layers 
} from 'lucide-react';
import { 
    fetchBuyRecords, fetchSellRecords, fetchFactories, 
    fetchFarmers, fetchExpenses, fetchWages, isCached 
} from '../services/apiService';
import toast from 'react-hot-toast';

export const TaxReport = () => {
    const [loading, setLoading] = useState(true);
    const [buys, setBuys] = useState([]);
    const [sells, setSells] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [wages, setWages] = useState([]);
    const [factories, setFactories] = useState([]);
    const [farmers, setFarmers] = useState([]);
    
    // UI states
    const [dateRange, setDateRange] = useState(format(new Date(), 'yyyy-MM'));
    const [activeMainTab, setActiveMainTab] = useState('profit_loss'); // profit_loss, vat_report, withholding_tax
    const [activeVatTab, setActiveVatTab] = useState('purchase'); // purchase, sales

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!isCached('buys', 'sells', 'expenses', 'wages', 'factories', 'farmers')) {
            setLoading(true);
        }
        try {
            const [b, s, e, w, f, fm] = await Promise.all([
                fetchBuyRecords(),
                fetchSellRecords(),
                fetchExpenses(),
                fetchWages(),
                fetchFactories(),
                fetchFarmers()
            ]);
            setBuys(Array.isArray(b) ? b : []);
            setSells(Array.isArray(s) ? s : []);
            setExpenses(Array.isArray(e) ? e : []);
            setWages(Array.isArray(w) ? w : []);
            setFactories(Array.isArray(f) ? f : []);
            setFarmers(Array.isArray(fm) ? fm : []);
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    // Filtered data by selected month
    const filteredData = useMemo(() => {
        const [year, month] = dateRange.split('-');
        const targetDate = new Date(parseInt(year), parseInt(month) - 1);
        const start = startOfMonth(targetDate);
        const end = endOfMonth(targetDate);

        const filterFn = item => {
            if (!item.date) return false;
            const date = parseISO(item.date);
            return isWithinInterval(date, { start, end });
        };

        return {
            buys: buys.filter(filterFn),
            sells: sells.filter(filterFn),
            expenses: expenses.filter(filterFn),
            wages: wages.filter(filterFn)
        };
    }, [buys, sells, expenses, wages, dateRange]);

    // Financial engine calculations for Profit & Loss (งบกำไรขาดทุน)
    const plCalculations = useMemo(() => {
        const data = filteredData;
        
        // 1. Revenue (รายได้จากยอดขายยางส่งโรงงาน)
        const revenue = data.sells.reduce((sum, item) => sum + Number(item.total || 0), 0);

        // 2. COGS (ต้นทุนขาย: ซื้อยางพาราเกษตรกร + ค่าน้ำมัน/ขนส่ง)
        const rawMaterialCost = data.buys.reduce((sum, item) => sum + Number(item.total || 0), 0);
        const transportCost = data.expenses
            .filter(e => e.category === 'ค่าน้ำมัน' || e.category === 'ค่าขนส่ง')
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const cogs = rawMaterialCost + transportCost;

        // Gross Profit
        const grossProfit = revenue - cogs;

        // 3. Operating Expenses (ค่าใช้จ่ายการดำเนินงาน)
        const chemicalsCost = data.expenses
            .filter(e => e.category === 'ค่าแอมโมเนีย' || e.category === 'ยาขาว' || e.category === 'ค่าอุปกรณ์')
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);
            
        const wagesCost = data.wages.reduce((sum, item) => sum + Number(item.total || 0), 0);
        
        const rentCost = data.expenses
            .filter(e => e.category === 'ค่าเช่าบ้าน')
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);
            
        const maintenanceCost = data.expenses
            .filter(e => e.category === 'ค่าซ่อมบำรุง')
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);
            
        const utilitiesCost = data.expenses
            .filter(e => e.category === 'ค่าสาธารณูปโภค')
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);
            
        const foodCost = data.expenses
            .filter(e => e.category === 'ค่าอาหาร')
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        const otherCost = data.expenses
            .filter(e => !['ค่าน้ำมัน', 'ค่าขนส่ง', 'ค่าแอมโมเนีย', 'ยาขาว', 'ค่าอุปกรณ์', 'ค่าเช่าบ้าน', 'ค่าซ่อมบำรุง', 'ค่าสาธารณูปโภค', 'ค่าอาหาร'].includes(e.category))
            .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        const totalOperatingExpenses = chemicalsCost + wagesCost + rentCost + maintenanceCost + utilitiesCost + foodCost + otherCost;
        const netProfit = grossProfit - totalOperatingExpenses;

        return {
            revenue,
            rawMaterialCost,
            transportCost,
            cogs,
            grossProfit,
            chemicalsCost,
            wagesCost,
            rentCost,
            maintenanceCost,
            utilitiesCost,
            foodCost,
            otherCost,
            totalOperatingExpenses,
            netProfit
        };
    }, [filteredData]);

    // Filter withholding tax records
    const withholdingTaxRecords = useMemo(() => {
        return filteredData.expenses.filter(e => e.tax_type && e.tax_type.startsWith('wht_'));
    }, [filteredData.expenses]);

    // CSV Exports
    const exportVatCSV = (type) => {
        const data = type === 'purchase' ? filteredData.buys : filteredData.sells;
        if (data.length === 0) {
            toast.error('ไม่มีข้อมูลสำหรับออกรายงาน');
            return;
        }

        let csvContent = "\uFEFF"; // UTF-8 BOM
        
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
        link.setAttribute("download", `tax_report_vat_${type}_${dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportWhtCSV = () => {
        if (withholdingTaxRecords.length === 0) {
            toast.error('ไม่มีข้อมูลสำหรับออกรายงานภาษีหัก ณ ที่จ่าย');
            return;
        }

        let csvContent = "\uFEFF"; // UTF-8 BOM
        csvContent += "วันที่,หมวดหมู่,คำอธิบาย,ประเภทหัก ณ ที่จ่าย,ยอดเงินก่อนหักภาษี(บาท),ภาษีหัก ณ ที่จ่าย(บาท),ยอดจ่ายจริง(บาท),หมายเหตุ\n";
        
        withholdingTaxRecords.forEach(item => {
            const taxLabel = item.tax_type === 'wht_1' ? '1% (ค่าขนส่ง)' : item.tax_type === 'wht_3' ? '3% (ค่าบริการ)' : '5% (ค่าเช่า)';
            const netAmount = Number(item.amount || 0) - Number(item.tax_amount || 0);
            csvContent += `${item.date},${item.category || ''},${item.description || ''},${taxLabel},${item.amount},${item.tax_amount},${netAmount},${item.note || ''}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `tax_report_wht_${dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportPLCSV = () => {
        const pl = plCalculations;
        let csvContent = "\uFEFF"; // UTF-8 BOM
        csvContent += "หัวข้อบัญชี,จำนวนเงิน (บาท)\n";
        csvContent += `1. รายได้จากการขายยางพารา,${pl.revenue}\n`;
        csvContent += `2. ต้นทุนขาย (COGS),-${pl.cogs}\n`;
        csvContent += `   - ค่าซื้อน้ำยางพาราเกษตรกร,-${pl.rawMaterialCost}\n`;
        csvContent += `   - ค่าน้ำมันรถและขนส่ง,-${pl.transportCost}\n`;
        csvContent += `กำไรขั้นต้น (Gross Profit),${pl.grossProfit}\n`;
        csvContent += `3. ค่าใช้จ่ายดำเนินงานและการบริหาร (SG&A),-${pl.totalOperatingExpenses}\n`;
        csvContent += `   - ค่าจ้างพนักงานและโบนัส,-${pl.wagesCost}\n`;
        csvContent += `   - สารเคมีลานยาง (แอมโมเนีย/ยาขาว/อุปกรณ์),-${pl.chemicalsCost}\n`;
        csvContent += `   - ค่าเช่าลาน/สถานที่,-${pl.rentCost}\n`;
        csvContent += `   - ค่าซ่อมบำรุงและเครื่องจักร,-${pl.maintenanceCost}\n`;
        csvContent += `   - ค่าสาธารณูปโภค (น้ำ/ไฟ/เน็ต),-${pl.utilitiesCost}\n`;
        csvContent += `   - ค่าอาหารพนักงาน,-${pl.foodCost}\n`;
        csvContent += `   - ค่าใช้จ่ายอื่นๆ,-${pl.otherCost}\n`;
        csvContent += `กำไรสุทธิการดำเนินงาน (Net Operating Profit),${pl.netProfit}\n`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `profit_loss_statement_${dateRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const thaiMonthYear = useMemo(() => {
        const [year, month] = dateRange.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return format(date, 'MMMM yyyy', { locale: th });
    }, [dateRange]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Briefcase className="mr-3 text-rubber-600 animate-pulse" size={28} />
                        ระบบบัญชี & ภาษีลานยางพารา
                    </h1>
                    <p className="text-gray-500">รายงานวิเคราะห์กำไรขาดทุน สรุปภาษีซื้อ-ขาย และรายงานหัก ณ ที่จ่ายสรรพากร</p>
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

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveMainTab('profit_loss')}
                    className={`pb-4 px-6 font-bold text-sm transition-colors border-b-2 ${activeMainTab === 'profit_loss' ? 'border-rubber-500 text-rubber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    งบกำไรขาดทุน (P&L Summary)
                </button>
                <button
                    onClick={() => setActiveMainTab('vat_report')}
                    className={`pb-4 px-6 font-bold text-sm transition-colors border-b-2 ${activeMainTab === 'vat_report' ? 'border-rubber-500 text-rubber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    รายงานภาษีซื้อ-ขาย (VAT)
                </button>
                <button
                    onClick={() => setActiveMainTab('withholding_tax')}
                    className={`pb-4 px-6 font-bold text-sm transition-colors border-b-2 ${activeMainTab === 'withholding_tax' ? 'border-rubber-500 text-rubber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    ภาษีหัก ณ ที่จ่าย (Withholding Tax)
                </button>
            </div>

            {/* ─── TAB 1: PROFIT & LOSS STATEMENT ─── */}
            {activeMainTab === 'profit_loss' && (
                <div className="space-y-6">
                    {/* Visual Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-shadow">
                            <div className="absolute right-3 top-3 opacity-15 transform group-hover:scale-110 transition-transform">
                                <TrendingUp size={80} />
                            </div>
                            <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full uppercase">Revenue</span>
                            <h3 className="text-2xl font-black mt-3">฿{plCalculations.revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</h3>
                            <p className="text-xs text-white/80 mt-1">รายได้ขายยางส่งโรงงาน ทั้งสิ้น</p>
                        </div>

                        <div className="bg-gradient-to-br from-rose-500 to-orange-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-shadow">
                            <div className="absolute right-3 top-3 opacity-15 transform group-hover:scale-110 transition-transform">
                                <TrendingDown size={80} />
                            </div>
                            <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full uppercase">COGS & Operating Cost</span>
                            <h3 className="text-2xl font-black mt-3">฿{(plCalculations.cogs + plCalculations.totalOperatingExpenses).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</h3>
                            <p className="text-xs text-white/80 mt-1">ต้นทุนขายและรายจ่ายทั้งหมด</p>
                        </div>

                        <div className={`bg-gradient-to-br ${plCalculations.netProfit >= 0 ? 'from-blue-600 to-indigo-700' : 'from-red-600 to-rose-700'} rounded-2xl p-6 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-shadow`}>
                            <div className="absolute right-3 top-3 opacity-15 transform group-hover:scale-110 transition-transform">
                                <DollarSign size={80} />
                            </div>
                            <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-full uppercase">Net Operating Profit</span>
                            <h3 className="text-2xl font-black mt-3">฿{plCalculations.netProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</h3>
                            <p className="text-xs text-white/80 mt-1">กำไรสุทธิจากการดำเนินงาน ประจำเดือน</p>
                        </div>
                    </div>

                    {/* Detailed P&L Sheet */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="font-bold text-gray-800 text-lg">งบกำไรขาดทุนขั้นต้น (Profit & Loss Statement)</h2>
                                <p className="text-xs text-gray-400">รอบบัญชีประจำเดือน {thaiMonthYear}</p>
                            </div>
                            <button 
                                onClick={exportPLCSV}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold shadow-sm"
                            >
                                <Download size={18} className="mr-2" />
                                Export CSV
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-w-3xl mx-auto">
                            {/* Section 1: Income */}
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100 font-bold text-gray-800">
                                <span>1. รายได้จากการดำเนินงาน (Revenue)</span>
                                <span>฿{plCalculations.revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="pl-4 flex justify-between text-sm text-gray-500">
                                <span>ยอดขายยางพาราส่งโรงงานทั้งหมด</span>
                                <span>฿{plCalculations.revenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* Section 2: COGS */}
                            <div className="flex justify-between items-center pt-4 pb-2 border-b border-gray-100 font-bold text-gray-800">
                                <span>2. หัก ต้นทุนขาย (Cost of Goods Sold - COGS)</span>
                                <span className="text-red-600">-฿{plCalculations.cogs.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="pl-4 space-y-2 text-sm text-gray-500">
                                <div className="flex justify-between">
                                    <span>ค่าน้ำยางพาราที่ซื้อจากเกษตรกร</span>
                                    <span>-฿{plCalculations.rawMaterialCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ต้นทุนค่าน้ำมันรถและค่าขนส่งยาง</span>
                                    <span>-฿{plCalculations.transportCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* Gross Profit Bar */}
                            <div className="flex justify-between items-center p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold mt-2">
                                <span>กำไรขั้นต้น (Gross Profit)</span>
                                <span>฿{plCalculations.grossProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* Section 3: Operating Expenses */}
                            <div className="flex justify-between items-center pt-4 pb-2 border-b border-gray-100 font-bold text-gray-800">
                                <span>3. หัก ค่าใช้จ่ายดำเนินงานและการบริหาร (SG&A)</span>
                                <span className="text-red-600">-฿{plCalculations.totalOperatingExpenses.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="pl-4 space-y-2 text-sm text-gray-500">
                                <div className="flex justify-between">
                                    <span>ค่าจ้างและเงินโบนัสพนักงาน (Wages)</span>
                                    <span>-฿{plCalculations.wagesCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ค่าสารเคมีและแอมโมเนียหน้าร้าน</span>
                                    <span>-฿{plCalculations.chemicalsCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ค่าเช่าลานยาง/สถานที่</span>
                                    <span>-฿{plCalculations.rentCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ค่าซ่อมบำรุงเครื่องชั่งและอุปกรณ์</span>
                                    <span>-฿{plCalculations.maintenanceCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ค่าสาธารณูปโภค (ค่าน้ำ/ค่าไฟ/เน็ต)</span>
                                    <span>-฿{plCalculations.utilitiesCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ค่าอาหารพนักงานรายวัน</span>
                                    <span>-฿{plCalculations.foodCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>ค่าใช้จ่ายอื่นๆ</span>
                                    <span>-฿{plCalculations.otherCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* Net Profit Summary */}
                            <div className={`flex justify-between items-center p-4 ${plCalculations.netProfit >= 0 ? 'bg-indigo-50 text-indigo-800' : 'bg-red-50 text-red-800'} rounded-xl font-extrabold text-base mt-4`}>
                                <span>กำไรสุทธิก่อนภาษี (Net Operating Profit)</span>
                                <span>฿{plCalculations.netProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 2: VAT REPORT (PURCHASE/SALES) ─── */}
            {activeMainTab === 'vat_report' && (
                <div className="space-y-4">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-full md:w-fit">
                        <button
                            onClick={() => setActiveVatTab('purchase')}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${activeVatTab === 'purchase' ? 'bg-white text-rubber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <ArrowDownLeft size={18} className="mr-2" />
                            รายงานภาษีซื้อ (จากเกษตรกร)
                        </button>
                        <button
                            onClick={() => setActiveVatTab('sales')}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${activeVatTab === 'sales' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <ArrowUpRight size={18} className="mr-2" />
                            รายงานภาษีขาย (ส่งโรงงาน)
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="font-bold text-gray-800 flex items-center">
                                {activeVatTab === 'purchase' ? 'รายการซื้อน้ำยางสดประจำเดือน' : 'รายการขายน้ำยางส่งโรงงานประจำเดือน'}
                                <span className="ml-3 px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs font-mono">
                                    {activeVatTab === 'purchase' ? filteredData.buys.length : filteredData.sells.length} รายการ
                                </span>
                            </h2>
                            <button 
                                onClick={() => exportVatCSV(activeVatTab)}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold shadow-sm"
                            >
                                <Download size={18} className="mr-2" />
                                Export CSV
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    {activeVatTab === 'purchase' ? (
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
                                    ) : (activeVatTab === 'purchase' ? filteredData.buys : filteredData.sells).length === 0 ? (
                                        <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">ไม่มีข้อมูลในช่วงเวลาที่เลือก</td></tr>
                                    ) : (
                                        (activeVatTab === 'purchase' ? filteredData.buys : filteredData.sells).map((item) => {
                                            if (activeVatTab === 'purchase') {
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
                                            {(activeVatTab === 'purchase' ? filteredData.buys : filteredData.sells).reduce((sum, i) => sum + Number(i.weight), 0).toLocaleString()}
                                        </td>
                                        <td className={`px-6 py-4 text-right text-lg font-black ${activeVatTab === 'purchase' ? 'text-rubber-600' : 'text-orange-600'}`}>
                                            {(activeVatTab === 'purchase' ? filteredData.buys : filteredData.sells).reduce((sum, i) => sum + Number(i.total), 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB 3: WITHHOLDING TAX REPORT (ภ.ง.ด.) ─── */}
            {activeMainTab === 'withholding_tax' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="font-bold text-gray-800 text-lg">สรุปรายการหัก ณ ที่จ่าย (Withholding Tax Ledger)</h2>
                                <p className="text-xs text-gray-400">สำหรับจัดทำแบบฟอร์ม ภ.ง.ด.1, ภ.ง.ด.3, ภ.ง.ด.53 ประจำเดือน {thaiMonthYear}</p>
                            </div>
                            <button 
                                onClick={exportWhtCSV}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-bold shadow-sm"
                            >
                                <Download size={18} className="mr-2" />
                                Export CSV
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">วันที่</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">หมวดหมู่</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">รายละเอียดธุรกรรม</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ประเภทภาษี</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ยอดเต็ม (฿)</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ภาษีหัก (฿)</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">ยอดโอนสุทธิ (฿)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400 italic">กำลังโหลดข้อมูล...</td></tr>
                                    ) : withholdingTaxRecords.length === 0 ? (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400 italic">ไม่มีรายการที่ถูกหักภาษี ณ ที่จ่ายในเดือนนี้</td></tr>
                                    ) : (
                                        withholdingTaxRecords.map((item) => {
                                            const taxLabel = item.tax_type === 'wht_1' ? '1% (ค่าขนส่ง)' : item.tax_type === 'wht_3' ? '3% (ค่าบริการ)' : '5% (ค่าเช่า)';
                                            const netAmount = Number(item.amount || 0) - Number(item.tax_amount || 0);
                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{item.date}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{item.category}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        <div>{item.description}</div>
                                                        {item.note && <div className="text-[10px] text-gray-400 font-light">{item.note}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full font-bold text-xs">
                                                            {taxLabel}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-medium">{Number(item.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-red-600">{Number(item.tax_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-bold text-emerald-600">{Number(netAmount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold">
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-right text-sm text-gray-500">ยอดรวมหัก ณ ที่จ่ายสะสม</td>
                                        <td className="px-6 py-4 text-right text-sm font-mono">
                                            {withholdingTaxRecords.reduce((sum, i) => sum + Number(i.amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-mono text-red-600">
                                            {withholdingTaxRecords.reduce((sum, i) => sum + Number(i.tax_amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-right text-base font-black text-emerald-600">
                                            {withholdingTaxRecords.reduce((sum, i) => sum + (Number(i.amount || 0) - Number(i.tax_amount || 0)), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Recommendation */}
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start space-x-4">
                <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md flex-shrink-0">
                    <FileText size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-blue-900 mb-1 italic">ข้อแนะนำสำหรับงานบัญชีและสรรพากร</h3>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc pl-4 opacity-80">
                        <li><strong>งบกำไรขาดทุน (P&L):</strong> ใช้เพื่อประเมินผลกำไรสุทธิเบื้องต้นก่อนหักภาษีเงินได้นิติบุคคล/บุคคลธรรมดา</li>
                        <li><strong>ภาษีหัก ณ ที่จ่าย:</strong> สามารถส่งออกเป็นไฟล์ CSV ไปใช้คำนวณกรอกแบบนำส่ง ภ.ง.ด.1 (ค่าจ้าง), ภ.ง.ด.3 (บุคคลธรรมดา/ค่าขนส่ง/บริการ), ภ.ง.ด.53 (นิติบุคคล) ได้ทันที</li>
                        <li><strong>ข้อมูลภาษีมูลค่าเพิ่ม (VAT):</strong> ได้รับการปรับแต่งการออกบิลและเก็บประวัติคู่ค้าให้ตรงกับที่ระบุในหัวข้อตั้งค่าทั่วไป</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TaxReport;
