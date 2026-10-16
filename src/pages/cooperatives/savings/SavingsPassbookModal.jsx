import React from 'react';
import { BookOpen, QrCode, X, BookPlus, FileText } from 'lucide-react';

export const SavingsPassbookModal = ({
    show = false,
    selectedPassbookMember = null,
    selectedPassbookAccountId = 'all',
    setSelectedPassbookAccountId,
    accounts = [],
    transactions = [],
    onSetQrMember,
    onOpenAccountForMember,
    openTxModal,
    onClose
}) => {
    if (!show || !selectedPassbookMember) return null;

    const passbookMemberAccounts = accounts.filter(a => a.memberId === selectedPassbookMember.id && a.status !== 'closed');
    const activePassbookAccount = passbookMemberAccounts.find(a => a.id === selectedPassbookAccountId) || null;

    const passbookTransactions = transactions
        .filter(t => t.memberId === selectedPassbookMember.id)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
                    <div className="flex items-center space-x-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                            <BookOpen size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">
                                สมุดบัญชีเงินฝากสัจจะ (Passbook Statement)
                            </h3>
                            <p className="text-[11px] text-emerald-800 font-bold">
                                {selectedPassbookMember.name} (รหัส: {selectedPassbookMember.memberNo})
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => onSetQrMember(selectedPassbookMember)}
                            className="px-2.5 py-1.5 bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold flex items-center transition-all shadow-sm"
                            title="ดู QR Code บัตรสมาชิก / สมุดเงินฝากดิจิทัล"
                        >
                            <QrCode size={13} className="mr-1 text-blue-600" />
                            QR บัตร & สมุด
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-all"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Account Selector Tabs (if multiple accounts) */}
                {passbookMemberAccounts.length > 0 && (
                    <div className="px-6 pt-3 pb-2 bg-gray-50/80 border-b border-gray-100 flex items-center space-x-2 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setSelectedPassbookAccountId('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                selectedPassbookAccountId === 'all'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-200/60'
                            }`}
                        >
                            รวมทุกบัญชี ({passbookMemberAccounts.length})
                        </button>
                        {passbookMemberAccounts.map(acc => (
                            <button
                                key={acc.id}
                                type="button"
                                onClick={() => setSelectedPassbookAccountId(acc.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                                    selectedPassbookAccountId === acc.id
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-200/60'
                                }`}
                            >
                                <span>{acc.accountName}</span>
                                <span className="font-mono text-[10px] opacity-80">({acc.accountNo})</span>
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => onOpenAccountForMember(selectedPassbookMember.id)}
                            className="px-2.5 py-1 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg text-xs font-bold whitespace-nowrap flex items-center transition-all border border-teal-200"
                        >
                            <BookPlus size={12} className="mr-1" /> + เปิดบัญชีเพิ่ม
                        </button>
                    </div>
                )}

                {/* Account Summary Banner */}
                <div className="p-6 bg-white border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                            {activePassbookAccount ? 'ชื่อและเลขที่บัญชีเงินฝาก' : 'ภาพรวมสมุดเงินฝาก'}
                        </span>
                        <span className="font-mono text-base font-black text-gray-900">
                            {activePassbookAccount ? `${activePassbookAccount.accountNo} (${activePassbookAccount.accountName})` : `SA-${selectedPassbookMember.memberNo || '000'}`}
                        </span>
                        <span className="text-xs text-gray-500 block mt-0.5">
                            เบอร์โทร: {selectedPassbookMember.phone || '-'} {activePassbookAccount?.openedDate ? `• เปิดเมื่อ: ${activePassbookAccount.openedDate}` : ''}
                        </span>
                    </div>

                    <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-right w-full sm:w-auto">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                            {activePassbookAccount ? 'ยอดเงินฝากในสมุดเล่มนี้' : 'ยอดเงินฝากรวมทุกบัญชี'}
                        </span>
                        <span className="font-mono text-2xl font-black text-emerald-700">
                            {Number(activePassbookAccount ? activePassbookAccount.balance : selectedPassbookMember.savingsBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-emerald-800 font-bold ml-1">บาท</span>
                    </div>
                </div>

                {/* Passbook Table */}
                <div className="p-6 overflow-y-auto flex-1">
                    <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                        <span className="flex items-center">
                            <FileText size={14} className="mr-1.5 text-gray-400" />
                            ประวัติรายการเคลื่อนไหวบัญชี (Statement)
                        </span>
                        <span className="text-[11px] text-gray-400">
                            {passbookTransactions.length} รายการ
                        </span>
                    </h4>

                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] border-b border-gray-100">
                                <tr>
                                    <th className="py-2.5 px-3">วันที่</th>
                                    <th className="py-2.5 px-3">รายการ</th>
                                    {selectedPassbookAccountId === 'all' && <th className="py-2.5 px-3">สมุดบัญชี</th>}
                                    <th className="py-2.5 px-3 text-right">ถอนเงิน (-)</th>
                                    <th className="py-2.5 px-3 text-right">ฝากเงิน (+)</th>
                                    <th className="py-2.5 px-3 text-right">คงเหลือ (บ.)</th>
                                    <th className="py-2.5 px-3">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {passbookTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={selectedPassbookAccountId === 'all' ? 7 : 6} className="py-8 text-center text-gray-400">
                                            ยังไม่มีประวัติรายการฝากหรือถอนในบัญชีนี้
                                        </td>
                                    </tr>
                                ) : (
                                    passbookTransactions.map(t => {
                                        const isWd = t.type === 'withdraw';
                                        const isDep = t.type === 'deposit';
                                        const isInt = t.type === 'interest';
                                        return (
                                            <tr key={t.id} className="hover:bg-gray-50 font-mono text-[11px]">
                                                <td className="py-2 px-3 text-gray-600">{t.date}</td>
                                                <td className="py-2 px-3 font-sans font-bold">
                                                    <span className={isDep ? 'text-emerald-700' : isWd ? 'text-rose-700' : 'text-amber-700'}>
                                                        {isDep ? 'ฝากเงิน' : isWd ? 'ถอนเงิน' : 'ดอกเบี้ย'}
                                                    </span>
                                                </td>
                                                {selectedPassbookAccountId === 'all' && (
                                                    <td className="py-2 px-3 font-sans text-gray-500 text-[10px]">
                                                        {t.accountName || t.accountNo || '-'}
                                                    </td>
                                                )}
                                                <td className="py-2 px-3 text-right text-rose-600 font-bold">
                                                    {isWd ? Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td className="py-2 px-3 text-right text-emerald-600 font-bold">
                                                    {!isWd ? Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td className="py-2 px-3 text-right font-black text-gray-900">
                                                    {Number(t.balanceAfter || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2 px-3 font-sans text-gray-400 truncate max-w-xs">
                                                    {t.note || '-'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                openTxModal('deposit', selectedPassbookMember.id, activePassbookAccount?.id || '');
                            }}
                            className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs hover:bg-emerald-100 transition-all border border-emerald-200"
                        >
                            + ฝากเงินเข้าบัญชีนี้
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                openTxModal('withdraw', selectedPassbookMember.id, activePassbookAccount?.id || '');
                            }}
                            className="px-3.5 py-1.5 bg-rose-50 text-rose-700 font-bold rounded-xl text-xs hover:bg-rose-100 transition-all border border-rose-200"
                        >
                            - ถอนเงินจากบัญชีนี้
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SavingsPassbookModal;
