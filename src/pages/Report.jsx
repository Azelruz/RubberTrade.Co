import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subMonths, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Calendar, Download, Filter, TrendingUp, Droplets, Target, Calculator, Wallet, Users, BarChart3, FlaskConical, Truck, Activity, Save } from 'lucide-react';
import { fetchBuyRecords, fetchSellRecords, getSettings, fetchExpenses, fetchWages, fetchChemicalUsage, isCached, addChemicalUsage } from '../services/apiService';
import { truncateOneDecimal } from '../utils/calculations';
import toast from 'react-hot-toast';

export const Report = () => {
    const [loading, setLoading] = useState(true);
    const [buys, setBuys] = useState([]);
    const [sells, setSells] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [wages, setWages] = useState([]);
    const [chemicalUsage, setChemicalUsage] = useState([]);
    const [settings, setSettings] = useState({});
    const [profitMargin, setProfitMargin] = useState(1.50);

    // Filters
    const [dateRange, setDateRange] = useState('thisMonth'); // thisMonth, lastMonth, all
    const [fStart, setFStart] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [fEnd, setFEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

    const isDemo = false;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!isCached('buys', 'sells', 'settings', 'expenses', 'wages', 'chemicals')) setLoading(true);
        try {
            if (isDemo) {
                setBuys([
                    { date: new Date().toISOString(), weight: 1500, total: 52500 }
                ]);
                setSells([
                    { date: new Date().toISOString(), weight: 1600, total: 72000 }
                ]);
                setExpenses([]);
                setWages([]);
                return;
            }

            const [b, s, setRes, expRes, wageRes, chemUsage] = await Promise.all([
                fetchBuyRecords(),
                fetchSellRecords(),
                getSettings(),
                fetchExpenses(),
                fetchWages(),
                fetchChemicalUsage()
            ]);
            setBuys(Array.isArray(b) ? b : []);
            setSells(Array.isArray(s) ? s : []);
            setExpenses(Array.isArray(expRes) ? expRes : []);
            setWages(Array.isArray(wageRes) ? wageRes : []);
            setChemicalUsage(Array.isArray(chemUsage) ? chemUsage : []);
            
            if (setRes && setRes.status === 'success') {
                setSettings(setRes.data || {});
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveChemical = async (chemId, value) => {
        if (!value || isNaN(value)) {
            toast.error('กรุณาระบุตัวเลขที่ถูกต้อง');
            return;
        }
        const toastId = toast.loading('กำลังบันทึก...');
        try {
            const res = await addChemicalUsage({
                chemicalId: chemId,
                amount: Number(value),
                date: format(new Date(), 'yyyy-MM-dd'),
                unit: 'กิโลกรัม'
            });
            if (res.status === 'success') {
                toast.success('บันทึกสำเร็จ', { id: toastId });
                // Clear manual input for this chemical to show actual usage
                setManualChemicals(prev => {
                    const next = { ...prev };
                    delete next[chemId];
                    return next;
                });
                // Refresh data
                loadData();
            } else {
                toast.error(res.message || 'บันทึกล้มเหลว', { id: toastId });
            }
        } catch (err) {
            toast.error('บันทึกล้มเหลว: ' + err.message, { id: toastId });
        }
    };

    const [manualChemicals, setManualChemicals] = useState({});

    // Reset manual values when dates change so they start with data from the new period
    useEffect(() => {
        setManualChemicals({});
    }, [fStart, fEnd]);

    const filteredData = useMemo(() => {
        let start, end;
        const now = new Date();
        if (dateRange === 'thisMonth') {
            start = startOfMonth(now);
            end = endOfMonth(now);
        } else if (dateRange === 'lastMonth') {
            const lastMonth = subMonths(now, 1);
            start = startOfMonth(lastMonth);
            end = endOfMonth(lastMonth);
        }

        const filterFn = item => {
            if (dateRange === 'all') return true;
            return isWithinInterval(parseISO(item.date || item.timestamp), { start, end });
        };

        const periodBuys = buys.filter(filterFn);
        const periodSells = sells.filter(filterFn);

        const buyTotal = truncateOneDecimal(periodBuys.reduce((sum, item) => sum + Number(item.total || 0), 0));
        const buyWeight = truncateOneDecimal(periodBuys.reduce((sum, item) => {
            const net = Number(item.netWeight);
            if (!isNaN(net) && net > 0) return sum + net;
            return sum + (Number(item.weight || 0) - Number(item.bucketWeight || 0));
        }, 0));

        const sellTotal = truncateOneDecimal(periodSells.reduce((sum, item) => sum + Number(item.total || 0), 0));
        const sellWeight = truncateOneDecimal(periodSells.reduce((sum, item) => sum + Number(item.weight || 0), 0));
        const sellLoss = truncateOneDecimal(periodSells.reduce((sum, item) => sum + Number(item.lossWeight || 0), 0));

        // Chemicals weights for this period
        const periodChemicals = chemicalUsage.filter(filterFn);
        const ammoniaWeight = truncateOneDecimal(periodChemicals.filter(c => c.chemicalId === 'ammonia').reduce((sum, c) => sum + Number(c.amount || 0), 0));
        const waterWeight = truncateOneDecimal(periodChemicals.filter(c => c.chemicalId === 'water').reduce((sum, c) => sum + Number(c.amount || 0), 0));
        const whiteMedWeight = truncateOneDecimal(periodChemicals.filter(c => c.chemicalId === 'whiteMedicine').reduce((sum, c) => sum + Number(c.amount || 0), 0));

        const profit = truncateOneDecimal(sellTotal - buyTotal);
        const currentStock = truncateOneDecimal(buyWeight + ammoniaWeight + waterWeight + whiteMedWeight - sellWeight - sellLoss);
        
        // Daily breakdown for chart (grouped by date)
        const dailyMap = {};
        [...periodBuys.map(i => ({ ...i, type: 'buy' })), ...periodSells.map(i => ({ ...i, type: 'sell' }))].forEach(item => {
            const dateStr = format(parseISO(item.date || item.timestamp), 'dd MMM', { locale: th });
            if (!dailyMap[dateStr]) dailyMap[dateStr] = { name: dateStr, ซื้อ: 0, ขาย: 0 };
            if (item.type === 'buy') dailyMap[dateStr].ซื้อ += Number(item.total || 0);
            else dailyMap[dateStr].ขาย += Number(item.total || 0);
        });

        const chartData = Object.values(dailyMap);

        // Period Forecast summary (fStart/fEnd)
        const periodForecastBuys = buys.filter(b => b.date >= fStart && b.date <= fEnd);
        const periodForecastSells = sells.filter(s => s.date >= fStart && s.date <= fEnd);
        
        const fBuyWeight = truncateOneDecimal(periodForecastBuys.reduce((sum, b) => sum + (Number(b.weight || 0) - Number(b.bucketWeight || 0)), 0));
        const fBuyTotal = truncateOneDecimal(periodForecastBuys.reduce((sum, b) => sum + Number(b.total || 0), 0));
        const fSellWeight = truncateOneDecimal(periodForecastSells.reduce((sum, s) => sum + Number(s.weight || 0), 0));
        const fSellLoss = truncateOneDecimal(periodForecastSells.reduce((sum, s) => sum + Number(s.lossWeight || 0), 0));
        const fDryWeight = truncateOneDecimal(periodForecastBuys.reduce((sum, b) => sum + Number(b.dryRubber || 0), 0));
        
        const fAvgDrc = fBuyWeight > 0 ? truncateOneDecimal((fDryWeight / fBuyWeight) * 100) : 0;
        
        const dailyPrice = Number(settings.daily_price || 0);
        const projectedSellPrice = dailyPrice + Number(profitMargin || 0);
        const projectedRevenue = truncateOneDecimal(fDryWeight * projectedSellPrice);
        const projectedProfit = truncateOneDecimal(projectedRevenue - fBuyTotal);
 
        const fExpenses = truncateOneDecimal(expenses.filter(e => e.date >= fStart && e.date <= fEnd).reduce((sum, e) => sum + Number(e.amount || 0), 0));
        const fWages = truncateOneDecimal(wages.filter(w => w.date >= fStart && w.date <= fEnd).reduce((sum, w) => sum + Number(w.total || 0), 0));
        const fNetOutcome = truncateOneDecimal(projectedProfit - (fExpenses + fWages));

        // Parse chemical settings for recommendations
        let chemSettings = [];
        try {
            if (settings.chemicalSettings) {
                chemSettings = JSON.parse(settings.chemicalSettings);
            }
        } catch (e) {
            console.error('Failed to parse chemical settings', e);
        }

        const getRecommended = (id, defaultAmount, defaultPer) => {
            const config = chemSettings.find(s => s.id === id) || { amount: defaultAmount, perLatex: defaultPer };
            const amount = Number(config.amount) || 0;
            const per = Number(config.perLatex) || 1000;
            return truncateOneDecimal((amount / per) * fBuyWeight);
        };

        const recAmmonia = getRecommended('ammonia', 20, 1000);
        const recWater = getRecommended('water', 30, 800);
        const recWhiteMed = getRecommended('whiteMedicine', 1, 1000);

        return {
            buyTotal,
            buyWeight,
            sellTotal,
            sellWeight,
            sellLoss,
            profit,
            currentStock,
            chartData,
            periodChemicals: {
                ammonia: ammoniaWeight,
                water: waterWeight,
                whiteMedicine: whiteMedWeight
            },
            todaySummary: {
                weight: fBuyWeight,
                sellWeight: fSellWeight,
                sellLoss: fSellLoss,
                avgDrc: fAvgDrc,
                cost: fBuyTotal,
                profit: projectedProfit,
                expenses: fExpenses,
                wages: fWages,
                netOutcome: fNetOutcome,
                dailyPrice: dailyPrice,
                chemicals: {
                    ammonia: truncateOneDecimal(chemicalUsage.filter(c => c.chemicalId === 'ammonia' && c.date >= fStart && c.date <= fEnd).reduce((sum, c) => sum + Number(c.amount || 0), 0)),
                    water: truncateOneDecimal(chemicalUsage.filter(c => c.chemicalId === 'water' && c.date >= fStart && c.date <= fEnd).reduce((sum, c) => sum + Number(c.amount || 0), 0)),
                    whiteMedicine: truncateOneDecimal(chemicalUsage.filter(c => c.chemicalId === 'whiteMedicine' && c.date >= fStart && c.date <= fEnd).reduce((sum, c) => sum + Number(c.amount || 0), 0))
                },
                recommendedChemicals: {
                    ammonia: recAmmonia,
                    water: recWater,
                    whiteMedicine: recWhiteMed
                }
            }
        };
    }, [buys, sells, expenses, wages, chemicalUsage, dateRange, settings, profitMargin, fStart, fEnd]);


    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">รายงานคาดการณ์ ประจำวัน</h1>
                    <p className="text-gray-500">วิเคราะห์และสรุปยอดซื้อ-ขาย รายวัน</p>
                </div>

                <div className="flex items-center space-x-2 bg-white rounded-lg p-1 border border-gray-200">
                    <button
                        onClick={() => setDateRange('thisMonth')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${dateRange === 'thisMonth' ? 'bg-rubber-100 text-rubber-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        เดือนนี้
                    </button>
                    <button
                        onClick={() => setDateRange('lastMonth')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${dateRange === 'lastMonth' ? 'bg-rubber-100 text-rubber-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        เดือนที่แล้ว
                    </button>
                    <button
                        onClick={() => setDateRange('all')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${dateRange === 'all' ? 'bg-rubber-100 text-rubber-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        ทั้งหมด
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rubber-600"></div>
                </div>
            ) : (
                <>
                    {/* Today's Daily Summary Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-rubber-600 to-rubber-500 px-6 py-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4 text-white">
                            <h2 className="text-lg font-bold flex items-center">
                                <Calendar className="mr-2 opacity-80" size={20} />
                                สรุปรายการรับซื้อ (พยากรณ์)
                            </h2>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm">
                                <div className="flex items-center space-x-2 bg-white/20 px-3 py-1.5 rounded-xl border border-white/10 shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">ช่วงวิเคราะห์:</span>
                                    <input 
                                        type="date"
                                        value={fStart}
                                        onChange={(e) => setFStart(e.target.value)}
                                        className="bg-transparent border-none p-0 text-white font-bold focus:ring-0 w-[115px] text-sm cursor-pointer"
                                    />
                                    <span className="opacity-40">-</span>
                                    <input 
                                        type="date"
                                        value={fEnd}
                                        onChange={(e) => setFEnd(e.target.value)}
                                        className="bg-transparent border-none p-0 text-white font-bold focus:ring-0 w-[115px] text-sm cursor-pointer"
                                    />
                                </div>

                                <div className="flex items-center space-x-4">
                                    <div className="h-4 w-px bg-white/20 hidden md:block"></div>
                                    <span className="opacity-90 font-medium whitespace-nowrap">ราคากลาง: ฿{Number(filteredData.todaySummary.dailyPrice).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                    <div className="h-4 w-px bg-white/20 hidden md:block"></div>
                                    
                                    <div className="flex items-center bg-white/20 px-3 py-1.5 rounded-xl border border-white/10 group hover:bg-white/30 transition-all shadow-sm">
                                        <Calculator size={14} className="mr-2 opacity-80" />
                                        <span className="mr-2 font-bold whitespace-nowrap">กำไรส่วนต่าง:</span>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={profitMargin}
                                            onChange={(e) => setProfitMargin(e.target.value)}
                                            className="w-10 bg-transparent border-none p-0 text-white font-black focus:ring-0 placeholder-white/50 text-right"
                                            placeholder="1.50"
                                        />
                                        <span className="ml-1 font-bold">บ.</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                            <div className="p-6 hover:bg-gray-50/50 transition-colors">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <Droplets size={12} className="mr-1.5 text-blue-500" />น้ำหนักรวม
                                </p>
                                <p className="text-2xl font-black text-gray-900">{Number(filteredData.todaySummary.weight).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-normal text-gray-400">กก.</span></p>
                            </div>
                            <div className="p-6 hover:bg-gray-50/50 transition-colors">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <Target size={12} className="mr-1.5 text-orange-500" />เฉลี่ย %DRC
                                </p>
                                <p className="text-2xl font-black text-gray-900">{Number(filteredData.todaySummary.avgDrc).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-normal text-gray-400">%</span></p>
                            </div>
                            <div className="p-6 hover:bg-gray-50/50 transition-colors">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <Calculator size={12} className="mr-1.5 text-rubber-500" />ต้นทุนรับซื้อ
                                </p>
                                <p className="text-2xl font-black text-gray-900">{Number(filteredData.todaySummary.cost).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-normal text-gray-400">฿</span></p>
                            </div>
                            <div className={`p-6 bg-gradient-to-br transition-colors ${filteredData.todaySummary.profit >= 0 ? 'from-green-50/50 to-white' : 'from-red-50/50 to-white'}`}>
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <TrendingUp size={12} className={`mr-1.5 ${filteredData.todaySummary.profit >= 0 ? 'text-green-500' : 'text-red-500'}`} />กำไรจากเนื้อยาง
                                </p>
                                <div className="flex items-baseline space-x-1">
                                    <p className={`text-2xl font-black ${filteredData.todaySummary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {filteredData.todaySummary.profit >= 0 ? '+' : ''}{Number(filteredData.todaySummary.profit).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                    </p>
                                    <span className={`text-xs font-bold ${filteredData.todaySummary.profit >= 0 ? 'text-green-600/60' : 'text-red-600/60'}`}>฿</span>
                                </div>
                                 <p className="text-[10px] text-gray-400 font-medium mt-1">ส่วนต่าง +{profitMargin}บ.</p>
                            </div>
                        </div>

                        {/* Chemicals summary row (Interactive Calculator) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-t border-gray-100 bg-white">
                            <div className="p-6 hover:bg-gray-50/50 transition-colors group/chem text-left">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <FlaskConical size={12} className="mr-1.5 text-amber-500" />แอมโมเนีย
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={manualChemicals.ammonia !== undefined ? manualChemicals.ammonia : filteredData.todaySummary.chemicals.ammonia}
                                            onChange={(e) => setManualChemicals(prev => ({ ...prev, ammonia: e.target.value }))}
                                            className="text-2xl font-black text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-24"
                                        />
                                        <span className="text-sm font-normal text-gray-400 ml-1">กก.</span>
                                    </div>
                                    <button 
                                        onClick={() => handleSaveChemical('ammonia', manualChemicals.ammonia !== undefined ? manualChemicals.ammonia : filteredData.todaySummary.chemicals.ammonia)}
                                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all opacity-0 group-hover/chem:opacity-100"
                                        title="บันทึกลงระบบ"
                                    >
                                        <Save size={18} />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setManualChemicals(prev => ({ ...prev, ammonia: filteredData.todaySummary.recommendedChemicals.ammonia }))}
                                    className="text-[14px] font-bold text-amber-600 mt-1 opacity-60 group-hover/chem:opacity-100 transition-opacity hover:underline"
                                >
                                    แนะนำ: {filteredData.todaySummary.recommendedChemicals.ammonia} กก.
                                </button>
                            </div>
                            <div className="p-6 hover:bg-gray-50/50 transition-colors group/chem text-left">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <Droplets size={12} className="mr-1.5 text-blue-500" />น้ำ
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={manualChemicals.water !== undefined ? manualChemicals.water : filteredData.todaySummary.chemicals.water}
                                            onChange={(e) => setManualChemicals(prev => ({ ...prev, water: e.target.value }))}
                                            className="text-2xl font-black text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-24"
                                        />
                                        <span className="text-sm font-normal text-gray-400 ml-1">กก.</span>
                                    </div>
                                    <button 
                                        onClick={() => handleSaveChemical('water', manualChemicals.water !== undefined ? manualChemicals.water : filteredData.todaySummary.chemicals.water)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover/chem:opacity-100"
                                        title="บันทึกลงระบบ"
                                    >
                                        <Save size={18} />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setManualChemicals(prev => ({ ...prev, water: filteredData.todaySummary.recommendedChemicals.water }))}
                                    className="text-[14px] font-bold text-blue-600 mt-1 opacity-60 group-hover/chem:opacity-100 transition-opacity hover:underline"
                                >
                                    แนะนำ: {filteredData.todaySummary.recommendedChemicals.water} กก.
                                </button>
                            </div>
                            <div className="p-6 hover:bg-gray-50/50 transition-colors group/chem text-left">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center">
                                    <Activity size={12} className="mr-1.5 text-purple-500" />ยาขาว
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            value={manualChemicals.whiteMedicine !== undefined ? manualChemicals.whiteMedicine : filteredData.todaySummary.chemicals.whiteMedicine}
                                            onChange={(e) => setManualChemicals(prev => ({ ...prev, whiteMedicine: e.target.value }))}
                                            className="text-2xl font-black text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-24"
                                        />
                                        <span className="text-sm font-normal text-gray-400 ml-1">กก.</span>
                                    </div>
                                    <button 
                                        onClick={() => handleSaveChemical('whiteMedicine', manualChemicals.whiteMedicine !== undefined ? manualChemicals.whiteMedicine : filteredData.todaySummary.chemicals.whiteMedicine)}
                                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all opacity-0 group-hover/chem:opacity-100"
                                        title="บันทึกลงระบบ"
                                    >
                                        <Save size={18} />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setManualChemicals(prev => ({ ...prev, whiteMedicine: filteredData.todaySummary.recommendedChemicals.whiteMedicine }))}
                                    className="text-[14px] font-bold text-purple-600 mt-1 opacity-60 group-hover/chem:opacity-100 transition-opacity hover:underline"
                                >
                                    แนะนำ: {filteredData.todaySummary.recommendedChemicals.whiteMedicine} กก.
                                </button>
                            </div>
                            <div className="p-6 bg-blue-50/50 transition-colors border-l border-gray-100">
                                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center">
                                    <TrendingUp size={12} className="mr-1.5 text-blue-600" />น้ำหนักรวมสุทธิ
                                </p>
                                <div className="flex items-baseline space-x-1">
                                    {(() => {
                                        const rubberW = Number(filteredData.todaySummary.weight || 0);
                                        const ammonia = Number(manualChemicals.ammonia !== undefined ? manualChemicals.ammonia : filteredData.todaySummary.chemicals.ammonia || 0);
                                        const water = Number(manualChemicals.water !== undefined ? manualChemicals.water : filteredData.todaySummary.chemicals.water || 0);
                                        const whiteMedicine = Number(manualChemicals.whiteMedicine !== undefined ? manualChemicals.whiteMedicine : filteredData.todaySummary.chemicals.whiteMedicine || 0);
                                        const chemW = ammonia + water + whiteMedicine;
                                        return (
                                            <p className="text-2xl font-black text-blue-700">
                                                {Number(rubberW + chemW).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                <span className="text-sm font-normal text-blue-400 ml-1">กก.</span>
                                            </p>
                                        );
                                    })()}
                                </div>
                                <p className="text-[10px] text-blue-400 font-medium mt-1">น้ำยาง + สารเคมีที่ใส่</p>
                            </div>
                        </div>

                        {/* Extra daily costs row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-t border-gray-100 bg-gray-50/30">
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <Wallet size={16} className="text-red-400 mr-2" />
                                    <span className="text-sm font-bold text-gray-600">ค่าใช้จ่ายทั่วไป:</span>
                                </div>
                                <span className="text-sm font-black text-red-600">-{Number(filteredData.todaySummary.expenses).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ฿</span>
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center">
                                    <Users size={16} className="text-orange-400 mr-2" />
                                    <span className="text-sm font-bold text-gray-600">ค่าจ้างพนักงาน:</span>
                                </div>
                                <span className="text-sm font-black text-red-600">-{Number(filteredData.todaySummary.wages).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ฿</span>
                            </div>
                            <div className={`p-4 flex items-center justify-between bg-gradient-to-r ${filteredData.todaySummary.netOutcome >= 0 ? 'from-green-600 to-green-500' : 'from-red-600 to-red-500'} text-white`}>
                                <div className="flex items-center">
                                    <BarChart3 size={18} className="mr-2" />
                                    <span className="text-sm font-black uppercase tracking-wider">ผลประกอบการสุทธิ:</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black">{Number(filteredData.todaySummary.netOutcome).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                    <span className="text-xs ml-1 opacity-80 font-bold">฿</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
                            <div className="relative z-10">
                                <p className="text-sm font-medium text-gray-500 mb-1">ยอดรับซื้อรวม (บาท)</p>
                                <p className="text-3xl font-bold text-gray-900">฿{Number(filteredData.buyTotal).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                                <p className="text-xs text-blue-600 mt-2 font-medium">{Number(filteredData.buyWeight).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กิโลกรัม</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-orange-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
                            <div className="relative z-10">
                                <p className="text-sm font-medium text-gray-500 mb-1">ยอดขายรวม (บาท)</p>
                                <p className="text-3xl font-bold text-gray-900">฿{Number(filteredData.sellTotal).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                                <p className="text-xs text-orange-600 mt-2 font-medium">{Number(filteredData.sellWeight).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กิโลกรัม</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
                            <div className="relative z-10">
                                <p className="text-sm font-medium text-gray-500 mb-1">สต๊อกน้ำยางคงเหลือ (กก.)</p>
                                <p className="text-3xl font-bold text-gray-900">{Number(filteredData.currentStock).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                                <p className="text-[11px] text-purple-600 mt-2 font-black tracking-tight leading-none">
                                    สูตร: {Number(filteredData.buyWeight).toLocaleString()} - {Number(filteredData.sellWeight).toLocaleString()} {filteredData.sellLoss >= 0 ? '-' : '+'} {Number(Math.abs(filteredData.sellLoss)).toLocaleString()} (ปรับปรุง) + {Number(filteredData.periodChemicals.ammonia + filteredData.periodChemicals.water + filteredData.periodChemicals.whiteMedicine).toLocaleString()} (สารเคมี)
                                </p>
                            </div>
                        </div>

                        <div className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 relative overflow-hidden group ${filteredData.profit >= 0 ? 'bg-green-50/30' : 'bg-red-50/30'}`}>
                            <div className={`absolute right-0 top-0 w-full h-full opacity-10 ${filteredData.profit >= 0 ? 'bg-gradient-to-l from-green-400' : 'bg-gradient-to-l from-red-400'}`}></div>
                            <div className="relative z-10 flex justify-between items-center h-full">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">กำไร / ขาดทุน (ขั้นต้น)</p>
                                    <p className={`text-4xl font-black ${filteredData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {filteredData.profit >= 0 ? '+' : ''}฿{Number(filteredData.profit).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                    </p>
                                </div>
                                <div className="hidden sm:block text-right">
                                    <p className="text-sm font-medium text-gray-500 mb-1">ส่วนต่างน้ำหนัก (Stock/สูญเสีย)</p>
                                    <p className="text-xl font-bold text-gray-700">{Number(filteredData.currentStock).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กก.</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                        สูตร: {Number(filteredData.buyWeight).toLocaleString()} - {Number(filteredData.sellWeight).toLocaleString()} {filteredData.sellLoss >= 0 ? '-' : '+'} {Number(Math.abs(filteredData.sellLoss)).toLocaleString()} + {Number(filteredData.periodChemicals.ammonia).toLocaleString()} + {Number(filteredData.periodChemicals.water).toLocaleString()} + {Number(filteredData.periodChemicals.whiteMedicine).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">กราฟเปรียบเทียบยอดรับซื้อ-ขาย (รายวัน)</h2>
                            <button className="flex items-center text-sm font-medium text-rubber-600 hover:text-rubber-800 transition-colors">
                                <Download size={16} className="mr-1" />
                                ส่งออกข้อมูล
                            </button>
                        </div>

                        {filteredData.chartData.length === 0 ? (
                            <div className="h-80 flex flex-col justify-center items-center text-gray-400">
                                <BarChart className="w-16 h-16 opacity-20 mb-4" />
                                <p>ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
                            </div>
                        ) : (
                            <div className="h-96 w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={filteredData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} tickFormatter={(v) => `฿${v / 1000}k`} />
                                        <Tooltip
                                            cursor={{ fill: '#f3f4f6' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [`฿${Number(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`, undefined]}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="ซื้อ" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        <Bar dataKey="ขาย" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Report;
