import React from 'react';
import { Plus, Edit2, Trash2, X, Save, Search, UserCircle, Phone, Database, Percent, Leaf, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

export const EmployeeManagementTab = ({
    employees,
    farmers,
    farmerEmployees,
    employeeSearch,
    setEmployeeSearch,
    showEmployeeForm,
    setShowEmployeeForm,
    editingEmployee,
    setEditingEmployee,
    employeeForm,
    onSubmitEmployee,
    saving,
    handleEditEmployee,
    handleDeleteRecord,
    toggleEmployeeExpand,
    expandedEmployeeIds,
    deleteFarmerEmployeeLink,
    loadData,
    setLinkingEmployee,
    setShowLinkModal
}) => {
    return (
        <section className="animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="relative w-full md:w-72">
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อลูกจ้าง..."
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-sm shadow-sm"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    {employeeSearch && (
                        <button 
                            onClick={() => setEmployeeSearch('')}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                {!showEmployeeForm && (
                    <button
                        onClick={() => {
                            setEditingEmployee(null);
                            employeeForm.reset();
                            setShowEmployeeForm(true);
                        }}
                        className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
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
                        <button onClick={() => { setShowEmployeeForm(false); setEditingEmployee(null); employeeForm.reset(); }} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
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
                            <button type="button" onClick={() => { setShowEmployeeForm(false); setEditingEmployee(null); employeeForm.reset(); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
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
                        {employees
                            .filter(e => 
                                e.name?.toLowerCase().includes(employeeSearch.toLowerCase()) || 
                                e.phone?.includes(employeeSearch) ||
                                farmers.find(f => f.id === e.farmerId)?.name?.toLowerCase().includes(employeeSearch.toLowerCase())
                            )
                            .map(e => (
                            <React.Fragment key={e.id}>
                            <tr className={`hover:bg-blue-50/30 transition-colors ${editingEmployee?.id === e.id ? 'bg-amber-50/30' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{e.name}</div>
                                    <div className="text-[11px] text-gray-400">ID: {e.id}</div>
                                    <button
                                        onClick={() => toggleEmployeeExpand(e.id)}
                                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 mt-1.5 transition-all"
                                    >
                                        <span>🌿 ตารางสวนที่รับกรีด ({farmerEmployees.filter(fe => fe.employeeId === e.id).length})</span>
                                        {expandedEmployeeIds[e.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        {(() => {
                                            const links = farmerEmployees.filter(fe => fe.employeeId === e.id);
                                            if (links.length === 0) {
                                                const legacyFarmer = farmers.find(f => f.id === e.farmerId);
                                                return legacyFarmer ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs border border-gray-200">
                                                        <Leaf size={12} className="mr-1 text-rubber-500" />
                                                        {legacyFarmer.name} ({e.profitSharePct}%)
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">ยังไม่ผูกสวน</span>
                                                );
                                            }
                                            return links.map(link => (
                                                <span key={link.id || link.farmerId} className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 font-medium">
                                                    <Leaf size={12} className="mr-1 text-emerald-600" />
                                                    {link.farmerName || farmers.find(f => f.id === link.farmerId)?.name || link.farmerId} ({link.profitSharePct}%)
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`ลบการผูกสวนนี้ออก?`)) {
                                                                await deleteFarmerEmployeeLink({ farmerId: link.farmerId, employeeId: e.id });
                                                                toast.success('ลบการผูกสวนแล้ว');
                                                                loadData();
                                                            }
                                                        }}
                                                        className="ml-1.5 text-red-400 hover:text-red-600 font-bold"
                                                        title="ยกเลิกการผูกสวนนี้"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ));
                                        })()}
                                        
                                        <button
                                            onClick={() => {
                                                setLinkingEmployee(e);
                                                setShowLinkModal(true);
                                            }}
                                            className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs border border-blue-200 font-bold transition-all"
                                            title="ผูกสวนเพิ่ม"
                                        >
                                            + ผูกสวนเพิ่ม
                                        </button>
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
                                            onClick={() => handleDeleteRecord('employees', e.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="ลบ"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
