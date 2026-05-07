import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { UserCircle, Plus, Save, Trash2, Edit2, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchStaff, addStaff, updateRecord, deleteRecord } from '../../services/apiService';

export const StaffManagement = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showStaffForm, setShowStaffForm] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);

    const staffForm = useForm({
        defaultValues: {
            name: '', phone: '', address: '', salary: 0, bonus: 0, note: ''
        }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchStaff();
            setStaffList(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    const onSubmitStaff = async (data) => {
        setSaving(true);
        try {
            let res;
            if (editingStaff) {
                res = await updateRecord('staff', editingStaff.id, data);
                if (res.status === 'success') {
                    toast.success('แก้ไขพนักงานสำเร็จ');
                    setEditingStaff(null);
                    staffForm.reset();
                    setShowStaffForm(false);
                    loadData();
                }
            } else {
                res = await addStaff(data);
                if (res.status === 'success') {
                    toast.success('เพิ่มพนักงานสำเร็จ');
                    staffForm.reset();
                    setShowStaffForm(false);
                    loadData();
                } else {
                    toast.error(res.message || 'บันทึกล้มเหลว');
                }
            }
        } catch (err) {
            toast.error(editingStaff ? 'แก้ไขข้อมูลล้มเหลว' : 'บันทึกล้มเหลว: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEditStaff = (staff) => {
        setEditingStaff(staff);
        setShowStaffForm(true);
        staffForm.reset({
            name: staff.name,
            phone: staff.phone,
            address: staff.address,
            salary: staff.salary,
            bonus: staff.bonus,
            note: staff.note
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteStaff = async (id) => {
        if (!window.confirm('ยืนยันการลบข้อมูลพนักงาน?')) return;
        try {
            const res = await deleteRecord('staff', id);
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
                    {!showStaffForm && (
                        <button
                            onClick={() => setShowStaffForm(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 transition-colors text-sm font-medium"
                        >
                            <Plus size={16} />
                            <span>เพิ่มพนักงาน</span>
                        </button>
                    )}
                </div>
            </div>

            {showStaffForm && (
                <div className={`rounded-xl p-6 border transition-all duration-300 ${editingStaff ? 'bg-amber-50/50 border-amber-100 shadow-sm' : 'bg-rubber-50/40 border-rubber-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-sm font-bold ${editingStaff ? 'text-amber-800' : 'text-rubber-800'}`}>
                            {editingStaff ? `แก้ไขข้อมูล: ${editingStaff.name}` : 'ข้อมูลพนักงานใหม่'}
                        </h3>
                        <button onClick={() => { setEditingStaff(null); staffForm.reset(); setShowStaffForm(false); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    
                    <form onSubmit={staffForm.handleSubmit(onSubmitStaff)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <button type="button" onClick={() => { setEditingStaff(null); staffForm.reset(); setShowStaffForm(false); }}
                                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">ยกเลิก</button>
                            <button type="submit" disabled={saving}
                                className={`px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50 flex items-center space-x-2 shadow-sm transition-all active:scale-95 ${editingStaff ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rubber-600 hover:bg-rubber-700'}`}>
                                {saving ? <RefreshCw className="animate-spin" size={15} /> : <Save size={15} />}
                                <span>{editingStaff ? 'บันทึกการแก้ไข' : 'บันทึก'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50/80">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">พนักงาน</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest hidden md:table-cell">ที่อยู่</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">เบอร์โทร</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">ค่าจ้าง (฿)</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-widest w-32">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {staffList.map((s, idx) => (
                            <tr key={s.id || idx} className={`hover:bg-gray-50 transition-colors ${editingStaff?.id === s.id ? 'bg-amber-50/30' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{s.name}</div>
                                    <div className="md:hidden text-xs text-gray-400 mt-0.5">{s.address || 'ไม่มีที่อยู่'}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 hidden md:table-cell max-w-xs truncate">{s.address || '-'}</td>
                                <td className="px-6 py-4 text-gray-500">{s.phone || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-mono font-bold text-gray-900">{Number(s.salary || 0).toLocaleString()}</div>
                                    {Number(s.bonus || 0) > 0 && (
                                        <div className="text-[10px] text-green-600 font-bold">+ {Number(s.bonus).toLocaleString()} โบนัส</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                        <button
                                            onClick={() => handleEditStaff(s)}
                                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                            title="แก้ไข"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteStaff(s.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="ลบ"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {staffList.length === 0 && !loading && (
                            <tr>
                                <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                                    <div className="flex flex-col items-center">
                                        <UserCircle size={48} className="mb-4 opacity-10" />
                                        <p className="font-bold">ไม่พบข้อมูลพนักงานประจำ</p>
                                        <p className="text-xs opacity-60 mt-1">กดปุ่ม "เพิ่มพนักงาน" เพื่อเริ่มบันทึกข้อมูล</p>
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
