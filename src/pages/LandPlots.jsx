import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, Search, Edit2, Trash2, User, Users, FileText, CheckCircle, RefreshCw, ChevronDown, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchLandPlots, addLandPlot, updateLandPlot, deleteLandPlot } from '../services/landPlotService';
import { fetchFarmers, fetchEmployees, fetchFarmerEmployees } from '../services/apiService';
import LandPlotMap from '../components/map/LandPlotMap';
import LandPlotFormModal from '../components/map/LandPlotFormModal';

export const LandPlots = () => {
    const [plots, setPlots] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [farmerEmployees, setFarmerEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFarmerId, setSelectedFarmerId] = useState('');
    const [farmerSearch, setFarmerSearch] = useState('');
    const [showFarmerDropdown, setShowFarmerDropdown] = useState(false);
    const farmerDropdownRef = useRef(null);

    const [selectedPlot, setSelectedPlot] = useState(null);
    const [editingPlot, setEditingPlot] = useState(null);
    const [showFormModal, setShowFormModal] = useState(false);

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

            // Auto-select first plot
            if (enrichedPlots.length > 0) {
                setSelectedPlot(prev => {
                    if (!prev) return enrichedPlots[0];
                    const updated = enrichedPlots.find(p => p.id === prev.id);
                    return updated || enrichedPlots[0];
                });
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

    const filteredPlots = plots.filter(plot => {
        const matchesSearch = !searchTerm ||
            plot.plotName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            plot.deedNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            plot.farmerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            plot.employeeName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFarmer = !selectedFarmerId || plot.farmerId === selectedFarmerId;

        return matchesSearch && matchesFarmer;
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

    const handleSavePlot = async (formData) => {
        if (editingPlot) {
            await updateLandPlot(editingPlot.id, formData);
        } else {
            await addLandPlot(formData);
        }
        await loadData();
    };

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

    return (
        <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl shadow-md">
                        <MapPin size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">จัดการแปลงโฉนดที่ดินสวนยางพารา</h1>
                        <p className="text-xs text-gray-500">ลงทะเบียนแปลง วาดขอบเขต และผูกรายชื่อคนกรีดประจำแปลง</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={loadData}
                        className="p-2.5 text-gray-500 hover:text-rubber-700 hover:bg-gray-100 rounded-xl transition-all"
                        title="รีเฟรชข้อมูล"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={() => {
                            setEditingPlot(null);
                            setShowFormModal(true);
                        }}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all transform active:scale-95"
                    >
                        <Plus size={16} />
                        <span>ลงทะเบียนแปลงใหม่</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Search Text */}
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
                            placeholder="พิมพ์เพื่อกรองตามชื่อเกษตรกร..."
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

                {/* Counter Badge */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700">
                    <span>แปลงสวนยางทั้งหมด: {filteredPlots.length} แปลง</span>
                </div>
            </div>

            {/* Split Screen 2-Column Layout (ฝั่งซ้าย: รายละเอียด/รายการแปลง, ฝั่งขวา: Map) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT COLUMN: Plot Details & List (5 Columns wide on desktop) */}
                <div className="lg:col-span-5 space-y-4">
                    {/* Compact Active Selected Plot Detail Card */}
                    {selectedPlot ? (
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-emerald-200 bg-emerald-50/20 transition-all animate-in fade-in duration-200">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-sm text-gray-900 flex items-center space-x-1.5">
                                    <MapPin className="text-emerald-600" size={16} />
                                    <span>{selectedPlot.plotName || 'แปลงสวนยาง'}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                                        {selectedPlot.deedType || 'น.ส.4'}
                                    </span>
                                </h3>

                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => {
                                            setEditingPlot(selectedPlot);
                                            setShowFormModal(true);
                                        }}
                                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
                                        title="แก้ไขข้อมูลแปลง"
                                    >
                                        <Edit2 size={13} />
                                        <span>แก้ไข</span>
                                    </button>

                                    <button
                                        onClick={() => handleDeletePlot(selectedPlot.id)}
                                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-all"
                                        title="ลบแปลง"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] bg-white/90 p-2.5 rounded-2xl border border-gray-100 text-gray-600">
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
                        </div>
                    ) : null}

                    {/* Plots List Card */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5 text-xs">
                            <span className="font-bold text-gray-800 flex items-center space-x-1.5">
                                <List size={16} className="text-emerald-600" />
                                <span>รายการแปลงสวนยางทั้งหมด</span>
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                                {filteredPlots.length} แปลง
                            </span>
                        </div>

                        <div className="space-y-2.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-1.5">
                            {filteredPlots.length === 0 ? (
                                <div className="text-center py-10 text-xs text-gray-400">
                                    ไม่พบรายการแปลงสวนยางพารา
                                </div>
                            ) : (
                                filteredPlots.map(plot => {
                                    const isSelected = selectedPlot?.id === plot.id;
                                    return (
                                        <div
                                            key={plot.id}
                                            onClick={() => setSelectedPlot(plot)}
                                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 text-xs ${
                                                isSelected
                                                    ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                                                    : 'bg-gray-50/70 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-gray-900 flex items-center space-x-1.5">
                                                    <MapPin size={14} className={isSelected ? 'text-emerald-600' : 'text-gray-400'} />
                                                    <span>{plot.plotName || 'แปลงสวนยาง'}</span>
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md">
                                                    {plot.deedType || 'น.ส.4'}
                                                </span>
                                            </div>

                                            <div className="text-gray-600 space-y-1 text-[11px] bg-white p-2 rounded-xl border border-gray-100">
                                                <div className="flex justify-between">
                                                    <span>เจ้าของ:</span>
                                                    <strong className="text-gray-800">{plot.farmerName}</strong>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>คนกรีด:</span>
                                                    <strong className="text-emerald-700">{plot.employeeName} ({plot.employeeId ? `${plot.profitSharePct}%` : '0%'})</strong>
                                                </div>
                                            </div>

                                            <div className="pt-1 flex items-center justify-between">
                                                <span className="text-[10px] text-gray-500 font-medium">
                                                    {plot.rai || 0} ไร่ {plot.ngan || 0} งาน {plot.sqWah || 0} วา
                                                </span>

                                                <div className="flex items-center space-x-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingPlot(plot);
                                                            setShowFormModal(true);
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeletePlot(plot.id);
                                                        }}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Map View (7 Columns wide on desktop) */}
                <div className="lg:col-span-7">
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3 sticky top-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-bold text-sm text-gray-800 flex items-center space-x-2">
                                <MapPin size={18} className="text-emerald-600" />
                                <span>ผังแผนที่แปลงสวนยางพารา (Map View)</span>
                            </h3>
                            {selectedPlot && (
                                <span className="text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                    กำลังแสดง: {selectedPlot.plotName}
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="h-[650px] w-full bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 font-bold animate-pulse">
                                กำลังโหลดระบบแผนที่สวนยาง...
                            </div>
                        ) : (
                            <LandPlotMap
                                plots={filteredPlots}
                                selectedPlotId={selectedPlot?.id}
                                onSelectPlot={(plot) => setSelectedPlot(plot)}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Form Modal */}
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
