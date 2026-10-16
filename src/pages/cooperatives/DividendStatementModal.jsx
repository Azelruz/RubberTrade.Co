import React, { useRef } from 'react';
import { X, Printer, Download, Award, CheckCircle, Wallet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const DividendStatementModal = ({ distribution, period, settings, onClose }) => {
    const printRef = useRef(null);

    if (!distribution) return null;

    const handlePrint = () => {
        window.print();
    };

    const storeName = settings?.factoryName || 'ร้านรับซื้อน้ำยางพารา';
    const storeAddress = settings?.address || '';
    const storePhone = settings?.phone || '';

    const isFormulaA = period?.patronageFormulaType === 'dry_rubber';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 border border-gray-100 flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center no-print">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-900">ใบแจ้งยอดเงินปันผลและเงินเฉลี่ยคืน</h3>
                            <p className="text-xs text-gray-500 font-medium">Dividend & Patronage Refund Statement</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center shadow-md shadow-emerald-200"
                        >
                            <Printer size={15} className="mr-1.5" />
                            พิมพ์เอกสาร
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Content */}
                <div ref={printRef} className="p-8 overflow-y-auto flex-1 space-y-6 text-gray-800 print:p-0 print:m-0">
                    
                    {/* Statement Header */}
                    <div className="text-center border-b pb-5 border-gray-200">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">{storeName}</h2>
                        {storeAddress && <p className="text-xs text-gray-500 mt-1">{storeAddress}</p>}
                        {storePhone && <p className="text-xs text-gray-500">โทรศัพท์: {storePhone}</p>}
                        
                        <div className="mt-3 inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-1.5 rounded-full text-sm font-black">
                            {period?.title || `ใบแจ้งยอดเงินปันผล-เฉลี่ยคืน ประจำปี ${period?.year || ''}`}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 font-mono">
                            รอบระยะเวลา: {period?.startDate || '-'} ถึง {period?.endDate || '-'}
                        </p>
                    </div>

                    {/* Member Details */}
                    <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <span className="text-gray-400 font-bold block">รหัสสมาชิก (Member No.):</span>
                            <span className="text-sm font-black text-gray-900 font-mono">{distribution.memberNo}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 font-bold block">ชื่อ-สกุล สมาชิก:</span>
                            <span className="text-sm font-black text-gray-900">{distribution.memberName}</span>
                        </div>
                        {distribution.orgPosition && distribution.orgPosition !== 'member' && (
                            <div>
                                <span className="text-gray-400 font-bold block">ตำแหน่งในองค์กร:</span>
                                <span className="font-bold text-emerald-700 uppercase">{distribution.orgPosition}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-400 font-bold block">บัญชีรับเงินโอน:</span>
                            <span className="font-medium text-gray-700">
                                {distribution.bankName ? `${distribution.bankName} (${distribution.bankAccount || '-'})` : (distribution.bankAccount || 'รับเงินสด')}
                            </span>
                        </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-100/80 border-b border-gray-200 text-gray-600 font-bold">
                                <tr>
                                    <th className="py-3 px-4 text-left">รายการสิทธิประโยชน์</th>
                                    <th className="py-3 px-4 text-right">ฐานการคำนวณ</th>
                                    <th className="py-3 px-4 text-right">อัตรา</th>
                                    <th className="py-3 px-4 text-right">จำนวนเงิน (บาท)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {/* 1. Share Dividend */}
                                <tr>
                                    <td className="py-3 px-4">
                                        <p className="font-bold text-gray-800">1. เงินปันผลตามหุ้น (Dividend on Shares)</p>
                                        <p className="text-[10px] text-gray-400">ถือหุ้นสะสม {Number(distribution.shareCount || 0).toLocaleString()} หุ้น</p>
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-medium">
                                        {Number(distribution.shareValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-medium text-gray-600">
                                        {period?.dividendShareRate || 0}%
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                                        {Number(distribution.dividendShareAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>

                                {/* 2. Patronage Refund */}
                                <tr>
                                    <td className="py-3 px-4">
                                        <p className="font-bold text-gray-800">2. เงินเฉลี่ยคืนตามยอดธุรกิจ (Patronage Refund)</p>
                                        <p className="text-[10px] text-gray-400">
                                            {isFormulaA 
                                                ? `เนื้อยางแห้งรวม ${Number(distribution.businessDryRubberKg || 0).toLocaleString()} กก. (สด ${Number(distribution.businessVolumeKg || 0).toLocaleString()} กก.)`
                                                : `ยอดขายยางรวม ${Number(distribution.businessTotalAmount || 0).toLocaleString()} บาท`}
                                        </p>
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-medium">
                                        {isFormulaA
                                            ? `${Number(distribution.businessDryRubberKg || 0).toLocaleString()} กก. DRC`
                                            : `${Number(distribution.businessTotalAmount || 0).toLocaleString()} บ.`}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-medium text-gray-600">
                                        {isFormulaA
                                            ? `${period?.patronageRefundRate || 0} บ./กก.`
                                            : `${period?.patronageRefundRate || 0}%`}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                                        {Number(distribution.patronageRefundAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>

                                {/* 3. Board Bonus (If any) */}
                                {Number(distribution.boardBonusAmount || 0) > 0 && (
                                    <tr>
                                        <td className="py-3 px-4">
                                            <p className="font-bold text-gray-800">3. เงินโบนัสตอบแทนคณะกรรมการ</p>
                                            <p className="text-[10px] text-gray-400">ตามสัดส่วนการปฏิบัติหน้าที่ ({distribution.orgPosition})</p>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-medium text-gray-400">-</td>
                                        <td className="py-3 px-4 text-right font-mono font-medium text-gray-400">-</td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                                            {Number(distribution.boardBonusAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                )}

                                {/* Gross Total */}
                                <tr className="bg-gray-50/60 font-bold">
                                    <td colSpan={3} className="py-2.5 px-4 text-right text-gray-700">
                                        รวมยอดจัดสรรทั้งสิ้น (Gross Payout):
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono text-gray-900 text-sm">
                                        {Number(distribution.grossPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>

                                {/* Debt Deductions (If any) */}
                                {Number(distribution.deductedLoanAmount || 0) > 0 && (
                                    <tr className="text-red-600 bg-red-50/40">
                                        <td colSpan={3} className="py-2.5 px-4 text-right font-bold">
                                            หัก: ชำระหนี้เงินกู้ค้างชำระ (Auto-deducted Loan Debt):
                                        </td>
                                        <td className="py-2.5 px-4 text-right font-mono font-bold">
                                            -{Number(distribution.deductedLoanAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                )}

                                {/* Net Payout */}
                                <tr className="bg-emerald-50 font-black text-emerald-900 text-sm">
                                    <td colSpan={3} className="py-3.5 px-4 text-right">
                                        ยอดเงินที่ได้รับสุทธิ (Net Payout):
                                    </td>
                                    <td className="py-3.5 px-4 text-right font-mono text-base text-emerald-700">
                                        {Number(distribution.netPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Payment Status & Signatures */}
                    <div className="pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center text-xs mb-8">
                            <div>
                                <span className="text-gray-400 font-bold mr-2">สถานะการจ่าย:</span>
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                    distribution.payoutStatus === 'paid' 
                                        ? 'bg-emerald-100 text-emerald-800' 
                                        : distribution.payoutStatus === 'reinvested'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {distribution.payoutStatus === 'paid' ? 'จ่ายเงินเรียบร้อยแล้ว' : distribution.payoutStatus === 'reinvested' ? 'ทบเป็นทุนเรือนหุ้น' : 'รอการจ่ายเงิน'}
                                </span>
                                {distribution.paidDate && <span className="text-gray-400 ml-2 font-mono">วันที่: {distribution.paidDate}</span>}
                            </div>
                            <div className="text-gray-400 text-[10px] font-mono">
                                พิมพ์เมื่อ: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: th })}
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4">
                            <div>
                                <div className="border-b border-gray-300 w-48 mx-auto mb-2 pb-8"></div>
                                <p className="font-bold text-gray-800">(.........................................................)</p>
                                <p className="text-gray-400 text-[11px] mt-0.5">ผู้รับเงิน / สมาชิก</p>
                            </div>
                            <div>
                                <div className="border-b border-gray-300 w-48 mx-auto mb-2 pb-8"></div>
                                <p className="font-bold text-gray-800">(.........................................................)</p>
                                <p className="text-gray-400 text-[11px] mt-0.5">ผู้มีอำนาจลงนาม / เหรัญญิกกลุ่ม</p>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};
