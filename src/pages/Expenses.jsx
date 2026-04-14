import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { PlusCircle, Trash2, Edit2, Receipt, Users, Search, Wallet, Calendar, Tag, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { calculateWage } from '../utils/calculations';
import { fetchExpenses, addExpense, fetchWages, addWage, fetchStaff, fetchBuyRecords, deleteRecord, updateRecord, isCached } from '../services/apiService';

const EXPENSE_CATEGORIES = [
    'ค่าน้ำมัน',
    'ค่าซ่อมบำรุง',
    'ค่าอุปกรณ์',
    'ค่าสาธารณูปโภค',
    'ค่าขนส่ง',
    'ค่าอาหาร',
    'ค่าแอมโมเนีย',
    'ยาขาว',
    'ค่าเช่าบ้าน',
    'อื่นๆ',
];

export const Expenses = () => {
    const [activeTab, setActiveTab] = useState('expenses');
    const [expenses, setExpenses] = useState([]);
    const { user } = useAuth();
    const [wages, setWages] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [showWageForm, setShowWageForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [confirmDeleteSheet, setConfirmDeleteSheet] = useState('');
    const [editingRecord, setEditingRecord] = useState(null); // { id, sheetName }
    const isDemo = false;

    const expenseForm = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd') } });
    const wageForm = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), workDays: 1, bonus: 0 } });

    // For auto-bonus calc
    const buyRecordsRef = React.useRef([]); // cache without triggering re-renders
    const [loadingBonus, setLoadingBonus] = useState(false);
    const [suggestedBonus, setSuggestedBonus] = useState(null); // { weight, bonus }

    const watchWageDate = wageForm.watch('date');

    // When wage form date changes OR form opens, auto-calculate bonus from buy records
    useEffect(() => {
        if (!showWageForm || !watchWageDate) return;
        let cancelled = false;

        const calcBonus = async () => {
            setLoadingBonus(true);
            try {
                // Always try to fetch if cache is empty
                if (buyRecordsRef.current.length === 0) {
                    const raw = await fetchBuyRecords();
                    buyRecordsRef.current = Array.isArray(raw) ? raw : [];
                }
                if (cancelled) return;

                const records = buyRecordsRef.current;
                // Match by date string; try both yyyy-MM-dd and other formats
                const dateRecords = records.filter(r => {
                    const d = String(r.date || '').trim();
                    return d === watchWageDate || d.startsWith(watchWageDate);
                });
                const totalWeight = dateRecords.reduce((sum, r) => sum + Number(r.weight || 0), 0);
                const calculatedBonus = Math.floor(totalWeight / 1000) * 10;
                setSuggestedBonus({ weight: totalWeight, bonus: calculatedBonus });
                wageForm.setValue('bonus', calculatedBonus, { shouldDirty: false });
            } catch (e) {
                if (!cancelled) setSuggestedBonus(null);
            } finally {
                if (!cancelled) setLoadingBonus(false);
            }
        };

        calcBonus();
        return () => { cancelled = true; };
    }, [watchWageDate, showWageForm]);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        if (!isCached('expenses', 'wages')) setLoading(true);
        try {
            if (activeTab === 'expenses') {
                const data = await fetchExpenses();
                setExpenses([...data].reverse());
            } else {
                const [wData, sData, bRaw] = await Promise.all([fetchWages(), fetchStaff(), fetchBuyRecords()]);
                setWages([...wData].reverse());
                setStaffList(sData || []);
                // Pre-fill the ref cache so calcBonus can use it immediately
                buyRecordsRef.current = Array.isArray(bRaw) ? bRaw : [];
            }
        } catch (e) {
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    const onAddExpense = async (data) => {
        setSubmitting(true);
        try {
            if (editingRecord) {
                if (isDemo) {
                    setExpenses(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...data } : r));
                    toast.success('อัปเดตสำเร็จ (Demo)');
                } else {
                    const res = await updateRecord('Expenses', editingRecord.id, data);
                    if (res.status === 'success') {
                        toast.success('อัปเดตสำเร็จ');
                    } else throw new Error(res.message);
                }
            } else {
                if (isDemo) {
                    const newRec = { ...data, id: Date.now().toString(), timestamp: new Date().toISOString() };
                    setExpenses(prev => [newRec, ...prev]);
                    toast.success('บันทึกสำเร็จ (Demo)');
                } else {
                    const res = await addExpense(data);
                    if (res.status === 'success') toast.success('บันทึกสำเร็จ');
                    else throw new Error(res.message);
                }
            }
            expenseForm.reset({ date: format(new Date(), 'yyyy-MM-dd') });
            setShowExpenseForm(false);
            setEditingRecord(null);
            loadData();
        } catch (e) {
            toast.error('ล้มเหลว: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const onAddWage = async (data) => {
        setSubmitting(true);
        try {
            const selectedStaff = staffList.find(s => s.id === data.staffId);
            const staffName = selectedStaff ? selectedStaff.name : data.staffId;
            const dailyWage = selectedStaff ? Number(selectedStaff.salary) : Number(data.dailyWage || 0);
            const bonus = Number(data.bonus || 0);
            const workDays = Number(data.workDays || 1);
            const record = calculateWage(dailyWage, bonus, workDays);
            const payload = { ...data, staffName, dailyWage, bonus, workDays, total: record.total };

            if (editingRecord) {
                if (isDemo) {
                    setWages(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...payload } : r));
                    toast.success('อัปเดตสำเร็จ (Demo)');
                } else {
                    const res = await updateRecord('Wages', editingRecord.id, payload);
                    if (res.status === 'success') {
                        toast.success('อัปเดตสำเร็จ');
                    } else throw new Error(res.message);
                }
            } else {
                if (isDemo) {
                    const newRec = { ...payload, id: Date.now().toString(), timestamp: new Date().toISOString() };
                    setWages(prev => [newRec, ...prev]);
                    toast.success('บันทึกสำเร็จ (Demo)');
                } else {
                    const res = await addWage(payload);
                    if (res.status === 'success') toast.success('บันทึกสำเร็จ');
                    else throw new Error(res.message);
                }
            }
            wageForm.reset({ date: format(new Date(), 'yyyy-MM-dd'), workDays: 1 });
            setShowWageForm(false);
            setEditingRecord(null);
            loadData();
        } catch (e) {
            toast.error('ล้มเหลว: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (sheetName, id) => {
        setConfirmDeleteSheet(sheetName);
        setConfirmDeleteId(id);
    };

    const handleEdit = (sheetName, record) => {
        setEditingRecord({ id: record.id, sheetName });
        if (sheetName === 'Expenses') {
            expenseForm.reset({
                date: record.date,
                category: record.category || '',
                description: record.description || '',
                amount: record.amount || 0,
                note: record.note || ''
            });
            setShowExpenseForm(true);
            setShowWageForm(false);
        } else {
            wageForm.reset({
                date: record.date,
                staffId: record.staffId || '',
                dailyWage: record.dailyWage || 0,
                workDays: record.workDays || 1,
                bonus: record.bonus || 0,
                note: record.note || ''
            });
            setShowWageForm(true);
            setShowExpenseForm(false);
        }
    };

    const confirmDelete = async () => {
        const id = confirmDeleteId;
        const sheetName = confirmDeleteSheet;
        setConfirmDeleteId(null);
        const toastId = toast.loading('กำลังลบ...');
        try {
            if (isDemo) {
                if (sheetName === 'Expenses') setExpenses(prev => prev.filter(r => String(r.id) !== String(id)));
                else setWages(prev => prev.filter(r => String(r.id) !== String(id)));
                toast.success('ลบสำเร็จ (Demo)', { id: toastId });
                return;
            }
            const res = await deleteRecord(sheetName, id);
            if (res && res.status === 'success') {
                toast.success('ลบสำเร็จ', { id: toastId });
                loadData();
            } else {
                toast.error('ลบล้มเหลว: ' + (res?.message || ''), { id: toastId, duration: 6000 });
            }
        } catch (e) {
            toast.error('ลบล้มเหลว: ' + e.message, { id: toastId, duration: 6000 });
        }
    };

    const filteredExpenses = expenses.filter(r =>
        (r.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredWages = wages.filter(r =>
        (r.staffName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalExpenses = filteredExpenses.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalWages = filteredWages.reduce((s, r) => s + Number(r.total || 0), 0);

    const watchStaffId = wageForm.watch('staffId');
    const selectedStaffSalary = staffList.find(s => s.id === watchStaffId)?.salary || '';

    return (
        <div className="space-y-6">

            {/* Confirm Delete Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                                <Trash2 className="text-red-600" size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">ยืนยันการลบ</h3>
                        </div>
                        <p className="text-gray-600 mb-5 text-sm">คุณต้องการลบรายการนี้ใช่หรือไม่?</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">ยกเลิก</button>
                            <button onClick={confirmDelete}
                                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg">ลบรายการ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">บันทึกค่าใช้จ่าย</h1>
                <p className="text-gray-500">จัดการค่าใช้จ่ายรายวันและค่าจ้างพนักงาน</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => { setActiveTab('expenses'); setSearchTerm(''); }}
                        className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors border-b-2 ${activeTab === 'expenses' ? 'border-rubber-500 text-rubber-600 bg-rubber-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <Receipt size={18} />
                            <span>ค่าใช้จ่ายรายวัน</span>
                        </div>
                    </button>
                    <button
                        onClick={() => { setActiveTab('wages'); setSearchTerm(''); }}
                        className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors border-b-2 ${activeTab === 'wages' ? 'border-rubber-500 text-rubber-600 bg-rubber-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center justify-center space-x-2">
                            <Users size={18} />
                            <span>ค่าจ้างพนักงาน</span>
                        </div>
                    </button>
                </div>

                <div className="p-6">
                    {/* ─── EXPENSES TAB ─── */}
                    {activeTab === 'expenses' && (
                        <div className="space-y-5">
                            <div className="flex flex-wrap gap-3 items-center justify-between">
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-64">
                                    <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="ค้นหาคำอธิบาย, หมวดหมู่..."
                                        className="bg-transparent text-sm w-full focus:outline-none" />
                                </div>
                                <button onClick={() => setShowExpenseForm(!showExpenseForm)}
                                    className="flex items-center space-x-2 px-4 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 text-sm font-medium">
                                    <PlusCircle size={16} /><span>เพิ่มค่าใช้จ่าย</span>
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-red-50 rounded-xl p-4 border border-red-100 flex items-center space-x-3">
                                    <Wallet className="text-red-400" size={28} />
                                    <div>
                                        <p className="text-xs text-red-500 font-medium">รวมค่าใช้จ่าย</p>
                                        <p className="text-xl font-black text-red-700">฿{totalExpenses.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center space-x-3">
                                    <FileText className="text-gray-400" size={28} />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">จำนวนรายการ</p>
                                        <p className="text-xl font-black text-gray-700">{filteredExpenses.length} รายการ</p>
                                    </div>
                                </div>
                            </div>

                            {/* Add/Edit Form */}
                            {showExpenseForm && (
                                <div className="bg-rubber-50/40 border border-rubber-100 rounded-xl p-6">
                                    <h3 className="text-sm font-bold text-rubber-800 mb-4">
                                        {editingRecord ? 'แก้ไขค่าใช้จ่าย' : 'เพิ่มค่าใช้จ่ายใหม่'}
                                    </h3>
                                    <form onSubmit={expenseForm.handleSubmit(onAddExpense)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">วันที่ *</label>
                                            <input type="date" 
                                                {...expenseForm.register('date', { 
                                                    required: 'กรุณาระบุวันที่',
                                                    validate: (val) => new Date(val) <= new Date() || 'ห้ามระบุวันที่ในอนาคต'
                                                })}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500 ${expenseForm.formState.errors.date ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                                            {expenseForm.formState.errors.date && <p className="text-red-500 text-[10px] mt-1 font-medium">{expenseForm.formState.errors.date.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">หมวดหมู่ *</label>
                                            <select {...expenseForm.register('category', { required: true })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500">
                                                <option value="">-- เลือกหมวดหมู่ --</option>
                                                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">คำอธิบาย *</label>
                                            <input {...expenseForm.register('description', { required: true })}
                                                placeholder="รายละเอียดค่าใช้จ่าย"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">จำนวนเงิน (บาท) *</label>
                                            <input type="number" step="0.01" 
                                                {...expenseForm.register('amount', { 
                                                    required: 'กรุณาระบุจำนวนเงิน', 
                                                    min: { value: 0.01, message: 'จำนวนเงินต้องมากกว่า 0' } 
                                                })}
                                                placeholder="0.00"
                                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500 ${expenseForm.formState.errors.amount ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                                            {expenseForm.formState.errors.amount && <p className="text-red-500 text-[10px] mt-1 font-medium">{expenseForm.formState.errors.amount.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">หมายเหตุ</label>
                                            <input {...expenseForm.register('note')}
                                                placeholder="หมายเหตุเพิ่มเติม"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500" />
                                        </div>
                                        <div className="sm:col-span-2 flex justify-end space-x-3 pt-1">
                                            <button type="button" onClick={() => { setShowExpenseForm(false); setEditingRecord(null); expenseForm.reset({ date: format(new Date(), 'yyyy-MM-dd') }); }}
                                                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">ยกเลิก</button>
                                            <button type="submit" disabled={submitting}
                                                className="px-4 py-2 text-sm text-white bg-rubber-600 rounded-lg hover:bg-rubber-700 disabled:opacity-50">บันทึก</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Table */}
                            <div className="overflow-x-auto rounded-xl border border-gray-100">
                                <table className="min-w-full divide-y divide-gray-100 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">วันที่</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">หมวดหมู่</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">คำอธิบาย</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">จำนวนเงิน (฿)</th>
                                            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                        {loading ? (
                                            <tr><td colSpan="5" className="px-5 py-10 text-center text-gray-400">กำลังโหลด...</td></tr>
                                        ) : filteredExpenses.length === 0 ? (
                                            <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-400">
                                                <Receipt size={36} className="mx-auto mb-2 opacity-20" />
                                                ยังไม่มีรายการค่าใช้จ่าย
                                            </td></tr>
                                        ) : filteredExpenses.map((r, i) => (
                                            <tr key={r.id || i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                                                    <div className="flex items-center space-x-1"><Calendar size={13} className="text-gray-400" /><span>{r.date}</span></div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
                                                        <Tag size={10} className="mr-1" />{r.category}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-gray-900">{r.description}<br />{r.note && <span className="text-xs text-gray-400">{r.note}</span>}</td>
                                                <td className="px-5 py-4 text-right font-bold text-red-600">{Number(r.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        {user?.role === 'owner' && (
                                                            <>
                                                                <button onClick={() => handleEdit('Expenses', r)}
                                                                    className="text-gray-300 hover:text-blue-500 transition-colors p-1"><Edit2 size={17} /></button>
                                                                <button onClick={() => handleDelete('Expenses', r.id)}
                                                                    className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={17} /></button>
                                                            </>
                                                        )}
                                                        {user?.role !== 'owner' && <span className="text-gray-300 text-xs">อ่านอย่างเดียว</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {filteredExpenses.length > 0 && (
                                        <tfoot className="bg-red-50/60">
                                            <tr>
                                                <td colSpan="3" className="px-5 py-3 text-right text-sm font-bold text-red-700">รวมทั้งหมด</td>
                                                <td className="px-5 py-3 text-right text-sm font-black text-red-700">฿{totalExpenses.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ─── WAGES TAB ─── */}
                    {activeTab === 'wages' && (
                        <div className="space-y-5">
                            <div className="flex flex-wrap gap-3 items-center justify-between">
                                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-64">
                                    <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="ค้นหาชื่อพนักงาน..."
                                        className="bg-transparent text-sm w-full focus:outline-none" />
                                </div>
                                <button onClick={() => setShowWageForm(!showWageForm)}
                                    className="flex items-center space-x-2 px-4 py-2 bg-rubber-600 text-white rounded-lg hover:bg-rubber-700 text-sm font-medium">
                                    <PlusCircle size={16} /><span>บันทึกค่าจ้าง</span>
                                </button>
                            </div>

                            {/* Summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-center space-x-3">
                                    <Wallet className="text-blue-400" size={28} />
                                    <div>
                                        <p className="text-xs text-blue-500 font-medium">รวมค่าจ้าง</p>
                                        <p className="text-xl font-black text-blue-700">฿{totalWages.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center space-x-3">
                                    <Users className="text-gray-400" size={28} />
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">จำนวนรายการ</p>
                                        <p className="text-xl font-black text-gray-700">{filteredWages.length} รายการ</p>
                                    </div>
                                </div>
                            </div>

                            {/* Add/Edit Form */}
                            {showWageForm && (
                                <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-6">
                                    <h3 className="text-sm font-bold text-blue-800 mb-4">
                                        {editingRecord ? 'แก้ไขรายการค่าจ้าง' : 'บันทึกค่าจ้างพนักงาน'}
                                    </h3>
                                    <form onSubmit={wageForm.handleSubmit(onAddWage)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">วันที่ *</label>
                                            <input type="date" 
                                                {...wageForm.register('date', { 
                                                    required: 'กรุณาระบุวันที่',
                                                    validate: (val) => new Date(val) <= new Date() || 'ห้ามระบุวันที่ในอนาคต'
                                                })}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${wageForm.formState.errors.date ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                                            {wageForm.formState.errors.date && <p className="text-red-500 text-[10px] mt-1 font-medium">{wageForm.formState.errors.date.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">พนักงาน *</label>
                                            <select {...wageForm.register('staffId', { required: true })}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                                                <option value="">-- เลือกพนักงาน --</option>
                                                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                ค่าจ้าง/วัน (฿) {selectedStaffSalary && <span className="text-blue-500 font-normal">อัตโนมัติ: {Number(selectedStaffSalary).toLocaleString()}</span>}
                                            </label>
                                            <input type="number" step="0.01" {...wageForm.register('dailyWage')}
                                                placeholder={selectedStaffSalary || '0.00'}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">จำนวนวันทำงาน *</label>
                                            <input type="number" step="0.5" 
                                                {...wageForm.register('workDays', { 
                                                    required: 'กรุณาระบุจำนวนวัน', 
                                                    min: { value: 0.1, message: 'ขั้นต่ำ 0.1 วัน' } 
                                                })}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${wageForm.formState.errors.workDays ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                                            {wageForm.formState.errors.workDays && <p className="text-red-500 text-[10px] mt-1 font-medium">{wageForm.formState.errors.workDays.message}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                โบนัส (฿)
                                                {loadingBonus && <span className="text-gray-400 font-normal ml-1">กำลังคำนวณ...</span>}
                                                {!loadingBonus && suggestedBonus !== null && (
                                                    <span className="text-green-600 font-normal ml-1">
                                                        → น้ำยางวันนี้: {suggestedBonus.weight.toLocaleString()} กก. = โบนัส {suggestedBonus.bonus} บ.
                                                    </span>
                                                )}
                                            </label>
                                            <input type="number" step="1" 
                                                {...wageForm.register('bonus', { 
                                                    min: { value: 0, message: 'โบนัสห้ามติดลบ' } 
                                                })}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${wageForm.formState.errors.bonus ? 'border-red-500 bg-red-50' : 'border-gray-200'}`} />
                                            {wageForm.formState.errors.bonus && <p className="text-red-500 text-[10px] mt-1 font-medium">{wageForm.formState.errors.bonus.message}</p>}
                                            <p className="text-xs text-gray-400 mt-1"><span className="font-medium">สูตร:</span> ทุก 1,000 กก. ได้โบนัส +10 บ. (แก้ไขได้)</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">หมายเหตุ</label>
                                            <input {...wageForm.register('note')} placeholder="หมายเหตุ"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                                        </div>
                                        <div className="sm:col-span-2 flex justify-end space-x-3 pt-1">
                                            <button type="button" onClick={() => { setShowWageForm(false); setEditingRecord(null); wageForm.reset({ date: format(new Date(), 'yyyy-MM-dd'), workDays: 1 }); }}
                                                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">ยกเลิก</button>
                                            <button type="submit" disabled={submitting}
                                                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">บันทึก</button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Wages Table */}
                            <div className="overflow-x-auto rounded-xl border border-gray-100">
                                <table className="min-w-full divide-y divide-gray-100 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">วันที่</th>
                                            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">พนักงาน</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">วันทำงาน</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">ค่าจ้าง/วัน</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">โบนัส</th>
                                            <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">รวม (฿)</th>
                                            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                        {loading ? (
                                            <tr><td colSpan="7" className="px-5 py-10 text-center text-gray-400">กำลังโหลด...</td></tr>
                                        ) : filteredWages.length === 0 ? (
                                            <tr><td colSpan="7" className="px-5 py-12 text-center text-gray-400">
                                                <Users size={36} className="mx-auto mb-2 opacity-20" />
                                                ยังไม่มีรายการค่าจ้าง
                                            </td></tr>
                                        ) : filteredWages.map((r, i) => (
                                            <tr key={r.id || i} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-600">{r.date}</td>
                                                <td className="px-5 py-4 font-semibold text-gray-900">{r.staffName}</td>
                                                <td className="px-5 py-4 text-right text-gray-700">{r.workDays} วัน</td>
                                                <td className="px-5 py-4 text-right text-gray-600">{Number(r.dailyWage || 0).toLocaleString()}</td>
                                                <td className="px-5 py-4 text-right text-green-600">{Number(r.bonus || 0).toLocaleString()}</td>
                                                <td className="px-5 py-4 text-right font-black text-blue-700">{Number(r.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        {user?.role === 'owner' && (
                                                            <>
                                                                <button onClick={() => handleEdit('Wages', r)}
                                                                    className="text-gray-300 hover:text-blue-500 transition-colors p-1"><Edit2 size={17} /></button>
                                                                <button onClick={() => handleDelete('Wages', r.id)}
                                                                    className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={17} /></button>
                                                            </>
                                                        )}
                                                        {user?.role !== 'owner' && <span className="text-gray-300 text-xs">อ่านอย่างเดียว</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {filteredWages.length > 0 && (
                                        <tfoot className="bg-blue-50/60">
                                            <tr>
                                                <td colSpan="5" className="px-5 py-3 text-right text-sm font-bold text-blue-700">รวมทั้งหมด</td>
                                                <td className="px-5 py-3 text-right text-sm font-black text-blue-700">฿{totalWages.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Expenses;
