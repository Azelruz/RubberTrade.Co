import React from 'react';
import { ArrowUpRight, ArrowDownLeft, X, RefreshCw, CheckCircle2, BookPlus } from 'lucide-react';

export const SavingsTxModal = ({
    show = false,
    txType = 'deposit',
    selectedMemberId,
    setSelectedMemberId,
    selectedAccountId,
    setSelectedAccountId,
    amount,
    setAmount,
    date,
    setDate,
    paymentMethod,
    setPaymentMethod,
    note,
    setNote,
    isSubmitting = false,
    members = [],
    accounts = [],
    currentSelectedMember = null,
    currentMemberAccounts = [],
    currentSelectedAccount = null,
    handleTxSubmit,
    onClose,
    onOpenAccountForMember
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center space-x-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            txType === 'deposit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                            {txType === 'deposit' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">
                                {txType === 'deposit' ? 'บันทึกรับฝากเงินสด / โอน' : 'บันทึกถอนเงินสด'}
                            </h3>
                            <p className="text-[11px] text-gray-400">
                                บัญชีเงินฝากสัจจะออมทรัพย์สมาชิก
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleTxSubmit} className="p-6 space-y-4">
                    {/* Member Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            เลือกสมาชิก <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={selectedMemberId}
                            onChange={(e) => {
                                const newMemberId = e.target.value;
                                setSelectedMemberId(newMemberId);
                                const memAccs = accounts.filter(a => a.memberId === newMemberId && a.status !== 'closed');
                                setSelectedAccountId(memAccs[0]?.id || '');
                            }}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                            required
                        >
                            <option value="" disabled>-- เลือกสมาชิก --</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.memberNo ? `[${m.memberNo}] ` : ''}{m.name} (คงเหลือ: {Number(m.savingsBalance || 0).toLocaleString()} บ.)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Account Selection (Multi-Account Support) */}
                    {currentSelectedMember && (
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold text-gray-700">
                                    เลือกสมุดบัญชีเงินฝาก <span className="text-rose-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => onOpenAccountForMember(currentSelectedMember.id)}
                                    className="text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline flex items-center"
                                >
                                    <BookPlus size={11} className="mr-0.5" /> + เปิดสมุดบัญชีใหม่
                                </button>
                            </div>
                            {currentMemberAccounts.length > 0 ? (
                                <select
                                    value={currentSelectedAccount?.id || ''}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500"
                                >
                                    {currentMemberAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.accountNo} - {acc.accountName} (คงเหลือ {Number(acc.balance || 0).toLocaleString()} บ.)
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 flex items-center justify-between">
                                    <span>สมุดบัญชีหลัก (SA-{currentSelectedMember.memberNo || '001'})</span>
                                    <span className="font-mono font-bold text-emerald-600">
                                        {Number(currentSelectedMember.savingsBalance || 0).toLocaleString()} บ.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Current Balance Banner */}
                    {currentSelectedMember && (
                        <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-2xl flex items-center justify-between text-xs">
                            <div>
                                <span className="text-[10px] font-bold uppercase text-gray-400 block">ยอดคงเหลือในสมุดที่เลือก</span>
                                <span className="font-bold text-gray-800">
                                    {currentSelectedAccount ? `${currentSelectedAccount.accountName} (${currentSelectedAccount.accountNo})` : currentSelectedMember.name}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="font-mono text-base font-black text-emerald-600">
                                    {Number(currentSelectedAccount?.balance ?? currentSelectedMember.savingsBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-gray-400 block">บาท</span>
                            </div>
                        </div>
                    )}

                    {/* Amount & Quick Max for Withdraw */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-gray-700">
                                จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
                            </label>
                            {txType === 'withdraw' && (Number(currentSelectedAccount?.balance ?? currentSelectedMember?.savingsBalance ?? 0) > 0) && (
                                <button
                                    type="button"
                                    onClick={() => setAmount(String(currentSelectedAccount?.balance ?? currentSelectedMember?.savingsBalance ?? 0))}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100"
                                >
                                    ถอนทั้งหมด (เหลือ 0 บ.)
                                </button>
                            )}
                        </div>
                        <input
                            type="number"
                            step="any"
                            min="0.01"
                            max={txType === 'withdraw' ? (currentSelectedAccount?.balance ?? currentSelectedMember?.savingsBalance ?? 0) : undefined}
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-black font-mono focus:ring-2 focus:ring-emerald-500 focus:bg-white text-gray-900"
                            required
                        />
                        {txType === 'withdraw' && (
                            <p className="text-[10px] text-gray-400 mt-1">
                                ถอนได้สูงสุด {Number(currentSelectedAccount?.balance ?? currentSelectedMember?.savingsBalance ?? 0).toLocaleString()} บาท (ถอนได้จนเหลือ 0 บาท)
                            </p>
                        )}
                    </div>

                    {/* Date & Payment Method */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">วันที่</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ช่องทางชำระ</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                            >
                                <option value="cash">เงินสด</option>
                                <option value="transfer">เงินโอน</option>
                            </select>
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">หมายเหตุ / รายละเอียด</label>
                        <input
                            type="text"
                            placeholder="เช่น ฝากสัจจะประจำเดือน, ถอนค่าใช้จ่าย..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-3 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center ${
                                txType === 'deposit' 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                            }`}
                        >
                            {isSubmitting ? (
                                <RefreshCw size={15} className="animate-spin mr-1.5" />
                            ) : (
                                <CheckCircle2 size={15} className="mr-1.5" />
                            )}
                            {isSubmitting ? 'กำลังบันทึก...' : txType === 'deposit' ? 'ยืนยันบันทึกรับฝากเงิน' : 'ยืนยันบันทึกจ่ายเงินถอน'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SavingsTxModal;
