import React from 'react';
import { Trees, ChevronRight, MapPin, CloudRain, Sprout, AlertTriangle } from 'lucide-react';
import LandPlotMap from '../../components/map/LandPlotMap';

export const MemberPortalPlotsTab = ({
    member,
    isTapper,
    plots = [],
    selectedPlot,
    setSelectedPlotId,
    weather,
    plotCare,
    recommendedBagsPerApp,
    recommendedKgPerApp
}) => {
    if (!member?.farmerId && !isTapper && plots.length === 0) return null;

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Banner with Direct Link to Full Map */}
            <div className="bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-900 rounded-3xl p-5 text-white shadow-lg shadow-emerald-800/20 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest block">
                            ระบบแปลงสวนยางพารา & ผลผลิต
                        </span>
                        <h3 className="text-lg font-black mt-0.5">
                            พอร์ทัลข้อมูลแปลงสวนยาง
                        </h3>
                        <p className="text-xs text-emerald-100 mt-1">
                            ตรวจสอบสภาพอากาศรายวัน, แผนที่ดาวเทียม GIS และแผนการใส่ปุ๋ย
                        </p>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-xs">
                        <Trees size={22} className="text-white" />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => window.location.href = `/farmer-plot?id=${member?.farmerId}`}
                    className="w-full py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center space-x-1.5 active:scale-[0.98]"
                >
                    <span>เข้าสู่หน้าแผนที่แปลงสวนยางตัวเต็ม (GIS)</span>
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Plot Selector Tabs (If multiple plots) */}
            {plots.length > 1 && (
                <div className="bg-white p-2.5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-2 overflow-x-auto custom-scrollbar">
                    <span className="text-[11px] font-bold text-gray-500 pl-1 whitespace-nowrap">เลือกแปลง:</span>
                    {plots.map((p, idx) => {
                        const isSelected = selectedPlot?.id === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedPlotId(p.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                                    isSelected
                                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <MapPin size={13} />
                                <span>{p.plotName || `แปลงที่ ${idx + 1}`} ({p.rai || p.totalRai || 0} ไร่)</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Weather Tapping Card (วันนี้กรีดยางได้มั้ย?) */}
            <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 flex items-center space-x-1.5">
                        <CloudRain size={16} className="text-blue-600" />
                        <span>สภาพอากาศสวนยางวันนี้ (01:00 - 06:00 น.)</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">รายพิกัดแปลง</span>
                </div>

                {weather ? (
                    <div className="space-y-2">
                        <div className={`p-3.5 rounded-2xl border text-center font-bold ${
                            weather.canTap === 'yes' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
                            weather.canTap === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-red-50 border-red-300 text-red-900'
                        }`}>
                            <span className="text-xl block font-black">{weather.canTapText}</span>
                            <span className="text-xs font-normal block mt-1">
                                โอกาสฝนตกช่วงเช้ามืด: <strong>{weather.rainProbability}%</strong> (ฝนสะสม {weather.totalRainMm} มม.)
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[11px] text-gray-400 block">อุณหภูมิ</span>
                                <span className="font-bold text-gray-800">{weather.avgTemp} °C</span>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[11px] text-gray-400 block">ความชื้นสัมพัทธ์</span>
                                <span className="font-bold text-gray-800">{weather.avgHumidity} %</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-2xl flex flex-col items-center">
                        <MapPin size={20} className="text-gray-300 mb-1" />
                        <span>{selectedPlot ? 'แปลงนี้ยังไม่ได้ระบุพิกัด GPS เพื่อตรวจสภาพอากาศ' : 'ยังไม่มีข้อมูลแปลงสวนยาง'}</span>
                    </div>
                )}
            </div>

            {/* Satellite Map View */}
            {selectedPlot && (
                <div className="bg-white p-3.5 rounded-3xl shadow-xs border border-gray-100 space-y-2">
                    <div className="flex justify-between items-center px-1 text-xs">
                        <span className="font-bold text-gray-800 flex items-center space-x-1">
                            <MapPin size={15} className="text-emerald-600" />
                            <span>ผังแปลงดาวเทียม (Satellite Map)</span>
                        </span>
                        <span className="text-[10px] text-gray-400">ซูมดูขอบเขตแปลง</span>
                    </div>
                    <div className="h-64 w-full rounded-2xl overflow-hidden shadow-inner border border-gray-200">
                        <LandPlotMap
                            plots={[selectedPlot]}
                            selectedPlotId={selectedPlot.id}
                        />
                    </div>
                </div>
            )}

            {/* Plot Details: Area & Fertilizer Plan */}
            <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                        <Sprout size={16} className="text-emerald-600" />
                        <span>ข้อมูลแปลง & แผนการใส่ปุ๋ย</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                        {selectedPlot?.plotName || 'แปลงสวนยาง'}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div>
                        <span className="text-gray-400 block text-[11px]">ขนาดเนื้อที่</span>
                        <span className="font-bold text-gray-800">
                            {selectedPlot?.rai || selectedPlot?.totalRai || 0} ไร่ {selectedPlot?.ngan || 0} งาน {selectedPlot?.sqWah ? `${selectedPlot.sqWah} ตร.ว.` : ''}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-400 block text-[11px]">เลขโฉนด / เอกสารสิทธิ์</span>
                        <span className="font-bold text-gray-800 font-mono">{selectedPlot?.deedNumber || '-'}</span>
                    </div>
                </div>

                {/* Fertilizer Recommendation */}
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 text-xs space-y-1">
                    <div className="font-bold text-emerald-950 flex justify-between items-center">
                        <span>สูตรปุ๋ยแนะนำ (กยท.):</span>
                        <span className="text-emerald-700 font-mono font-black">{recommendedBagsPerApp} กระสอบ</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                        แนะนำสูตร <strong>29-5-18</strong> หรือ <strong>20-8-20</strong> (ประมาณ {recommendedKgPerApp} กก./รอบ)
                    </p>
                </div>

                {/* Next Fertilizer & Mowing Status */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-100">
                        <span className="text-[10px] text-amber-700 block font-bold">รอบใส่ปุ๋ยถัดไป:</span>
                        <span className="font-bold text-amber-900 text-[11px] block mt-0.5">
                            {plotCare?.lastFertilizer?.nextDueDate || 'รอบปลายฝน (ก.ย.-ต.ค.)'}
                        </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-bold">ความสะอาดสวน:</span>
                        <span className={`font-bold text-[11px] block mt-0.5 ${
                            plotCare?.lastMowing?.status === 'clean' ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                            {plotCare?.lastMowing?.status === 'clean' ? '🌿 สวนสะอาดเรียบร้อย' : '🌾 ใกล้ถึงรอบตัดหญ้า'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Smart DRC Advice Card */}
            <div className="bg-white p-4 rounded-3xl shadow-xs border border-gray-100 space-y-2 text-xs">
                <span className="font-bold text-gray-800 flex items-center space-x-1.5 pb-1 border-b border-gray-100">
                    <AlertTriangle size={15} className="text-amber-500" />
                    <span>วิธีปรับสภาพเมื่อเปอร์เซ็นต์น้ำยาง (% DRC) ตกต่ำ</span>
                </span>
                <ul className="space-y-1.5 text-[11px] text-gray-600 list-disc list-inside bg-amber-50/50 p-3 rounded-2xl border border-amber-100">
                    <li><strong>ดินเป็นกรด:</strong> หว่านปูนโดโลไมท์ 50-100 กก./ไร่ เพื่อปรับค่า pH</li>
                    <li><strong>กรีดถี่เกินไป:</strong> ปรับเป็นระบบ <strong>วันเว้นวัน (D2)</strong> พักหน้ายางให้ต้นสะสมน้ำตาล</li>
                    <li><strong>เสริมปุ๋ย:</strong> ใส่ปุ๋ยที่มีโพแทสเซียม (K) สูง เพิ่มความเข้มข้นของน้ำยาง</li>
                </ul>
            </div>
        </div>
    );
};

export default MemberPortalPlotsTab;
