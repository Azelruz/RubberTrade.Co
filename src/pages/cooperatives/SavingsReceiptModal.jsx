import React, { useRef } from 'react';
import { Printer, X, CheckCircle, ArrowDownLeft, ArrowUpRight, Percent, Building2, User } from 'lucide-react';

export const SavingsReceiptModal = ({ transaction, settings = {}, onClose }) => {
    const printRef = useRef(null);

    if (!transaction) return null;

    const isDeposit = transaction.type === 'deposit';
    const isWithdraw = transaction.type === 'withdraw';
    const isInterest = transaction.type === 'interest';

    const titleText = isDeposit 
        ? 'ใบสำคัญรับเงินฝากสัจจะ / DEPOSIT RECEIPT'
        : isWithdraw 
            ? 'ใบสำคัญจ่ายเงินถอน / WITHDRAWAL VOUCHER'
            : 'ใบแจ้งการจ่ายดอกเบี้ยเงินฝาก / INTEREST CREDIT';

    const previousBalance = isDeposit || isInterest
        ? Math.max(0, Number(transaction.balanceAfter || 0) - Number(transaction.amount || 0))
        : Number(transaction.balanceAfter || 0) + Number(transaction.amount || 0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 print:hidden">
                    <div className="flex items-center space-x-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isDeposit ? 'bg-emerald-100 text-emerald-700' : isWithdraw ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {isDeposit ? <ArrowUpRight size={18} /> : isWithdraw ? <ArrowDownLeft size={18} /> : <Percent size={18} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">
                                {isDeposit ? 'ใบเสร็จรับฝากเงิน' : isWithdraw ? 'ใบสำคัญจ่ายถอนเงิน' : 'ใบแจ้งยอดดอกเบี้ย'}
                            </h3>
                            <p className="text-[11px] text-gray-400 font-mono">
                                เลขที่: {transaction.id?.slice(0, 16)}
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

                {/* Printable Document Area */}
                <div className="p-6 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible" id="printable-savings-slip" ref={printRef}>
                    <div className="border border-gray-200 rounded-2xl p-6 print:border-none print:p-2 text-gray-800">
                        {/* Co-op / Store Header */}
                        <div className="text-center pb-4 border-b border-gray-100">
                            <h2 className="text-base font-black text-gray-900 tracking-tight">
                                {settings.factoryName || 'กลุ่มเกษตรกรและสหกรณ์ยางพารา'}
                            </h2>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {settings.address || 'ระบบบริหารจัดการกลุ่มสมาชิกและกองทุนสัจจะออมทรัพย์'}
                            </p>
                            <div className="inline-block mt-3 px-3 py-1 bg-gray-100 rounded-full text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                                {titleText}
                            </div>
                        </div>

                        {/* Transaction Meta */}
                        <div className="grid grid-cols-2 gap-2 text-xs py-3 border-b border-gray-100">
                            <div>
                                <span className="text-gray-400 block text-[10px]">วันที่ทำรายการ</span>
                                <span className="font-bold font-mono">{transaction.date}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-400 block text-[10px]">เลขที่บัญชีเงินฝาก</span>
                                <span className="font-bold font-mono text-emerald-700">
                                    {transaction.accountNo || `SA-${transaction.memberNo || '000'}`}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-400 block text-[10px]">ชื่อสมาชิก</span>
                                <span className="font-bold text-gray-900">{transaction.memberName}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-400 block text-[10px]">รหัสสมาชิก</span>
                                <span className="font-bold font-mono">{transaction.memberNo || '-'}</span>
                            </div>
                        </div>

                        {/* Financial Ledger Highlight */}
                        <div className="my-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex justify-between items-center text-xs text-gray-500 pb-2 border-b border-gray-200/60">
                                <span>ยอดคงเหลือก่อนทำรายการ:</span>
                                <span className="font-mono font-bold text-gray-700">
                                    {previousBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
                                </span>
                            </div>

                            <div className="flex justify-between items-center py-3">
                                <div>
                                    <span className="text-xs font-black uppercase tracking-wider block text-gray-500">
                                        {isDeposit ? 'จำนวนเงินที่ฝาก' : isWithdraw ? 'จำนวนเงินที่ถอน' : 'จำนวนดอกเบี้ยรับ'}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                        ช่องทาง: {transaction.paymentMethod === 'transfer' ? 'โอนเงิน' : 'เงินสด'}
                                    </span>
                                </div>
                                <span className={`text-2xl font-black font-mono tracking-tight ${
                                    isDeposit ? 'text-emerald-600' : isWithdraw ? 'text-rose-600' : 'text-amber-600'
                                }`}>
                                    {isWithdraw ? '-' : '+'}{Number(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-sans font-bold">บาท</span>
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-gray-200/60 text-emerald-800">
                                <span>ยอดคงเหลือสุทธิหลังทำรายการ:</span>
                                <span className="font-mono text-sm font-black text-emerald-700">
                                    {Number(transaction.balanceAfter || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
                                </span>
                            </div>
                        </div>

                        {/* Note if any */}
                        {transaction.note && (
                            <div className="text-xs text-gray-500 bg-amber-50/60 border border-amber-100 rounded-xl p-2.5 mb-4">
                                <span className="font-bold text-amber-800">หมายเหตุ:</span> {transaction.note}
                            </div>
                        )}

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-6 pt-6 mt-4 border-t border-dashed border-gray-200 text-center text-xs">
                            <div>
                                <div className="h-10 border-b border-gray-300 mx-4"></div>
                                <p className="text-[11px] font-bold text-gray-600 mt-1.5">
                                    ลงชื่อ..................................
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    ( {transaction.memberName} )<br />สมาชิก / ผู้ทำรายการ
                                </p>
                            </div>
                            <div>
                                <div className="h-10 border-b border-gray-300 mx-4"></div>
                                <p className="text-[11px] font-bold text-gray-600 mt-1.5">
                                    ลงชื่อ..................................
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    ( {transaction.recordedBy || 'เจ้าหน้าที่การเงิน'} )<br />เจ้าหน้าที่ผู้รับเงิน/จ่ายเงิน
                                </p>
                            </div>
                        </div>

                        <div className="text-center text-[9px] text-gray-400 mt-6 font-mono">
                            พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')} | RubberTrade System
                        </div>
                    </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2 print:hidden">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        ปิดหน้าต่าง
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center shadow-md shadow-emerald-200"
                    >
                        <Printer size={15} className="mr-1.5" />
                        พิมพ์สลิป / ใบเสร็จ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SavingsReceiptModal;
