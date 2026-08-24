import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Droplets, TrendingUp, Activity, Truck, DollarSign, Wallet, FileText, Users, TrendingDown, FlaskConical, UserX
} from 'lucide-react';

const StatCard = ({ title, value, icon, bgColor, valueColor, details, onClick }) => (
    <div 
        onClick={onClick}
        className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:border-rose-300 hover:shadow-md transition-all' : ''}`}
    >
        <div className={`p-4 rounded-full ${bgColor}`}>
            {icon}
        </div>
        <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className={`text-2xl font-bold ${valueColor || 'text-gray-900'}`}>{value}</p>
            {details && details.length > 0 && (
                <div className="mt-2 space-y-1">
                    {details.map((d, i) => (
                        <div key={i} className="flex justify-between items-center text-sm uppercase tracking-tight font-black">
                            <span className="text-gray-400">{d.label}</span>
                            <span className="text-gray-700">{d.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

const formatVal = (val, prefix = '', suffix = '') => {
    if (val === '***') return '***';
    const num = Number(val);
    if (isNaN(num)) return '-';
    return `${prefix}${num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${suffix}`;
};

const DashboardStats = ({ stats, visibleStats }) => {
    const navigate = useNavigate();
    const isVisible = (id) => !visibleStats || visibleStats.includes(id);

    const allStatCards = [
        {
            id: 'today_buy',
            component: (
                <StatCard
                    key="today_buy"
                    title="ยอดรับซื้อวันนี้"
                    value={formatVal(stats.todayBuy, '฿')}
                    icon={<Droplets className="text-blue-500" size={24} />}
                    bgColor="bg-blue-50"
                    details={[
                        { label: 'น้ำยางสด', value: formatVal(stats.todayLatexBuy, '฿') },
                        { label: 'ขี้ยาง', value: formatVal(stats.todayCupLumpBuy, '฿') }
                    ]}
                />
            )
        },
        {
            id: 'today_weight',
            component: (
                <StatCard
                    key="today_weight"
                    title="ปริมาณยางวันนี้"
                    value={formatVal(stats.todayBuyWeight, '', ' กก.')}
                    icon={<TrendingUp className="text-rubber-500" size={24} />}
                    bgColor="bg-rubber-50"
                    details={[
                        { label: 'น้ำยางสด', value: formatVal(stats.todayLatexWeight, '', ' กก.') },
                        { label: 'ขี้ยาง', value: formatVal(stats.todayCupLumpWeight, '', ' กก.') }
                    ]}
                />
            )
        },
        {
            id: 'today_dry_weight',
            component: (
                <StatCard
                    key="today_dry_weight"
                    title="ยอดรวมยางแห้งวันนี้"
                    value={formatVal(stats.todayTotalDryWeight || 0, '', ' กก.')}
                    icon={<FlaskConical className="text-indigo-500" size={24} />}
                    bgColor="bg-indigo-50"
                    valueColor="text-indigo-900"
                    details={[
                        { label: 'คำนวณจาก DRC น้ำยางสด', value: '' }
                    ]}
                />
            )
        },
        {
            id: 'today_drc',
            component: (
                <StatCard
                    key="today_drc"
                    title="เฉลี่ย % DRC วันนี้"
                    value={formatVal(stats.todayAvgDrc, '', '%')}
                    icon={<Activity className="text-cyan-500" size={24} />}
                    bgColor="bg-cyan-50"
                    details={[
                        { label: 'เฉพาะน้ำยางสด', value: '' }
                    ]}
                />
            )
        },
        {
            id: 'today_sell',
            component: (
                <StatCard
                    key="today_sell"
                    title="ยอดขายวันนี้"
                    value={formatVal(stats.todaySell, '฿')}
                    icon={<Truck className="text-orange-500" size={24} />}
                    bgColor="bg-orange-50"
                />
            )
        },
        {
            id: 'daily_price',
            component: (
                <StatCard
                    key="daily_price"
                    title="ราคายางวันนี้"
                    value={formatVal(stats.dailyPrice || stats.cupLumpPrice || 0, '฿')}
                    icon={<DollarSign className="text-emerald-500" size={24} />}
                    bgColor="bg-emerald-50"
                    details={[
                        { label: 'น้ำยางสด', value: formatVal(stats.dailyPrice, '฿') },
                        { label: 'ขี้ยาง', value: formatVal(stats.cupLumpPrice, '฿') }
                    ]}
                />
            )
        },
        {
            id: 'today_expense',
            component: (
                <StatCard
                    key="today_expense"
                    title="ค่าใช้จ่ายวันนี้"
                    value={formatVal(stats.todayExpense, '฿')}
                    icon={<Wallet className="text-red-500" size={24} />}
                    bgColor="bg-red-50"
                />
            )
        },
        {
            id: 'unpaid_bills',
            component: (
                <StatCard
                    key="unpaid_bills"
                    title="รายการค้างจ่าย"
                    value={`${stats.unpaidBills || 0} รายการ`}
                    icon={<FileText className="text-amber-500" size={24} />}
                    bgColor="bg-amber-50"
                    valueColor="text-amber-700"
                />
            )
        },
        {
            id: 'total_members',
            component: (
                <StatCard
                    key="total_members"
                    title="สมาชิกในระบบ"
                    value={`${stats.totalMembers || 0} ราย`}
                    icon={<Users className="text-purple-500" size={24} />}
                    bgColor="bg-purple-50"
                    valueColor="text-purple-700"
                />
            )
        },
        {
            id: 'inactive_farmers_15d',
            component: (
                <StatCard
                    key="inactive_farmers_15d"
                    title="ลูกค้าไม่เคลื่อนไหว (15 วัน)"
                    value={`${stats.inactiveFarmers15Days || 0} ราย`}
                    icon={<UserX className="text-rose-500" size={24} />}
                    bgColor="bg-rose-50"
                    valueColor="text-rose-700"
                    onClick={() => navigate('/settings', { state: { activeTab: 'farmers_employees', activityFilter: 'custom_days', customDaysThreshold: 15 } })}
                    details={[
                        { label: 'ไม่มีซื้อขาย 15 วันล่าสุด', value: 'ดูรายชื่อ ➔' }
                    ]}
                />
            )
        }
    ];

    const monthlyStatCards = [
        {
            id: 'monthly_income',
            component: (
                <StatCard
                    key="monthly_income"
                    title="รายรับรวม (ยอดขาย)"
                    value={formatVal(stats.monthIncome, '฿')}
                    icon={<TrendingUp className="text-green-500" size={24} />}
                    bgColor="bg-green-50"
                />
            )
        },
        {
            id: 'monthly_cost',
            component: (
                <StatCard
                    key="monthly_cost"
                    title="ต้นทุนรวม (ซื้อน้ำยาง+ค่าใช้จ่าย)"
                    value={formatVal(stats.monthCost, '฿')}
                    icon={<TrendingDown className="text-red-500" size={24} />}
                    bgColor="bg-red-50"
                />
            )
        },
        {
            id: 'monthly_profit',
            component: (
                <StatCard
                    key="monthly_profit"
                    title="กำไรสุทธิ"
                    value={stats.monthProfit === '***' ? '***' : `${stats.monthProfit >= 0 ? '+' : '-'}฿${Number(Math.abs(stats.monthProfit)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                    icon={<DollarSign className={`${stats.monthProfit === '***' || stats.monthProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} size={24} />}
                    bgColor={stats.monthProfit === '***' || stats.monthProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}
                    valueColor={stats.monthProfit === '***' || stats.monthProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}
                />
            )
        }
    ];

    const activeDailyCards = allStatCards.filter(c => isVisible(c.id));
    const activeMonthlyCards = monthlyStatCards.filter(c => isVisible(c.id));

    if (activeDailyCards.length === 0 && activeMonthlyCards.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Daily Summary Section */}
            {activeDailyCards.length > 0 && (
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center">
                            <span className="w-2 h-6 bg-blue-500 rounded-full mr-2"></span> สรุปรายการวันนี้
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {activeDailyCards.map(c => c.component)}
                    </div>
                </div>
            )}

            {/* Monthly Overview Section */}
            {activeMonthlyCards.length > 0 && (
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                        <span className="w-2 h-6 bg-green-500 rounded-full mr-2"></span> ภาพรวมผลประกอบการ (เดือนนี้)
                    </h2>
                    <div className={`grid grid-cols-1 gap-4 ${
                        activeMonthlyCards.length === 1 ? 'sm:grid-cols-1' :
                        activeMonthlyCards.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
                    }`}>
                        {activeMonthlyCards.map(c => c.component)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardStats;
