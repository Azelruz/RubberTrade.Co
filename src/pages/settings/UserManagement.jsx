import React, { useState } from 'react';
import { Leaf, RefreshCw, Plus, Phone, MapPin, Database, Edit2, Trash2, UserCircle, Percent, X, Save } from 'lucide-react';

export const UserManagement = ({ 
    farmers, 
    employees, 
    loading, 
    saving, 
    loadData, 
    showFarmerForm, 
    setShowFarmerForm, 
    editingFarmer, 
    handleCancelFarmerEdit, 
    farmerForm, 
    onSubmitFarmer, 
    handleEditFarmer, 
    handleDelete, 
    showEmployeeForm, 
    setShowEmployeeForm, 
    editingEmployee,
    handleEditEmployee,
    handleCancelEmployeeEdit,
    employeeForm, 
    onSubmitEmployee,
    memberTypes,
    addMemberType,
    deleteMemberType
}) => {
    const [activeSubTab, setActiveSubTab] = useState('farmers');
    const [showMemberTypeForm, setShowMemberTypeForm] = useState(false);
    const [editingMemberType, setEditingMemberType] = useState(null);
    const [mtFormData, setMtFormData] = useState({ name: '', bonus: '0' });

    return (
        <div className="space-y-6">
            {/* Sub-Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
                <button
                    onClick={() => setActiveSubTab('farmers')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
                        activeSubTab === 'farmers'
                            ? 'bg-white text-rubber-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Leaf size={16} />
                    <span>เกษตรกร</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeSubTab === 'farmers' ? 'bg-rubber-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                        {farmers.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveSubTab('employees')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
                        activeSubTab === 'employees'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <UserCircle size={16} />
                    <span>ลูกจ้าง</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        activeSubTab === 'employees' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                        {employees.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveSubTab('member_types')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
                        activeSubTab === 'member_types'
                            ? 'bg-white text-amber-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Percent size={16} />
                    <span>ประเภทและโบนัส</span>
                </button>
            </div>

            {/* ===================== FARMERS TAB ===================== */}
            {activeSubTab === 'farmers' && (
                <section className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <Leaf className="mr-2 text-rubber-600" size={24} />
                            จัดการข้อมูลเกษตรกร
                        </h2>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => loadData()}
                                className="inline-flex items-center px-3 py-2 text-rubber-600 hover:bg-rubber-50 rounded-lg transition text-sm font-bold"
                            >
                                <RefreshCw size={18} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                                รีเฟรช
                            </button>
                            {!showFarmerForm && (
                                <button
                                    onClick={() => setShowFarmerForm(true)}
                                    className="inline-flex items-center px-4 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 transition shadow-sm font-medium"
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
                                {editingFarmer && (
                                    <button onClick={handleCancelFarmerEdit} className="text-gray-400 hover:text-gray-600">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                            <form onSubmit={farmerForm.handleSubmit(onSubmitFarmer)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                                    <input 
                                        {...farmerForm.register('name', { required: 'กรุณาระบุชื่อ-นามสกุล' })} 
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-rubber-500 ${farmerForm.formState.errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        placeholder="นายสมชาย ใจดี" 
                                    />
                                    {farmerForm.formState.errors.name && <p className="text-red-500 text-[10px] mt-1 font-medium">{farmerForm.formState.errors.name.message}</p>}
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
                                    <button type="button" onClick={handleCancelFarmerEdit} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                                    <button type="submit" disabled={saving} className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center space-x-2 ${editingFarmer ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rubber-600 hover:bg-rubber-700'}`}>
                                        <Save size={18} />
                                        <span>{editingFarmer ? 'บันทึกการแก้ไข' : 'บันทึกเกษตรกร'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 font-medium text-gray-500 text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left">เกษตรกร</th>
                                    <th className="px-6 py-4 text-left">สถานะ LINE</th>
                                    <th className="px-6 py-4 text-left">ติดต่อ / ที่อยู่</th>
                                    <th className="px-6 py-4 text-left text-center">รหัส FSC / ประเภท</th>
                                    <th className="px-6 py-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {farmers.map(f => (
                                    <tr key={f.id} className={`hover:bg-rubber-50/30 transition-colors group ${editingFarmer?.id === f.id ? 'bg-amber-50/30' : ''}`}>
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
                                                    <div className="text-[10px] text-gray-400 font-mono">ID: {f.id}</div>
                                                </div>
                                            </div>
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
                                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete('farmers', f.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {farmers.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <Leaf size={40} className="mb-2 opacity-20" />
                                                <p>ยังไม่มีข้อมูลเกษตรกรในระบบ</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* ===================== EMPLOYEES TAB ===================== */}
            {activeSubTab === 'employees' && (
                <section className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <UserCircle className="mr-2 text-blue-600" size={24} />
                            จัดการข้อมูลลูกจ้าง
                        </h2>
                        {!showEmployeeForm && (
                            <button
                                onClick={() => setShowEmployeeForm(true)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
                            >
                                <Plus size={18} className="mr-1" />
                                เพิ่มลูกจ้าง
                            </button>
                        )}
                    </div>

                    {showEmployeeForm && (
                        <div className={`rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 shadow-sm border ${editingEmployee ? 'bg-amber-50/50 border-amber-100' : 'bg-blue-50 border-blue-100 shadow-inner'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`font-bold ${editingEmployee ? 'text-amber-800' : 'text-blue-800'}`}>
                                    {editingEmployee ? `แก้ไขข้อมูล: ${editingEmployee.name}` : 'เพิ่มข้อมูลลูกจ้างใหม่'}
                                </h3>
                                {editingEmployee && (
                                    <button onClick={handleCancelEmployeeEdit} className="text-gray-400 hover:text-gray-600">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                            <form onSubmit={employeeForm.handleSubmit(onSubmitEmployee)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                                    <input 
                                        {...employeeForm.register('name', { required: 'กรุณาระบุชื่อลูกจ้าง' })} 
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 ${employeeForm.formState.errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
                                        placeholder="ชื่อลูกจ้าง" 
                                    />
                                    {employeeForm.formState.errors.name && <p className="text-red-500 text-[10px] mt-1 font-medium">{employeeForm.formState.errors.name.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>สังกัดเกษตรกร <span className="text-red-500">*</span></label>
                                    <select {...employeeForm.register('farmerId', { required: true })} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 bg-white">
                                        <option value="">-- เลือกเกษตรกร --</option>
                                        {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase flex items-center ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>
                                        ส่วนแบ่งกำไร (%) <Percent size={12} className="ml-1" />
                                    </label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        {...employeeForm.register('profitSharePct', { 
                                            required: 'กรุณาระบุส่วนแบ่งกำไร',
                                            min: { value: 0, message: 'ห้ามต่ำกว่า 0%' },
                                            max: { value: 100, message: 'ห้ามเกิน 100%' }
                                        })} 
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 ${employeeForm.formState.errors.profitSharePct ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} 
                                        placeholder="เช่น 10" 
                                    />
                                    {employeeForm.formState.errors.profitSharePct && <p className="text-red-500 text-[10px] mt-1 font-medium">{employeeForm.formState.errors.profitSharePct.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>เบอร์โทรศัพท์</label>
                                    <input {...employeeForm.register('phone')} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" placeholder="08x-xxx-xxxx" />
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>เลขบัญชีธนาคาร</label>
                                    <input {...employeeForm.register('bankAccount')} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" placeholder="xxx-x-xxxxx-x" />
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-xs font-bold uppercase ${editingEmployee ? 'text-amber-600' : 'text-blue-600'}`}>ชื่อธนาคาร</label>
                                    <input {...employeeForm.register('bankName')} className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500" placeholder="กสิกรไทย / ไทยพาณิชย์" />
                                </div>
                                <div className="lg:col-span-3 flex justify-end space-x-2 pt-2">
                                    <button type="button" onClick={editingEmployee ? handleCancelEmployeeEdit : () => setShowEmployeeForm(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                                    <button type="submit" disabled={saving} className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center space-x-2 ${editingEmployee ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                        <Save size={18} />
                                        <span>{editingEmployee ? 'บันทึกการแก้ไข' : 'บันทึกลูกจ้าง'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 font-medium text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left">ลูกจ้าง</th>
                                    <th className="px-6 py-4 text-left">ในสังกัด</th>
                                    <th className="px-6 py-4 text-center">ส่วนแบ่ง</th>
                                    <th className="px-6 py-4 text-left">ติดต่อ/บัญชีธนาคาร</th>
                                    <th className="px-6 py-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {employees.map(e => (
                                    <tr key={e.id} className={`hover:bg-blue-50/30 transition-colors ${editingEmployee?.id === e.id ? 'bg-amber-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{e.name}</div>
                                            <div className="text-[11px] text-gray-400">ID: {e.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs border border-gray-200">
                                                <Leaf size={12} className="mr-1 text-rubber-500" />
                                                {farmers.find(f => f.id === e.farmerId)?.name || <span className="text-red-400 italic">ไม่ระบุ</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-black rounded-lg border border-blue-100">
                                                {e.profitSharePct}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col space-y-0.5">
                                                <div className="flex items-center text-gray-600 font-mono"><Phone size={12} className="mr-1" /> {e.phone || '-'}</div>
                                                <div className="flex items-center text-gray-900 font-mono text-[11px]"><Database size={12} className="mr-1 text-gray-400" /> {e.bankAccount || '-'} {e.bankName ? `(${e.bankName})` : ''}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center space-x-1">
                                                <button
                                                    onClick={() => handleEditEmployee(e)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete('employees', e.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {employees.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                            <UserCircle size={40} className="mb-2 opacity-20 mx-auto" />
                                            ยังไม่มีข้อมูลลูกจ้างในระบบ
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* ===================== MEMBER TYPES TAB ===================== */}
            {activeSubTab === 'member_types' && (
                <section className="animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center">
                                <Percent className="mr-2 text-amber-600" size={24} />
                                จัดการประเภทสมาชิกและโบนัส
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">กลุ่มลูกค้าที่ได้รับโบนัสพิเศษจากราคากลาง (หน่วย: บาท/กก.)</p>
                        </div>
                        {!showMemberTypeForm && (
                            <button
                                onClick={() => {
                                    setEditingMemberType(null);
                                    setMtFormData({ name: '', bonus: '0' });
                                    setShowMemberTypeForm(true);
                                }}
                                className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition shadow-sm font-medium"
                            >
                                <Plus size={18} className="mr-1" />
                                เพิ่มประเภทสมาชิก
                            </button>
                        )}
                    </div>

                    {showMemberTypeForm && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4 shadow-inner">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-amber-700 uppercase tracking-widest">ชื่อประเภทสมาชิก <span className="text-red-500">*</span></label>
                                    <input 
                                        value={mtFormData.name}
                                        onChange={e => setMtFormData({...mtFormData, name: e.target.value})}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-amber-500 font-bold" 
                                        placeholder="เช่น VIP / สมาชิกประจำ" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-amber-700 uppercase tracking-widest">โบนัสบวกเพิ่ม (บาท/กก.)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={mtFormData.bonus}
                                            onChange={e => setMtFormData({...mtFormData, bonus: e.target.value})}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-amber-500 font-mono font-bold" 
                                            placeholder="0.0" 
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end space-x-2">
                                    <button 
                                        onClick={async () => {
                                            if (!mtFormData.name) return alert('กรุณาระบุชื่อประเภทสมาชิก');
                                            try {
                                                const res = await addMemberType({
                                                    id: editingMemberType?.id,
                                                    name: mtFormData.name,
                                                    bonus: mtFormData.bonus
                                                });
                                                if (res.status === 'success') {
                                                    setShowMemberTypeForm(false);
                                                    loadData();
                                                }
                                            } catch (e) { alert('เกิดข้อผิดพลาด'); }
                                        }}
                                        disabled={saving}
                                        className="flex-1 bg-amber-600 text-white font-bold py-2 rounded-xl hover:bg-amber-700 transition shadow-lg shadow-amber-200"
                                    >
                                        {editingMemberType ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มประเภท'}
                                    </button>
                                    <button 
                                        onClick={() => setShowMemberTypeForm(false)}
                                        className="px-4 py-2 text-amber-600 font-bold hover:bg-amber-100 rounded-xl transition"
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 font-black text-gray-400 text-[10px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-8 py-5 text-left">ประเภทสมาชิก</th>
                                    <th className="px-8 py-5 text-center">โบนัส (บาท/กก.)</th>
                                    <th className="px-8 py-5 text-center">จำนวนสมาชิก</th>
                                    <th className="px-8 py-5 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {memberTypes.map(mt => (
                                    <tr key={mt.id} className="hover:bg-amber-50/20 transition-all group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                                                    <Percent size={16} />
                                                </div>
                                                <div className="font-bold text-gray-900">{mt.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center font-mono font-bold text-amber-700">
                                            +{Number(mt.bonus).toFixed(2)}
                                        </td>
                                        <td className="px-8 py-5 text-center text-xs text-gray-500">
                                            {farmers.filter(f => f.memberTypeId === mt.id).length} คน
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end space-x-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingMemberType(mt);
                                                        setMtFormData({ name: mt.name, bonus: mt.bonus });
                                                        setShowMemberTypeForm(true);
                                                        document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!window.confirm(`ยืนยันการลบประเภท "${mt.name}"?`)) return;
                                                        const res = await deleteMemberType(mt.id);
                                                        if (res.status === 'success') loadData();
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};
