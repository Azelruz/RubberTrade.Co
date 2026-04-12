import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { 
    Truck, Upload, Search, Trash2, FileText, FileImage, 
    Calendar, User, PlusCircle, Printer, X, Download, ImageIcon, Save, List, Edit2, Coins, ChevronDown, Droplets, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { addSellRecord, fetchSellRecords, deleteRecord, updateRecord, fetchFarmers, fetchStaff, fetchFactories, fetchTrucks, isCached, getSettings, saveReceiptImageToDrive, deleteReceiptFileToDrive, sendLineReceipt, fetchBuyRecords, fetchChemicalUsage } from '../services/apiService';
import { truncateOneDecimal, truncateTwoDecimals } from '../utils/calculations';
import { useAuth } from '../context/AuthContext';

const Sell = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [factories, setFactories] = useState([]);
    const [trucks, setTrucks] = useState([]);
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [allBuys, setAllBuys] = useState([]);
    const [chemicalUsage, setChemicalUsage] = useState([]);
    
    // Selection state
    const [showFactoryResults, setShowFactoryResults] = useState(false);
    const [factorySearch, setFactorySearch] = useState('');
    const [showTruckResults, setShowTruckResults] = useState(false);
    const [truckSearch, setTruckSearch] = useState('');
    const [showStaffResults, setShowStaffResults] = useState(false);
    const [staffSearch, setStaffSearch] = useState('');

    const [printingRecord, setPrintingRecord] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [settings, setLocalSettings] = useState({ factoryName: 'ร้านรับซื้อน้ำยางพารา', address: '', phone: '' });
    const [lossSign, setLossSign] = useState('minus'); // 'plus' or 'minus'
    const [isAutoAdjust, setIsAutoAdjust] = useState(true);
    const isDemo = false;

    // Form setup
    const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            buyerName: '',
            factoryId: '',
            employeeId: '',
            truckId: '',
            truckInfo: '',
            weight: '',
            lossWeight: '',
            drc: '',
            pricePerKg: '',
            note: '',
            receiptUrl: ''
        }
    });

    const watchWeight = watch('weight');
    const watchDrc = watch('drc');
    const watchPricePerKg = watch('pricePerKg');
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // References for printing
    const printRef = useRef(null);

    useEffect(() => {
        loadData();
        fetchSettings();

        const handleClickOutside = (event) => {
            if (!event.target.closest('.relative')) {
                setShowFactoryResults(false);
                setShowTruckResults(false);
                setShowStaffResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await getSettings();
            if (res.status === 'success' && res.data) {
                setLocalSettings(prev => ({ ...prev, ...res.data }));
            }
        } catch (e) {
            console.error('Settings error:', e);
        }
    };

     const loadData = async () => {
         setIsLoading(true);
         try {
             const [recs, facs, trks, stf, buys, chems] = await Promise.all([
                 fetchSellRecords(),
                 fetchFactories(),
                 fetchTrucks(),
                 fetchStaff(),
                 fetchBuyRecords(),
                 fetchChemicalUsage()
             ]);
             setRecords(recs || []);
             setFactories(facs || []);
             setTrucks(trks || []);
             setStaff(stf || []);
             setAllBuys(buys || []);
             setChemicalUsage(chems || []);
         } catch (error) {
             toast.error('โหลดข้อมูลล้มเหลว');
             console.error(error);
         } finally {
             setIsLoading(false);
         }
     };

    const onSubmit = async (data) => {
        setSubmitting(true);
        const toastId = toast.loading(editingRecord ? 'กำลังอัปเดต...' : 'กำลังบันทึก...');
        
        try {
            let receiptUrl = data.receiptUrl || '';

            // Handle file upload if a new file was selected
            if (selectedFile) {
                toast.loading('กำลังอัปโหลดรูปภาพ...', { id: toastId });
                const reader = new FileReader();
                const base64Promise = new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(selectedFile);
                });
                const base64 = await base64Promise;
                const filename = `Sell_Receipt_${Date.now()}.png`;
                const uploadRes = await saveReceiptImageToDrive(base64, filename);
                if (uploadRes.status === 'success') {
                    receiptUrl = uploadRes.url;
                }
            }

            const weight = Number(data.weight);
            const rawLoss = Number(data.lossWeight || 0);
            const lossWeight = lossSign === 'plus' ? -rawLoss : rawLoss;
            const drc = Number(data.drc);
            const price = Number(data.pricePerKg);
            const dryRubber = truncateTwoDecimals((weight * drc) / 100);
            const total = truncateTwoDecimals(dryRubber * price);

            const payload = {
                ...data,
                weight,
                lossWeight,
                drc,
                pricePerKg: price,
                total,
                receiptUrl,
                profitShareAmount: 0 
            };

            let res;
            if (editingRecord) {
                // Strip metadata to avoid backend conflicts
                const { id, created_at, timestamp, ...updatePayload } = payload;
                res = await updateRecord('sells', editingRecord.id, updatePayload);
            } else {
                res = await addSellRecord(payload);
            }

            if (res.status === 'success') {
                toast.success(editingRecord ? 'อัปเดตสำเร็จ' : 'บันทึกสำเร็จ', { id: toastId });
                
                loadData();
                reset({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    lossWeight: '',
                    note: ''
                });
                setFactorySearch('');
                setTruckSearch('');
                setStaffSearch('');
                setSelectedFile(null);
                setPreviewUrl(null);
                setEditingRecord(null);
                setLossSign('minus');
                setIsAutoAdjust(true);
            } else {
                toast.error(res.message, { id: toastId });
            }
        } catch (error) {
            toast.error('ข้อผิดพลาด: ' + error.message, { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setIsAutoAdjust(false);
        
        const lWeight = Number(record.lossWeight || 0);
        const lSign = lWeight < 0 ? 'plus' : 'minus';
        const absLoss = Math.abs(lWeight);

        reset({
            date: record.date,
            buyerName: record.buyerName,
            factoryId: record.factoryId,
            employeeId: record.employeeId,
            truckId: record.truckId,
            truckInfo: record.truckInfo,
            weight: record.weight,
            drc: record.drc,
            lossWeight: absLoss === 0 ? '' : absLoss,
            pricePerKg: record.pricePerKg,
            note: record.note,
            receiptUrl: record.receiptUrl || ''
        });

        setLossSign(lSign);
        setFactorySearch(record.buyerName || '');
        setTruckSearch(record.truckInfo || '');
        setPreviewUrl(record.receiptUrl || null);
        const currentStaff = staff.find(s => s.id === record.employeeId);
        setStaffSearch(currentStaff ? currentStaff.name : '');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id) => {
        setConfirmDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!confirmDeleteId) return;
        
        const id = confirmDeleteId;
        setConfirmDeleteId(null);
        const toastId = toast.loading('กำลังลบรายการ...');
        
        try {
            if (isDemo) {
                setRecords(prev => prev.filter(r => String(r.id) !== String(id)));
                toast.success('ลบสำเร็จ (Demo)', { id: toastId });
                return;
            }

            const targetRecord = records.find(r => String(r.id) === String(id));

            const res = await deleteRecord('sells', id);
            if (res.status === 'success') {
                if (targetRecord && targetRecord.receiptUrl) {
                    deleteReceiptFileToDrive(targetRecord.receiptUrl)
                        .then(r => console.log('[Delete Drive File]', r))
                        .catch(e => console.warn('[Delete Drive File Error]', e));
                }

                toast.success('ลบสำเร็จ', { id: toastId });
                setRecords(prev => prev.filter(r => String(r.id) !== String(id)));
            } else {
                toast.error(res.message || 'ลบล้มเหลว', { id: toastId });
            }
        } catch (error) {
            toast.error('ลบล้มเหลว: ' + error.message, { id: toastId });
        }
    };

    const handlePrint = (record) => {
        const toastId = toast.loading('กำลังเตรียมใบส่งสินค้า...');
        setPrintingRecord(record);
        
        // Use a slightly longer timeout to ensure React rendering is completed
        setTimeout(() => {
            toast.dismiss(toastId);
            window.print();
            setPrintingRecord(null);
        }, 1000);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        toast.success('เลือกรูปภาพสำเร็จ');
    };

    const calculateDryRubber = () => {
        const w = truncateOneDecimal(Number(watchWeight) || 0);
        const d = truncateTwoDecimals(Number(watchDrc) || 0);
        return truncateTwoDecimals((w * d) / 100);
    };

    const calculateTotal = () => {
        const dryRubber = calculateDryRubber();
        const p = truncateTwoDecimals(Number(watchPricePerKg) || 0);
        return truncateTwoDecimals(dryRubber * p);
    };

    const filteredRecords = records.filter(r => {
        const matchesSearch = (r.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (r.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = (r.date || '').split('T')[0] === selectedDate;
        return matchesSearch && matchesDate;
    });

    const stockMetrics = React.useMemo(() => {
        const buyWeight = allBuys.reduce((sum, item) => {
            const net = Number(item.netWeight);
            if (!isNaN(net) && net > 0) return sum + net;
            return sum + (Number(item.weight || 0) - Number(item.bucketWeight || 0));
        }, 0);

        const ammoniaWeight = chemicalUsage.filter(c => c.chemicalId === 'ammonia').reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const waterWeight = chemicalUsage.filter(c => c.chemicalId === 'water').reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const whiteMedWeight = chemicalUsage.filter(c => c.chemicalId === 'whiteMedicine').reduce((sum, c) => sum + Number(c.amount || 0), 0);

        const sellWeight = records.reduce((sum, r) => sum + Number(r.weight || 0), 0);
        const sellLoss = records.reduce((sum, r) => sum + Number(r.lossWeight || 0), 0);

        const currentStock = truncateOneDecimal(buyWeight + ammoniaWeight + waterWeight + whiteMedWeight - sellWeight - sellLoss);

        const totalWeightedDrc = allBuys.reduce((sum, b) => {
            const net = Number(b.netWeight);
            const w = (!isNaN(net) && net > 0) ? net : (Number(b.weight || 0) - Number(b.bucketWeight || 0));
            return sum + (w * (Number(b.drc || 0)));
        }, 0);
        const avgDrc = buyWeight > 0 ? truncateOneDecimal(totalWeightedDrc / buyWeight) : 0;

        return { currentStock, avgDrc };
    }, [allBuys, records, chemicalUsage]);

    // Auto Adjust Logic
    useEffect(() => {
        if (isAutoAdjust && watchWeight !== undefined) {
            const currentStock = stockMetrics.currentStock;
            const weightValue = Number(watchWeight) || 0;
            const diff = truncateOneDecimal(currentStock - weightValue);
            
            if (diff > 0) {
                setLossSign('minus');
                setValue('lossWeight', diff);
            } else if (diff < 0) {
                setLossSign('plus');
                setValue('lossWeight', Math.abs(diff));
            } else {
                setValue('lossWeight', 0);
            }
        }
    }, [isAutoAdjust, watchWeight, stockMetrics.currentStock, setValue]);

    return (
        <div className="space-y-6">
            {/* Stock Balance & Avg DRC Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm flex items-center group hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-700 z-0"></div>
                    <div className="p-4 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-200 z-10">
                        <Droplets size={24} />
                    </div>
                    <div className="ml-5 z-10">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">สต๊อกน้ำยางคงเหลือ</p>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                            {Number(stockMetrics.currentStock).toLocaleString()} <span className="text-sm font-bold text-gray-400">กก.</span>
                        </h3>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-cyan-100 shadow-sm flex items-center group hover:shadow-md transition-all relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-50 rounded-full group-hover:scale-150 transition-transform duration-700 z-0"></div>
                    <div className="p-4 rounded-xl bg-cyan-500 text-white shadow-lg shadow-cyan-200 z-10">
                        <Activity size={24} />
                    </div>
                    <div className="ml-5 z-10">
                        <p className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.2em] mb-1">เฉลี่ย % DRC ทั้งหมด</p>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                            {Number(stockMetrics.avgDrc).toLocaleString()}<span className="text-sm font-bold text-gray-400">%</span>
                        </h3>
                    </div>
                </div>
            </div>

            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">บันทึกการขายน้ำยาง</h1>
                <p className="text-gray-500 mb-6">บันทึกข้อมูลการขายยางให้โรงงาน/ปลายทาง และแนบหลักฐาน</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Add Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <Truck className="mr-2 text-orange-500" size={20} />
                                {editingRecord ? 'แก้ไขรายการขาย' : 'เพิ่มรายการขาย'}
                            </h2>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
                                    <input type="date" {...register('date', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">โรงงาน / ผู้ซื้อ</label>
                                     <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={factorySearch}
                                            onChange={(e) => {
                                                setFactorySearch(e.target.value);
                                                setShowFactoryResults(true);
                                                setValue('buyerName', e.target.value);
                                            }}
                                            onFocus={() => setShowFactoryResults(true)}
                                            onClick={() => setShowFactoryResults(true)}
                                            placeholder="ค้นหาชื่อโรงงาน / ผู้ซื้อ..." 
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 cursor-pointer" 
                                        />
                                        {showFactoryResults && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                                {factories.filter(f => 
                                                    !factorySearch || f.name?.toLowerCase().includes(factorySearch.toLowerCase())
                                                ).length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm">ไม่พบข้อมูลโรงงาน</div>
                                                ) : (
                                                    factories.filter(f => 
                                                        !factorySearch || f.name?.toLowerCase().includes(factorySearch.toLowerCase())
                                                    ).map(f => (
                                                        <div 
                                                            key={f.id}
                                                            className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 group"
                                                            onClick={() => {
                                                                setValue('buyerName', f.name);
                                                                setValue('factoryId', f.id);
                                                                setFactorySearch(f.name);
                                                                setShowFactoryResults(false);
                                                            }}
                                                        >
                                                            <div className="font-black text-gray-900 group-hover:text-orange-700">{f.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">ID: {f.code || '-'}</div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <input type="hidden" {...register('buyerName', { required: true })} />
                                    <input type="hidden" {...register('factoryId')} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">รถขนส่ง</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={truckSearch}
                                            onChange={(e) => {
                                                setTruckSearch(e.target.value);
                                                setShowTruckResults(true);
                                                setValue('truckInfo', e.target.value);
                                            }}
                                            onFocus={() => setShowTruckResults(true)}
                                            onClick={() => setShowTruckResults(true)}
                                            placeholder="ค้นหาทะเบียนรถ..." 
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 cursor-pointer" 
                                        />
                                        {showTruckResults && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                                {trucks.filter(t => 
                                                    !truckSearch || 
                                                    t.licensePlate?.toLowerCase().includes(truckSearch.toLowerCase()) || 
                                                    t.brand?.toLowerCase().includes(truckSearch.toLowerCase())
                                                ).length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm">ไม่พบข้อมูลรถ</div>
                                                ) : (
                                                    trucks.filter(t => 
                                                        !truckSearch ||
                                                        t.licensePlate?.toLowerCase().includes(truckSearch.toLowerCase()) || 
                                                        t.brand?.toLowerCase().includes(truckSearch.toLowerCase())
                                                    ).map(t => (
                                                        <div 
                                                            key={t.id}
                                                            className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 group"
                                                            onClick={() => {
                                                                setValue('truckInfo', t.licensePlate);
                                                                setValue('truckId', t.id);
                                                                setTruckSearch(t.licensePlate);
                                                                setShowTruckResults(false);
                                                            }}
                                                        >
                                                            <div className="font-black text-gray-900 group-hover:text-orange-700">{t.licensePlate}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{t.brand} {t.model}</div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <input type="hidden" {...register('truckInfo')} />
                                    <input type="hidden" {...register('truckId')} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">พนักงานผู้รับผิดชอบ</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={staffSearch}
                                            onChange={(e) => {
                                                setStaffSearch(e.target.value);
                                                setShowStaffResults(true);
                                            }}
                                            onFocus={() => setShowStaffResults(true)}
                                            onClick={() => setShowStaffResults(true)}
                                            placeholder="ค้นหาชื่อพนักงาน..." 
                                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 cursor-pointer" 
                                        />
                                        {showStaffResults && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                                {staff.filter(s => 
                                                    !staffSearch || s.name?.toLowerCase().includes(staffSearch.toLowerCase())
                                                ).length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm">ไม่พบข้อมูลพนักงาน</div>
                                                ) : (
                                                    staff.filter(s => 
                                                        !staffSearch || s.name?.toLowerCase().includes(staffSearch.toLowerCase())
                                                    ).map(s => (
                                                        <div 
                                                            key={s.id}
                                                            className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0 group"
                                                            onClick={() => {
                                                                setValue('employeeId', s.id);
                                                                setStaffSearch(s.name);
                                                                setShowStaffResults(false);
                                                            }}
                                                        >
                                                            <div className="font-black text-gray-900 group-hover:text-orange-700">{s.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Phone: {s.phone || '-'}</div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <input type="hidden" {...register('employeeId')} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">น้ำหนักรวมขาย (กก.)</label>
                                        <input type="number" step="0.1" {...register('weight', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">DRC (%)</label>
                                        <input type="number" step="0.01" {...register('drc', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                                    </div>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-gray-700">ปรับปรุงสต๊อก (Stock Adjustment)</label>
                                        <button 
                                            type="button"
                                            onClick={() => setIsAutoAdjust(!isAutoAdjust)}
                                            className={`px-2 py-1 rounded text-[10px] font-black transition-all flex items-center gap-1 ${isAutoAdjust ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                                        >
                                            {isAutoAdjust ? 'AUTO ON' : 'AUTO OFF'}
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 mb-2">
                                        <button 
                                            type="button"
                                            onClick={() => { setLossSign('plus'); setIsAutoAdjust(false); }}
                                            className={`flex-1 py-1.5 rounded-md text-[11px] font-black transition-all ${lossSign === 'plus' ? 'bg-green-600 text-white shadow-sm ring-2 ring-green-100' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            + เพิ่มสต๊อก
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setLossSign('minus'); setIsAutoAdjust(false); }}
                                            className={`flex-1 py-1.5 rounded-md text-[11px] font-black transition-all ${lossSign === 'minus' ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-100' : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            - ลดสต๊อก (สูญเสีย)
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-bold ${lossSign === 'plus' ? 'text-green-600' : 'text-red-600'}`}>
                                            {lossSign === 'plus' ? '+' : '-'}
                                        </div>
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            {...register('lossWeight')} 
                                            readOnly={isAutoAdjust}
                                            placeholder="กรอกน้ำหนัก (กก.)"
                                            className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-opacity-50 font-bold transition-colors ${
                                                isAutoAdjust ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' :
                                                lossSign === 'plus' 
                                                    ? 'border-green-200 focus:ring-green-500 focus:border-green-500 bg-white text-green-700' 
                                                    : 'border-red-200 focus:ring-red-500 focus:border-red-500 bg-white text-red-700'
                                            }`} 
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-2">
                                        {isAutoAdjust ? `* คำนวณอัตโนมัติเพื่อให้สต๊อกเหลือ 0 กก.` : `* ใช้สำหรับปรับยอดคงเหลือให้ตรงกับหน้างานจริง`}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ราคาที่ขายได้ (บาท/กก. ยางแห้ง)</label>
                                    <input type="number" step="0.01" {...register('pricePerKg', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">หลักฐานการขาย (ใบชั่ง/สลิป)</label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors relative overflow-hidden group">
                                        {previewUrl ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 group-hover:bg-black/20 transition-all cursor-pointer">
                                                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover opacity-80" />
                                                <div className="absolute bg-white/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Edit2 size={24} className="text-orange-600" />
                                                </div>
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} accept="image/*" />
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); setSelectedFile(null); setValue('receiptUrl', ''); }}
                                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 z-10"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-1 text-center">
                                                <Upload className="mx-auto h-12 w-12 text-gray-400 group-hover:text-orange-400 transition-colors" />
                                                <div className="flex text-sm text-gray-600 justify-center">
                                                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500">
                                                        <span>อัปโหลดไฟล์</span>
                                                        <input type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
                                                    </label>
                                                </div>
                                                <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mt-6 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-orange-800">น้ำยางแห้งรวม:</span>
                                        <span className="font-bold text-orange-900">{calculateDryRubber().toLocaleString()} กก.</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                                        <span className="text-sm font-bold text-orange-800">ยอดเงินรวม:</span>
                                        <span className="text-xl font-black text-orange-900">฿{calculateTotal().toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex space-x-3 mt-6">
                                    {editingRecord && (
                                        <button 
                                            type="button"
                                            onClick={() => { 
                                                setEditingRecord(null); 
                                                reset(); 
                                                setFactorySearch('');
                                                setTruckSearch('');
                                                setStaffSearch('');
                                            }}
                                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                        >
                                            ยกเลิก
                                        </button>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="flex-[2] bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-700 transition-colors shadow-md disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'กำลังบันทึก...' : (editingRecord ? 'อัปเดตรายการ' : 'บันทึกรายการขาย')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Records Table */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    <Calendar className="text-gray-400 hidden sm:block" size={20} />
                                    <input 
                                        type="date" 
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full sm:w-auto px-3 py-1 border border-gray-300 rounded-lg text-sm shadow-sm" 
                                    />
                                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                                        <Search size={16} className="text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="ค้นหา..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="ml-2 outline-none text-sm w-32 sm:w-40" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-0 border-b border-gray-100 bg-white text-[11px] sm:text-xs text-gray-500 uppercase font-bold tracking-wider">
                                <div className="p-3 text-center border-r border-gray-50">รายการ</div>
                                <div className="p-3 text-center border-r border-gray-50">ยางแห้ง</div>
                                <div className="p-3 text-center border-r border-gray-50">ยอดเงิน</div>
                                <div className="p-3 text-center">จัดการ</div>
                            </div>

                            <div className="overflow-x-auto">
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-64 text-orange-500"><PlusCircle className="animate-spin mr-2" /> กำลังโหลด...</div>
                                ) : filteredRecords.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 font-medium bg-gray-50/30">
                                        <FileText className="mx-auto mb-2 opacity-20" size={48} />
                                        ไม่พบข้อมูลในวันที่เลือก
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredRecords.map((record) => (
                                                <tr key={record.id} className="hover:bg-gray-50 transition-colors text-sm">
                                                    <td className="p-3">
                                                        <div className="font-bold text-gray-900">{record.buyerName}</div>
                                                        <div className="text-xs text-gray-500">{record.truckInfo}</div>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="font-medium">{(truncateTwoDecimals(record.weight * record.drc / 100)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} กก.</div>
                                                        <div className="text-[10px] text-gray-400">{record.weight} กก. @ {record.drc.toFixed(2)}%</div>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="font-black text-orange-600">฿{record.total?.toLocaleString()}</div>
                                                        <div className="text-[10px] text-gray-400">@{record.pricePerKg}</div>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex justify-center items-center space-x-1">
                                                            {record.receiptUrl && (
                                                                <a href={record.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="ดูหลักฐาน">
                                                                    <FileImage size={16} />
                                                                </a>
                                                            )}
                                                            <button onClick={() => handlePrint(record)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="พิมพ์ใบส่งสินค้า"><Printer size={16} /></button>
                                                            <button onClick={() => handleEdit(record)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg" title="แก้ไข"><Edit2 size={16} /></button>
                                                            {user?.role === 'owner' && (
                                                                <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="ลบ"><Trash2 size={16} /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print View - Optimized for React Rendering */}
            {printingRecord && (
                <div className="fixed inset-0 z-[-1] overflow-hidden opacity-0 pointer-events-none print:opacity-100 print:z-[9999] print:bg-white">
                    <style>
                        {`
                        @media print {
                            @page {
                                size: A4;
                                margin: 20mm;
                            }
                            body {
                                background: white !important;
                            }
                            body * {
                                visibility: hidden;
                            }
                            .print-container, .print-container * {
                                visibility: visible;
                            }
                            .print-container {
                                position: fixed;
                                left: 0;
                                top: 0;
                                width: 100%;
                                background-color: white !important;
                            }
                        }
                        `}
                    </style>
                    <div ref={printRef} className="print-container p-12 bg-white text-black font-sans border border-black">
                        {/* Header Box */}
                        <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
                            <div className="flex items-start space-x-6">
                                {settings.logoUrl && (
                                    <img src={settings.logoUrl} alt="Logo" className="w-24 h-24 object-contain" />
                                ) }
                                <div className="flex-1">
                                    <h1 className="text-4xl font-black mb-2 text-black">{settings.factoryName}</h1>
                                    <p className="text-sm font-bold text-black mb-1">{settings.address}</p>
                                    <p className="text-sm font-bold text-black">โทร: {settings.phone}</p>
                                </div>
                            </div>
                            <div className="text-right border-l-2 border-black pl-8 pt-2">
                                <h1 className="text-4xl font-black text-black tracking-tighter uppercase">ใบส่งสินค้า</h1>
                                <p className="text-sm font-black text-black uppercase tracking-widest">Delivery Note</p>
                            </div>
                        </div>
                        
                        {/* Info Section */}
                        <div className="grid grid-cols-2 gap-12 mb-10">
                            <div className="bg-white p-6 rounded-2xl border border-black">
                                <h3 className="text-xs font-black text-black uppercase tracking-widest mb-4">ส่งถึง (Buyer / Factory)</h3>
                                <p className="text-2xl font-black text-black mb-1">{printingRecord.buyerName}</p>
                                <p className="text-sm font-bold text-black">ทะเบียนรถ: {printingRecord.truckInfo || '-'}</p>
                            </div>
                            <div className="p-2">
                                <div className="space-y-3">
                                    <div className="flex justify-between border-b border-black pb-2">
                                        <span className="font-bold text-black italic">เลขที่ใบส่งสินค้า:</span>
                                        <span className="font-black text-black">{printingRecord.id?.toString().toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-black pb-2">
                                        <span className="font-bold text-black italic">วันที่ (Date):</span>
                                        <span className="font-black text-black">{format(new Date(printingRecord.date), 'dd/MM/yyyy', { locale: th })}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-black pb-2">
                                        <span className="font-bold text-black italic">เวลา (Time):</span>
                                        <span className="font-black text-black">{format(new Date(), 'HH:mm')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Product Table */}
                        <div className="mb-12">
                            <table className="w-full text-lg border-collapse">
                                <thead>
                                    <tr className="bg-black text-white text-sm">
                                        <th className="p-3 text-left border border-black">ลำดับ</th>
                                        <th className="p-3 text-left border border-black">รายการสินค้า (Description)</th>
                                        <th className="p-3 text-right border border-black">น้ำหนัก (Kg)</th>
                                        <th className="p-3 text-right border border-black">DRC (%)</th>
                                        <th className="p-3 text-right border border-black">ยางแห้ง (Kg)</th>
                                        <th className="p-3 text-right border border-black">ราคา/หน่วย</th>
                                        <th className="p-3 text-right border border-black">จำนวนเงิน (฿)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border border-black">
                                        <td className="p-4 border border-black text-center font-bold">1</td>
                                        <td className="p-4 border border-black">
                                            <div className="font-bold">น้ำยางสดคุณภาพชั้น 1</div>
                                            <div className="text-[10px] text-black italic">Field Latex (Premium)</div>
                                        </td>
                                        <td className="p-4 border border-black text-right font-bold">{Number(printingRecord.weight).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                        <td className="p-4 border border-black text-right font-bold">{Number(printingRecord.drc).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</td>
                                        <td className="p-4 border border-black text-right font-bold">
                                            {Number((printingRecord.weight * printingRecord.drc) / 100).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                        </td>
                                        <td className="p-4 border border-black text-right font-bold underline">
                                            {Number(printingRecord.pricePerKg).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                        </td>
                                        <td className="p-4 border border-black text-right font-black bg-white text-black">
                                            {Number(printingRecord.total).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                        </td>
                                    </tr>
                                    {/* Empty lines to make it look professional */}
                                    {[...Array(2)].map((_, i) => (
                                        <tr key={i} className="border border-gray-100 h-10">
                                            <td className="p-3 border border-gray-100"></td>
                                            <td className="p-3 border border-gray-100"></td>
                                            <td className="p-3 border border-gray-100"></td>
                                            <td className="p-3 border border-gray-100"></td>
                                            <td className="p-3 border border-gray-100"></td>
                                            <td className="p-3 border border-gray-100"></td>
                                            <td className="p-3 border border-gray-100 bg-gray-50/30"></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-white">
                                        <td colSpan="5" className="p-4 border border-black italic font-bold text-black">
                                            <div className="mb-1 uppercase tracking-tight text-[10px]">หมายเหตุ / Note:</div>
                                            <div className="text-black text-sm">{printingRecord.note || 'สินค้าส่งถูกต้องตามมาตรฐานที่กำหนด'}</div>
                                        </td>
                                        <td className="p-4 border border-black text-right font-black bg-white text-sm">รวมเงินทั้งสิ้น (Total)</td>
                                        <td className="p-4 border border-black text-right font-black text-2xl text-black bg-white">
                                            {Number(printingRecord.total).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-32 mt-24 mb-12">
                            <div className="text-center">
                                <div className="border-b-2 border-black w-full mb-3 h-12"></div>
                                <p className="text-lg font-black text-black">ผู้ส่งของ / พนักงานขับรถ</p>
                                <p className="text-xs font-bold text-black uppercase tracking-widest">(Authorized Sender / Driver)</p>
                            </div>
                            <div className="text-center">
                                <div className="border-b-2 border-black w-full mb-3 h-12"></div>
                                <p className="text-lg font-black text-black">ผู้รับของ (โรงงานปลายทาง)</p>
                                <p className="text-xs font-bold text-black uppercase tracking-widest">(Receiver / Factory Inspector)</p>
                            </div>
                        </div>

                        {/* System Footer */}
                        <div className="mt-32 pt-8 border-t border-gray-100 flex justify-between items-center opacity-30">
                            <div className="text-[10px] font-black uppercase tracking-tighter">
                                Rubber Latex Management System Professional Edition v2.0
                            </div>
                            <div className="text-[10px] font-bold">
                                พิมพ์เมื่อ: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
                        <div className="flex items-center mb-3 text-red-600">
                            <Trash2 className="mr-2" size={24} />
                            <h3 className="text-lg font-bold">ยืนยันการลบรายการ</h3>
                        </div>
                        <p className="text-gray-600 mb-6">คุณต้องการลบรายการขายนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors"
                            >
                                ยืนยันการลบ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sell;
