import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    User, PiggyBank, Coins, Droplets, Trees, 
    Share2, Copy, AlertTriangle, LogIn, Home as HomeIcon
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import MemberPortalSavingsTab from './member-portal/MemberPortalSavingsTab';
import MemberPortalSharesTab from './member-portal/MemberPortalSharesTab';
import MemberPortalDeliveriesTab from './member-portal/MemberPortalDeliveriesTab';
import MemberPortalPlotsTab from './member-portal/MemberPortalPlotsTab';
import MemberPortalProfileTab from './member-portal/MemberPortalProfileTab';

export const MemberPortal = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('savings'); // 'savings', 'shares', 'deliveries', 'plots', 'profile'
    const [selectedAccId, setSelectedAccId] = useState('');

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

    // Farmer Plot states
    const [farmerPlotData, setFarmerPlotData] = useState(null);
    const [plotDataLoading, setPlotDataLoading] = useState(false);
    const [selectedPlotId, setSelectedPlotId] = useState('');
    const [deliveryPeriod, setDeliveryPeriod] = useState('month'); // 'today', '7days', 'month', 'all'

    const [suggestions, setSuggestions] = useState([]);
    const [manualInput, setManualInput] = useState('');
    const [showIosTip, setShowIosTip] = useState(() => {
        if (typeof window === 'undefined') return false;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
        return isIOS && !isStandalone;
    });

    const urlParams = new URLSearchParams(window.location.search);
    const memberId = urlParams.get('id') || urlParams.get('memberId');
    const memberNo = urlParams.get('memberNo');

    const handleManualSearch = (e) => {
        e?.preventDefault();
        if (!manualInput.trim()) return;
        window.location.href = `/member-portal?memberNo=${encodeURIComponent(manualInput.trim())}`;
    };

    const loadData = async () => {
        if (!memberId && !memberNo) {
            try {
                const saved = localStorage.getItem('rubbertrade_member_portal_url');
                if (saved && saved.includes('?')) {
                    window.location.replace(saved);
                    return;
                }
            } catch (e) {}

            try {
                const res = await fetch('/api/member_portal/public');
                const json = await res.json();
                if (json.suggestions) setSuggestions(json.suggestions);
                setError(json.message || 'ไม่พบรหัสสมาชิกในลิงก์');
            } catch (e) {
                setError('ไม่พบรหัสสมาชิกในลิงก์ กรุณาสแกน QR Code ใหม่อีกครั้ง หรือเลือกรหัสสมาชิกด้านล่าง');
            }
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const query = memberId ? `id=${encodeURIComponent(memberId)}` : `memberNo=${encodeURIComponent(memberNo)}`;
            const res = await fetch(`/api/member_portal/public?${query}`);
            const json = await res.json();

            if (!res.ok || json.status === 'error') {
                if (json.suggestions) setSuggestions(json.suggestions);
                throw new Error(json.message || 'ไม่สามารถโหลดข้อมูลสมาชิกได้');
            }

            setData(json.data);
            if (json.data?.accounts?.length > 0) {
                setSelectedAccId(json.data.accounts[0].id);
            } else if (json.data?.member?.isTapperOnly || json.data?.member?.farmerId) {
                setActiveTab('deliveries');
            }
            if (json.data?.member?.farmerPlots?.length > 0) {
                setSelectedPlotId(json.data.member.farmerPlots[0].id);
            }

            // Persist member portal URL for Home Screen / Standalone PWA restore
            try {
                const currentUrl = window.location.pathname + window.location.search;
                localStorage.setItem('rubbertrade_member_portal_url', currentUrl);
                if (json.data?.member?.name) {
                    localStorage.setItem('rubbertrade_member_name', json.data.member.name);
                    document.title = `บัตรสมาชิก - ${json.data.member.name}`;
                }
            } catch (e) {}
        } catch (err) {
            console.error('Error loading member portal:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setLoading(false);
        }
    };

    const loadFarmerPlotData = async (farmerId, plotId = '', period = 'month') => {
        if (!farmerId) return;
        try {
            setPlotDataLoading(true);
            let ep = `/api/farmer_plot/public?id=${encodeURIComponent(farmerId)}&period=${period}`;
            if (plotId) ep += `&plotId=${encodeURIComponent(plotId)}`;
            const res = await fetch(ep);
            const json = await res.json();
            if (json.status === 'success' && json.data) {
                setFarmerPlotData(json.data);
                if (!plotId && json.data?.plots?.length > 0) {
                    setSelectedPlotId(json.data.plots[0].id);
                }
            }
        } catch (err) {
            console.warn('Could not load farmer plot data:', err);
        } finally {
            setPlotDataLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [memberId, memberNo]);

    useEffect(() => {
        if (data?.member?.farmerId) {
            loadFarmerPlotData(data.member.farmerId, selectedPlotId, deliveryPeriod);
        }
        if (data?.member?.name) {
            document.title = `บัตรสมาชิก - ${data.member.name}`;
            try {
                let meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.setAttribute('name', 'apple-mobile-web-app-title');
                    document.head.appendChild(meta);
                }
                meta.setAttribute('content', `บัตร-${data.member.name}`);
            } catch (e) {}
        }
    }, [data?.member, selectedPlotId, deliveryPeriod]);

    // Dynamically update PWA manifest link to point to this member's manifest with exact start_url
    useEffect(() => {
        if (!memberId && !memberNo) return;
        const query = memberId ? `id=${encodeURIComponent(memberId)}` : `memberNo=${encodeURIComponent(memberNo)}`;
        const memberName = data?.member?.name ? `&name=${encodeURIComponent(data.member.name)}` : '';
        const manifestUrl = `/api/member_portal/manifest?${query}${memberName}`;

        let manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            manifestLink.setAttribute('href', manifestUrl);
        } else {
            manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = manifestUrl;
            document.head.appendChild(manifestLink);
        }
    }, [memberId, memberNo, data?.member?.name]);

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('คัดลอกลิงก์สำเร็จ');
    };

    if (loading && !data) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-14 h-14 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
                    <PiggyBank size={28} />
                </div>
                <h2 className="text-base font-bold text-gray-800">กำลังโหลดข้อมูลสมาชิก & สมุดเงินฝาก...</h2>
                <p className="text-xs text-gray-500 mt-1">ระบบกำลังดึงข้อมูลสัจจะออมทรัพย์และหุ้น</p>
            </div>
        );
    }

    if (error) {
        const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('rubbertrade_member_portal_url') : null;
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
                <div className="w-16 h-16 bg-rose-100 rounded-3xl flex items-center justify-center text-rose-600 mb-4 shadow-xs">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-lg font-black text-gray-800 mb-1">ไม่สามารถเปิดข้อมูลได้</h2>
                <p className="text-xs text-rose-600 max-w-sm mb-6 bg-rose-50 p-3.5 rounded-2xl border border-rose-200 font-medium">
                    {error}
                </p>

                {/* Form to enter member number */}
                <form onSubmit={handleManualSearch} className="w-full max-w-xs mb-3 text-left">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        ค้นหาด้วยรหัสสมาชิกหรือเบอร์โทร:
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            placeholder="เช่น NAR-MB-001 หรือ เบอร์โทร"
                            className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
                        >
                            ค้นหา
                        </button>
                    </div>
                </form>

                {/* Suggestions List if available */}
                {suggestions?.length > 0 && (
                    <div className="w-full max-w-xs mb-3 text-left">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            รายชื่อสมาชิกในระบบที่พร้อมเปิดดู:
                        </label>
                        <div className="space-y-1.5">
                            {suggestions.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        window.location.href = `/member-portal?memberNo=${encodeURIComponent(s.memberNo)}`;
                                    }}
                                    className="w-full p-3 bg-white hover:bg-emerald-50/60 border border-emerald-300/80 rounded-2xl text-left flex items-center justify-between transition-all shadow-xs group active:scale-[0.98]"
                                >
                                    <div>
                                        <span className="font-black text-xs text-gray-900 group-hover:text-emerald-800 block">
                                            {s.name}
                                        </span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="font-mono font-bold text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                                                {s.memberNo}
                                            </span>
                                            {s.phone && (
                                                <span className="text-[10px] text-gray-400">
                                                    {s.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 group-hover:bg-emerald-600 group-hover:text-white px-2.5 py-1 rounded-xl transition-all shrink-0">
                                        เปิดดูบัตร &gt;
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                    <button
                        type="button"
                        onClick={handleExitToApp}
                        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                    >
                        <LogIn size={14} />
                        <span>{user ? 'กลับสู่หน้าจัดการร้าน (Dashboard)' : 'เข้าสู่ระบบโปรแกรมหลัก (Login)'}</span>
                    </button>
                    {savedUrl && savedUrl !== (window.location.pathname + window.location.search) && (
                        <a
                            href={savedUrl}
                            className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-colors"
                        >
                            🪪 ไปยังบัตรสมาชิกล่าสุดที่เคยเปิด
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={handleGoHome}
                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
                    >
                        กลับหน้าหลัก
                    </button>
                </div>
            </div>
        );
    }

    const { member, store, accounts = [], savingsTransactions = [], shareTransactions = [], dividendInfo } = data || {};
    const selectedAccount = accounts.find(a => a.id === selectedAccId) || accounts[0];
    const filteredTx = savingsTransactions.filter(t => !selectedAccId || t.accountId === selectedAccId);

    // Plots and Deliveries resolved from farmerPlotData with fallbacks
    const plots = farmerPlotData?.plots?.length ? farmerPlotData.plots : (member?.farmerPlots || []);
    const selectedPlot = plots.find(p => p.id === selectedPlotId) || plots[0] || farmerPlotData?.selectedPlot;
    const periodSummary = farmerPlotData?.periodSummary;
    const promotions = farmerPlotData?.promotions;
    const weather = farmerPlotData?.weather;
    const plotCare = farmerPlotData?.plotCare;
    const recentBuysList = periodSummary?.recentBuys || member?.recentBuys || [];

    // Calculate fertilizer recommendation
    const plotRai = selectedPlot ? ((parseFloat(selectedPlot.rai || selectedPlot.totalRai) || 0) + (parseFloat(selectedPlot.ngan) || 0) / 4) : 0;
    const recommendedKgPerApp = Math.round(plotRai * 37.5);
    const recommendedBagsPerApp = (recommendedKgPerApp / 50).toFixed(1);

    const isTapperOnly = !!member?.isTapperOnly;
    const isTapper = !!(member?.isTapper || member?.isTapperOnly || member?.employeeId);

    const hasDeliveries = isTapper || !!member?.farmerId || !!member?.hasPlots || recentBuysList.length > 0;
    const hasPlots = (plots && plots.length > 0) || !!member?.hasPlots;

    const portalTabs = isTapperOnly ? [
        { 
            id: 'deliveries', 
            label: 'ค่ากรีด & ผลงาน', 
            icon: <Droplets size={15} />, 
            badge: recentBuysList.length ? `${recentBuysList.length}` : null 
        },
        ...(hasPlots ? [
            { 
                id: 'plots', 
                label: 'แปลง & อากาศ', 
                icon: <Trees size={15} />, 
                badge: `${plots.length}` 
            }
        ] : []),
        { id: 'profile', label: 'ข้อมูลคนกรีด', icon: <User size={15} /> }
    ] : [
        { id: 'savings', label: 'เงินฝากสัจจะ', icon: <PiggyBank size={15} />, badge: accounts.length ? `${accounts.length}` : null },
        { id: 'shares', label: 'หุ้น & ปันผล', icon: <Coins size={15} />, badge: Number(member?.totalShares || 0) > 0 ? `${member.totalShares}` : null },
        ...(hasDeliveries ? [
            { 
                id: 'deliveries', 
                label: isTapper ? 'ค่ากรีด & ส่งยาง' : 'ส่งน้ำยาง', 
                icon: <Droplets size={15} />, 
                badge: recentBuysList.length ? `${recentBuysList.length}` : null 
            }
        ] : []),
        ...(hasPlots ? [
            { 
                id: 'plots', 
                label: 'แปลงสวนยาง', 
                icon: <Trees size={15} />, 
                badge: plots.length ? `${plots.length}` : null 
            }
        ] : []),
        { id: 'profile', label: 'ข้อมูลสมาชิก', icon: <User size={15} /> }
    ];

    return (
        <div className="min-h-screen bg-slate-100/60 font-sans text-gray-800 pb-16">
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
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 rounded-b-[2rem] shadow-lg">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="truncate mr-3">
                        <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest block truncate">
                            {store?.factoryName || 'กลุ่มเกษตรกรและสหกรณ์ยางพารา'}
                        </span>
                        <h1 className="text-lg font-black leading-tight truncate">
                            {member?.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-yellow-300 font-mono font-bold">
                                {member?.memberNo}
                            </span>
                            {member?.isTapperOnly ? (
                                <span className="px-2 py-0.2 bg-amber-500/30 text-amber-200 rounded-full text-[10px] font-bold border border-amber-400/30 flex items-center gap-1">
                                    <span>🔪 คนกรีดยาง</span>
                                    <span>({member.profitSharePct || 50}% ส่วนแบ่ง)</span>
                                </span>
                            ) : member?.isFarmerOnly ? (
                                <span className="px-2 py-0.2 bg-teal-500/30 text-teal-200 rounded-full text-[10px] font-bold border border-teal-400/30">
                                    🌱 เกษตรกรขายยาง
                                </span>
                            ) : member?.farmerId ? (
                                <span className="px-2 py-0.2 bg-emerald-500/30 text-emerald-200 rounded-full text-[10px] font-bold border border-emerald-400/30">
                                    🌾 สมาชิกเกษตรกร
                                </span>
                            ) : (
                                <span className="px-2 py-0.2 bg-purple-500/30 text-purple-200 rounded-full text-[10px] font-bold border border-purple-400/30">
                                    💼 หุ้นส่วนภายนอก
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleCopy}
                        className="p-2.5 bg-white/15 hover:bg-white/25 rounded-2xl backdrop-blur-xs transition-all text-white shrink-0"
                        title="แชร์ลิงก์"
                    >
                        <Share2 size={18} />
                    </button>
                </div>
            </div>

            {/* iOS Safari Add to Home Screen Tip */}
            {showIosTip && (
                <div className="max-w-md mx-auto px-4 mt-3">
                    <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 shadow-xs flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">📲</span>
                        <div className="flex-1 text-xs text-amber-950">
                            <p className="font-bold text-amber-950">เพิ่มเป็นแอปบนหน้าจอ iPhone</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800">
                                แตะปุ่มแชร์ <span className="inline-block px-1.5 py-0.5 bg-amber-200/80 rounded font-mono font-bold text-amber-950">[ ↑ ]</span> ด้านล่าง Safari &gt; เลือก <strong>"เพิ่มไปยังหน้าจอโฮม"</strong> เพื่อเปิดบัตรนี้ได้ทุกเมื่อโดยไม่ต้องสแกนใหม่
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowIosTip(false)}
                            className="text-amber-400 hover:text-amber-800 text-xs font-bold p-1 shrink-0"
                            title="ปิดคำแนะนำ"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Navigation Tabs (Responsive single row or 2 rows) */}
            <div className="bg-white/95 backdrop-blur-md border-b border-gray-200 px-3 py-2 sticky top-0 z-40 shadow-xs">
                <div className="max-w-md mx-auto space-y-1.5">
                    {portalTabs.length <= 3 ? (
                        <div className={`grid ${portalTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5`}>
                            {portalTabs.map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                                            isActive
                                                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600 font-black'
                                                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                                        }`}
                                    >
                                        <span className="shrink-0">{tab.icon}</span>
                                        <span className="whitespace-nowrap">{tab.label}</span>
                                        {tab.badge && (
                                            <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold shrink-0 ${
                                                isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                                            }`}>
                                                {tab.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <>
                            {/* แถวที่ 1: การเงิน & ผลผลิต (3 ปุ่ม) */}
                            <div className="grid grid-cols-3 gap-1.5">
                                {portalTabs.slice(0, 3).map(tab => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                                                isActive
                                                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600 font-black'
                                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                                            }`}
                                        >
                                            <span className="shrink-0">{tab.icon}</span>
                                            <span className="whitespace-nowrap">{tab.label}</span>
                                            {tab.badge && (
                                                <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold shrink-0 ${
                                                    isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                                                }`}>
                                                    {tab.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* แถวที่ 2: สวนยาง & ข้อมูลสมาชิก (2 ปุ่ม) */}
                            <div className="grid grid-cols-2 gap-1.5">
                                {portalTabs.slice(3).map(tab => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                                                isActive
                                                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600 font-black'
                                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                                            }`}
                                        >
                                            <span className="shrink-0">{tab.icon}</span>
                                            <span className="whitespace-nowrap">{tab.label}</span>
                                            {tab.badge && (
                                                <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold shrink-0 ${
                                                    isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                                                }`}>
                                                    {tab.badge}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {/* TAB 1: 💰 บัญชีเงินฝากสัจจะ */}
                {activeTab === 'savings' && (
                    <MemberPortalSavingsTab
                        member={member}
                        accounts={accounts}
                        selectedAccount={selectedAccount}
                        setSelectedAccId={setSelectedAccId}
                        filteredTx={filteredTx}
                        setActiveTab={setActiveTab}
                    />
                )}

                {/* TAB 2: 📈 ทุนเรือนหุ้น & ปันผล */}
                {activeTab === 'shares' && (
                    <MemberPortalSharesTab
                        member={member}
                        dividendInfo={dividendInfo}
                        shareTransactions={shareTransactions}
                    />
                )}

                {/* TAB 3: 🚚 ประวัติการส่งน้ำยาง & ค่ากรีด */}
                {activeTab === 'deliveries' && (
                    <MemberPortalDeliveriesTab
                        member={member}
                        isTapper={isTapper}
                        deliveryPeriod={deliveryPeriod}
                        setDeliveryPeriod={setDeliveryPeriod}
                        periodSummary={periodSummary}
                        recentBuysList={recentBuysList}
                        selectedPlot={selectedPlot}
                        promotions={promotions}
                    />
                )}

                {/* TAB 4: 🌳 สวนยาง (Farmer-Plot Information) */}
                {activeTab === 'plots' && (
                    <MemberPortalPlotsTab
                        member={member}
                        isTapper={isTapper}
                        plots={plots}
                        selectedPlot={selectedPlot}
                        setSelectedPlotId={setSelectedPlotId}
                        weather={weather}
                        plotCare={plotCare}
                        recommendedBagsPerApp={recommendedBagsPerApp}
                        recommendedKgPerApp={recommendedKgPerApp}
                    />
                )}

                {/* TAB 5: 🪪 ข้อมูลสมาชิก (Member Profile) */}
                {activeTab === 'profile' && (
                    <MemberPortalProfileTab
                        member={member}
                        store={store}
                        isTapperOnly={isTapperOnly}
                        isTapper={isTapper}
                    />
                )}

                {/* Footer and Copy */}
                <div className="pt-2 text-center space-y-3">
                    <button
                        onClick={handleCopy}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95"
                    >
                        <Copy size={16} />
                        <span>คัดลอกลิงก์เก็บไว้ในมือถือ</span>
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
                            RubberTrade Member Portal • ระบบบริการสมาชิกและสมุดเงินฝากดิจิทัล
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberPortal;
