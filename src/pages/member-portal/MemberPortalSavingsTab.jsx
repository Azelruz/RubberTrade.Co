import React from 'react';
import { PiggyBank, BookOpen, Calendar, Droplets } from 'lucide-react';

export const MemberPortalSavingsTab = ({
    member,
    accounts,
    selectedAccount,
    setSelectedAccId,
    filteredTx,
    setActiveTab
}) => {
    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Total Balance Card Banner */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg shadow-emerald-700/20">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200 block">
                    ยอดเงินฝากรวมทุกบัญชี
                </span>
                <h2 className="text-3xl font-black font-mono mt-1 text-white tracking-tight">
                    {Number(member?.savingsBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-sans font-bold">บาท</span>
                </h2>
                <p className="text-emerald-200 text-xs mt-2 flex items-center">
                    <BookOpen size={14} className="mr-1 text-emerald-300" />
                    ถือสมุดเงินฝากทั้งหมด {accounts.length} เล่ม
                </p>
            </div>

            {/* Savings Accounts Selector & Statement */}
            {accounts.length === 0 ? (
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs text-center space-y-3">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
                        <PiggyBank size={28} />
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900 text-base">ยังไม่มีสมุดบัญชีเงินฝากสัจจะ</h4>
                        <p className="text-xs text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                            ท่านเป็นเกษตรกรในระบบ สามารถดูสถิติการส่งน้ำยาง และข้อมูลแปลงสวนยางได้ที่แท็บด้านบน
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setActiveTab('deliveries')}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 active:scale-95"
                    >
                        <Droplets size={14} />
                        <span>ไปที่แท็บประวัติส่งน้ำยาง</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-600">
                            เลือกสมุดบัญชีเงินฝาก:
                        </span>
                        <span className="text-[11px] text-gray-400">
                            {accounts.length} เล่ม
                        </span>
                    </div>

                    {/* Account Selector Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {accounts.map(acc => {
                            const isSelected = (selectedAccount?.id === acc.id);
                            return (
                                <button
                                    key={acc.id}
                                    onClick={() => setSelectedAccId(acc.id)}
                                    className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex flex-col text-left shrink-0 ${
                                        isSelected 
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-500' 
                                            : 'bg-white text-gray-700 border border-gray-200/80 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="text-[11px] truncate">{acc.accountName}</span>
                                    <span className={`font-mono text-[10px] ${isSelected ? 'text-emerald-100' : 'text-gray-400'}`}>
                                        {acc.accountNo}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected Account Detail Card */}
                    {selectedAccount && (
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                        สมุดบัญชีเล่มที่เลือก
                                    </span>
                                    <h3 className="text-base font-black text-gray-900">
                                        {selectedAccount.accountName}
                                    </h3>
                                    <span className="text-xs font-mono font-bold text-emerald-700">
                                        เลขที่: {selectedAccount.accountNo}
                                    </span>
                                    {selectedAccount.openedDate && (
                                        <span className="text-[10px] text-gray-400 block mt-0.5">
                                            เปิดเมื่อ: {selectedAccount.openedDate}
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-gray-400 block font-bold">ยอดคงเหลือในเล่มนี้</span>
                                    <span className="text-2xl font-black font-mono text-emerald-600">
                                        {Number(selectedAccount.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] text-gray-400 block">บาท</span>
                                </div>
                            </div>

                            {/* Account Statement Table */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                                    <span className="flex items-center">
                                        <Calendar size={13} className="mr-1 text-gray-400" />
                                        รายการเคลื่อนไหวบัญชี (Statement)
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-mono">
                                        {filteredTx.length} รายการ
                                    </span>
                                </h4>

                                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] border-b border-gray-100">
                                            <tr>
                                                <th className="py-2 px-2.5">วันที่</th>
                                                <th className="py-2 px-2.5">รายการ</th>
                                                <th className="py-2 px-2.5 text-right">จำนวน (บ.)</th>
                                                <th className="py-2 px-2.5 text-right">คงเหลือ (บ.)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 font-mono text-[11px]">
                                            {filteredTx.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-gray-400 font-sans">
                                                        ยังไม่มีรายการในสมุดเล่มนี้
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredTx.map(t => {
                                                    const isWd = t.type === 'withdraw';
                                                    return (
                                                        <tr key={t.id} className="hover:bg-gray-50">
                                                            <td className="py-2.5 px-2.5 text-gray-600">{t.date}</td>
                                                            <td className="py-2.5 px-2.5 font-sans font-bold">
                                                                <span className={t.type === 'deposit' ? 'text-emerald-700' : isWd ? 'text-rose-700' : 'text-amber-700'}>
                                                                    {t.type === 'deposit' ? 'ฝาก' : isWd ? 'ถอน' : 'ดอกเบี้ย'}
                                                                </span>
                                                            </td>
                                                            <td className={`py-2.5 px-2.5 text-right font-bold ${isWd ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                                {isWd ? '-' : '+'}{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="py-2.5 px-2.5 text-right font-black text-gray-900">
                                                                {Number(t.balanceAfter || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MemberPortalSavingsTab;
