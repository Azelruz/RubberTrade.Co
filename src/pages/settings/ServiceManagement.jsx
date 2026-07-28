import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Wrench, Plus, Edit2, Trash2, Save, X, RefreshCw, CheckCircle, HelpCircle, CheckSquare, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { 
    fetchServiceCatalog, 
    addServiceCatalog, 
    updateServiceCatalog, 
    deleteServiceCatalog 
} from '../../services/apiService';

const LEGACY_IDS = ['srv_1', 'srv_2', 'srv_3', 'srv_4'];

const DEFAULT_SERVICES = [
    { name: 'รับงานตัดหญ้า', unit_type: 'rai', price_per_unit: 350, description: 'ตัดหญ้าตามสวนยางและพื้นที่เกษตร (บาท/ไร่)', is_active: true },
    { name: 'รับงานฉีดพ่นยา / ฉีดหญ้า', unit_type: 'rai', price_per_unit: 200, description: 'ฉีดพ่นยาฆ่าหญ้าและยาบำรุงหน้ายาง (บาท/ไร่)', is_active: true },
    { name: 'รับงานไถสวน / ปรับพื้นที่', unit_type: 'rai', price_per_unit: 500, description: 'ไถพรวนดินและปรับพื้นที่สวนยาง (บาท/ไร่)', is_active: true },
    { name: 'รับงานตัดไม้ / โค่นป่า / แผ้วกวาด', unit_type: 'job', price_per_unit: 1500, description: 'เหมาตัดไม้ โค่นต้นยาง และทำความสะอาดสวน (บาท/งาน)', is_active: true },
];

export const ServiceManagement = () => {
    const { user } = useAuth();
    const currentStoreId = useMemo(() => user?.storeId || 'SYSTEM', [user]);

    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
        defaultValues: {
            name: '', unit_type: 'rai', price_per_unit: '', description: '', is_active: true
        }
    });

    useEffect(() => {
        if (currentStoreId) {
            loadServices();
        }
    }, [currentStoreId]);

    const loadServices = async () => {
        setLoading(true);
        try {
            // 1. Purge legacy static IDs (srv_1..srv_4)
            for (const legId of LEGACY_IDS) {
                try { await db.service_catalog.delete(legId); } catch (e) {}
            }

            // 2. Read local items for this store strictly without auto-seeding
            let localList = await db.service_catalog.toArray();
            let storeLocalList = localList.filter(item => 
                !LEGACY_IDS.includes(item.id) && 
                (!item.userId || item.userId === currentStoreId)
            );

            setServices(storeLocalList);

            // 3. Fetch background sync if online
            if (navigator.onLine) {
                const res = await fetchServiceCatalog();
                if (Array.isArray(res)) {
                    const cleanRes = res.filter(item => !LEGACY_IDS.includes(item.id));
                    
                    // Deduplicate by ID
                    const uniqueMap = new Map();
                    cleanRes.forEach(item => uniqueMap.set(item.id, item));
                    const uniqueServerList = Array.from(uniqueMap.values());

                    // Preserve other stores' items in IndexedDB
                    const otherStoresItems = localList.filter(item => 
                        item.userId && item.userId !== currentStoreId && !LEGACY_IDS.includes(item.id)
                    );
                    const updatedLocal = [...otherStoresItems, ...uniqueServerList];

                    await db.service_catalog.clear();
                    if (updatedLocal.length > 0) {
                        await db.service_catalog.bulkPut(updatedLocal);
                    }
                    setServices(uniqueServerList);
                }
            }
        } catch (err) {
            console.error('Error loading service catalog:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSeedDefaults = async () => {
        setSaving(true);
        try {
            const seeded = DEFAULT_SERVICES.map((s, idx) => ({
                ...s,
                id: `default_${currentStoreId}_${idx + 1}`,
                userId: currentStoreId
            }));
            await db.service_catalog.bulkPut(seeded);
            if (navigator.onLine) {
                for (const s of seeded) {
                    await addServiceCatalog(s);
                }
            }
            toast.success('สร้างรายการบริการเริ่มต้น 4 รายการสำเร็จ');
            loadServices();
        } catch (err) {
            toast.error('สร้างรายการเริ่มต้นล้มเหลว: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleFormSubmit = async (data) => {
        setSaving(true);
        const payload = {
            id: editingService ? editingService.id : crypto.randomUUID(),
            name: data.name.trim(),
            unit_type: data.unit_type,
            price_per_unit: parseFloat(data.price_per_unit) || 0,
            description: data.description ? data.description.trim() : '',
            is_active: data.is_active !== false,
            userId: currentStoreId
        };

        try {
            await db.service_catalog.put(payload);
            
            if (editingService) {
                await updateServiceCatalog(payload.id, payload);
                toast.success('แก้ไขข้อมูลบริการเรียบร้อยแล้ว');
            } else {
                await addServiceCatalog(payload);
                toast.success('เพิ่มรายการบริการใหม่สำเร็จ');
            }

            setShowForm(false);
            setEditingService(null);
            reset();
            loadServices();
        } catch (err) {
            toast.error('บันทึกล้มเหลว: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (srv) => {
        setEditingService(srv);
        setValue('name', srv.name);
        setValue('unit_type', srv.unit_type || 'rai');
        setValue('price_per_unit', srv.price_per_unit);
        setValue('description', srv.description || '');
        setValue('is_active', srv.is_active !== false);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('คุณต้องการลบรายการบริการนี้ใช่หรือไม่?')) return;
        try {
            await db.service_catalog.delete(id);
            await deleteServiceCatalog(id);
            toast.success('ลบรายการบริการสำเร็จ');
            setSelectedIds(prev => prev.filter(i => i !== id));
            loadServices();
        } catch (err) {
            toast.error('ลบรายการบริการล้มเหลว');
        }
    };

    // Bulk selection handlers
    const toggleSelectAll = () => {
        if (selectedIds.length === services.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(services.map(s => s.id));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`คุณต้องการลบรายการบริการที่เลือกทั้งหมด ${selectedIds.length} รายการใช่หรือไม่?`)) return;

        setLoading(true);
        const count = selectedIds.length;
        try {
            for (const id of selectedIds) {
                try {
                    await db.service_catalog.delete(id);
                    await deleteServiceCatalog(id);
                } catch (e) {
                    console.error(`Failed to delete ${id}`, e);
                }
            }
            toast.success(`ลบรายการบริการที่เลือก ${count} รายการเรียบร้อยแล้ว`);
            setSelectedIds([]);
            loadServices();
        } catch (err) {
            toast.error('การลบหลายรายการล้มเหลว: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getUnitText = (type) => {
        switch (type) {
            case 'rai': return 'ไร่';
            case 'hour': return 'ชั่วโมง';
            case 'day': return 'วัน';
            case 'job': return 'งาน / เหมาจ่าย';
            default: return 'หน่วย';
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <Wrench className="mr-2.5 text-rubber-600" size={24} />
                        ตั้งค่ารายการบริการทั่วไป & อัตราค่าบริการ
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        จัดการประเภทงานบริการ (ตัดหญ้า, ฉีดพ่นยา, ไถสวน ฯลฯ) กำหนดหน่วยและราคาบริการของร้าน
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center space-x-1.5 animate-in fade-in"
                        >
                            <Trash2 size={16} />
                            <span>ลบรายการที่เลือก ({selectedIds.length})</span>
                        </button>
                    )}
                    <button
                        onClick={loadServices}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition"
                        title="รีเฟรช"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {!showForm && (
                        <button
                            onClick={() => {
                                setEditingService(null);
                                reset();
                                setShowForm(true);
                            }}
                            className="px-4 py-2 bg-rubber-600 hover:bg-rubber-700 text-white rounded-xl font-bold text-sm shadow-sm transition flex items-center space-x-1.5"
                        >
                            <Plus size={16} />
                            <span>เพิ่มบริการใหม่</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Bulk Selection Notice Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-red-900 animate-in fade-in">
                    <div className="flex items-center space-x-2 font-bold">
                        <CheckSquare size={16} className="text-red-600" />
                        <span>เลือกรายการบริการอยู่ {selectedIds.length} จาก {services.length} รายการ</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setSelectedIds([])}
                            className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 rounded-lg font-bold border border-gray-200 transition"
                        >
                            ยกเลิกการเลือก
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition flex items-center space-x-1"
                        >
                            <Trash2 size={14} />
                            <span>ยืนยันลบทั้งหมด</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Form Drawer */}
            {showForm && (
                <div className={`p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 shadow-sm ${editingService ? 'bg-amber-50/60 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-bold text-sm ${editingService ? 'text-amber-900' : 'text-gray-800'}`}>
                            {editingService ? `แก้ไขบริการ: ${editingService.name}` : 'เพิ่มรายการบริการใหม่'}
                        </h3>
                        <button onClick={() => { setShowForm(false); setEditingService(null); reset(); }} className="text-gray-400 hover:text-gray-600">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1 md:col-span-1">
                            <label className="text-xs font-bold text-gray-600">ชื่อบริการ *</label>
                            <input
                                {...register('name', { required: 'กรุณาระบุชื่อบริการ' })}
                                placeholder="เช่น รับงานตัดหญ้า"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rubber-500/20"
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">รูปแบบการคิดราคา *</label>
                            <select
                                {...register('unit_type')}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rubber-500/20 cursor-pointer"
                            >
                                <option value="rai">คิดตามพื้นที่ (บาท / ไร่)</option>
                                <option value="hour">คิดตามเวลา (บาท / ชั่วโมง)</option>
                                <option value="day">คิดตามวัน (บาท / วัน)</option>
                                <option value="job">เหมาจ่าย (บาท / งาน)</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600">ราคาต่อหน่วย (บาท) *</label>
                            <input
                                type="number"
                                step="1"
                                {...register('price_per_unit', { required: 'กรุณาระบุราคาต่อหน่วย' })}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rubber-500/20"
                            />
                            {errors.price_per_unit && <p className="text-xs text-red-500 mt-1">{errors.price_per_unit.message}</p>}
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-bold text-gray-600">คำอธิบายเพิ่มเติม</label>
                            <input
                                {...register('description')}
                                placeholder="เช่น ตัดหญ้าในสวนยาง พร้อมเก็บกวาดเศษขยะ"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rubber-500/20"
                            />
                        </div>

                        <div className="space-y-1 flex items-center pt-5">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    {...register('is_active')}
                                    className="w-4 h-4 text-rubber-600 rounded border-gray-300 focus:ring-rubber-500"
                                />
                                <span className="text-xs font-bold text-gray-700">เปิดใช้งานรายการนี้</span>
                            </label>
                        </div>

                        <div className="md:col-span-3 flex justify-end space-x-2 pt-2 border-t border-gray-200/60">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setEditingService(null); reset(); }}
                                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-5 py-2 bg-rubber-600 hover:bg-rubber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1"
                            >
                                <Save size={14} />
                                <span>{editingService ? 'บันทึกการแก้ไข' : 'บันทึกบริการ'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Services List Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-4 py-3.5 text-center w-10">
                                    <input
                                        type="checkbox"
                                        checked={services.length > 0 && selectedIds.length === services.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 text-rubber-600 rounded border-gray-300 focus:ring-rubber-500 cursor-pointer"
                                        title="เลือกทั้งหมด"
                                    />
                                </th>
                                <th className="px-6 py-3.5 text-left">รายการบริการ</th>
                                <th className="px-6 py-3.5 text-center">รูปแบบการคิดราคา</th>
                                <th className="px-6 py-3.5 text-right">อัตราบริการ (บาท)</th>
                                <th className="px-6 py-3.5 text-center">สถานะ</th>
                                <th className="px-6 py-3.5 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {services.map(srv => {
                                const isSelected = selectedIds.includes(srv.id);
                                return (
                                    <tr 
                                        key={srv.id} 
                                        className={`transition ${isSelected ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-gray-50/50'}`}
                                    >
                                        <td className="px-4 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelectOne(srv.id)}
                                                className="w-4 h-4 text-rubber-600 rounded border-gray-300 focus:ring-rubber-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{srv.name}</div>
                                            {srv.description && (
                                                <div className="text-xs text-gray-400 mt-0.5">{srv.description}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">
                                                {getUnitText(srv.unit_type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-rubber-700">
                                            ฿{Number(srv.price_per_unit || 0).toLocaleString()} / {getUnitText(srv.unit_type)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {srv.is_active !== false ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    <CheckCircle size={12} className="mr-1" /> เปิดใช้งาน
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                                    ปิดใช้งาน
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center space-x-1">
                                                <button
                                                    onClick={() => handleEdit(srv)}
                                                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(srv.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {services.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <p className="text-gray-400 text-sm">ยังไม่มีรายการบริการในระบบของร้านคุณ</p>
                                            <button
                                                onClick={handleSeedDefaults}
                                                disabled={saving}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
                                            >
                                                <Sparkles size={16} />
                                                <span>สร้างรายการบริการเริ่มต้น (4 รายการ)</span>
                                            </button>
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

export default ServiceManagement;
