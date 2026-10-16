import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    MapPin, Sprout, CloudRain, Droplets, DollarSign, Users, Award, 
    AlertTriangle, Check, Clock, TrendingUp, Share2, Copy, RefreshCw, 
    Sparkles, Wrench, ShieldCheck, CheckCircle2, ChevronRight,
    LogIn, Home as HomeIcon
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import LandPlotMap from '../components/map/LandPlotMap';

export const FarmerPlotPortal = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const handleExitToApp = () => {
        try {
            localStorage.removeItem('rubbertrade_member_portal_url');
            localStorage.removeItem('rubbertrade_farmer_plot_url');
        } catch (e) {}
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    const handleGoHome = () => {
        try {
            localStorage.removeItem('rubbertrade_member_portal_url');
            localStorage.removeItem('rubbertrade_farmer_plot_url');
        } catch (e) {}
        navigate('/');
    };

    // Filter states
    const [selectedPlotId, setSelectedPlotId] = useState('');
    const [period, setPeriod] = useState('month'); // 'today', '7days', 'month', 'year', 'all'

    // Get farmer id from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const farmerId = urlParams.get('id') || urlParams.get('farmerId');

    const loadData = async () => {
        if (!farmerId) {
            setError('ไม่พบรหัสเกษตรกรในลิงก์ กรุณาสแกน QR Code ใหม่อีกครั้ง');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            let endpoint = `/api/farmer_plot/public?id=${encodeURIComponent(farmerId)}&period=${period}`;
            if (selectedPlotId) {
                endpoint += `&plotId=${encodeURIComponent(selectedPlotId)}`;
            }

            const response = await fetch(endpoint);
            const json = await response.json();

            if (!response.ok || json.status === 'error') {
                throw new Error(json.message || 'ไม่สามารถโหลดข้อมูลสวนได้');
            }

            setData(json.data);

            if (!selectedPlotId && json.data?.plots && json.data.plots.length > 0) {
                setSelectedPlotId(json.data.plots[0].id);
            }

            try {
                const currentUrl = window.location.pathname + window.location.search;
                localStorage.setItem('rubbertrade_farmer_plot_url', currentUrl);
                if (json.data?.farmer?.name) {
                    document.title = `แปลงสวนยาง - ${json.data.farmer.name}`;
                }
            } catch (e) {}
        } catch (err) {
            console.error('Error loading farmer plot portal:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [farmerId, selectedPlotId, period]);

    // Dynamically update manifest link to point to farmer plot manifest with exact start_url
    useEffect(() => {
        if (!farmerId) return;
        const farmerName = data?.farmer?.name ? `&name=${encodeURIComponent(data.farmer.name)}` : '';
        const manifestUrl = `/api/farmer_plot/manifest?id=${encodeURIComponent(farmerId)}${farmerName}`;

        let manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            manifestLink.setAttribute('href', manifestUrl);
        } else {
            manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = manifestUrl;
            document.head.appendChild(manifestLink);
        }

        return () => {
            const m = document.querySelector('link[rel="manifest"]');
            if (m) m.setAttribute('href', '/manifest.webmanifest');
        };
    }, [farmerId, data?.farmer?.name]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('คัดลอกลิงก์เรียบร้อยแล้ว');
    };

    if (loading && !data) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
                    <Sprout size={32} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">กำลังโหลดข้อมูลสวนยางพารา...</h2>
                <p className="text-xs text-gray-500">ระบบกำลังดึงข้อมูลแปลง ผลผลิต และสภาพอากาศ</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">ไม่สามารถแสดงข้อมูลสวนได้</h2>
                <p className="text-xs text-red-600 max-w-sm mb-6 bg-red-50 p-3 rounded-2xl border border-red-100">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md"
                >
                    ลองใหม่อีกครั้ง
                </button>
            </div>
        );
    }

    const { farmer, plots = [], selectedPlot, periodSummary, cumulativeGroup, promotions, cooperative, plotCare, weather } = data || {};
    const plotRai = selectedPlot ? (parseFloat(selectedPlot.rai) || 0) + (parseFloat(selectedPlot.ngan) || 0) / 4 : 0;
    const recommendedKgPerApp = Math.round(plotRai * 37.5);
    const recommendedBagsPerApp = (recommendedKgPerApp / 50).toFixed(1);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-gray-800 pb-16">
            <Toaster position="top-center" />

            {/* Top Bar for System Navigation & Shop Access */}
            <header className="bg-gray-900 text-white px-4 py-2 text-xs flex items-center justify-between sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="font-bold text-gray-300 truncate">
                        {user ? `ร้านค้า: ${user.name || user.email}` : 'RubberTrade'}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleExitToApp}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 text-xs"
                    >
                        <LogIn size={13} />
                        <span>{user ? 'เข้าสู่หน้าจัดการร้าน (Dashboard)' : 'เข้าสู่ระบบโปรแกรมหลัก (Login)'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleGoHome}
                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-colors flex items-center gap-1 text-xs"
                        title="กลับหน้าแรก"
                    >
                        <HomeIcon size={13} />
                        <span className="hidden sm:inline">หน้าแรก</span>
                    </button>
                </div>
            </header>

            {/* Mobile Header Bar */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-5 rounded-b-[2rem] shadow-lg">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-inner">
                            <Sprout size={24} />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">
                                สวนยางของฉัน • My Rubber Plot
                            </span>
                            <h1 className="text-lg font-black leading-tight truncate">
                                {farmer?.name || 'เกษตรกรชาวสวนยาง'}
                            </h1>
                            <span className="text-[11px] text-white/80 font-mono">
                                รหัส: {farmer?.id} {farmer?.phone ? `• โทร: ${farmer.phone}` : ''}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleCopyLink}
                        className="p-2.5 bg-white/15 hover:bg-white/25 rounded-2xl backdrop-blur-xs transition-all text-white"
                        title="คัดลอกลิงก์"
                    >
                        <Share2 size={18} />
                    </button>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {/* Plot Selector Tabs (If multiple plots) */}
                {plots.length > 1 && (
                    <div className="bg-white p-2.5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-2 overflow-x-auto custom-scrollbar">
                        <span className="text-[11px] font-bold text-gray-500 pl-1 whitespace-nowrap">เลือกแปลง:</span>
                        {plots.map((p, idx) => {
                            const isSelected = selectedPlot?.id === p.id;
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedPlotId(p.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                                        isSelected
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <MapPin size={13} />
                                    <span>{p.plotName || `แปลงที่ ${idx + 1}`} ({p.rai || 0} ไร่)</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Weather Tapping Card (วันนี้กรีดยางได้มั้ย?) */}
                <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-700 flex items-center space-x-1.5">
                            <CloudRain size={16} className="text-blue-600" />
                            <span>สภาพอากาศสวนยางวันนี้ (01:00 - 06:00 น.)</span>
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">รายพิกัดแปลง</span>
                    </div>

                    {weather ? (
                        <div className="space-y-2">
                            <div className={`p-3.5 rounded-2xl border text-center font-bold ${
                                weather.canTap === 'yes' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                                weather.canTap === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-red-50 border-red-300 text-red-900'
                            }`}>
                                <span className="text-xl block font-black">{weather.canTapText}</span>
                                <span className="text-xs font-normal block mt-1">
                                    โอกาสฝนตกช่วงเช้ามืด: <strong>{weather.rainProbability}%</strong> (ฝนสะสม {weather.totalRainMm} มม.)
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[11px] text-gray-400 block">อุณหภูมิ</span>
                                    <span className="font-bold text-gray-800">{weather.avgTemp} °C</span>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[11px] text-gray-400 block">ความชื้นสัมพัทธ์</span>
                                    <span className="font-bold text-gray-800">{weather.avgHumidity} %</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-2xl">
                            แปลงนี้ยังไม่ได้ระบุพิกัด GPS
                        </div>
                    )}
                </div>

                {/* Period Selector Pills */}
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-gray-500">ช่วงเวลาข้อมูล:</span>
                    <div className="inline-flex p-1 bg-gray-200/70 rounded-2xl text-[11px] font-bold">
                        {[
                            { id: 'month', label: 'เดือนนี้' },
                            { id: '7days', label: '7 วัน' },
                            { id: 'today', label: 'วันนี้' },
                            { id: 'all', label: 'ทั้งหมด' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setPeriod(t.id)}
                                className={`px-2.5 py-1 rounded-xl transition-all ${
                                    period === t.id ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4 Summary Cards */}
                <div className="grid grid-cols-2 gap-2.5">
                    {/* Card 1: เงินเข้ากระเป๋าเจ้าของสวน */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-3.5 rounded-3xl border border-emerald-200 shadow-xs">
                        <span className="text-[11px] font-bold text-emerald-800 block mb-1 flex items-center space-x-1">
                            <DollarSign size={14} className="text-emerald-600" />
                            <span>เงินเข้ากระเป๋า</span>
                        </span>
                        <div className="text-xl font-black text-emerald-950 font-mono">
                            {periodSummary?.farmerTotal?.toLocaleString() || '0'} <span className="text-xs font-bold text-emerald-700">฿</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 mt-0.5 block">
                            (หักส่วนแบ่งคนกรีดแล้ว)
                        </span>
                    </div>

                    {/* Card 2: ส่วนแบ่งคนกรีด */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-3.5 rounded-3xl border border-blue-200 shadow-xs">
                        <span className="text-[11px] font-bold text-blue-800 block mb-1 flex items-center space-x-1">
                            <Users size={14} className="text-blue-600" />
                            <span>ส่วนแบ่งคนกรีด</span>
                        </span>
                        <div className="text-xl font-black text-blue-950 font-mono">
                            {periodSummary?.employeeTotal?.toLocaleString() || '0'} <span className="text-xs font-bold text-blue-700">฿</span>
                        </div>
                        <span className="text-[10px] text-blue-700 mt-0.5 block truncate">
                            {selectedPlot?.employeeName || 'กรีดเอง 100%'}
                        </span>
                    </div>

                    {/* Card 3: ยางสะสมในกลุ่ม */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-3.5 rounded-3xl border border-amber-200 shadow-xs">
                        <span className="text-[11px] font-bold text-amber-800 block mb-1 flex items-center space-x-1">
                            <Droplets size={14} className="text-amber-600" />
                            <span>ยางสะสมในกลุ่ม</span>
                        </span>
                        <div className="text-xl font-black text-amber-950 font-mono">
                            {cumulativeGroup?.weight?.toLocaleString() || '0'} <span className="text-xs font-bold text-amber-700">กก.</span>
                        </div>
                        <span className="text-[10px] text-amber-700 mt-0.5 block">
                            DRC {cumulativeGroup?.dryRubber?.toLocaleString() || '0'} กก.
                        </span>
                    </div>

                    {/* Card 4: แต้มสะสม & ปันผล */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 p-3.5 rounded-3xl border border-purple-200 shadow-xs">
                        <span className="text-[11px] font-bold text-purple-800 block mb-1 flex items-center space-x-1">
                            <Award size={14} className="text-purple-600" />
                            <span>แต้มสะสม & ปันผล</span>
                        </span>
                        <div className="text-xl font-black text-purple-950 font-mono">
                            {promotions?.currentPoints?.toLocaleString() || '0'} <span className="text-xs font-bold text-purple-700">แต้ม</span>
                        </div>
                        <span className="text-[10px] text-purple-700 mt-0.5 block truncate">
                            {cooperative?.isMember ? `หุ้นสหกรณ์: ${cooperative.shareCount} หุ้น` : 'สิทธิประโยชน์'}
                        </span>
                    </div>
                </div>

                {/* Plot Details: Area & Fertilizer */}
                <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                            <Sprout size={16} className="text-emerald-600" />
                            <span>ข้อมูลแปลง & แผนการใส่ปุ๋ย</span>
                        </span>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {selectedPlot?.plotName || 'แปลงสวนยาง'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div>
                            <span className="text-gray-400 block text-[11px]">ขนาดเนื้อที่</span>
                            <span className="font-bold text-gray-800">{selectedPlot?.rai || 0} ไร่ {selectedPlot?.ngan || 0} งาน</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block text-[11px]">เลขโฉนด</span>
                            <span className="font-bold text-gray-800 font-mono">{selectedPlot?.deedNumber || '-'}</span>
                        </div>
                    </div>

                    {/* Fertilizer Recommendation */}
                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 text-xs space-y-1">
                        <div className="font-bold text-emerald-950 flex justify-between items-center">
                            <span>สูตรปุ๋ยแนะนำ (กยท.):</span>
                            <span className="text-emerald-700 font-mono font-black">{recommendedBagsPerApp} กระสอบ</span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                            แนะนำสูตร <strong>29-5-18</strong> หรือ <strong>20-8-20</strong> (ประมาณ {recommendedKgPerApp} กก./รอบ)
                        </p>
                    </div>

                    {/* Next Fertilizer & Mowing Status */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-100">
                            <span className="text-[10px] text-amber-700 block font-bold">รอบใส่ปุ๋ยถัดไป:</span>
                            <span className="font-bold text-amber-900 text-[11px] block mt-0.5">
                                {plotCare?.lastFertilizer?.nextDueDate || 'รอบปลายฝน (ก.ย.-ต.ค.)'}
                            </span>
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] text-slate-500 block font-bold">ความสะอาดสวน:</span>
                            <span className={`font-bold text-[11px] block mt-0.5 ${
                                plotCare?.lastMowing?.status === 'clean' ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                                {plotCare?.lastMowing?.status === 'clean' ? '🌿 สวนสะอาดเรียบร้อย' : '🌾 ใกล้ถึงรอบตัดหญ้า'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Smart DRC Advice Card */}
                <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 space-y-2 text-xs">
                    <span className="font-bold text-gray-800 flex items-center space-x-1.5 pb-1 border-b border-gray-100">
                        <AlertTriangle size={15} className="text-amber-500" />
                        <span>วิธีปรับสภาพเมื่อเปอร์เซ็นต์น้ำยาง (% DRC) ตกต่ำ</span>
                    </span>
                    <ul className="space-y-1.5 text-[11px] text-gray-600 list-disc list-inside bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                        <li><strong>ดินเป็นกรด:</strong> หว่านปูนโดโลไมท์ 50-100 กก./ไร่ เพื่อลดกรด</li>
                        <li><strong>กรีดถี่เกินไป:</strong> ปรับเป็นระบบ <strong>วันเว้นวัน (D2)</strong> พักหน้ายางให้ต้นสะสมน้ำตาล</li>
                        <li><strong>เสริมปุ๋ย:</strong> ใส่ปุ๋ยที่มีโพแทสเซียม (K) สูง เพิ่มความเข้มข้นเนื้อยาง</li>
                    </ul>
                </div>

                {/* Satellite Map View */}
                {selectedPlot && (
                    <div className="bg-white p-3 rounded-3xl shadow-xs border border-gray-100 space-y-2">
                        <div className="flex justify-between items-center px-1 text-xs">
                            <span className="font-bold text-gray-800 flex items-center space-x-1">
                                <MapPin size={15} className="text-emerald-600" />
                                <span>ผังแปลงดาวเทียม</span>
                            </span>
                            <span className="text-[10px] text-gray-400">ซูมดูขอบเขตแปลง</span>
                        </div>
                        <div className="h-64 w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200">
                            <LandPlotMap
                                plots={[selectedPlot]}
                                selectedPlotId={selectedPlot.id}
                            />
                        </div>
                    </div>
                )}

                {/* Recent Buys Table */}
                <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-1 border-b border-gray-100">
                        <span className="font-bold text-gray-800 flex items-center space-x-1.5">
                            <Droplets size={15} className="text-emerald-600" />
                            <span>ประวัติการส่งน้ำยางรอบล่าสุด</span>
                        </span>
                        <span className="text-[10px] text-gray-400">
                            เฉลี่ย {periodSummary?.avgDrc || '0'}% DRC
                        </span>
                    </div>

                    {periodSummary?.recentBuys && periodSummary.recentBuys.length > 0 ? (
                        <div className="space-y-1.5">
                            {periodSummary.recentBuys.map((b, i) => (
                                <div key={b.id || i} className="flex justify-between items-center p-2 bg-slate-50 rounded-xl text-[11px]">
                                    <span className="font-mono text-gray-600">{b.date}</span>
                                    <span className="font-bold text-gray-800">{b.weight} กก. ({b.drc}%)</span>
                                    <span className="font-mono font-bold text-emerald-700">{(b.total || 0).toLocaleString()} ฿</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-xl">
                            ไม่มีรายการส่งน้ำยางในช่วงเวลานี้
                        </div>
                    )}
                </div>

                {/* Footer and Save Link */}
                <div className="pt-2 text-center space-y-3">
                    <button
                        onClick={handleCopyLink}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all transform active:scale-95"
                    >
                        <Copy size={16} />
                        <span>คัดลอกลิงก์สวนนี้เก็บไว้ในมือถือ</span>
                    </button>

                    <div className="pt-2 border-t border-gray-200 flex flex-col items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExitToApp}
                            className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                        >
                            <LogIn size={14} className="text-emerald-600" />
                            <span>{user ? 'กลับสู่โปรแกรมจัดการร้าน (Dashboard)' : 'สำหรับเจ้าของร้าน/ผู้จัดการ: เข้าสู่ระบบโปรแกรมหลัก'}</span>
                        </button>
                        <p className="text-[10px] text-gray-400">
                            ระบบจัดการข้อมูลสวนยางพารา RubberTrade • สำหรับเกษตรกรชาวสวนยาง
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FarmerPlotPortal;
