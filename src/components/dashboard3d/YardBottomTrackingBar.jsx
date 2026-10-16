import React from 'react';
import { Truck, CheckCircle2, Scale, Droplets, Receipt, FastForward, Clock } from 'lucide-react';
import { SIMULATION_STATES } from '../../hooks/useYardSimulation';

export const YardBottomTrackingBar = ({ simState, activeJob, onSkip }) => {
    // Determine active step index (0 to 4)
    let currentStep = 0;
    if (simState === SIMULATION_STATES.TRUCK_INBOUND) currentStep = 0;
    else if (simState === SIMULATION_STATES.WEIGHING_SCALE) currentStep = 1;
    else if (simState === SIMULATION_STATES.DRC_SAMPLING) currentStep = 2;
    else if (simState === SIMULATION_STATES.TRANSFER_PAYLOAD) currentStep = 3;
    else if (simState === SIMULATION_STATES.SETTLEMENT_SLIP || simState === SIMULATION_STATES.TRUCK_OUTBOUND || simState === SIMULATION_STATES.METRICS_SYNC) currentStep = 4;

    const steps = [
        { label: 'เข้าคิวชั่ง', icon: Truck, detail: activeJob ? activeJob.station || 'Station 1' : 'คิวถัดไป' },
        { label: 'ชั่งน้ำหนัก', icon: Scale, detail: activeJob ? `${activeJob.weight} กก.` : 'รอรถเทียบ' },
        { label: 'สุ่มตรวจ DRC', icon: Droplets, detail: activeJob?.drc ? `${activeJob.drc}%` : 'ประเมินคุณภาพ' },
        { label: 'ถ่ายลงคลัง', icon: CheckCircle2, detail: activeJob?.rubberType === 'cup_lump' ? 'ลานยางก้อน' : 'Silo Tank' },
        { label: 'ออกสลิป & โอนเงิน', icon: Receipt, detail: activeJob ? `฿${Number(activeJob.totalPrice).toLocaleString()}` : 'พร้อมปิดบิล' }
    ];

    const isSimulating = simState !== SIMULATION_STATES.IDLE;

    return (
        <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left: Active Live Stepper */}
            <div className="flex-1 w-full overflow-x-auto pb-1 md:pb-0">
                <div className="flex items-center justify-between min-w-[550px] relative">
                    {/* Connecting line */}
                    <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0">
                        <div 
                            className="h-full bg-rubber-500 transition-all duration-500"
                            style={{ width: isSimulating ? `${(currentStep / 4) * 100}%` : '0%' }}
                        ></div>
                    </div>

                    {steps.map((step, idx) => {
                        const Icon = step.icon;
                        const isDone = isSimulating && currentStep > idx;
                        const isCurrent = isSimulating && currentStep === idx;

                        return (
                            <div key={idx} className="flex flex-col items-center relative z-10 px-2 text-center group">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    isCurrent 
                                        ? 'bg-rubber-600 text-white ring-4 ring-rubber-500/20 scale-110 shadow-lg shadow-rubber-600/30' 
                                        : isDone 
                                            ? 'bg-emerald-500 text-white' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                }`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <span className={`text-[11px] font-bold mt-1.5 leading-tight ${
                                    isCurrent 
                                        ? 'text-rubber-600 dark:text-rubber-400' 
                                        : isDone 
                                            ? 'text-slate-800 dark:text-slate-200' 
                                            : 'text-slate-400 dark:text-slate-500'
                                }`}>
                                    {step.label}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {step.detail}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Right: Quick Station Status & Skip Button */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-4">
                {isSimulating ? (
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">กำลังจำลอง</span>
                            <span className="text-xs font-black text-rubber-600 dark:text-rubber-400 block truncate max-w-[140px]">
                                {activeJob?.farmerName || 'เกษตรกร'}
                            </span>
                        </div>
                        <button
                            onClick={onSkip}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                            <FastForward className="w-3.5 h-3.5" />
                            <span>ข้าม</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-slate-500 font-medium">Bay 1:</span>
                            <strong className="text-slate-800 dark:text-white">พร้อม</strong>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-slate-500 font-medium">Bay 2:</span>
                            <strong className="text-slate-800 dark:text-white">พร้อม</strong>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
