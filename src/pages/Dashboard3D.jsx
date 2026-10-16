import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Truck, 
    Droplets, 
    Scale, 
    Layers, 
    Clock, 
    Sparkles, 
    RefreshCw, 
    TrendingUp, 
    CheckCircle2,
    Calendar,
    ArrowLeftRight
} from 'lucide-react';
import { fetchDashboardData } from '../services/apiService';
import { useYardSimulation } from '../hooks/useYardSimulation';
import { YardSceneIsometric } from '../components/dashboard3d/YardSceneIsometric';
import { YardInspectorDrawer } from '../components/dashboard3d/YardInspectorDrawer';
import { YardBottomTrackingBar } from '../components/dashboard3d/YardBottomTrackingBar';
import { YardCameraToolbar } from '../components/dashboard3d/YardCameraToolbar';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const Dashboard3D = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayBuy: 0,
        todayLatexBuy: 0,
        todayCupLumpBuy: 0,
        todayBuyWeight: 0,
        todayTotalDryWeight: 0,
        todayAvgDrc: 0,
        dailyPrice: 0,
        cupLumpPrice: 0,
        activeTrucksCount: 1
    });

    // Camera & Layer state
    const [zoom, setZoom] = useState(1);
    const [filterLayer, setFilterLayer] = useState('all');

    // Inspector Drawer State
    const [selectedEntity, setSelectedEntity] = useState({
        type: 'station',
        data: {
            title: 'แท่นชั่ง Station 1 (WH-01)',
            status: 'พร้อมใช้งาน (Online)',
            capacity: '15,000 กก.',
            todayCount: 18
        }
    });

    // Simulation Hook (State Machine Engine)
    const {
        simState,
        activeJob,
        isSimulating,
        skipSimulation,
        triggerDemoSimulation
    } = useYardSimulation();

    const loadData = async () => {
        try {
            const data = await fetchDashboardData();
            if (data) {
                setStats({
                    todayBuy: Number(data.todayBuy) || 0,
                    todayLatexBuy: Number(data.todayLatexBuy) || 0,
                    todayCupLumpBuy: Number(data.todayCupLumpBuy) || 0,
                    todayBuyWeight: Number(data.todayBuyWeight) || 0,
                    todayTotalDryWeight: Number(data.todayTotalDryWeight) || 0,
                    todayAvgDrc: Number(data.todayAvgDrc) || 33.5,
                    dailyPrice: Number(data.dailyPrice) || 0,
                    cupLumpPrice: Number(data.cupLumpPrice) || 0,
                    activeTrucksCount: Math.max(1, (data.recentTransactions || []).length)
                });
            }
        } catch (err) {
            console.error('Failed to load dashboard 3d stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const handleRefresh = () => loadData();
        window.addEventListener('dashboard-refresh', handleRefresh);
        return () => window.removeEventListener('dashboard-refresh', handleRefresh);
    }, []);

    // When an active job starts, automatically open inspector for that job
    useEffect(() => {
        if (activeJob) {
            setSelectedEntity({
                type: 'truck',
                data: activeJob
            });
        }
    }, [activeJob]);

    const handleSelectEntity = (type, data) => {
        setSelectedEntity({ type, data });
    };

    return (
        <div className="space-y-4 pb-8 max-w-7xl mx-auto px-2 sm:px-4">
            {/* Header: Title, Live indicator, and Switch to Dashboard 1 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-rubber-600 text-white shadow-lg shadow-rubber-600/30">
                        <Layers className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live Digital Twin
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                {format(new Date(), 'dd MMMM yyyy (HH:mm)', { locale: th })}
                            </span>
                        </div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                            3D Isometric Yard & Logistics Dashboard
                        </h1>
                    </div>
                </div>

                {/* Dashboard Mode Switcher Button */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200/60 dark:border-slate-700"
                    >
                        <LayoutDashboard className="w-4 h-4 text-rubber-600 dark:text-rubber-400" />
                        <span>สลับเป็นแดชบอร์ด 1 (สถิติรวม)</span>
                    </button>
                    <button
                        onClick={loadData}
                        className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title="รีเฟรชข้อมูล"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Top KPI Cards (WareTrack Style) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Stock On Hand */}
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <Droplets className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 block uppercase">สต็อกรวมในลาน</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                                {Number(stats.todayBuyWeight || 0).toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">กก.</span>
                        </div>
                    </div>
                </div>

                {/* 2. Trucks / Inbound Today */}
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-rubber-50 dark:bg-rubber-950/60 text-rubber-600 dark:text-rubber-400">
                        <Truck className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 block uppercase">รถเข้าชั่งวันนี้</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                                {stats.activeTrucksCount}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">คัน</span>
                        </div>
                    </div>
                </div>

                {/* 3. Average DRC */}
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 block uppercase">เฉลี่ย DRC น้ำยาง</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                {stats.todayAvgDrc || 33.5}%
                            </span>
                            <span className="text-xs text-emerald-600 font-bold">คุณภาพ A</span>
                        </div>
                    </div>
                </div>

                {/* 4. Today Buy Value */}
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                        <Scale className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 block uppercase">ยอดเงินรับซื้อวันนี้</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-black text-slate-900 dark:text-white">
                                ฿{Number(stats.todayBuy || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Camera & Layer Controls Toolbar */}
            <YardCameraToolbar 
                zoom={zoom}
                onZoomIn={() => setZoom(prev => Math.min(1.5, prev + 0.1))}
                onZoomOut={() => setZoom(prev => Math.max(0.8, prev - 0.1))}
                onResetZoom={() => setZoom(1)}
                filterLayer={filterLayer}
                onFilterChange={setFilterLayer}
                onTriggerDemo={triggerDemoSimulation}
                isSimulating={isSimulating}
            />

            {/* Main Interactive Stage with Floating Inspector Drawer */}
            <div className="relative">
                <YardSceneIsometric 
                    simState={simState}
                    activeJob={activeJob}
                    onSelectEntity={handleSelectEntity}
                    zoom={zoom}
                    filterLayer={filterLayer}
                />

                {/* Floating Inspector Drawer (Top Right Over Scene) */}
                {selectedEntity && (
                    <div className="absolute top-4 right-4 max-h-[92%] flex flex-col pointer-events-auto">
                        <YardInspectorDrawer 
                            selectedEntity={selectedEntity}
                            onClose={() => setSelectedEntity(null)}
                            onQuickSimulate={triggerDemoSimulation}
                        />
                    </div>
                )}
            </div>

            {/* Bottom Shipment / Queue Tracking Stepper */}
            <YardBottomTrackingBar 
                simState={simState}
                activeJob={activeJob}
                onSkip={skipSimulation}
            />
        </div>
    );
};

export default Dashboard3D;
