import React, { useState, useEffect } from 'react';
import { 
    History, 
    Search, 
    Filter, 
    Plus, 
    Pencil, 
    Trash2, 
    Info, 
    Calendar,
    User,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    X,
    FileJson,
    Building2,
    Zap
} from 'lucide-react';
import { fetchActivityLogs, adminFetchReportUsers } from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
const ActivityLog = () => {
    const { user: currentUser } = useAuth();
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [offset, setOffset] = useState(0);
    const [expandedRow, setExpandedRow] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [filters, setFilters] = useState({ userId: '', type: '', action: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const LIMIT = 20;

    const isSuperAdmin = currentUser?.role?.toLowerCase() === 'super_admin';

    useEffect(() => {
        if (isSuperAdmin) {
            const fetchUsers = async () => {
                try {
                    const data = await adminFetchReportUsers();
                    setUsersList(data || []);
                } catch (err) {
                    console.error('Error fetching users for filter:', err);
                }
            };
            fetchUsers();
        }
    }, [isSuperAdmin]);

    const loadLogs = async (newOffset = 0) => {
        setIsLoading(true);
        try {
            const params = {
                limit: LIMIT,
                offset: newOffset,
                ...filters
            };
            // Clean empty filters
            Object.keys(params).forEach(key => (params[key] === '' || params[key] === 'all') && delete params[key]);
            const res = await fetchActivityLogs(params);
            if (res.status === 'success') {
                setLogs(res.results);
                setTotal(res.total);
            } else {
                toast.error('ไม่สามารถดึงข้อมูลประวัติได้: ' + res.message);
            }
        } catch (err) {
            toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadLogs(offset);
    }, [offset, filters]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        // If user manually selects from dropdown, clear the search query to avoid confusion
        if (key === 'userId') setSearchQuery('');
        setOffset(0); // Reset to first page
    };

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        
        // Logic: Try to find a direct match in usersList by name/store, 
        // otherwise assume it's a raw UserID string
        const searchTerm = searchQuery.trim().toLowerCase();
        if (!searchTerm) {
            handleFilterChange('userId', '');
            return;
        }

        const foundUser = usersList.find(u => 
            (u.store_name && u.store_name.toLowerCase().includes(searchTerm)) || 
            (u.username && u.username.toLowerCase().includes(searchTerm)) ||
            (u.id.toLowerCase() === searchTerm)
        );

        if (foundUser) {
            handleFilterChange('userId', foundUser.id);
        } else {
            // Assume it's a raw UserID if it looks like a prefix or UUID
            handleFilterChange('userId', searchTerm);
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATE': return <Plus className="text-green-500" size={16} />;
            case 'UPDATE': return <Pencil className="text-blue-500" size={16} />;
            case 'DELETE': return <Trash2 className="text-red-500" size={16} />;
            default: return <Info className="text-gray-400" size={16} />;
        }
    };

    const getEntityLabel = (type) => {
        const labels = {
            'buys': 'รายการซื้อ (Buy)',
            'sells': 'รายการขาย (Sell)',
            'farmers': 'เกษตรกร',
            'employees': 'ลูกจ้าง',
            'staff': 'พนักงาน',
            'factories': 'โรงงาน',
            'expenses': 'ค่าใช้จ่าย',
            'wages': 'ค่าจ้าง',
            'trucks': 'รถขนส่ง',
            'settings': 'ตั้งค่าระบบ',
            'subscriptions': 'สิทธิการสมัคร',
            'packages': 'แพ็กเกจสมาชิก'
        };
        return labels[type] || type;
    };

    const formatDateTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('th-TH', { 
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const renderDiff = (oldData, newData) => {
        if (!oldData && !newData) return <p className="text-gray-400 italic">ไม่มีข้อมูลแสดงผล</p>;
        
        // If it's an update, we might want to highlight changes
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {oldData && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ข้อมูลเดิม (Before)</div>
                        <div className="bg-gray-900 text-green-400 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-60 custom-scrollbar">
                            <pre>{JSON.stringify(oldData, null, 2)}</pre>
                        </div>
                    </div>
                )}
                {newData && (
                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-rubber-600 uppercase tracking-widest">ข้อมูลใหม่ (After) {oldData ? '/ ปัจจุบัน' : ''}</div>
                        <div className="bg-gray-900 text-blue-300 p-4 rounded-xl text-[11px] font-mono overflow-auto max-h-60 custom-scrollbar">
                            <pre>{JSON.stringify(newData, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center">
                        <History className="mr-3 text-rubber-600" />
                        บันทึกความเคลื่อนไหว (Activity Log)
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">ติดตามประวัติการเพิ่ม แก้ไข หรือลบข้อมูลสำคัญในกิจการของคุณ</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    {/* UserID Search (Express) - Super Admin Only */}
                    {isSuperAdmin && (
                        <form onSubmit={handleSearchSubmit} className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Search size={14} />
                            </div>
                            <input 
                                type="text"
                                placeholder="ค้นหา UserID หรือชื่อร้าน..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onBlur={() => handleSearchSubmit()}
                                className="pl-9 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-rubber-500 shadow-sm min-w-[200px]"
                            />
                        </form>
                    )}

                    <div className="h-6 w-px bg-gray-100 mx-1 hidden md:block"></div>

                    {/* User Filter (Super Admin Only) */}
                    {isSuperAdmin && (
                        <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <Building2 size={16} />
                            </div>
                            <select 
                                value={filters.userId}
                                onChange={(e) => handleFilterChange('userId', e.target.value)}
                                className="pl-10 pr-8 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-rubber-500 shadow-sm min-w-[160px]"
                            >
                                <option value="">เลือกทุกร้านค้า (All Stores)</option>
                                {usersList.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.store_name || u.username} ({u.username})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    )}

                    {/* Type Filter */}
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Filter size={14} />
                        </div>
                        <select 
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            className="pl-9 pr-8 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-rubber-500 shadow-sm"
                        >
                            <option value="">ทั้งหมด (All Types)</option>
                            <option value="buys">รายการซื้อ (Buy)</option>
                            <option value="sells">รายการขาย (Sell)</option>
                            <option value="farmers">เกษตรกร</option>
                            <option value="employees">ลูกจ้าง</option>
                            <option value="staff">พนักงาน</option>
                            <option value="factories">โรงงาน</option>
                            <option value="expenses">ค่าใช้จ่าย</option>
                            <option value="wages">ค่าจ้าง</option>
                            <option value="trucks">รถขนส่ง</option>
                            <option value="settings">ตั้งค่าระบบ</option>
                            <option value="subscriptions">สิทธิการสมัคร</option>
                            <option value="packages">แพ็กเกจสมาชิก</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Action Filter */}
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Zap size={14} />
                        </div>
                        <select 
                            value={filters.action}
                            onChange={(e) => handleFilterChange('action', e.target.value)}
                            className="pl-9 pr-8 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-700 appearance-none focus:outline-none focus:ring-2 focus:ring-rubber-500 shadow-sm"
                        >
                            <option value="">ทุกการกระทำ (All Actions)</option>
                            <option value="CREATE">เพิ่มข้อมูล (CREATE)</option>
                            <option value="UPDATE">แก้ไขข้อมูล (UPDATE)</option>
                            <option value="DELETE">ลบข้อมูล (DELETE)</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="flex items-center space-x-2">
                        {(filters.userId || filters.type || filters.action) && (
                            <button 
                                onClick={() => {
                                    setFilters({ userId: '', type: '', action: '' });
                                    setSearchQuery('');
                                    setOffset(0);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
                                title="ล้างตัวกรองทั้งหมด"
                            >
                                <X size={20} />
                            </button>
                        )}
                        <button 
                            onClick={() => loadLogs(offset)}
                            disabled={isLoading}
                            className="flex items-center space-x-2 px-4 py-2 bg-rubber-600 rounded-xl shadow-lg shadow-rubber-200 text-xs font-black text-white hover:bg-rubber-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            <span className="hidden sm:inline">รีเฟรช</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entity & ID</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Who</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">When</th>
                                <th className="px-6 py-4 text-center"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading && logs.length === 0 ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-20"></div></td>
                                        <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-28"></div></td>
                                        <td className="px-6 py-6"></td>
                                    </tr>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr className={`hover:bg-gray-50/50 transition-colors group ${expandedRow === log.id ? 'bg-gray-50/50' : ''}`}>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`p-2 rounded-xl bg-opacity-10 ${
                                                        log.action === 'CREATE' ? 'bg-green-100 text-green-600' : 
                                                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-600' : 
                                                        'bg-red-100 text-red-600'
                                                    }`}>
                                                        {getActionIcon(log.action)}
                                                    </div>
                                                    <span className={`text-xs font-black tracking-wider ${
                                                        log.action === 'CREATE' ? 'text-green-700' : 
                                                        log.action === 'UPDATE' ? 'text-blue-700' : 
                                                        'text-red-700'
                                                    }`}>
                                                        {log.action}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">{getEntityLabel(log.entityType)}</span>
                                                    <span className="text-[10px] font-mono text-gray-400">{log.entityId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center text-xs font-bold text-gray-600">
                                                    <User size={14} className="mr-2 text-gray-400" />
                                                    {log.username}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center text-xs text-gray-500 font-medium">
                                                    <Calendar size={14} className="mr-2 text-gray-300" />
                                                    {formatDateTime(log.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button 
                                                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                                                    className={`p-2 rounded-lg transition-all ${expandedRow === log.id ? 'bg-rubber-600 text-white shadow-lg shadow-rubber-200' : 'bg-white border border-gray-100 text-gray-400 hover:text-rubber-600 hover:border-rubber-200'}`}
                                                >
                                                    {expandedRow === log.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedRow === log.id && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan="5" className="px-8 py-8 border-t border-gray-100">
                                                    <div className="animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center space-x-3">
                                                                <FileJson className="text-rubber-600" size={20} />
                                                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">รายละเอียดการเปลี่ยนแปลงข้อมูล (Data Snapshot)</h4>
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 font-mono bg-white px-3 py-1 rounded-full border border-gray-200">
                                                                IP: {log.ip_address}
                                                            </div>
                                                        </div>
                                                        {renderDiff(log.oldData, log.newData)}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center">
                                        <div className="max-w-xs mx-auto flex flex-col items-center">
                                            <div className="p-4 bg-gray-50 rounded-full text-gray-300 mb-4">
                                                <History size={40} />
                                            </div>
                                            <p className="text-gray-400 font-bold">ไม่พบประวัติความเคลื่อนไหว</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > LIMIT && (
                    <div className="bg-white border-t border-gray-50 px-6 py-4 flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400">Showing {offset + 1} to {Math.min(offset + LIMIT, total)} of {total} events</p>
                        <div className="flex space-x-2">
                            <button 
                                disabled={offset === 0}
                                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                                className="px-4 py-2 text-xs font-bold bg-white border border-gray-100 rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95"
                            >
                                Previous
                            </button>
                            <button 
                                disabled={offset + LIMIT >= total}
                                onClick={() => setOffset(offset + LIMIT)}
                                className="px-4 py-2 text-xs font-bold bg-rubber-600 text-white rounded-xl shadow-lg shadow-rubber-200 hover:bg-rubber-700 disabled:opacity-50 transition-all active:scale-95"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
