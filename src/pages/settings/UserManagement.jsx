import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
    Leaf, RefreshCw, Plus, Phone, MapPin, Database, Edit2, Trash2, 
    UserCircle, Percent, X, Save, Search, Clock, Filter, AlertTriangle, ShoppingBag
} from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { db } from '../../services/db';
import ReportPrintHeader from '../../components/ReportPrintHeader';
import { 
    fetchFarmers, 
    fetchEmployees, 
    fetchMemberTypes, 
    fetchBuyRecords,
    getSettings,
    addFarmer, 
    addEmployee, 
    deleteRecord,
    updateRecord,
    addMemberType as addMemberTypeAPI,
    deleteMemberType as deleteMemberTypeAPI
} from '../../services/apiService';

export const UserManagement = () => {
    const location = useLocation();
    const [activeSubTab, setActiveSubTab] = useState('farmers');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Lists
    const [farmers, setFarmers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [memberTypes, setMemberTypes] = useState([]);
    const [buys, setBuys] = useState([]);
    const [settings, setSettings] = useState({});

    // Activity Filter State
    const [activityFilter, setActivityFilter] = useState(location.state?.activityFilter || 'all'); // 'all', 'active', 'inactive_30', 'inactive_60', 'never', 'custom_days'
    const [customDaysThreshold, setCustomDaysThreshold] = useState(location.state?.customDaysThreshold || 60);

    useEffect(() => {
        if (location.state?.activityFilter) {
            setActivityFilter(location.state.activityFilter);
        }
        if (location.state?.customDaysThreshold) {
            setCustomDaysThreshold(location.state.customDaysThreshold);
        }
    }, [location.state]);

    // UI States
    const [showFarmerForm, setShowFarmerForm] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState(null);
    const [showEmployeeForm, setShowEmployeeForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [showMemberTypeForm, setShowMemberTypeForm] = useState(false);
    const [editingMemberType, setEditingMemberType] = useState(null);
    const [mtFormData, setMtFormData] = useState({ name: '', bonus: '0' });

    // Search States
    const [farmerSearch, setFarmerSearch] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');

    const farmerForm = useForm({
        defaultValues: {
            name: '', phone: '', bankAccount: '', bankName: '', address: '', note: '', fscId: '', memberTypeId: ''
        }
    });

    const employeeForm = useForm({
        defaultValues: {
            name: '', farmerId: '', profitSharePct: 10, phone: '', bankAccount: '', bankName: ''
        }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // First load local buys from Dexie if available
            try {
                const localBuys = await db.buys.toArray();
                if (localBuys && localBuys.length > 0) setBuys(localBuys);
            } catch (e) { console.error(e); }

            const [fRes, eRes, mtRes, bRes, sRes] = await Promise.all([
                fetchFarmers(true),
                fetchEmployees(),
                fetchMemberTypes(),
                fetchBuyRecords(),
                getSettings()
            ]);
            setFarmers(Array.isArray(fRes) ? fRes : []);
            setEmployees(Array.isArray(eRes) ? eRes : []);
            setMemberTypes(Array.isArray(mtRes) ? mtRes : []);
            if (Array.isArray(bRes)) setBuys(bRes);
            if (sRes && sRes.status === 'success' && sRes.data) setSettings(sRes.data);
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    // Farmer Handlers
    const onSubmitFarmer = async (data) => {
        setSaving(true);
        try {
            let res;
            if (editingFarmer) {
                res = await updateRecord('farmers', editingFarmer.id, data);
            } else {
                res = await addFarmer(data);
            }
            
            if (res.status === 'success') {
                toast.success(editingFarmer ? 'แก้ไขข้อมูลเกษตรกรสำเร็จ' : 'เพิ่มข้อมูลเกษตรกรสำเร็จ');
                setShowFarmerForm(false);
                setEditingFarmer(null);
                farmerForm.reset();
                loadData();
            }
        } catch (err) {
            toast.error('บันทึกล้มเหลว');
        } finally {
            setSaving(false);
        }
    };

    const handleEditFarmer = (farmer) => {
        setEditingFarmer(farmer);
        setShowFarmerForm(true);
        farmerForm.reset({
            name: farmer.name,
            phone: farmer.phone,
            bankAccount: farmer.bankAccount,
            bankName: farmer.bankName,
            address: farmer.address,
            note: farmer.note,
            fscId: farmer.fscId || '',
            memberTypeId: farmer.memberTypeId || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Employee Handlers
    const onSubmitEmployee = async (data) => {
        setSaving(true);
        try {
            let res;
            if (editingEmployee) {
                res = await updateRecord('employees', editingEmployee.id, data);
            } else {
                res = await addEmployee(data);
            }
            
            if (res.status === 'success') {
                toast.success(editingEmployee ? 'แก้ไขข้อมูลลูกจ้างสำเร็จ' : 'เพิ่มข้อมูลลูกจ้างสำเร็จ');
                setShowEmployeeForm(false);
                setEditingEmployee(null);
                employeeForm.reset();
                loadData();
            }
        } catch (err) {
            toast.error('บันทึกล้มเหลว');
        } finally {
            setSaving(false);
        }
    };

    const handleEditEmployee = (emp) => {
        setEditingEmployee(emp);
        setShowEmployeeForm(true);
        employeeForm.reset({
            name: emp.name,
            farmerId: emp.farmerId,
            profitSharePct: emp.profitSharePct,
            phone: emp.phone,
            bankAccount: emp.bankAccount,
            bankName: emp.bankName
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Member Type Handlers
    const handleMemberTypeSubmit = async () => {
        if (!mtFormData.name) return toast.error('กรุณาระบุชื่อประเภทสมาชิก');
        setSaving(true);
        try {
            const res = await addMemberTypeAPI({
                id: editingMemberType?.id,
                name: mtFormData.name,
                bonus: mtFormData.bonus
            });
            if (res.status === 'success') {
                toast.success(editingMemberType ? 'แก้ไขสำเร็จ' : 'เพิ่มสำเร็จ');
                setShowMemberTypeForm(false);
                setEditingMemberType(null);
                setMtFormData({ name: '', bonus: '0' });
                loadData();
            }
        } catch (e) {
            toast.error('ล้มเหลว');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRecord = async (sheetName, id) => {
        if (!window.confirm('ยืนยันการลบข้อมูล?')) return;
        try {
            const res = await deleteRecord(sheetName, id);
            if (res.status === 'success') {
                toast.success('ลบข้อมูลสำเร็จ');
                loadData();
            }
        } catch (err) {
            toast.error('ลบล้มเหลว');
        }
    };

    // Compute Farmer Last Buy Activity and Days Inactive
    const farmerActivityMap = React.useMemo(() => {
        const map = {};
        const today = new Date();

        buys.forEach(b => {
            if (!b.farmerId && !b.farmerName) return;
            const key = b.farmerId || b.farmerName;
            const bDate = b.date ? new Date(b.date) : (b.timestamp ? new Date(b.timestamp) : null);
            if (!bDate || isNaN(bDate.getTime())) return;

            if (!map[key] || bDate > map[key].lastDate) {
                map[key] = {
                    lastDate: bDate,
                    count: (map[key]?.count || 0) + 1
                };
            } else {
                map[key].count += 1;
            }
        });

        // Resolve map entries for all farmers by id or name, combining local buys with server-computed lastBuyDate
        const result = {};
        farmers.forEach(f => {
            const entry = map[f.id] || map[f.name];
            const localDate = entry?.lastDate || null;
            const apiDate = f.lastBuyDate ? new Date(f.lastBuyDate) : null;

            // Pick the latest known purchase date between local buys and server API
            let finalLastDate = null;
            if (localDate && apiDate) {
                finalLastDate = localDate > apiDate ? localDate : apiDate;
            } else {
                finalLastDate = localDate || apiDate;
            }

            if (finalLastDate && !isNaN(finalLastDate.getTime())) {
                const daysAgo = differenceInDays(today, finalLastDate);
                result[f.id] = {
                    lastDate: finalLastDate,
                    daysAgo: Math.max(0, daysAgo),
                    count: Math.max(entry?.count || 0, f.buyCount || 0)
                };
            } else {
                result[f.id] = { lastDate: null, daysAgo: null, count: 0 };
            }
        });

        return result;
    }, [buys, farmers]);

    // Statistics for Inactive Farmers
    const activityStats = React.useMemo(() => {
        let active = 0;
        let inactive30 = 0;
        let inactive60 = 0;
        let never = 0;

        farmers.forEach(f => {
            const act = farmerActivityMap[f.id];
            if (!act || act.daysAgo === null) {
                never++;
            } else if (act.daysAgo <= 30) {
                active++;
            } else if (act.daysAgo <= 60) {
                inactive30++;
            } else {
                inactive60++;
            }
        });

        return { active, inactive30, inactive60, never, total: farmers.length };
    }, [farmers, farmerActivityMap]);

    // Filtered Farmers List
    const filteredFarmers = React.useMemo(() => {
        return farmers.filter(f => {
            const matchesSearch = f.name?.toLowerCase().includes(farmerSearch.toLowerCase()) || 
                f.phone?.includes(farmerSearch) ||
                f.id?.toLowerCase().includes(farmerSearch.toLowerCase());
            
            if (!matchesSearch) return false;

            const act = farmerActivityMap[f.id];
            if (activityFilter === 'active') return act && act.daysAgo !== null && act.daysAgo <= 30;
            if (activityFilter === 'inactive_30') return act && act.daysAgo !== null && act.daysAgo > 30 && act.daysAgo <= 60;
            if (activityFilter === 'inactive_60') return act && act.daysAgo !== null && act.daysAgo > 60;
            if (activityFilter === 'never') return !act || act.daysAgo === null;
            if (activityFilter === 'custom_days') return !act || act.daysAgo === null || act.daysAgo >= Number(customDaysThreshold);
            return true;
        });
    }, [farmers, farmerSearch, activityFilter, farmerActivityMap, customDaysThreshold]);

    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    html, body, #root, main, div { overflow: visible !important; height: auto !important; max-height: none !important; }
                    .no-print { display: none !important; }
                    tr { page-break-inside: avoid; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }
            ` }} />
            
            <div className="no-print space-y-6">
            {/* Sub-Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
                <button
                    onClick={() => setActiveSubTab('farmers')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
                        activeSubTab === 'farmers'
                            ? 'bg-white text-rubber-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Leaf size={16} />
                    <span>เกษตรกร</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeSubTab === 'farmers' ? 'bg-rubber-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                        {farmers.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveSubTab('employees')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
                        activeSubTab === 'employees'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <UserCircle size={16} />
                    <span>ลูกจ้าง</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeSubTab === 'employees' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                        {employees.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveSubTab('member_types')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
                        activeSubTab === 'member_types'
                            ? 'bg-white text-amber-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Percent size={16} />
                    <span>ประเภทและโบนัส</span>
                </button>
            </div>

            {/* ===================== FARMERS TAB ===================== */}
            {activeSubTab === 'farmers' && (
                <section className="animate-in fade-in duration-300">
                    {/* Activity Status Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div 
                            onClick={() => setActivityFilter('active')}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${activityFilter === 'active' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                        >
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 mb-1">
                                <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></div>มาขายปกติ (≤30 วัน)</span>
                                <span className="font-mono">{activityStats.active}</span>
                            </div>
                            <div className="text-[11px] text-gray-400">เกษตรกรที่มาขายน้ำยางสม่ำเสมอ</div>
                        </div>

                        <div 
                            onClick={() => setActivityFilter('inactive_30')}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${activityFilter === 'inactive_30' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                        >
                            <div className="flex items-center justify-between text-xs font-bold text-amber-700 mb-1">
                                <span className="flex items-center"><Clock size={13} className="mr-1 text-amber-500" />ขาดติดต่อ (31-60 วัน)</span>
                                <span className="font-mono">{activityStats.inactive30}</span>
                            </div>
                            <div className="text-[11px] text-gray-400">ไม่ได้มาขายมากกว่า 1 เดือน</div>
                        </div>

                        <div 
                            onClick={() => setActivityFilter('inactive_60')}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${activityFilter === 'inactive_60' ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                        >
                            <div className="flex items-center justify-between text-xs font-bold text-red-700 mb-1">
                                <span className="flex items-center"><AlertTriangle size={13} className="mr-1 text-red-500" />ไม่ได้มาขาย &gt;60 วัน</span>
                                <span className="font-mono">{activityStats.inactive60}</span>
                            </div>
                            <div className="text-[11px] text-gray-400">ขาดการติดต่อนานเกิน 2 เดือน</div>
                        </div>

                        <div 
                            onClick={() => setActivityFilter('never')}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${activityFilter === 'never' ? 'bg-gray-100 border-gray-300 ring-2 ring-gray-400/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                        >
                            <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
                                <span className="flex items-center"><ShoppingBag size={13} className="mr-1 text-gray-400" />ยังไม่เคยขาย</span>
                                <span className="font-mono">{activityStats.never}</span>
                            </div>
                            <div className="text-[11px] text-gray-400">ไม่มีประวัติรายการรับซื้อ</div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-1">
                            <div className="relative w-full sm:w-64">
                                <input
                                    type="text"
                                    placeholder="ค้นหาชื่อหรือเบอร์โทร..."
                                    value={farmerSearch}
                                    onChange={(e) => setFarmerSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-rubber-500 focus:border-rubber-500 text-sm shadow-sm"
                                />
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                {farmerSearch && (
                                    <button 
                                        onClick={() => setFarmerSearch('')}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Status Filter Selector */}
                            <div className="flex items-center space-x-2">
                                <select
                                    value={activityFilter}
                                    onChange={(e) => setActivityFilter(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold bg-white text-gray-700 shadow-sm focus:ring-rubber-500 focus:border-rubber-500 cursor-pointer"
                                >
                                    <option value="all">🌐 แสดงทุกสถานะ ({activityStats.total} คน)</option>
                                    <option value="active">🟢 มาขายปกติ (≤30 วัน) [{activityStats.active} คน]</option>
                                    <option value="inactive_30">🟡 ขาดการติดต่อ (31-60 วัน) [{activityStats.inactive30} คน]</option>
                                    <option value="inactive_60">🔴 ขาดการติดต่อนาน (&gt;60 วัน) [{activityStats.inactive60} คน]</option>
                                    <option value="never">⚪ ยังไม่เคยมีประวัติขาย [{activityStats.never} คน]</option>
                                    <option value="custom_days">⏱️ กำหนดจำนวนวันขาดติดต่อเอง...</option>
                                </select>

                                {activityFilter === 'custom_days' && (
                                    <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl animate-in fade-in duration-200">
                                        <span className="text-xs font-bold text-amber-800">ขาดขาย ≥</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="999"
                                            value={customDaysThreshold}
                                            onChange={(e) => setCustomDaysThreshold(Math.max(1, Number(e.target.value)))}
                                            className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-sm font-bold text-amber-900 text-center focus:ring-2 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-bold text-amber-800">วัน</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex space-x-2 w-full md:w-auto">
                            <button
                                onClick={() => loadData()}
                                className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-2 text-rubber-600 hover:bg-rubber-50 rounded-lg transition text-sm font-bold"
                            >
                                <RefreshCw size={18} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                                รีเฟรช
                            </button>
                            {!showFarmerForm && (
                                <button
                                    onClick={() => {
                                        setEditingFarmer(null);
                                        farmerForm.reset();
                                        setShowFarmerForm(true);
                                    }}
                                    className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 transition shadow-sm font-medium"
                                >
                                    <Plus size={18} className="mr-1" />
                                    เพิ่มเกษตรกร
                                </button>
                            )}
                        </div>
                    </div>

                    {showFarmerForm && (
                        <div className={`rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 shadow-sm border ${editingFarmer ? 'bg-amber-50/50 border-amber-100' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`font-bold ${editingFarmer ? 'text-amber-800' : 'text-gray-700'}`}>
                                    {editingFarmer ? `แก้ไขข้อมูล: ${editingFarmer.name}` : 'เพิ่มข้อมูลเกษตรกรใหม่'}
                                </h3>
                                <button onClick={() => { setShowFarmerForm(false); setEditingFarmer(null); farmerForm.reset(); }} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={farmerForm.handleSubmit(onSubmitFarmer)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                                    <input 
                                        {...farmerForm.register('name', { required: 'กรุณาระบุชื่อ-นามสกุล' })} 
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-rubber-500 ${farmerForm.formState.errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        placeholder="นายสมชาย ใจดี" 
                                    />
                                    {farmerForm.formState.errors.name && <p className="text-red-500 text-[10px] mt-1 font-medium">{farmerForm.formState.errors.name.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">เบอร์โทรศัพท์</label>
                                    <input {...farmerForm.register('phone')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="08x-xxx-xxxx" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">เลขบัญชีธนาคาร</label>
                                    <input {...farmerForm.register('bankAccount')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="xxx-x-xxxxx-x" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">ชื่อธนาคาร</label>
                                    <input {...farmerForm.register('bankName')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="กสิกรไทย / ธกส." />
                                </div>
                                <div className="md:col-span-1 space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">ที่อยู่</label>
                                    <input {...farmerForm.register('address')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="123 ม.1 ต..." />
                                </div>
                                <div className="md:col-span-1 space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">หมายเหตุ</label>
                                    <input {...farmerForm.register('note')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">รหัส FSC (FSCID)</label>
                                    <input {...farmerForm.register('fscId')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="รหัส FSC" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">ประเภทสมาชิก (โบนัส)</label>
                                    <select {...farmerForm.register('memberTypeId')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500 bg-white">
                                        <option value="">-- บุคคลทั่วไป (ไม่มีโบนัส) --</option>
                                        {memberTypes.map(mt => (
                                            <option key={mt.id} value={mt.id}>{mt.name} (โบนัส +{mt.bonus} บาท)</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="lg:col-span-3 flex justify-end space-x-2 pt-2">
                                    <button type="button" onClick={() => { setShowFarmerForm(false); setEditingFarmer(null); farmerForm.reset(); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                                    <button type="submit" disabled={saving} className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center space-x-2 ${editingFarmer ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rubber-600 hover:bg-rubber-700'}`}>
                                        <Save size={18} />
                                        <span>{editingFarmer ? 'บันทึกการแก้ไข' : 'บันทึกเกษตรกร'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Report Summary Banner */}
                    {activityFilter !== 'all' && (
                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 mb-4 flex items-center justify-between animate-in fade-in">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-amber-900">
                                        {activityFilter === 'custom_days' 
                                            ? `รายงานสรุปเกษตรกรที่ไม่ได้มาขายน้ำยางเกิน ${customDaysThreshold} วัน`
                                            : activityFilter === 'inactive_30'
                                            ? 'รายงานสรุปเกษตรกรที่ขาดการติดต่อ 31 - 60 วัน'
                                            : activityFilter === 'inactive_60'
                                            ? 'รายงานสรุปเกษตรกรที่ขาดการติดต่อนานเกิน 60 วัน'
                                            : activityFilter === 'never'
                                            ? 'รายงานสรุปเกษตรกรที่ยังไม่เคยมีประวัติขาย'
                                            : 'รายงานสรุปเกษตรกรที่มาขายปกติ'}
                                    </h4>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        พบทั้งหมด <strong className="font-bold text-amber-900">{filteredFarmers.length} คน</strong> จากเกษตรกรในระบบ {farmers.length} คน
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => window.print()}
                                className="px-3.5 py-2 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                            >
                                <span>🖨️ พิมพ์รายงานสรุป</span>
                            </button>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 font-medium text-gray-500 text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left">เกษตรกร</th>
                                    <th className="px-6 py-4 text-left">ประวัติขายล่าสุด</th>
                                    <th className="px-6 py-4 text-left">สถานะ LINE</th>
                                    <th className="px-6 py-4 text-left">ติดต่อ / ที่อยู่</th>
                                    <th className="px-6 py-4 text-left text-center">รหัส FSC / ประเภท</th>
                                    <th className="px-6 py-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {filteredFarmers.map(f => {
                                    const act = farmerActivityMap[f.id];
                                    return (
                                    <tr key={f.id} className={`hover:bg-rubber-50/30 transition-colors group ${editingFarmer?.id === f.id ? 'bg-amber-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                {f.linePicture ? (
                                                    <img src={f.linePicture} alt={f.lineName} className="w-10 h-10 rounded-full border-2 border-rubber-100" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-rubber-100 flex items-center justify-center text-rubber-600 font-bold text-sm">
                                                        {f.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-gray-900">{f.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono">ID: {f.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Last Purchase Activity Column */}
                                        <td className="px-6 py-4">
                                            {act && act.lastDate ? (
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center space-x-1.5">
                                                        {act.daysAgo <= 30 ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></span>
                                                                {act.daysAgo === 0 ? 'วันนี้' : `${act.daysAgo} วันที่แล้ว`}
                                                            </span>
                                                        ) : act.daysAgo <= 60 ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                                <Clock size={11} className="mr-1 text-amber-600" />
                                                                {act.daysAgo} วันที่แล้ว
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                                                                <AlertTriangle size={11} className="mr-1 text-red-600" />
                                                                ไม่ได้มา {act.daysAgo} วันแล้ว
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500">
                                                        {format(act.lastDate, 'd MMM yyyy', { locale: th })} ({act.count} รายการ)
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400 italic border border-gray-200">
                                                    ยังไม่มีประวัติ
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {f.lineName ? (
                                                <div className="flex flex-col">
                                                    <div className="flex items-center text-[11px] text-green-600 font-black uppercase tracking-wider mb-1">
                                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                                        Connected
                                                    </div>
                                                    <div className="text-xs font-medium text-gray-600">{f.lineName}</div>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold italic">Manual</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center text-gray-700 font-medium font-mono">
                                                    <Phone size={12} className="mr-1.5 text-rubber-400" />
                                                    {f.phone || '-'}
                                                </div>
                                                <div className="flex items-center text-[11px] text-gray-500 max-w-[200px] truncate" title={f.address}>
                                                    <MapPin size={12} className="mr-1.5 text-gray-300" />
                                                    {f.address || '-'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-center space-y-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-center w-full max-w-[120px] ${f.fscId ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'text-gray-300 italic border border-transparent'}`}>
                                                    FSC: {f.fscId || '-'}
                                                </span>
                                                {f.memberTypeId && memberTypes.find(mt => mt.id === f.memberTypeId) ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rubber-100 text-rubber-700 border border-rubber-200 text-center w-full max-w-[120px]">
                                                        {memberTypes.find(mt => mt.id === f.memberTypeId)?.name} (+{memberTypes.find(mt => mt.id === f.memberTypeId)?.bonus})
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 border border-gray-100 text-center w-full max-w-[120px]">ทั่วไป</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center space-x-1">
                                                <button
                                                    onClick={() => handleEditFarmer(f)}
                                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRecord('farmers', f.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                                {filteredFarmers.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <Leaf size={40} className="mb-2 opacity-20" />
                                                <p>ไม่พบข้อมูลเกษตรกรในเงื่อนไขที่เลือก</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* ===================== EMPLOYEES TAB ===================== */}
            {activeSubTab === 'employees' && (
                <section className="animate-in fade-in duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="relative w-full md:w-72">
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อลูกจ้าง..."
                                value={employeeSearch}
                                onChange={(e) => setEmployeeSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            {employeeSearch && (
                                <button 
                                    onClick={() => setEmployeeSearch('')}
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        {!showEmployeeForm && (
                            <button
                                onClick={() => {
                                    setEditingEmployee(null);
                                    employeeForm.reset();
                                    setShowEmployeeForm(true);
                                }}
                                className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
                            >
                                <Plus size={18} className="mr-1" />
                                เพิ่มลูกจ้าง
                            </button>
                        )}
                    </div>

                    {showEmployeeForm && (
                        <div className={`rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 shadow-sm border ${editingEmployee ? 'bg-amber-50/50 border-amber-100' : 'bg-blue-50 border-blue-100 shadow-inner'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`font-bold ${editingEmployee ? 'text-amber-800' : 'text-blue-800'}`}>
                                    {editingEmployee ? `แก้ไขข้อมูล: ${editingEmployee.name}` : 'เพิ่มข้อมูลลูกจ้างใหม่'}
                                </h3>
                                <button onClick={() => { setShowEmployeeForm(false); setEditingEmployee(null); employeeForm.reset(); }} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={employeeForm.handleSubmit(onSubmitEmployee)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                                    <input 
                                        {...employeeForm.register('name', { required: 'กรุณาระบุชื่อลูกจ้าง' })} 
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 ${employeeForm.formState.errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
                                        placeholder="ชื่อลูกจ้าง" 
                                    />
                                    {employeeForm.formState.errors.name && <p className="text-red-500 text-[10px] mt-1 font-medium">{employeeForm.formState.errors.name.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>สังกัดเกษตรกร <span className="text-red-500">*</span></label>
                                    <select {...employeeForm.register('farmerId', { required: true })} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 bg-white">
                                        <option value="">-- เลือกเกษตรกร --</option>
                                        {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase flex items-center ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>
                                        ส่วนแบ่งกำไร (%) <Percent size={12} className="ml-1" />
                                    </label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        {...employeeForm.register('profitSharePct', { 
                                            required: 'กรุณาระบุส่วนแบ่งกำไร',
                                            min: { value: 0, message: 'ห้ามต่ำกว่า 0%' },
                                            max: { value: 100, message: 'ห้ามเกิน 100%' }
                                        })} 
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 ${employeeForm.formState.errors.profitSharePct ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
                                        placeholder="เช่น 10" 
                                    />
                                    {employeeForm.formState.errors.profitSharePct && <p className="text-red-500 text-[10px] mt-1 font-medium">{employeeForm.formState.errors.profitSharePct.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>เบอร์โทรศัพท์</label>
                                    <input {...employeeForm.register('phone')} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" placeholder="08x-xxx-xxxx" />
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>เลขบัญชีธนาคาร</label>
                                    <input {...employeeForm.register('bankAccount')} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" placeholder="xxx-x-xxxxx-x" />
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>ชื่อธนาคาร</label>
                                    <input {...employeeForm.register('bankName')} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" placeholder="กสิกรไทย / ไทยพาณิชย์" />
                                </div>
                                <div className="lg:col-span-3 flex justify-end space-x-2 pt-2">
                                    <button type="button" onClick={() => { setShowEmployeeForm(false); setEditingEmployee(null); employeeForm.reset(); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                                    <button type="submit" disabled={saving} className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center space-x-2 ${editingEmployee ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                        <Save size={18} />
                                        <span>{editingEmployee ? 'บันทึกการแก้ไข' : 'บันทึกลูกจ้าง'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 font-medium text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left">ลูกจ้าง</th>
                                    <th className="px-6 py-4 text-left">ในสังกัด</th>
                                    <th className="px-6 py-4 text-center">ส่วนแบ่ง</th>
                                    <th className="px-6 py-4 text-left">ติดต่อ/บัญชีธนาคาร</th>
                                    <th className="px-6 py-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {employees
                                    .filter(e => 
                                        e.name?.toLowerCase().includes(employeeSearch.toLowerCase()) || 
                                        e.phone?.includes(employeeSearch) ||
                                        farmers.find(f => f.id === e.farmerId)?.name?.toLowerCase().includes(employeeSearch.toLowerCase())
                                    )
                                    .map(e => (
                                    <tr key={e.id} className={`hover:bg-blue-50/30 transition-colors ${editingEmployee?.id === e.id ? 'bg-amber-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{e.name}</div>
                                            <div className="text-[11px] text-gray-400">ID: {e.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs border border-gray-200">
                                                <Leaf size={12} className="mr-1 text-rubber-500" />
                                                {farmers.find(f => f.id === e.farmerId)?.name || <span className="text-red-400 italic">ไม่ระบุ</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-black rounded-lg border border-blue-100">
                                                {e.profitSharePct}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col space-y-0.5">
                                                <div className="flex items-center text-gray-600 font-mono"><Phone size={12} className="mr-1" /> {e.phone || '-'}</div>
                                                <div className="flex items-center text-gray-900 font-mono text-[11px]"><Database size={12} className="mr-1 text-gray-400" /> {e.bankAccount || '-'} {e.bankName ? `(${e.bankName})` : ''}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center space-x-1">
                                                <button
                                                    onClick={() => handleEditEmployee(e)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRecord('employees', e.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {employees.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                            <UserCircle size={40} className="mb-2 opacity-20 mx-auto" />
                                            ยังไม่มีข้อมูลลูกจ้างในระบบ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* ===================== MEMBER TYPES TAB ===================== */}
            {activeSubTab === 'member_types' && (
                <section className="animate-in fade-in duration-300">
                    <div className="flex justify-end items-center mb-6">
                        {!showMemberTypeForm && (
                            <button
                                onClick={() => {
                                    setEditingMemberType(null);
                                    setMtFormData({ name: '', bonus: '0' });
                                    setShowMemberTypeForm(true);
                                }}
                                className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition shadow-sm font-medium"
                            >
                                <Plus size={18} className="mr-1" />
                                เพิ่มประเภทสมาชิก
                            </button>
                        )}
                    </div>

                    {showMemberTypeForm && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 shadow-inner">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-amber-700 uppercase tracking-widest">ชื่อประเภทสมาชิก <span className="text-red-500">*</span></label>
                                    <input 
                                        value={mtFormData.name}
                                        onChange={e => setMtFormData({...mtFormData, name: e.target.value})}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-amber-500 font-bold" 
                                        placeholder="เช่น VIP / สมาชิกประจำ" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-amber-700 uppercase tracking-widest">โบนัสบวกเพิ่ม (บาท/กก.)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={mtFormData.bonus}
                                            onChange={e => setMtFormData({...mtFormData, bonus: e.target.value})}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-amber-500 font-mono font-bold" 
                                            placeholder="0.0" 
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end space-x-2">
                                    <button 
                                        onClick={handleMemberTypeSubmit}
                                        disabled={saving}
                                        className="flex-1 bg-amber-600 text-white font-bold py-2 rounded-xl hover:bg-amber-700 transition shadow-lg shadow-amber-200"
                                    >
                                        {editingMemberType ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มประเภท'}
                                    </button>
                                    <button 
                                        onClick={() => setShowMemberTypeForm(false)}
                                        className="px-4 py-2 text-amber-600 font-bold hover:bg-amber-100 rounded-xl transition"
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 font-black text-gray-400 text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-8 py-5 text-left">ประเภทสมาชิก</th>
                                    <th className="px-8 py-5 text-center">โบนัส (บาท/กก.)</th>
                                    <th className="px-8 py-5 text-center">จำนวนสมาชิก</th>
                                    <th className="px-8 py-5 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {memberTypes.map(mt => (
                                    <tr key={mt.id} className="hover:bg-amber-50/20 transition-all group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                                    <Percent size={16} />
                                                </div>
                                                <div className="font-bold text-gray-900">{mt.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center font-mono font-bold text-amber-700">
                                            +{Number(mt.bonus || 0).toFixed(2)}
                                        </td>
                                        <td className="px-8 py-5 text-center text-xs text-gray-500">
                                            {farmers.filter(f => f.memberTypeId === mt.id).length} คน
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end space-x-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingMemberType(mt);
                                                        setMtFormData({ name: mt.name, bonus: mt.bonus });
                                                        setShowMemberTypeForm(true);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!window.confirm(`ยืนยันการลบประเภท "${mt.name}"?`)) return;
                                                        const res = await deleteMemberTypeAPI(mt.id);
                                                        if (res.status === 'success') loadData();
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
            </div>
            {/* End no-print wrapper */}

            {/* A4 Printable View (Visible only during window.print()) */}
            <div className="hidden print:block text-black p-4 font-sans bg-white">
                <ReportPrintHeader 
                    settings={settings}
                    title={
                        activityFilter === 'custom_days' 
                            ? `รายงานสรุปเกษตรกรที่ไม่ได้มาขายน้ำยางเกิน ${customDaysThreshold} วัน`
                            : activityFilter === 'inactive_30'
                            ? 'รายงานสรุปเกษตรกรที่ขาดการติดต่อ 31 - 60 วัน'
                            : activityFilter === 'inactive_60'
                            ? 'รายงานสรุปเกษตรกรที่ขาดการติดต่อนานเกิน 60 วัน'
                            : activityFilter === 'never'
                            ? 'รายงานสรุปเกษตรกรที่ยังไม่เคยมีประวัติขาย'
                            : activityFilter === 'active'
                            ? 'รายงานสรุปเกษตรกรที่มาขายปกติ (≤30 วัน)'
                            : 'รายงานสรุปรายชื่อเกษตรกรทั้งหมด'
                    }
                    subtitle={`ข้อมูล ณ วันที่ ${format(new Date(), 'd MMMM yyyy', { locale: th })} | พบทั้งหมด ${filteredFarmers.length} คน จากเกษตรกรในระบบ ${farmers.length} คน`}
                />

                {/* Summary Info Cards */}
                <div className="grid grid-cols-4 gap-2 mb-4 p-3 border border-black rounded bg-gray-50 text-center text-xs">
                    <div>
                        <span className="block text-[10px] font-bold text-gray-600">มาขายปกติ (≤30 วัน)</span>
                        <span className="text-sm font-bold">{activityStats.active} คน</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-600">ขาดติดต่อ (31-60 วัน)</span>
                        <span className="text-sm font-bold">{activityStats.inactive30} คน</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-600">ขาดติดต่อนาน (&gt;60 วัน)</span>
                        <span className="text-sm font-bold">{activityStats.inactive60} คน</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-600">ยังไม่เคยขาย</span>
                        <span className="text-sm font-bold">{activityStats.never} คน</span>
                    </div>
                </div>

                {/* Details Table */}
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black">
                            <th className="border border-black p-1.5 text-center w-10">ลำดับ</th>
                            <th className="border border-black p-1.5 text-left">ชื่อ-นามสกุล (รหัส)</th>
                            <th className="border border-black p-1.5 text-left">เบอร์โทรศัพท์</th>
                            <th className="border border-black p-1.5 text-left">ประวัติการขายล่าสุด</th>
                            <th className="border border-black p-1.5 text-center">สถานะกิจกรรม</th>
                            <th className="border border-black p-1.5 text-left">ที่อยู่</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFarmers.map((f, idx) => {
                            const act = farmerActivityMap[f.id];
                            return (
                                <tr key={f.id} className="border-b border-gray-300">
                                    <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                                    <td className="border border-black p-1.5 font-bold">
                                        {f.name} <span className="font-normal text-[10px] text-gray-500">({f.id})</span>
                                    </td>
                                    <td className="border border-black p-1.5 font-mono">{f.phone || '-'}</td>
                                    <td className="border border-black p-1.5">
                                        {act && act.lastDate ? (
                                            `${format(act.lastDate, 'd MMM yyyy', { locale: th })} (${act.count} รายการ)`
                                        ) : (
                                            'ยังไม่มีประวัติ'
                                        )}
                                    </td>
                                    <td className="border border-black p-1.5 text-center font-bold">
                                        {act && act.daysAgo !== null ? (
                                            act.daysAgo === 0 ? 'วันนี้' : `${act.daysAgo} วันที่แล้ว`
                                        ) : (
                                            'ยังไม่เคยขาย'
                                        )}
                                    </td>
                                    <td className="border border-black p-1.5">{f.address || '-'}</td>
                                </tr>
                            );
                        })}
                        {filteredFarmers.length === 0 && (
                            <tr>
                                <td colSpan="6" className="border border-black p-4 text-center text-gray-500">
                                    ไม่พบข้อมูลเกษตรกรในเงื่อนไขที่เลือก
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Print Footer / Signatures */}
                <div className="mt-8 flex justify-between items-end text-xs pt-4 border-t border-gray-300">
                    <div>
                        <p>ผู้ออกรายงาน: ....................................................</p>
                        <p className="mt-1">วันที่พิมพ์: {format(new Date(), 'dd/MM/yyyy HH:mm')} น.</p>
                    </div>
                    <div className="text-center">
                        <p>ลงชื่อ ....................................................</p>
                        <p className="mt-1">( ผู้รับผิดชอบ/เจ้าหน้าที่ )</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
