import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    MapPin, Plus, Search, Edit2, Trash2, User, Users, FileText, CheckCircle2, 
    RefreshCw, ChevronDown, Calendar, Sprout, CloudRain, Award, TrendingUp, 
    DollarSign, AlertTriangle, ShieldCheck, Scale, Clock, Check, ChevronRight,
    HelpCircle, Wrench, Sparkles, Droplets, Info, ArrowUpRight, X, LayoutGrid, Eye,
    QrCode, Copy, ExternalLink, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    fetchLandPlots, addLandPlot, updateLandPlot, deleteLandPlot,
    fetchPlotSummary, fetchPlotActivities, addPlotActivity, deletePlotActivity
} from '../services/landPlotService';
import { fetchFarmers, fetchEmployees, fetchFarmerEmployees } from '../services/apiService';
import LandPlotMap from '../components/map/LandPlotMap';
import LandPlotFormModal from '../components/map/LandPlotFormModal';
import { LandPlotFarmerSelectModal } from '../components/map/LandPlotFarmerSelectModal';
import { LandPlotQrModal } from '../components/map/LandPlotQrModal';
import { LandPlotActivityModal } from '../components/map/LandPlotActivityModal';


export const LandPlots = () => {
    // Core data states
    const [plots, setPlots] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [farmerEmployees, setFarmerEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search and Selection states
    const [selectedFarmerId, setSelectedFarmerId] = useState('');
    const [farmerSearchQuery, setFarmerSearchQuery] = useState('');
    const [showFarmerModal, setShowFarmerModal] = useState(false);

    const [selectedPlot, setSelectedPlot] = useState(null);
    const [editingPlot, setEditingPlot] = useState(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // Active Section View Menu ('all', 'map', 'yield', 'fertilizer', 'mowing', 'advisor', 'weather', 'financial')
    const [activeSection, setActiveSection] = useState('all');

    // Date Range Filter: default to 'month' so data is not empty 0
    const [dateRange, setDateRange] = useState('month'); // 'today', '7days', 'month', 'year', 'all', 'custom'
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Summary & Activity states
    const [summaryData, setSummaryData] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [showFertilizerModal, setShowFertilizerModal] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

    // Form inputs for modals
    const [activityForm, setActivityForm] = useState({
        activityType: 'fertilizer',
        date: new Date().toISOString().split('T')[0],
        title: '',
        fertilizerFormula: '29-5-18',
        brand: '',
        amountKg: '',
        bags: '',
        cost: '',
        serviceProvider: '',
        details: '',
        nextDueDate: ''
    });

    // Calculate dates based on range filter
    const { startDateStr, endDateStr } = useMemo(() => {
        const now = new Date();
        const formatYMD = (d) => d.toISOString().split('T')[0];
        const todayStr = formatYMD(now);

        if (dateRange === 'today') {
            return { startDateStr: todayStr, endDateStr: todayStr };
        } else if (dateRange === '7days') {
            const past7 = new Date(now);
            past7.setDate(past7.getDate() - 7);
            return { startDateStr: formatYMD(past7), endDateStr: todayStr };
        } else if (dateRange === 'month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            return { startDateStr: formatYMD(firstDay), endDateStr: todayStr };
        } else if (dateRange === 'year') {
            const firstJan = new Date(now.getFullYear(), 0, 1);
            return { startDateStr: formatYMD(firstJan), endDateStr: todayStr };
        } else if (dateRange === 'all') {
            return { startDateStr: '', endDateStr: '' };
        } else if (dateRange === 'custom') {
            return { startDateStr: customStartDate || '', endDateStr: customEndDate || '' };
        }
        return { startDateStr: '', endDateStr: '' };
    }, [dateRange, customStartDate, customEndDate]);

    // Initial Load
    const loadData = async () => {
        try {
            setLoading(true);
            const [plotList, farmerList, empList, feList] = await Promise.all([
                fetchLandPlots(),
                fetchFarmers(),
                fetchEmployees(),
                fetchFarmerEmployees()
            ]);

            setFarmers(farmerList || []);
            setEmployees(empList || []);
            setFarmerEmployees(feList || []);

            const enrichedPlots = (plotList || []).map(plot => {
                const f = (farmerList || []).find(item => item.id === plot.farmerId);
                const emp = plot.employeeId ? (empList || []).find(item => item.id === plot.employeeId) : null;
                const empLink = plot.employeeId ? (feList || []).find(item => item.farmerId === plot.farmerId && item.employeeId === plot.employeeId) : null;

                return {
                    ...plot,
                    farmerName: f ? f.name : 'ไม่ระบุเกษตรกร',
                    employeeName: emp ? emp.name : (plot.employeeId ? 'ลูกจ้างกรีด' : 'เกษตรกรกรีดเอง'),
                    profitSharePct: plot.employeeId ? (empLink && empLink.profitSharePct != null ? empLink.profitSharePct : 50) : 0
                };
            });

            setPlots(enrichedPlots);

            // Default to first farmer if none selected
            if (!selectedFarmerId && farmerList && farmerList.length > 0) {
                setSelectedFarmerId(farmerList[0].id);
            }
        } catch (err) {
            console.error('Error loading land plots data:', err);
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลแปลง');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter plots belonging to selected farmer
    const farmerPlots = useMemo(() => {
        if (!selectedFarmerId) return plots;
        return plots.filter(p => p.farmerId === selectedFarmerId);
    }, [plots, selectedFarmerId]);

    // Auto-select plot when farmer plots change
    useEffect(() => {
        if (farmerPlots.length > 0) {
            const exists = farmerPlots.some(p => p.id === selectedPlot?.id);
            if (!exists) {
                setSelectedPlot(farmerPlots[0]);
            }
        } else {
            setSelectedPlot(null);
        }
    }, [farmerPlots]);

    // Fetch Summary when farmer, plot, dateRange, or coordinates change
    const loadSummary = async () => {
        if (!selectedFarmerId) return;
        try {
            setSummaryLoading(true);
            const params = {
                farmerId: selectedFarmerId,
                startDate: startDateStr,
                endDate: endDateStr
            };
            if (selectedPlot?.id) {
                params.plotId = selectedPlot.id;
            }
            if (selectedPlot?.lat && selectedPlot?.lng) {
                params.lat = selectedPlot.lat;
                params.lng = selectedPlot.lng;
            }

            const data = await fetchPlotSummary(params);
            setSummaryData(data);
        } catch (err) {
            console.error('Error loading plot summary:', err);
        } finally {
            setSummaryLoading(false);
        }
    };

    useEffect(() => {
        loadSummary();
    }, [selectedFarmerId, selectedPlot?.id, startDateStr, endDateStr]);

    // Attach weather to plots for map popup
    const plotsWithWeather = useMemo(() => {
        return farmerPlots.map(p => {
            const isTarget = selectedPlot?.id === p.id;
            return {
                ...p,
                weather: isTarget && summaryData?.weather ? summaryData.weather : null
            };
        });
    }, [farmerPlots, selectedPlot, summaryData?.weather]);

    // Handle Plot Create / Update
    const handleSavePlot = async (formData) => {
        if (editingPlot) {
            await updateLandPlot(editingPlot.id, formData);
        } else {
            await addLandPlot(formData);
        }
        await loadData();
    };

    // Handle Plot Delete
    const handleDeletePlot = async (id) => {
        if (window.confirm('คุณต้องการลบแปลงสวนยางพารานี้ใช่หรือไม่?')) {
            try {
                await deleteLandPlot(id);
                toast.success('ลบข้อมูลแปลงสำเร็จ');
                if (selectedPlot?.id === id) {
                    setSelectedPlot(null);
                }
                await loadData();
            } catch (err) {
                console.error('Error deleting land plot:', err);
                toast.error('ไม่สามารถลบแปลงได้');
            }
        }
    };

    // Handle Add Activity (Fertilizer / Mowing / Service)
    const handleSaveActivity = async (e) => {
        e.preventDefault();
        if (!selectedPlot?.id || !selectedFarmerId) {
            toast.error('กรุณาเลือกแปลงสวนยางก่อนบันทึก');
            return;
        }

        try {
            const payload = {
                plotId: selectedPlot.id,
                farmerId: selectedFarmerId,
                ...activityForm
            };

            await addPlotActivity(payload);
            toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
            setShowFertilizerModal(false);
            setShowMaintenanceModal(false);
            setActivityForm({
                activityType: 'fertilizer',
                date: new Date().toISOString().split('T')[0],
                title: '',
                fertilizerFormula: '29-5-18',
                brand: '',
                amountKg: '',
                bags: '',
                cost: '',
                serviceProvider: '',
                details: '',
                nextDueDate: ''
            });
            await loadSummary();
        } catch (err) {
            console.error('Error adding activity:', err);
            toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    // Selected Farmer info
    const currentFarmer = farmers.find(f => f.id === selectedFarmerId);

    // Calculate Fertilizer Requirement based on area
    const plotRai = selectedPlot ? (parseFloat(selectedPlot.rai) || 0) + (parseFloat(selectedPlot.ngan) || 0) / 4 : 0;
    const recommendedKgPerApp = Math.round(plotRai * 37.5);
    const recommendedBagsPerApp = (recommendedKgPerApp / 50).toFixed(1);

    // Filtered farmers for the selection modal
    const filteredFarmerList = useMemo(() => {
        if (!farmerSearchQuery) return farmers;
        const q = farmerSearchQuery.toLowerCase();
        return farmers.filter(f => 
            (f.name && f.name.toLowerCase().includes(q)) ||
            (f.phone && f.phone.includes(q)) ||
            (f.id && f.id.toLowerCase().includes(q))
        );
    }, [farmers, farmerSearchQuery]);

    return (
        <div className="p-3 md:p-6 space-y-6 max-w-7xl mx-auto font-sans pb-24">
            {/* 1. Page Header */}
            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-xs border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                    <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl shadow-md">
                        <Sprout size={28} />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h1 className="text-xl md:text-2xl font-black text-gray-900">จัดการและดูแลสวนยางพารา</h1>
                            <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                                v1.8.3 Hub
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            ศูนย์รวมข้อมูลแปลงยางพารา ผลผลิต น้ำยางออกเท่าไหร่ ใส่ปุ๋ย ตัดหญ้า สภาพอากาศ และกำไรสุทธิรายแปลง
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2.5">
                    <button
                        onClick={() => {
                            loadData();
                            loadSummary();
                            toast.success('รีเฟรชข้อมูลเรียบร้อย');
                        }}
                        className="p-2.5 text-gray-500 hover:text-rubber-700 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 flex items-center space-x-1.5 text-xs font-bold"
                        title="รีเฟรชข้อมูล"
                    >
                        <RefreshCw size={16} className={loading || summaryLoading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">รีเฟรช</span>
                    </button>

                    <button
                        onClick={() => {
                            setEditingPlot(null);
                            setShowFormModal(true);
                        }}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-all transform active:scale-95"
                    >
                        <Plus size={16} />
                        <span>ลงทะเบียนแปลงใหม่</span>
                    </button>
                </div>
            </div>

            {/* 2. Farmer Selector Card & Date Filter Bar */}
            <div className="bg-white p-4 md:p-5 rounded-3xl shadow-xs border border-gray-100 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Active Selected Farmer Display with Change Button */}
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl gap-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                                {currentFarmer?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-black text-gray-900">{currentFarmer?.name || 'ยังไม่ได้เลือกเกษตรกร'}</span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 bg-white text-emerald-800 font-bold rounded-md border border-emerald-200">
                                        {currentFarmer?.id}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500 font-medium">
                                    {currentFarmer?.phone ? `โทร: ${currentFarmer.phone}` : 'ไม่มีเบอร์โทร'} | มีทั้งหมด {farmerPlots.length} แปลง
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setShowQrModal(true)}
                                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center space-x-1.5 transition-all transform active:scale-95 whitespace-nowrap"
                                title="สร้าง QR Code & ลิงก์สำหรับให้ชาวสวนเปิดดูในมือถือ"
                            >
                                <QrCode size={15} className="text-emerald-400" />
                                <span>📱 QR Code & ลิงก์ดูสวน</span>
                            </button>

                            <button
                                onClick={() => {
                                    setFarmerSearchQuery('');
                                    setShowFarmerModal(true);
                                }}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center space-x-1.5 transition-all transform active:scale-95 whitespace-nowrap"
                            >
                                <Users size={15} />
                                <span>เปลี่ยนเกษตรกร ({farmers.length} รายชื่อ) ▾</span>
                            </button>
                        </div>
                    </div>

                    {/* Date Range Selector Pills */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            ช่วงเวลาข้อมูล:
                        </span>
                        <div className="inline-flex p-1 bg-gray-100 rounded-2xl border border-gray-200 text-xs font-bold">
                            {[
                                { id: 'month', label: 'เดือนนี้' },
                                { id: '7days', label: '7 วันล่าสุด' },
                                { id: 'today', label: 'วันนี้' },
                                { id: 'year', label: 'ทั้งปี' },
                                { id: 'all', label: 'ทั้งหมด' },
                                { id: 'custom', label: 'กำหนดเอง' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setDateRange(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl transition-all ${
                                        dateRange === tab.id
                                            ? 'bg-white text-emerald-800 shadow-xs'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Custom Date Inputs */}
                {dateRange === 'custom' && (
                    <div className="flex items-center space-x-3 pt-2 border-t border-gray-100 text-xs animate-in fade-in duration-200">
                        <span className="text-gray-500 font-medium">ตั้งแต่วันที่:</span>
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700"
                        />
                        <span className="text-gray-500 font-medium">ถึงวันที่:</span>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-700"
                        />
                    </div>
                )}
            </div>

            {/* 3. Farmer 360° Overview Header (มุมมองชาวสวน 4 มิติ) */}
            {currentFarmer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: เงินเข้ากระเป๋าเจ้าของสวน */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 rounded-3xl border border-emerald-200 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
                                <DollarSign size={16} className="text-emerald-600" />
                                <span>เงินเข้ากระเป๋าเจ้าของสวน</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                                {dateRange === 'month' ? 'เดือนนี้' : dateRange === 'today' ? 'วันนี้' : dateRange === '7days' ? '7 วัน' : 'รอบนี้'}
                            </span>
                        </div>
                        <div className="text-2xl font-black text-emerald-950 font-mono">
                            {summaryData?.periodSummary?.farmerTotal?.toLocaleString() || '0'} <span className="text-sm font-bold text-emerald-700">฿</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                            จากยอดขายรวม {summaryData?.periodSummary?.totalAmount?.toLocaleString() || '0'} ฿ (หักส่วนแบ่งคนกรีดแล้ว)
                        </p>
                    </div>

                    {/* Card 2: คนกรีดในสังกัด & เงินส่วนแบ่ง */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-3xl border border-blue-200 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-blue-800 flex items-center space-x-1.5">
                                <Users size={16} className="text-blue-600" />
                                <span>คนกรีดในสังกัด ({summaryData?.tappers?.length || 0} คน)</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                จ่ายแล้ว
                            </span>
                        </div>
                        <div className="text-2xl font-black text-blue-950 font-mono">
                            {summaryData?.periodSummary?.employeeTotal?.toLocaleString() || '0'} <span className="text-sm font-bold text-blue-700">฿</span>
                        </div>
                        <div className="text-[11px] text-blue-700 mt-1 truncate">
                            {summaryData?.tappers && summaryData.tappers.length > 0 ? (
                                summaryData.tappers.map(t => `${t.name} (${t.profitSharePct}%)`).join(', ')
                            ) : (
                                'ไม่มีคนกรีดรับจ้าง (กรีดเอง 100%)'
                            )}
                        </div>
                    </div>

                    {/* Card 3: ยางสะสมในกลุ่ม */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-4 rounded-3xl border border-amber-200 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-amber-800 flex items-center space-x-1.5">
                                <Droplets size={16} className="text-amber-600" />
                                <span>ยางสะสมในกลุ่มทั้งหมด</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                สะสมรวม
                            </span>
                        </div>
                        <div className="text-2xl font-black text-amber-950 font-mono">
                            {summaryData?.cumulativeGroup?.weight?.toLocaleString() || '0'} <span className="text-sm font-bold text-amber-700">กก.</span>
                        </div>
                        <p className="text-[11px] text-amber-700 mt-1 font-medium">
                            เนื้อยางแห้ง DRC {summaryData?.cumulativeGroup?.dryRubber?.toLocaleString() || '0'} กก. (มีผลต่อเงินเฉลี่ยคืน)
                        </p>
                    </div>

                    {/* Card 4: แต้มโปรโมชั่น & ปันผลสหกรณ์ */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 p-4 rounded-3xl border border-purple-200 shadow-xs relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-purple-800 flex items-center space-x-1.5">
                                <Award size={16} className="text-purple-600" />
                                <span>แต้มสะสม & ปันผลสหกรณ์</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                                สิทธิประโยชน์
                            </span>
                        </div>
                        <div className="text-2xl font-black text-purple-950 font-mono flex items-baseline justify-between">
                            <span>{summaryData?.promotions?.currentPoints?.toLocaleString() || '0'} <span className="text-xs font-bold text-purple-700">แต้ม</span></span>
                            {summaryData?.cooperative?.isMember && (
                                <span className="text-xs text-purple-700 font-bold">
                                    หุ้น: {summaryData.cooperative.shareCount} หุ้น
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-purple-700 mt-1 font-medium truncate">
                            {summaryData?.cooperative?.isMember ? (
                                summaryData.cooperative.latestDistribution ? (
                                    `ปันผลรอบล่าสุด: ${(summaryData.cooperative.latestDistribution.netPayout || 0).toLocaleString()} ฿`
                                ) : (
                                    'สมาชิกสหกรณ์ (ยังไม่มีรอบปันผลจ่าย)'
                                )
                            ) : (
                                'ยังไม่ได้สมัครเป็นสมาชิกสหกรณ์'
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* 4. Top Navigation Menu Tabs ("เมนูให้เลือก") */}
            <div className="bg-white p-2.5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-1.5 overflow-x-auto custom-scrollbar">
                {[
                    { id: 'all', label: '📋 ดูข้อมูลทั้งหมด (All)', icon: <LayoutGrid size={15} /> },
                    { id: 'map', label: '🗺️ ผังแผนที่ดาวเทียม', icon: <MapPin size={15} /> },
                    { id: 'yield', label: '💧 1. ผลผลิต & DRC', icon: <Droplets size={15} /> },
                    { id: 'fertilizer', label: '🌾 2. แผนใส่ปุ๋ยตามไร่', icon: <Sprout size={15} /> },
                    { id: 'mowing', label: '🌿 3. ตัดหญ้า & ดูแลสวน', icon: <Wrench size={15} /> },
                    { id: 'advisor', label: '🩺 4. แก้ % ยางน้อย', icon: <AlertTriangle size={15} /> },
                    { id: 'weather', label: '🌤️ 5. สภาพอากาศ & การกรีด', icon: <CloudRain size={15} /> },
                    { id: 'financial', label: '📊 6. กำไร-ขาดทุนรายแปลง', icon: <TrendingUp size={15} /> }
                ].map(menu => (
                    <button
                        key={menu.id}
                        onClick={() => {
                            setActiveSection(menu.id);
                            if (menu.id !== 'all' && menu.id !== 'map') {
                                const el = document.getElementById(`section-${menu.id}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all ${
                            activeSection === menu.id
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        <span>{menu.label}</span>
                    </button>
                ))}
            </div>

            {/* 5. Plot Selector Tabs (แถบเลือกแปลง) */}
            {farmerPlots.length > 0 && (
                <div className="bg-white p-3 rounded-2xl shadow-xs border border-gray-100 flex items-center justify-between overflow-x-auto custom-scrollbar">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-500 pl-2 whitespace-nowrap">
                            แปลงสวนยางของ {currentFarmer?.name} ({farmerPlots.length} แปลง):
                        </span>
                        {farmerPlots.map((plot, idx) => {
                            const isSelected = selectedPlot?.id === plot.id;
                            return (
                                <button
                                    key={plot.id}
                                    onClick={() => setSelectedPlot(plot)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all whitespace-nowrap ${
                                        isSelected
                                            ? 'bg-emerald-600 text-white shadow-md transform scale-102'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <MapPin size={14} className={isSelected ? 'text-white' : 'text-emerald-600'} />
                                    <span>{plot.plotName || `แปลงที่ ${idx + 1}`}</span>
                                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-gray-600'}`}>
                                        {plot.rai || 0} ไร่
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center space-x-2 pl-4">
                        {selectedPlot && (
                            <>
                                <button
                                    onClick={() => {
                                        setEditingPlot(selectedPlot);
                                        setShowFormModal(true);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all text-xs font-bold flex items-center space-x-1"
                                    title="แก้ไขข้อมูลแปลง"
                                >
                                    <Edit2 size={14} />
                                    <span className="hidden sm:inline">แก้ไขแปลง</span>
                                </button>
                                <button
                                    onClick={() => handleDeletePlot(selectedPlot.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    title="ลบแปลง"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* 6. Middle Section: Interactive Satellite Map */}
            {(activeSection === 'all' || activeSection === 'map') && (
                <div className="bg-white p-4 md:p-5 rounded-3xl shadow-xs border border-gray-100 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs">
                        <div className="flex items-center space-x-2">
                            <MapPin size={18} className="text-emerald-600" />
                            <span className="font-bold text-gray-800 text-sm">
                                ผังแปลงแผนที่ดาวเทียม (Satellite & GIS Map)
                            </span>
                            {selectedPlot && (
                                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                                    โฟกัส: {selectedPlot.plotName} ({selectedPlot.rai || 0} ไร่)
                                </span>
                            )}
                        </div>

                        {summaryData?.weather && (
                            <div className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${
                                summaryData.weather.canTap === 'yes' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                summaryData.weather.canTap === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                                <CloudRain size={15} />
                                <span>วันนี้: {summaryData.weather.canTapText} (ฝน {summaryData.weather.rainProbability}%)</span>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="h-[460px] w-full bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 font-bold animate-pulse">
                            กำลังโหลดระบบแผนที่สวนยาง...
                        </div>
                    ) : (
                        <div className="h-[460px] w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200">
                            <LandPlotMap
                                plots={plotsWithWeather}
                                selectedPlotId={selectedPlot?.id}
                                onSelectPlot={(plot) => setSelectedPlot(plot)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* 7. Bottom Section: Plot 360° Care Dashboard */}
            <div id="plot-details-section" className="space-y-4">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                    <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-base md:text-lg font-black text-gray-900">
                                รายละเอียดการดูแลและสุขภาพแปลง: {selectedPlot?.plotName || 'กรุณาเลือกแปลง'}
                            </h2>
                            <p className="text-xs text-gray-500">
                                ขนาดเนื้อที่ {selectedPlot?.rai || 0} ไร่ {selectedPlot?.ngan || 0} งาน {selectedPlot?.sqWah || 0} วา | คนกรีด: {selectedPlot?.employeeName || 'ไม่ระบุ'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => {
                                setActivityForm(prev => ({ ...prev, activityType: 'fertilizer', title: 'ใส่ปุ๋ยบำรุงต้นยาง' }));
                                setShowFertilizerModal(true);
                            }}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all transform active:scale-95"
                        >
                            <Sprout size={14} />
                            <span>+ บันทึกการใส่ปุ๋ย</span>
                        </button>

                        <button
                            onClick={() => {
                                setActivityForm(prev => ({ ...prev, activityType: 'mowing', title: 'ตัดหญ้ากำจัดวัชพืช' }));
                                setShowMaintenanceModal(true);
                            }}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all transform active:scale-95"
                        >
                            <Wrench size={14} />
                            <span>+ บันทึกงานดูแล/ค่าบริการ</span>
                        </button>
                    </div>
                </div>

                {/* Grid of 6 Essential Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* CARD 1: ผลผลิตน้ำยางสด & คุณภาพ (% DRC) */}
                    {(activeSection === 'all' || activeSection === 'yield') && (
                        <div id="section-yield" className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                                    <Droplets size={16} className="text-emerald-600" />
                                    <span>1. ผลผลิตน้ำยาง & คุณภาพ (% DRC)</span>
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    parseFloat(summaryData?.periodSummary?.avgDrc || 0) >= 33 
                                        ? 'bg-emerald-100 text-emerald-800' 
                                        : 'bg-amber-100 text-amber-800'
                                }`}>
                                    DRC เฉลี่ย: {summaryData?.periodSummary?.avgDrc || '0.0'}%
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
                                    <span className="text-[11px] text-gray-500 block font-medium">น้ำยางสดที่ตัดได้</span>
                                    <span className="text-xl font-black text-emerald-900 font-mono">
                                        {summaryData?.periodSummary?.totalWeight?.toLocaleString() || '0'}
                                    </span>
                                    <span className="text-[10px] text-emerald-700 block font-bold">กก. สด</span>
                                </div>

                                <div className="bg-teal-50/60 p-3 rounded-2xl border border-teal-100">
                                    <span className="text-[11px] text-gray-500 block font-medium">เนื้อยางแห้ง DRC</span>
                                    <span className="text-xl font-black text-teal-900 font-mono">
                                        {summaryData?.periodSummary?.totalDryRubber?.toLocaleString() || '0'}
                                    </span>
                                    <span className="text-[10px] text-teal-700 block font-bold">กก. DRC</span>
                                </div>
                            </div>

                            {/* Recent Buys List */}
                            <div className="space-y-1.5 pt-1">
                                <span className="text-[11px] font-bold text-gray-500 block">ประวัติการตัดรอบล่าสุด:</span>
                                {summaryData?.periodSummary?.recentBuys && summaryData.periodSummary.recentBuys.length > 0 ? (
                                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                        {summaryData.periodSummary.recentBuys.map((b, i) => (
                                            <div key={b.id || i} className="flex justify-between items-center text-[11px] p-1.5 bg-gray-50 rounded-xl">
                                                <span className="font-mono text-gray-600">{b.date}</span>
                                                <span className="font-bold text-gray-800">{b.weight} กก. ({b.drc}%)</span>
                                                <span className="font-mono font-bold text-emerald-700">{(b.total || 0).toLocaleString()} ฿</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-3 text-xs text-gray-400 bg-gray-50 rounded-xl">
                                        ไม่พบรายการส่งน้ำยางในช่วงเวลานี้ (ลองเลือก 'เดือนนี้' หรือ 'ทั้งหมด')
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CARD 2: การใส่ปุ๋ย & ตัวคำนวณปริมาณตามไร่ */}
                    {(activeSection === 'all' || activeSection === 'fertilizer') && (
                        <div id="section-fertilizer" className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                                    <Sprout size={16} className="text-emerald-600" />
                                    <span>2. แผนการใส่ปุ๋ย & ธาตุอาหาร</span>
                                </span>
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold">
                                    แนะนำ กยท.
                                </span>
                            </div>

                            {/* Fertilizer Recommendation Calculator */}
                            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                                <div className="font-bold flex items-center justify-between">
                                    <span>แปลงนี้ {plotRai} ไร่ ควรใส่ปุ๋ย:</span>
                                    <span className="text-emerald-700 font-mono font-black">{recommendedBagsPerApp} กระสอบ</span>
                                </div>
                                <p className="text-[11px] text-emerald-700">
                                    สูตรแนะนำ: <strong className="font-bold text-emerald-900">29-5-18</strong> หรือ <strong className="font-bold text-emerald-900">20-8-20</strong> (~{recommendedKgPerApp} กก./รอบ)
                                </p>
                            </div>

                            {/* Last Fertilizer Record */}
                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-1">
                                <div className="text-gray-500 font-medium flex justify-between">
                                <span>ใส่ปุ๋ยล่าสุดเมื่อ:</span>
                                <strong className="text-gray-900">{summaryData?.plotCare?.lastFertilizer?.date || 'ยังไม่มีบันทึก'}</strong>
                            </div>
                            {summaryData?.plotCare?.lastFertilizer && (
                                <div className="text-[11px] text-gray-600 space-y-0.5">
                                    <div>สูตร: <strong className="text-emerald-800">{summaryData.plotCare.lastFertilizer.fertilizerFormula || '-'}</strong> ({summaryData.plotCare.lastFertilizer.amountKg} กก.)</div>
                                    <div>ค่าปุ๋ย: <span className="font-mono font-bold">{(summaryData.plotCare.lastFertilizer.cost || 0).toLocaleString()} ฿</span></div>
                                </div>
                            )}
                        </div>

                        {/* Next Fertilizer Due */}
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
                            <span className="font-bold flex items-center space-x-1.5">
                                <Clock size={14} className="text-amber-600" />
                                <span>รอบใส่ปุ๋ยถัดไป:</span>
                            </span>
                            <span className="font-bold text-amber-800">
                                {summaryData?.plotCare?.lastFertilizer?.nextDueDate || 'รอบปลายฝน (ก.ย.-ต.ค.)'}
                            </span>
                        </div>
                    </div>
                    )}

                    {/* CARD 3: การดูแลแปลง & ตรวจรอบตัดหญ้า */}
                    {(activeSection === 'all' || activeSection === 'mowing') && (
                        <div id="section-mowing" className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                                    <Wrench size={16} className="text-slate-700" />
                                    <span>3. ความสะอาด & รอบตัดหญ้า</span>
                                </span>
                                {summaryData?.plotCare?.lastMowing?.status === 'clean' ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold flex items-center space-x-1">
                                        <Check size={12} />
                                        <span>สวนสะอาดเรียบร้อย</span>
                                    </span>
                                ) : summaryData?.plotCare?.lastMowing?.status === 'due_soon' ? (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                                        ใกล้ถึงรอบตัดหญ้า
                                    </span>
                                ) : (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-[10px] font-bold">
                                        ถึงกำหนดตัดหญ้าแล้ว
                                    </span>
                                )}
                            </div>

                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">ตัดหญ้าครั้งล่าสุด:</span>
                                    <strong className="text-gray-900">{summaryData?.plotCare?.lastMowing?.date || 'ยังไม่มีบันทึก'}</strong>
                                </div>
                                {summaryData?.plotCare?.lastMowing?.daysAgo != null && (
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-gray-500">ผ่านมาแล้ว:</span>
                                        <span className="font-mono font-bold text-slate-800">{summaryData.plotCare.lastMowing.daysAgo} วัน</span>
                                    </div>
                                )}
                                <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                                    วงรอบมาตรฐาน: 45 - 60 วัน/ครั้ง (เพื่อป้องกันวัชพืชแย่งปุ๋ยต้นยาง)
                                </div>
                            </div>

                            <div className="text-[11px] text-gray-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1">
                                <span className="font-bold text-slate-800 block">งานดูแลสุขภาพหน้ายาง:</span>
                                <div className="flex items-center space-x-1.5 text-slate-700">
                                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                    <span>ทายากันเชื้อราหน้าฝน (ป้องกันราเส้นดำ)</span>
                                </div>
                                <div className="flex items-center space-x-1.5 text-slate-700">
                                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                    <span>ตรวจสอบรอยแผลกรีดบาดเนื้อไม้</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CARD 4: คำแนะนำอัจฉริยะกู้สภาพสวนเมื่อ % ยางน้อย */}
                    {(activeSection === 'all' || activeSection === 'advisor') && (
                        <div id="section-advisor" className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                                    <AlertTriangle size={16} className="text-amber-500" />
                                    <span>4. คำแนะนำเมื่อ % ยางน้อย (DRC Advisor)</span>
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                    กยท. ปฐพีวิทยา
                                </span>
                            </div>

                            <div className="text-xs space-y-2">
                                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-amber-900">
                                    <strong className="font-bold block mb-1">🌿 วิธีปรับสภาพและฟื้นฟูเปอร์เซ็นต์น้ำยาง:</strong>
                                    <ul className="space-y-1 text-[11px] list-disc list-inside text-amber-800">
                                        <li><strong>ปรับสภาพดินกรด:</strong> หว่านปูนโดโลไมท์ 50-100 กก./ไร่ เพื่อลดกรดและเพิ่มแคลเซียม-แมกนีเซียม</li>
                                        <li><strong>ปรับระบบกรีด:</strong> หากกรีดทุกวัน (D1) ให้เปลี่ยนเป็นระบบ <strong>วันเว้นวัน (D2)</strong> เพื่อให้ต้นสร้างน้ำตาลทัน</li>
                                        <li><strong>เสริมปุ๋ยบำรุง:</strong> ใส่ปุ๋ยที่มีโพแทสเซียม (K) สูง ช่วยให้เนื้อยางเข้มข้นขึ้น</li>
                                        <li><strong>พักหน้ายาง:</strong> หากต้นเริ่มผลัดใบ ควรงดกรีดทันที</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CARD 5: สภาพอากาศพิกัดแปลง & วันนี้กรีดได้มั้ย? */}
                    {(activeSection === 'all' || activeSection === 'weather') && (
                        <div id="section-weather" className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                                    <CloudRain size={16} className="text-blue-600" />
                                    <span>5. สภาพอากาศ & วันนี้กรีดได้มั้ย?</span>
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                    01:00 - 06:00 น.
                                </span>
                            </div>

                            {summaryData?.weather ? (
                                <div className="space-y-2.5 text-xs">
                                    <div className={`p-3 rounded-2xl border text-center font-bold ${
                                        summaryData.weather.canTap === 'yes' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                                        summaryData.weather.canTap === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-red-50 border-red-300 text-red-900'
                                    }`}>
                                        <span className="text-lg block font-black">{summaryData.weather.canTapText}</span>
                                        <span className="text-[11px] font-normal block mt-0.5">
                                            โอกาสฝนตกช่วงเช้ามืด: <strong>{summaryData.weather.rainProbability}%</strong> (ฝนสะสม {summaryData.weather.totalRainMm} มม.)
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                                        <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="text-gray-400 block">อุณหภูมิเฉลี่ย</span>
                                            <span className="font-bold text-gray-800 text-sm">{summaryData.weather.avgTemp} °C</span>
                                        </div>
                                        <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="text-gray-400 block">ความชื้นสัมพัทธ์</span>
                                            <span className="font-bold text-gray-800 text-sm">{summaryData.weather.avgHumidity} %</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 rounded-2xl">
                                    แปลงนี้ยังไม่ได้ระบุพิกัด GPS ละติจูด/ลองจิจูด
                                </div>
                            )}
                        </div>
                    )}

                    {/* CARD 6: บัญชีกำไร-ขาดทุน & ค่าบริการรายแปลง */}
                    {(activeSection === 'all' || activeSection === 'financial') && (
                        <div id="section-financial" className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-700 flex items-center space-x-1.5">
                                    <TrendingUp size={16} className="text-emerald-600" />
                                    <span>6. กำไร-ขาดทุน & ค่าบริการแปลง</span>
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                                    สุทธิแปลงนี้
                                </span>
                            </div>

                            <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 text-center">
                                <span className="text-xs font-bold text-emerald-800 block">กำไรสุทธิคงเหลือของแปลง</span>
                                <div className="text-2xl font-black text-emerald-950 font-mono my-0.5">
                                    {summaryData?.plotCare?.netPlotProfit?.toLocaleString() || '0'} <span className="text-sm font-bold text-emerald-700">฿</span>
                                </div>
                                {plotRai > 0 && (
                                    <span className="text-[11px] text-emerald-700 font-bold">
                                        เฉลี่ยกำไร {Math.round((summaryData?.plotCare?.netPlotProfit || 0) / plotRai).toLocaleString()} บาท/ไร่
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between text-gray-600">
                                    <span>รายรับจากน้ำยาง (ส่วนของเจ้าของ):</span>
                                    <span className="font-mono font-bold text-emerald-700">+{summaryData?.periodSummary?.farmerTotal?.toLocaleString() || '0'} ฿</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>ค่าบริการและค่าปุ๋ยที่จ่ายแล้ว:</span>
                                    <span className="font-mono font-bold text-red-600">-{summaryData?.plotCare?.totalActivityCosts?.toLocaleString() || '0'} ฿</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* FARMER SELECTION MODAL */}
            <LandPlotFarmerSelectModal
                showModal={showFarmerModal}
                onClose={() => setShowFarmerModal(false)}
                farmerSearchQuery={farmerSearchQuery}
                setFarmerSearchQuery={setFarmerSearchQuery}
                filteredFarmerList={filteredFarmerList}
                selectedFarmerId={selectedFarmerId}
                onSelectFarmer={(id) => setSelectedFarmerId(id)}
                plots={plots}
            />

            {/* FARMER PORTAL QR CODE MODAL */}
            <LandPlotQrModal
                showModal={showQrModal}
                onClose={() => setShowQrModal(false)}
                currentFarmer={currentFarmer}
                farmerPlots={farmerPlots}
                copiedLink={copiedLink}
                setCopiedLink={setCopiedLink}
            />

            {/* ACTIVITY MODAL (FERTILIZER / MAINTENANCE) */}
            <LandPlotActivityModal
                showFertilizerModal={showFertilizerModal}
                showMaintenanceModal={showMaintenanceModal}
                onClose={() => {
                    setShowFertilizerModal(false);
                    setShowMaintenanceModal(false);
                }}
                activityForm={activityForm}
                setActivityForm={setActivityForm}
                onSubmit={handleSaveActivity}
                selectedPlot={selectedPlot}
                recommendedKgPerApp={recommendedKgPerApp}
                recommendedBagsPerApp={recommendedBagsPerApp}
            />


            {/* FORM MODAL: REGISTER / EDIT PLOT */}
            {showFormModal && (
                <LandPlotFormModal
                    plot={editingPlot}
                    farmers={farmers}
                    employees={employees}
                    farmerEmployees={farmerEmployees}
                    onClose={() => {
                        setShowFormModal(false);
                        setEditingPlot(null);
                    }}
                    onSubmit={handleSavePlot}
                />
            )}
        </div>
    );
};

export default LandPlots;
