import React from 'react';
import { Droplets, Truck, PieChart } from 'lucide-react';

export const DailyReportFooter = ({ dailyData, user }) => {
    const latexBuyTotal = dailyData.buys.filter(b => (b.rubberType || 'latex') === 'latex').reduce((sum, b) => sum + Number(b.total || 0), 0);
    const cupLumpBuyTotal = dailyData.buys.filter(b => b.rubberType === 'cup_lump' || b.rubberType === 'ขี้ยาง').reduce((sum, b) => sum + Number(b.total || 0), 0);
    const totalBuy = latexBuyTotal + cupLumpBuyTotal;

    const latexSellTotal = dailyData.sells.filter(s => (s.rubberType || 'latex') === 'latex').reduce((sum, s) => sum + Number(s.total || 0), 0);
    const cupLumpSellTotal = dailyData.sells.filter(s => s.rubberType === 'cup_lump' || s.rubberType === 'ขี้ยาง').reduce((sum, s) => sum + Number(s.total || 0), 0);
    const totalSell = latexSellTotal + cupLumpSellTotal;

    const totalExpense = dailyData.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalWage = dailyData.wages.reduce((sum, w) => sum + Number(w.total || 0), 0);
    const netProfit = totalSell - totalBuy - totalExpense - totalWage;
    const isStaff = user?.role === 'staff';
    const displayProfit = isStaff ? '***' : `฿${netProfit.toLocaleString(undefined, { minimumFractionDigits: 1 })}`;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pb-10">
            {/* Total Buys Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 flex flex-col group hover:border-blue-500 transition-all">
                <div className="flex items-center space-x-4 mb-3">
                    <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-600 transition-colors duration-500 shadow-inner">
                        <Droplets className="text-blue-600 group-hover:text-white transition-colors duration-500" size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">ยอดรับซื้อรวม</p>
                        <p className="text-2xl font-black text-gray-900 leading-none">฿{totalBuy.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
                    </div>
                </div>
                <div className="flex border-t border-gray-50 pt-3 mt-auto">
                    <div className="flex-1 text-center border-r border-gray-50">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">น้ำยาง</p>
                        <p className="text-xs font-black text-blue-700">+฿{latexBuyTotal.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">ขี้ยาง</p>
                        <p className="text-xs font-black text-orange-700">+฿{cupLumpBuyTotal.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Total Sells Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 flex flex-col group hover:border-orange-500 transition-all">
                <div className="flex items-center space-x-4 mb-3">
                    <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-600 transition-colors duration-500 shadow-inner">
                        <Truck className="text-orange-600 group-hover:text-white transition-colors duration-500" size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">ยอดขายรวม</p>
                        <p className="text-2xl font-black text-gray-900 leading-none">฿{totalSell.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
                    </div>
                </div>
                <div className="flex border-t border-gray-50 pt-3 mt-auto">
                    <div className="flex-1 text-center border-r border-gray-50">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">น้ำยาง</p>
                        <p className="text-xs font-black text-blue-700">฿{latexSellTotal.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 text-center">
                        <p className="text-[9px] font-bold text-gray-400 uppercase">ขี้ยาง</p>
                        <p className="text-xs font-black text-orange-700">฿{cupLumpSellTotal.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Net Profit Card */}
            <div className={`p-5 rounded-2xl border shadow-xl transition-all duration-500 flex flex-col
                ${isStaff || netProfit >= 0
                    ? 'bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] border-emerald-400 shadow-emerald-200/50' 
                    : 'bg-gradient-to-br from-red-600 via-red-700 to-red-800 border-red-500 shadow-red-200/50'}`}>
                <div className="flex items-center space-x-4 mb-3">
                    <div className="p-3 bg-white/20 rounded-xl shadow-lg backdrop-blur-md">
                        <PieChart className="text-white" size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/70 uppercase tracking-widest leading-none mb-1">กำไรสุทธิ</p>
                        <p className="text-2xl font-black text-white leading-none">{displayProfit}</p>
                    </div>
                </div>
                <div className="flex border-t border-white/10 pt-3 mt-auto">
                    <div className="flex-1 text-center border-r border-white/10">
                        <p className="text-[9px] font-bold text-white/50 uppercase">จ่ายพนักงาน</p>
                        <p className="text-xs font-black text-white">-฿{totalWage.toLocaleString()}</p>
                    </div>
                    <div className="flex-1 text-center">
                        <p className="text-[9px] font-bold text-white/50 uppercase">จ่ายทั่วไป</p>
                        <p className="text-xs font-black text-white">-฿{totalExpense.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyReportFooter;
