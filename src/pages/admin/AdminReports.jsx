import React, { useState, useEffect } from 'react';
import { 
    BarChart3, 
    Users, 
    Calendar, 
    List, 
    Truck, 
    TrendingUp, 
    Filter,
    Droplets,
    FileText,
    ArrowRight,
    Search,
    Loader2,
    Database
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { adminFetchReportUsers, adminFetchReportData, adminFetchUsageStats, adminTriggerBackfill } from '../../services/apiService';
import DatabaseManagement from '../../components/admin/DatabaseManagement';

const AdminReports = () => {
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [activeTab, setActiveTab] = useState('daily'); // daily, monthly, buys, sells
    const [loading, setLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
    const [usageData, setUsageData] = useState(null);

    // Fetch users on mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const result = await adminFetchReportUsers();
                setUsers(result);
                if (result.length > 0) {
                    setSelectedUserId(result[0].id);
                }
            } catch (err) {
                toast.error('โหลดรายชื่อผู้ใช้ไม่สำเร็จ หรือคุณไม่มีสิทธิ์เข้าถึง');
            } finally {
                setUsersLoading(false);
            }
        };
        fetchUsers();
    }, []);

    // Fetch data when userId, tab, or date/month changes
    useEffect(() => {
        if (!selectedUserId) return;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'usage' || activeTab === 'db') {
                    if (activeTab === 'usage') {
                        const usage = await adminFetchUsageStats(selectedUserId);
                        setUsageData(usage);
                    }
                    setData({}); // Clear report data
                } else {
                    let action = '';
                    let params = { userId: selectedUserId };
                    
                    if (activeTab === 'daily') {
                        action = 'getDailySummary';
                        params.date = selectedDate;
                    } else if (activeTab === 'monthly') {
                        action = 'getMonthlySummary';
                        params.month = selectedMonth;
                    } else if (activeTab === 'buys') {
                        action = 'getBuysHistory';
                    } else if (activeTab === 'sells') {
                        action = 'getSellsHistory';
                    }

                    const result = await adminFetchReportData(action, params);
                    setData(result);
                }
            } catch (err) {
                toast.error('โหลดข้อมูลรายงานไม่สำเร็จ');
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [selectedUserId, activeTab, selectedDate, selectedMonth]);

    const formatNumber = (num) => {
        return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);
    };

    if (usersLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="animate-spin text-rubber-600 mb-4" size={32} />
                <p className="text-gray-500">กำลังโหลดรายชื่อผู้ประกอบการ...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <BarChart3 className="mr-2 text-rubber-600" size={28} />
                        รายงานระบบ (Admin)
                    </h1>
                    <p className="text-gray-500 text-sm">ตรวจสอบความเคลื่อนไหวแยกตามรายชื่อผู้ประกอบการ</p>
                </div>

                <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <Users size={18} className="text-gray-400 ml-2" />
                    <select 
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="border-none focus:ring-0 text-sm font-bold text-gray-700 min-w-[200px]"
                    >
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.store_name || u.username}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                {[
                    { id: 'daily', label: 'สรุปรายวัน', icon: <Calendar size={16} /> },
                    { id: 'monthly', label: 'รายงานรายเดือน', icon: <TrendingUp size={16} /> },
                    { id: 'buys', label: 'ประวัติรับซื้อ', icon: <Droplets size={16} /> },
                    { id: 'sells', label: 'ประวัติขาย', icon: <Truck size={16} /> },
                    { id: 'usage', label: 'การใช้งานระบบ', icon: <List size={16} /> },
                    { id: 'db', label: 'จัดการฐานข้อมูล', icon: <Database size={16} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center space-x-2 px-6 py-2 rounded-lg text-sm font-bold transition-all
                            ${activeTab === tab.id 
                                ? 'bg-white text-rubber-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                        `}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Filters for specific tabs */}
            {(activeTab === 'daily' || activeTab === 'monthly') && (
                <div className="flex items-center space-x-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center space-x-2">
                        <Filter size={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase">เลือกช่วงเวลา:</span>
                    </div>
                    {activeTab === 'daily' ? (
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="text-sm border-gray-200 rounded-lg focus:ring-rubber-500"
                        />
                    ) : (
                        <input 
                            type="month" 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="text-sm border-gray-200 rounded-lg focus:ring-rubber-500"
                        />
                    )}
                </div>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 italic text-gray-400">
                    <Loader2 className="animate-spin mb-2" />
                    กำลังดึงข้อมูล...
                </div>
            ) : data ? (
                <div className="animate-in fade-in duration-500">
                    {activeTab === 'daily' || activeTab === 'monthly' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Stats Cards */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                                        <Droplets size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ยอดรวมรับซื้อ</span>
                                </div>
                                <div className="text-2xl font-black text-gray-900">{formatNumber(data.buys?.totalAmount)}</div>
                                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-50">
                                    <div className="text-center">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ยางแห้งรวม</div>
                                        <div className="text-sm font-bold text-gray-900">{formatNumber(data.buys?.totalDryWeight)} กก.</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">%DRC เฉลี่ย</div>
                                        <div className="text-sm font-bold text-blue-600">{formatNumber(data.buys?.avgDrc)}%</div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 mt-3 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <ArrowRight size={12} className="mr-1" />
                                        น้ำหนักรวม {formatNumber(data.buys?.totalWeight)} กก.
                                    </div>
                                    <div className="flex items-center text-rubber-600 font-bold">
                                        <Users size={12} className="mr-1" />
                                        {data.buys?.uniqueFarmers} สมาชิก
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                        <Truck size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ยอดรวมขายส่ง</span>
                                </div>
                                <div className="text-2xl font-black text-gray-900">{formatNumber(data.sells?.totalAmount)}</div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center">
                                    <ArrowRight size={12} className="mr-1" />
                                    น้ำหนักรวม {formatNumber(data.sells?.totalWeight)} กก. ({data.sells?.count} รายการ)
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">กำไรเบื้องต้น</span>
                                </div>
                                <div className={`text-2xl font-black ${(data.sells?.totalAmount - data.buys?.totalAmount - data.expenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatNumber(data.sells?.totalAmount - data.buys?.totalAmount - data.expenses)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center">
                                    <ArrowRight size={12} className="mr-1" />
                                    หักค่าใช้จ่ายรวม {formatNumber(data.expenses)}
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'usage' && usageData ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* Overview Statistics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">พื้นที่ใช้ไป (Est.)</div>
                                    <div className="text-xl font-black text-indigo-600">
                                        {usageData.snapshot?.totalStorageKb > 1024 
                                            ? (usageData.snapshot?.totalStorageKb / 1024).toFixed(2) + ' MB' 
                                            : usageData.snapshot?.totalStorageKb.toFixed(2) + ' KB'}
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ข้อมูลทั้งหมด</div>
                                    <div className="text-xl font-black text-gray-900">{usageData.snapshot?.totalRows.toLocaleString()} <span className="text-xs font-normal text-gray-500">แถว</span></div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">API Hits (30d)</div>
                                    <div className="text-xl font-black text-purple-600">
                                        {usageData.daily.reduce((acc, curr) => acc + (curr.queryCount || 0), 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">การจัดการข้อมูล</div>
                                    <button 
                                        onClick={async () => {
                                            toast.loading('กำลังคำนวณข้อมูลย้อนหลัง...', { id: 'backfill' });
                                            await adminTriggerBackfill();
                                            const usage = await adminFetchUsageStats(selectedUserId);
                                            setUsageData(usage);
                                            toast.success('คำนวณข้อมูลเสร็จสิ้น', { id: 'backfill' });
                                        }}
                                        className="text-xs text-white bg-rubber-600 px-3 py-1 rounded-lg font-bold hover:bg-rubber-700 transition-colors"
                                    >
                                        คำนวณใหม่
                                    </button>
                                </div>
                            </div>

                            {/* Table Detailed Breakdown */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center">
                                    <Database size={14} className="mr-2" />
                                    รายละเอียดการจัดเก็บแยกตามตาราง
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    {usageData.snapshot?.tableStats.map(table => (
                                        <div key={table.name} className="p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-rubber-200 transition-colors">
                                            <div className="text-[9px] font-bold text-gray-400 uppercase truncate mb-1" title={table.name}>{table.name}</div>
                                            <div className="text-sm font-black text-gray-900">{table.count.toLocaleString()} <span className="text-[9px] text-gray-400 font-normal">rows</span></div>
                                            <div className="text-[10px] text-rubber-600 font-medium">{table.estSizeKb.toFixed(1)} KB</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Row Activity Log */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center">
                                        <FileText size={14} className="mr-2" />
                                        ประวัติการจัดการข้อมูล (30 วันล่าสุด)
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase">วันที่</th>
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase text-center">API Queries</th>
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase text-center text-green-600">Rows Read</th>
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase text-center text-blue-600">Rows Written</th>
                                                <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase text-center text-red-600">Rows Deleted</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {usageData.daily.map(log => (
                                                <tr key={log.date} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-bold text-gray-700">
                                                        {format(new Date(log.date), 'dd MMM yyyy', { locale: th })}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-center font-bold text-gray-900">{log.queryCount.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-xs text-center font-bold text-green-600">{log.rowsRead.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-xs text-center font-bold text-blue-600">{log.rowsWritten.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-xs text-center font-bold text-red-600">{log.rowsDeleted.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {usageData.daily.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">ไม่มีบันทึกข้อมูลย้อนหลัง</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">วันที่</th>
                                            {activeTab === 'buys' ? (
                                                <>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">เกษตรกร</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">น้ำหนัก</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">DRC%</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">ยอดเงิน</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">ผู้ซื้อ/โรงงาน</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">น้ำหนัก</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">ยอดเงิน</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {Array.isArray(data) && data.length > 0 ? data.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-600">
                                                    {format(new Date(item.date), 'dd MMM yyyy', { locale: th })}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                                    {item.farmerName || item.buyerName || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                                                    {formatNumber(item.weight)}
                                                </td>
                                                {activeTab === 'buys' && (
                                                    <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right">
                                                        {item.drc}%
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-sm font-black text-gray-900 text-right">
                                                    {formatNumber(item.total)}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                                                    <Database className="mx-auto mb-2 opacity-20" size={32} />
                                                    ไม่พบข้อมูลในช่วงที่เวลาที่เลือก
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'db' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <DatabaseManagement isAdminMode={true} targetUserId={selectedUserId} />
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 text-gray-400">
                    กรุณาเลือกผู้ประกอบการเพื่อดูรายงาน
                </div>
            )}
        </div>
    );
};

export default AdminReports;
