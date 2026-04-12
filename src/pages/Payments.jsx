import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
    Wallet, 
    Search, 
    CheckCircle2, 
    Clock, 
    QrCode, 
    User, 
    Users, 
    ArrowRight,
    Filter,
    FileText,
    Calendar,
    X,
    ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchBuyRecords, fetchFarmers, fetchEmployees, updateRecord, isCached } from '../services/apiService';

export const Payments = () => {
    const [records, setRecords] = useState([]);
    const { user } = useAuth();
    const [farmers, setFarmers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null); // { type: 'farmer'|'employee', amount, name, targetId, buyId }
    const [statusUpdating, setStatusUpdating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!isCached('buys', 'farmers', 'employees')) setLoading(true);
        try {
            const [buysData, farmersData, empsData] = await Promise.all([
                fetchBuyRecords(),
                fetchFarmers(),
                fetchEmployees()
            ]);
            setRecords(Array.isArray(buysData) ? buysData : []);
            setFarmers(Array.isArray(farmersData) ? farmersData : []);
            setEmployees(Array.isArray(empsData) ? empsData : []);
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (buyId, field, newStatus) => {
        setStatusUpdating(true);
        try {
            const updates = { [field]: newStatus };
            // For backward compatibility, also update 'status' if both are paid or if we want to maintain the old field
            // But let's mainly focus on the new fields.
            const res = await updateRecord('buys', buyId, updates);
            if (res.status === 'success') {
                toast.success('อัปเดตสถานะสำเร็จ');
                setRecords(prev => prev.map(r => r.id === buyId ? { ...r, ...updates } : r));
            } else {
                toast.error(res.message || 'อัปเดตล้มเหลว');
            }
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setStatusUpdating(false);
        }
    };

    const openQRModal = (type, amount, name, targetId, buyId) => {
        // Resolve target info (phone/account)
        let promptpayId = '';
        if (type === 'farmer') {
            const farmer = farmers.find(f => f.id === targetId);
            promptpayId = farmer?.phone || farmer?.bankAccount || '';
        } else {
            const emp = employees.find(e => e.id === targetId);
            promptpayId = emp?.phone || emp?.bankAccount || '';
        }

        if (!promptpayId) {
            toast.error('ไม่พบเลขบัญชีหรือเบอร์โทรศัพท์สำหรับสร้าง QR Code');
            return;
        }

        setSelectedPayment({ type, amount, name, promptpayId, buyId });
    };

    const filteredRecords = records.filter(r => {
        const recordDate = (r.date || '').split('T')[0];
        const matchDate = recordDate.startsWith(filterDate);
        const matchSearch = (r.farmerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (r.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchDate && matchSearch;
    });

    const pendingCount = filteredRecords.reduce((count, r) => {
        let p = 0;
        if (r.farmerStatus !== 'Paid') p++;
        if (r.employeeTotal > 0 && r.employeeStatus !== 'Paid') p++;
        return count + p;
    }, 0);

    const totalToPay = filteredRecords.reduce((sum, r) => {
        let amt = 0;
        if (r.farmerStatus !== 'Paid') amt += Number(r.farmerTotal || r.total || 0);
        if (r.employeeTotal > 0 && r.employeeStatus !== 'Paid') amt += Number(r.employeeTotal || 0);
        return sum + amt;
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">การชำระเงิน</h1>
                    <p className="text-gray-500">จัดการการโอนเงินให้แก่เกษตรกรและลูกจ้างประจำวัน</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center">
                        <Calendar size={18} className="text-gray-400 mr-2" />
                        <input 
                            type="date" 
                            value={filterDate} 
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="text-sm font-medium focus:outline-none border-none p-0"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">รายการที่รอจ่าย</span>
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{pendingCount} รายการ</div>
                </div>
                
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">ยอดเงินคงค้างรวม</span>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Wallet size={20} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">฿ {totalToPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="hidden lg:block bg-rubber-600 p-5 rounded-xl text-white shadow-md relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-sm opacity-80 mb-1">คำแนะนำ</p>
                        <p className="text-xs">เลือกรายการที่ต้องการโอนเงิน จากนั้นกดปุ่ม "QR" เพื่อแสดงช่องทางการชำระเงิน</p>
                    </div>
                    <QrCode size={80} className="absolute -right-4 -bottom-4 opacity-10" />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="ชื่อเกษตรกร หรือเลขที่ใบเสร็จ..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rubber-500 outline-none transition-all"
                    />
                </div>
                <button 
                    onClick={loadData}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                    <Filter size={16} /> ล้างการค้นหา
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">รายการ/สถานะ</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">เกษตรกร/ยอดโอน</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ลูกจ้าง (ถ้ามี)/ยอดโอน</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">ยอดรวมสุทธิ</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">กำลังโหลด...</td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        <FileText size={48} className="mx-auto mb-3 opacity-20" />
                                        ไม่พบข้อมูลการชำระเงินสำหรับวันที่เลือก
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((r) => {
                                    const farmerPaid = r.farmerStatus === 'Paid';
                                    const employeePaid = r.employeeStatus === 'Paid';
                                    const recordEmp = employees.find(e => e.farmerId === r.farmerId);
                                    const hasEmployee = r.employeeTotal > 0;
                                    
                                    return (
                                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] font-bold text-gray-400">#{r.id?.substring(0, 8)}</span>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[9px] font-bold text-gray-400 w-10">เกษตรกร:</span>
                                                            {farmerPaid ? (
                                                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded">โอนแล้ว</span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold rounded">รอโอน</span>
                                                            )}
                                                        </div>
                                                        {hasEmployee && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9px] font-bold text-gray-400 w-10">ลูกจ้าง:</span>
                                                                {employeePaid ? (
                                                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded">โอนแล้ว</span>
                                                                ) : (
                                                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold rounded">รอโอน</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-1">
                                                        <User size={14} className="text-blue-500" />
                                                        {r.farmerName}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-black ${farmerPaid ? 'text-gray-400 italic line-through' : 'text-gray-700'}`}>
                                                            ฿ {(r.farmerTotal || r.total).toLocaleString()}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {!farmerPaid ? (
                                                                <>
                                                                    <button 
                                                                        onClick={() => openQRModal('farmer', r.farmerTotal || r.total, r.farmerName, r.farmerId, r.id)}
                                                                        className="p-1 text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                                        title="แสดง QR Code"
                                                                    >
                                                                        <QrCode size={16} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleUpdateStatus(r.id, 'farmerStatus', 'Paid')}
                                                                        className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                                                                        title="ทำเครื่องหมายว่าจ่ายแล้ว"
                                                                    >
                                                                        <CheckCircle2 size={16} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                user?.role === 'owner' && (
                                                                    <button 
                                                                        onClick={() => handleUpdateStatus(r.id, 'farmerStatus', 'Pending')}
                                                                        className="text-[10px] text-red-400 hover:underline"
                                                                    >
                                                                        แก้เป็นรอโอน
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {hasEmployee ? (
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1">
                                                            <Users size={14} className="text-purple-500" />
                                                            {recordEmp?.name || 'ลูกจ้าง'}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-bold ${employeePaid ? 'text-gray-300 italic line-through' : 'text-gray-600'}`}>
                                                                ฿ {Number(r.employeeTotal).toLocaleString()}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                {!employeePaid ? (
                                                                    <>
                                                                        <button 
                                                                            onClick={() => openQRModal('employee', r.employeeTotal, recordEmp?.name || 'ลูกจ้าง', recordEmp?.id, r.id)}
                                                                            className="p-1 text-purple-500 hover:bg-purple-50 rounded transition-colors"
                                                                            title="แสดง QR Code"
                                                                        >
                                                                            <QrCode size={16} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleUpdateStatus(r.id, 'employeeStatus', 'Paid')}
                                                                            className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                                                                            title="ทำเครื่องหมายว่าจ่ายแล้ว"
                                                                        >
                                                                            <CheckCircle2 size={16} />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    user?.role === 'owner' && (
                                                                        <button 
                                                                            onClick={() => handleUpdateStatus(r.id, 'employeeStatus', 'Pending')}
                                                                            className="text-[10px] text-red-400 hover:underline"
                                                                        >
                                                                            แก้เป็นรอโอน
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300 text-xs italic">ไม่มีลูกจ้าง</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-base font-black text-rubber-700">฿ {Number(r.total).toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {(farmerPaid && (!hasEmployee || employeePaid)) ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                            <CheckCircle2 size={12} /> จ่ายครบแล้ว
                                                        </span>
                                                        {user?.role === 'owner' && (
                                                            <button 
                                                                onClick={async () => {
                                                                    await handleUpdateStatus(r.id, 'farmerStatus', 'Pending');
                                                                    if (hasEmployee) await handleUpdateStatus(r.id, 'employeeStatus', 'Pending');
                                                                }}
                                                                className="text-[9px] text-gray-400 hover:text-red-500 mt-1"
                                                            >
                                                                รีเซ็ตทั้งหมด
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[10px] text-amber-600 font-bold">รอเคลียร์ยอด</span>
                                                        <button 
                                                            disabled={statusUpdating}
                                                            onClick={async () => {
                                                                if (!farmerPaid) await handleUpdateStatus(r.id, 'farmerStatus', 'Paid');
                                                                if (hasEmployee && !employeePaid) await handleUpdateStatus(r.id, 'employeeStatus', 'Paid');
                                                            }}
                                                            className="px-3 py-1 bg-rubber-600 text-white text-[10px] font-bold rounded hover:bg-rubber-700 transition-all"
                                                        >
                                                            จ่ายทั้งหมด
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* QR Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="bg-blue-600 p-6 text-white relative">
                            <button 
                                onClick={() => setSelectedPayment(null)}
                                className="absolute right-4 top-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white/20 rounded-xl">
                                    <QrCode size={24} />
                                </div>
                                <h3 className="text-xl font-bold">PromptPay QR</h3>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm opacity-80 uppercase tracking-wider font-medium">ชื่อผู้รับ</p>
                                <p className="text-lg font-bold truncate">{selectedPayment.name}</p>
                            </div>
                        </div>
                        
                        <div className="p-8 flex flex-col items-center">
                            <div className="bg-white p-3 border-2 border-dashed border-gray-100 rounded-2xl shadow-inner mb-6">
                                <img 
                                    src={`https://promptpay.io/${selectedPayment.promptpayId}/${selectedPayment.amount}.png`} 
                                    alt="PromptPay QR Code"
                                    className="w-48 h-48"
                                />
                            </div>

                            <div className="w-full bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-500">ยอดเงินโอน</span>
                                    <span className="text-lg font-black text-blue-600">฿ {selectedPayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">PromptPay ID</span>
                                    <span className="text-sm font-bold text-gray-700">{selectedPayment.promptpayId}</span>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => setSelectedPayment(null)}
                                    className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    ปิดหน้าต่าง
                                </button>
                                <button 
                                    onClick={() => {
                                        const field = selectedPayment.type === 'farmer' ? 'farmerStatus' : 'employeeStatus';
                                        handleUpdateStatus(selectedPayment.buyId, field, 'Paid');
                                        setSelectedPayment(null);
                                    }}
                                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={18} /> โอนแล้ว
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payments;
