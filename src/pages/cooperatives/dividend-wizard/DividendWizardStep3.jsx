import React from 'react';
import { 
    RefreshCw, AlertCircle, AlertTriangle, PieChart, Award, 
    Shield, HeartHandshake, Coins, TrendingUp, Save 
} from 'lucide-react';

export const DividendWizardStep3 = ({
    allocatedProfit,
    runSimulation,
    isSimulating,
    liveTotals,
    year,
    patronageFormulaType,
    liveDistributions = [],
    handleUpdateBoardBonus,
    isSaving,
    handleSaveAndApprove,
    setWizardStep
}) => {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">ขั้นตอนที่ 3: ตรวจสอบผลการจำลอง & ปรับยอดโบนัสกรรมการรายคน</h3>
                    <p className="text-xs text-gray-400 mt-1">สามารถแก้ไขตัวเลขโบนัสกรรมการในตารางด้านล่างได้โดยตรง ยอดสุทธิจะคำนวณใหม่แบบเรียลไทม์</p>
                </div>
                <button
                    type="button"
                    onClick={runSimulation}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center"
                >
                    <RefreshCw size={13} className={`mr-1.5 ${isSimulating ? 'animate-spin' : ''}`} />
                    คำนวณจำลองใหม่
                </button>
            </div>

            {/* Step 3 Status Alerts */}
            {Number(allocatedProfit || 0) <= 0 ? (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-xs flex items-center space-x-3">
                    <AlertCircle size={22} className="text-rose-600 shrink-0" />
                    <div>
                        <p className="font-bold text-rose-900">รอบบัญชีนี้ขาดทุนสุทธิ หรือไม่ได้ระบุวงเงินกำไรจัดสรร</p>
                        <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                            ตามหลักเกณฑ์ พ.ร.บ. สหกรณ์ และการบัญชีสากล <strong>เมื่อผลประกอบการขาดทุนสุทธิ จะไม่สามารถจัดสรรเงินปันผลตามหุ้น เงินเฉลี่ยคืน หรือโบนัสกรรมการได้</strong> ยอดจัดสรรทั้งหมดในตารางจึงถูกตั้งค่าเป็น 0.00 บาทโดยอัตโนมัติ
                        </p>
                    </div>
                </div>
            ) : (Number(liveTotals.totalDistributed || 0) > Number(allocatedProfit || 0) && Number(allocatedProfit || 0) > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs flex items-center space-x-3">
                    <AlertTriangle size={22} className="text-amber-600 shrink-0" />
                    <div>
                        <p className="font-bold text-amber-900">คำเตือน: ยอดจัดสรรรวมเกินกว่ากำไรสุทธิที่มีอยู่!</p>
                        <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                            ยอดเงินจัดสรรรวม ({Number(liveTotals.totalDistributed).toLocaleString()} บ.) สูงกว่ากำไรจัดสรร ({Number(allocatedProfit).toLocaleString()} บ.) อยู่ {(Number(liveTotals.totalDistributed) - Number(allocatedProfit)).toLocaleString()} บาท กรุณาพิจารณาปรับลดอัตรา % เงินปันผล เงินเฉลี่ยคืน หรือโบนัสกรรมการ เพื่อมิให้องค์กรขาดทุนสะสม
                        </p>
                    </div>
                </div>
            )}

            {/* Master Statement & Allocation Breakdown Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 md:p-7 shadow-xl space-y-6">
                {/* Header: Title & Total Capital / Profit */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-white/10">
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                งบจัดสรรกำไรสุทธิ & สัดส่วนผู้ถือหุ้น
                            </span>
                            <span className="text-slate-400 text-xs font-mono">รอบปี {year}</span>
                        </div>
                        <h4 className="text-xl md:text-2xl font-black text-white mt-1.5 tracking-tight flex items-center">
                            <PieChart size={22} className="mr-2 text-emerald-400" />
                            การชี้แจงสัดส่วนเงินจัดสรร 5 กองทุน
                        </h4>
                        <p className="text-slate-300 text-xs mt-1">
                            สรุปวงเงินจัดสรรตามระเบียบสหกรณ์ และอัตราผลตอบแทนเงินปันผลต่อทุนเรือนหุ้นของผู้ถือหุ้น
                        </p>
                    </div>

                    {/* Big Metrics Header */}
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <div className="px-3 border-r border-white/10 text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">กำไรสุทธิจัดสรรทั้งหมด</span>
                            <span className="text-xl font-black font-mono text-emerald-400">
                                {Number(liveTotals.allocatedProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-slate-300 font-normal">บ.</span>
                            </span>
                        </div>
                        <div className="px-3 text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">ทุนเรือนหุ้นรวม</span>
                            <span className="text-xl font-black font-mono text-white">
                                {Number(liveTotals.totalShareCapital || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-slate-300 font-normal">บ.</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Shareholder Return Highlight Banner */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                            <Award size={20} />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide block">
                                สัดส่วนผลตอบแทนต่อผู้ถือหุ้น (Shareholder Return)
                            </span>
                            <p className="text-xs text-white mt-0.5">
                                ผู้ถือหุ้นได้รับเงินปันผลคิดเป็นร้อยละ <strong className="text-emerald-400 font-mono text-sm font-black underline decoration-emerald-400 underline-offset-4">{Number(liveTotals.dividendShareRate || 0).toFixed(2)}%</strong> ของมูลค่าหุ้นที่ถือ (คิดเป็นสัดส่วน <strong className="font-mono text-emerald-300 font-bold">{Number(liveTotals.dividendShareProfitPct || 0).toFixed(1)}%</strong> ของกำไรสุทธิจัดสรรทั้งหมด)
                            </p>
                        </div>
                    </div>

                    <div className="text-right w-full md:w-auto shrink-0 bg-white/5 md:bg-transparent px-3 py-1.5 rounded-xl border border-white/10 md:border-none">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">รวมยอดจ่ายปันผลหุ้น</span>
                        <span className="text-base font-black font-mono text-emerald-300">
                            {Number(liveTotals.dividendShareTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                        </span>
                    </div>
                </div>

                {/* 5 Allocation Stream Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    {/* 1. Reserve Fund */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-white/10 transition-colors">
                        <div>
                            <div className="flex items-center justify-between text-blue-400 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider">1. ทุนสำรองกลุ่ม</span>
                                <Shield size={14} />
                            </div>
                            <span className="text-base font-black font-mono text-white block mt-1">
                                {Number(liveTotals.reserveAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-400">บ.</span>
                            </span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-400">
                            <span>สัดส่วนกำไร:</span>
                            <span className="font-mono font-bold text-blue-300">{Number(liveTotals.reserveProfitPct || 0).toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* 2. Welfare Fund */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-white/10 transition-colors">
                        <div>
                            <div className="flex items-center justify-between text-purple-400 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider">2. ทุนสวัสดิการ</span>
                                <HeartHandshake size={14} />
                            </div>
                            <span className="text-base font-black font-mono text-white block mt-1">
                                {Number(liveTotals.welfareAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-400">บ.</span>
                            </span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-400">
                            <span>สัดส่วนกำไร:</span>
                            <span className="font-mono font-bold text-purple-300">{Number(liveTotals.welfareProfitPct || 0).toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* 3. Board Bonus */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-white/10 transition-colors">
                        <div>
                            <div className="flex items-center justify-between text-amber-400 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider">3. โบนัสกรรมการ</span>
                                <Award size={14} />
                            </div>
                            <span className="text-base font-black font-mono text-white block mt-1">
                                {Number(liveTotals.totalBonus || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-400">บ.</span>
                            </span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-400">
                            <span>สัดส่วนกำไร:</span>
                            <span className="font-mono font-bold text-amber-300">{Number(liveTotals.boardBonusProfitPct || 0).toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* 4. Share Dividend */}
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-emerald-900/40 transition-colors">
                        <div>
                            <div className="flex items-center justify-between text-emerald-400 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider">4. ปันผลตามหุ้น</span>
                                <Coins size={14} />
                            </div>
                            <span className="text-base font-black font-mono text-emerald-300 block mt-1">
                                {Number(liveTotals.dividendShareTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-400">บ.</span>
                            </span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-emerald-500/20 flex justify-between items-center text-[10px] text-emerald-200">
                            <span>ร้อยละต่อหุ้น:</span>
                            <span className="font-mono font-black text-emerald-400">{Number(liveTotals.dividendShareRate || 0).toFixed(2)}%</span>
                        </div>
                    </div>

                    {/* 5. Patronage Refund */}
                    <div className="bg-teal-950/40 border border-teal-500/30 rounded-2xl p-3.5 flex flex-col justify-between hover:bg-teal-900/40 transition-colors">
                        <div>
                            <div className="flex items-center justify-between text-teal-400 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider">5. เฉลี่ยคืนสมาชิก</span>
                                <TrendingUp size={14} />
                            </div>
                            <span className="text-base font-black font-mono text-teal-300 block mt-1">
                                {Number(liveTotals.patronageRefundTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal text-slate-400">บ.</span>
                            </span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-teal-500/20 flex justify-between items-center text-[10px] text-teal-200">
                            <span>สัดส่วนกำไร:</span>
                            <span className="font-mono font-bold text-teal-300">{Number(liveTotals.patronageProfitPct || 0).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                {/* Visual Multi-Color Allocation Bar */}
                <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-[11px] text-slate-300 font-medium">
                        <span className="flex items-center">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5"></span>
                            สัดส่วนการกระจายเงินจัดสรรทั้งหมด:
                        </span>
                        <span className="font-mono font-bold text-white">
                            รวมจัดสรร 5 ส่วน: {Number(liveTotals.grandTotalAllocated || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} บ. 
                            ({Number(liveTotals.totalDistributedProfitPct || 0).toFixed(1)}% ของกำไร)
                        </span>
                    </div>

                    <div className="h-3 bg-white/10 rounded-full overflow-hidden flex p-0.5 gap-0.5">
                        {Number(liveTotals.reserveProfitPct || 0) > 0 && (
                            <div 
                                style={{ width: `${Math.min(100, liveTotals.reserveProfitPct)}%` }} 
                                className="h-full bg-blue-500 rounded-full transition-all"
                                title={`ทุนสำรอง: ${Number(liveTotals.reserveAmount).toLocaleString()} บ. (${liveTotals.reserveProfitPct.toFixed(1)}%)`}
                            />
                        )}
                        {Number(liveTotals.welfareProfitPct || 0) > 0 && (
                            <div 
                                style={{ width: `${Math.min(100, liveTotals.welfareProfitPct)}%` }} 
                                className="h-full bg-purple-500 rounded-full transition-all"
                                title={`สวัสดิการ: ${Number(liveTotals.welfareAmount).toLocaleString()} บ. (${liveTotals.welfareProfitPct.toFixed(1)}%)`}
                            />
                        )}
                        {Number(liveTotals.boardBonusProfitPct || 0) > 0 && (
                            <div 
                                style={{ width: `${Math.min(100, liveTotals.boardBonusProfitPct)}%` }} 
                                className="h-full bg-amber-500 rounded-full transition-all"
                                title={`โบนัสกรรมการ: ${Number(liveTotals.totalBonus).toLocaleString()} บ. (${liveTotals.boardBonusProfitPct.toFixed(1)}%)`}
                            />
                        )}
                        {Number(liveTotals.dividendShareProfitPct || 0) > 0 && (
                            <div 
                                style={{ width: `${Math.min(100, liveTotals.dividendShareProfitPct)}%` }} 
                                className="h-full bg-emerald-400 rounded-full transition-all"
                                title={`ปันผลหุ้น: ${Number(liveTotals.dividendShareTotal).toLocaleString()} บ. (${liveTotals.dividendShareProfitPct.toFixed(1)}%)`}
                            />
                        )}
                        {Number(liveTotals.patronageProfitPct || 0) > 0 && (
                            <div 
                                style={{ width: `${Math.min(100, liveTotals.patronageProfitPct)}%` }} 
                                className="h-full bg-teal-400 rounded-full transition-all"
                                title={`เฉลี่ยคืน: ${Number(liveTotals.patronageRefundTotal).toLocaleString()} บ. (${liveTotals.patronageProfitPct.toFixed(1)}%)`}
                            />
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>ทุนสำรอง ({Number(liveTotals.reserveProfitPct || 0).toFixed(1)}%)</span>
                        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-1"></span>สวัสดิการ ({Number(liveTotals.welfareProfitPct || 0).toFixed(1)}%)</span>
                        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-1"></span>โบนัสกรรมการ ({Number(liveTotals.boardBonusProfitPct || 0).toFixed(1)}%)</span>
                        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>ปันผลตามหุ้น ({Number(liveTotals.dividendShareProfitPct || 0).toFixed(1)}%)</span>
                        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-teal-400 mr-1"></span>เฉลี่ยคืนสมาชิก ({Number(liveTotals.patronageProfitPct || 0).toFixed(1)}%)</span>
                        {Number(liveTotals.remainingProfit || 0) > 0 && (
                            <span className="flex items-center ml-auto font-bold text-emerald-400">
                                คงเหลือยกไป: {Number(liveTotals.remainingProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed Simulation Table */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100 text-gray-600 font-bold border-b border-gray-200 uppercase text-[10px] sticky top-0 z-10">
                            <tr>
                                <th className="py-2.5 px-3">รหัส/ชื่อสมาชิก</th>
                                <th className="py-2.5 px-3">ตำแหน่ง</th>
                                <th className="py-2.5 px-3 text-right">หุ้น (บ.)</th>
                                <th className="py-2.5 px-3 text-right">ปันผลหุ้น (บ.)</th>
                                <th className="py-2.5 px-3 text-right">
                                    {patronageFormulaType === 'dry_rubber' ? 'ยางแห้ง DRC (กก.)' : 'ยอดส่งยาง (บ.)'}
                                </th>
                                <th className="py-2.5 px-3 text-right">เฉลี่ยคืน (บ.)</th>
                                <th className="py-2.5 px-3 text-right">โบนัสกรรมการ (บ.) ✏️</th>
                                <th className="py-2.5 px-3 text-right">ยอดรวม (บ.)</th>
                                <th className="py-2.5 px-3 text-right text-red-600">หักหนี้ (บ.)</th>
                                <th className="py-2.5 px-3 text-right text-emerald-700">รับสุทธิ (บ.)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {liveDistributions.map(d => {
                                const isBoard = d.orgPosition && d.orgPosition !== 'member' && d.orgPosition !== 'none';

                                return (
                                    <tr key={d.memberId} className="hover:bg-gray-50/70">
                                        <td className="py-2.5 px-3">
                                            <p className="font-bold text-gray-900">{d.memberName}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">{d.memberNo}</p>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                isBoard ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {d.orgPosition || 'member'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono">
                                            {Number(d.shareValue || 0).toLocaleString()}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                                            {Number(d.dividendShareAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                                            {patronageFormulaType === 'dry_rubber' 
                                                ? Number(d.businessDryRubberKg || 0).toLocaleString()
                                                : Number(d.businessTotalAmount || 0).toLocaleString()}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                                            {Number(d.patronageRefundAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        
                                        {/* Customizable Board Bonus Cell */}
                                        <td className="py-2.5 px-3 text-right">
                                            {isBoard ? (
                                                <input
                                                    type="number"
                                                    value={d.boardBonusAmount}
                                                    onChange={(e) => handleUpdateBoardBonus(d.memberId, e.target.value)}
                                                    className="w-20 px-2 py-1 bg-amber-50 border border-amber-300 rounded-lg text-right font-mono font-bold text-amber-900 focus:bg-white text-xs"
                                                    title="แก้ไขยอดโบนัสของท่านนี้ได้โดยตรง"
                                                />
                                            ) : (
                                                <span className="text-gray-300 font-mono">-</span>
                                            )}
                                        </td>

                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                                            {Number(d.grossPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-red-600 font-bold">
                                            {Number(d.deductedLoanAmount || 0) > 0 ? `-${Number(d.deductedLoanAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                                            {Number(d.netPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
                <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs"
                >
                    ย้อนกลับ
                </button>
                <button
                    type="button"
                    disabled={isSaving || liveDistributions.length === 0}
                    onClick={handleSaveAndApprove}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-lg shadow-emerald-200 flex items-center transition-all"
                >
                    <Save size={16} className="mr-2" />
                    {isSaving ? 'กำลังบันทึกข้อมูล...' : `อนุมัติรอบปันผลประจำปี ${year} และจัดเตรียมการจ่าย`}
                </button>
            </div>
        </div>
    );
};

export default DividendWizardStep3;
