import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Plus, Save, Trash2, Edit2, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchFactories, addFactory, updateRecord, deleteRecord } from '../../services/apiService';

export const FactoryManagement = () => {
    const [factories, setFactories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingFactory, setEditingFactory] = useState(null);

    const factoryForm = useForm({
        defaultValues: {
            name: '', code: '', phone: '', address: '', mapLink: '', note: ''
        }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchFactories();
            setFactories(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data) => {
        setSaving(true);
        try {
            let res;
            if (editingFactory) {
                res = await updateRecord('factories', editingFactory.id, data);
                if (res.status === 'success') {
                    toast.success('แก้ไขข้อมูลโรงงานสำเร็จ');
                    setEditingFactory(null);
                    factoryForm.reset();
                    setShowForm(false);
                    loadData();
                }
            } else {
                res = await addFactory(data);
                if (res.status === 'success') {
                    toast.success('เพิ่มโรงงานสำเร็จ');
                    factoryForm.reset();
                    setShowForm(false);
                    loadData();
                }
            }
        } catch (err) {
            toast.error('บันทึกล้มเหลว');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (factory) => {
        setEditingFactory(factory);
        setShowForm(true);
        factoryForm.reset({
            name: factory.name,
            code: factory.code || '',
            phone: factory.phone || '',
            address: factory.address || '',
            mapLink: factory.mapLink || '',
            note: factory.note || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('ยืนยันการลบข้อมูลโรงงาน?')) return;
        try {
            const res = await deleteRecord('factories', id);
            if (res.status === 'success') {
                toast.success('ลบข้อมูลสำเร็จ');
                loadData();
            }
        } catch (err) {
            toast.error('ลบล้มเหลว');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <div className="flex space-x-2">
                    <button
                        onClick={loadData}
                        className="p-2 text-gray-400 hover:text-rubber-600 transition-colors"
                        title="รีเฟรช"
                    >
                         <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 transition-colors text-sm font-medium"
                    >
                        <Plus size={16} />
                        <span>เพิ่มโรงงาน</span>
                    </button>
                )}
                </div>
            </div>

            {showForm && (
                <div className={`rounded-xl p-6 border transition-all duration-300 ${editingFactory ? 'bg-amber-50/50 border-amber-100 shadow-sm' : 'bg-rubber-50/40 border-rubber-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-sm font-bold ${editingFactory ? 'text-amber-800' : 'text-rubber-800'}`}>
                            {editingFactory ? `แก้ไขข้อมูล: ${editingFactory.name}` : 'ข้อมูลโรงงานใหม่'}
                        </h3>
                        <button onClick={() => { setEditingFactory(null); factoryForm.reset(); setShowForm(false); }} className="text-gray-400 hover:text-gray-600">
                            <X size={18} />
                        </button>
                    </div>
                    
                    <form onSubmit={factoryForm.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">ชื่อโรงงาน *</label>
                            <input {...factoryForm.register('name', { required: true })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500 font-bold"
                                placeholder="เช่น โรงงานไทยรับเบอร์ จำกัด" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">รหัสโรงงาน (Factory Code)</label>
                            <input {...factoryForm.register('code')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500"
                                placeholder="เช่น FAC-001" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                            <input {...factoryForm.register('phone')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500"
                                placeholder="08x-xxxxxxx" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">ลิงก์แผนที่ (Google Maps)</label>
                            <input {...factoryForm.register('mapLink')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500 font-mono text-xs"
                                placeholder="https://goo.gl/maps/..." />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">ที่อยู่</label>
                            <input {...factoryForm.register('address')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500"
                                placeholder="เลขที่, ตำบล, อำเภอ..." />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">หมายเหตุ</label>
                            <input {...factoryForm.register('note')}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500"
                                placeholder="รายละเอียดเพิ่มเติม" />
                        </div>
                        <div className="md:col-span-2 flex justify-end space-x-3 pt-2">
                            <button type="button" onClick={() => { setEditingFactory(null); factoryForm.reset(); setShowForm(false); }}
                                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">ยกเลิก</button>
                            <button type="submit" disabled={saving}
                                className={`px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50 flex items-center space-x-2 shadow-sm transition-all active:scale-95 ${editingFactory ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rubber-600 hover:bg-rubber-700'}`}>
                                {saving ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
                                <span>{editingFactory ? 'บันทึกการแก้ไข' : 'บันทึกโรงงาน'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">ข้อมูลโรงงาน</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">ที่อยู่ / ติดต่อ</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">หมายเหตุ</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-widest w-32">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {factories.map((f, idx) => (
                            <tr key={f.id || idx} className={`hover:bg-gray-50 transition-colors ${editingFactory?.id === f.id ? 'bg-amber-50/30' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{f.name}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Code: {f.code || '-'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-gray-700 text-xs truncate max-w-[200px]">{f.address || '-'}</div>
                                    <div className="text-[11px] text-rubber-600 font-bold">{f.phone || ''}</div>
                                    {f.mapLink && (
                                        <a href={f.mapLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center mt-0.5">
                                            <span>เปิดแผนที่</span>
                                        </a>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-500">{f.note || '-'}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                        <button
                                            onClick={() => handleEdit(f)}
                                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                            title="แก้ไข"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(f.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="ลบ"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {factories.length === 0 && !loading && (
                            <tr>
                                <td colSpan="4" className="px-6 py-16 text-center text-gray-400">
                                    <div className="flex flex-col items-center">
                                        <Building2 size={48} className="mb-4 opacity-10" />
                                        <p className="font-bold">ไม่พบข้อมูลโรงงาน</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
