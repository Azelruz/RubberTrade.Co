import React from 'react';
import { Wallet, Users } from 'lucide-react';
import PaginationFooter from './PaginationFooter';

export const ExpensesReportTab = ({
    dailyData,
    currentPage,
    setCurrentPage,
    itemsPerPage = 15
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
            {/* General Expenses */}
            <div className="p-0 flex flex-col h-full border-r border-gray-100">
                <div className="bg-[#1e293b] px-8 py-5 flex justify-between items-center text-white">
                    <h3 className="font-black flex items-center tracking-tight">
                        <Wallet size={20} className="mr-3 text-red-400" />
                        ค่าใช้จ่ายทั่วไป
                    </h3>
                    <span className="bg-red-500/20 text-red-400 px-5 py-2 rounded-2xl text-base font-black shadow-inner border border-red-500/20">
                        ฿{dailyData.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                    </span>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-gray-100">
                            {(() => {
                                const paginated = dailyData.expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                                if (dailyData.expenses.length === 0) {
                                    return (
                                        <tr>
                                            <td className="px-8 py-20 text-center text-gray-400 font-medium italic">ไม่มีข้อมูลค่าใช้จ่ายทั่วไป</td>
                                        </tr>
                                    );
                                }
                                return paginated.map((e, idx) => (
                                    <tr key={e.id || idx} className="hover:bg-red-50/30 transition-colors group text-sm">
                                        <td className="px-8 py-5">
                                            <div className="font-black text-gray-900 group-hover:text-red-700 transition-colors">{e.title}</div>
                                            <div className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{e.category || 'ทั่วไป'}</div>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-red-600 font-mono text-base whitespace-nowrap">฿{Number(e.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
                <PaginationFooter totalCount={dailyData.expenses.length} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} />
            </div>

            {/* Wages */}
            <div className="p-0 flex flex-col h-full">
                <div className="bg-[#1e293b] px-8 py-5 flex justify-between items-center text-white border-l border-white/10">
                    <h3 className="font-black flex items-center tracking-tight">
                        <Users size={20} className="mr-3 text-orange-400" />
                        ค่าจ้างพนักงาน
                    </h3>
                    <span className="bg-orange-500/20 text-orange-400 px-5 py-2 rounded-2xl text-base font-black shadow-inner border border-orange-500/20">
                        ฿{dailyData.wages.reduce((sum, w) => sum + Number(w.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                    </span>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <tbody className="divide-y divide-gray-100">
                            {(() => {
                                const paginated = dailyData.wages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                                if (dailyData.wages.length === 0) {
                                    return (
                                        <tr>
                                            <td className="px-8 py-20 text-center text-gray-400 font-medium italic">ไม่มีข้อมูลค่าจ้างพนักงาน</td>
                                        </tr>
                                    );
                                }
                                return paginated.map((w, idx) => (
                                    <tr key={w.id || idx} className="hover:bg-orange-50/30 transition-colors group text-sm">
                                        <td className="px-8 py-5">
                                            <div className="font-black text-gray-900 group-hover:text-orange-700 transition-colors">{w.staffName || 'พนักงาน'}</div>
                                            <div className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{w.role || 'ลูกจ้าง'}</div>
                                        </td>
                                        <td className="px-8 py-5 text-right font-black text-orange-600 font-mono text-base whitespace-nowrap">฿{Number(w.total || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
                <PaginationFooter totalCount={dailyData.wages.length} currentPage={currentPage} setCurrentPage={setCurrentPage} itemsPerPage={itemsPerPage} />
            </div>
        </div>
    );
};

export default ExpensesReportTab;
