import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Leaf, UserCircle, Percent, Link2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import { db } from '../../services/db';
import { 
    fetchFarmers, 
    fetchEmployees, 
    fetchFarmerEmployees,
    saveFarmerEmployeeLink,
    deleteFarmerEmployeeLink,
    fetchMemberTypes, 
    fetchBuyRecords,
    getSettings,
    addFarmer, 
    addEmployee, 
    deleteRecord,
    updateRecord,
    addMemberType as addMemberTypeAPI
} from '../../services/apiService';

import { FarmerManagementTab } from './user-management/FarmerManagementTab';
import { EmployeeManagementTab } from './user-management/EmployeeManagementTab';
import { MemberTypeManagementTab } from './user-management/MemberTypeManagementTab';
import { FarmerEmployeeAssignmentsTab } from './user-management/FarmerEmployeeAssignmentsTab';
import { FarmerEmployeeLinkModal } from './user-management/FarmerEmployeeLinkModal';

export const UserManagement = () => {
    const location = useLocation();
    const [activeSubTab, setActiveSubTab] = useState('farmers');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Lists
    const [farmers, setFarmers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [farmerEmployees, setFarmerEmployees] = useState([]);
    const [memberTypes, setMemberTypes] = useState([]);
    const [buys, setBuys] = useState([]);
    const [settings, setSettings] = useState({});

    // Activity Filter State
    const [activityFilter, setActivityFilter] = useState(location.state?.activityFilter || 'all');
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

    // Link Modal States
    const [linkingEmployee, setLinkingEmployee] = useState(null);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkFarmerId, setLinkFarmerId] = useState('');
    const [linkPct, setLinkPct] = useState('50');
    const [linkIsDefault, setLinkIsDefault] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);

    // Expandable Sub-row States
    const [expandedFarmerIds, setExpandedFarmerIds] = useState({});
    const [expandedEmployeeIds, setExpandedEmployeeIds] = useState({});
    const [assignmentSearch, setAssignmentSearch] = useState('');
    const [farmerSearch, setFarmerSearch] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');

    const toggleFarmerExpand = (id) => {
        setExpandedFarmerIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleEmployeeExpand = (id) => {
        setExpandedEmployeeIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

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
            try {
                const localBuys = await db.buys.toArray();
                if (localBuys && localBuys.length > 0) setBuys(localBuys);
            } catch (e) { console.error(e); }

            const [fRes, eRes, feRes, mtRes, bRes, sRes] = await Promise.all([
                fetchFarmers(true),
                fetchEmployees(),
                fetchFarmerEmployees(),
                fetchMemberTypes(),
                fetchBuyRecords(),
                getSettings()
            ]);
            setFarmers(Array.isArray(fRes) ? fRes : []);
            setEmployees(Array.isArray(eRes) ? eRes : []);
            setFarmerEmployees(Array.isArray(feRes) ? feRes : []);
            setMemberTypes(Array.isArray(mtRes) ? mtRes : []);
            if (Array.isArray(bRes)) setBuys(bRes);
            if (sRes && sRes.status === 'success' && sRes.data) setSettings(sRes.data);
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLink = async () => {
        if (!linkingEmployee || !linkFarmerId) return toast.error('กรุณาเลือกเกษตรกร');
        setSaving(true);
        try {
            await saveFarmerEmployeeLink({
                farmerId: linkFarmerId,
                employeeId: linkingEmployee.id,
                profitSharePct: Number(linkPct || 50),
                isDefault: linkIsDefault ? 1 : 0
            });
            toast.success(`ผูกสวนยางให้ ${linkingEmployee.name} สำเร็จ`);
            setShowLinkModal(false);
            setLinkingEmployee(null);
            setLinkFarmerId('');
            loadData();
        } catch (e) {
            toast.error('ผูกสวนล้มเหลว: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

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
            realName: farmer.realName || '',
            idCard: farmer.idCard || '',
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

    const onSubmitEmployee = async (data) => {
        setSaving(true);
        try {
            let res;
            if (editingEmployee) {
                res = await updateRecord('employees', editingEmployee.id, data);
                if (data.farmerId) {
                    await saveFarmerEmployeeLink({
                        farmerId: data.farmerId,
                        employeeId: editingEmployee.id,
                        profitSharePct: data.profitSharePct,
                        isDefault: 1
                    });
                }
            } else {
                res = await addEmployee(data);
                if (res && res.id && data.farmerId) {
                    await saveFarmerEmployeeLink({
                        farmerId: data.farmerId,
                        employeeId: res.id,
                        profitSharePct: data.profitSharePct,
                        isDefault: 1
                    });
                }
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

    const farmerActivityMap = useMemo(() => {
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

        const result = {};
        farmers.forEach(f => {
            const entry = map[f.id] || map[f.name];
            const localDate = entry?.lastDate || null;
            const apiDate = f.lastBuyDate ? new Date(f.lastBuyDate) : null;

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

    const activityStats = useMemo(() => {
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

    const filteredFarmers = useMemo(() => {
        return farmers.filter(f => {
            const matchesSearch = f.name?.toLowerCase().includes(farmerSearch.toLowerCase()) || 
                f.realName?.toLowerCase().includes(farmerSearch.toLowerCase()) || 
                f.idCard?.includes(farmerSearch) ||
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

    const filteredAssignments = useMemo(() => {
        return farmerEmployees.filter(fe => {
            if (!assignmentSearch) return true;
            const search = assignmentSearch.toLowerCase();
            const farmerName = fe.farmerName || farmers.find(f => f.id === fe.farmerId)?.name || '';
            const employeeName = fe.employeeName || employees.find(e => e.id === fe.employeeId)?.name || '';
            return farmerName.toLowerCase().includes(search) ||
                   employeeName.toLowerCase().includes(search) ||
                   String(fe.farmerId).toLowerCase().includes(search) ||
                   String(fe.employeeId).toLowerCase().includes(search);
        });
    }, [farmerEmployees, assignmentSearch, farmers, employees]);

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
                {/* Sub-Tabs Navigation */}
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
                    <button
                        onClick={() => setActiveSubTab('assignments')}
                        className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
                            activeSubTab === 'assignments'
                                ? 'bg-white text-emerald-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Link2 size={16} />
                        <span>ผูกคนกรีด-สวน</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeSubTab === 'assignments' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                            {farmerEmployees.length}
                        </span>
                    </button>
                </div>

                {/* Sub-Tabs Content */}
                {activeSubTab === 'farmers' && (
                    <FarmerManagementTab
                        farmers={farmers}
                        employees={employees}
                        farmerEmployees={farmerEmployees}
                        memberTypes={memberTypes}
                        activityFilter={activityFilter}
                        setActivityFilter={setActivityFilter}
                        customDaysThreshold={customDaysThreshold}
                        setCustomDaysThreshold={setCustomDaysThreshold}
                        farmerSearch={farmerSearch}
                        setFarmerSearch={setFarmerSearch}
                        loading={loading}
                        saving={saving}
                        showFarmerForm={showFarmerForm}
                        setShowFarmerForm={setShowFarmerForm}
                        editingFarmer={editingFarmer}
                        setEditingFarmer={setEditingFarmer}
                        farmerForm={farmerForm}
                        onSubmitFarmer={onSubmitFarmer}
                        handleEditFarmer={handleEditFarmer}
                        handleDeleteRecord={handleDeleteRecord}
                        farmerActivityMap={farmerActivityMap}
                        activityStats={activityStats}
                        filteredFarmers={filteredFarmers}
                        expandedFarmerIds={expandedFarmerIds}
                        toggleFarmerExpand={toggleFarmerExpand}
                        loadData={loadData}
                        setLinkingEmployee={setLinkingEmployee}
                        setLinkFarmerId={setLinkFarmerId}
                        setLinkPct={setLinkPct}
                        setLinkIsDefault={setLinkIsDefault}
                        setShowLinkModal={setShowLinkModal}
                        setEditingAssignment={setEditingAssignment}
                        deleteFarmerEmployeeLink={deleteFarmerEmployeeLink}
                    />
                )}

                {activeSubTab === 'employees' && (
                    <EmployeeManagementTab
                        employees={employees}
                        farmers={farmers}
                        farmerEmployees={farmerEmployees}
                        employeeSearch={employeeSearch}
                        setEmployeeSearch={setEmployeeSearch}
                        showEmployeeForm={showEmployeeForm}
                        setShowEmployeeForm={setShowEmployeeForm}
                        editingEmployee={editingEmployee}
                        setEditingEmployee={setEditingEmployee}
                        employeeForm={employeeForm}
                        onSubmitEmployee={onSubmitEmployee}
                        saving={saving}
                        handleEditEmployee={handleEditEmployee}
                        handleDeleteRecord={handleDeleteRecord}
                        toggleEmployeeExpand={toggleEmployeeExpand}
                        expandedEmployeeIds={expandedEmployeeIds}
                        deleteFarmerEmployeeLink={deleteFarmerEmployeeLink}
                        loadData={loadData}
                        setLinkingEmployee={setLinkingEmployee}
                        setShowLinkModal={setShowLinkModal}
                    />
                )}

                {activeSubTab === 'member_types' && (
                    <MemberTypeManagementTab
                        memberTypes={memberTypes}
                        showMemberTypeForm={showMemberTypeForm}
                        setShowMemberTypeForm={setShowMemberTypeForm}
                        editingMemberType={editingMemberType}
                        setEditingMemberType={setEditingMemberType}
                        mtFormData={mtFormData}
                        setMtFormData={setMtFormData}
                        saving={saving}
                        handleMemberTypeSubmit={handleMemberTypeSubmit}
                        handleDeleteRecord={handleDeleteRecord}
                    />
                )}

                {activeSubTab === 'assignments' && (
                    <FarmerEmployeeAssignmentsTab
                        farmerEmployees={farmerEmployees}
                        farmers={farmers}
                        employees={employees}
                        assignmentSearch={assignmentSearch}
                        setAssignmentSearch={setAssignmentSearch}
                        filteredAssignments={filteredAssignments}
                        setEditingAssignment={setEditingAssignment}
                        setLinkingEmployee={setLinkingEmployee}
                        setLinkFarmerId={setLinkFarmerId}
                        setLinkPct={setLinkPct}
                        setLinkIsDefault={setLinkIsDefault}
                        setShowLinkModal={setShowLinkModal}
                        deleteFarmerEmployeeLink={deleteFarmerEmployeeLink}
                        loadData={loadData}
                    />
                )}
            </div>

            {/* Shared Farmer Employee Link Modal */}
            <FarmerEmployeeLinkModal
                showModal={showLinkModal}
                onClose={() => {
                    setShowLinkModal(false);
                    setLinkingEmployee(null);
                    setEditingAssignment(null);
                }}
                linkingEmployee={linkingEmployee}
                linkFarmerId={linkFarmerId}
                setLinkFarmerId={setLinkFarmerId}
                linkPct={linkPct}
                setLinkPct={setLinkPct}
                linkIsDefault={linkIsDefault}
                setLinkIsDefault={setLinkIsDefault}
                editingAssignment={editingAssignment}
                farmers={farmers}
                saving={saving}
                onSaveLink={handleSaveLink}
            />
        </div>
    );
};

export default UserManagement;
