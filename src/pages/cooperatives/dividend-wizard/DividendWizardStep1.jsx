import React from 'react';
import { TrendingUp, RefreshCw, AlertCircle, Calculator, ArrowRight } from 'lucide-react';

export const DividendWizardStep1 = ({
    year,
    setYear,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    title,
    setTitle,
    simulationData,
    runSimulation,
    isSimulating,
    manualProfitOverride,
    setManualProfitOverride,
    overrideMode,
    setOverrideMode,
    allocatedProfit,
    setAllocatedProfit,
    retainedEarnings,
    setRetainedEarnings,
    setWizardStep
}) => {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
            <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">ขั้นตอนที่ 1: กำหนดรอบปีบัญชีและดึงกำไรสุทธิ</h3>
                <p className="text-xs text-gray-400 mt-1">ระบบจะดึงยอดขายยาง ยอดซื้อ และค่าใช้จ่ายจากระบบมาคำนวณกำไรสุทธิอัตโนมัติ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                    <label className="block font-bold text-gray-700 mb-1">ปีบัญชี (พ.ศ.) *</label>
                    <input
                        type="text"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl font-bold font-mono"
                    />
                </div>
                <div>
                    <label className="block font-bold text-gray-700 mb-1">ตั้งแต่วันที่ *</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"
                    />
                </div>
                <div>
                    <label className="block font-bold text-gray-700 mb-1">ถึงวันที่ *</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl"
                    />
                </div>
            </div>

            <div>
                <label className="block font-bold text-gray-700 mb-1 text-xs">ชื่อรอบการปันผล</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold"
                />
            </div>

            {/* Auto P&L Summary Card */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-900 flex items-center">
                        <TrendingUp size={16} className="mr-1.5 text-emerald-600" />
                        ผลประกอบการรอบบัญชี (ดึงจากระบบ P&L):
                    </span>
                    <button
                        type="button"
                        onClick={runSimulation}
                        className="text-emerald-700 hover:underline flex items-center text-[11px] font-bold"
                    >
                        <RefreshCw size={12} className={`mr-1 ${isSimulating ? 'animate-spin' : ''}`} />
                        คำนวณใหม่
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">ยอดขายยางโรงงาน</span>
                        <span className="text-sm font-black font-mono text-gray-900">
                            {Number(simulationData?.summary?.revenue || 0).toLocaleString()} บ.
                        </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">ต้นทุนรับซื้อยาง</span>
                        <span className="text-sm font-black font-mono text-gray-900">
                            {Number(simulationData?.summary?.rawCost || 0).toLocaleString()} บ.
                        </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">ค่าใช้จ่าย & ค่าจ้าง</span>
                        <span className="text-sm font-black font-mono text-gray-900">
                            {(Number(simulationData?.summary?.expensesCost || 0) + Number(simulationData?.summary?.wagesCost || 0)).toLocaleString()} บ.
                        </span>
                    </div>
                    <div className={`p-3 rounded-xl shadow-sm ${Number(simulationData?.summary?.autoNetProfit || 0) < 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                        <span className="text-[10px] text-white/80 block font-bold uppercase">
                            {Number(simulationData?.summary?.autoNetProfit || 0) < 0 ? 'ขาดทุนสุทธิ (Net Loss)' : 'กำไรสุทธิ (Net Profit)'}
                        </span>
                        <span className="text-base font-black font-mono text-white">
                            {Number(simulationData?.summary?.autoNetProfit || 0).toLocaleString()} บ.
                        </span>
                    </div>
                </div>

                {/* Net Loss Alert Box */}
                {Number(simulationData?.summary?.autoNetProfit || 0) < 0 && !manualProfitOverride && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-xs space-y-1.5 mt-2">
                        <div className="flex items-center font-bold text-rose-900">
                            <AlertCircle size={16} className="mr-1.5 text-rose-600 shrink-0" />
                            <span>แจ้งเตือน: รอบบัญชีนี้มีผลการดำเนินงาน "ขาดทุนสุทธิ" ({Number(simulationData?.summary?.autoNetProfit || 0).toLocaleString()} บาท)</span>
                        </div>
                        <p className="text-[11px] text-rose-700 leading-relaxed">
                            ตามหลักเกณฑ์ พ.ร.บ. สหกรณ์ และกฎหมายการค้า <strong>หากรอบบัญชีมีผลขาดทุนสุทธิ จะไม่สามารถจัดสรรเงินปันผลหรือเงินเฉลี่ยคืนได้</strong> ระบบจึงได้ตั้งยอดเงินปันผลและเฉลี่ยคืนเป็น 0.00 บาทโดยอัตโนมัติ เพื่อป้องกันการกระทบสภาพคล่องและเงินทุนของกลุ่ม
                        </p>
                        <p className="text-[11px] text-rose-600 leading-relaxed font-semibold">
                            💡 <em>หากกลุ่มมี <strong>"กำไรสะสมยกมาจากปีก่อนหน้า"</strong> และที่ประชุมมีมติให้นำมาจัดสรรปันผล กรุณาทำเครื่องหมายที่ <strong>"ปรับแต่งยอดกำไรที่นำมาจัดสรรด้วยตนเอง"</strong> ด้านล่าง แล้วระบุวงเงินกำไรสะสมที่ต้องการจัดสรร</em>
                        </p>
                    </div>
                )}

                {/* Profit Allocation Override & Retained Earnings Offset */}
                <div className="pt-3 border-t border-emerald-200/60 space-y-3 text-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <label className="flex items-center space-x-2 cursor-pointer font-bold text-gray-800">
                            <input
                                type="checkbox"
                                checked={manualProfitOverride}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setManualProfitOverride(checked);
                                    if (!checked) {
                                        setAllocatedProfit(String(Math.max(0, Number(simulationData?.summary?.autoNetProfit || 0))));
                                        runSimulation(Math.max(0, Number(simulationData?.summary?.autoNetProfit || 0)));
                                    } else {
                                        if (overrideMode === 'offset') {
                                            const autoP = Number(simulationData?.summary?.autoNetProfit || 0);
                                            const net = Math.max(0, Number(retainedEarnings || 0) + autoP);
                                            setAllocatedProfit(String(net));
                                            runSimulation(net);
                                        }
                                    }
                                }}
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                            <span>⚙️ นำกำไรสะสมปีก่อนหน้ามาจัดสรร (และหักชดเชยผลขาดทุนรอบปัจจุบัน) / ปรับยอดจัดสรรเอง</span>
                        </label>
                    </div>

                    {manualProfitOverride && (
                        <div className="bg-white/95 rounded-2xl p-5 border-2 border-emerald-300 shadow-sm space-y-4 animate-in fade-in duration-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-gray-100">
                                <div>
                                    <h5 className="font-bold text-gray-900 text-xs flex items-center">
                                        <Calculator size={15} className="mr-1.5 text-emerald-600" />
                                        กลไกการคำนวณหักชดเชยขาดทุน & กำไรจัดสรร (ตาม พ.ร.บ. สหกรณ์)
                                    </h5>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        ตามระเบียบต้องนำผลขาดทุนรอบปัจจุบันไปหักลบกับกำไรสะสมก่อน ยอดคงเหลือสุทธิจึงจะนำมาจัดสรรปันผลได้
                                    </p>
                                </div>

                                {/* Mode Toggle Pills */}
                                <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-[11px] font-bold shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOverrideMode('offset');
                                            const autoP = Number(simulationData?.summary?.autoNetProfit || 0);
                                            const net = Math.max(0, Number(retainedEarnings || 0) + autoP);
                                            setAllocatedProfit(String(net));
                                            runSimulation(net);
                                        }}
                                        className={`px-3 py-1 rounded-lg transition-all ${
                                            overrideMode === 'offset' 
                                                ? 'bg-emerald-600 text-white shadow-xs' 
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        หักลบกำไรสะสม (แนะนำ)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOverrideMode('direct')}
                                        className={`px-3 py-1 rounded-lg transition-all ${
                                            overrideMode === 'direct' 
                                                ? 'bg-emerald-600 text-white shadow-xs' 
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        ระบุยอดตรงๆ
                                    </button>
                                </div>
                            </div>

                            {overrideMode === 'offset' ? (
                                <div className="space-y-3">
                                    {/* 3 Columns Equation */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch text-xs">
                                        <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex flex-col justify-between">
                                            <div>
                                                <label className="block font-bold text-emerald-950 text-[11px] mb-1">
                                                    1. กำไรสะสมยกมาจากปีก่อน (บาท) *
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="เช่น 100000"
                                                    value={retainedEarnings}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setRetainedEarnings(val);
                                                        const autoP = Number(simulationData?.summary?.autoNetProfit || 0);
                                                        const net = Math.max(0, Number(val || 0) + autoP);
                                                        setAllocatedProfit(String(net));
                                                        runSimulation(net);
                                                    }}
                                                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500"
                                                />
                                            </div>
                                            <span className="text-[10px] text-emerald-800 mt-2 block">
                                                เงินกำไรสะสมที่ที่ประชุมใหญ่มีมติให้นำมาจัดสรร
                                            </span>
                                        </div>

                                        <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                                            Number(simulationData?.summary?.autoNetProfit || 0) < 0 
                                                ? 'bg-rose-50/80 border-rose-200 text-rose-950' 
                                                : 'bg-teal-50/80 border-teal-200 text-teal-950'
                                        }`}>
                                            <div>
                                                <label className="block font-bold text-[11px] mb-1">
                                                    2. ผลดำเนินงานรอบปัจจุบัน (P&L)
                                                </label>
                                                <div className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-gray-200 font-mono font-bold text-sm">
                                                    <span className={Number(simulationData?.summary?.autoNetProfit || 0) < 0 ? 'text-rose-600' : 'text-teal-700'}>
                                                        {Number(simulationData?.summary?.autoNetProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-sans ${
                                                        Number(simulationData?.summary?.autoNetProfit || 0) < 0 
                                                            ? 'bg-rose-100 text-rose-700 font-bold' 
                                                            : 'bg-teal-100 text-teal-700 font-bold'
                                                    }`}>
                                                        {Number(simulationData?.summary?.autoNetProfit || 0) < 0 ? 'หักชดเชยขาดทุน' : 'บวกกำไรเพิ่ม'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-500 mt-2 block">
                                                ดึงจากยอดขายหักต้นทุนและค่าใช้จ่ายในงวดนี้
                                            </span>
                                        </div>

                                        <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-sm flex flex-col justify-between">
                                            <div>
                                                <label className="block font-bold text-emerald-100 text-[11px] mb-1">
                                                    3. กำไรสุทธิคงเหลือจัดสรรได้จริง (สุทธิ)
                                                </label>
                                                <div className="py-2 px-3 bg-white/10 rounded-lg border border-white/20 font-mono font-black text-base text-white">
                                                    {Number(allocatedProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-emerald-100">บ.</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-emerald-200 mt-2 block">
                                                {Number(allocatedProfit || 0) > 0 
                                                    ? '✅ ยอดนี้จะถูกนำไปคิดปันผลและเฉลี่ยคืน' 
                                                    : '⚠️ ขาดทุนสะสมสุทธิ ไม่สามารถจัดสรรปันผลได้'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Calculation Explainer Banner */}
                                    {retainedEarnings !== '' && (
                                        <div className={`p-3.5 rounded-xl text-xs flex items-start space-x-2.5 border ${
                                            (Number(retainedEarnings || 0) + Number(simulationData?.summary?.autoNetProfit || 0)) > 0
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                                : 'bg-rose-50 border-rose-200 text-rose-950'
                                        }`}>
                                            {(Number(retainedEarnings || 0) + Number(simulationData?.summary?.autoNetProfit || 0)) > 0 ? (
                                                <>
                                                    <div className="space-y-0.5">
                                                        <p className="font-bold text-emerald-900">การหักชดเชยขาดทุนและกำไรจัดสรรสุทธิ:</p>
                                                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                                                            กำไรสะสมยกมา <strong>{Number(retainedEarnings).toLocaleString()} บาท</strong> {Number(simulationData?.summary?.autoNetProfit || 0) < 0 ? 'หักชดเชยผลขาดทุนงวดนี้' : 'รวมกับผลกำไรงวดนี้'} <strong>{Math.abs(Number(simulationData?.summary?.autoNetProfit || 0)).toLocaleString()} บาท</strong> = คงเหลือกำไรสุทธิที่นำมาจัดสรรปันผลได้ตามกฎหมาย <strong>{Number(allocatedProfit).toLocaleString()} บาท</strong>
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="space-y-0.5">
                                                        <p className="font-bold text-rose-900">ผลขาดทุนรอบปัจจุบันสูงกว่ากำไรสะสมยกมา:</p>
                                                        <p className="text-[11px] text-rose-800 leading-relaxed">
                                                            กำไรสะสมยกมา ({Number(retainedEarnings).toLocaleString()} บ.) ไม่เพียงพอชดเชยผลขาดทุนรอบนี้ ({Math.abs(Number(simulationData?.summary?.autoNetProfit || 0)).toLocaleString()} บ.) ยังคงมีขาดทุนสะสมสุทธิ <strong>{Math.abs(Number(retainedEarnings || 0) + Number(simulationData?.summary?.autoNetProfit || 0)).toLocaleString()} บาท</strong> ระบบจึงตั้งยอดจัดสรรเป็น 0.00 บาท เพื่อมิให้ผิดหลักการเงิน
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Direct Mode */
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                                    <span className="font-bold text-gray-700">ระบุยอดกำไรสุทธินำมาจัดสรรตรงๆ:</span>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            value={allocatedProfit}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setAllocatedProfit(val);
                                                runSimulation(val !== '' ? Number(val) : undefined);
                                            }}
                                            placeholder="0.00"
                                            className="w-44 px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono font-bold text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <span className="font-bold text-gray-600">บาท</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 flex items-center"
                >
                    <span>ต่อไป: กำหนดสูตรเฉลี่ยคืน</span>
                    <ArrowRight size={15} className="ml-1.5" />
                </button>
            </div>
        </div>
    );
};

export default DividendWizardStep1;
