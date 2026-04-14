import React, { useState, useEffect } from 'react';
import { 
    adminFetchPendingRequests, 
    adminActionSubscription, 
    fetchPackages, 
    adminCreatePackage, 
    adminDeletePackage,
    adminFetchAllMembers,
    adminUpdateUserSubscription,
    adminFetchBankSettings,
    adminUpdateBankSettings
} from '../services/apiService';
import { 
    ShieldCheck, Clock, CheckCircle, XCircle, User, DollarSign, 
    Image as ImageIcon, Search, ExternalLink, Plus, Trash2, Package, 
    Users, Edit3, Calendar, Filter, AlertCircle, Building2, Save, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

const AdminSubscriptions = () => {
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'members', 'settings'
    const [requests, setRequests] = useState([]);
    const [members, setMembers] = useState([]);
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [durationValues, setDurationValues] = useState({});
    
    // Bank Settings state
    const [bankDetails, setBankDetails] = useState({
        bank_name: '',
        bank_account: '',
        bank_owner: '',
        promptpay_id: ''
    });
    const [isSavingBank, setIsSavingBank] = useState(false);

    // Member Edit state
    const [editingMember, setEditingMember] = useState(null);
    const [editForm, setEditForm] = useState({ status: '', expiry: '', maxStaffLimit: 1 });
    const [isUpdatingMember, setIsUpdatingMember] = useState(false);

    // Package form state
    const [showPackageForm, setShowPackageForm] = useState(false);
    const [newPkg, setNewPkg] = useState({ name: '', days: '', price: '', maxStaff: 1 });
    const [isEditingPkg, setIsEditingPkg] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pkgRes] = await Promise.all([
                fetchPackages()
            ]);
            if (pkgRes.status === 'success') setPackages(pkgRes.packages);

            if (activeTab === 'pending') {
                const reqRes = await adminFetchPendingRequests();
                if (reqRes.status === 'success') {
                    setRequests(reqRes.requests);
                    const initialDurations = {};
                    reqRes.requests.forEach(r => {
                        if (r.requested_days) initialDurations[r.id] = r.requested_days.toString();
                    });
                    setDurationValues(initialDurations);
                }
            } else if (activeTab === 'members') {
                const memRes = await adminFetchAllMembers();
                if (memRes.status === 'success') {
                    setMembers(memRes.members);
                }
            } else if (activeTab === 'settings') {
                const bankRes = await adminFetchBankSettings();
                if (bankRes.status === 'success') {
                    setBankDetails({
                        bank_name: bankRes.settings?.bank_name || '',
                        bank_account: bankRes.settings?.bank_account || '',
                        bank_owner: bankRes.settings?.bank_owner || '',
                        promptpay_id: bankRes.settings?.promptpay_id || ''
                    });
                }
            }
        } catch (err) {
            toast.error('โหลดข้อมูลผิดพลาด');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBankInfo = async (e) => {
        e.preventDefault();
        setIsSavingBank(true);
        try {
            const res = await adminUpdateBankSettings(bankDetails);
            if (res.status === 'success') {
                toast.success('อัปเดตข้อมูลบัญชีธนาคารเรียบร้อย');
            }
        } catch (err) {
            toast.error('บันทึกไม่สำเร็จ: ' + err.message);
        } finally {
            setIsSavingBank(false);
        }
    };

    const handleAction = async (requestId, action) => {
        if (!window.confirm(`ยืนยันการ ${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'} คำขอนี้?`)) return;

        let days = undefined;
        if (action === 'approve') {
            const selected = durationValues[requestId] || '30';
            if (selected === 'custom') {
                const customStr = window.prompt('ระบุจำนวนวัน (เช่น 15, 45, 90):');
                if (!customStr) return; 
                days = parseInt(customStr, 10);
                if (isNaN(days) || days <= 0) {
                    return toast.error('จำนวนวันไม่ถูกต้อง ยกเลิกการอนุมัติ');
                }
            } else {
                days = parseInt(selected, 10);
            }
        }

        setProcessingId(requestId);
        try {
            const res = await adminActionSubscription(requestId, action, days);
            if (res.status === 'success') {
                toast.success(action === 'approve' ? 'อนุมัติการใช้งานเรียบร้อยแล้ว' : 'ปฏิเสธคำขอเรียบร้อยแล้ว');
                const reqRes = await adminFetchPendingRequests();
                if (reqRes.status === 'success') setRequests(reqRes.requests);
            }
        } catch (err) {
            toast.error('การดำเนินการล้มเหลว: ' + err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleOpenEditMember = (member) => {
        setEditingMember(member);
        setEditForm({
            status: member.subscription_status || 'trial',
            expiry: member.subscription_expiry ? member.subscription_expiry.substring(0, 10) : '',
            maxStaffLimit: member.maxStaffLimit || 1
        });
    };

    const handleUpdateMember = async () => {
        if (!editingMember) return;
        setIsUpdatingMember(true);
        try {
            const res = await adminUpdateUserSubscription(editingMember.id, editForm.status, editForm.expiry, editForm.maxStaffLimit);
            if (res.status === 'success') {
                toast.success('อัปเดตข้อมูลสมาชิกเรียบร้อยแล้ว');
                setEditingMember(null);
                const memRes = await adminFetchAllMembers();
                if (memRes.status === 'success') setMembers(memRes.members);
            }
        } catch (err) {
            toast.error('อัปเดตไม่สำเร็จ: ' + err.message);
        } finally {
            setIsUpdatingMember(false);
        }
    };

    const handleCreatePackage = async (e) => {
        e.preventDefault();
        try {
            const res = await adminCreatePackage(newPkg);
            if (res.status === 'success') {
                toast.success(isEditingPkg ? 'อัปเดตแพ็กเกจเรียบร้อยแล้ว' : 'สร้างแพ็กเกจเรียบร้อยแล้ว');
                setNewPkg({ name: '', days: '', price: '', maxStaff: 1 });
                setShowPackageForm(false);
                setIsEditingPkg(false);
                const pkgRes = await fetchPackages();
                if (pkgRes.status === 'success') setPackages(pkgRes.packages);
            }
        } catch (err) {
            toast.error('การดำเนินการล้มเหลว: ' + err.message);
        }
    };

    const handleEditPackage = (pkg) => {
        setNewPkg({
            id: pkg.id,
            name: pkg.name,
            days: pkg.days,
            price: pkg.price,
            maxStaff: pkg.maxStaff || 1
        });
        setIsEditingPkg(true);
        setShowPackageForm(true);
        // Scroll to form
        window.scrollTo({ top: 300, behavior: 'smooth' });
    };

    const handleCancelPkgEdit = () => {
        setNewPkg({ name: '', days: '', price: '', maxStaff: 1 });
        setIsEditingPkg(false);
        setShowPackageForm(false);
    };

    const handleDeletePackage = async (id) => {
        if (!window.confirm('ยืนยันที่จะลบแพ็กเกจนี้?')) return;
        try {
            const res = await adminDeletePackage(id);
            if (res.status === 'success') {
                toast.success('ลบแพ็กเกจแล้ว');
                const pkgRes = await fetchPackages();
                if (pkgRes.status === 'success') setPackages(pkgRes.packages);
            }
        } catch (err) {
            toast.error('ลบแพ็กเกจไม่สำเร็จ: ' + err.message);
        }
    };

    const filteredRequests = requests.filter(req => 
        req.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        req.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredMembers = members.filter(m => 
        m.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.store_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active': return <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-lg border border-green-100 uppercase">Active</span>;
            case 'trial': return <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100 uppercase">Trial</span>;
            case 'expired': return <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-lg border border-red-100 uppercase">Expired</span>;
            case 'cancelled': return <span className="px-2 py-1 bg-gray-50 text-gray-500 text-[10px] font-black rounded-lg border border-gray-100 uppercase">Cancelled</span>;
            default: return <span className="px-2 py-1 bg-gray-100 text-gray-400 text-[10px] font-black rounded-lg uppercase">Unknown</span>;
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rubber-600"></div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
                        <ShieldCheck className="mr-3 text-rubber-600" size={32} />
                        ศูนย์จัดการสมาชิก (Super Admin)
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">จัดการคำขอ ตรวจสอบสลิป และแก้ไขข้อมูลวันหมดอายุสมาชิก</p>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder={activeTab === 'pending' ? "ค้นหาคำขอ..." : "ค้นหาสมาชิก/ร้านค้า..."}
                        className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl w-full md:w-[350px] shadow-sm focus:ring-2 focus:ring-rubber-500 transition-all outline-none font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-1 bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-[20px] w-fit">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-[14px] text-sm font-black transition-all duration-300 ${
                        activeTab === 'pending'
                            ? 'bg-white text-rubber-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Clock size={18} />
                    <span>คำขออนุมัติใหม่</span>
                    {requests.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-1 animate-pulse">
                            {requests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('members')}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-[14px] text-sm font-black transition-all duration-300 ${
                        activeTab === 'members'
                            ? 'bg-white text-rubber-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Users size={18} />
                    <span>จัดการสมาชิกทั้งหมด</span>
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-[14px] text-sm font-black transition-all duration-300 ${
                        activeTab === 'settings'
                            ? 'bg-white text-rubber-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Settings size={18} />
                    <span>ตั้งค่าการชำระเงิน</span>
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'pending' ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Package Management Section (Inside Pending Tab to keep view clean) */}
                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-gray-800 flex items-center">
                                <Package className="mr-3 text-rubber-500" size={24} />
                                จัดการแพ็กเกจสมาชิก
                            </h2>
                            <button 
                                onClick={() => {
                                    if(showPackageForm && isEditingPkg) {
                                        handleCancelPkgEdit();
                                    } else {
                                        setShowPackageForm(!showPackageForm);
                                        if(!showPackageForm) setIsEditingPkg(false);
                                    }
                                }}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition-colors ${
                                    showPackageForm && isEditingPkg ? 'bg-gray-100 text-gray-600' : 'bg-rubber-50 hover:bg-rubber-100 text-rubber-600'
                                }`}
                            >
                                {showPackageForm && isEditingPkg ? <XCircle size={18} /> : <Plus size={18} />}
                                <span>{showPackageForm && isEditingPkg ? 'ยกเลิกการแก้ไข' : 'เพิ่มแพ็กเกจ'}</span>
                            </button>
                        </div>

                        {showPackageForm && (
                            <form onSubmit={handleCreatePackage} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 mt-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-wider">ชื่อแพ็กเกจ</label>
                                    <input required type="text" className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-rubber-500" value={newPkg.name} onChange={e => setNewPkg({...newPkg, name: e.target.value})} placeholder="เช่น 1 เดือน" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-wider">จำนวนวัน</label>
                                    <input required type="number" className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-rubber-500" value={newPkg.days} onChange={e => setNewPkg({...newPkg, days: e.target.value})} placeholder="30" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">ราคา (บาท)</label>
                                    <input required type="number" step="0.01" className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-rubber-500" value={newPkg.price} onChange={e => setNewPkg({...newPkg, price: e.target.value})} placeholder="299" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">พนักงานสูงสุด</label>
                                    <input required type="number" className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-rubber-500" value={newPkg.maxStaff} onChange={e => setNewPkg({...newPkg, maxStaff: e.target.value})} placeholder="3" />
                                </div>
                                <button type="submit" className={`${isEditingPkg ? 'bg-amber-500 hover:bg-amber-600' : 'bg-rubber-600 hover:bg-rubber-700'} text-white rounded-xl p-3 font-bold shadow flex justify-center items-center h-[50px] transition-colors`}>
                                    {isEditingPkg ? 'บันทึกการแก้ไข' : 'สร้างแพ็กเกจ'}
                                </button>
                            </form>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                            {packages.map(pkg => (
                                <div key={pkg.id} className="border border-gray-100 bg-white rounded-2xl p-5 shadow-sm relative group hover:border-rubber-200 hover:shadow-md transition-all">
                                <div className="absolute top-4 right-4 flex space-x-2">
                                    <button onClick={() => handleEditPackage(pkg)} className="text-gray-300 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                        <Edit3 size={18} />
                                    </button>
                                    <button onClick={() => handleDeletePackage(pkg.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                    <div className="text-xs font-bold text-rubber-500 uppercase tracking-widest mb-1">{pkg.days} วัน</div>
                                    <div className="text-xl font-black text-gray-800">{pkg.name}</div>
                                    <div className="flex justify-between items-center mt-2 group-hover:transform group-hover:translate-y-[-2px] transition-transform">
                                        <div className="text-lg font-bold text-rubber-600">฿{pkg.price}</div>
                                        <div className="flex items-center text-[11px] font-black text-gray-400 uppercase bg-gray-50 px-2.5 py-1 rounded-lg">
                                            <Users size={12} className="mr-1.5" />
                                            {pkg.maxStaff} Staff
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending Requests Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRequests.map(req => (
                            <div key={req.id} className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-xl shadow-gray-200/40 group">
                                <div className="p-8 pb-6 border-b border-gray-50">
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className="w-14 h-14 bg-rubber-100 rounded-2xl flex items-center justify-center text-rubber-600">
                                            <User size={28} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-black text-rubber-600 uppercase tracking-widest mb-0.5">Shop Owner</div>
                                            <h3 className="text-lg font-black text-gray-900 truncate tracking-tight">{req.username}</h3>
                                            <div className="text-sm text-gray-400 font-medium truncate">{req.email}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ยอดโอน</div>
                                            <div className="text-lg font-black text-gray-800">฿{req.amount}</div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-2xl">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">วันที่แจ้ง</div>
                                            <div className="text-xs font-bold text-gray-800">{format(new Date(req.requestedAt), 'HH:mm dd/MM/yy')}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 pt-6 space-y-6">
                                    <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200">
                                        <img src={req.slipUrl} alt="Slip" className="w-full h-full object-cover" />
                                        <a href={req.slipUrl} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                            <ExternalLink size={24} className="mb-2" />
                                            <span className="font-black text-sm uppercase tracking-widest">ขยายรูปสลิป</span>
                                        </a>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">ระบุจำนวนวันอนุมัติ</label>
                                        <select 
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rubber-500"
                                            value={durationValues[req.id] || '30'}
                                            onChange={(e) => setDurationValues({...durationValues, [req.id]: e.target.value})}
                                        >
                                            {packages.map(pkg => <option key={pkg.id} value={pkg.days}>{pkg.name} ({pkg.days} วัน)</option>)}
                                            <option value="custom">ระบุจำนวนวันเอง...</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => handleAction(req.id, 'reject')} className="flex-1 py-4 bg-white text-red-600 border border-red-100 rounded-2xl font-black text-sm uppercase transition-all flex items-center justify-center space-x-2">
                                            <XCircle size={18} />
                                            <span>ปฏิเสธ</span>
                                        </button>
                                        <button onClick={() => handleAction(req.id, 'approve')} className="flex-[2] py-4 bg-rubber-600 text-white rounded-2xl font-black text-sm uppercase transition-all flex items-center justify-center space-x-2 shadow-lg shadow-rubber-200">
                                            {processingId === req.id ? <div className="w-5 h-5 border-b-2 border-white rounded-full animate-spin"></div> : <><CheckCircle size={18} /> <span>อนุมัติสิทธิ์</span></>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredRequests.length === 0 && (
                            <div className="col-span-full py-20 bg-white rounded-[32px] border border-gray-100 text-center">
                                <ImageIcon size={48} className="mx-auto mb-4 text-gray-200" />
                                <p className="text-gray-400 font-bold">ไม่มีคำขอรออนุมัติในขณะนี้</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'settings' ? (
                /* Bank Settings Tab */
                <div className="max-w-2xl mx-auto bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40 p-10 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center space-x-4 mb-8">
                        <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 tracking-tight">ตั้งค่าบัญชีธนาคารกลาง</h2>
                            <p className="text-gray-400 font-medium">ข้อมูลนี้จะไปแสดงผลในหน้าชำระเงินของสมาชิกทุกราย</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateBankInfo} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block pl-2">ชื่อธนาคาร</label>
                            <input 
                                required
                                type="text"
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                value={bankDetails.bank_name}
                                onChange={(e) => setBankDetails({...bankDetails, bank_name: e.target.value})}
                                placeholder="เช่น ธนาคารกสิกรไทย"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block pl-2">เลขที่บัญชี</label>
                            <input 
                                required
                                type="text"
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                value={bankDetails.bank_account}
                                onChange={(e) => setBankDetails({...bankDetails, bank_account: e.target.value})}
                                placeholder="000-0-00000-0"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block pl-2">ชื่อเจ้าของบัญชี</label>
                            <input 
                                required
                                type="text"
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                value={bankDetails.bank_owner}
                                onChange={(e) => setBankDetails({...bankDetails, bank_owner: e.target.value})}
                                placeholder="ชื่อ-นามสกุล"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-rubber-600 uppercase tracking-widest block pl-2">PromptPay ID</label>
                            <input 
                                type="text"
                                className="w-full bg-gray-50 border-2 border-rubber-100 rounded-2xl px-6 py-4 font-bold text-gray-800 focus:ring-2 focus:ring-rubber-500 transition-all outline-none"
                                value={bankDetails.promptpay_id}
                                onChange={(e) => setBankDetails({...bankDetails, promptpay_id: e.target.value})}
                                placeholder="เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน"
                            />
                            <p className="text-[10px] text-gray-400 pl-2">* สำหรับสร้าง QR Code อัตโนมัติ (ใส่เฉพาะตัวเลข)</p>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSavingBank}
                                className="w-full bg-rubber-600 hover:bg-rubber-700 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-rubber-200 transition-all flex items-center justify-center gap-3"
                            >
                                {isSavingBank ? <div className="w-6 h-6 border-b-2 border-white rounded-full animate-spin"></div> : <><Save size={24} /> <span>บันทึกข้อมูลธนาคาร</span></>}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* Members Management Tab */
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-800 flex items-center tracking-tight">
                            <Users size={24} className="mr-3 text-rubber-500" />
                            รายชื่อสมาชิกทั้งหมด
                        </h2>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            ทั้งหมด {filteredMembers.length} คน
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                <tr>
                                    <th className="px-8 py-4">ชื่อร้าน / สมาชิก</th>
                                    <th className="px-8 py-4">บัญชี</th>
                                    <th className="px-8 py-4">สถานะ</th>
                                    <th className="px-8 py-4 text-center">พนักงาน</th>
                                    <th className="px-8 py-4 text-center">วันหมดอายุ</th>
                                    <th className="px-8 py-4 text-right">การจัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredMembers.map(m => (
                                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="font-black text-gray-900">{m.store_name || '-'}</div>
                                            <div className="text-[11px] text-gray-400 font-bold italic tracking-wide">ID: {m.id.substring(0, 8)}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-gray-700">{m.username}</div>
                                            <div className="text-xs text-gray-400 truncate max-w-[150px]">{m.email}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {getStatusBadge(m.subscription_status)}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="inline-flex items-center px-2 py-1 bg-gray-50 rounded-lg border border-gray-100 font-black text-gray-600 text-xs shadow-inner">
                                                <Users size={12} className="mr-1.5 text-gray-400" />
                                                {m.maxStaffLimit || 1}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center font-bold text-sm text-gray-600">
                                            {m.subscription_expiry ? format(new Date(m.subscription_expiry), 'dd/MM/yyyy') : '-'}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={() => handleOpenEditMember(m)}
                                                className="p-3 text-gray-400 hover:text-rubber-600 hover:bg-rubber-50 rounded-2xl transition-all"
                                                title="แก้ไขสิทธิ์"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMembers.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-12 text-center text-gray-400 font-medium">ไม่พบข้อมูลสมาชิกตามที่ค้นหา</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit Member Subscription Modal */}
            {editingMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-rubber-100 rounded-3xl flex items-center justify-center text-rubber-600">
                                        <User size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editingMember.username}</h3>
                                        <p className="text-gray-400 font-medium">{editingMember.store_name || 'ไม่มีชื่อร้าน'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setEditingMember(null)} className="p-2 text-gray-300 hover:text-gray-600">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                                        <Filter size={12} className="mr-1.5" />
                                        สถานะสมาชิก (Status)
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['active', 'trial', 'expired', 'cancelled'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setEditForm({...editForm, status: s})}
                                                className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border-2 ${
                                                    editForm.status === s 
                                                        ? 'bg-rubber-600 text-white border-rubber-600 shadow-lg shadow-rubber-200' 
                                                        : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                                                }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                                        <Calendar size={12} className="mr-1.5" />
                                        วันหมดอายุ (Subscription Expiry)
                                    </label>
                                    <input 
                                        type="date"
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-800 focus:ring-2 focus:ring-rubber-500 transition-all outline-none"
                                        value={editForm.expiry}
                                        onChange={(e) => setEditForm({...editForm, expiry: e.target.value})}
                                    />
                                    <p className="text-[10px] text-gray-400 italic">
                                        * กำหนดวันสิ้นสุดการรับโบนัสและการใช้ฟีเจอร์พรีเมียม
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                                        <Users size={12} className="mr-1.5" />
                                        โควตาพนักงาน (Staff Quota)
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number"
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold text-gray-800 focus:ring-2 focus:ring-rubber-500 transition-all outline-none"
                                            value={editForm.maxStaffLimit}
                                            onChange={(e) => setEditForm({...editForm, maxStaffLimit: e.target.value})}
                                            min="1"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300">USER(S)</div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic">
                                        * จำนวนพนักงานที่เจ้าของร้านสามารถเพิ่มเข้าระบบได้
                                    </p>
                                </div>

                                <div className="pt-4 flex flex-col space-y-3">
                                    <button
                                        onClick={handleUpdateMember}
                                        disabled={isUpdatingMember}
                                        className="w-full bg-rubber-600 hover:bg-rubber-700 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-rubber-200 transition-all flex items-center justify-center gap-3"
                                    >
                                        {isUpdatingMember ? <div className="w-6 h-6 border-b-2 border-white rounded-full animate-spin"></div> : "บันทึกการเปลี่ยนแปลง"}
                                    </button>
                                    <div className="p-4 bg-amber-50 rounded-2xl flex items-start space-x-3 border border-amber-100">
                                        <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                                            ระวัง: การเปลี่ยนสถานะด้วยมือจะมีผลทันทีและไม่ทิ้งประวัติในตารางคำขออนุมัติแพ็กเกจ
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSubscriptions;
