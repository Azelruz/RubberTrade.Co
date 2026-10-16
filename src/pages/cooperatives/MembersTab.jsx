import React, { useState, useMemo } from 'react';
import { 
    Users, Search, UserPlus, Link2, Edit3, Trash2, CheckCircle2, 
    X, Phone, CreditCard, Shield, Award, AlertCircle, QrCode, UserCheck 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MemberQRModal } from './MemberQRModal';

export const MembersTab = ({ 
    members = [], 
    farmers = [], 
    employees = [],
    accounts = [],
    settings = {},
    onSaveMember, 
    onDeleteMember, 
    loading = false 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [positionFilter, setPositionFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'farmer', 'employee', 'external', 'savings', 'shares', 'board'

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [memberMode, setMemberMode] = useState('from_farmer'); // 'from_farmer', 'from_employee', or 'external'
    const [qrMember, setQrMember] = useState(null);

    // Form states
    const [farmerSearch, setFarmerSearch] = useState('');
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [memberNo, setMemberNo] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [idCard, setIdCard] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [bankName, setBankName] = useState('');
    const [address, setAddress] = useState('');
    const [orgPosition, setOrgPosition] = useState('member');
    const [positionAllowance, setPositionAllowance] = useState('0');
    const [initialShares, setInitialShares] = useState('10');
    const [pricePerShare, setPricePerShare] = useState('100');
    const [joinedDate, setJoinedDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('active');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const positionOptions = [
        { value: 'member', label: 'สมาชิกทั่วไป (Member)' },
        { value: 'chairman', label: 'ประธานกลุ่ม (Chairman)' },
        { value: 'vice_chairman', label: 'รองประธาน (Vice Chairman)' },
        { value: 'treasurer', label: 'เหรัญญิก (Treasurer)' },
        { value: 'secretary', label: 'เลขานุการ (Secretary)' },
        { value: 'procurement', label: 'กก. ฝ่ายรับซื้อ & QC' },
        { value: 'auditor', label: 'กก. ตรวจสอบภายใน' },
        { value: 'advisor', label: 'ที่ปรึกษากลุ่ม (Advisor)' },
    ];

    const openCreateModal = () => {
        setEditingMember(null);
        setMemberMode('from_farmer');
        setSelectedFarmer(null);
        setSelectedEmployee(null);
        setFarmerSearch('');
        setEmployeeSearch('');
        
        // Auto generate next member No with station code
        const stationCode = settings?.station_code ? settings.station_code.trim().toUpperCase() : '';
        const prefix = stationCode ? `${stationCode}-MB` : 'MB';
        const nextNum = members.length + 1;
        setMemberNo(`${prefix}-${String(nextNum).padStart(3, '0')}`);
        
        setName('');
        setPhone('');
        setIdCard('');
        setBankAccount('');
        setBankName('');
        setAddress('');
        setOrgPosition('member');
        setPositionAllowance('0');
        setInitialShares('10');
        setPricePerShare('100');
        setJoinedDate(new Date().toISOString().split('T')[0]);
        setStatus('active');
        setShowModal(true);
    };

    const openEditModal = (member) => {
        setEditingMember(member);
        const isFarmer = Boolean(member.farmerId && farmers.some(f => f.id === member.farmerId));
        const matchedEmp = (employees || []).find(e => (e.phone && e.phone === member.phone) || e.name === member.name);
        setMemberMode(isFarmer ? 'from_farmer' : matchedEmp ? 'from_employee' : 'external');
        setSelectedFarmer(farmers.find(f => f.id === member.farmerId) || null);
        setSelectedEmployee(matchedEmp || null);
        setFarmerSearch('');
        setEmployeeSearch('');
        setMemberNo(member.memberNo || '');
        setName(member.name || '');
        setPhone(member.phone || '');
        setIdCard(member.idCard || '');
        setBankAccount(member.bankAccount || '');
        setBankName(member.bankName || '');
        setAddress(member.address || '');
        setOrgPosition(member.orgPosition || 'member');
        setPositionAllowance(String(member.positionAllowance || 0));
        setInitialShares(String(member.totalShares || 0));
        setPricePerShare('100');
        setJoinedDate(member.joinedDate || new Date().toISOString().split('T')[0]);
        setStatus(member.status || 'active');
        setShowModal(true);
    };

    // Filtered Farmers (exclude farmers already in coop members when creating new)
    const availableFarmers = useMemo(() => {
        const existingFarmerIds = new Set(members.map(m => m.farmerId).filter(Boolean));
        return farmers.filter(f => {
            if (!editingMember && existingFarmerIds.has(f.id)) return false;
            if (!farmerSearch) return true;
            return (f.name || '').toLowerCase().includes(farmerSearch.toLowerCase()) || 
                   (f.phone || '').includes(farmerSearch);
        });
    }, [farmers, members, editingMember, farmerSearch]);

    // Filtered Employees (exclude employees already in coop members when creating new)
    const availableEmployees = useMemo(() => {
        const existingMemberPhones = new Set(members.map(m => m.phone).filter(Boolean));
        const existingMemberNames = new Set(members.map(m => m.name).filter(Boolean));
        return (employees || []).filter(e => {
            if (!editingMember && (existingMemberPhones.has(e.phone) || existingMemberNames.has(e.name))) return false;
            if (!employeeSearch) return true;
            return (e.name || '').toLowerCase().includes(employeeSearch.toLowerCase()) || 
                   (e.phone || '').includes(employeeSearch) ||
                   (e.id || '').toLowerCase().includes(employeeSearch.toLowerCase());
        });
    }, [employees, members, editingMember, employeeSearch]);

    const handleSelectFarmer = (farmer) => {
        setSelectedFarmer(farmer);
        setSelectedEmployee(null);
        setName(farmer.name || '');
        setPhone(farmer.phone || '');
        setBankAccount(farmer.bankAccount || '');
        setBankName(farmer.bankName || '');
        setAddress(farmer.address || '');
        setFarmerSearch('');
    };

    const handleSelectEmployee = (emp) => {
        setSelectedEmployee(emp);
        setSelectedFarmer(null);
        setName(emp.name || '');
        setPhone(emp.phone || '');
        setBankAccount(emp.bankAccount || '');
        setBankName(emp.bankName || '');
        setAddress('');
        setOrgPosition('member');
        setEmployeeSearch('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return toast.error('กรุณาระบุชื่อสมาชิก');

        setIsSubmitting(true);
        try {
            const shares = parseInt(initialShares) || 0;
            const pps = Number(pricePerShare) || 100;
            const payload = {
                id: editingMember?.id || undefined,
                memberNo,
                farmerId: selectedFarmer?.id || selectedEmployee?.farmerId || editingMember?.farmerId || null,
                name: name.trim(),
                phone: phone.trim(),
                idCard: idCard.trim(),
                bankAccount: bankAccount.trim(),
                bankName: bankName.trim(),
                address: address.trim(),
                orgPosition,
                positionAllowance: Number(positionAllowance) || 0,
                totalShares: shares,
                shareValue: shares * pps,
                status,
                joinedDate
            };

            await onSaveMember(payload);
            toast.success(editingMember ? 'อัปเดตข้อมูลสมาชิกสำเร็จ' : 'เพิ่มสมาชิกกลุ่มสำเร็จ');
            setShowModal(false);
        } catch (err) {
            toast.error('บันทึกล้มเหลว: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter members
    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            const matchSearch = (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (m.memberNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (m.phone || '').includes(searchTerm);
            const matchStatus = statusFilter === 'all' || m.status === statusFilter;
            const matchPosition = positionFilter === 'all' || m.orgPosition === positionFilter;

            let matchCategory = true;
            if (categoryFilter === 'farmer') matchCategory = Boolean(m.farmerId);
            else if (categoryFilter === 'employee') matchCategory = (employees || []).some(e => (e.phone && e.phone === m.phone) || e.name === m.name);
            else if (categoryFilter === 'external') matchCategory = !m.farmerId && !(employees || []).some(e => (e.phone && e.phone === m.phone) || e.name === m.name);
            else if (categoryFilter === 'savings') matchCategory = Number(m.savingsBalance || 0) > 0;
            else if (categoryFilter === 'shares') matchCategory = Number(m.totalShares || 0) > 0;
            else if (categoryFilter === 'board') matchCategory = m.orgPosition && m.orgPosition !== 'member' && m.orgPosition !== 'none';

            return matchSearch && matchStatus && matchPosition && matchCategory;
        });
    }, [members, searchTerm, statusFilter, positionFilter, categoryFilter, employees]);

    // Counts by category
    const stats = useMemo(() => {
        const empCount = members.filter(m => (employees || []).some(e => (e.phone && e.phone === m.phone) || e.name === m.name)).length;
        return {
            all: members.length,
            farmer: members.filter(m => m.farmerId).length,
            employee: empCount,
            external: members.filter(m => !m.farmerId && !(employees || []).some(e => (e.phone && e.phone === m.phone) || e.name === m.name)).length,
            savings: members.filter(m => Number(m.savingsBalance || 0) > 0).length,
            shares: members.filter(m => Number(m.totalShares || 0) > 0).length,
            board: members.filter(m => m.orgPosition && m.orgPosition !== 'member' && m.orgPosition !== 'none').length,
        };
    }, [members, employees]);

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Action Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
                <div className="flex items-center space-x-2 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:w-72">
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, รหัส, เบอร์โทร..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>

                    {/* Position Filter */}
                    <select
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="all">ทุกตำแหน่ง</option>
                        {positionOptions.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                    <span className="text-xs font-bold text-gray-500 mr-2">
                        แสดง {filteredMembers.length} / {members.length} คน
                    </span>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center shadow-md shadow-emerald-200"
                    >
                        <UserPlus size={16} className="mr-1.5" />
                        เพิ่มสมาชิกกลุ่ม
                    </button>
                </div>
            </div>

            {/* Category Quick Filter Pills Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-2.5 shadow-sm flex items-center space-x-1.5 overflow-x-auto text-xs">
                <span className="text-[11px] font-bold text-gray-400 pl-2 pr-1 uppercase tracking-wider flex-shrink-0">
                    แยกประเภท:
                </span>
                {[
                    { id: 'all', label: 'ทั้งหมด', count: stats.all },
                    { id: 'farmer', label: '🌱 เกษตรกรในระบบ', count: stats.farmer },
                    { id: 'employee', label: '🔪 คนกรีดยาง', count: stats.employee },
                    { id: 'external', label: '💼 หุ้นส่วนภายนอก', count: stats.external },
                    { id: 'savings', label: '💰 สมาชิกเงินฝาก', count: stats.savings },
                    { id: 'shares', label: '📈 สมาชิกถือหุ้น', count: stats.shares },
                    { id: 'board', label: '👑 คณะกรรมการ', count: stats.board }
                ].map(cat => {
                    const isActive = categoryFilter === cat.id;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryFilter(cat.id)}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                                isActive 
                                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-100'
                            }`}
                        >
                            <span>{cat.label}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                                isActive ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-700'
                            }`}>
                                {cat.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Members Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="py-3 px-4">รหัส</th>
                                <th className="py-3 px-4">ชื่อ-สกุล</th>
                                <th className="py-3 px-4">ความเชื่อมโยง</th>
                                <th className="py-3 px-4">ตำแหน่ง</th>
                                <th className="py-3 px-4 text-right">จำนวนหุ้น</th>
                                <th className="py-3 px-4 text-right">มูลค่าหุ้น (บ.)</th>
                                <th className="py-3 px-4 text-right">เงินฝากคงเหลือ (บ.)</th>
                                <th className="py-3 px-4">เบอร์โทร/บัญชี</th>
                                <th className="py-3 px-4 text-center">สถานะ</th>
                                <th className="py-3 px-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-gray-400">
                                        ไม่พบข้อมูลสมาชิกตามเงื่อนไขที่เลือก
                                    </td>
                                </tr>
                            ) : (
                                filteredMembers.map(member => {
                                    const isBoard = member.orgPosition && member.orgPosition !== 'member' && member.orgPosition !== 'none';

                                    return (
                                        <tr key={member.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-gray-900">
                                                {member.memberNo}
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-bold text-gray-900">{member.name}</p>
                                                {member.idCard && (
                                                    <p className="text-[10px] text-gray-400 font-mono">ปชช: {member.idCard}</p>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {member.farmerId ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <Link2 size={11} className="mr-1" />
                                                        เกษตรกรในระบบ
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                        หุ้นส่วนภายนอก
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                                                    isBoard ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {positionOptions.find(p => p.value === member.orgPosition)?.label.split(' ')[0] || member.orgPosition}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                                                {Number(member.totalShares || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                                                {Number(member.shareValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-teal-700">
                                                {Number(member.savingsBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                <p className="font-mono">{member.phone || '-'}</p>
                                                {member.bankAccount && (
                                                    <p className="text-[10px] text-gray-400">{member.bankName} {member.bankAccount}</p>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    member.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {member.status === 'active' ? 'ปกติ' : 'ลาออก'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQrMember(member)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="QR Code บัตรสมาชิก & สมุดเงินฝากดิจิทัล"
                                                    >
                                                        <QrCode size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(member)}
                                                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (window.confirm(`ยืนยันลบสมาชิก ${member.name}?`)) {
                                                                onDeleteMember(member.id);
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Link / Add Member Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-8 border border-gray-100">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-base font-black text-gray-900">
                                {editingMember ? 'แก้ไขข้อมูลสมาชิกกลุ่ม' : 'ลงทะเบียนสมาชิกกลุ่ม / ผู้ถือหุ้น'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                            {/* Mode Selector for New Member */}
                            {!editingMember && (
                                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 rounded-xl mb-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMemberMode('from_farmer');
                                            setSelectedFarmer(null);
                                            setSelectedEmployee(null);
                                        }}
                                        className={`py-2 rounded-lg font-bold flex items-center justify-center transition-all ${
                                            memberMode === 'from_farmer' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'
                                        }`}
                                    >
                                        <Link2 size={14} className="mr-1.5" />
                                        ดึงจากเกษตรกร
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMemberMode('from_employee');
                                            setSelectedFarmer(null);
                                            setSelectedEmployee(null);
                                        }}
                                        className={`py-2 rounded-lg font-bold flex items-center justify-center transition-all ${
                                            memberMode === 'from_employee' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
                                        }`}
                                    >
                                        <UserCheck size={14} className="mr-1.5" />
                                        ดึงจากคนกรีดยาง
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMemberMode('external');
                                            setSelectedFarmer(null);
                                            setSelectedEmployee(null);
                                            setName('');
                                        }}
                                        className={`py-2 rounded-lg font-bold flex items-center justify-center transition-all ${
                                            memberMode === 'external' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'
                                        }`}
                                    >
                                        <Users size={14} className="mr-1.5" />
                                        หุ้นส่วนภายนอก
                                    </button>
                                </div>
                            )}

                            {/* Farmer Autocomplete Picker */}
                            {memberMode === 'from_farmer' && !editingMember && (
                                <div className="space-y-1.5 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200">
                                    <label className="block text-xs font-black text-emerald-900">
                                        ค้นหาเกษตรกรเพื่อดึงข้อมูลอัตโนมัติ:
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="พิมพ์ชื่อหรือเบอร์โทรเกษตรกร..."
                                            value={farmerSearch}
                                            onChange={(e) => setFarmerSearch(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                                        />
                                        {farmerSearch && (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-gray-50">
                                                {availableFarmers.slice(0, 10).map(f => (
                                                    <div 
                                                        key={f.id}
                                                        onClick={() => handleSelectFarmer(f)}
                                                        className="p-2.5 hover:bg-emerald-50 cursor-pointer flex justify-between items-center"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-gray-900">{f.name}</p>
                                                            <p className="text-[10px] text-gray-400">{f.phone || 'ไม่มีเบอร์'} | {f.bankName || 'ไม่มีธนาคาร'}</p>
                                                        </div>
                                                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                                            เลือก
                                                        </span>
                                                    </div>
                                                ))}
                                                {availableFarmers.length === 0 && (
                                                    <div className="p-3 text-center text-gray-400">ไม่พบรายชื่อเกษตรกร</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {selectedFarmer && (
                                        <div className="mt-2 flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-emerald-200 text-emerald-900 font-bold">
                                            <span>ผูกกับเกษตรกร: {selectedFarmer.name}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => setSelectedFarmer(null)}
                                                className="text-red-500 hover:underline text-[10px]"
                                            >
                                                เปลี่ยน
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Employee (Rubber Tapper) Autocomplete Picker */}
                            {memberMode === 'from_employee' && !editingMember && (
                                <div className="space-y-1.5 bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200">
                                    <label className="block text-xs font-black text-blue-900">
                                        ค้นหาคนกรีดยางเพื่อดึงข้อมูลอัตโนมัติ:
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="พิมพ์ชื่อ, เบอร์โทร หรือรหัสคนกรีด..."
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                                        />
                                        {employeeSearch && (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-gray-50">
                                                {availableEmployees.slice(0, 10).map(emp => (
                                                    <div 
                                                        key={emp.id}
                                                        onClick={() => handleSelectEmployee(emp)}
                                                        className="p-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-gray-900">{emp.name}</p>
                                                            <p className="text-[10px] text-gray-400">
                                                                {emp.id} | {emp.phone || 'ไม่มีเบอร์'} | ส่วนแบ่ง {emp.profitSharePct || 0}%
                                                            </p>
                                                        </div>
                                                        <span className="text-[10px] text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full">
                                                            เลือก
                                                        </span>
                                                    </div>
                                                ))}
                                                {availableEmployees.length === 0 && (
                                                    <div className="p-3 text-center text-gray-400">ไม่พบรายชื่อคนกรีดยาง</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {selectedEmployee && (
                                        <div className="mt-2 flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-blue-200 text-blue-900 font-bold">
                                            <span>ผูกกับคนกรีดยาง: {selectedEmployee.name} ({selectedEmployee.id})</span>
                                            <button 
                                                type="button" 
                                                onClick={() => setSelectedEmployee(null)}
                                                className="text-red-500 hover:underline text-[10px]"
                                            >
                                                เปลี่ยน
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Member Details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">รหัสสมาชิก (Member No.) *</label>
                                    <input
                                        type="text"
                                        value={memberNo}
                                        onChange={(e) => setMemberNo(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">วันที่เข้าเป็นสมาชิก</label>
                                    <input
                                        type="date"
                                        value={joinedDate}
                                        onChange={(e) => setJoinedDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">เลขบัตรประชาชน (ปชช.)</label>
                                    <input
                                        type="text"
                                        value={idCard}
                                        onChange={(e) => setIdCard(e.target.value)}
                                        placeholder="13 หลัก"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">ตำแหน่งในองค์กร</label>
                                    <select
                                        value={orgPosition}
                                        onChange={(e) => setOrgPosition(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold"
                                    >
                                        {positionOptions.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Allowance & Bank */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">ธนาคาร</label>
                                    <input
                                        type="text"
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        placeholder="เช่น กสิกรไทย, ธ.ก.ส."
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">เลขที่บัญชี</label>
                                    <input
                                        type="text"
                                        value={bankAccount}
                                        onChange={(e) => setBankAccount(e.target.value)}
                                        placeholder="เลขบัญชีรับเงินโอน"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono"
                                    />
                                </div>
                            </div>

                            {/* Initial Shares (Only when creating) */}
                            {!editingMember && (
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block font-bold text-amber-900 mb-1">จำนวนหุ้นแรกเข้า (หุ้น)</label>
                                        <input
                                            type="number"
                                            value={initialShares}
                                            onChange={(e) => setInitialShares(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-amber-900 mb-1">มูลค่าต่อหุ้น (บาท)</label>
                                        <input
                                            type="number"
                                            value={pricePerShare}
                                            onChange={(e) => setPricePerShare(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="pt-3 border-t flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-200"
                                >
                                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกสมาชิก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Member QR & Digital Passbook Modal */}
            {qrMember && (
                <MemberQRModal
                    member={qrMember}
                    accounts={accounts}
                    settings={settings}
                    onClose={() => setQrMember(null)}
                />
            )}
        </div>
    );
};
