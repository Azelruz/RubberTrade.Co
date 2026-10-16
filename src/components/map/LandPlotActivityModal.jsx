import React from 'react';
import { X, Sprout, Wrench } from 'lucide-react';

export const LandPlotActivityModal = ({
    showFertilizerModal,
    showMaintenanceModal,
    onClose,
    activityForm,
    setActivityForm,
    onSubmit,
    selectedPlot,
    recommendedKgPerApp,
    recommendedBagsPerApp
}) => {
    const isFertilizer = showFertilizerModal;
    const isMaintenance = showMaintenanceModal;
    if (!isFertilizer && !isMaintenance) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
                <div className={`p-5 text-white flex items-center justify-between ${
                    isFertilizer ? 'bg-gradient-to-r from-emerald-600 to-teal-800' : 'bg-gradient-to-r from-blue-600 to-indigo-800'
                }`}>
                    <div className="flex items-center space-x-2.5">
                        {isFertilizer ? <Sprout size={22} /> : <Wrench size={22} />}
                        <h3 className="font-black text-lg">
                            {isFertilizer ? 'บันทึกการใส่ปุ๋ยบำรุงสวนยาง' : 'บันทึกงานดูแลสวน (ตัดหญ้า/กำจัดวัชพืช)'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs font-medium">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">แปลงสวนยาง:</span>
                            <div className="font-black text-gray-900 text-sm">{selectedPlot?.plotName || 'ไม่ระบุชื่อแปลง'}</div>
                        </div>
                        {isFertilizer && (
                            <div className="text-right">
                                <span className="text-[10px] text-emerald-600 font-bold uppercase">ปุ๋ยที่แนะนำ:</span>
                                <div className="font-bold text-emerald-800">{recommendedKgPerApp} กก. ({recommendedBagsPerApp} กระสอบ)</div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="font-bold text-gray-700">วันที่ทำกิจกรรม <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                required
                                value={activityForm.date}
                                onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold"
                            />
                        </div>

                        {isFertilizer ? (
                            <div className="space-y-1">
                                <label className="font-bold text-gray-700">สูตรปุ๋ย</label>
                                <select
                                    value={activityForm.fertilizerFormula}
                                    onChange={(e) => setActivityForm({ ...activityForm, fertilizerFormula: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white"
                                >
                                    <option value="29-5-18">29-5-18 (เร่งน้ำยาง-ต้นยางพารา)</option>
                                    <option value="20-8-20">20-8-20 (บำรุงต้น/เพิ่มผลผลิต)</option>
                                    <option value="15-15-15">15-15-15 (สูตรเสมอ)</option>
                                    <option value="16-16-16">16-16-16 (สูตรเสมอ)</option>
                                    <option value="0-0-60">0-0-60 (เร่งน้ำยางข้น)</option>
                                    <option value="organic">ปุ๋ยอินทรีย์ / ปุ๋ยคอก</option>
                                    <option value="other">อื่นๆ</option>
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <label className="font-bold text-gray-700">ประเภทกิจกรรม</label>
                                <select
                                    value={activityForm.activityType}
                                    onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white"
                                >
                                    <option value="mowing">ตัดหญ้า / ถางป่า</option>
                                    <option value="weed_control">ฉีดยากำจัดวัชพืช</option>
                                    <option value="disease_treatment">พ่นยาป้องกันโรคราราก/ราหน้ายาง</option>
                                    <option value="tapping_maintenance">ติดแก๊ส / เร่งน้ำยาง</option>
                                    <option value="service">งานบริการอื่นๆ</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {isFertilizer ? (
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="font-bold text-gray-700">ยี่ห้อ / แบรนด์</label>
                                <input
                                    type="text"
                                    placeholder="เช่น ตราหัวทราย"
                                    value={activityForm.brand}
                                    onChange={(e) => setActivityForm({ ...activityForm, brand: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="font-bold text-gray-700">จำนวน (กิโลกรัม)</label>
                                <input
                                    type="number"
                                    placeholder="150"
                                    value={activityForm.amountKg}
                                    onChange={(e) => setActivityForm({ ...activityForm, amountKg: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="font-bold text-gray-700">จำนวนกระสอบ</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    placeholder="3"
                                    value={activityForm.bags}
                                    onChange={(e) => setActivityForm({ ...activityForm, bags: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <label className="font-bold text-gray-700">หัวข้อ / รายละเอียดงาน</label>
                            <input
                                type="text"
                                placeholder="เช่น ตัดหญ้าแปลง 1 บริเวณร่องยาง"
                                value={activityForm.title}
                                onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="font-bold text-gray-700">ค่าใช้จ่ายรวม (บาท)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={activityForm.cost}
                                onChange={(e) => setActivityForm({ ...activityForm, cost: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-emerald-800"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="font-bold text-gray-700">ผู้รับจ้าง / ผู้ดำเนินการ</label>
                            <input
                                type="text"
                                placeholder="เช่น จ้างลุงสมนึก / ทำเอง"
                                value={activityForm.serviceProvider}
                                onChange={(e) => setActivityForm({ ...activityForm, serviceProvider: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="font-bold text-gray-700">กำหนดทำครั้งถัดไป (แจ้งเตือน)</label>
                        <input
                            type="date"
                            value={activityForm.nextDueDate}
                            onChange={(e) => setActivityForm({ ...activityForm, nextDueDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                        />
                    </div>

                    <div className="flex space-x-2 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs shadow-md ${
                                isFertilizer ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            บันทึกกิจกรรม
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
