import React from 'react';
import { Plus, Edit2, Trash2, X, Save, Percent } from 'lucide-react';

export const MemberTypeManagementTab = ({
    memberTypes,
    showMemberTypeForm,
    setShowMemberTypeForm,
    editingMemberType,
    setEditingMemberType,
    mtFormData,
    setMtFormData,
    saving,
    handleMemberTypeSubmit,
    handleDeleteRecord
}) => {
    return (
        <section className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">ประเภทสมาชิกและโบนัส</h3>
                    <p className="text-xs text-gray-500">กำหนดโบนัสส่วนเพิ่มราคาซื้อน้ำยาง (บาท/กก.) ตามประเภทสมาชิก</p>
                </div>
                {!showMemberTypeForm && (
                    <button
                        onClick={() => {
                            setEditingMemberType(null);
                            setMtFormData({ name: '', bonus: '0' });
                            setShowMemberTypeForm(true);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition shadow-sm font-medium text-sm"
                    >
                        <Plus size={18} className="mr-1" />
                        เพิ่มประเภทสมาชิก
                    </button>
                )}
            </div>

            {showMemberTypeForm && (
                <div className={`rounded-xl p-6 mb-8 border ${editingMemberType ? 'bg-amber-50/50 border-amber-200' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-amber-900">
                            {editingMemberType ? `แก้ไขประเภทสมาชิก: ${editingMemberType.name}` : 'เพิ่มประเภทสมาชิกใหม่'}
                        </h4>
                        <button onClick={() => { setShowMemberTypeForm(false); setEditingMemberType(null); }} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">ชื่อประเภทสมาชิก <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={mtFormData.name}
                                onChange={(e) => setMtFormData({ ...mtFormData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500"
                                placeholder="เช่น สมาชิก VIP / หุ้นส่วน"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">เงินโบนัสบวกเพิ่ม (บาท/กก.)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={mtFormData.bonus}
                                onChange={(e) => setMtFormData({ ...mtFormData, bonus: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-amber-500 font-mono font-bold"
                                placeholder="0.50"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button onClick={() => { setShowMemberTypeForm(false); setEditingMemberType(null); }} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm">
                            ยกเลิก
                        </button>
                        <button onClick={handleMemberTypeSubmit} disabled={saving} className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-bold shadow-sm flex items-center space-x-1">
                            <Save size={16} />
                            <span>{editingMemberType ? 'บันทึกแก้ไข' : 'บันทึกประเภท'}</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left">ประเภทสมาชิก</th>
                            <th className="px-6 py-4 text-center">โบนัสบวกเพิ่ม (บาท/กก.)</th>
                            <th className="px-6 py-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {memberTypes.map(mt => (
                            <tr key={mt.id} className="hover:bg-amber-50/20 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900">{mt.name}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                                        +{Number(mt.bonus).toFixed(2)} ฿
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center space-x-1">
                                        <button
                                            onClick={() => {
                                                setEditingMemberType(mt);
                                                setMtFormData({ name: mt.name, bonus: mt.bonus });
                                                setShowMemberTypeForm(true);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteRecord('memberTypes', mt.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {memberTypes.length === 0 && (
                            <tr>
                                <td colSpan="3" className="px-6 py-8 text-center text-gray-400 italic">
                                    ยังไม่มีข้อมูลประเภทสมาชิก
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
