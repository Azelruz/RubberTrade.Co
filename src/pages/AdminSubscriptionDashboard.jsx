import React, { useState, useEffect } from 'react';
import { 
    Users, DollarSign, TrendingUp, CreditCard, 
    ArrowUpRight, ArrowDownRight, Package, Calendar,
    Activity, ShieldCheck, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { adminFetchSubscriptionDashboard } from '../services/apiService';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export default function AdminSubscriptionDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await adminFetchSubscriptionDashboard();
            if (res.status === 'success') {
                setData(res.data);
            } else {
                toast.error(res.message || 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้');
            }
        } catch (error) {
            console.error('Fetch Dashboard Error:', error);
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rubber-600"></div>
            </div>
        );
    }

    if (!data) return null;

    const { user_summary, financial_summary, package_stats, revenue_trend, recent_activity } = data;

    const COLORS = ['#0D9488', '#8B5CF6', '#F59E0B', '#EF4444', '#3B82F6'];

    const pieData = [
        { name: 'Active', value: user_summary.active || 0 },
        { name: 'Trial', value: user_summary.trial || 0 },
        { name: 'Expired', value: user_summary.expired || 0 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-gray-900">ภาพรวมระบบสมาชิก</h1>
                <p className="text-sm text-gray-500 font-medium">สถิติและข้อมูลเชิงลึกสำหรับ Super Admin</p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    title="รายได้รวมทั้งหมด" 
                    value={financial_summary.total_revenue || 0} 
                    unit="บาท"
                    icon={<DollarSign className="text-emerald-600" size={24} />}
                    color="bg-emerald-50"
                    trend="+12%" // Placeholder trend
                    isCurrency
                />
                <MetricCard 
                    title="รายได้เดือนนี้" 
                    value={financial_summary.monthly_revenue || 0} 
                    unit="บาท"
                    icon={<TrendingUp className="text-blue-600" size={24} />}
                    color="bg-blue-50"
                    isCurrency
                />
                <MetricCard 
                    title="จำนวนร้านค้าทั้งหมด" 
                    value={user_summary.total || 0} 
                    unit="ร้าน"
                    icon={<Building2 size={24} className="text-purple-600" />}
                    color="bg-purple-50"
                />
                <MetricCard 
                    title="สมาชิก Active" 
                    value={user_summary.active || 0} 
                    unit="ราย"
                    icon={<ShieldCheck size={24} className="text-rubber-600" />}
                    color="bg-teal-50"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Trend Line Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            <Calendar size={18} className="mr-2 text-blue-500" />
                            แนวโน้มรายได้ย้อนหลัง 6 เดือน
                        </h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenue_trend}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="month" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 12, fill: '#6B7280'}}
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 12, fill: '#6B7280'}}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [new Intl.NumberFormat().format(value) + ' บาท', 'รายได้']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#3B82F6" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Member Status Pie Chart */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6">สัดส่วนสถานะสมาชิก</h3>
                    <div className="h-[250px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Package Popularity */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center">
                        <Package size={20} className="mr-2 text-rubber-600" />
                        ความนิยมแพ็กเกจ
                    </h3>
                    <div className="space-y-4">
                        {package_stats.map((pkg, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-gray-700">{pkg.name}</span>
                                    <span className="text-gray-900">{pkg.count} ราย</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div 
                                        className="bg-rubber-500 h-2 rounded-full transition-all duration-1000" 
                                        style={{ width: `${(pkg.count / user_summary.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center">
                        <Activity size={20} className="mr-2 text-purple-600" />
                        รายการความเคลื่อนไหวล่าสุด
                    </h3>
                    <div className="space-y-4">
                        {recent_activity.length > 0 ? (
                            recent_activity.map((activity, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-xl ${activity.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {activity.status === 'approved' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">{activity.store_name || activity.username}</div>
                                            <div className="text-[10px] text-gray-400 font-medium">{activity.package_name} • {formatDate(activity.requestedAt)}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-black text-rubber-700">
                                        ฿{new Intl.NumberFormat().format(activity.amount)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">ไม่มีรายการล่าสุด</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, unit, icon, color, trend, isCurrency }) {
    return (
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
                <div className={`${color} p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300`}>
                    {icon}
                </div>
                {trend && (
                    <div className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <ArrowUpRight size={12} className="mr-0.5" />
                        {trend}
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
                <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-gray-900">
                        {isCurrency ? new Intl.NumberFormat().format(value) : value}
                    </span>
                    <span className="text-xs font-bold text-gray-400">{unit}</span>
                </div>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                {React.cloneElement(icon, { size: 64 })}
            </div>
        </div>
    );
}

// Custom Building2 as MetricCard needs it
function Building2({ size, className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M15 2h2a2 2 0 0 1 2 2v18"/><path d="M17 22h2"/>
        </svg>
    );
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = parseISO(dateStr.replace(' ', 'T'));
        return format(date, 'd MMM yy (HH:mm)', { locale: th });
    } catch {
        return dateStr;
    }
}
