import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/db';
import { 
    fetchServiceQueues, 
    addServiceQueue, 
    updateServiceQueue, 
    deleteServiceQueue,
    fetchServiceCatalog,
    fetchFarmers,
    fetchStaff,
    addLoan
} from '../services/apiService';
import { 
    Wrench, Plus, Search, Calendar, User, Phone, MapPin, DollarSign, 
    CheckCircle2, Clock, AlertCircle, PlayCircle, Check, X, Printer, 
    FileText, CreditCard, Wallet, ArrowRight, ShieldCheck, Tag, XCircle, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const ServiceQueueStation = () => {
    const { user } = useAuth();
    const [queues, setQueues] = useState([]);
    const [services, setServices] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedQueueForPay, setSelectedQueueForPay] = useState(null);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [selectedQueueForPrint, setSelectedQueueForPrint] = useState(null);

    // Form states for Create Queue
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [farmerSearch, setFarmerSearch] = useState('');
    const [showFarmerDropdown, setShowFarmerDropdown] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [appointmentDate, setAppointmentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [locationNote, setLocationNote] = useState('');

    // Form states for Payment
    const [payMethod, setPayMethod] = useState('cash'); // 'cash', 'transfer', 'loan_converted'
    const [payNote, setPayNote] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load local Dexie data
            const [localQueues, localCatalog, localFarmers, localStaff] = await Promise.all([
                db.service_queues.toArray(),
                db.service_catalog.toArray(),
                db.farmers.toArray(),
                db.staff.toArray()
            ]);

            const LEGACY_IDS = ['srv_1', 'srv_2', 'srv_3', 'srv_4'];
            setQueues((localQueues || []).filter(q => q.userId === user?.storeId || !q.userId));
            setServices((localCatalog || []).filter(s => s.is_active !== false && !LEGACY_IDS.includes(s.id) && (s.userId === user?.storeId || !s.userId)));
            setFarmers(localFarmers || []);
            setStaffList(localStaff || []);

            // Background sync if online
            if (navigator.onLine) {
                const [qRes, cRes, fRes, sRes] = await Promise.all([
                    fetchServiceQueues(),
                    fetchServiceCatalog(),
                    fetchFarmers(),
                    fetchStaff()
                ]);
                if (Array.isArray(qRes)) {
                    await db.service_queues.clear();
                    await db.service_queues.bulkPut(qRes);
                    setQueues(qRes);
                }
                if (Array.isArray(cRes)) {
                    const cleanCatalog = cRes.filter(s => !LEGACY_IDS.includes(s.id));
                    await db.service_catalog.clear();
                    await db.service_catalog.bulkPut(cleanCatalog);
                    setServices(cleanCatalog.filter(s => s.is_active !== false));
                }
                if (Array.isArray(fRes)) {
                    await db.farmers.bulkPut(fRes);
                    setFarmers(fRes);
                }
                if (Array.isArray(sRes)) {
                    await db.staff.bulkPut(sRes);
                    setStaffList(sRes);
                }
            }
        } catch (err) {
            console.error('Failed to load service queues:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Unit Text
    const getUnitText = (type) => {
        switch (type) {
            case 'rai': return 'ไร่';
            case 'hour': return 'ชั่วโมง';
            case 'day': return 'วัน';
            case 'job': return 'งาน';
            default: return 'หน่วย';
        }
    };

    // Find selected service info
    const selectedService = useMemo(() => {
        return services.find(s => s.id === selectedServiceId);
    }, [services, selectedServiceId]);

    // Computed total amount for create form
    const computedTotalAmount = useMemo(() => {
        if (!selectedService) return 0;
        const q = parseFloat(quantity) || 0;
        const price = Number(selectedService.price_per_unit || 0);
        return q * price;
    }, [selectedService, quantity]);

    // Generate Queue Number (SQ-001)
    const generateNextQueueNo = () => {
        const todayStr = format(new Date(), 'yyyyMMdd');
        const todayQueues = queues.filter(q => q.service_no && q.service_no.startsWith(`SQ-${todayStr}`));
        const nextSeq = (todayQueues.length + 1).toString().padStart(3, '0');
        return `SQ-${todayStr}-${nextSeq}`;
    };

    // Handle Create Queue Submit
    const handleCreateQueue = async (e) => {
        e.preventDefault();
        if (!selectedServiceId) {
            toast.error('กรุณาเลือกรายการบริการ');
            return;
        }

        const name = selectedFarmer ? selectedFarmer.name : customerName.trim();
        if (!name) {
            toast.error('กรุณาระบุชื่อลูกค้าหรือเลือกเกษตรกร');
            return;
        }

        setSubmitting(true);
        const serviceNo = generateNextQueueNo();
        const selectedStaff = staffList.find(s => s.id === selectedStaffId);

        const newQueue = {
            id: crypto.randomUUID(),
            service_no: serviceNo,
            farmer_id: selectedFarmer ? selectedFarmer.id : null,
            customer_name: name,
            phone: selectedFarmer ? (selectedFarmer.phone || '') : phone.trim(),
            service_id: selectedService.id,
            service_name: selectedService.name,
            unit_type: selectedService.unit_type,
            unit_price: Number(selectedService.price_per_unit || 0),
            quantity: parseFloat(quantity) || 1,
            total_amount: computedTotalAmount,
            appointment_date: appointmentDate,
            staff_id: selectedStaffId || null,
            staff_name: selectedStaff ? selectedStaff.name : null,
            location_note: locationNote.trim(),
            status: 'pending',
            payment_status: 'unpaid',
            payment_method: null,
            paid_at: null,
            userId: user?.storeId || 'SYSTEM',
            created_at: new Date().toISOString()
        };

        try {
            await db.service_queues.put(newQueue);
            await addServiceQueue(newQueue);
            toast.success(`ออกบัตรคิวบริการ ${serviceNo} สำเร็จ!`);
            
            // Reset form
            setSelectedFarmer(null);
            setFarmerSearch('');
            setCustomerName('');
            setPhone('');
            setSelectedServiceId('');
            setQuantity('1');
            setSelectedStaffId('');
            setLocationNote('');
            setShowCreateModal(false);
            
            loadData();
        } catch (err) {
            toast.error('ออกบัตรคิวล้มเหลว: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Update Status
    const handleUpdateStatus = async (qId, nextStatus) => {
        try {
            const existing = queues.find(q => q.id === qId) || {};
            const updated = { ...existing, status: nextStatus };
            await db.service_queues.put(updated);
            setQueues(prev => prev.map(q => q.id === qId ? updated : q));
            await updateServiceQueue(qId, updated);
            toast.success('อัปเดตสถานะคิวบริการเรียบร้อย');
        } catch (err) {
            toast.error('อัปเดตสถานะล้มเหลว');
        }
    };

    // Cancel Queue Handler
    const handleCancelQueue = async (qId, serviceNo, customerName) => {
        if (!window.confirm(`คุณต้องการยกเลิกคิวบริการ ${serviceNo} (${customerName}) ใช่หรือไม่?`)) return;
        try {
            const existing = queues.find(q => q.id === qId) || {};
            const updated = { 
                ...existing,
                status: 'cancelled',
                payment_status: 'cancelled'
            };
            await db.service_queues.put(updated);
            setQueues(prev => prev.map(q => q.id === qId ? updated : q));
            await updateServiceQueue(qId, updated);
            toast.success(`ยกเลิกคิวบริการ ${serviceNo} เรียบร้อยแล้ว`);
        } catch (err) {
            toast.error('ยกเลิกคิวบริการล้มเหลว: ' + err.message);
        }
    };

    // Delete Queue Completely
    const handleDeleteQueue = async (qId, serviceNo) => {
        if (!window.confirm(`คุณต้องการลบคิวบริการ ${serviceNo} ออกจากระบบใช่หรือไม่?`)) return;
        try {
            await db.service_queues.delete(qId);
            await deleteServiceQueue(qId);
            setQueues(prev => prev.filter(q => q.id !== qId));
            toast.success(`ลบคิวบริการ ${serviceNo} สำเร็จ`);
        } catch (err) {
            toast.error('ลบคิวบริการล้มเหลว');
        }
    };

    // Process Payment or Convert to Loan
    const handleProcessPayment = async () => {
        if (!selectedQueueForPay) return;
        setSubmitting(true);

        const q = selectedQueueForPay;
        try {
            if (payMethod === 'loan_converted') {
                if (!q.farmer_id) {
                    toast.error('การค้างชำระ / แปลงเป็นหนี้เงินกู้ ต้องเลือกเกษตรกรที่มีรายชื่อในระบบ');
                    setSubmitting(false);
                    return;
                }

                // 1. Create a new Loan entry in loans table
                const newLoan = {
                    id: crypto.randomUUID(),
                    borrowerType: 'farmer',
                    borrowerId: q.farmer_id,
                    borrowerName: q.customer_name,
                    date: format(new Date(), 'yyyy-MM-dd'),
                    amount: q.total_amount,
                    remainingAmount: q.total_amount,
                    deductionMethod: 'full',
                    deductionValue: 0,
                    note: `ค่าบริการ: ${q.service_name} ${q.quantity} ${getUnitText(q.unit_type)} (คิว ${q.service_no})`,
                    userId: user?.storeId || 'SYSTEM'
                };

                await db.loans.put(newLoan);
                await addLoan(newLoan);

                // 2. Update Queue status
                const queueUpdate = {
                    ...q,
                    payment_status: 'loan_converted',
                    payment_method: 'loan_converted',
                    status: 'completed',
                    paid_at: new Date().toISOString()
                };

                await db.service_queues.put(queueUpdate);
                await updateServiceQueue(q.id, queueUpdate);
                setQueues(prev => prev.map(item => item.id === q.id ? queueUpdate : item));

                toast.success(`บันทึกค้างชำระค่างานบริการ ${q.service_no} เป็นหนี้เงินกู้สำเร็จ! (ระบบจะดึงไปหักค่ายางให้อัตโนมัติเมื่อมาขายยาง)`);
            } else {
                // Regular Cash / Transfer payment
                const queueUpdate = {
                    ...q,
                    payment_status: 'paid',
                    payment_method: payMethod,
                    status: 'completed',
                    paid_at: new Date().toISOString()
                };

                await db.service_queues.put(queueUpdate);
                await updateServiceQueue(q.id, queueUpdate);
                setQueues(prev => prev.map(item => item.id === q.id ? queueUpdate : item));

                toast.success(`บันทึกรับชำระเงินค่างานบริการ ${q.service_no} เรียบร้อยแล้ว!`);
            }

            setShowPayModal(false);
            setSelectedQueueForPay(null);
        } catch (err) {
            toast.error('ทำรายการล้มเหลว: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Filtered Queue List
    const filteredQueues = useMemo(() => {
        return queues.filter(q => {
            const matchesSearch = (
                q.service_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.phone?.includes(searchTerm) ||
                q.service_name?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (!matchesSearch) return false;
            if (statusFilter === 'pending') return q.status === 'pending';
            if (statusFilter === 'in_progress') return q.status === 'in_progress';
            if (statusFilter === 'completed') return q.status === 'completed';
            if (statusFilter === 'cancelled') return q.status === 'cancelled';
            if (statusFilter === 'unpaid') return q.payment_status === 'unpaid' && q.status !== 'cancelled';
            if (statusFilter === 'paid') return (q.payment_status === 'paid' || q.payment_status === 'loan_converted') && q.status !== 'cancelled';
            return true;
        });
    }, [queues, searchTerm, statusFilter]);

    // Statistics Summary
    const stats = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        let pending = 0;
        let inProgress = 0;
        let completedToday = 0;
        let cancelledCount = 0;
        let paidCount = 0;
        let todayRevenue = 0;

        queues.forEach(q => {
            if (q.status === 'pending') pending++;
            if (q.status === 'in_progress') inProgress++;
            if (q.status === 'completed' && q.appointment_date === todayStr) completedToday++;
            if (q.status === 'cancelled') cancelledCount++;
            if ((q.payment_status === 'paid' || q.payment_status === 'loan_converted') && q.status !== 'cancelled') paidCount++;
            if (q.payment_status === 'paid' && q.appointment_date === todayStr) todayRevenue += Number(q.total_amount || 0);
        });

        return { pending, inProgress, completedToday, cancelledCount, paidCount, todayRevenue, total: queues.length };
    }, [queues]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Wrench className="mr-2.5 text-rubber-600" size={28} />
                        ระบบจัดการคิวบริการทั่วไป & บันทึกรายรับร้าน
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        จัดการคิวงานบริการเกษตร (ตัดหญ้า, ฉีดพ่นยา, ไถสวน, ตัดไม้), บันทึกรายรับร้าน และตั้งค้างชำระหักค่ายางอัตโนมัติ
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2.5 bg-rubber-600 hover:bg-rubber-700 text-white font-bold rounded-xl shadow-sm transition flex items-center space-x-2 text-sm"
                >
                    <Plus size={18} />
                    <span>ออกบัตรคิวบริการใหม่</span>
                </button>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-gray-400">คิวรอเริ่มงาน</div>
                        <div className="text-xl font-bold text-gray-900">{stats.pending} รายการ</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <PlayCircle size={22} />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-gray-400">กำลังทำอยู่</div>
                        <div className="text-xl font-bold text-gray-900">{stats.inProgress} รายการ</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-gray-400">งานเสร็จแล้ววันนี้</div>
                        <div className="text-xl font-bold text-gray-900">{stats.completedToday} รายการ</div>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
                    <div className="p-3 bg-rubber-50 rounded-xl text-rubber-700">
                        <DollarSign size={22} />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-gray-400">รายรับบริการวันนี้</div>
                        <div className="text-xl font-bold text-rubber-700 font-mono">฿{stats.todayRevenue.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                    <button
                        onClick={() => setStatusFilter('pending')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        รอคิว ({stats.pending})
                    </button>
                    <button
                        onClick={() => setStatusFilter('in_progress')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${statusFilter === 'in_progress' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        กำลังทำ ({stats.inProgress})
                    </button>
                    <button
                        onClick={() => setStatusFilter('completed')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${statusFilter === 'completed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        เสร็จแล้ว
                    </button>
                    <button
                        onClick={() => setStatusFilter('cancelled')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${statusFilter === 'cancelled' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        ยกเลิกแล้ว ({stats.cancelledCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter('paid')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${statusFilter === 'paid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        ชำระเงินแล้ว ({stats.paidCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter('unpaid')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${statusFilter === 'unpaid' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        รอชำระเงิน
                    </button>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="ค้นหาเลขคิว, ชื่อลูกค้า, หรือบริการ..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:ring-2 focus:ring-rubber-500/20"
                    />
                </div>
            </div>

            {/* Queue Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4 text-left">เลขคิว</th>
                                <th className="px-6 py-4 text-left">ลูกค้า / เบอร์โทร</th>
                                <th className="px-6 py-4 text-left">ประเภทบริการ</th>
                                <th className="px-6 py-4 text-right">ยอดเงินรวม</th>
                                <th className="px-6 py-4 text-center">วันนัดหมาย / ผู้รับผิดชอบ</th>
                                <th className="px-6 py-4 text-center">สถานะงาน</th>
                                <th className="px-6 py-4 text-center">การชำระเงิน</th>
                                <th className="px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredQueues.map(q => (
                                <tr key={q.id} className="hover:bg-gray-50/50 transition">
                                    <td className="px-6 py-4">
                                        <span className="inline-block px-2.5 py-1 bg-rubber-50 text-rubber-700 font-black rounded-lg text-xs border border-rubber-200 font-mono">
                                            {q.service_no}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{q.customer_name}</div>
                                        {q.phone && <div className="text-xs text-gray-400">{q.phone}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800">{q.service_name}</div>
                                        <div className="text-xs text-gray-400">
                                            {q.quantity} {getUnitText(q.unit_type)} × ฿{Number(q.unit_price || 0).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-rubber-700 text-base">
                                        ฿{Number(q.total_amount || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="text-xs font-semibold text-gray-700">
                                            {q.appointment_date ? format(new Date(q.appointment_date), 'd MMM yyyy', { locale: th }) : '-'}
                                        </div>
                                        {q.staff_name && (
                                            <div className="text-[11px] text-gray-400">ผู้คุมงาน: {q.staff_name}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {q.status === 'pending' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                <Clock size={12} className="mr-1" /> รอคิว
                                            </span>
                                        )}
                                        {q.status === 'in_progress' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                                                <PlayCircle size={12} className="mr-1" /> กำลังทำ
                                            </span>
                                        )}
                                        {q.status === 'completed' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                <CheckCircle2 size={12} className="mr-1" /> เสร็จสิ้น
                                            </span>
                                        )}
                                        {q.status === 'cancelled' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                                <XCircle size={12} className="mr-1" /> ยกเลิกแล้ว
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {q.payment_status === 'paid' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                <Check size={12} className="mr-1" /> ชำระแล้ว
                                            </span>
                                        )}
                                        {q.payment_status === 'loan_converted' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                                <Tag size={12} className="mr-1" /> หักค่ายางอัตโนมัติ
                                            </span>
                                        )}
                                        {q.payment_status === 'unpaid' && q.status !== 'cancelled' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                ยังไม่ชำระ
                                            </span>
                                        )}
                                        {q.status === 'cancelled' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200">
                                                ยกเลิกการชำระ
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center items-center space-x-1.5">
                                            {q.status === 'pending' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(q.id, 'in_progress')}
                                                    className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold transition"
                                                >
                                                    เริ่มงาน
                                                </button>
                                            )}
                                            {q.status === 'in_progress' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(q.id, 'completed')}
                                                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition"
                                                >
                                                    งานเสร็จแล้ว
                                                </button>
                                            )}
                                            {q.payment_status === 'unpaid' && q.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedQueueForPay(q);
                                                        setPayMethod(q.farmer_id ? 'loan_converted' : 'cash');
                                                        setShowPayModal(true);
                                                    }}
                                                    className="px-2.5 py-1 bg-rubber-600 text-white rounded-lg text-xs font-bold hover:bg-rubber-700 shadow-sm transition"
                                                >
                                                    ชำระเงิน
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedQueueForPrint(q);
                                                    setShowPrintModal(true);
                                                }}
                                                className="p-1.5 text-gray-500 hover:text-rubber-700 hover:bg-rubber-50 rounded-lg transition border border-gray-200"
                                                title="พิมพ์ใบเสร็จรับเงินบริการ"
                                            >
                                                <Printer size={15} />
                                            </button>
                                            {q.status !== 'completed' && q.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => handleCancelQueue(q.id, q.service_no, q.customer_name)}
                                                    className="px-2 py-1 bg-gray-50 text-red-600 border border-gray-200 hover:bg-red-50 hover:border-red-200 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                                                    title="ยกเลิกคิวนี้"
                                                >
                                                    <XCircle size={14} />
                                                    <span>ยกเลิก</span>
                                                </button>
                                            )}
                                            {q.status === 'cancelled' && (
                                                <button
                                                    onClick={() => handleDeleteQueue(q.id, q.service_no)}
                                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="ลบคิวนี้ออกจากระบบ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredQueues.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400 italic">
                                        ไม่มีข้อมูลคิวบริการในรายการที่เลือก
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Queue Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center text-base">
                                <Plus size={18} className="mr-2 text-rubber-600" />
                                ออกบัตรคิวบริการใหม่
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateQueue} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* Farmer Select or Customer Name */}
                            <div className="space-y-1 relative">
                                <label className="text-xs font-bold text-gray-700">เลือกเกษตรกร หรือ ระบุชื่อผู้สั่งงาน *</label>
                                {selectedFarmer ? (
                                    <div className="flex items-center justify-between p-2.5 bg-rubber-50 border border-rubber-200 rounded-xl text-sm font-bold text-rubber-800">
                                        <span>👤 {selectedFarmer.name} ({selectedFarmer.phone || 'ไม่มีเบอร์โทร'})</span>
                                        <button type="button" onClick={() => setSelectedFarmer(null)} className="text-rubber-600 hover:text-rubber-800">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="พิมพ์ค้นหาชื่อเกษตรกร หรือ พิมพ์ชื่อลูกค้าทั่วไป..."
                                            value={customerName || farmerSearch}
                                            onChange={e => {
                                                setCustomerName(e.target.value);
                                                setFarmerSearch(e.target.value);
                                                setShowFarmerDropdown(true);
                                            }}
                                            onFocus={() => setShowFarmerDropdown(true)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rubber-500/20"
                                        />
                                        {showFarmerDropdown && farmerSearch && (
                                            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-40 overflow-y-auto z-20">
                                                {farmers.filter(f => f.name.toLowerCase().includes(farmerSearch.toLowerCase())).map(f => (
                                                    <div
                                                        key={f.id}
                                                        onClick={() => {
                                                            setSelectedFarmer(f);
                                                            setCustomerName(f.name);
                                                            setShowFarmerDropdown(false);
                                                        }}
                                                        className="px-3 py-2 text-sm hover:bg-rubber-50 cursor-pointer font-medium border-b border-gray-50"
                                                    >
                                                        {f.name} {f.phone ? `(${f.phone})` : ''}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Phone */}
                            {!selectedFarmer && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-700">เบอร์โทรศัพท์</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="08x-xxx-xxxx"
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rubber-500/20"
                                    />
                                </div>
                            )}

                            {/* Service Select */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700">เลือกประเภทบริการ *</label>
                                <select
                                    value={selectedServiceId}
                                    onChange={e => setSelectedServiceId(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-rubber-500/20 cursor-pointer"
                                    required
                                >
                                    <option value="">-- เลือกรายการบริการ --</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} (฿{s.price_per_unit}/{getUnitText(s.unit_type)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Quantity & Computed Total */}
                            {selectedService && (
                                <div className="grid grid-cols-2 gap-3 p-3 bg-rubber-50/50 rounded-xl border border-rubber-100">
                                    <div>
                                        <label className="text-xs font-bold text-gray-700">
                                            จำนวน ({getUnitText(selectedService.unit_type)}) *
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            value={quantity}
                                            onChange={e => setQuantity(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-rubber-500/20"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-700">คำนวณยอดเงินรวม</label>
                                        <div className="px-3 py-2 bg-white border border-rubber-200 rounded-xl text-sm font-black text-rubber-700 font-mono">
                                            ฿{computedTotalAmount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Appointment Date & Staff */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-700">วันนัดหมายปฏิบัติงาน</label>
                                    <input
                                        type="date"
                                        value={appointmentDate}
                                        onChange={e => setAppointmentDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rubber-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-700">พนักงานผู้คุมงาน</label>
                                    <select
                                        value={selectedStaffId}
                                        onChange={e => setSelectedStaffId(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rubber-500/20 cursor-pointer"
                                    >
                                        <option value="">-- ไม่ระบุ --</option>
                                        {staffList.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Location Note */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-700">พิกัดสถานที่ / รายละเอียดแปลงสวน</label>
                                <textarea
                                    rows="2"
                                    value={locationNote}
                                    onChange={e => setLocationNote(e.target.value)}
                                    placeholder="เช่น สวนยางติดกับโรงเรียนบ้านหนองยาง เข้าซอย 2..."
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rubber-500/20"
                                />
                            </div>

                            <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-rubber-600 hover:bg-rubber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1"
                                >
                                    <Plus size={16} />
                                    <span>ออกบัตรคิวบริการ</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPayModal && selectedQueueForPay && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-rubber-50">
                            <div>
                                <h3 className="font-bold text-rubber-900 text-base flex items-center">
                                    <DollarSign size={18} className="mr-1 text-rubber-700" />
                                    รับชำระเงินคิวบริการ {selectedQueueForPay.service_no}
                                </h3>
                                <p className="text-xs text-rubber-700 mt-0.5">
                                    ลูกค้า: {selectedQueueForPay.customer_name} | ยอดรวม ฿{Number(selectedQueueForPay.total_amount || 0).toLocaleString()}
                                </p>
                            </div>
                            <button onClick={() => setShowPayModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Summary Detail */}
                            <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1.5 border border-gray-100">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">บริการ:</span>
                                    <span className="font-bold text-gray-800">{selectedQueueForPay.service_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">จำนวน:</span>
                                    <span className="font-bold text-gray-800">{selectedQueueForPay.quantity} {getUnitText(selectedQueueForPay.unit_type)}</span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-gray-200 text-sm">
                                    <span className="font-bold text-gray-700">ยอดที่ต้องชำระ:</span>
                                    <span className="font-black text-rubber-700 font-mono">฿{Number(selectedQueueForPay.total_amount || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Payment Options */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-700">เลือกรูปแบบการรับชำระเงิน *</label>
                                
                                <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${payMethod === 'cash' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                    <input
                                        type="radio"
                                        name="payMethod"
                                        value="cash"
                                        checked={payMethod === 'cash'}
                                        onChange={() => setPayMethod('cash')}
                                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <div className="ml-3 flex items-center">
                                        <Wallet size={18} className="text-emerald-600 mr-2" />
                                        <div>
                                            <div className="text-xs font-bold text-gray-800">เงินสด (Cash)</div>
                                            <div className="text-[11px] text-gray-400">รับชำระเป็นเงินสด ณ ร้านค้า / พนักงานสนาม</div>
                                        </div>
                                    </div>
                                </label>

                                <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${payMethod === 'transfer' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                    <input
                                        type="radio"
                                        name="payMethod"
                                        value="transfer"
                                        checked={payMethod === 'transfer'}
                                        onChange={() => setPayMethod('transfer')}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="ml-3 flex items-center">
                                        <CreditCard size={18} className="text-blue-600 mr-2" />
                                        <div>
                                            <div className="text-xs font-bold text-gray-800">โอนเงิน (Bank Transfer)</div>
                                            <div className="text-[11px] text-gray-400">โอนเข้าบัญชีธนาคารร้านค้า</div>
                                        </div>
                                    </div>
                                </label>

                                <label className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${payMethod === 'loan_converted' ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/20' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                    <input
                                        type="radio"
                                        name="payMethod"
                                        value="loan_converted"
                                        checked={payMethod === 'loan_converted'}
                                        onChange={() => setPayMethod('loan_converted')}
                                        className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                                    />
                                    <div className="ml-3 flex items-center">
                                        <Tag size={18} className="text-orange-600 mr-2" />
                                        <div>
                                            <div className="text-xs font-bold text-gray-800">ค้างชำระ / แปลงเป็นหนี้หักค่ายางอัตโนมัติ</div>
                                            <div className="text-[11px] text-orange-700">สร้างรายการกู้หนี้ใหม่ในระบบ เพื่อนำไปหักเงินอัตโนมัติเมื่อชาวสวนมาขายยาง</div>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowPayModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleProcessPayment}
                                    disabled={submitting}
                                    className="px-5 py-2 bg-rubber-600 hover:bg-rubber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1"
                                >
                                    <CheckCircle2 size={16} />
                                    <span>{payMethod === 'loan_converted' ? 'บันทึกค้างชำระหักค่ายาง' : 'ยืนยันการรับชำระเงิน'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Slip / Receipt Modal */}
            {showPrintModal && selectedQueueForPrint && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <style dangerouslySetInnerHTML={{ __html: `
                        @media print {
                            @page {
                                size: 80mm auto;
                                margin: 0;
                            }
                            body {
                                margin: 0 !important;
                                padding: 0 !important;
                                -webkit-print-color-adjust: exact;
                            }
                            .no-print, .print\\:hidden {
                                display: none !important;
                            }
                            #printable-service-receipt {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 76mm !important;
                                margin: 0 auto !important;
                                padding: 2mm !important;
                                border: none !important;
                                box-shadow: none !important;
                                background: white !important;
                            }
                        }
                    ` }} />
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 print:hidden">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center">
                                <Printer size={16} className="mr-1 text-rubber-600" />
                                ตัวอย่างใบเสร็จรับเงินบริการ
                            </h3>
                            <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Thermal Slip Content */}
                        <div id="printable-service-receipt" className="p-5 bg-white font-mono text-xs text-gray-900 leading-relaxed border-b border-gray-100 space-y-3">
                            <div className="text-center space-y-0.5 border-b border-gray-800 pb-3">
                                <div className="font-black text-sm uppercase">ใบเสร็จรับเงินบริการทางการเกษตร</div>
                                <div className="text-[11px] font-bold text-gray-700">{user?.storeName || 'ร้านยางพารา'}</div>
                                <div className="text-[10px] text-gray-500">โทร: {user?.phone || '08X-XXX-XXXX'}</div>
                            </div>

                            <div className="space-y-1 text-[11px] border-b border-dashed border-gray-400 pb-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">เลขคิวบริการ:</span>
                                    <span className="font-bold">{selectedQueueForPrint.service_no}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">วันที่:</span>
                                    <span>{format(new Date(selectedQueueForPrint.created_at || Date.now()), 'd MMM yyyy HH:mm', { locale: th })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">ชื่อลูกค้า:</span>
                                    <span className="font-bold">{selectedQueueForPrint.customer_name}</span>
                                </div>
                                {selectedQueueForPrint.phone && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">เบอร์โทร:</span>
                                        <span>{selectedQueueForPrint.phone}</span>
                                    </div>
                                )}
                                {selectedQueueForPrint.staff_name && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">ผู้คุมงาน:</span>
                                        <span>{selectedQueueForPrint.staff_name}</span>
                                    </div>
                                )}
                            </div>

                            <div className="border-b border-dashed border-gray-400 pb-3 space-y-1.5 text-[11px]">
                                <div className="font-bold">รายการบริการ:</div>
                                <div className="flex justify-between font-bold text-gray-900">
                                    <span>{selectedQueueForPrint.service_name}</span>
                                </div>
                                <div className="flex justify-between text-gray-600 pl-2">
                                    <span>{selectedQueueForPrint.quantity} {getUnitText(selectedQueueForPrint.unit_type)} × ฿{Number(selectedQueueForPrint.unit_price || 0).toLocaleString()}</span>
                                    <span className="font-bold text-gray-900 font-mono">฿{Number(selectedQueueForPrint.total_amount || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-1 text-[11px]">
                                <div className="flex justify-between text-xs font-black text-gray-900">
                                    <span>ยอดรวมทั้งสิ้น:</span>
                                    <span className="font-mono text-sm">฿{Number(selectedQueueForPrint.total_amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-700">
                                    <span>การชำระเงิน:</span>
                                    <span className="font-bold">
                                        {selectedQueueForPrint.payment_method === 'cash' ? 'เงินสด (Cash)' : 
                                         selectedQueueForPrint.payment_method === 'transfer' ? 'โอนเงิน (Transfer)' : 
                                         selectedQueueForPrint.payment_method === 'loan_converted' ? 'ตั้งหักค่ายางอัตโนมัติ' : 'ยังไม่ชำระ'}
                                    </span>
                                </div>
                            </div>

                            <div className="text-center text-[10px] text-gray-400 pt-3 border-t border-gray-200">
                                *** ขอบคุณที่ใช้บริการ ***
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 flex justify-between items-center print:hidden">
                            <button
                                type="button"
                                onClick={() => setShowPrintModal(false)}
                                className="px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition"
                            >
                                ปิด
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-rubber-600 hover:bg-rubber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1"
                            >
                                <Printer size={15} />
                                <span>พิมพ์สลิปใบเสร็จ (80mm)</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceQueueStation;
