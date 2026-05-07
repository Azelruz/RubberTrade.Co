import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Truck, Plus, Save, Trash2, Edit2, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchTrucks, addTruck, updateRecord, deleteRecord } from '../../services/apiService';

export const TruckManagement = () => {
    const [trucks, setTrucks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingTruck, setEditingTruck] = useState(null);

    const truckForm = useForm({
        defaultValues: {
            licensePlate: '', driverName: '', capacity: 0, 
            brand: '', model: '', chassisNumber: '', prbExpiry: '', note: ''
        }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchTrucks();
            setTrucks(Array.isArray(data) ? data : []);
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
            if (editingTruck) {
                res = await updateRecord('trucks', editingTruck.id, data);
                if (res.status === 'success') {
                    toast.success('แก้ไขข้อมูลรถสำเร็จ');
                    setEditingTruck(null);
                    truckForm.reset();
                    setShowForm(false);
                    loadData();
                }
            } else {
                res = await addTruck(data);
                if (res.status === 'success') {
                    toast.success('เพิ่มรถใหม่สำเร็จ');
                    truckForm.reset();
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

    const handleEdit = (truck) => {
        setEditingTruck(truck);
        setShowForm(true);
        truckForm.reset({
            licensePlate: truck.licensePlate,
            driverName: truck.driverName,
            capacity: truck.capacity,
            brand: truck.brand,
            model: truck.model,
            chassisNumber: truck.chassisNumber,
            prbExpiry: truck.prbExpiry,
            note: truck.note
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('ยืนยันการลบข้อมูลรถ?')) return;
        try {
            const res = await deleteRecord('trucks', id);
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
            <div className="flex items-center justify-between">
                <div>
                   <h2 className="text-xl font-black text-gray-900 leading-none mb-1">จัดการรถส่งน้ำยาง</h2>
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Truck Fleet Management</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={loadData}
                        className="p-2.5 text-gray-400 hover:text-rubber-600 hover:bg-rubber-50 rounded-xl transition-all"
                        title="รีเฟรช"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                {!showForm && (
                     <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center space-x-2 px-6 py-2.5 bg-rubber-600 text-white rounded-xl hover:bg-rubber-700 shadow-lg shadow-rubber-200 transition-all active:scale-95 text-sm font-bold"
                    >
                        <Plus size={18} />
                        <span>เพิ่มรถใหม่</span>
                    </button>
                )}
                </div>
            </div>

            {showForm && (
                <div className={`rounded-[2rem] p-8 border-2 transition-all duration-500 shadow-xl ${editingTruck ? 'bg-amber-50/50 border-amber-100 shadow-amber-100/20' : 'bg-rubber-50/30 border-rubber-100 shadow-rubber-100/20'}`}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-3">
                            <div className={`p-3 rounded-2xl ${editingTruck ? 'bg-amber-100 text-amber-600' : 'bg-rubber-100 text-rubber-600'}`}>
                                <Truck size={24} />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black leading-none mb-1 ${editingTruck ? 'text-amber-900' : 'text-rubber-900'}`}>
                                    {editingTruck ? `แก้ไขข้อมูล: ${editingTruck.licensePlate}` : 'ลงทะเบียนรถใหม่'}
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inventory Module</p>
                            </div>
                        </div>
                        <button onClick={() => { setEditingTruck(null); truckForm.reset(); setShowForm(false); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-all">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <form onSubmit={truckForm.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">ทะเบียนรถ *</label>
                            <input {...truckForm.register('licensePlate', { required: true })}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rubber-500 focus:border-transparent shadow-sm transition-all"
                                placeholder="เช่น 80-1234 นครศรีฯ" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">ชื่อคนขับ</label>
                            <input {...truckForm.register('driverName')}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rubber-500 focus:border-transparent shadow-sm transition-all"
                                placeholder="ชื่อคนขับ" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">ยี่ห้อ (Brand)</label>
                            <input {...truckForm.register('brand')}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rubber-500 focus:border-transparent shadow-sm transition-all"
                                placeholder="เช่น ISUZU, HINO" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">รุ่น (Model)</label>
                            <input {...truckForm.register('model')}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rubber-500 focus:border-transparent shadow-sm transition-all"
                                placeholder="รุ่นรถ" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">ความจุ (กก.)</label>
                            <input {...truckForm.register('capacity')} type="number"
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rubber-500 focus:border-transparent shadow-sm transition-all"
                                placeholder="3000" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">วันหมดอายุ พรบ.</label>
                            <input {...truckForm.register('prbExpiry')} type="date"
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rubber-500 focus:border-transparent shadow-sm transition-all" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">หมายเหตุ</label>
                            <input {...truckForm.register('note')}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rubber-500 focus:border-transparent shadow-sm transition-all"
                                placeholder="รายละเอียดเพิ่มเติม..." />
                        </div>
                        <div className="md:col-span-3 flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={() => { setEditingTruck(null); truckForm.reset(); setShowForm(false); }}
                                className="px-6 py-3 text-sm font-bold text-gray-500 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">ยกเลิก</button>
                            <button type="submit" disabled={saving}
                                className={`px-10 py-3 text-sm font-bold text-white rounded-2xl disabled:opacity-50 flex items-center space-x-2 shadow-lg transition-all active:scale-95 ${editingTruck ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-rubber-600 hover:bg-rubber-700 shadow-rubber-200'}`}>
                                {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                                <span>{editingTruck ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลรถ'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">ทะเบียน / รุ่น</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">คนขับ</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">ความจุ (กก.)</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">วันหมดอายุ พรบ.</th>
                                <th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-40">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {trucks.map((t, idx) => (
                                <tr key={t.id || idx} className={`group hover:bg-rubber-50/30 transition-all duration-300 ${editingTruck?.id === t.id ? 'bg-amber-50/50' : ''}`}>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-gray-900 mb-0.5">{t.licensePlate}</span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{t.brand || '-'} {t.model}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-bold text-gray-700">{t.driverName || '-'}</td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="px-3 py-1 bg-gray-100 text-gray-900 rounded-lg text-xs font-black font-mono">
                                            {Number(t.capacity || 0).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        {t.prbExpiry ? (
                                            <span className={`text-xs font-bold ${new Date(t.prbExpiry) < new Date() ? 'text-red-500' : 'text-gray-600'}`}>
                                                {new Date(t.prbExpiry).toLocaleDateString('th-TH')}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-center space-x-2">
                                            <button
                                                onClick={() => handleEdit(t)}
                                                className="p-2.5 text-gray-400 hover:text-amber-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-amber-100 transition-all"
                                                title="แก้ไข"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-red-100 transition-all"
                                                title="ลบ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {trucks.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200 mb-6 border border-gray-50 shadow-inner">
                                                <Truck size={40} />
                                            </div>
                                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">ไม่พบข้อมูลรถส่งน้ำยาง</p>
                                            <p className="text-xs font-bold text-gray-300 mt-1">Please add your first truck to get started</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
