import React from 'react';
import { UserCircle, Plus, Save, Trash2 } from 'lucide-react';

export const StaffManagement = ({ 
    staffList, 
    loading, 
    saving, 
    showStaffForm, 
    setShowStaffForm, 
    staffForm, 
    onAddStaff, 
    handleDelete 
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <UserCircle className="mr-2 text-gray-400" size={20} />
                        พนักงานประจำ
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">จัดการข้อมูลพนักงานประจำ ค่าจ้าง และโบนัส</p>
                </div>
                <button
                    onClick={() => setShowStaffForm(!showStaffForm)}
                    className="flex items-center space-x-2 px-4 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    <span>เพิ่มพนักงาน</span>
                </button>
            </div>

            {showStaffForm && (
                <div className="bg-rubber-50/40 border border-rubber-100 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-rubber-800 mb-4">ข้อมูลพนักงานใหม่</h3>
                    <form onSubmit={staffForm.handleSubmit(onAddStaff)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
                            <input {...staffForm.register('name', { required: true })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500"
                                placeholder="ชื่อพนักงาน" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">เบอร์โทร</label>
                            <input {...staffForm.register('phone')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500"
                                placeholder="0xx-xxx-xxxx" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">ที่อยู่</label>
                            <input {...staffForm.register('address')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500"
                                placeholder="ที่อยู่" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">ค่าจ้าง (บาท/วัน หรือ เดือน)</label>
                            <input {...staffForm.register('salary')} type="number" step="0.01"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500"
                                placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">โบนัสค่าจ้าง (บาท)</label>
                            <input {...staffForm.register('bonus')} type="number" step="0.01"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500"
                                placeholder="0.00" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">หมายเหตุ</label>
                            <input {...staffForm.register('note')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500"
                                placeholder="หมายเหตุเพิ่มเติม" />
                        </div>
                        <div className="md:col-span-2 flex justify-end space-x-3 pt-2">
                            <button type="button" onClick={() => { setShowStaffForm(false); staffForm.reset(); }}
                                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">ยกเลิก</button>
                            <button type="submit" disabled={saving}
                                className="px-4 py-2 text-sm text-white bg-rubber-600 rounded-lg hover:bg-rubber-700 disabled:opacity-50 flex items-center space-x-2">
                                <Save size={15} />
                                <span>บันทึก</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ชื่อ</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ที่อยู่</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">เบอร์โทร</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">ค่าจ้าง (฿)</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">โบนัส (฿)</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {staffList.map((s, idx) => (
                            <tr key={s.id || idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-gray-900">{s.name}</td>
                                <td className="px-6 py-4 text-gray-500">{s.address || '-'}</td>
                                <td className="px-6 py-4 text-gray-500">{s.phone || '-'}</td>
                                <td className="px-6 py-4 text-right font-mono text-gray-900">{Number(s.salary || 0).toLocaleString()}</td>
                                <td className="px-6 py-4 text-right font-mono text-green-700">{Number(s.bonus || 0).toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => handleDelete('staff', s.id)}
                                        className="text-gray-300 hover:text-red-500 transition-colors p-2"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {staffList.length === 0 && !loading && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                    <UserCircle size={40} className="mb-2 opacity-20 mx-auto" />
                                    ยังไม่มีข้อมูลพนักงานประจำ
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
