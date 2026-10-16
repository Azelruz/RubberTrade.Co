import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { simulateDividendCalculation, saveDividendPeriod, saveDividendDistributions } from '../../services/apiService';

import DividendWizardStep1 from './dividend-wizard/DividendWizardStep1';
import DividendWizardStep2 from './dividend-wizard/DividendWizardStep2';
import DividendWizardStep3 from './dividend-wizard/DividendWizardStep3';

export const DividendWizardTab = ({ 
    periods = [], 
    onPeriodSaved, 
    onNavigateToPayout 
}) => {
    // Current Wizard Step: 1 = Period & Profit, 2 = Formula & Pool, 3 = Preview & Customize
    const [wizardStep, setWizardStep] = useState(1);

    // Form inputs
    const currentYear = new Date().getFullYear();
    const thaiYear = currentYear + 543;
    const [year, setYear] = useState(String(thaiYear));
    const [title, setTitle] = useState(`รอบปันผลและเฉลี่ยคืน ประจำปี ${thaiYear}`);
    const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
    const [allocatedProfit, setAllocatedProfit] = useState('');
    const [manualProfitOverride, setManualProfitOverride] = useState(false);
    const [retainedEarnings, setRetainedEarnings] = useState('');
    const [overrideMode, setOverrideMode] = useState('offset'); // 'offset' = หักลบกำไรสะสมกับผลขาดทุน, 'direct' = ระบุยอดตรงๆ

    // Allocation percentages
    const [reservePct, setReservePct] = useState('10');
    const [welfarePct, setWelfarePct] = useState('5');
    const [boardBonusPct, setBoardBonusPct] = useState('5');
    const [dividendShareRate, setDividendShareRate] = useState('5'); // 5%
    const [patronageFormulaType, setPatronageFormulaType] = useState('dry_rubber'); // 'dry_rubber' or 'sales_amount'
    const [patronageRefundRate, setPatronageRefundRate] = useState('0.50'); // 0.50 baht/kg or 1.5%

    // Custom Board Bonus overrides { memberId: amount }
    const [customBoardBonuses, setCustomBoardBonuses] = useState({});

    // Simulation Result
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationData, setSimulationData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Run simulation
    const runSimulation = async (customAllocated) => {
        setIsSimulating(true);
        try {
            const targetAllocated = customAllocated !== undefined 
                ? customAllocated 
                : (manualProfitOverride && allocatedProfit !== '' ? Number(allocatedProfit) : undefined);

            const payload = {
                startDate,
                endDate,
                allocatedProfit: targetAllocated,
                retainedEarnings: manualProfitOverride && overrideMode === 'offset' && retainedEarnings !== '' ? Number(retainedEarnings) : undefined,
                reservePct: Number(reservePct) || 0,
                welfarePct: Number(welfarePct) || 0,
                boardBonusPct: Number(boardBonusPct) || 0,
                dividendShareRate: Number(dividendShareRate) || 0,
                patronageFormulaType,
                patronageRefundRate: Number(patronageRefundRate) || 0,
                customBoardBonuses
            };

            const res = await simulateDividendCalculation(payload);
            if (res && res.summary) {
                setSimulationData(res);
                if (!manualProfitOverride) {
                    setAllocatedProfit(String(res.summary.allocatedProfit || 0));
                }
            } else {
                toast.error('ไม่สามารถจำลองการคำนวณได้');
            }
        } catch (err) {
            toast.error('เกิดข้อผิดพลาดในการคำนวณ: ' + err.message);
        } finally {
            setIsSimulating(false);
        }
    };

    // Auto run simulation on first load or when moving to preview
    useEffect(() => {
        runSimulation();
    }, [startDate, endDate]);

    // Handle editing custom board bonus in preview table
    const handleUpdateBoardBonus = (memberId, val) => {
        setCustomBoardBonuses(prev => ({
            ...prev,
            [memberId]: val === '' ? 0 : Number(val)
        }));
    };

    // Recalculate preview live when customBoardBonuses changes
    const liveDistributions = useMemo(() => {
        if (!simulationData?.distributions) return [];
        return simulationData.distributions.map(d => {
            const customBonus = customBoardBonuses[d.memberId];
            const finalBonus = customBonus !== undefined ? Number(customBonus) : Number(d.boardBonusAmount || 0);
            const gross = d.dividendShareAmount + d.patronageRefundAmount + finalBonus;
            const deducted = Math.min(gross, d.remainingDebt || 0);
            const net = Math.max(0, gross - deducted);

            return {
                ...d,
                boardBonusAmount: finalBonus,
                grossPayout: gross,
                deductedLoanAmount: deducted,
                netPayout: net
            };
        });
    }, [simulationData, customBoardBonuses]);

    // Calculate live total distributed & allocation breakdown
    const liveTotals = useMemo(() => {
        if (!simulationData?.summary) return {};
        const sum = simulationData.summary;
        const totalBonus = liveDistributions.reduce((acc, d) => acc + Number(d.boardBonusAmount || 0), 0);
        const dividendShareTotal = Number(sum.dividendShareTotal || 0);
        const patronageRefundTotal = Number(sum.patronageRefundTotal || 0);
        const reserveAmount = Number(sum.reserveAmount || 0);
        const welfareAmount = Number(sum.welfareAmount || 0);
        const currentAllocatedProfit = Number(allocatedProfit !== '' ? allocatedProfit : (sum.allocatedProfit || 0));

        // Member + Board distributions total
        const totalMemberDistributed = dividendShareTotal + patronageRefundTotal + totalBonus;
        // Grand total of all 5 allocation streams
        const grandTotalAllocated = reserveAmount + welfareAmount + totalMemberDistributed;
        // Remaining unallocated profit
        const remainingProfit = currentAllocatedProfit - grandTotalAllocated;

        // Total Share Capital of members
        const totalShareCapital = liveDistributions.reduce((acc, d) => acc + Number(d.shareValue || 0), 0);

        // Share dividend % of share value (e.g. 5.00%)
        const dividendShareRate = Number(sum.dividendShareRate || 0);

        // Percentages of Allocated Profit for each item
        const reserveProfitPct = currentAllocatedProfit > 0 ? (reserveAmount / currentAllocatedProfit) * 100 : 0;
        const welfareProfitPct = currentAllocatedProfit > 0 ? (welfareAmount / currentAllocatedProfit) * 100 : 0;
        const boardBonusProfitPct = currentAllocatedProfit > 0 ? (totalBonus / currentAllocatedProfit) * 100 : 0;
        const dividendShareProfitPct = currentAllocatedProfit > 0 ? (dividendShareTotal / currentAllocatedProfit) * 100 : 0;
        const patronageProfitPct = currentAllocatedProfit > 0 ? (patronageRefundTotal / currentAllocatedProfit) * 100 : 0;
        const totalDistributedProfitPct = currentAllocatedProfit > 0 ? (grandTotalAllocated / currentAllocatedProfit) * 100 : 0;

        return {
            totalBonus,
            dividendShareTotal,
            patronageRefundTotal,
            reserveAmount,
            welfareAmount,
            totalDistributed: totalMemberDistributed,
            grandTotalAllocated,
            remainingProfit,
            totalShareCapital,
            dividendShareRate,
            reserveProfitPct,
            welfareProfitPct,
            boardBonusProfitPct,
            dividendShareProfitPct,
            patronageProfitPct,
            totalDistributedProfitPct,
            allocatedProfit: currentAllocatedProfit
        };
    }, [simulationData, liveDistributions, allocatedProfit]);

    const handleSaveAndApprove = async () => {
        if (!simulationData?.summary) return;
        setIsSaving(true);
        try {
            const periodId = 'PERIOD-' + year + '-' + crypto.randomUUID().substring(0, 6);
            const periodPayload = {
                id: periodId,
                year: parseInt(year) || currentYear,
                title,
                startDate,
                endDate,
                netProfit: simulationData.summary.autoNetProfit || 0,
                allocatedProfit: Number(allocatedProfit) || simulationData.summary.allocatedProfit,
                reservePct: Number(reservePct) || 0,
                reserveAmount: simulationData.summary.reserveAmount || 0,
                welfarePct: Number(welfarePct) || 0,
                welfareAmount: simulationData.summary.welfareAmount || 0,
                boardBonusPct: Number(boardBonusPct) || 0,
                boardBonusAmount: liveTotals.totalBonus || 0,
                dividendShareRate: Number(dividendShareRate) || 0,
                dividendShareTotal: simulationData.summary.dividendShareTotal || 0,
                patronageFormulaType,
                patronageRefundRate: Number(patronageRefundRate) || 0,
                patronageRefundTotal: simulationData.summary.patronageRefundTotal || 0,
                totalDistributed: liveTotals.totalDistributed || 0,
                status: 'approved',
                approvedAt: new Date().toISOString()
            };

            // 1. Save Period
            await saveDividendPeriod(periodPayload);

            // 2. Save Distributions
            await saveDividendDistributions(periodId, liveDistributions);

            toast.success(`อนุมัติรอบปันผลประจำปี ${year} เรียบร้อยแล้ว 🎉`);
            if (onPeriodSaved) onPeriodSaved();
            if (onNavigateToPayout) onNavigateToPayout(periodId);
        } catch (err) {
            toast.error('บันทึกรอบปันผลล้มเหลว: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Wizard Step Navigation */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3 shadow-sm flex items-center justify-between overflow-x-auto text-xs">
                <div 
                    onClick={() => setWizardStep(1)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                        wizardStep === 1 ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
                    <span>รอบปีและกำไรสุทธิ</span>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
                <div 
                    onClick={() => setWizardStep(2)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                        wizardStep === 2 ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
                    <span>เลือกสูตรเฉลี่ยคืน & สัดส่วน</span>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
                <div 
                    onClick={() => {
                        runSimulation();
                        setWizardStep(3);
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                        wizardStep === 3 ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-200' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                >
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
                    <span>ตรวจสอบ & ปรับโบนัสกรรมการ</span>
                </div>
            </div>

            {/* ================= STEP 1: PERIOD & PROFIT ================= */}
            {wizardStep === 1 && (
                <DividendWizardStep1
                    year={year}
                    setYear={setYear}
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    title={title}
                    setTitle={setTitle}
                    simulationData={simulationData}
                    runSimulation={runSimulation}
                    isSimulating={isSimulating}
                    manualProfitOverride={manualProfitOverride}
                    setManualProfitOverride={setManualProfitOverride}
                    overrideMode={overrideMode}
                    setOverrideMode={setOverrideMode}
                    allocatedProfit={allocatedProfit}
                    setAllocatedProfit={setAllocatedProfit}
                    retainedEarnings={retainedEarnings}
                    setRetainedEarnings={setRetainedEarnings}
                    setWizardStep={setWizardStep}
                />
            )}

            {/* ================= STEP 2: FORMULA & POOL ================= */}
            {wizardStep === 2 && (
                <DividendWizardStep2
                    allocatedProfit={allocatedProfit}
                    patronageFormulaType={patronageFormulaType}
                    setPatronageFormulaType={setPatronageFormulaType}
                    patronageRefundRate={patronageRefundRate}
                    setPatronageRefundRate={setPatronageRefundRate}
                    reservePct={reservePct}
                    setReservePct={setReservePct}
                    welfarePct={welfarePct}
                    setWelfarePct={setWelfarePct}
                    boardBonusPct={boardBonusPct}
                    setBoardBonusPct={setBoardBonusPct}
                    dividendShareRate={dividendShareRate}
                    setDividendShareRate={setDividendShareRate}
                    runSimulation={runSimulation}
                    setWizardStep={setWizardStep}
                />
            )}

            {/* ================= STEP 3: PREVIEW & CUSTOMIZE ================= */}
            {wizardStep === 3 && (
                <DividendWizardStep3
                    allocatedProfit={allocatedProfit}
                    runSimulation={runSimulation}
                    isSimulating={isSimulating}
                    liveTotals={liveTotals}
                    year={year}
                    patronageFormulaType={patronageFormulaType}
                    liveDistributions={liveDistributions}
                    handleUpdateBoardBonus={handleUpdateBoardBonus}
                    isSaving={isSaving}
                    handleSaveAndApprove={handleSaveAndApprove}
                    setWizardStep={setWizardStep}
                />
            )}
        </div>
    );
};

export default DividendWizardTab;
