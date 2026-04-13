import React from 'react';
import { PlusCircle, Search, Leaf, Wallet, Calculator, Percent } from 'lucide-react';
import { truncateOneDecimal } from '../../utils/calculations';

const BuyForm = ({
    register, handleSubmit, onSubmit, watch, setValue, errors,
    watchRubberType, watchWeight, watchBucketWeight, watchBasePrice, watchBonusDrc, watchFarmerId, watchFarmerName,
    farmers, employees, memberTypes, settings, selectedFarmer,
    farmerSearch, setFarmerSearch, showFarmerDropdown, setShowFarmerDropdown, farmerDropdownRef,
    submitting, calculateTotal, calculateDryRubber, getEmpPct, setShowCalculator
}) => {
    return (
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <PlusCircle className="mr-2 text-rubber-600" size={20} />
                    เพิ่มรายการใหม่
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
                        <input type="date" {...register('date', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500" />
                    </div>

                    <div className="relative" ref={farmerDropdownRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เลือกเกษตรกร <span className="text-red-500">*</span></label>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="พิมพ์เพื่อค้นหาชื่อ..."
                                value={farmerSearch}
                                onChange={(e) => {
                                    setFarmerSearch(e.target.value);
                                    setShowFarmerDropdown(true);
                                    if (!e.target.value) {
                                        setValue('farmerId', '');
                                    }
                                }}
                                onFocus={() => setShowFarmerDropdown(true)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 bg-white"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <Search size={16} className="text-gray-400" />
                            </div>
                        </div>

                        {showFarmerDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                {farmers
                                    .filter(f => f.name.toLowerCase().includes(farmerSearch.toLowerCase()) || (f.id && f.id.toLowerCase().includes(farmerSearch.toLowerCase())))
                                    .map(f => (
                                        <div
                                            key={f.id}
                                            className="px-4 py-2 hover:bg-rubber-50 cursor-pointer border-b border-gray-50 last:border-none flex justify-between items-center"
                                            onClick={() => {
                                                setValue('farmerId', f.id);
                                                setFarmerSearch(f.name);
                                                setShowFarmerDropdown(false);
                                            }}
                                        >
                                            <span className="text-sm font-medium text-gray-900">{f.name}</span>
                                            <span className="text-[10px] text-gray-400 font-mono uppercase">{f.id}</span>
                                        </div>
                                    ))
                                }
                                {farmers.filter(f => f.name.toLowerCase().includes(farmerSearch.toLowerCase())).length === 0 && (
                                    <div className="px-4 py-3 text-sm text-gray-500 italic text-center">
                                        ไม่พบในรายชื่อ...
                                    </div>
                                )}
                            </div>
                        )}

                        <input type="hidden" {...register('farmerId', { required: !watchFarmerName })} />

                        <div className="flex items-center text-[10px] text-gray-400 my-2 px-1">
                            <span className="flex-grow border-t border-gray-100"></span>
                            <span className="px-2 uppercase font-bold tracking-widest">หรือระบุชื่อใหม่</span>
                            <span className="flex-grow border-t border-gray-100"></span>
                        </div>

                        <input
                            type="text"
                            placeholder="ระบุชื่อ-นามสกุล (ถ้าไม่มีในรายการ)"
                            {...register('farmerName', { required: !watchFarmerId })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500"
                            onChange={(e) => {
                                if (e.target.value) {
                                    setValue('farmerId', '');
                                    setFarmerSearch('');
                                }
                            }}
                        />
                        {(errors.farmerName || errors.farmerId) && <span className="text-red-500 text-xs mt-1 block font-medium">กรุณาระบุหรือเลือกเกษตรกร</span>}
                    </div>

                    {/* Product Type Selector */}
                    <div className="grid grid-cols-2 gap-2 mb-2 p-1 bg-gray-100 rounded-xl relative overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setValue('rubberType', 'latex')}
                            className={`flex items-center justify-center p-2 rounded-lg text-xs font-bold transition-all z-10 ${watchRubberType === 'latex' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
                        >
                            <Leaf size={14} className="mr-1.5" />
                            น้ำยางพารา
                        </button>
                        <button
                            type="button"
                            onClick={() => setValue('rubberType', 'cup_lump')}
                            className={`flex items-center justify-center p-2 rounded-lg text-xs font-bold transition-all z-10 ${watchRubberType === 'cup_lump' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500'}`}
                        >
                            <div className="w-3 h-3 rounded-full bg-amber-600 mr-1.5 shadow-inner"></div>
                            ขี้ยางพารา
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
                                <span>น้ำหนัก (กก.) <span className="text-red-500">*</span></span>
                                <button
                                    type="button"
                                    onClick={() => setShowCalculator(true)}
                                    className="text-rubber-600 hover:text-rubber-700 p-1 rounded-md hover:bg-rubber-50 transition-colors"
                                    title="เครื่องคิดเลขรวมน้ำหนัก"
                                >
                                    <Calculator size={16} />
                                </button>
                            </label>
                            <input type="number" step="0.01" min="0" placeholder="0.00" {...register('weight', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">น้ำหนักถัง (กก.)</label>
                            <input type="number" step="0.01" min="0" placeholder="0.00" {...register('bucketWeight')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500" />
                        </div>
                    </div>

                    {watchRubberType !== 'cup_lump' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">% DRC</label>
                                <input type="number" step="0.01" min="0" max="100" placeholder="0.00" {...register('drc')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500" />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <Wallet size={14} className="mr-1 text-gray-400" />
                                ราคากลาง (บาท)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                placeholder="0.0"
                                {...register('basePrice', { required: true })}
                                className="w-full px-3 py-2 border border-blue-100 bg-blue-50/30 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 font-bold"
                            />
                        </div>
                        {watchRubberType !== 'cup_lump' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                    <PlusCircle size={14} className="mr-1 text-green-500" />
                                    โบนัส DRC
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="0.0"
                                    {...register('bonusDrc')}
                                    className="w-full px-3 py-2 border border-green-100 bg-green-50/30 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 font-bold text-green-700"
                                />
                            </div>
                        )}
                    </div>

                    {farmers.find(f => f.id === watchFarmerId)?.fscId && (
                        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-amber-800">
                            <div className="flex items-center text-xs font-bold">
                                <Leaf size={14} className="mr-1.5 text-amber-600" />
                                🌿 FSC โบนัส
                            </div>
                            <span className="text-xs font-black">+{Number(settings.fsc_bonus || 1).toLocaleString(undefined, { minimumFractionDigits: 1 })} บาท/กก.</span>
                        </div>
                    )}

                    {selectedFarmer?.memberTypeId && memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId) && (
                        <div className="mb-2 p-2 bg-rubber-50 border border-rubber-200 rounded-lg flex items-center justify-between text-rubber-800">
                            <div className="flex items-center text-xs font-black uppercase">
                                <Percent size={14} className="mr-1.5 text-rubber-600" />
                                กลุ่ม: {memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId).name}
                            </div>
                            <span className="text-xs font-black">+{Number(memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId).bonus).toLocaleString(undefined, { minimumFractionDigits: 1 })} บาท/กก.</span>
                        </div>
                    )}

                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">ราคาจริงรวมโบนัส:</span>
                            <span className="text-sm font-black text-gray-700 font-mono">
                                ฿{(Number(watchBasePrice || 0) + Number(watchBonusDrc || 0) + (selectedFarmer?.fscId ? (Number(settings.fsc_bonus) || 1) : 0) + (selectedFarmer?.memberTypeId ? (Number(memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId)?.bonus) || 0) : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                        <input type="text" placeholder="ข้อมูลเพิ่มเติม..." {...register('note')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500" />
                    </div>

                    <div className="bg-rubber-50 p-4 rounded-lg border border-rubber-100 mt-6 text-right">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-rubber-800">ยอดจ่ายรวม:</span>
                            <span className="text-lg font-bold text-rubber-900 font-mono">฿{truncateOneDecimal(calculateTotal()).toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-rubber-600/70 italic">
                            <span>(คำนวณจากเนื้อยางแห้ง: {truncateOneDecimal(calculateDryRubber()).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.)</span>
                        </div>
                        {getEmpPct() > 0 && (
                            <div className="flex justify-between items-center pt-2 border-t border-rubber-200">
                                <span className="text-xs text-rubber-700">ส่วนแบ่งพนักงาน ({getEmpPct()}%):</span>
                                <span className="text-sm font-bold text-blue-600 font-mono">
                                    - ฿{truncateOneDecimal(calculateTotal() * (getEmpPct() / 100)).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                </span>
                            </div>
                        )}

                        <div className="flex flex-col space-y-1 mt-3 pt-3 border-t border-rubber-200/50">
                            {watchRubberType !== 'cup_lump' && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-rubber-700">ยางแห้ง:</span>
                                    <span className="font-bold text-rubber-800">{truncateOneDecimal(calculateDryRubber() || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กก.</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm text-emerald-700">
                                <span>{watchRubberType === 'cup_lump' ? 'ยอดสุทธิ' : `เกษตรกร (${100 - getEmpPct()}%)`}:</span>
                                <span className="font-bold">฿ {truncateOneDecimal((calculateTotal() * (100 - getEmpPct())) / 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                            {watchRubberType !== 'cup_lump' && getEmpPct() > 0 && (
                                <div className="flex justify-between items-center text-sm text-purple-700">
                                    <span>ลูกจ้าง ({getEmpPct()}%):</span>
                                    <span className="font-bold">฿ {truncateOneDecimal((calculateTotal() * getEmpPct()) / 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-rubber-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-rubber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rubber-500 disabled:opacity-50 transition-colors flex items-center justify-center mt-4 shadow-md"
                    >
                        {submitting ? 'กำลังบันทึก...' : 'บันทึกและพิมพ์ใบเสร็จ'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BuyForm;
