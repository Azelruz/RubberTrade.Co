import React from 'react';
import { X, Droplets, Truck, Scale, ShieldCheck, Clock, User, Layers, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export const YardInspectorDrawer = ({ selectedEntity, onClose, onQuickSimulate }) => {
    if (!selectedEntity) return null;

    const { type, data } = selectedEntity;

    return (
        <aside 
            className="w-80 md:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl p-5 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-300 z-30"
            role="region"
            aria-label="Yard Inspector Panel"
        >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-rubber-50 dark:bg-rubber-950/60 text-rubber-600 dark:text-rubber-400 border border-rubber-100 dark:border-rubber-900/60">
                        {type === 'station' && <Scale className="w-5 h-5" />}
                        {type === 'tank' && <Droplets className="w-5 h-5" />}
                        {type === 'yard' && <Layers className="w-5 h-5" />}
                        {type === 'truck' && <Truck className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            {type === 'station' && 'Weighing Station · แท่นชั่ง'}
                            {type === 'tank' && 'Liquid Latex Silo · ถังน้ำยาง'}
                            {type === 'yard' && 'Storage Yard · ลานเก็บยาง'}
                            {type === 'truck' && 'Live Inbound · รายการรับเข้า'}
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                            {data.title || data.farmerName || 'จุดตรวจการ'}
                        </h3>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label="Close panel"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Status Pill */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 font-medium">สถานะปฏิบัติการ</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {data.status || 'พร้อมใช้งาน (Online)'}
                </span>
            </div>

            {/* Main Stats Details */}
            <div className="space-y-3 text-xs">
                {type === 'station' && (
                    <>
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">พิกัดรับน้ำหนัก</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">15,000 กก.</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">ประเภทหัวอ่าน</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">RS-232 / Auto</span>
                            </div>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-rubber-50/50 dark:bg-rubber-950/30 border border-rubber-100 dark:border-rubber-900/50 space-y-1.5">
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>ความคลาดเคลื่อนชั่ง:</span>
                                <span className="font-bold text-slate-900 dark:text-white">±0.05% (Certified)</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>เวลาชั่งเฉลี่ยต่อคัน:</span>
                                <span className="font-bold text-slate-900 dark:text-white">1.8 นาที</span>
                            </div>
                        </div>
                    </>
                )}

                {type === 'tank' && (
                    <>
                        <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-blue-700 dark:text-blue-300 font-bold text-xs">ความจุน้ำยางปัจจุบัน</span>
                                <span className="text-blue-800 dark:text-blue-200 font-black text-sm">{data.volumePct || 74}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-blue-100 dark:bg-blue-900/60 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-rubber-500 rounded-full transition-all duration-500"
                                    style={{ width: `${data.volumePct || 74}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-[11px] text-blue-600/80 dark:text-blue-400 mt-2">
                                <span>คงเหลือ: <strong>{data.currentVolume || '14,800'} ลิตร</strong></span>
                                <span>ความจุ: <strong>20,000 ลิตร</strong></span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">DRC เฉลี่ยในถัง</span>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{data.avgDrc || '33.8%'}</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">แอมโมเนียผสม</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">0.6% ปกติ</span>
                            </div>
                        </div>
                    </>
                )}

                {type === 'yard' && (
                    <>
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60">
                                <span className="text-amber-700 dark:text-amber-400 text-[10px] uppercase font-bold block">สต็อกยางก้อนถ้วย</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">{data.stockWeight || '8,450'} กก.</span>
                            </div>
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">ความชื้นประเมิน</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">50.0%</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                            <span className="text-slate-400 text-[10px] uppercase font-bold block">พื้นที่ลานเท</span>
                            <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                <span>โซน A (ยางใหม่วันนี้):</span>
                                <span className="font-bold text-slate-900 dark:text-white">3,200 กก.</span>
                            </div>
                            <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                <span>โซน B (พร้อมขึ้นรถโรงงาน):</span>
                                <span className="font-bold text-slate-900 dark:text-white">5,250 กก.</span>
                            </div>
                        </div>
                    </>
                )}

                {type === 'truck' && (
                    <>
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-rubber-500" />
                                <span className="font-bold text-slate-800 dark:text-white">{data.farmerName || 'เกษตรกรชาวสวน'}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                                <span>วัตถุดิบ:</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                    {data.rubberType === 'cup_lump' ? 'ยางก้อนถ้วย' : 'น้ำยางสด'}
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                                <span>น้ำหนักสุทธิ:</span>
                                <span className="font-black text-slate-900 dark:text-white">{data.weight || 0} กก.</span>
                            </div>
                            {data.drc > 0 && (
                                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                                    <span>DRC:</span>
                                    <span className="font-black text-emerald-600 dark:text-emerald-400">{data.drc}%</span>
                                </div>
                            )}
                            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px] pt-1.5 border-t border-slate-200/60 dark:border-slate-700">
                                <span>ยอดเงินจ่าย:</span>
                                <span className="font-black text-rubber-600 dark:text-rubber-400 text-sm">
                                    ฿{Number(data.totalPrice || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Quick Action Footer */}
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <button
                    onClick={() => onQuickSimulate && onQuickSimulate(type === 'yard' ? 'cup_lump' : 'latex')}
                    className="flex-1 py-2.5 px-3 rounded-2xl bg-rubber-600 hover:bg-rubber-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rubber-600/20 transition-all"
                >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>จำลองคิวชั่ง</span>
                </button>
            </div>
        </aside>
    );
};
