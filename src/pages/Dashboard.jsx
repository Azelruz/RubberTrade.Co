import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Droplets,
    Truck,
    DollarSign,
    Gift,
    Wallet,
    Activity,
    FlaskConical
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { fetchDashboardData, fetchBuyRecords, fetchSellRecords, fetchExpenses, fetchWages, fetchStaff, fetchFarmers, addBulkWages, addPromotion, addChemicalUsage, fetchChemicalUsage } from '../services/apiService';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { calculateWage, truncateOneDecimal } from '../utils/calculations';
import { Users, FileText } from 'lucide-react';


export const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayBuy: 0,
        todaySell: 0,
        todayBuyWeight: 0,
        todayExpense: 0,
        monthIncome: 0,
        monthCost: 0,
        monthProfit: 0,
        unpaidBills: 0,
        totalMembers: 0,
        todayAvgDrc: 0,
    });
    const [chemicalCalcs, setChemicalCalcs] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [allBuys, setAllBuys] = useState([]); // store all buys for lucky draw
    const [allStaff, setAllStaff] = useState([]);
    const [allFarmers, setAllFarmers] = useState([]);
    const [allWages, setAllWages] = useState([]);
    const [isAutoRecording, setIsAutoRecording] = useState(false);
    const [wageConfirmData, setWageConfirmData] = useState({ show: false, unpaidStaff: [], bonus: 0 });
    const [chemicalUsage, setChemicalUsage] = useState([]);
    const isDemo = false;

    // Lucky Draw State
    const [showLuckyDraw, setShowLuckyDraw] = useState(false);
    const [luckyStartDate, setLuckyStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [luckyEndDate, setLuckyEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState(null);
    const [rewardName, setRewardName] = useState('');
    const [savingReward, setSavingReward] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async (silent = false) => {
        let hasCache = false;
        try { hasCache = !!sessionStorage.getItem('gc_dashboard'); } catch {}

        if (!silent && !hasCache) setLoading(true);
        try {
            if (isDemo) {
                loadMockData();
                return;
            }

            const [dashData, farmers, chemUsage] = await Promise.all([
                fetchDashboardData(silent),
                fetchFarmers(),
                fetchChemicalUsage()
            ]);

            const buys    = Array.isArray(dashData?.buys)     ? dashData.buys     : [];
            const sells   = Array.isArray(dashData?.sells)    ? dashData.sells    : [];
            const expenses = Array.isArray(dashData?.expenses) ? dashData.expenses : [];
            const wages   = Array.isArray(dashData?.wages)    ? dashData.wages    : [];
            const staff   = Array.isArray(dashData?.staff)    ? dashData.staff    : [];
            const farmerArr = Array.isArray(farmers)           ? farmers           : [];
            
            setAllBuys(buys);
            setAllWages(wages);
            setAllStaff(staff);
            setAllFarmers(farmerArr);
            setChemicalUsage(Array.isArray(chemUsage) ? chemUsage : []);

            calculateStats(buys, sells, expenses, wages, dashData, farmerArr);
            generateChartData(buys, sells);

            const recent = [
                ...buys.map(b => ({ ...b, type: 'buy' })),
                ...sells.map(s => ({ ...s, type: 'sell' }))
            ]
                .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
                .slice(0, 5);

            setRecentTransactions(recent);

        } catch (error) {
            console.error("Dashboard error:", error);
        } finally {
            setLoading(false);
        }
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
        const todayBuyTotal = todayBuys.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const todayBuyWeight = todayBuys.reduce((sum, item) => {
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

        const todayTotalDry = todayBuys.reduce((sum, item) => sum + (Number(item.dryRubber || item.dryWeight || 0)), 0);
        const todayAvgDrc = todayBuyWeight > 0 
            ? (todayTotalDry / todayBuyWeight) * 100 
            : 0;

        const unpaidBills = buys.reduce((count, r) => {
            let p = 0;
            if (r.farmerStatus !== 'Paid') p++;
            if (Number(r.employeeTotal || 0) > 0 && r.employeeStatus !== 'Paid') p++;
            return count + p;
        }, 0);
        const totalMembers = Array.isArray(farmers) ? farmers.length : 0;

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
            todayBuy: truncateOneDecimal(todayBuyTotal),
            todaySell: truncateOneDecimal(todaySellTotal),
            todayBuyWeight: truncateOneDecimal(todayBuyWeight),
            todayExpense: truncateOneDecimal(todayExpTotal + todayWageTotal),
            monthIncome: monthIncome,
            monthCost: monthCost,
            monthProfit: profit,
            dailyPrice: dailyPrice,
            unpaidBills: unpaidBills,
            totalMembers: totalMembers,
            todayAvgDrc: todayAvgDrc
        });

        // Calculate Chemicals
        calculateChemicals(todayBuyWeight, dashData?.settings?.chemicalSettings);
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

        const calcs = ratios.map(r => {
            const amount = Number(r.amount) || 0;
            const perLatex = Number(r.perLatex) || 1;
            const result = (totalWeight / perLatex) * amount;
            return { ...r, result: truncateOneDecimal(result) };
        });

        setChemicalCalcs(calcs);
    };

    const handleRecordChemical = async (chem) => {
        if (isDemo) {
            toast.error('ไม่สามารถใช้งานบันทึกใน Demo Mode ได้');
            return;
        }

        const toastId = toast.loading(`กำลังบันทึกการใส่ ${chem.name}...`);
        try {
            const todayDateStr = format(new Date(), 'yyyy-MM-dd');
            const payload = {
                date: todayDateStr,
                chemicalId: chem.id,
                amount: chem.result,
                unit: 'กก.'
            };
            const res = await addChemicalUsage(payload);
            if (res.status === 'success') {
                toast.success(`บันทึก ${chem.name} เรียบร้อยแล้ว`, { id: toastId });
                setChemicalUsage(prev => [...prev, { ...payload, id: res.id }]);
            } else {
                toast.error(res.message || 'บันทึกล้มเหลว', { id: toastId });
            }
        } catch (e) {
            toast.error('ข้อผิดพลาด: ' + e.message, { id: toastId });
        }
    };

    const generateChartData = (buys, sells) => {
        const isValidDate = (d) => {
            const date = new Date(d);
            return date instanceof Date && !isNaN(date);
        };

        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const start = startOfDay(date);
            const end = endOfDay(date);

            const dayBuys = buys.filter(b => isValidDate(b.date) && isWithinInterval(new Date(b.date), { start, end }));
            const daySells = sells.filter(s => isValidDate(s.date) && isWithinInterval(new Date(s.date), { start, end }));

            const buyTotal = dayBuys.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
            const sellTotal = daySells.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

            data.push({
                name: format(date, 'dd MMM', { locale: th }),
                ซื้อ: buyTotal,
                ขาย: sellTotal,
            });
        }
        setChartData(data);
    };

    const handleAutoWages = () => {
        if (isDemo) {
            toast.error('ไม่สามารถใช้งานบันทึกอัตโนมัติใน Demo Mode ได้');
            return;
        }

        if (allStaff.length === 0) {
            toast.error('ไม่มีรายชื่อพนักงานในระบบ กรุณาเพิ่มพนักงานในหน้าตั้งค่าก่อน');
            return;
        }

        const todayDateStr = format(new Date(), 'yyyy-MM-dd');
        const paidStaffIds = new Set(
            allWages.filter(w => w.date === todayDateStr).map(w => String(w.staffId))
        );
        const unpaidStaff = allStaff.filter(s => !paidStaffIds.has(String(s.id)));

        if (unpaidStaff.length === 0) {
            toast.success('พนักงานทุกคนได้รับการบันทึกค่าจ้างวันนี้เรียบร้อยแล้ว');
            return;
        }

        const calculatedBonus = Math.floor(stats.todayBuyWeight / 1000) * 10;
        setWageConfirmData({ show: true, unpaidStaff, bonus: calculatedBonus });
    };

    const confirmAndRecordWages = async () => {
        const { unpaidStaff, bonus } = wageConfirmData;
        setWageConfirmData({ show: false, unpaidStaff: [], bonus: 0 });
        setIsAutoRecording(true);
        const toastId = toast.loading('กำลังบันทึกค่าจ้างอัตโนมัติ...');
        const todayDateStr = format(new Date(), 'yyyy-MM-dd');

        try {
            const payloads = unpaidStaff.map(s => {
                const dailyWage = Number(s.salary) || 0;
                const record = calculateWage(dailyWage, bonus, 1);
                return {
                    date: todayDateStr,
                    staffId: s.id,
                    staffName: s.name,
                    workDays: 1,
                    dailyWage: dailyWage,
                    bonus: bonus,
                    total: record.total,
                    note: 'บันทึกอัตโนมัติ'
                };
            });

            const res = await addBulkWages(payloads);
            if (res.status === 'success') {
                toast.success(`บันทึกค่าจ้างพนักงาน ${payloads.length} คน เรียบร้อยแล้ว`, { id: toastId });
                loadDashboardData(true);
            } else {
                toast.error(res.message || 'บันทึกล้มเหลว', { id: toastId });
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message, { id: toastId });
        } finally {
            setIsAutoRecording(false);
        }
    };

    const loadMockData = () => {
        setStats({
            todayBuy: 45000,
            todaySell: 52000,
            todayBuyWeight: 1200,
            todayExpense: 2500,
            monthIncome: 520000,
            monthCost: 460000,
            monthProfit: 60000
        });

        setChartData([
            { name: '01 มี.ค.', ซื้อ: 40000, ขาย: 45000 },
            { name: '02 มี.ค.', ซื้อ: 30000, ขาย: 35000 },
            { name: '03 มี.ค.', ซื้อ: 45000, ขาย: 50000 },
            { name: '04 มี.ค.', ซื้อ: 25000, ขาย: 30000 },
            { name: '05 มี.ค.', ซื้อ: 45000, ขาย: 52000 },
        ]);

        setRecentTransactions([
            { id: '1', type: 'buy', farmerName: 'สมชาย รักดี', weight: 150, total: 5250, date: new Date().toISOString() },
            { id: '2', type: 'sell', buyerName: 'โรงงาน A', weight: 1000, total: 45000, date: new Date().toISOString() },
            { id: '3', type: 'buy', farmerName: 'สมพร ใจสู้', weight: 80, total: 2800, date: new Date().toISOString() },
        ]);
        
        setAllBuys([
            { id: '1', date: new Date().toISOString(), farmerName: 'สมชาย รักดี', weight: 150, total: 5250, farmerId: 'f1' },
            { id: '3', date: new Date().toISOString(), farmerName: 'สมพร ใจสู้', weight: 80, total: 2800, farmerId: 'f2' },
            { id: '4', date: new Date().toISOString(), farmerName: 'วิชัย ใจงาม', weight: 120, total: 4200, farmerId: 'f3' },
            { id: '5', date: new Date().toISOString(), farmerName: 'สมจรี มีสุข', weight: 95, total: 3325, farmerId: 'f4' },
        ]);
    };

    // Lucky Draw Logic
    const startLuckyDraw = () => {
        const start = startOfDay(new Date(luckyStartDate));
        const end = endOfDay(new Date(luckyEndDate));

        if (start > end) {
            toast.error('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
            return;
        }

        const dateBuys = allBuys.filter(b => {
             const billDate = new Date(b.date);
             return isWithinInterval(billDate, { start, end });
        });

        if (dateBuys.length === 0) {
            toast.error('ไม่มีรายการรับซื้อในวันที่เลือก');
            return;
        }

        setIsSpinning(true);
        setWinner(null);
        setRewardName('');

        let counter = 0;
        const totalSpins = 20;
        const intervalTime = 100;

        const spinInterval = setInterval(() => {
            const randomIdx = Math.floor(Math.random() * dateBuys.length);
            setWinner(dateBuys[randomIdx]);
            counter++;

            if (counter >= totalSpins) {
                clearInterval(spinInterval);
                setIsSpinning(false);
                const finalWinner = dateBuys[Math.floor(Math.random() * dateBuys.length)];
                setWinner(finalWinner);
            }
        }, intervalTime);
    };

    const handleSaveWinner = async () => {
        if (!rewardName.trim()) {
            toast.error('กรุณากรอกชื่อรางวัล');
            return;
        }

        setSavingReward(true);
        try {
            const payload = {
                date: format(new Date(), 'yyyy-MM-dd'),
                farmerId: winner.farmerId || '',
                farmerName: winner.farmerName,
                pointsUsed: 0,
                rewardName: `🎉 รางวัลผู้โชคดี: ${rewardName.trim()} (จากบิล ${winner.id})`
            };

            if (isDemo) {
                toast.success('บันทึกรางวัลสุ่มแจกสำเร็จ (Demo)');
                setShowLuckyDraw(false);
                return;
            }

            const res = await addPromotion(payload);
            if (res.status === 'success') {
                toast.success('บันทึกผู้โชคดีสำเร็จ ดูประวัติได้ที่หน้าโปรโมชั่น');
                setShowLuckyDraw(false);
            } else {
                toast.error(res.message || 'บันทึกล้มเหลว');
            }
        } catch (e) {
            toast.error('บันทึกล้มเหลว: ' + e.message);
        } finally {
            setSavingReward(false);
        }
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
                    <button
                        onClick={() => {
                            setShowLuckyDraw(true);
                            setWinner(null);
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-colors flex items-center"
                    >
                        <Gift size={20} className="mr-2" /> จับฉลากสุ่มแจกรางวัล
                    </button>
                    <button onClick={handleAutoWages} disabled={isAutoRecording}
                        className={`font-bold py-2 px-4 rounded-xl shadow-sm transition-all flex items-center space-x-2
                            ${isAutoRecording ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md hover:scale-[1.02]'}`}>
                        <Wallet size={20} />
                        <span>{isAutoRecording ? 'กำลังบันทึก...' : 'บันทึกค่าจ้างพนักงาน'}</span>
                    </button>
                    {isDemo && (
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium border border-yellow-200">
                            โหมดทดลอง (Demo Mode)
                        </span>
                    )}
                </div>
            </div>

        {/* Wage Confirm Modal */}
            {wageConfirmData.show && (
                <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                <Wallet className="text-blue-600" size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">ยืนยันบันทึกค่าจ้าง</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                            พนักงานที่ยังไม่ได้บันทึกวันนี้ <strong>{wageConfirmData.unpaidStaff.length} คน</strong>:
                        </p>
                        <ul className="text-sm text-gray-700 mb-3 space-y-1 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
                            {wageConfirmData.unpaidStaff.map(s => (
                                <li key={s.id} className="flex justify-between">
                                    <span className="font-medium">{s.name}</span>
                                    <span className="text-gray-500">ค่าจ้าง ฿{(Number(s.salary)||0).toLocaleString()} + โบนัส ฿{wageConfirmData.bonus}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs text-gray-400 mb-4">โบนัสคำนวณจากน้ำยาง {stats.todayBuyWeight.toLocaleString()} กก. = ฿{wageConfirmData.bonus}/คน</p>
                        <div className="flex space-x-3">
                            <button onClick={() => setWageConfirmData({ show: false, unpaidStaff: [], bonus: 0 })}
                                className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">ยกเลิก</button>
                            <button onClick={confirmAndRecordWages}
                                className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold">ยืนยัน บันทึกค่าจ้าง</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lucky Draw Modal */}
            {showLuckyDraw && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-white text-center rounded-t-2xl relative">
                            <button onClick={() => !isSpinning && setShowLuckyDraw(false)} className="absolute top-4 right-4 text-white/80 hover:text-white">ปิด</button>
                            <Gift size={48} className="mx-auto mb-2 opacity-90" />
                            <h2 className="text-2xl font-black tracking-tight">จับผู้โชคดีสุ่มแจกรางวัล</h2>
                            <p className="text-yellow-100 text-sm mt-1">สุ่มรางวัลจากรายชื่อเกษตรกรที่นำยางมาขาย</p>
                        </div>
                        
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">เริ่มต้น:</label>
                                    <input 
                                        type="date" 
                                        value={luckyStartDate} 
                                        onChange={e => setLuckyStartDate(e.target.value)}
                                        disabled={isSpinning}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">สิ้นสุด:</label>
                                    <input 
                                        type="date" 
                                        value={luckyEndDate} 
                                        onChange={e => setLuckyEndDate(e.target.value)}
                                        disabled={isSpinning}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 min-h-[140px] flex flex-col items-center justify-center relative overflow-hidden mb-6">
                                {!winner && !isSpinning ? (
                                    <p className="text-gray-400 font-medium text-center">กดปุ่มเริ่มสุ่มเพื่อหาผู้โชคดี</p>
                                ) : (
                                    <div className={`text-center transition-all ${isSpinning ? 'scale-105 opacity-80 blur-[1px]' : 'scale-110 opacity-100'}`}>
                                        <p className="text-xs font-bold text-gray-500 mb-1">เลขที่บิล: {winner?.id}</p>
                                        <h3 className="text-3xl font-black text-gray-900 mb-2 truncate max-w-[280px]">{winner?.farmerName}</h3>
                                        <div className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                                            น้ำยาง: {winner?.weight} กก.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {!isSpinning && winner && (
                                <div className="mb-6 animate-in slide-in-from-bottom-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">🎈 รางวัลที่จะให้:</label>
                                    <input 
                                        type="text" 
                                        value={rewardName}
                                        onChange={e => setRewardName(e.target.value)}
                                        placeholder="ไข่ไก่ 1 แผง, ปุ๋ยเคมี 1 กระสอบ..."
                                        className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 shadow-sm"
                                        autoFocus
                                    />
                                </div>
                            )}

                            <div className="mt-2">
                                {/* Lucky Draw Button Group */}
                                <div className="flex flex-col space-y-2">
                                    {!winner || isSpinning ? (
                                        <button 
                                            onClick={startLuckyDraw}
                                            disabled={isSpinning}
                                            className={`w-full py-4 rounded-xl font-black text-base text-white shadow-lg transition-all transform active:scale-95 ${isSpinning ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-rubber-600 to-rubber-700 hover:shadow-rubber-200'}`}
                                        >
                                            {isSpinning ? (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>กำลังสุ่มผู้โชคดี...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center space-x-2">
                                                    <Gift size={20} />
                                                    <span>🎯 เริ่มสุ่มรางวัลตอนนี้</span>
                                                </div>
                                            )}
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={handleSaveWinner}
                                                disabled={savingReward}
                                                className="w-full py-4 rounded-xl font-black text-base text-white shadow-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:shadow-yellow-200 transition-all transform active:scale-95 flex justify-center items-center space-x-2"
                                            >
                                                {savingReward ? (
                                                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                ) : <Gift size={20} />}
                                                <span>{savingReward ? 'กำลังบันทึก...' : 'บันทึกรางวัลผู้โชคดี'}</span>
                                            </button>
                                            <button 
                                                onClick={startLuckyDraw}
                                                className="w-full py-2 rounded-xl font-bold text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all underline decoration-dotted"
                                            >
                                                สุ่มผู้โชคดีคนถัดไป
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Today's Summary */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <span className="w-2 h-6 bg-blue-500 rounded-full mr-2"></span> สรุปรายการวันนี้
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ">
                    <StatCard
                        title="ยอดรับซื้อวันนี้"
                        value={`฿${Number(stats.todayBuy).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<Droplets className="text-blue-500" size={24} />}
                        bgColor="bg-blue-50"
                    />
                    <StatCard
                        title="ปริมาณน้ำยางวันนี้"
                        value={`${Number(stats.todayBuyWeight).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กก.`}
                        icon={<TrendingUp className="text-rubber-500" size={24} />}
                        bgColor="bg-rubber-50"
                    />
                    <StatCard
                        title="เฉลี่ย % DRC วันนี้"
                        value={`${Number(stats.todayAvgDrc).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
                        icon={<Activity className="text-cyan-500" size={24} />}
                        bgColor="bg-cyan-50"
                    />
                    <StatCard
                        title="ยอดขายวันนี้"
                        value={`฿${Number(stats.todaySell).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<Truck className="text-orange-500" size={24} />}
                        bgColor="bg-orange-50"
                    />
                    <StatCard
                        title="ราคายางวันนี้"
                        value={`฿${Number(stats.dailyPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<DollarSign className="text-emerald-500" size={24} />}
                        bgColor="bg-emerald-50"
                    />
                    <StatCard
                        title="ค่าใช้จ่ายวันนี้"
                        value={`฿${Number(stats.todayExpense).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<Wallet className="text-red-500" size={24} />}
                        bgColor="bg-red-50"
                    />
                    <StatCard
                        title="รายการค้างจ่าย"
                        value={`${stats.unpaidBills} รายการ`}
                        icon={<FileText className="text-amber-500" size={24} />}
                        bgColor="bg-amber-50"
                        valueColor="text-amber-700"
                    />
                    <StatCard
                        title="สมาชิกในระบบ"
                        value={`${stats.totalMembers} ราย`}
                        icon={<Users className="text-purple-500" size={24} />}
                        bgColor="bg-purple-50"
                        valueColor="text-purple-700"
                    />
                </div>
            </div>

            {/* Rubber Management (Chemicals) Section */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-gray-900 flex items-center tracking-tight">
                        <FlaskConical className="mr-2 text-purple-600" size={24} />
                        การจัดการน้ำยาง (ปริมาณสารเคมีที่ต้องใช้)
                    </h2>
                    <div className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-black rounded-full border border-purple-200 uppercase tracking-widest">
                        Today's Dosage
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {chemicalCalcs.map((chem) => {
                        const theme = {
                            amber: 'from-amber-500 to-yellow-500 shadow-amber-200 border-amber-100',
                            blue: 'from-blue-500 to-cyan-500 shadow-blue-200 border-blue-100',
                            purple: 'from-purple-500 to-indigo-500 shadow-purple-200 border-purple-100'
                        }[chem.color] || 'from-gray-500 to-slate-500 shadow-gray-200 border-gray-100';

                        return (
                            <div key={chem.id} className={`relative overflow-hidden bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group`}>
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme} opacity-[0.03] -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform`}></div>
                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${theme} text-white shadow-lg`}>
                                        {chem.id === 'ammonia' ? <FlaskConical size={20} /> : 
                                         chem.id === 'water' ? <Droplets size={20} /> : 
                                         <Activity size={20} />}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Needed</p>
                                        <div className="text-2xl font-black text-gray-900 leading-none">
                                            {chem.result.toLocaleString()} <span className="text-xs font-bold text-gray-400">กก.</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <h3 className="font-bold text-gray-800 text-sm">{chem.name}</h3>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        อัตราส่วน: {chem.amount} กก. / น้ำยาง {Number(chem.perLatex).toLocaleString()} กก.
                                    </p>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden mr-4">
                                        <div className={`h-full bg-gradient-to-r ${theme} transition-all duration-1000`} style={{ width: stats.todayBuyWeight > 0 ? '100%' : '0%' }}></div>
                                    </div>
                                    {(() => {
                                        const todayDateStr = format(new Date(), 'yyyy-MM-dd');
                                        const isRecorded = chemicalUsage.some(u => u.chemicalId === chem.id && u.date === todayDateStr);
                                        return (
                                            <button
                                                onClick={() => handleRecordChemical(chem)}
                                                disabled={isRecorded || stats.todayBuyWeight === 0}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                                                    isRecorded 
                                                    ? 'bg-green-100 text-green-700 cursor-default opacity-100' 
                                                    : stats.todayBuyWeight === 0 
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                                        : 'bg-white border-2 hover:bg-gray-50 active:scale-95 shadow-sm'
                                                } ${!isRecorded && stats.todayBuyWeight > 0 ? (
                                                    chem.color === 'amber' ? 'border-amber-200 text-amber-700' : 
                                                    chem.color === 'blue' ? 'border-blue-200 text-blue-700' : 
                                                    'border-purple-200 text-purple-700'
                                                ) : ''}`}
                                            >
                                                {isRecorded ? 'บันทึกแล้ว ✓' : 'บันทึก'}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>


            {/* Monthly Overview */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-6 bg-green-500 rounded-full mr-2"></span> ภาพรวมผลประกอบการ (เดือนนี้)
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard
                        title="รายรับรวม (ยอดขาย)"
                        value={`฿${Number(stats.monthIncome).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<TrendingUp className="text-green-500" size={24} />}
                        bgColor="bg-green-50"
                    />
                    <StatCard
                        title="ต้นทุนรวม (ซื้อน้ำยาง+ค่าใช้จ่าย)"
                        value={`฿${Number(stats.monthCost).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<TrendingDown className="text-red-500" size={24} />}
                        bgColor="bg-red-50"
                    />
                    <StatCard
                        title="กำไรสุทธิ"
                        value={`${stats.monthProfit >= 0 ? '+' : '-'}฿${Number(Math.abs(stats.monthProfit)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<DollarSign className={`${stats.monthProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} size={24} />}
                        bgColor={stats.monthProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}
                        valueColor={stats.monthProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}
                    />
                </div>
            </div>

            {/* Charts and Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">แนวโน้มการซื้อ-ขาย (7 วันย้อนหลัง)</h2>
                    <div className="h-72" style={{ minHeight: '288px' }}>
                        <ResponsiveContainer width="100%" height={300} minWidth={100}>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} tickFormatter={(value) => `฿${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [`฿${Number(value).toLocaleString()}`, undefined]}
                                />
                                <Line type="monotone" dataKey="ซื้อ" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="ขาย" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">รายการล่าสุด</h2>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                        {recentTransactions.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">ไม่มีรายการล่าสุด</p>
                        ) : (
                            recentTransactions.map((tx, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${tx.type === 'buy' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {tx.type === 'buy' ? <Droplets size={18} /> : <Truck size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {tx.type === 'buy' ? `รับซื้อ: ${tx.farmerName}` : `ขาย: ${tx.buyerName}`}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {format(new Date(tx.date), 'dd MMM yyyy HH:mm', { locale: th })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-bold ${tx.type === 'buy' ? 'text-blue-600' : 'text-orange-600'}`}>
                                            {tx.type === 'buy' ? '-' : '+'}฿{Number(tx.total).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                        </p>
                                        <p className="text-xs text-gray-500">{truncateOneDecimal(tx.weight).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กก.</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

// Helper Component
const StatCard = ({ title, value, icon, bgColor, valueColor }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className={`p-4 rounded-full ${bgColor}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className={`text-2xl font-bold ${valueColor || 'text-gray-900'}`}>{value}</p>
        </div>
    </div>
);

export default Dashboard;
