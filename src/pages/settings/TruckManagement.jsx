import React from 'react';
import { useForm } from 'react-hook-form';
import { Truck, PlusCircle, Trash2, Edit2, Save, X, Calendar } from 'lucide-react';

export const TruckManagement = ({ 
    trucks, 
    loading, 
    saving, 
    showForm, 
    setShowForm, 
    editingTruck, 
    setEditingTruck,
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
        setEditingTruck(null);
        reset();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Truck className="mr-2 text-rubber-600" size={20} />
                    รถส่งน้ำยาง
                </h3>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center px-4 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <PlusCircle size={18} className="mr-2" />
                        เพิ่มรถส่งน้ำยาง
                    </button>
                )}
            </div>

            {showForm && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="font-bold text-gray-900 mb-4">{editingTruck ? 'แก้ไขข้อมูลรถ' : 'รายละเอียดรถใหม่'}</h4>
                    <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ทะเบียนรถ <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                {...register('licensePlate', { required: true })}
                                defaultValue={editingTruck?.licensePlate || ''}
                                placeholder="เช่น 80-1234"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เลขตัวถัง</label>
                            <input
                                type="text"
                                {...register('chassisNumber')}
                                defaultValue={editingTruck?.chassisNumber || ''}
                                placeholder="เลขตัวถัง 17 หลัก"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ยี่ห้อ</label>
                            <input
                                type="text"
                                {...register('brand')}
                                defaultValue={editingTruck?.brand || ''}
                                placeholder="เช่น Isuzu, Hino"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รุ่น</label>
                            <input
                                type="text"
                                {...register('model')}
                                defaultValue={editingTruck?.model || ''}
                                placeholder="เช่น NLR 130"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วันหมดพรบ.</label>
                            <input
                                type="date"
                                {...register('prbExpiry')}
                                defaultValue={editingTruck?.prbExpiry || ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm"
                            />
                        </div>
                        <div className="lg:col-span-3 flex justify-end space-x-3 mt-2">
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
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ทะเบียนรถ</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ยี่ห้อ/รุ่น</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">วันหมดพรบ.</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {loading && !saving ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic">กำลังโหลดข้อมูล...</td>
                            </tr>
                        ) : trucks.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic">ไม่มีข้อมูลรถส่งน้ำยาง</td>
                            </tr>
                        ) : (
                            trucks.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{t.licensePlate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                        {t.brand} {t.model ? `(${t.model})` : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                        {t.prbExpiry || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                                        <button 
                                            onClick={() => onEdit(t)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="แก้ไข"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => onDelete('trucks', t.id)}
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
