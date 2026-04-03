import React from 'react';
import { useForm } from 'react-hook-form';
import { Building2, PlusCircle, Trash2, Edit2, Save, X } from 'lucide-react';

export const FactoryManagement = ({ 
    factories, 
    loading, 
    saving, 
    showForm, 
    setShowForm, 
    editingFactory, 
    setEditingFactory,
    onSubmit, 
    onDelete,
    onEdit
}) => {
    const { register, handleSubmit, reset } = useForm();

    const handleFormSubmit = (data) => {
        onSubmit(data);
        reset();
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingFactory(null);
        reset();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Building2 className="mr-2 text-rubber-600" size={20} />
                    โรงงานที่ส่งขาย
                </h3>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center px-4 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <PlusCircle size={18} className="mr-2" />
                        เพิ่มโรงงานใหม่
                    </button>
                )}
            </div>

            {showForm && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="font-bold text-gray-900 mb-4">{editingFactory ? 'แก้ไขข้อมูลโรงงาน' : 'รายละเอียดโรงงานใหม่'}</h4>
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อบริษัท <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                {...register('name', { required: true })}
                                defaultValue={editingFactory?.name || ''}
                                placeholder="เช่น บริษัท หน่ำฮั้ว จำกัด"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสส่งน้ำยาง</label>
                            <input
                                type="text"
                                {...register('code')}
                                defaultValue={editingFactory?.code || ''}
                                placeholder="เช่น 2600"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อย่อ (ในนาม)</label>
                            <input
                                type="text"
                                {...register('shortName')}
                                defaultValue={editingFactory?.shortName || ''}
                                placeholder="เช่น สกต. (สงขลา)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                            <input
                                type="text"
                                {...register('taxId')}
                                defaultValue={editingFactory?.taxId || ''}
                                placeholder="เลข 13 หลัก"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่สถานประกอบการ</label>
                            <input
                                type="text"
                                {...register('address')}
                                defaultValue={editingFactory?.address || ''}
                                placeholder="ที่ตั้งสำนักงานใหญ่/สาขา"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm"
                            />
                        </div>
                        <div className="md:col-span-3 flex justify-end space-x-3 mt-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center px-6 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 transition-colors text-sm font-bold shadow-md disabled:opacity-50"
                            >
                                <Save size={18} className="mr-2" />
                                {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">บริษัท</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">รหัส</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">เลขผู้เสียภาษี</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ชื่อ (ในนาม)</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {loading && !saving ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">กำลังโหลดข้อมูล...</td>
                            </tr>
                        ) : factories.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">ไม่มีข้อมูลโรงงาน</td>
                            </tr>
                        ) : (
                            factories.map((f) => (
                                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{f.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono">{f.code || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-xs">{f.taxId || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 italic">{f.shortName || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                                        <button 
                                            onClick={() => onEdit(f)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="แก้ไข"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => onDelete('factories', f.id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="ลบ"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
