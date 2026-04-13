import React from 'react';
import { 
    Droplets, TrendingUp, Activity, Truck, DollarSign, Wallet, FileText, Users, TrendingDown
} from 'lucide-react';

const StatCard = ({ title, value, icon, bgColor, valueColor, details }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
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

const DashboardStats = ({ stats }) => {
    return (
        <div className="space-y-6">
            {/* Today's Summary */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <span className="w-2 h-6 bg-blue-500 rounded-full mr-2"></span> สรุปรายการวันนี้
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="ยอดรับซื้อวันนี้"
                        value={`฿${Number(stats.todayBuy).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<Droplets className="text-blue-500" size={24} />}
                        bgColor="bg-blue-50"
                        details={[
                            { label: 'น้ำยางสด', value: `฿${Number(stats.todayLatexBuy).toLocaleString()}` },
                            { label: 'ขี้ยาง', value: `฿${Number(stats.todayCupLumpBuy).toLocaleString()}` }
                        ]}
                    />
                    <StatCard
                        title="ปริมาณยางวันนี้"
                        value={`${Number(stats.todayBuyWeight).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กก.`}
                        icon={<TrendingUp className="text-rubber-500" size={24} />}
                        bgColor="bg-rubber-50"
                        details={[
                            { label: 'น้ำยางสด', value: `${Number(stats.todayLatexWeight).toLocaleString()} กก.` },
                            { label: 'ขี้ยาง', value: `${Number(stats.todayCupLumpWeight).toLocaleString()} กก.` }
                        ]}
                    />
                    <StatCard
                        title="เฉลี่ย % DRC วันนี้"
                        value={`${Number(stats.todayAvgDrc).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
                        icon={<Activity className="text-cyan-500" size={24} />}
                        bgColor="bg-cyan-50"
                    />
                    <StatCard
                        title="ยอดขายวันนี้"
                        value={`฿${Number(stats.todaySell).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<Truck className="text-orange-500" size={24} />}
                        bgColor="bg-orange-50"
                    />
                    <StatCard
                        title="ราคายางวันนี้"
                        value={`฿${Number(stats.dailyPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<DollarSign className="text-emerald-500" size={24} />}
                        bgColor="bg-emerald-50"
                    />
                    <StatCard
                        title="ค่าใช้จ่ายวันนี้"
                        value={`฿${Number(stats.todayExpense).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<Wallet className="text-red-500" size={24} />}
                        bgColor="bg-red-50"
                    />
                    <StatCard
                        title="รายการค้างจ่าย"
                        value={`${stats.unpaidBills} รายการ`}
                        icon={<FileText className="text-amber-500" size={24} />}
                        bgColor="bg-amber-50"
                        valueColor="text-amber-700"
                    />
                    <StatCard
                        title="สมาชิกในระบบ"
                        value={`${stats.totalMembers} ราย`}
                        icon={<Users className="text-purple-500" size={24} />}
                        bgColor="bg-purple-50"
                        valueColor="text-purple-700"
                    />
                </div>
            </div>

            {/* Monthly Overview */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-6 bg-green-500 rounded-full mr-2"></span> ภาพรวมผลประกอบการ (เดือนนี้)
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard
                        title="รายรับรวม (ยอดขาย)"
                        value={`฿${Number(stats.monthIncome).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<TrendingUp className="text-green-500" size={24} />}
                        bgColor="bg-green-50"
                    />
                    <StatCard
                        title="ต้นทุนรวม (ซื้อน้ำยาง+ค่าใช้จ่าย)"
                        value={`฿${Number(stats.monthCost).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<TrendingDown className="text-red-500" size={24} />}
                        bgColor="bg-red-50"
                    />
                    <StatCard
                        title="กำไรสุทธิ"
                        value={`${stats.monthProfit >= 0 ? '+' : '-'}฿${Number(Math.abs(stats.monthProfit)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
                        icon={<DollarSign className={`${stats.monthProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} size={24} />}
                        bgColor={stats.monthProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}
                        valueColor={stats.monthProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardStats;
