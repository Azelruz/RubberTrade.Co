import React from 'react';
import { Search, Printer, Trash2 } from 'lucide-react';

export const SavingsTransactionLedger = ({
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    filteredTransactions = [],
    onSelectPrintTx,
    onDeleteTransaction
}) => {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-3">
                <div className="flex items-center space-x-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อสมาชิก, เลขที่บัญชี, หมายเหตุ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="all">ทุกประเภทธุรกรรม</option>
                        <option value="deposit">รายการฝากเงินสด/โอน</option>
                        <option value="withdraw">รายการถอนเงินสด</option>
                        <option value="interest">รายการดอกเบี้ยเงินฝาก</option>
                    </select>
                </div>

                <div className="text-xs text-gray-400 font-medium">
                    ประวัติธุรกรรมเงินฝาก-ถอน {filteredTransactions.length} รายการ
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                        <tr>
                            <th className="py-3 px-4">วันที่</th>
                            <th className="py-3 px-4">รหัส / ชื่อสมาชิก</th>
                            <th className="py-3 px-4">เลขที่บัญชี</th>
                            <th className="py-3 px-4">ประเภทธุรกรรม</th>
                            <th className="py-3 px-4 text-right">จำนวนเงิน (บ.)</th>
                            <th className="py-3 px-4 text-right">ยอดคงเหลือสุทธิ (บ.)</th>
                            <th className="py-3 px-4">ช่องทาง</th>
                            <th className="py-3 px-4">หมายเหตุ</th>
                            <th className="py-3 px-4">ผู้ทำรายการ</th>
                            <th className="py-3 px-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="py-12 text-center text-gray-400">
                                    ยังไม่มีรายการธุรกรรมเงินฝากหรือถอนเงิน
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((tx) => {
                                const isDep = tx.type === 'deposit';
                                const isWd = tx.type === 'withdraw';
                                const isInt = tx.type === 'interest';

                                return (
                                    <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-3 px-4 font-mono font-medium text-gray-600 whitespace-nowrap">
                                            {tx.date}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <div className="font-bold text-gray-900">{tx.memberName}</div>
                                            <div className="text-[10px] text-gray-400 font-mono">{tx.memberNo || '-'}</div>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">
                                            {tx.accountNo || `SA-${tx.memberNo || '000'}`}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                isDep 
                                                    ? 'bg-emerald-100 text-emerald-700' 
                                                    : isWd 
                                                        ? 'bg-rose-100 text-rose-700' 
                                                        : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {isDep ? 'ฝากเงิน' : isWd ? 'ถอนเงิน' : 'ดอกเบี้ยเงินฝาก'}
                                            </span>
                                        </td>
                                        <td className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                                            isDep ? 'text-emerald-600' : isWd ? 'text-rose-600' : 'text-amber-600'
                                        }`}>
                                            {isWd ? '-' : '+'}{Number(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                                            {Number(tx.balanceAfter || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-[11px]">
                                            {tx.paymentMethod === 'transfer' ? 'เงินโอน' : 'เงินสด'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500 max-w-xs truncate text-[11px]">
                                            {tx.note || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-400 text-[10px] whitespace-nowrap">
                                            {tx.recordedBy || 'Admin'}
                                        </td>
                                        <td className="py-3 px-4 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center space-x-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectPrintTx(tx)}
                                                    title="พิมพ์ใบสำคัญรับ/จ่าย"
                                                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                >
                                                    <Printer size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm(`ยืนยันการลบรายการ ${tx.type === 'deposit' ? 'ฝาก' : 'ถอน'} เงินจำนวน ${tx.amount} บาท ของ ${tx.memberName}? ระบบจะคำนวณยอดเงินคงเหลือใหม่`)) {
                                                            onDeleteTransaction(tx.id);
                                                        }
                                                    }}
                                                    title="ลบ/ยกเลิกรายการ"
                                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SavingsTransactionLedger;
