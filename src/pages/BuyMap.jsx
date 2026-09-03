import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Search, Filter, RefreshCw, Scale, User, Users, FileText, CheckCircle, Plus, List, ChevronDown, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchLandPlots } from '../services/landPlotService';
import { fetchFarmers, fetchEmployees, fetchFarmerEmployees, fetchDailyPrice, getSettings, addBuyRecord, fetchBuyRecords, fetchMemberTypes } from '../services/apiService';
import LandPlotMap from '../components/map/LandPlotMap';
import QuickBuyModal from '../components/map/QuickBuyModal';
import BuyPaperReceipt from './buy/BuyPaperReceipt';
import { printRecord } from '../utils/PrintService';

export const BuyMap = () => {
    const [plots, setPlots] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [farmerEmployees, setFarmerEmployees] = useState([]);
    const [memberTypes, setMemberTypes] = useState([]);
    const [drcBonuses, setDrcBonuses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFarmerId, setSelectedFarmerId] = useState('');
    const [farmerSearch, setFarmerSearch] = useState('');
    const [showFarmerDropdown, setShowFarmerDropdown] = useState(false);
    const farmerDropdownRef = useRef(null);

    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

    const [selectedPlot, setSelectedPlot] = useState(null);
    const [quickBuyPlot, setQuickBuyPlot] = useState(null);

    const [dailyPriceObj, setDailyPriceObj] = useState({ price: '50', date: '' });
    const [settings, setLocalSettings] = useState({ factoryName: 'ร้านรับซื้อน้ำยางพารา', address: '', phone: '' });

    // Print Receipt State & Ref
    const printRef = useRef(null);
    const [printingReceipt, setPrintingReceipt] = useState(null);

    const paperSlipConfig = useMemo(() => {
        try {
            return settings.paperSlipConfig ? JSON.parse(settings.paperSlipConfig) : null;
        } catch (e) {
            console.error("Error parsing paperSlipConfig:", e);
            return null;
        }
    }, [settings.paperSlipConfig]);

    // Click outside listener for farmer dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (farmerDropdownRef.current && !farmerDropdownRef.current.contains(event.target)) {
                setShowFarmerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const todayStr = new Date().toISOString().split('T')[0];
            const [plotList, farmerList, empList, feList, priceRes, settingsRes, todayBuysRes, mtRes] = await Promise.all([
                fetchLandPlots(),
                fetchFarmers(),
                fetchEmployees(),
                fetchFarmerEmployees(),
                fetchDailyPrice(),
                getSettings(),
                fetchBuyRecords(false, { startDate: todayStr, endDate: todayStr }),
                fetchMemberTypes()
            ]);

            const todayBuys = Array.isArray(todayBuysRes) ? todayBuysRes : [];

            setFarmers(farmerList || []);
            setEmployees(empList || []);
            setFarmerEmployees(feList || []);
            setMemberTypes(mtRes || []);

            const priceData = priceRes && priceRes.status === 'success' ? priceRes.data : (priceRes?.data || priceRes || { price: '50' });
            setDailyPriceObj(priceData);

            const settingsData = settingsRes?.status === 'success' ? settingsRes.data : (settingsRes?.data || settingsRes || {});
            setLocalSettings(settingsData);

            if (settingsData.drc_bonuses || settingsData.drcBonuses) {
                try {
                    setDrcBonuses(JSON.parse(settingsData.drc_bonuses || settingsData.drcBonuses));
                } catch (e) {}
            }

            // Merge plot list with farmer, employee, and TODAY'S BUY STATUS
            const enrichedPlots = (plotList || []).map(plot => {
                const f = (farmerList || []).find(item => item.id === plot.farmerId);
                const emp = plot.employeeId ? (empList || []).find(item => item.id === plot.employeeId) : null;
                const empLink = plot.employeeId ? (feList || []).find(item => item.farmerId === plot.farmerId && item.employeeId === plot.employeeId) : null;

                const plotBuysToday = todayBuys.filter(b => 
                    (b.landPlotId && b.landPlotId === plot.id) ||
                    (!b.landPlotId && b.farmerId === plot.farmerId && (plot.employeeId ? b.employeeId === plot.employeeId : true))
                );
                const hasSoldToday = plotBuysToday.length > 0;
                const todayWeight = plotBuysToday.reduce((sum, b) => sum + (parseFloat(b.weight) || 0), 0);
                const todayTotal = plotBuysToday.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);

                return {
                    ...plot,
                    farmerName: f ? f.name : 'ไม่ระบุเกษตรกร',
                    employeeName: emp ? emp.name : (plot.employeeId ? 'ลูกจ้างกรีด' : 'เกษตรกรกรีดเอง'),
                    profitSharePct: plot.employeeId ? (empLink && empLink.profitSharePct != null ? empLink.profitSharePct : 50) : 0,
                    hasSoldToday,
                    todayWeight,
                    todayTotal,
                    todayBuyCount: plotBuysToday.length
                };
            });

            setPlots(enrichedPlots);

            // Auto-select first plot if available
            if (enrichedPlots.length > 0) {
                setSelectedPlot(prev => {
                    if (!prev) return enrichedPlots[0];
                    const updated = enrichedPlots.find(p => p.id === prev.id);
                    return updated || enrichedPlots[0];
                });
            }
        } catch (err) {
            console.error('Error loading BuyMap data:', err);
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลแผนที่');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter plots based on search inputs
    const filteredPlots = plots.filter(plot => {
        const matchesSearch = !searchTerm ||
            plot.plotName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            plot.deedNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            plot.farmerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            plot.employeeName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFarmer = !selectedFarmerId || plot.farmerId === selectedFarmerId;
        const matchesEmployee = !selectedEmployeeId || plot.employeeId === selectedEmployeeId;

        return matchesSearch && matchesFarmer && matchesEmployee;
    });

    // Auto-select plot when filtered list updates
    useEffect(() => {
        if (filteredPlots.length > 0) {
            const exists = filteredPlots.some(p => p.id === selectedPlot?.id);
            if (!exists) {
                setSelectedPlot(filteredPlots[0]);
            }
        } else {
            setSelectedPlot(null);
        }
    }, [filteredPlots]);

    const handleQuickBuySubmit = async (buyPayload, shouldPrint = false) => {
        try {
            const res = await addBuyRecord(buyPayload);
            toast.success('บันทึกการรับซื้อสำเร็จ');

            const savedRecord = {
                ...buyPayload,
                id: (res && res.id) || buyPayload.id || `BUY-${Date.now()}`
            };

            if (shouldPrint) {
                setPrintingReceipt(savedRecord);
                setTimeout(() => {
                    if (printRef.current) {
                        printRecord(printRef.current.innerHTML);
                        setPrintingReceipt(null);
                    }
                }, 500);
            }

            // Refresh status immediately so marker turns green
            loadData();
        } catch (err) {
            console.error('Error executing buy from map:', err);
            toast.error('ไม่สามารถบันทึกธุรกรรมได้');
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl shadow-md">
                        <MapPin size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">แผนที่ซื้อน้ำยางพารา (Map Buy View)</h1>
                        <p className="text-xs text-gray-500">เลือกแปลงสวนยางบนแผนที่หรือรายการด้านขวาเพื่อทำรายการซื้อน้ำยางด่วน</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-bold flex items-center space-x-2">
                        <Scale size={16} />
                        <span>ราคายางวันนี้: {dailyPriceObj.price || '50'} บาท/กก.</span>
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2.5 text-gray-500 hover:text-rubber-700 hover:bg-gray-100 rounded-xl transition-all"
                        title="รีเฟรชข้อมูล"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                {/* Search Term */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อแปลง / เลขโฉนด / ชาวสวน..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-rubber-500"
                    />
                </div>

                {/* Searchable Farmer Dropdown */}
                <div className="relative" ref={farmerDropdownRef}>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="พิมพ์เพื่อค้นหาชื่อเกษตรกร..."
                            value={farmerSearch}
                            onChange={(e) => {
                                setFarmerSearch(e.target.value);
                                setShowFarmerDropdown(true);
                                if (!e.target.value) {
                                    setSelectedFarmerId('');
                                }
                            }}
                            onFocus={() => setShowFarmerDropdown(true)}
                            className="w-full text-xs font-semibold py-2.5 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none">
                            <ChevronDown size={16} className="text-gray-400" />
                        </div>
                    </div>

                    {showFarmerDropdown && (
                        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-1">
                            <div
                                className="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer rounded-xl transition-colors"
                                onClick={() => {
                                    setSelectedFarmerId('');
                                    setFarmerSearch('');
                                    setShowFarmerDropdown(false);
                                }}
                            >
                                -- เกษตรกรทั้งหมด --
                            </div>
                            {farmers
                                .filter(f => !farmerSearch || f.name.toLowerCase().includes(farmerSearch.toLowerCase()) || (f.id && f.id.toLowerCase().includes(farmerSearch.toLowerCase())))
                                .map(f => (
                                    <div
                                        key={f.id}
                                        className={`px-3 py-2 text-xs hover:bg-emerald-50 cursor-pointer rounded-xl flex justify-between items-center transition-colors ${selectedFarmerId === f.id ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-gray-800'}`}
                                        onClick={() => {
                                            setSelectedFarmerId(f.id);
                                            setFarmerSearch(f.name);
                                            setShowFarmerDropdown(false);
                                        }}
                                    >
                                        <span className="font-medium">{f.name}</span>
                                        <span className="text-[10px] text-gray-400 font-mono">{f.phone || f.id}</span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                {/* Employee Filter */}
                <div>
                    <select
                        value={selectedEmployeeId}
                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold focus:ring-2 focus:ring-rubber-500"
                    >
                        <option value="">-- คนกรีดทั้งหมด --</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </select>
                </div>

                {/* Counter Badge */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs">
                    <span>พบแปลงยาง: {filteredPlots.length} แปลง</span>
                    <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                        ขายวันนี้แล้ว: {filteredPlots.filter(p => p.hasSoldToday).length} แปลง
                    </span>
                </div>
            </div>

            {/* Main Content Grid: Map + Right Panel (Optimized 7:5 Proportions) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Map View Column (7 Columns wide ~58%) */}
                <div className="lg:col-span-7 space-y-4">
                    {loading ? (
                        <div className="h-[650px] w-full bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 font-bold animate-pulse">
                            กำลังโหลดระบบแผนที่สวนยาง...
                        </div>
                    ) : (
                        <LandPlotMap
                            plots={filteredPlots}
                            selectedPlotId={selectedPlot?.id}
                            onSelectPlot={(plot) => setSelectedPlot(plot)}
                            onQuickBuy={(plot) => setQuickBuyPlot(plot)}
                        />
                    )}
                </div>

                {/* Right Panel: Compact Selected Plot Info + Expanded Land Plot List (5 Columns wide ~42%) */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Compact Active Selected Plot Detail Card */}
                    {selectedPlot ? (
                        <div className={`p-4 rounded-3xl shadow-sm border transition-all animate-in fade-in duration-200 ${
                            selectedPlot.hasSoldToday 
                                ? 'bg-emerald-50/70 border-emerald-300' 
                                : 'bg-white border-emerald-200 shadow-xs'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-sm text-gray-900 flex items-center space-x-1.5">
                                    <MapPin className={selectedPlot.hasSoldToday ? 'text-emerald-600' : 'text-blue-600'} size={16} />
                                    <span>{selectedPlot.plotName || 'แปลงสวนยาง'}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                                        {selectedPlot.deedType || 'น.ส.4'}
                                    </span>
                                </h3>

                                {selectedPlot.hasSoldToday ? (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                                        <CheckCircle2 size={12} />
                                        <span>ขายแล้ว ({selectedPlot.todayWeight} กก.)</span>
                                    </span>
                                ) : (
                                    <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                                        <Clock size={12} />
                                        <span>ยังไม่ได้ขายวันนี้</span>
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] bg-white/90 p-2.5 rounded-2xl border border-gray-100 mb-3 text-gray-600">
                                <div>
                                    <span className="text-gray-400">เจ้าของ: </span>
                                    <span className="font-bold text-gray-900">{selectedPlot.farmerName}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">คนกรีด: </span>
                                    <span className="font-bold text-emerald-700">{selectedPlot.employeeName} ({selectedPlot.employeeId ? `${selectedPlot.profitSharePct}%` : '0%'})</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">เนื้อที่: </span>
                                    <span className="font-medium text-gray-800">{selectedPlot.rai || 0} ไร่ {selectedPlot.ngan || 0} งาน {selectedPlot.sqWah || 0} วา</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">เลขโฉนด: </span>
                                    <span className="font-mono font-bold text-gray-800">{selectedPlot.deedNumber || '-'}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setQuickBuyPlot(selectedPlot)}
                                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold rounded-2xl shadow-md text-xs flex items-center justify-center space-x-2 transition-all transform active:scale-95"
                            >
                                <Scale size={16} />
                                <span>ทำรายการซื้อน้ำยางจากแปลงนี้</span>
                            </button>
                        </div>
                    ) : null}

                    {/* Expanded Land Plots List Card */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5 text-xs">
                            <span className="font-bold text-gray-800 flex items-center space-x-1.5">
                                <List size={16} className="text-emerald-600" />
                                <span>รายการแปลงยางพาราที่พบ</span>
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                                {filteredPlots.length} แปลง
                            </span>
                        </div>

                        <div className="space-y-2.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-1.5">
                            {filteredPlots.length === 0 ? (
                                <div className="text-center py-8 text-xs text-gray-400">
                                    ไม่พบรายการแปลงสวนยางพารา
                                </div>
                            ) : (
                                filteredPlots.map(plot => {
                                    const isSelected = selectedPlot?.id === plot.id;
                                    return (
                                        <div
                                            key={plot.id}
                                            onClick={() => setSelectedPlot(plot)}
                                            className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-2 text-xs ${
                                                isSelected
                                                    ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                                                    : (plot.hasSoldToday ? 'bg-emerald-50/30 border-emerald-200' : 'bg-gray-50/70 border-gray-200 hover:border-emerald-300')
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-gray-900 flex items-center space-x-1.5">
                                                    <MapPin size={14} className={isSelected ? 'text-emerald-600' : (plot.hasSoldToday ? 'text-emerald-600' : 'text-blue-500')} />
                                                    <span>{plot.plotName || 'แปลงสวนยาง'}</span>
                                                </span>
                                                {plot.hasSoldToday ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md flex items-center space-x-1">
                                                        <CheckCircle2 size={11} />
                                                        <span>ขายแล้ว ({plot.todayWeight} กก.)</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md">
                                                        {plot.deedType || 'น.ส.4'}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-gray-600 space-y-0.5 text-[11px] bg-white p-2 rounded-xl border border-gray-100">
                                                <div className="flex justify-between">
                                                    <span>เจ้าของ:</span>
                                                    <strong className="text-gray-800">{plot.farmerName}</strong>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>คนกรีด:</span>
                                                    <strong className="text-emerald-700">{plot.employeeName} ({plot.employeeId ? `${plot.profitSharePct}%` : '0%'})</strong>
                                                </div>
                                            </div>

                                            <div className="pt-0.5 flex items-center justify-between">
                                                <span className="text-[10px] text-gray-500 font-medium">
                                                    {plot.rai || 0} ไร่ {plot.ngan || 0} งาน {plot.sqWah || 0} วา
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPlot(plot);
                                                        setQuickBuyPlot(plot);
                                                    }}
                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-xs flex items-center space-x-1 transition-all"
                                                >
                                                    <Scale size={13} />
                                                    <span>ซื้อน้ำยาง</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Buy Modal */}
            {quickBuyPlot && (
                <QuickBuyModal
                    plot={quickBuyPlot}
                    farmers={farmers}
                    employees={employees}
                    farmerEmployees={farmerEmployees}
                    dailyPriceObj={dailyPriceObj}
                    drcBonuses={drcBonuses}
                    onClose={() => setQuickBuyPlot(null)}
                    onSubmit={handleQuickBuySubmit}
                />
            )}

            {/* Hidden Printable Paper Receipt Component */}
            <BuyPaperReceipt
                printingReceipt={printingReceipt}
                printRef={printRef}
                setPrintingReceipt={setPrintingReceipt}
                settings={settings}
                drcBonuses={drcBonuses}
                farmers={farmers}
                memberTypes={memberTypes}
                paperSlipConfig={paperSlipConfig}
            />
        </div>
    );
};

export default BuyMap;
