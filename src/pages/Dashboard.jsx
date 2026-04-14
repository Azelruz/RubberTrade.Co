import React, { useState, useEffect } from 'react';
import { Gift, Wallet, FlaskConical } from 'lucide-react';
import { 
    fetchDashboardData, fetchFarmers, fetchChemicalUsage, 
    addBulkWages, addPromotion, addChemicalUsage 
} from '../services/apiService';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { calculateWage, truncateOneDecimal } from '../utils/calculations';

// Sub-components
import DashboardStats from './dashboard/DashboardStats';
import DashboardCharts from './dashboard/DashboardCharts';
import DashboardChemicals from './dashboard/DashboardChemicals';
import DashboardRecent from './dashboard/DashboardRecent';
import { WageConfirmModal, LuckyDrawModal } from './dashboard/DashboardModals';

export const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayBuy: 0,
        todayLatexBuy: 0,
        todayCupLumpBuy: 0,
        todaySell: 0,
        todayBuyWeight: 0,
        todayLatexWeight: 0,
        todayCupLumpWeight: 0,
        todayExpense: 0,
        monthIncome: 0,
        monthCost: 0,
        monthProfit: 0,
        unpaidBills: 0,
        totalMembers: 0,
        todayAvgDrc: 0,
        dailyPrice: 0
    });
    const [chemicalCalcs, setChemicalCalcs] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [priceChartData, setPriceChartData] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [allBuys, setAllBuys] = useState([]);
    const [allStaff, setAllStaff] = useState([]);
    const [allWages, setAllWages] = useState([]);
    const [isAutoRecording, setIsAutoRecording] = useState(false);
    const [wageConfirmData, setWageConfirmData] = useState({ show: false, unpaidStaff: [], bonus: 0 });
    const [chemicalUsage, setChemicalUsage] = useState([]);
    const [showLuckyDraw, setShowLuckyDraw] = useState(false);
    const [luckyStartDate, setLuckyStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [luckyEndDate, setLuckyEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState(null);
    const [rewardName, setRewardName] = useState('');
    const [savingReward, setSavingReward] = useState(false);
    const [showPrizeDrawBtn, setShowPrizeDrawBtn] = useState(true);
    const isDemo = false;

    useEffect(() => {
        loadDashboardData();
        const handleRefresh = () => loadDashboardData(true);
        window.addEventListener('dashboard-refresh', handleRefresh);
        return () => window.removeEventListener('dashboard-refresh', handleRefresh);
    }, []);

    const loadDashboardData = async (silent = false) => {
        let hasCache = false;
        try { hasCache = !!sessionStorage.getItem('gc_dashboard'); } catch {}
        if (!silent && !hasCache) setLoading(true);
        try {
            const [dashData, farmers, chemUsage] = await Promise.all([
                fetchDashboardData(silent),
                fetchFarmers(),
                fetchChemicalUsage()
            ]);

            // dashData now contains pre-calculated stats and aggregated charts
            const buys = Array.isArray(dashData?.buys) ? dashData.buys : [];
            const sells = Array.isArray(dashData?.sells) ? dashData.sells : [];
            const wages = Array.isArray(dashData?.wages) ? dashData.wages : [];
            const staff = Array.isArray(dashData?.staff) ? dashData.staff : [];
            const farmerArr = Array.isArray(farmers) ? farmers : [];
            
            // For features like Lucky Draw that still need buy list,
            // we'll rely on what the server sent (limited) or fetch more later.
            setAllBuys(buys);
            setAllWages(wages);
            setAllStaff(staff);
            setChemicalUsage(Array.isArray(chemUsage) ? chemUsage : []);
            
            const settings = dashData?.settings || {};
            const showPrize = settings.showPrizeDraw === undefined ? true : (settings.showPrizeDraw === 'true' || settings.showPrizeDraw === true);
            setShowPrizeDrawBtn(showPrize);

            // Use server-side stats if available, otherwise fallback to local calc
            if (dashData?.stats) {
                const s = dashData.stats;
                setStats({
                    ...s,
                    // Ensure monthProfit is calculated if missing or use server value
                    monthProfit: s.monthProfit !== undefined ? s.monthProfit : truncateOneDecimal((s.monthIncome || 0) - (s.monthCost || 0))
                });
                calculateChemicals(s.todayLatexWeight, settings.chemicalSettings);
            } else {
                calculateStats(buys, sells, dashData?.expenses || [], wages, dashData, farmerArr);
            }

            // Use server-side chart data if available
            if (dashData?.charts) {
                processServerCharts(dashData.charts);
            } else {
                generateChartData(buys, sells);
                generatePriceChartData(buys, sells);
            }

            // Use server-side recent transactions
            if (dashData?.recentTransactions) {
                setRecentTransactions(dashData.recentTransactions);
            } else {
                const recent = [
                    ...buys.map(b => ({ ...b, type: 'buy' })),
                    ...sells.map(s => ({ ...s, type: 'sell' }))
                ]
                    .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
                    .slice(0, 5);
                setRecentTransactions(recent);
            }
        } catch (error) {
            console.error("Dashboard error:", error);
        } finally {
            setLoading(false);
        }
    };

    const processServerCharts = (charts) => {
        const buysRaw = charts.buys || [];
        const sellsRaw = charts.sells || [];

        // 7-day Activity Chart
        const activityData = [];
        for (let i = 6; i >= 0; i--) {
            const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
            const dBuys = buysRaw.filter(b => b.date === dateStr);
            const dSells = sellsRaw.filter(s => s.date === dateStr);
            activityData.push({
                name: format(subDays(new Date(), i), 'dd MMM', { locale: th }),
                'ซื้อ': dBuys.reduce((sum, b) => sum + Number(b.total || 0), 0),
                'ขาย': dSells.reduce((sum, s) => sum + Number(s.total || 0), 0)
            });
        }
        setChartData(activityData);

        // 30-day Price Chart
        const priceData = [];
        for (let i = 29; i >= 0; i--) {
            const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
            const dBuys = buysRaw.filter(b => b.date === dateStr && (b.rubberType === 'latex' || !b.rubberType));
            const dSells = sellsRaw.filter(s => s.date === dateStr && (s.rubberType === 'latex' || !s.rubberType));
            
            const buyAvg = dBuys.length > 0 ? dBuys[0].avgPrice : null;
            const sellAvg = dSells.length > 0 ? dSells[0].avgPrice : null;

            priceData.push({
                date: format(subDays(new Date(), i), 'dd MMM', { locale: th }),
                'ราคาซื้อ': buyAvg ? truncateOneDecimal(buyAvg) : null,
                'ราคาขาย': sellAvg ? truncateOneDecimal(sellAvg) : null
            });
        }
        setPriceChartData(priceData);
    };

    const calculateStats = (buys, sells, expenses, wages, dashData, farmers) => {
        const today = new Date();
        const todayRange = { start: startOfDay(today), end: endOfDay(today) };
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const isValidDate = (d) => {
            const date = new Date(d);
            return date instanceof Date && !isNaN(date);
        };

        const todayBuys = buys.filter(b => isValidDate(b.date) && isWithinInterval(new Date(b.date), todayRange));
        const latexBuys = todayBuys.filter(b => b.rubberType === 'latex' || !b.rubberType);
        const cupLumpBuys = todayBuys.filter(b => b.rubberType === 'cup_lump' || b.rubberType === 'ขี้ยาง');

        const todayLatexBuyTotal = latexBuys.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const todayCupLumpBuyTotal = cupLumpBuys.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        
        const todayLatexWeight = latexBuys.reduce((sum, item) => {
            const net = Number(item.netWeight);
            if (!isNaN(net) && net > 0) return sum + net;
            return sum + (Number(item.weight || 0) - Number(item.bucketWeight || 0));
        }, 0);
        const todayCupLumpWeight = cupLumpBuys.reduce((sum, item) => {
            const net = Number(item.netWeight);
            if (!isNaN(net) && net > 0) return sum + net;
            return sum + (Number(item.weight || 0) - Number(item.bucketWeight || 0));
        }, 0);

        const todaySells = sells.filter(s => isValidDate(s.date) && isWithinInterval(new Date(s.date), todayRange));
        const todaySellTotal = todaySells.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

        const todayExps = expenses.filter(e => isValidDate(e.date) && isWithinInterval(new Date(e.date), todayRange));
        const todayWages = wages.filter(w => isValidDate(w.date) && isWithinInterval(new Date(w.date), todayRange));
        const todayExpTotal = todayExps.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const todayWageTotal = todayWages.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

        const todayTotalDry = latexBuys.reduce((sum, item) => sum + (Number(item.dryRubber || item.dryWeight || 0)), 0);
        const todayAvgDrc = todayLatexWeight > 0 ? truncateOneDecimal((todayTotalDry / todayLatexWeight) * 100) : 0;

        const unpaidBills = buys.reduce((count, r) => {
            let p = 0;
            if (r.farmerStatus !== 'Paid') p++;
            if (Number(r.employeeTotal || 0) > 0 && r.employeeStatus !== 'Paid') p++;
            return count + p;
        }, 0);

        const monthBuys = buys.filter(b => isValidDate(b.date) && new Date(b.date) >= monthStart);
        const monthSells = sells.filter(s => isValidDate(s.date) && new Date(s.date) >= monthStart);
        const monthExps = expenses.filter(e => isValidDate(e.date) && new Date(e.date) >= monthStart);
        const monthWages = wages.filter(w => isValidDate(w.date) && new Date(w.date) >= monthStart);

        const monthIncome = truncateOneDecimal(monthSells.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
        const monthBuyTotal = monthBuys.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const monthExpTotal = monthExps.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        const monthWageTotal = monthWages.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const monthCost = truncateOneDecimal(monthBuyTotal + monthExpTotal + monthWageTotal);
        
        const profit = truncateOneDecimal(monthIncome - monthCost);
        const dailyPrice = Number(dashData?.dailyPrice?.price || dashData?.settings?.daily_price || 0);

        setStats({
            todayBuy: truncateOneDecimal(todayLatexBuyTotal + todayCupLumpBuyTotal),
            todayLatexBuy: truncateOneDecimal(todayLatexBuyTotal),
            todayCupLumpBuy: truncateOneDecimal(todayCupLumpBuyTotal),
            todaySell: truncateOneDecimal(todaySellTotal),
            todayBuyWeight: truncateOneDecimal(todayLatexWeight + todayCupLumpWeight),
            todayLatexWeight: truncateOneDecimal(todayLatexWeight),
            todayCupLumpWeight: truncateOneDecimal(todayCupLumpWeight),
            todayExpense: truncateOneDecimal(todayExpTotal + todayWageTotal),
            monthIncome, monthCost, monthProfit: profit, dailyPrice,
            unpaidBills, totalMembers: Array.isArray(farmers) ? farmers.length : 0,
            todayAvgDrc
        });

        calculateChemicals(todayLatexWeight, dashData?.settings?.chemicalSettings);
    };

    const calculateChemicals = (totalWeight, settingsJson) => {
        const defaults = [
            { id: 'ammonia', name: 'แอมโมเนีย', icon: '✨', color: 'amber', amount: '20', perLatex: '1000' },
            { id: 'water', name: 'น้ำ', icon: '💧', color: 'blue', amount: '30', perLatex: '800' },
            { id: 'whiteMedicine', name: 'ยาขาว', icon: '⚪', color: 'purple', amount: '1', perLatex: '1000' }
        ];
        let ratios = defaults;
        if (settingsJson) {
            try {
                const saved = JSON.parse(settingsJson);
                ratios = defaults.map(def => {
                    const found = saved.find(s => s.id === def.id);
                    return found ? { ...def, amount: found.amount, perLatex: found.perLatex } : def;
                });
            } catch (e) { console.error("Chemical parse error", e); }
        }
        setChemicalCalcs(ratios.map(r => ({
            ...r,
            result: truncateOneDecimal((totalWeight / (Number(r.perLatex) || 1)) * (Number(r.amount) || 0))
        })));
    };

    const handleRecordChemical = async (chem) => {
        const toastId = toast.loading(`กำลังบันทึกการใส่ ${chem.name}...`);
        try {
            const payload = { date: format(new Date(), 'yyyy-MM-dd'), chemicalId: chem.id, amount: chem.result, unit: 'กก.' };
            const res = await addChemicalUsage(payload);
            if (res.status === 'success') {
                toast.success(`บันทึก ${chem.name} เรียบร้อยแล้ว`, { id: toastId });
                setChemicalUsage(prev => [...prev, { ...payload, id: res.id }]);
            } else { toast.error(res.message || 'บันทึกล้มเหลว', { id: toastId }); }
        } catch (e) { toast.error('ข้อผิดพลาด: ' + e.message, { id: toastId }); }
    };

    const generateChartData = (buys, sells) => {
        const data = [];
        const isValidDate = (d) => !isNaN(new Date(d));
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const range = { start: startOfDay(date), end: endOfDay(date) };
            const dBuys = buys.filter(b => isValidDate(b.date) && isWithinInterval(new Date(b.date), range));
            const dSells = sells.filter(s => isValidDate(s.date) && isWithinInterval(new Date(s.date), range));
            data.push({
                name: format(date, 'dd MMM', { locale: th }),
                ซื้อ: dBuys.reduce((sum, item) => sum + (Number(item.total) || 0), 0),
                ขาย: dSells.reduce((sum, item) => sum + (Number(item.total) || 0), 0),
            });
        }
        setChartData(data);
    };

    const generatePriceChartData = (buys, sells) => {
        const data = [];
        const isValidDate = (d) => !isNaN(new Date(d));
        for (let i = 29; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const range = { start: startOfDay(date), end: endOfDay(date) };
            const dBuys = buys.filter(b => isValidDate(b.date) && isWithinInterval(new Date(b.date), range) && (b.rubberType === 'latex' || !b.rubberType));
            const dSells = sells.filter(s => isValidDate(s.date) && isWithinInterval(new Date(s.date), range) && (s.rubberType === 'latex' || !s.rubberType));
            
            const bPrices = dBuys.map(b => Number(b.pricePerKg)).filter(p => !isNaN(p) && p > 0);
            const sPrices = dSells.map(s => Number(s.pricePerKg)).filter(p => !isNaN(p) && p > 0);
            
            data.push({
                date: format(date, 'dd MMM', { locale: th }),
                'ราคาซื้อ': bPrices.length > 0 ? truncateOneDecimal(bPrices.reduce((a, b) => a + b, 0) / bPrices.length) : null,
                'ราคาขาย': sPrices.length > 0 ? truncateOneDecimal(sPrices.reduce((a, b) => a + b, 0) / sPrices.length) : null,
            });
        }
        setPriceChartData(data);
    };

    const handleAutoWages = () => {
        if (allStaff.length === 0) { toast.error('ไม่มีรายชื่อพนักงานในระบบ'); return; }
        const todayDateStr = format(new Date(), 'yyyy-MM-dd');
        const paidStaffIds = new Set(allWages.filter(w => w.date === todayDateStr).map(w => String(w.staffId)));
        const unpaidStaff = allStaff.filter(s => !paidStaffIds.has(String(s.id)));
        if (unpaidStaff.length === 0) { toast.success('พนักงานทุกคนได้รับค่าจ้างแล้ว'); return; }
        const bonus = Math.floor(stats.todayBuyWeight / 1000) * 10;
        setWageConfirmData({ show: true, unpaidStaff, bonus });
    };

    const confirmAndRecordWages = async () => {
        const { unpaidStaff, bonus } = wageConfirmData;
        setWageConfirmData({ show: false, unpaidStaff: [], bonus: 0 });
        setIsAutoRecording(true);
        const toastId = toast.loading('กำลังบันทึกค่าจ้างอัตโนมัติ...');
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        try {
            const payloads = unpaidStaff.map(s => {
                const dailyWage = Number(s.salary) || 0;
                return {
                    date: todayStr, staffId: s.id, staffName: s.name, workDays: 1,
                    dailyWage, bonus, total: calculateWage(dailyWage, bonus, 1).total, note: 'บันทึกอัตโนมัติ'
                };
            });
            const res = await addBulkWages(payloads);
            if (res.status === 'success') {
                toast.success(`บันทึกสำเร็จ ${payloads.length} คน`, { id: toastId });
                loadDashboardData(true);
            } else { toast.error(res.message || 'บันทึกล้มเหลว', { id: toastId }); }
        } catch (error) { toast.error('เกิดข้อผิดพลาด: ' + error.message, { id: toastId }); }
        finally { setIsAutoRecording(false); }
    };

    const startLuckyDraw = async () => {
        const start = startOfDay(new Date(luckyStartDate));
        const end = endOfDay(new Date(luckyEndDate));
        if (start > end) { toast.error('วันที่เริ่มต้นไม่ควรมากกว่าวันที่สิ้นสุด'); return; }
        
        setIsSpinning(true); setWinner(null); setRewardName('');
        
        try {
            // Check if we already have the data in allBuys, otherwise fetch for this range
            let dateBuys = allBuys.filter(b => isWithinInterval(new Date(b.date), { start, end }));
            
            // If allBuys is currently limited/empty from dashboard load, fetch full list for range
            if (dateBuys.length === 0 || allBuys.length < 50) {
                const toastId = toast.loading('กำลังโหลดข้อมูลย้อนหลัง...');
                const fullBuys = await fetchBuyRecords(); // Fetches from API or LocalDB
                setAllBuys(fullBuys);
                dateBuys = fullBuys.filter(b => isWithinInterval(new Date(b.date), { start, end }));
                toast.dismiss(toastId);
            }

            if (dateBuys.length === 0) { 
                toast.error('ไม่มีรายการรับซื้อในวันที่เลือก'); 
                setIsSpinning(false);
                return; 
            }

            let counter = 0;
            const spinInterval = setInterval(() => {
                setWinner(dateBuys[Math.floor(Math.random() * dateBuys.length)]);
                if (++counter >= 20) {
                    clearInterval(spinInterval); setIsSpinning(false);
                    setWinner(dateBuys[Math.floor(Math.random() * dateBuys.length)]);
                }
            }, 100);
        } catch (e) {
            toast.error('ไม่สามารถโหลดข้อมูลสุ่มรางวัลได้');
            setIsSpinning(false);
        }
    };

    const handleSaveWinner = async () => {
        if (!rewardName.trim()) { toast.error('กรุณากรอกชื่อรางวัล'); return; }
        setSavingReward(true);
        try {
            const payload = {
                date: format(new Date(), 'yyyy-MM-dd'), farmerId: winner.farmerId || '', farmerName: winner.farmerName,
                pointsUsed: 0, rewardName: `🎉 รางวัลผู้โชคดี: ${rewardName.trim()} (จากบิล ${winner.id})`
            };
            const res = await addPromotion(payload);
            if (res.status === 'success') {
                toast.success('บันทึกสำเร็จ'); setShowLuckyDraw(false);
            } else { toast.error(res.message || 'บันทึกล้มเหลว'); }
        } catch (e) { toast.error('ล้มเหลว: ' + e.message); }
        finally { setSavingReward(false); }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rubber-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ภาพรวมระบบ (Dashboard)</h1>
                    <p className="text-gray-500">ข้อมูลสรุปการรับซื้อ-ขายน้ำยางการาประจำวัน</p>
                </div>
                <div className="flex items-center space-x-3 flex-wrap gap-2">
                    {showPrizeDrawBtn && (
                        <button
                            onClick={() => { setShowLuckyDraw(true); setWinner(null); }}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-colors flex items-center"
                        >
                            <Gift size={20} className="mr-2" /> จับฉลากสุ่มแจกรางวัล
                        </button>
                    )}
                    <button onClick={handleAutoWages} disabled={isAutoRecording}
                        className={`font-bold py-2 px-4 rounded-xl shadow-sm transition-all flex items-center space-x-2
                            ${isAutoRecording ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md hover:scale-[1.02]'}`}>
                        <Wallet size={20} />
                        <span>{isAutoRecording ? 'กำลังบันทึก...' : 'บันทึกค่าจ้างพนักงาน'}</span>
                    </button>
                    {isDemo && (
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium border border-yellow-200">โหมดทดลอง (Demo Mode)</span>
                    )}
                </div>
            </div>

            <WageConfirmModal 
                wageConfirmData={wageConfirmData} setWageConfirmData={setWageConfirmData} 
                confirmAndRecordWages={confirmAndRecordWages} stats={stats} 
            />

            <LuckyDrawModal 
                showLuckyDraw={showLuckyDraw} setShowLuckyDraw={setShowLuckyDraw} isSpinning={isSpinning}
                winner={winner} luckyStartDate={luckyStartDate} setLuckyStartDate={setLuckyStartDate}
                luckyEndDate={luckyEndDate} setLuckyEndDate={setLuckyEndDate} startLuckyDraw={startLuckyDraw}
                rewardName={rewardName} setRewardName={setRewardName} handleSaveWinner={handleSaveWinner}
                savingReward={savingReward}
            />

            <DashboardStats stats={stats} />

            <DashboardChemicals 
                chemicalCalcs={chemicalCalcs} handleRecordChemical={handleRecordChemical} 
                chemicalUsage={chemicalUsage} stats={stats} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <DashboardCharts chartData={chartData} priceChartData={priceChartData} />
                </div>
                <div>
                    <DashboardRecent recentTransactions={recentTransactions} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
