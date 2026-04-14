import React from 'react';
import { 
    Truck, ChevronDown, Upload, X, Edit2
} from 'lucide-react';

const SellForm = ({ 
    register, handleSubmit, onSubmit, watch, setValue, reset, errors,
    editingRecord, setEditingRecord, isSubmitting,
    watchRubberType, watchWeight, watchDrc, watchPricePerKg,
    factorySearch, setFactorySearch, showFactoryResults, setShowFactoryResults,
    truckSearch, setTruckSearch, showTruckResults, setShowTruckResults,
    staffSearch, setStaffSearch, showStaffResults, setShowStaffResults,
    factories, trucks, staff,
    lossSign, setLossSign, isAutoAdjust, setIsAutoAdjust,
    stockMetrics, calculateDryRubber, calculateTotal,
    previewUrl, setPreviewUrl, setSelectedFile, handleImageUpload
}) => {
    return (
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Truck className="mr-2 text-orange-500" size={20} />
                    {editingRecord ? 'แก้ไขรายการขาย' : 'เพิ่มรายการขาย'}
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="flex p-1 bg-gray-100 rounded-lg">
                        <button 
                            type="button"
                            onClick={() => { setValue('rubberType', 'latex'); setIsAutoAdjust(true); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${watchRubberType === 'latex' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            น้ำยางสด
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setValue('rubberType', 'cup_lump'); setIsAutoAdjust(false); setValue('lossWeight', '0'); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${watchRubberType === 'cup_lump' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            ขี้ยาง
                        </button>
                    </div>
                    <input type="hidden" {...register('rubberType')} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ <span className="text-red-500">*</span></label>
                        <input 
                            type="date" 
                            {...register('date', { 
                                required: 'กรุณาระบุวันที่ขาย',
                                validate: (val) => new Date(val) <= new Date() || 'ห้ามระบุวันที่ในอนาคต'
                            })} 
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${errors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                        />
                        {errors.date && <p className="text-red-500 text-xs mt-1 font-medium">{errors.date.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">โรงงาน / ผู้ซื้อ</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            </div>
                            <input 
                                type="text" 
                                value={factorySearch}
                                onChange={(e) => {
                                    setFactorySearch(e.target.value);
                                    setShowFactoryResults(true);
                                    setValue('buyerName', e.target.value);
                                }}
                                onFocus={() => setShowFactoryResults(true)}
                                onClick={() => setShowFactoryResults(true)}
                                placeholder="ค้นหาชื่อโรงงาน / ผู้ซื้อ..." 
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 cursor-pointer" 
                            />
                            {showFactoryResults && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                    {factories.filter(f => 
                                        !factorySearch || f.name?.toLowerCase().includes(factorySearch.toLowerCase())
                                    ).length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-sm">ไม่พบข้อมูลโรงงาน</div>
                                    ) : (
                                        factories.filter(f => 
                                            !factorySearch || f.name?.toLowerCase().includes(factorySearch.toLowerCase())
                                        ).map(f => (
                                            <div 
                                                key={f.id}
                                                className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 group"
                                                onClick={() => {
                                                    setValue('buyerName', f.name);
                                                    setValue('factoryId', f.id);
                                                    setFactorySearch(f.name);
                                                    setShowFactoryResults(false);
                                                }}
                                            >
                                                <div className="font-black text-gray-900 group-hover:text-orange-700">{f.name}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">ID: {f.code || '-'}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <input type="hidden" {...register('buyerName', { required: true })} />
                        <input type="hidden" {...register('factoryId')} />
                    </div>

                    {watchRubberType === 'latex' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รถขนส่ง</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={truckSearch}
                                        onChange={(e) => {
                                            setTruckSearch(e.target.value);
                                            setShowTruckResults(true);
                                            setValue('truckInfo', e.target.value);
                                        }}
                                        onFocus={() => setShowTruckResults(true)}
                                        placeholder="ค้นหาทะเบียนรถ..." 
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 cursor-pointer" 
                                    />
                                    {showTruckResults && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                            {trucks.filter(t => 
                                                !truckSearch || 
                                                t.licensePlate?.toLowerCase().includes(truckSearch.toLowerCase()) || 
                                                t.brand?.toLowerCase().includes(truckSearch.toLowerCase())
                                            ).length === 0 ? (
                                                <div className="p-4 text-center text-gray-500 text-sm">ไม่พบข้อมูลรถ</div>
                                            ) : (
                                                trucks.filter(t => 
                                                    !truckSearch ||
                                                    t.licensePlate?.toLowerCase().includes(truckSearch.toLowerCase()) || 
                                                    t.brand?.toLowerCase().includes(truckSearch.toLowerCase())
                                                ).map(t => (
                                                    <div 
                                                        key={t.id}
                                                        className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 group"
                                                        onClick={() => {
                                                            setValue('truckInfo', t.licensePlate);
                                                            setValue('truckId', t.id);
                                                            setTruckSearch(t.licensePlate);
                                                            setShowTruckResults(false);
                                                        }}
                                                    >
                                                        <div className="font-black text-gray-900 group-hover:text-orange-700">{t.licensePlate}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{t.brand} {t.model}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                <input type="hidden" {...register('truckInfo')} />
                                <input type="hidden" {...register('truckId')} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">พนักงานผู้รับผิดชอบ</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={staffSearch}
                                        onChange={(e) => {
                                            setStaffSearch(e.target.value);
                                            setShowStaffResults(true);
                                        }}
                                        onFocus={() => setShowStaffResults(true)}
                                        placeholder="ค้นหาชื่อพนักงาน..." 
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 cursor-pointer" 
                                    />
                                    {showStaffResults && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                            {staff.filter(s => 
                                                !staffSearch || s.name?.toLowerCase().includes(staffSearch.toLowerCase())
                                            ).length === 0 ? (
                                                <div className="p-4 text-center text-gray-500 text-sm">ไม่พบข้อมูลพนักงาน</div>
                                            ) : (
                                                staff.filter(s => 
                                                    !staffSearch || s.name?.toLowerCase().includes(staffSearch.toLowerCase())
                                                ).map(s => (
                                                    <div 
                                                        key={s.id}
                                                        className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 group"
                                                        onClick={() => {
                                                            setValue('employeeId', s.id);
                                                            setStaffSearch(s.name);
                                                            setShowStaffResults(false);
                                                        }}
                                                    >
                                                        <div className="font-black text-gray-900 group-hover:text-orange-700">{s.name}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Phone: {s.phone || '-'}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                <input type="hidden" {...register('employeeId')} />
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-gray-700 font-bold">น้ำหนักรวมขาย (กก.)</label>
                                <button 
                                    type="button"
                                    onClick={() => setValue('weight', watchRubberType === 'cup_lump' ? stockMetrics.cupLumpStock : stockMetrics.currentStock)}
                                    className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md font-black hover:bg-gray-200 transition-colors cursor-pointer"
                                    title="คลิกเพื่อใส่ค่ายอดคงเหลือ"
                                >
                                    คงเหลือ: {(watchRubberType === 'cup_lump' ? stockMetrics.cupLumpStock : stockMetrics.currentStock).toLocaleString()} กก.
                                </button>
                            </div>
                            <input 
                                type="number" 
                                step="0.1" 
                                {...register('weight', { 
                                    required: 'กรุณาระบุน้ำหนักที่ขาย',
                                    min: { value: 0.1, message: 'น้ำหนักต้องมากกว่า 0' }
                                })} 
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500 font-bold ${errors.weight ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                            />
                            {errors.weight && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.weight.message}</p>}
                        </div>
                        {watchRubberType === 'latex' && (
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-gray-700">DRC (%)</label>
                                    <button 
                                        type="button"
                                        onClick={() => setValue('drc', stockMetrics.avgDrc)}
                                        className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-md font-black hover:bg-orange-100 transition-colors cursor-pointer"
                                        title="คลิกเพื่อใช้ค่า DRC เฉลี่ย"
                                    >
                                        เฉลี่ย: {stockMetrics.avgDrc.toFixed(2)}%
                                    </button>
                                </div>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    {...register('drc', { 
                                        required: 'กรุณาระบุเปอร์เซ็นต์ DRC',
                                        min: { value: 1, message: 'DRC ขั้นต่ำ 1%' },
                                        max: { value: 100, message: 'DRC สูงสุด 100%' }
                                    })} 
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${errors.drc ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                />
                                {errors.drc && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.drc.message}</p>}
                            </div>
                        )}
                    </div>

                    {watchRubberType === 'latex' && (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-bold text-gray-700">ปรับปรุงสต๊อก (Stock Adjustment)</label>
                                <button 
                                    type="button"
                                    onClick={() => setIsAutoAdjust(!isAutoAdjust)}
                                    className={`px-2 py-1 rounded text-[10px] font-black transition-all flex items-center gap-1 ${isAutoAdjust ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                                >
                                    {isAutoAdjust ? 'AUTO ON' : 'AUTO OFF'}
                                </button>
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-2">
                                <button 
                                    type="button"
                                    onClick={() => { setLossSign('plus'); setIsAutoAdjust(false); }}
                                    className={`flex-1 py-1.5 rounded-md text-[11px] font-black transition-all ${lossSign === 'plus' ? 'bg-green-600 text-white shadow-sm ring-2 ring-green-100' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    + เพิ่มสต๊อก
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => { setLossSign('minus'); setIsAutoAdjust(false); }}
                                    className={`flex-1 py-1.5 rounded-md text-[11px] font-black transition-all ${lossSign === 'minus' ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-100' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'}`}
                                >
                                    - ลดสต๊อก (สูญเสีย)
                                </button>
                            </div>

                            <div className="relative">
                                <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-bold ${lossSign === 'plus' ? 'text-green-600' : 'text-red-600'}`}>
                                    {lossSign === 'plus' ? '+' : '-'}
                                </div>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    {...register('lossWeight')} 
                                    readOnly={isAutoAdjust}
                                    placeholder="กรอกน้ำหนัก (กก.)"
                                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-opacity-50 font-bold transition-colors ${
                                        isAutoAdjust ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' :
                                        lossSign === 'plus' 
                                            ? 'border-green-200 focus:ring-green-500 focus:border-green-500 bg-white text-green-700' 
                                            : 'border-red-200 focus:ring-red-500 focus:border-red-500 bg-white text-red-700'
                                    }`} 
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">
                                {isAutoAdjust ? `* คำนวณอัตโนมัติเพื่อให้สต๊อกเหลือ 0 กก.` : `* ใช้สำหรับปรับยอดคงเหลือให้ตรงกับหน้างานจริง`}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{watchRubberType === 'cup_lump' ? 'ราคาขายขี้ยาง (บาท/กก.)' : 'ราคาขายน้ำยาง (บาท/กก. ยางแห้ง)'} <span className="text-red-500">*</span></label>
                        <input 
                            type="number" 
                            step="0.01" 
                            {...register('pricePerKg', { 
                                required: 'กรุณาระบุราคาขาย',
                                min: { value: 0.1, message: 'ราคาต้องมากกว่า 0' }
                            })} 
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${errors.pricePerKg ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                        />
                        {errors.pricePerKg && <p className="text-red-500 text-xs mt-1 font-medium">{errors.pricePerKg.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                        <input type="text" placeholder="ข้อมูลเพิ่มเติม..." {...register('note')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หลักฐานการขาย (ใบชั่ง/สลิป)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative overflow-hidden group">
                            {previewUrl ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/20 transition-all cursor-pointer">
                                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover opacity-80" />
                                    <div className="absolute bg-white/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit2 size={24} className="text-orange-600" />
                                    </div>
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} accept="image/*" />
                                    <button 
                                        type="button" 
                                        onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); setSelectedFile(null); setValue('receiptUrl', ''); }}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 z-10"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1 text-center">
                                    <Upload className="mx-auto h-12 w-12 text-gray-400 group-hover:text-orange-400 transition-colors" />
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500">
                                            <span>อัปโหลดไฟล์</span>
                                            <input type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mt-6 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-orange-800">{watchRubberType === 'cup_lump' ? 'น้ำหนักขี้ยางรวม:' : 'น้ำยางแห้งรวม:'}</span>
                            <span className="font-bold text-orange-900">{calculateDryRubber().toLocaleString()} กก.</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                            <span className="text-sm font-bold text-orange-800">ยอดเงินรวม:</span>
                            <span className="text-xl font-black text-orange-900">฿{calculateTotal().toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex space-x-3 mt-6">
                        {editingRecord && (
                            <button 
                                type="button"
                                onClick={() => { 
                                    setEditingRecord(null); 
                                    reset(); 
                                    setFactorySearch('');
                                    setTruckSearch('');
                                    setStaffSearch('');
                                    setPreviewUrl(null);
                                    setSelectedFile(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                        )}
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="flex-[2] bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-md disabled:opacity-50"
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : (editingRecord ? 'อัปเดตรายการ' : 'บันทึกรายการขาย')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SellForm;
