import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FlaskConical, Save, RotateCcw, Droplets, Activity, Beaker, Info, Trash2, Edit3, Calendar, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSettings, updateSettingsAPI, fetchChemicalUsage, deleteChemicalUsage, addChemicalUsage } from '../../services/apiService';

const defaultChemicals = [
    {
        id: 'ammonia',
        name: 'แอมโมเนีย',
        icon: '🧪',
        iconName: 'FlaskConical',
        color: 'amber',
        amount: '20',
        perLatex: '1000',
        unit: 'กิโลกรัม',
        description: 'ใช้รักษาสภาพน้ำยางไม่ให้จับตัว'
    },
    {
        id: 'water',
        name: 'น้ำ',
        icon: '💧',
        iconName: 'Droplets',
        color: 'blue',
        amount: '30',
        perLatex: '800',
        unit: 'กิโลกรัม',
        description: 'ใช้ผสมเพื่อปรับความเข้มข้น'
    },
    {
        id: 'whiteMedicine',
        name: 'ยาขาว',
        icon: '⚪',
        iconName: 'Activity',
        color: 'gray',
        amount: '1',
        perLatex: '1000',
        unit: 'กิโลกรัม',
        description: 'ใช้เพื่อปรับคุณภาพน้ำยาง'
    }
];

const colorMap = {
    amber: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        ring: 'ring-amber-100',
        text: 'text-amber-700',
        iconBg: 'bg-amber-100',
        badge: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        ring: 'ring-blue-100',
        text: 'text-blue-700',
        iconBg: 'bg-blue-100',
        badge: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    gray: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        ring: 'ring-gray-100',
        text: 'text-gray-700',
        iconBg: 'bg-gray-100',
        badge: 'bg-gray-100 text-gray-800 border-gray-200'
    }
};

export const ChemicalManagement = () => {
    const [chemicals, setChemicals] = useState(defaultChemicals);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);
    
    // History State
    const [usageHistory, setUsageHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        await Promise.all([
            loadChemicalSettings(),
            loadUsageHistory()
        ]);
        setLoading(false);
    };

    const loadChemicalSettings = async () => {
        try {
            const res = await getSettings();
            if (res.status === 'success' && res.data && res.data.chemicalSettings) {
                try {
                    const saved = JSON.parse(res.data.chemicalSettings);
                    const merged = defaultChemicals.map(def => {
                        const found = saved.find(s => s.id === def.id);
                        return found ? { ...def, amount: found.amount, perLatex: found.perLatex } : def;
                    });
                    setChemicals(merged);
                } catch (e) {
                    console.error('Failed to parse chemicalSettings:', e);
                }
            }
        } catch (err) {
            console.error('Error loading chemical settings:', err);
        }
    };

    const loadUsageHistory = async () => {
        setLoadingHistory(true);
        try {
            const data = await fetchChemicalUsage();
            setUsageHistory(data || []);
        } catch (err) {
            console.error('Error loading usage history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleChange = (id, field, value) => {
        setChemicals(prev => prev.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        ));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const toSave = chemicals.map(({ id, amount, perLatex }) => ({ id, amount, perLatex }));
            const res = await updateSettingsAPI({ chemicalSettings: JSON.stringify(toSave) });
            if (res.status === 'success') {
                toast.success('บันทึกการตั้งค่าสารเคมีสำเร็จ');
                setHasChanges(false);
            } else {
                toast.error(res.message || 'บันทึกล้มเหลว');
            }
        } catch (err) {
            toast.error('บันทึกล้มเหลว: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUsage = async (id) => {
        if (!window.confirm('ยืนยันการลบประวัติการใช้งานสารเคมีนี้?')) return;
        
        const toastId = toast.loading('กำลังลบข้อมูล...');
        try {
            const res = await deleteChemicalUsage(id);
            if (res.status === 'success') {
                toast.success('ลบข้อมูลสำเร็จ', { id: toastId });
                loadUsageHistory();
            } else {
                toast.error(res.message || 'ลบล้มเหลว', { id: toastId });
            }
        } catch (err) {
            toast.error('ลบล้มเหลว: ' + err.message, { id: toastId });
        }
    };

    const handleUpdateRecord = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const amount = formData.get('amount');

        if (!amount || isNaN(amount)) {
            toast.error('กรุณาระบุปริมาณที่ถูกต้อง');
            return;
        }

        const toastId = toast.loading('กำลังปรับปรุงข้อมูล...');
        try {
            const res = await addChemicalUsage({
                ...editingRecord,
                amount: Number(amount)
            });
            
            if (res.status === 'success') {
                toast.success('ปรับปรุงข้อมูลสำเร็จ', { id: toastId });
                setEditingRecord(null);
                loadUsageHistory();
            } else {
                toast.error(res.message || 'อัปเดตล้มเหลว', { id: toastId });
            }
        } catch (err) {
            toast.error('อัปเดตล้มเหลว: ' + err.message, { id: toastId });
        }
    };

    const handleReset = () => {
        setChemicals(defaultChemicals);
        setHasChanges(true);
    };

    const getChemicalInfo = (id) => {
        return defaultChemicals.find(c => c.id === id) || { name: id, icon: '🧪' };
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rubber-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* Section 1: Settings */}
            <div className="space-y-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <FlaskConical className="mr-2 text-purple-600" size={24} />
                            ตั้งค่าอัตราส่วนสารเคมี
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            กำหนดอัตราการใส่สารเคมีอัตโนมัติอิงตามน้ำหนักยางที่รับซื้อ
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleReset}
                            className="inline-flex items-center px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition text-sm font-bold"
                            title="รีเซ็ตเป็นค่าเริ่มต้น"
                        >
                            <RotateCcw size={16} className="mr-1.5" />
                            ค่าเริ่มต้น
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className="inline-flex items-center px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={16} className="mr-1.5" />
                            {saving ? 'กำลังบันทึก...' : 'บันทึกสูตร'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {chemicals.map((chem) => {
                        const colors = colorMap[chem.color] || colorMap.gray;
                        return (
                            <div key={chem.id} className={`${colors.bg} border ${colors.border} rounded-2xl p-6 transition-all hover:shadow-md`}>
                                <div className="flex items-center space-x-3 mb-5">
                                    <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center text-2xl shadow-sm`}>
                                        {chem.icon}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg ${colors.text}`}>{chem.name}</h3>
                                        <p className="text-xs text-gray-500">{chem.description}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">ใส่ {chem.name}</label>
                                        <div className="relative">
                                            <input
                                                type="number" step="0.1" value={chem.amount}
                                                onChange={(e) => handleChange(chem.id, 'amount', e.target.value)}
                                                className={`w-full px-4 py-3 border-2 ${colors.border} rounded-xl bg-white text-lg font-bold text-gray-900`}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">{chem.unit}</span>
                                        </div>
                                    </div>
                                    <div className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">ต่อน้ำยางสด</div>
                                    <div>
                                        <div className="relative">
                                            <input
                                                type="number" step="1" value={chem.perLatex}
                                                onChange={(e) => handleChange(chem.id, 'perLatex', e.target.value)}
                                                className={`w-full px-4 py-3 border-2 ${colors.border} rounded-xl bg-white text-lg font-bold text-gray-900`}
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">กก.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <hr className="border-gray-100" />

            {/* Section 2: Usage History */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <Calendar className="mr-2 text-rubber-600" size={24} />
                            ประวัติการใส่สารเคมีรายวัน
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            ตรวจสอบและแก้ไขรายการสารเคมีที่บันทึกไปแล้ว
                        </p>
                    </div>
                    <button 
                        onClick={loadUsageHistory}
                        className="p-2 text-gray-400 hover:text-rubber-600 hover:bg-rubber-50 rounded-xl transition-all"
                    >
                        <RefreshCw size={20} className={loadingHistory ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Edit Modal / Inline Form */}
                {editingRecord && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-amber-800 flex items-center">
                                <Edit3 size={18} className="mr-2" />
                                แก้ไขรายการ: {getChemicalInfo(editingRecord.chemicalId).name} ({editingRecord.date})
                            </h3>
                            <button onClick={() => setEditingRecord(null)} className="text-amber-400 hover:text-amber-600">ยกเลิก</button>
                        </div>
                        <form onSubmit={handleUpdateRecord} className="flex flex-col md:flex-row items-end space-y-4 md:space-y-0 md:space-x-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-amber-600/70 uppercase tracking-widest mb-1.5 block">ระบุจำนวนที่ถูกต้อง</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        name="amount"
                                        defaultValue={editingRecord.amount}
                                        autoFocus
                                        className="w-full px-5 py-3 rounded-xl border-2 border-amber-200 focus:border-amber-500 focus:ring-0 text-xl font-black text-amber-900" 
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-amber-400">{editingRecord.unit}</span>
                                </div>
                            </div>
                            <button type="submit" className="w-full md:w-auto px-8 py-3.5 bg-amber-600 text-white rounded-xl font-black shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all">
                                บันทึกการแก้ไข
                            </button>
                        </form>
                    </div>
                )}

                {/* History Table */}
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">วันที่</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">รายการสารเคมี</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">ปริมาณบันทึก</th>
                                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {usageHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-medium">
                                            {loadingHistory ? 'กำลังโหลดข้อมูล...' : 'ยังไม่มีประวัติการบันทึก'}
                                        </td>
                                    </tr>
                                ) : (
                                    usageHistory.map((item) => {
                                        const chem = getChemicalInfo(item.chemicalId);
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">{format(new Date(item.date), 'dd/MM/yyyy')}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase font-mono">{item.id.split('_')[1] || ''}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-xl">{chem.icon}</span>
                                                        <span className="font-bold text-gray-700">{chem.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-lg font-black text-gray-900">{Number(item.amount).toLocaleString()}</span>
                                                    <span className="text-xs font-medium text-gray-400 ml-1">{item.unit || 'กก.'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <button 
                                                            onClick={() => setEditingRecord(item)}
                                                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                                            title="แก้ไข"
                                                        >
                                                            <Edit3 size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteUsage(item.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="ลบ"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
