import React from 'react';
import { Percent, X, Calculator, CheckCircle2 } from 'lucide-react';

export const SavingsInterestModal = ({
    show = false,
    interestRate,
    setInterestRate,
    interestMonths,
    setInterestMonths,
    interestCalcDate,
    setInterestCalcDate,
    interestPreview,
    isCalculatingInterest,
    isPostingInterest,
    handleCalculateInterest,
    handleConfirmDistributeInterest,
    onClose
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
                    <div className="flex items-center space-x-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                            <Percent size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">
                                ระบบคำนวณและจ่ายดอกเบี้ยเงินฝากอัตโนมัติ
                            </h3>
                            <p className="text-[11px] text-gray-400">
                                คำนวณดอกเบี้ยตามยอดเงินฝากคงเหลือและทบยอดเข้าบัญชีสมาชิกทุกคนพร้อมกัน
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

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Parameters Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                อัตราดอกเบี้ย (% ต่อปี)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={interestRate}
                                    onChange={(e) => setInterestRate(e.target.value)}
                                    className="w-full pl-3 pr-7 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold font-mono focus:ring-2 focus:ring-amber-500"
                                    required
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">%</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                รอบระยะเวลาที่คิด
                            </label>
                            <select
                                value={interestMonths}
                                onChange={(e) => setInterestMonths(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500"
                            >
                                <option value="12">1 ปี (12 เดือน)</option>
                                <option value="6">6 เดือน (ครึ่งปี)</option>
                                <option value="3">3 เดือน (ไตรมาส)</option>
                                <option value="1">1 เดือน</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                ณ วันที่จ่ายดอกเบี้ย
                            </label>
                            <input
                                type="date"
                                value={interestCalcDate}
                                onChange={(e) => setInterestCalcDate(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleCalculateInterest}
                        disabled={isCalculatingInterest}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center shadow-sm transition-all"
                    >
                        <Calculator size={15} className={`mr-1.5 ${isCalculatingInterest ? 'animate-spin' : ''}`} />
                        {isCalculatingInterest ? 'กำลังประมวลผลคำนวณ...' : 'เริ่มคำนวณดอกเบี้ยเพื่อตรวจสอบ (Preview)'}
                    </button>

                    {/* Preview Table Result */}
                    {interestPreview && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <span className="text-[10px] text-emerald-600 font-bold block uppercase">สมาชิกที่จะได้รับ</span>
                                    <span className="text-lg font-black font-mono text-emerald-800">
                                        {interestPreview.summary.totalEligibleMembers}
                                    </span>
                                    <span className="text-[10px] text-emerald-600 font-bold ml-1">ราย</span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-[10px] text-gray-500 font-bold block uppercase">ยอดเงินต้นรวม</span>
                                    <span className="text-lg font-black font-mono text-gray-800">
                                        {interestPreview.summary.totalSavingsPrincipal.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-bold ml-1">บ.</span>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                    <span className="text-[10px] text-amber-600 font-bold block uppercase">ยอดดอกเบี้ยจ่ายรวม</span>
                                    <span className="text-lg font-black font-mono text-amber-700">
                                        +{interestPreview.summary.estimatedTotalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] text-amber-600 font-bold ml-1">บ.</span>
                                </div>
                            </div>

                            <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] border-b border-gray-100">
                                        <tr>
                                            <th className="py-2.5 px-3">รหัส / สมาชิก</th>
                                            <th className="py-2.5 px-3 text-right">เงินฝากคงเหลือ (บ.)</th>
                                            <th className="py-2.5 px-3 text-right">ดอกเบี้ยรับ (+บ.)</th>
                                            <th className="py-2.5 px-3 text-right">ยอดใหม่หลังทบ (บ.)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {interestPreview.distributions.map((d) => (
                                            <tr key={d.memberId} className="hover:bg-gray-50">
                                                <td className="py-2 px-3">
                                                    <span className="font-bold text-gray-900">{d.memberName}</span>
                                                    <span className="text-[10px] text-gray-400 font-mono ml-1.5">({d.memberNo})</span>
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono text-gray-700">
                                                    {d.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">
                                                    +{d.interestAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                                                    {d.newBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                        ปิด
                    </button>
                    {interestPreview && interestPreview.distributions.length > 0 && (
                        <button
                            type="button"
                            onClick={handleConfirmDistributeInterest}
                            disabled={isPostingInterest}
                            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center"
                        >
                            <CheckCircle2 size={15} className={`mr-1.5 ${isPostingInterest ? 'animate-spin' : ''}`} />
                            {isPostingInterest ? 'กำลังบันทึกจ่ายดอกเบี้ย...' : `ยืนยันจ่ายดอกเบี้ยเข้าบัญชีสมาชิกทั้งหมด (${interestPreview.distributions.length} ราย)`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SavingsInterestModal;
