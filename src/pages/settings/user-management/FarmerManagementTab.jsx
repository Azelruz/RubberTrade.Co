import React from 'react';
import { Leaf, RefreshCw, Plus, Phone, MapPin, Edit2, Trash2, UserCircle, Search, Clock, AlertTriangle, ShoppingBag, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const FarmerManagementTab = ({
    farmers,
    employees,
    farmerEmployees,
    memberTypes,
    activityFilter,
    setActivityFilter,
    customDaysThreshold,
    setCustomDaysThreshold,
    farmerSearch,
    setFarmerSearch,
    loading,
    saving,
    showFarmerForm,
    setShowFarmerForm,
    editingFarmer,
    setEditingFarmer,
    farmerForm,
    onSubmitFarmer,
    handleEditFarmer,
    handleDeleteRecord,
    farmerActivityMap,
    activityStats,
    filteredFarmers,
    expandedFarmerIds,
    toggleFarmerExpand,
    loadData,
    setLinkingEmployee,
    setLinkFarmerId,
    setLinkPct,
    setLinkIsDefault,
    setShowLinkModal,
    setEditingAssignment,
    deleteFarmerEmployeeLink
}) => {
    return (
        <section className="animate-in fade-in duration-300">
            {/* Activity Status Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div 
                    onClick={() => setActivityFilter('active')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${activityFilter === 'active' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-700 mb-1">
                        <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></div>มาขายปกติ (≤30 วัน)</span>
                        <span className="font-mono">{activityStats.active}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">เกษตรกรที่มาขายน้ำยางสม่ำเสมอ</div>
                </div>

                <div 
                    onClick={() => setActivityFilter('inactive_30')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${activityFilter === 'inactive_30' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center justify-between text-xs font-bold text-amber-700 mb-1">
                        <span className="flex items-center"><Clock size={13} className="mr-1 text-amber-500" />ขาดติดต่อ (31-60 วัน)</span>
                        <span className="font-mono">{activityStats.inactive30}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">ไม่ได้มาขายมากกว่า 1 เดือน</div>
                </div>

                <div 
                    onClick={() => setActivityFilter('inactive_60')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${activityFilter === 'inactive_60' ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center justify-between text-xs font-bold text-red-700 mb-1">
                        <span className="flex items-center"><AlertTriangle size={13} className="mr-1 text-red-500" />ไม่ได้มาขาย &gt;60 วัน</span>
                        <span className="font-mono">{activityStats.inactive60}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">ขาดการติดต่อนานเกิน 2 เดือน</div>
                </div>

                <div 
                    onClick={() => setActivityFilter('never')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${activityFilter === 'never' ? 'bg-gray-100 border-gray-300 ring-2 ring-gray-400/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                >
                    <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
                        <span className="flex items-center"><ShoppingBag size={13} className="mr-1 text-gray-400" />ยังไม่เคยขาย</span>
                        <span className="font-mono">{activityStats.never}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">ไม่มีประวัติรายการรับซื้อ</div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto flex-1">
                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อหรือเบอร์โทร..."
                            value={farmerSearch}
                            onChange={(e) => setFarmerSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-rubber-500 focus:border-rubber-500 text-sm shadow-sm"
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        {farmerSearch && (
                            <button 
                                onClick={() => setFarmerSearch('')}
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Status Filter Selector */}
                    <div className="flex items-center space-x-2">
                        <select
                            value={activityFilter}
                            onChange={(e) => setActivityFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold bg-white text-gray-700 shadow-sm focus:ring-rubber-500 focus:border-rubber-500 cursor-pointer"
                        >
                            <option value="all">🌐 แสดงทุกสถานะ ({activityStats.total} คน)</option>
                            <option value="active">🟢 มาขายปกติ (≤30 วัน) [{activityStats.active} คน]</option>
                            <option value="inactive_30">🟡 ขาดการติดต่อ (31-60 วัน) [{activityStats.inactive30} คน]</option>
                            <option value="inactive_60">🔴 ขาดการติดต่อนาน (&gt;60 วัน) [{activityStats.inactive60} คน]</option>
                            <option value="never">⚪ ยังไม่เคยมีประวัติขาย [{activityStats.never} คน]</option>
                            <option value="custom_days">⏱️ กำหนดจำนวนวันขาดติดต่อเอง...</option>
                        </select>

                        {activityFilter === 'custom_days' && (
                            <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl animate-in fade-in duration-200">
                                <span className="text-xs font-bold text-amber-800">ขาดขาย ≥</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="999"
                                    value={customDaysThreshold}
                                    onChange={(e) => setCustomDaysThreshold(Math.max(1, Number(e.target.value)))}
                                    className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-sm font-bold text-amber-900 text-center focus:ring-2 focus:ring-amber-500"
                                />
                                <span className="text-xs font-bold text-amber-800">วัน</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex space-x-2 w-full md:w-auto">
                    <button
                        onClick={() => loadData()}
                        className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-2 text-rubber-600 hover:bg-rubber-50 rounded-lg transition text-sm font-bold"
                    >
                        <RefreshCw size={18} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                        รีเฟรช
                    </button>
                    {!showFarmerForm && (
                        <button
                            onClick={() => {
                                setEditingFarmer(null);
                                farmerForm.reset();
                                setShowFarmerForm(true);
                            }}
                            className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 transition shadow-sm font-medium"
                        >
                            <Plus size={18} className="mr-1" />
                            เพิ่มเกษตรกร
                        </button>
                    )}
                </div>
            </div>

            {showFarmerForm && (
                <div className={`rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 shadow-sm border ${editingFarmer ? 'bg-amber-50/50 border-amber-100' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-bold ${editingFarmer ? 'text-amber-800' : 'text-gray-700'}`}>
                            {editingFarmer ? `แก้ไขข้อมูล: ${editingFarmer.name}` : 'เพิ่มข้อมูลเกษตรกรใหม่'}
                        </h3>
                        <button onClick={() => { setShowFarmerForm(false); setEditingFarmer(null); farmerForm.reset(); }} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={farmerForm.handleSubmit(onSubmitFarmer)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                                <span>ชื่อเรียกหน้าร้าน / ชื่อเล่น <span className="text-red-500">*</span></span>
                                <span className="text-[10px] text-rubber-600 font-normal">ใช้ชั่งยาง / บิลหน้าร้าน</span>
                            </label>
                            <input 
                                {...farmerForm.register('name', { required: 'กรุณาระบุชื่อเรียกหน้าร้าน' })} 
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-rubber-500 ${farmerForm.formState.errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                placeholder="เช่น ลุงดำ, น้าเปี๊ยก, โกเกียรติ" 
                            />
                            {farmerForm.formState.errors.name && <p className="text-red-500 text-[10px] mt-1 font-medium">{farmerForm.formState.errors.name.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                                <span>ชื่อ-นามสกุลทางการ</span>
                                <span className="text-[10px] text-emerald-600 font-normal">สำหรับ กยท. / ภาษี</span>
                            </label>
                            <input 
                                {...farmerForm.register('realName')} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500" 
                                placeholder="เช่น นายสมศักดิ์ สุขประเสริฐ" 
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                                <span>เลขบัตรประชาชน (13 หลัก)</span>
                                <span className="text-[10px] text-gray-400 font-normal">สำหรับ กยท.</span>
                            </label>
                            <input 
                                {...farmerForm.register('idCard')} 
                                maxLength={17}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 font-mono" 
                                placeholder="3-8001-xxxxx-xx-x" 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">เบอร์โทรศัพท์</label>
                            <input {...farmerForm.register('phone')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="08x-xxx-xxxx" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">เลขบัญชีธนาคาร</label>
                            <input {...farmerForm.register('bankAccount')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="xxx-x-xxxxx-x" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">ชื่อธนาคาร</label>
                            <input {...farmerForm.register('bankName')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="กสิกรไทย / ธกส." />
                        </div>
                        <div className="md:col-span-1 space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">ที่อยู่</label>
                            <input {...farmerForm.register('address')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="123 ม.1 ต..." />
                        </div>
                        <div className="md:col-span-1 space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">หมายเหตุ</label>
                            <input {...farmerForm.register('note')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="..." />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">รหัส FSC (FSCID)</label>
                            <input {...farmerForm.register('fscId')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500" placeholder="รหัส FSC" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">ประเภทสมาชิก (โบนัส)</label>
                            <select {...farmerForm.register('memberTypeId')} className="w-full px-3 py-2 border rounded-lg focus:ring-rubber-500 bg-white">
                                <option value="">-- บุคคลทั่วไป (ไม่มีโบนัส) --</option>
                                {memberTypes.map(mt => (
                                    <option key={mt.id} value={mt.id}>{mt.name} (โบนัส +{mt.bonus} บาท)</option>
                                ))}
                            </select>
                        </div>
                        <div className="lg:col-span-3 flex justify-end space-x-2 pt-2">
                            <button type="button" onClick={() => { setShowFarmerForm(false); setEditingFarmer(null); farmerForm.reset(); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                            <button type="submit" disabled={saving} className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center space-x-2 ${editingFarmer ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rubber-600 hover:bg-rubber-700'}`}>
                                <Save size={18} />
                                <span>{editingFarmer ? 'บันทึกการแก้ไข' : 'บันทึกเกษตรกร'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Report Summary Banner */}
            {activityFilter !== 'all' && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 mb-4 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900">
                                {activityFilter === 'custom_days' 
                                    ? `รายงานสรุปเกษตรกรที่ไม่ได้มาขายน้ำยางเกิน ${customDaysThreshold} วัน`
                                    : activityFilter === 'inactive_30'
                                    ? 'รายงานสรุปเกษตรกรที่ขาดการติดต่อ 31 - 60 วัน'
                                    : activityFilter === 'inactive_60'
                                    ? 'รายงานสรุปเกษตรกรที่ขาดการติดต่อนานเกิน 60 วัน'
                                    : activityFilter === 'never'
                                    ? 'รายงานสรุปเกษตรกรที่ยังไม่เคยมีประวัติขาย'
                                    : 'รายงานสรุปเกษตรกรที่มาขายปกติ'}
                            </h4>
                            <p className="text-xs text-amber-700 mt-0.5">
                                พบทั้งหมด <strong className="font-bold text-amber-900">{filteredFarmers.length} คน</strong> จากเกษตรกรในระบบ {farmers.length} คน
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="px-3.5 py-2 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                    >
                        <span>🖨️ พิมพ์รายงานสรุป</span>
                    </button>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 font-medium text-gray-500 text-[11px] uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left">เกษตรกร</th>
                            <th className="px-6 py-4 text-left">ประวัติขายล่าสุด</th>
                            <th className="px-6 py-4 text-left">สถานะ LINE</th>
                            <th className="px-6 py-4 text-left">ติดต่อ / ที่อยู่</th>
                            <th className="px-6 py-4 text-left text-center">รหัส FSC / ประเภท</th>
                            <th className="px-6 py-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredFarmers.map(f => {
                            const act = farmerActivityMap[f.id];
                            return (
                                <React.Fragment key={f.id}>
                                    <tr className={`hover:bg-rubber-50/30 transition-colors group ${editingFarmer?.id === f.id ? 'bg-amber-50/30' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        {f.linePicture ? (
                                            <img src={f.linePicture} alt={f.lineName} className="w-10 h-10 rounded-full border-2 border-rubber-100" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-rubber-100 flex items-center justify-center text-rubber-600 font-bold text-sm">
                                                {f.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-gray-900">{f.name}</div>
                                            {(f.realName || f.idCard) && (
                                                <div className="text-[11px] text-gray-600 font-medium">
                                                    {f.realName && <span>ชื่อทางการ: <strong className="text-gray-800">{f.realName}</strong></span>}
                                                    {f.idCard && <span className="ml-1 text-[10px] text-gray-500 font-mono bg-gray-100 px-1 py-0.5 rounded">บัตร: {f.idCard}</span>}
                                                </div>
                                            )}
                                            <div className="text-[10px] text-gray-400 font-mono">ID: {f.id}</div>
                                            {(() => {
                                                const farmerEmps = farmerEmployees.filter(fe => fe.farmerId === f.id);
                                                if (farmerEmps.length > 0) {
                                                    return (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {farmerEmps.map(fe => (
                                                                <span key={fe.id || fe.employeeId} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${fe.isDefault ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                                    👤 {fe.employeeName || employees.find(e => e.id === fe.employeeId)?.name || 'ลูกจ้าง'} ({fe.profitSharePct}%)
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                const legacy = employees.filter(e => e.farmerId === f.id);
                                                if (legacy.length > 0) {
                                                    return (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {legacy.map(e => (
                                                                <span key={e.id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                                                                    👤 {e.name} ({e.profitSharePct}%)
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return <div className="text-[10px] text-amber-600 font-medium mt-0.5">🌾 เจ้าของกรีดเอง</div>;
                                            })()}
                                            <button
                                                onClick={() => toggleFarmerExpand(f.id)}
                                                className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 mt-1.5 transition-all"
                                            >
                                                <span>👥 ตารางคนกรีด ({farmerEmployees.filter(fe => fe.farmerId === f.id).length})</span>
                                                {expandedFarmerIds[f.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                </td>
                                {/* Last Purchase Activity Column */}
                                <td className="px-6 py-4">
                                    {act && act.lastDate ? (
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center space-x-1.5">
                                                {act.daysAgo <= 30 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></span>
                                                        {act.daysAgo === 0 ? 'วันนี้' : `${act.daysAgo} วันที่แล้ว`}
                                                    </span>
                                                ) : act.daysAgo <= 60 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                        <Clock size={11} className="mr-1 text-amber-600" />
                                                        {act.daysAgo} วันที่แล้ว
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                                                        <AlertTriangle size={11} className="mr-1 text-red-600" />
                                                        ไม่ได้มา {act.daysAgo} วันแล้ว
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-gray-500">
                                                {format(act.lastDate, 'd MMM yyyy', { locale: th })} ({act.count} รายการ)
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400 italic border border-gray-200">
                                            ยังไม่มีประวัติ
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {f.lineName ? (
                                        <div className="flex flex-col">
                                            <div className="flex items-center text-[11px] text-green-600 font-black uppercase tracking-wider mb-1">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                                Connected
                                            </div>
                                            <div className="text-xs font-medium text-gray-600">{f.lineName}</div>
                                        </div>
                                    ) : (
                                        <span className="text-[11px] text-gray-400 uppercase tracking-wider font-bold italic">Manual</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center text-gray-700 font-medium font-mono">
                                            <Phone size={12} className="mr-1.5 text-rubber-400" />
                                            {f.phone || '-'}
                                        </div>
                                        <div className="flex items-center text-[11px] text-gray-500 max-w-[200px] truncate" title={f.address}>
                                            <MapPin size={12} className="mr-1.5 text-gray-300" />
                                            {f.address || '-'}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col items-center space-y-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-center w-full max-w-[120px] ${f.fscId ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'text-gray-300 italic border border-transparent'}`}>
                                            FSC: {f.fscId || '-'}
                                        </span>
                                        {f.memberTypeId && memberTypes.find(mt => mt.id === f.memberTypeId) ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rubber-100 text-rubber-700 border border-rubber-200 text-center w-full max-w-[120px]">
                                                {memberTypes.find(mt => mt.id === f.memberTypeId)?.name} (+{memberTypes.find(mt => mt.id === f.memberTypeId)?.bonus})
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-medium text-gray-400 border border-gray-100 text-center w-full max-w-[120px]">ทั่วไป</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center space-x-1">
                                        <button
                                            onClick={() => handleEditFarmer(f)}
                                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                            title={`แก้ไขข้อมูลเกษตรกร: ${f.name}`}
                                            aria-label={`แก้ไขข้อมูล ${f.name}`}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRecord('farmers', f.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all focus:ring-2 focus:ring-red-500 focus:outline-none"
                                            title={`ลบเกษตรกร: ${f.name}`}
                                            aria-label={`ลบเกษตรกร ${f.name}`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            {expandedFarmerIds[f.id] && (
                                <tr key={`sub-farmer-${f.id}`} className="bg-blue-50/40 animate-in fade-in">
                                    <td colSpan="6" className="px-6 py-3 border-y border-blue-100">
                                        <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-inner space-y-2">
                                            <div className="flex justify-between items-center border-b pb-2">
                                                <span className="font-bold text-xs text-blue-900 flex items-center">
                                                    <UserCircle size={14} className="mr-1 text-blue-600" />
                                                    รายชื่อคนกรีดประจำสวน: {f.name}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setLinkingEmployee(null);
                                                        setLinkFarmerId(f.id);
                                                        setLinkPct('50');
                                                        setLinkIsDefault(false);
                                                        setShowLinkModal(true);
                                                    }}
                                                    className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition"
                                                >
                                                    + ผูกคนกรีดประจำสวนนี้เพิ่ม
                                                </button>
                                            </div>
                                            {(() => {
                                                const links = farmerEmployees.filter(fe => fe.farmerId === f.id);
                                                if (links.length === 0) {
                                                    return <p className="text-xs text-gray-400 italic py-1">ยังไม่มีการผูกคนกรีด (เจ้าของสวนกรีดเอง)</p>;
                                                }
                                                return (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                                        {links.map(fe => {
                                                            const empObj = employees.find(e => e.id === fe.employeeId);
                                                            return (
                                                                <div key={fe.id || fe.employeeId} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                                                                    <div>
                                                                        <div className="font-bold text-gray-900 flex items-center">
                                                                            👤 {fe.employeeName || empObj?.name || fe.employeeId}
                                                                            {fe.isDefault === 1 && <span className="ml-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">หลัก</span>}
                                                                        </div>
                                                                        <div className="text-gray-500 font-mono text-[10px]">% ส่วนแบ่ง: <span className="font-bold text-blue-700">{fe.profitSharePct}%</span></div>
                                                                    </div>
                                                                    <div className="flex space-x-1">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingAssignment(fe);
                                                                                setLinkFarmerId(fe.farmerId);
                                                                                setLinkingEmployee(empObj || { id: fe.employeeId, name: fe.employeeName });
                                                                                setLinkPct(fe.profitSharePct.toString());
                                                                                setLinkIsDefault(fe.isDefault === 1);
                                                                                setShowLinkModal(true);
                                                                            }}
                                                                            className="p-1 text-gray-400 hover:text-blue-600"
                                                                            title="แก้ไข %"
                                                                        >
                                                                            <Edit2 size={13} />
                                                                        </button>
                                                                        <button
                                                                            onClick={async () => {
                                                                                if (window.confirm(`ยกเลิกการผูกสวนนี้?`)) {
                                                                                    await deleteFarmerEmployeeLink({ farmerId: fe.farmerId, employeeId: fe.employeeId });
                                                                                    toast.success('ยกเลิกแล้ว');
                                                                                    loadData();
                                                                                }
                                                                            }}
                                                                            className="p-1 text-gray-400 hover:text-red-600"
                                                                            title="ลบ"
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                </tr>
                            )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
