import React from 'react';
import { PiggyBank, ArrowUpRight, ArrowDownLeft, Percent } from 'lucide-react';

export const SavingsMetricsCards = ({
    totalSavingsBalance = 0,
    activeSavingsAccountsCount = 0,
    totalMembers = 0,
    totalDeposits = 0,
    totalWithdrawals = 0,
    totalInterestPaid = 0
}) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-6 text-white shadow-lg shadow-emerald-700/20">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200 block">
                    ยอดเงินฝากรวมสะสมทั้งกลุ่ม
                </span>
                <h3 className="text-2xl md:text-3xl font-black font-mono mt-1 text-white tracking-tight">
                    {totalSavingsBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-sans font-bold">บาท</span>
                </h3>
                <p className="text-emerald-200 text-xs mt-2 flex items-center">
                    <PiggyBank size={14} className="mr-1 text-emerald-300" />
                    สมาชิกมีเงินฝาก {activeSavingsAccountsCount} / {totalMembers} ราย
                </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block">
                        ยอดรับฝากเงินสะสม
                    </span>
                    <h3 className="text-2xl font-black font-mono mt-1 text-emerald-600 tracking-tight">
                        +{totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-sans text-gray-500 font-bold">บ.</span>
                    </h3>
                </div>
                <p className="text-gray-400 text-xs mt-2 flex items-center">
                    <ArrowUpRight size={14} className="mr-1 text-emerald-500" />
                    รายการฝากเงินสด & เงินโอน
                </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block">
                        ยอดถอนเงินสะสม
                    </span>
                    <h3 className="text-2xl font-black font-mono mt-1 text-rose-600 tracking-tight">
                        -{totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-sans text-gray-500 font-bold">บ.</span>
                    </h3>
                </div>
                <p className="text-gray-400 text-xs mt-2 flex items-center">
                    <ArrowDownLeft size={14} className="mr-1 text-rose-500" />
                    รายการถอนเงินสด
                </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block">
                        ดอกเบี้ยจ่ายสะสม
                    </span>
                    <h3 className="text-2xl font-black font-mono mt-1 text-amber-600 tracking-tight">
                        {totalInterestPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-sans text-gray-500 font-bold">บ.</span>
                    </h3>
                </div>
                <p className="text-gray-400 text-xs mt-2 flex items-center">
                    <Percent size={14} className="mr-1 text-amber-500" />
                    ทบเข้าเงินฝากให้สมาชิก
                </p>
            </div>
        </div>
    );
};

export default SavingsMetricsCards;
