import React from 'react';
import { DollarSign, Save, RefreshCw, Info, ChevronRight, Trash2 } from 'lucide-react';

export const PriceSettings = ({ 
    dailyPriceObj, 
    priceForm, 
    onSubmitDailyPrice, 
    saving, 
    notifyPriceLine, 
    setNotifyPriceLine, 
    drcBonuses, 
    handleAddDrcBonus, 
    handleRemoveDrcBonus, 
    handleDrcBonusChange, 
    handleSaveDrcBonuses,
    fscBonus,
    setFscBonus
}) => {
    return (
        <div className="max-w-2xl">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <DollarSign className="mr-2 text-green-600" size={20} />
                        ตั้งค่าราคากลางรายวัน
                    </h2>
                    <p className="text-gray-500 text-sm">อัปเดตราคากลางเพื่อใช้คำนวณในหน้า "รับซื้อ" ประจำวันนี้</p>
                </div>
                <div className="bg-green-50 px-3 py-1 rounded-full border border-green-100 flex items-center">
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider mr-2">อัปเดตล่าสุด:</span>
                    <span className="text-xs font-mono font-bold text-green-800">{dailyPriceObj.date || 'ยังไม่มีข้อมูล'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <form onSubmit={priceForm.handleSubmit(onSubmitDailyPrice)} className="space-y-4">
                        <div className="bg-white border-2 border-rubber-100 rounded-2xl p-6 shadow-sm">
                            <label className="block text-sm font-bold text-gray-700 mb-2">ราคากลางวันนี้ (บาท/กก.)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    {...priceForm.register('dailyPrice', { required: true })}
                                    className="w-full text-4xl font-black text-rubber-700 px-4 py-3 border-b-4 border-rubber-500 focus:outline-none bg-rubber-50/30 rounded-t-lg transition-all"
                                    placeholder="0.00"
                                />
                                <span className="absolute right-4 bottom-4 text-gray-400 font-bold">บาท</span>
                            </div>

                            <div className="mt-4 p-3 bg-rubber-50/50 rounded-xl border border-rubber-100/50">
                                <label className="flex items-center cursor-pointer group">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only" 
                                            checked={notifyPriceLine}
                                            onChange={(e) => setNotifyPriceLine(e.target.checked)}
                                        />
                                        <div className={`block w-10 h-6 rounded-full transition-colors ${notifyPriceLine ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${notifyPriceLine ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <div className="ml-3 text-sm font-bold text-gray-700 group-hover:text-green-600 transition-colors">
                                        ประกาศราคาใหม่ทาง LINE
                                    </div>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full mt-4 bg-rubber-600 text-white rounded-xl px-6 py-3 font-bold hover:bg-rubber-700 shadow-lg shadow-rubber-200 transition-all flex items-center justify-center space-x-2"
                            >
                                <Save size={20} />
                                <span>{saving ? 'กำลังบันทึก...' : 'อัปเดตราคาประจำวันนี้'}</span>
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-blue-800 flex items-center">
                            <Info size={18} className="mr-2" />
                            ตั้งค่าเงื่อนไขโบนัส
                        </h3>
                        <button
                            type="button"
                            onClick={handleAddDrcBonus}
                            className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-200"
                        >
                            + เพิ่ม %DRC
                        </button>
                    </div>

                    <div className="mb-6 p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                            <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                            โบนัสสมาชิก FSC (บาท/กก.)
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={fscBonus}
                                onChange={(e) => setFscBonus(e.target.value)}
                                className="w-full text-2xl font-black text-amber-600 px-4 py-2 border-b-2 border-amber-400 focus:outline-none bg-amber-50/30 rounded-t-lg transition-all"
                                placeholder="1.0"
                            />
                            <span className="absolute right-4 bottom-2 text-gray-400 font-bold text-sm">บาท</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 italic font-medium">* ระบบจะเพิ่มโบนัสนี้ให้อัตโนมัติสำหรับเกษตรกรที่มีรหัส FSC</p>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-blue-600 mb-2 px-2">
                            <div className="col-span-1"></div>
                            <div className="col-span-5 text-center">เริ่มที่ %DRC</div>
                            <div className="col-span-4 text-center">โบนัส (+บาท)</div>
                            <div className="col-span-2 text-center">ลบ</div>
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {drcBonuses.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-blue-100">
                                    <div className="col-span-1 flex justify-center text-blue-400">
                                        <ChevronRight size={14} />
                                    </div>
                                    <div className="col-span-5 relative">
                                        <input 
                                            type="number" 
                                            value={item.drc} 
                                            onChange={(e) => handleDrcBonusChange(index, 'drc', e.target.value)}
                                            className="w-full text-center py-1.5 border border-gray-200 rounded focus:border-blue-500 focus:outline-none text-sm font-medium"
                                            placeholder="เช่น 31"
                                        />
                                    </div>
                                    <div className="col-span-4 relative">
                                        <input 
                                            type="number" 
                                            value={item.bonus} 
                                            onChange={(e) => handleDrcBonusChange(index, 'bonus', e.target.value)}
                                            className="w-full text-center py-1.5 border border-gray-200 rounded focus:border-blue-500 focus:outline-none text-sm font-bold text-blue-600"
                                            placeholder="เช่น 1"
                                        />
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveDrcBonus(index)}
                                            className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {drcBonuses.length === 0 && (
                                <div className="text-center py-4 text-sm text-gray-400">ยังไม่มีการตั้งค่าโบนัส DRC</div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleSaveDrcBonuses}
                            disabled={saving}
                            className="w-full mt-4 bg-blue-600 text-white rounded-xl px-4 py-3 font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            <Save size={18} />
                            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าโบนัสทั้งหมด'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
