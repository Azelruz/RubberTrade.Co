import React from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

export const DividendWizardStep2 = ({
    allocatedProfit,
    patronageFormulaType,
    setPatronageFormulaType,
    patronageRefundRate,
    setPatronageRefundRate,
    reservePct,
    setReservePct,
    welfarePct,
    setWelfarePct,
    boardBonusPct,
    setBoardBonusPct,
    dividendShareRate,
    setDividendShareRate,
    runSimulation,
    setWizardStep
}) => {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
            <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">ขั้นตอนที่ 2: เลือกสูตรเงินเฉลี่ยคืนและสัดส่วนกองทุน</h3>
                <p className="text-xs text-gray-400 mt-1">เลือกสูตรที่เหมาะสมกับรอบการผลิตของกลุ่มเพื่อประโยชน์สูงสุดแก่สมาชิก</p>
            </div>

            {/* Zero Profit Warning */}
            {Number(allocatedProfit || 0) <= 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs flex items-center space-x-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                    <div>
                        <span className="font-bold block">ไม่มีกำไรสุทธิสำหรับจัดสรรปันผลในงวดนี้ (ยอดจัดสรร 0.00 บาท)</span>
                        <span className="text-[11px] text-amber-700">
                            เนื่องจากผลประกอบการขาดทุนสุทธิหรือไม่ได้ระบุยอดจัดสรร อัตราปันผลตามหุ้นและเงินเฉลี่ยคืนจะไม่ถูกจ่ายให้สมาชิก (ยอดรับสุทธิจะเป็น 0 บาท) หากต้องการนำกำไรสะสมมาจัดสรร กรุณาย้อนกลับไปขั้นตอนที่ 1 เพื่อระบุยอดจัดสรร
                        </span>
                    </div>
                </div>
            )}

            {/* Formula Selector with Advisory Cards */}
            <div className="space-y-3">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wider">
                    เลือกรูปแบบสูตรการคำนวณเงินเฉลี่ยคืน (Patronage Refund Formula)
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Formula A */}
                    <div 
                        onClick={() => setPatronageFormulaType('dry_rubber')}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                            patronageFormulaType === 'dry_rubber'
                                ? 'border-emerald-600 bg-emerald-50/50 shadow-md shadow-emerald-100'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs">
                                สูตร [ก]: คิดตาม กก. ยางแห้ง (DRC)
                            </span>
                            {patronageFormulaType === 'dry_rubber' && (
                                <CheckCircle2 size={18} className="text-emerald-600" />
                            )}
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm mt-1">
                            เฉลี่ยคืนตามเนื้อยางแห้งบริสุทธิ์ (บาท / กก. DRC)
                        </h4>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                            ✅ <strong>แนะนำสำหรับ:</strong> รอบปีที่ราคายางพาราผันผวนสูง หรือต้องการจูงใจให้สมาชิกดูแลรักษาคุณภาพ %DRC น้ำยางสด (สมาชิกทำยางคุณภาพสูงจะได้เงินคืนคุ้มค่าที่สุด)
                        </p>
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-600">อัตราเฉลี่ยคืน:</span>
                            <div className="flex items-center space-x-1">
                                <input
                                    type="number"
                                    step="0.05"
                                    value={patronageRefundRate}
                                    onChange={(e) => setPatronageRefundRate(e.target.value)}
                                    className="w-24 px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold"
                                />
                                <span className="text-xs text-gray-500 font-bold">บ./กก.</span>
                            </div>
                        </div>
                    </div>

                    {/* Formula C */}
                    <div 
                        onClick={() => setPatronageFormulaType('sales_amount')}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                            patronageFormulaType === 'sales_amount'
                                ? 'border-teal-600 bg-teal-50/50 shadow-md shadow-teal-100'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="px-2.5 py-1 bg-teal-600 text-white rounded-lg font-bold text-xs">
                                สูตร [ค]: คิดตาม % ยอดเงินขายยาง
                            </span>
                            {patronageFormulaType === 'sales_amount' && (
                                <CheckCircle2 size={18} className="text-teal-600" />
                            )}
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm mt-1">
                            เฉลี่ยคืนตามร้อยละของยอดเงินรวม (% of Total Sales)
                        </h4>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                            ✅ <strong>แนะนำสำหรับ:</strong> กลุ่มที่รับซื้อทั้งน้ำยางสดและขี้ยาง (ยางก้อนถ้วย) ปะปนกัน คิดคำนวณง่าย โปร่งใส สมาชิกสูงวัยเข้าใจง่าย จูงใจให้นำยางทุกชนิดมาขายที่กลุ่ม
                        </p>
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-600">อัตราเฉลี่ยคืน:</span>
                            <div className="flex items-center space-x-1">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={patronageRefundRate}
                                    onChange={(e) => setPatronageRefundRate(e.target.value)}
                                    className="w-24 px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold"
                                />
                                <span className="text-xs text-gray-500 font-bold">%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statutory Allocation Pools */}
            <div className="border-t pt-5">
                <label className="block text-xs font-black text-gray-900 uppercase tracking-wider mb-3">
                    การจัดสรรสัดส่วนกำไรสุทธิ (ตามข้อบังคับสหกรณ์ / วิสาหกิจชุมชน)
                </label>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                        <span className="font-bold text-gray-700 block">1. ทุนสำรองกลุ่ม (%)</span>
                        <p className="text-[10px] text-gray-400 mb-2">ตามระเบียบ 10%</p>
                        <input
                            type="number"
                            value={reservePct}
                            onChange={(e) => setReservePct(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono font-bold"
                        />
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                        <span className="font-bold text-gray-700 block">2. ทุนสวัสดิการ/พัฒนา (%)</span>
                        <p className="text-[10px] text-gray-400 mb-2">ชุมชนและสมาชิก</p>
                        <input
                            type="number"
                            value={welfarePct}
                            onChange={(e) => setWelfarePct(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono font-bold"
                        />
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                        <span className="font-bold text-amber-900 block">3. โบนัสคณะกรรมการ (%)</span>
                        <p className="text-[10px] text-amber-700 mb-2">ปรับยอดรายคนได้ในขั้นถัดไป</p>
                        <input
                            type="number"
                            value={boardBonusPct}
                            onChange={(e) => setBoardBonusPct(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold"
                        />
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                        <span className="font-bold text-emerald-900 block">4. อัตราปันผลตามหุ้น (%)</span>
                        <p className="text-[10px] text-emerald-700 mb-2">% ต่อมูลค่าหุ้นที่ถือ</p>
                        <input
                            type="number"
                            value={dividendShareRate}
                            onChange={(e) => setDividendShareRate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono font-bold"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
                <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
                >
                    ย้อนกลับ
                </button>
                <button
                    type="button"
                    onClick={() => {
                        runSimulation();
                        setWizardStep(3);
                    }}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 flex items-center"
                >
                    <span>ตรวจสอบ & ปรับโบนัสรายคน</span>
                    <ArrowRight size={15} className="ml-1.5" />
                </button>
            </div>
        </div>
    );
};

export default DividendWizardStep2;
