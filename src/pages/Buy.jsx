import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { PlusCircle, Printer, Download, Search, Trash2, FileText, Factory, User, Image as ImageIcon, Leaf, Coins, Wallet, Calculator, X, Eye, ChevronDown, Percent } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { addBuyRecord, fetchBuyRecords, deleteRecord, updateRecord, fetchFarmers, fetchDailyPrice, getSettings, fetchEmployees, saveReceiptImageToDrive, deleteReceiptFileToDrive, sendLineReceipt, fetchMemberTypes, isCached, addFarmer } from '../services/apiService';
import { truncateOneDecimal, calculateBuyTotal, calculateDrcBonus } from '../utils/calculations';
import { platform } from '../utils/platform';
import { printRecord } from '../utils/PrintService';

export const Buy = () => {
    const [records, setRecords] = useState([]);
    const { user } = useAuth();
    const [farmers, setFarmers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [printingReceipt, setPrintingReceipt] = useState(null);
    const [dailyPriceObj, setDailyPriceObj] = useState({ price: '50', date: '' });
    const [settings, setLocalSettings] = useState({ factoryName: 'ร้านรับซื้อน้ำยางพารา', address: '', phone: '' });
    const [drcBonuses, setDrcBonuses] = useState([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [viewingEslip, setViewingEslip] = useState(null);
    const [memberTypes, setMemberTypes] = useState([]);
    const activeTab = 'buy';
    const isDemo = false;
    const eslipRef = useRef(null);

    const [farmerSearch, setFarmerSearch] = useState('');
    const [showFarmerDropdown, setShowFarmerDropdown] = useState(false);
    const farmerDropdownRef = useRef(null);

    const [editingRecord, setEditingRecord] = useState(null);
    const printRef = useRef(null);

    const [showCalculator, setShowCalculator] = useState(false);
    const [calcItems, setCalcItems] = useState([]);
    const [calcInput, setCalcInput] = useState('');

    const { register, handleSubmit, watch, setValue, reset, formState: { errors, dirtyFields } } = useForm({
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            farmerId: '',
            farmerName: '',
            weight: '',
            bucketWeight: '',
            drc: '',
            pricePerKg: '',
            basePrice: '',
            bonusDrc: '',
            note: '',
            rubberType: 'latex'
        }
    });

    const watchRubberType = watch('rubberType');

    const watchWeight = watch('weight');
    const watchBucketWeight = watch('bucketWeight');
    const watchPricePerKg = watch('pricePerKg');
    const watchBasePrice = watch('basePrice');
    const watchBonusDrc = watch('bonusDrc');
    const watchDrc = watch('drc');
    const watchFarmerId = watch('farmerId');
    const watchFarmerName = watch('farmerName');
    const selectedFarmer = farmers.find(f => f.id === watchFarmerId);

    // Bonus Logic: Update PricePerKg when DRC, Farmer or Member Type changes
    useEffect(() => {
        const isCupLump = watchRubberType === 'cup_lump' || watchRubberType === 'ขี้ยาง';
        const base = isCupLump 
            ? (Number(settings.cupLumpPrice) || 0) 
            : (Number(dailyPriceObj.price) || 0);
        const drc = Number(watchDrc) || 0;
        const bonusDrc = calculateDrcBonus(drc, drcBonuses);
        
        // Calculate FSC Bonus
        const selectedFarmer = farmers.find(f => f.id === watchFarmerId);
        const fscBonus = selectedFarmer?.fscId ? (Number(settings.fsc_bonus) || 1) : 0;

        // Calculate Member Type Bonus
        let memberBonus = 0;
        if (selectedFarmer?.memberTypeId) {
            const mType = memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId);
            if (mType) memberBonus = Number(mType.bonus) || 0;
        }

        if (!dirtyFields.basePrice) setValue('basePrice', base.toString());
        if (!dirtyFields.bonusDrc) setValue('bonusDrc', isCupLump ? '0' : bonusDrc.toString());
        // Price per kg displayed to user (base + drc_bonus + fsc_bonus + memberBonus)
        setValue('pricePerKg', (base + (isCupLump ? 0 : bonusDrc) + fscBonus + memberBonus).toString());
    }, [watchDrc, watchFarmerId, watchRubberType, farmers, memberTypes, dailyPriceObj.price, settings.cupLumpPrice, setValue, drcBonuses]);

    // Load data
    useEffect(() => {
        loadData();
        loadLocalSettings();

        // Click outside to close dropdown
        const handleClickOutside = (event) => {
            if (farmerDropdownRef.current && !farmerDropdownRef.current.contains(event.target)) {
                setShowFarmerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        const handleRefresh = () => {
            loadData();
        };
        window.addEventListener('dashboard-refresh', handleRefresh);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('dashboard-refresh', handleRefresh);
        };
    }, []);

    const loadLocalSettings = async () => {
        try {
            const res = await getSettings();
            if (res.status === 'success' && res.data) {
                setLocalSettings(prev => ({ ...prev, ...res.data }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const loadData = async () => {
        if (!isCached('buys', 'farmers')) setLoading(true);
        try {
            if (isDemo) {
                setRecords([
                    { id: '1', date: new Date().toISOString(), farmerName: 'สมชาย รักดี', weight: 150, drc: 32, pricePerKg: 35, total: 5250, timestamp: new Date().toISOString() },
                    { id: '2', date: new Date().toISOString(), farmerName: 'สมปอง ใจสู้', weight: 80, drc: 35, pricePerKg: 38, total: 3040, timestamp: new Date().toISOString() }
                ]);
                setFarmers([
                    { id: 'f1', name: 'สมชาย รักดี' },
                    { id: 'f2', name: 'สมปอง ใจสู้' }
                ]);
                setDailyPriceObj({ price: '50', date: new Date().toISOString().split('T')[0] });
                setEmployees([{ id: 'e1', farmerId: 'f1', name: 'ลูกจ้างชาย', profitSharePct: 40 }]);
                const demoDrc = localStorage.getItem('demo_drc_bonuses');
                if (demoDrc) {
                    try { setDrcBonuses(JSON.parse(demoDrc)); } catch (e) { }
                }
                setValue('pricePerKg', '50');
                return;
            }
            const [buyData, farmersData, priceData, settingsRes, employeesData, mtData] = await Promise.all([
                fetchBuyRecords(),
                fetchFarmers(),
                fetchDailyPrice(),
                getSettings(),
                fetchEmployees(),
                fetchMemberTypes()
            ]);
            setRecords(Array.isArray(buyData) ? buyData : []);
            setFarmers(Array.isArray(farmersData) ? farmersData : []);
            setEmployees(Array.isArray(employeesData) ? employeesData : []);
            setMemberTypes(Array.isArray(mtData) ? mtData : []);

            if (priceData && priceData.status === 'success') {
                setDailyPriceObj(priceData.data);
                setValue('pricePerKg', priceData.data.price);
            }

            if (settingsRes && settingsRes.status === 'success' && settingsRes.data) {
                setLocalSettings(prev => ({ ...prev, ...settingsRes.data }));
                if (settingsRes.data.drcBonuses) {
                    try { setDrcBonuses(JSON.parse(settingsRes.data.drcBonuses)); } catch (e) { }
                }
            }
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    const loadSettings = async () => {
        if (isDemo) return;
        try {
            const res = await getSettings();
            if (res.status === 'success' && res.data) {
                setLocalSettings(prev => ({ ...prev, ...res.data }));
                if (!watch('pricePerKg')) {
                    setValue('pricePerKg', res.data.basePrice || '');
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const onSubmit = async (data) => {
        setSubmitting(true);
        const toastId = toast.loading('กำลังประมวลผล...');
        try {
            // Automatic Farmer Registration Logic
            let farmerId = data.farmerId;
            let farmerName = data.farmerName;

            const isNewFarmer = !farmerId && farmerName;

            if (isNewFarmer) {
                if (!data.note || data.note.trim().length < 5) {
                    setSubmitting(false);
                    toast.error('กรุณาระบุเลขบัตรประชาชนหรือเบอร์โทรศัพท์ในช่องหมายเหตุสำหรับเกษตรกรใหม่', { id: toastId });
                    return;
                }

                toast.loading('กำลังลงทะเบียนเกษตรกรใหม่...', { id: toastId });
                try {
                    const resFarmer = await addFarmer({ 
                        name: farmerName, 
                        note: data.note,
                        // You can add more default fields if needed
                    });

                    if (resFarmer.status === 'success') {
                        farmerId = resFarmer.id;
                        // Add to local state so it appears in list and correctly linked
                        const newFarmerEntry = { id: farmerId, name: farmerName, note: data.note };
                        setFarmers(prev => [newFarmerEntry, ...prev]);
                        toast.loading('ลงทะเบียนสำเร็จ กำลังบันทึกรายการ...', { id: toastId });
                    } else {
                        throw new Error(resFarmer.message || 'ลงทะเบียนล้มเหลว');
                    }
                } catch (err) {
                    setSubmitting(false);
                    toast.error('ไม่สามารถลงทะเบียนเกษตรกรใหม่ได้: ' + err.message, { id: toastId });
                    return;
                }
            } else {
                // Get actual farmer name from ID if selected
                const selectedFarmer = farmers.find(f => f.id === farmerId);
                if (selectedFarmer) {
                    farmerName = selectedFarmer.name;
                }
            }

            // Financial & Weight Variables
            let w = 0, bw = 0, d = 0, bp = 0, bDrc = 0;
            let netWeight = 0, dryRubber = 0;
            let actualPrice = 0, total = 0;
            let isCupLump = false;

            w = Number(data.weight) || 0;
            bw = Number(data.bucketWeight) || 0;
            d = Number(data.drc) || 0;
            bp = Number(data.basePrice) || 0;
            bDrc = Number(data.bonusDrc) || 0;
            
            // Calculate FSC Bonus during submission
            const fscBonus = selectedFarmer?.fscId ? (Number(settings.fsc_bonus) || 1) : 0;
            
            // Member Type Bonus calculation
            let bonusMemberType = 0;
            if (selectedFarmer?.memberTypeId) {
                const mType = memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId);
                if (mType) bonusMemberType = Number(mType.bonus) || 0;
            }

            const p = bp + bDrc + fscBonus + bonusMemberType; // Actual price per kg including all bonuses

            // Find employee share
            const farmerEmps = employees.filter(e => e.farmerId === farmerId);
            const empPct = farmerEmps.length > 0 ? Number(farmerEmps[0].profitSharePct) : 0;

            netWeight = truncateOneDecimal(w - bw);
            dryRubber = truncateOneDecimal((netWeight * d) / 100);

            // Derive breakdown from the actual price input
            actualPrice = truncateOneDecimal(p);
            
            isCupLump = (data.rubberType || watchRubberType) === 'cup_lump';
            total = isCupLump ? Math.floor(netWeight * actualPrice) : Math.floor(dryRubber * actualPrice);

            const employeeTotal = Math.floor((total * empPct) / 100);
            const farmerTotal = Math.floor(total - employeeTotal);

            // --- E-Slip Generation ---
            let receiptUrl = '';
            const shouldPrintESlip = settings.printESlip === undefined ? true : (settings.printESlip === 'true' || settings.printESlip === true);
            
            if (!isDemo && shouldPrintESlip) {
                toast.loading('กำลังสร้าง E-Slip...', { id: toastId });
                try {
                    // Lazy-load html2canvas
                    if (!window.html2canvas) {
                        await new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                            script.onload = resolve; script.onerror = reject;
                            document.head.appendChild(script);
                        });
                    }

                    const element = eslipRef.current;
                    if (element) {
                        element.style.display = 'block';
                        await new Promise(r => setTimeout(r, 800));

                        const captureEl = element.querySelector('.eslip-capture');
                        const canvas = await window.html2canvas(captureEl, {
                            scale: 2, useCORS: true, backgroundColor: '#ffffff',
                            width: 500, logging: false,
                            windowWidth: 500,
                            scrollX: 0, scrollY: 0
                        });

                        element.style.display = 'none';
                        const base64 = canvas.toDataURL('image/png');
                        const filename = `ESlip_Buy_${Date.now()}.png`;

                        const uploadRes = await saveReceiptImageToDrive(base64, filename);
                        if (uploadRes.status === 'success') {
                            receiptUrl = uploadRes.url;
                        }
                    }
                } catch (e) {
                    console.error('E-Slip error:', e);
                }
            }

            // Data Normalization (Ensure numbers are numbers)
            const payload = {
                date: data.date,
                farmerId: farmerId,
                farmerName: farmerName,
                weight: Number(data.weight) || 0,
                bucketWeight: Number(data.bucketWeight) || 0,
                drc: Number(data.drc) || 0,
                basePrice: bp,
                bonusDrc: bDrc,
                actualPrice: actualPrice,
                pricePerKg: Number(actualPrice),
                total: Math.floor(total),
                dryRubber: isCupLump ? Number(netWeight) : Number(dryRubber),
                dryWeight: isCupLump ? Number(netWeight) : Number(dryRubber), // Keep for UI compatibility
                empPct: Number(empPct),
                employeeTotal: Math.floor(employeeTotal),
                farmerTotal: Math.floor(farmerTotal),
                fscBonus: Number(fscBonus),
                bonusMemberType: Number(bonusMemberType),
                note: data.note,
                rubberType: data.rubberType || 'latex',
                receiptUrl: receiptUrl,
                status: 'Completed',
                farmerStatus: 'Pending',
                employeeStatus: 'Pending',
                timestamp: new Date().toISOString()
            };

            // (Removed redundant addBuyRecord call here)

            if (isDemo) {
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const todayRecords = records.filter(r => String(r.id).startsWith(todayStr + '-'));
                let maxNum = 0;
                todayRecords.forEach(r => {
                    const parts = String(r.id).split('-');
                    const n = parseInt(parts[parts.length - 1], 10);
                    if (!isNaN(n) && n > maxNum) maxNum = n;
                });
                const newId = `${todayStr}-${String(maxNum + 1).padStart(4, '0')}`;
                const newRecord = { ...payload, id: newId, timestamp: new Date().toISOString() };

                setRecords([newRecord, ...records]);
                toast.success('บันทึกสำเร็จ (Demo)', { id: toastId });
                reset({ date: format(new Date(), 'yyyy-MM-dd'), farmerId: '', farmerName: '', weight: '', bucketWeight: '', drc: '', pricePerKg: dailyPriceObj.price, note: '', rubberType: 'latex' });
                setFarmerSearch('');
            } else {
                const res = await addBuyRecord(payload);
                if (res.status === 'success') {
                    toast.success('บันทึกสำเร็จ', { id: toastId });
                    const newRecord = { ...payload, id: res.id, timestamp: new Date().toISOString() };
                    setRecords([newRecord, ...records]);

                    // --- LINE Notification ---
                    if (receiptUrl && farmerId) {
                        sendLineReceipt(farmerId, receiptUrl)
                            .then(r => console.log('LINE Sent:', r))
                            .catch(e => console.error('LINE Error:', e));
                    }

                    // Reset form first
                    reset({
                        date: format(new Date(), 'yyyy-MM-dd'),
                        farmerId: '',
                        farmerName: '',
                        weight: '',
                        bucketWeight: '',
                        drc: '',
                        pricePerKg: dailyPriceObj.price || '0',
                        note: ''
                    });
                    setFarmerSearch('');
                    setSubmitting(false); // Clear submitting state early here

                    // --- Auto Print Paper Receipt ---
                    // Wait a bit for the UI to settle after reset/setSubmitting(false)
                    const shouldPrintPaper = settings.printPaperSlip === undefined ? true : (settings.printPaperSlip === 'true' || settings.printPaperSlip === true);
                    if (shouldPrintPaper) {
                        setTimeout(() => {
                            toast.dismiss(); // Clear "Success" notification before printing
                            handlePrintReceipt(newRecord);
                        }, 500); 
                    }
                } else {
                    setSubmitting(false);
                    toast.error(res.message, { id: toastId });
                }
            }
        } catch (error) {
            setSubmitting(false);
            toast.error('บันทึกล้มเหลว: ' + error.message, { id: toastId });
        }
    };

    const handleDelete = async (id) => {
        setConfirmDeleteId(id);
    };

    const confirmDelete = async () => {
        const id = confirmDeleteId;
        setConfirmDeleteId(null);
        const toastId = toast.loading('กำลังลบ...');
        try {
            if (isDemo) {
                setRecords(prev => prev.filter(r => String(r.id) !== String(id)));
                toast.success('ลบสำเร็จ (Demo)', { id: toastId });
                return;
            }
            // Find the record so we can get its receipt URL before deleting
            const targetRecord = records.find(r => String(r.id) === String(id));

            const res = await deleteRecord('buys', id);
            console.log('[Delete Response]', res);
            if (res && res.status === 'success') {
                // Also delete the receipt image from Drive if it exists
                if (targetRecord && targetRecord.receiptUrl) {
                    deleteReceiptFileToDrive(targetRecord.receiptUrl)
                        .then(r => console.log('[Delete Drive File]', r))
                        .catch(e => console.warn('[Delete Drive File Error]', e));
                }
                toast.success('ลบสำเร็จ', { id: toastId });
                setRecords(prev => prev.filter(r => String(r.id) !== String(id)));
            } else {
                const errMsg = (res && res.message) ? res.message : JSON.stringify(res);
                toast.error('ลบล้มเหลว: ' + errMsg, { id: toastId, duration: 8000 });
            }
        } catch (error) {
            toast.error('ลบล้มเหลว (exception): ' + error.message, { id: toastId, duration: 8000 });
        }
    };

    const handlePrintReceipt = (record) => {
        setPrintingReceipt(record);
        
        // Wait for rendering then print via hidden iframe
        setTimeout(() => {
            if (printRef.current) {
                printRecord(printRef.current.innerHTML);
                setPrintingReceipt(null);
            }
        }, 500);
    };

    const calculateTotal = () => {
        const w = truncateOneDecimal(Number(watchWeight) || 0);
        const bw = truncateOneDecimal(Number(watchBucketWeight) || 0);
        const netWeight = truncateOneDecimal(w - bw);
        const d = truncateOneDecimal(Number(watchDrc) || 0);
        const dry = truncateOneDecimal((netWeight * d) / 100);
        
        const selectedFarmer = farmers.find(f => f.id === watchFarmerId);
        const fscBonus = selectedFarmer?.fscId ? (Number(settings.fsc_bonus) || 1) : 0;
        
        let memberBonus = 0;
        if (selectedFarmer?.memberTypeId) {
            const mType = memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId);
            if (mType) memberBonus = Number(mType.bonus) || 0;
        }

        const actualPrice = truncateOneDecimal(Number(watchBasePrice || 0) + Number(watchBonusDrc || 0) + fscBonus + memberBonus);
        
        if (watchRubberType === 'cup_lump' || watchRubberType === 'ขี้ยาง') {
            return Math.floor(netWeight * actualPrice);
        }
        
        return Math.floor(dry * actualPrice);
    };

    const getEmpPct = () => {
        const emp = employees.find(e => e.farmerId === watchFarmerId);
        return emp ? Number(emp.profitSharePct) : 0;
    };

    const calculateDryRubber = () => {
        const w = truncateOneDecimal(Number(watchWeight) || 0);
        const bw = truncateOneDecimal(Number(watchBucketWeight) || 0);
        const netWeight = truncateOneDecimal(w - bw);
        const d = truncateOneDecimal(Number(watchDrc) || 0);
        
        if (watchRubberType === 'cup_lump' || watchRubberType === 'ขี้ยาง') {
            return netWeight;
        }
        
        return truncateOneDecimal((netWeight * d) / 100);
    };

    const filteredRecords = records.filter(r => {
        const matchesSearch = (r.farmerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = (r.date || '').split('T')[0] === selectedDate;
        return matchesSearch && matchesDate;
    });

    const addCalcItem = (e) => {
        if (e) e.preventDefault();
        if (calcInput && !isNaN(calcInput)) {
            setCalcItems([...calcItems, Number(calcInput)]);
            setCalcInput('');
        }
    };

    const removeCalcItem = (index) => {
        setCalcItems(calcItems.filter((_, i) => i !== index));
    };

    const applyCalcResult = () => {
        const total = calcItems.reduce((sum, val) => sum + val, 0);
        setValue('weight', truncateOneDecimal(total).toString());
        setShowCalculator(false);
        setCalcItems([]);
    };

    const dailySummary = {
        count: filteredRecords.length,
        totalWeight: filteredRecords.reduce((sum, r) => sum + (Number(r.weight) - Number(r.bucketWeight || 0)), 0),
        totalAmount: filteredRecords.reduce((sum, r) => sum + Number(r.total), 0)
    };

    const basePrice = settings.daily_price || dailyPriceObj.price || 0;

    const displayFarmerName = watchFarmerName || farmers.find(f => f.id === watchFarmerId)?.name || 'ลูกค้าทั่วไป';
    const displayFarmerId = watchFarmerId || '-';

    // Calculate employee share using the same logic as elsewhere
    const currentEmpPct = Number(employees.find(e => e.farmerId === watchFarmerId)?.profitSharePct) || 0;

    return (
        <div className="space-y-6">
            {/* Direct Print Style Injection for 57mm Thermal Printer */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: 48mm 210mm;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        -webkit-print-color-adjust: exact;
                    }
                    .receipt-content {
                        width: 48mm;
                        padding: 2mm;
                        margin: 0 auto;
                        font-family: 'Noto Sans Thai', sans-serif;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            ` }} />

            {/* Custom Delete Confirmation Dialog */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center print:hidden">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                                <Trash2 className="text-red-600" size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">ยืนยันการลบ</h3>
                        </div>
                        <p className="text-gray-600 mb-5 text-sm">คุณต้องการลบรายการนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >ยกเลิก</button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                            >ลบรายการ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Container (Does not show on screen) */}
            <div style={{ display: 'none' }}>
                <div ref={printRef}>
                    {printingReceipt && (
                        <div className="receipt-content text-black text-[16px] leading-snug p-4 font-sans" style={{ width: '57mm', background: 'white' }}>
                    {/* Control Bar - Hidden on Print */}
                    <div className="w-full flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200 no-print sticky top-0 z-20">
                        <button 
                            onClick={() => setPrintingReceipt(null)}
                            className="flex items-center space-x-2 text-gray-600 font-bold px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                            <span>ปิด</span>
                        </button>
                        <div className="flex space-x-3">
                            <button 
                                onClick={() => window.print()}
                                className="flex items-center space-x-2 bg-rubber-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-rubber-700 shadow-md transition-all active:scale-95"
                            >
                                <Printer size={20} />
                                <span>พิมพ์บิล</span>
                            </button>
                        </div>
                    </div>

                    <div className="receipt-content-inner">
                        {/* Header - High Contrast for Thermal */}
                        <div className="text-center mb-4 border-b-2 border-black pb-2">
                            <div className="h-16 flex items-center justify-center mb-2">
                                {settings.logoUrl && (
                                    <img src={settings.logoUrl} alt="Logo" className="h-16 mx-auto object-contain" style={{ filter: 'grayscale(1) contrast(2)' }} />
                                )}
                            </div>
                            <h1 className="text-2xl font-bold leading-tight">{settings.factoryName || 'ร้านรับซื้อน้ำยางพารา'}</h1>
                            <p className="text-[14px] font-medium">{settings.address || '-'}</p>
                            <p className="text-lg font-bold">โทร: {settings.phone || '-'}</p>
                            <div className="mt-2 font-bold border-2 border-black inline-block px-6 py-1 text-[16px]">
                                {printingReceipt.rubberType === 'cup_lump' || printingReceipt.rubber_type === 'cup_lump' ? 'ใบรับซื้อขี้ยางพารา' : 'ใบรับซื้อน้ำยางพารา'}
                            </div>
                        </div>

                        {/* Customer Info Section */}
                        <div className="mb-4">
                            <div className="text-center text-[14px] font-bold border-y border-black py-0.5 mb-2 uppercase">=== ข้อมูลลูกค้า ===</div>
                            <div className="flex justify-between text-[14px] mb-2 font-mono">
                                <span>เลขที่: <span className="font-bold">{printingReceipt.id || '-'}</span></span>
                                <span className="font-bold">{format(addYears(new Date(printingReceipt.timestamp || printingReceipt.date || new Date()), 543), 'dd/MM/yyyy HH:mm', { locale: th })}</span>
                            </div>
                            <h2 className="text-lg font-bold">{printingReceipt.farmerName || 'ลูกค้าทั่วไป'}</h2>
                        </div>

                        {/* Purchase Details Section */}
                        <div className="mb-4">
                            <div className="text-center text-[14px] font-bold border-y border-black py-0.5 mb-2 uppercase">=== รายละเอียดรับซื้อ ===</div>
                            
                            <div className="flex justify-between items-center text-[15px] mt-2">
                                <span>{ (printingReceipt.rubberType === 'cup_lump' || printingReceipt.rubber_type === 'cup_lump') ? 'น้ำหนักขี้ยาง' : 'น้ำหนักยางดิบ' }</span>
                                <span>{Number(printingReceipt.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                            <div className="flex justify-between items-center text-[14px] text-black italic">
                                <span>น้ำหนักถัง (หัก)</span>
                                <span>-{Number(printingReceipt.bucketWeight || printingReceipt.bucket_weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>น้ำหนักสุทธิ</span>
                                <span className="text-lg font-bold border-b-2 border-black">{(Number(printingReceipt.weight || 0) - Number(printingReceipt.bucketWeight || printingReceipt.bucket_weight || 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>
                            
                            {printingReceipt.rubberType !== 'cup_lump' && printingReceipt.rubber_type !== 'cup_lump' && (
                                <>
                                    <div className="flex justify-between items-center mt-1">
                                        <span>% DRC</span>
                                        <span className="text-lg font-bold border-b border-black">{Number(printingReceipt.drc).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span>ยางแห้ง</span>
                                        <span className="text-lg font-bold border-b border-black">{Number(printingReceipt.dryWeight || printingReceipt.dryRubber || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                    </div>
                                </>
                            )}
                            
                            <div className="my-2 border-t border-dashed border-black"></div>

                            <div className="flex justify-between items-center text-[16px]">
                                <span>ราคากลาง</span>
                                <span>{Number(printingReceipt.basePrice || (Number(printingReceipt.actualPrice || printingReceipt.pricePerKg) - (printingReceipt.bonusDrc !== undefined ? Number(printingReceipt.bonusDrc) : calculateDrcBonus(printingReceipt.drc, drcBonuses)))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>
                            
                            {printingReceipt.rubberType !== 'cup_lump' && printingReceipt.rubber_type !== 'cup_lump' && (
                                <>
                                    <div className="flex justify-between items-center text-[16px] font-medium">
                                        <span>โบนัส DRC</span>
                                        <span>+{Number(printingReceipt.bonusDrc !== undefined ? printingReceipt.bonusDrc : calculateDrcBonus(printingReceipt.drc, drcBonuses)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                    </div>
                                    {Number(printingReceipt.fscBonus || (farmers.find(f => f.id === printingReceipt.farmerId)?.fscId ? (settings.fsc_bonus || 1) : 0)) > 0 && (
                                        <div className="flex justify-between items-center text-[16px] font-medium text-black">
                                            <span>โบนัส FSC</span>
                                            <span>+{Number(printingReceipt.fscBonus || (farmers.find(f => f.id === printingReceipt.farmerId)?.fscId ? (settings.fsc_bonus || 1) : 0)).toLocaleString(undefined, { minimumFractionDigits: 0 })}/กก.</span>
                                        </div>
                                    )}
                                    {Number(printingReceipt.bonusMemberType || (farmers.find(f => f.id === printingReceipt.farmerId)?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === printingReceipt.farmerId).memberTypeId)?.bonus : 0)) > 0 && (
                                        <div className="flex justify-between items-center text-[16px] font-black bg-gray-100 px-1 rounded">
                                            <span>{memberTypes.find(mt => mt.id === (printingReceipt.memberTypeId || farmers.find(f => f.id === printingReceipt.farmerId)?.memberTypeId))?.name || 'โบนัสสมาชิก'}</span>
                                            <span>+{Number(printingReceipt.bonusMemberType || (farmers.find(f => f.id === printingReceipt.farmerId)?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === printingReceipt.farmerId).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="flex justify-between items-center font-bold border-t-2 border-black pt-2 mt-2">
                                <span>ราคาจริง (สุทธิ)</span>
                                <span className="text-lg font-bold border-b-2 border-black">{truncateOneDecimal(Number(printingReceipt.actualPrice || (Number(printingReceipt.pricePerKg) || (Number(printingReceipt.basePrice || 0) + Number(printingReceipt.bonusDrc || 0) + (Number(printingReceipt.fscBonus) || (farmers.find(f => f.id === printingReceipt.farmerId)?.fscId ? 1 : 0)))))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>
                        </div>

                        {/* Splits */}
                        {printingReceipt.rubberType !== 'cup_lump' && printingReceipt.rubber_type !== 'cup_lump' && (
                            <div className="py-2 border-t-2 border-black my-2 space-y-2">
                                <div className="flex justify-between items-center font-bold text-lg">
                                    <span>เกษตรกร ({100 - (Number(printingReceipt.empPct) || 0)}%)</span>
                                    <span className="font-bold text-2xl">{Math.floor(Number(printingReceipt.farmerTotal || printingReceipt.total)).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                </div>
                                {Number(printingReceipt.empPct) > 0 && (
                                    <div className="flex justify-between items-center text-lg">
                                        <span>ลูกจ้าง ({Number(printingReceipt.empPct)}%)</span>
                                        <span className="font-bold text-2xl">{Math.floor(Number(printingReceipt.employeeTotal || 0)).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Total Footer */}
                        <div className="border-t-4 border-double border-black py-3 mt-2">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-sm uppercase">ยอดรวมสุทธิ</span>
                                <span className="font-bold text-3xl">{Math.floor(Number(printingReceipt.total)).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                            </div>
                        </div>

                        {/* Footer Message */}
                        <div className="text-center mt-4 border-t border-black pt-2">
                            <p className="text-[10px] font-bold">=== ขอบคุณที่ใช้บริการ ===</p>
                        </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

            {/* Main UI */}
            <div className="print:hidden">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">บันทึกรับซื้อน้ำยาง</h1>
                <p className="text-gray-500 mb-6">บันทึกข้อมูลการรับซื้อน้ำยางจากเกษตรกรและพิมพ์ใบเสร็จ</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Add Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <PlusCircle className="mr-2 text-rubber-600" size={20} />
                                เพิ่มรายการใหม่
                            </h2>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
                                    <input type="date" {...register('date', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500" />
                                </div>

                                <div className="relative" ref={farmerDropdownRef}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เลือกเกษตรกร <span className="text-red-500">*</span></label>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="พิมพ์เพื่อค้นหาชื่อ..."
                                            value={farmerSearch}
                                            onChange={(e) => {
                                                setFarmerSearch(e.target.value);
                                                setShowFarmerDropdown(true);
                                                if (!e.target.value) {
                                                    setValue('farmerId', '');
                                                }
                                            }}
                                            onFocus={() => setShowFarmerDropdown(true)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 bg-white"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <Search size={16} className="text-gray-400" />
                                        </div>
                                    </div>

                                    {showFarmerDropdown && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                            {farmers
                                                .filter(f => f.name.toLowerCase().includes(farmerSearch.toLowerCase()) || (f.id && f.id.toLowerCase().includes(farmerSearch.toLowerCase())))
                                                .map(f => (
                                                    <div
                                                        key={f.id}
                                                        className="px-4 py-2 hover:bg-rubber-50 cursor-pointer border-b border-gray-50 last:border-none flex justify-between items-center"
                                                        onClick={() => {
                                                            setValue('farmerId', f.id);
                                                            setFarmerSearch(f.name);
                                                            setShowFarmerDropdown(false);
                                                        }}
                                                    >
                                                        <span className="text-sm font-medium text-gray-900">{f.name}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono uppercase">{f.id}</span>
                                                    </div>
                                                ))
                                            }
                                            {farmers.filter(f => f.name.toLowerCase().includes(farmerSearch.toLowerCase())).length === 0 && (
                                                <div className="px-4 py-3 text-sm text-gray-500 italic text-center">
                                                    ไม่พบในรายชื่อ...
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <input type="hidden" {...register('farmerId', { required: !watchFarmerName })} />

                                    <div className="flex items-center text-[10px] text-gray-400 my-2 px-1">
                                        <span className="flex-grow border-t border-gray-100"></span>
                                        <span className="px-2 uppercase font-bold tracking-widest">หรือระบุชื่อใหม่</span>
                                        <span className="flex-grow border-t border-gray-100"></span>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="ระบุชื่อ-นามสกุล (ถ้าไม่มีในรายการ)"
                                        {...register('farmerName', { required: !watchFarmerId })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setValue('farmerId', '');
                                                setFarmerSearch('');
                                            }
                                        }}
                                    />
                                    {(errors.farmerName || errors.farmerId) && <span className="text-red-500 text-xs mt-1 block font-medium">กรุณาระบุหรือเลือกเกษตรกร</span>}
                                </div>

                                {/* Product Type Selector */}
                                <div className="grid grid-cols-2 gap-2 mb-2 p-1 bg-gray-100 rounded-xl relative overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setValue('rubberType', 'latex')}
                                        className={`flex items-center justify-center p-2 rounded-lg text-xs font-bold transition-all z-10 ${watchRubberType === 'latex' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        <Leaf size={14} className="mr-1.5" />
                                        น้ำยางพารา
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setValue('rubberType', 'cup_lump')}
                                        className={`flex items-center justify-center p-2 rounded-lg text-xs font-bold transition-all z-10 ${watchRubberType === 'cup_lump' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500'}`}
                                    >
                                        <div className="w-3 h-3 rounded-full bg-amber-600 mr-1.5 shadow-inner"></div>
                                        ขี้ยางพารา
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
                                            <span>น้ำหนัก (กก.) <span className="text-red-500">*</span></span>
                                            <button
                                                type="button"
                                                onClick={() => setShowCalculator(true)}
                                                className="text-rubber-600 hover:text-rubber-700 p-1 rounded-md hover:bg-rubber-50 transition-colors"
                                                title="เครื่องคิดเลขรวมน้ำหนัก"
                                            >
                                                <Calculator size={16} />
                                            </button>
                                        </label>
                                        <input type="number" step="0.01" min="0" placeholder="0.00" {...register('weight', { required: true })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">น้ำหนักถัง (กก.)</label>
                                        <input type="number" step="0.01" min="0" placeholder="0.00" {...register('bucketWeight')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500" />
                                    </div>
                                </div>

                                {watchRubberType !== 'cup_lump' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">% DRC</label>
                                            <input type="number" step="0.01" min="0" max="100" placeholder="0.00" {...register('drc')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500" />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                            <Wallet size={14} className="mr-1 text-gray-400" />
                                            ราคากลาง (บาท)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            placeholder="0.0"
                                            {...register('basePrice', { required: true })}
                                            className="w-full px-3 py-2 border border-blue-100 bg-blue-50/30 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 font-bold"
                                        />
                                    </div>
                                    {watchRubberType !== 'cup_lump' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                                                <PlusCircle size={14} className="mr-1 text-green-500" />
                                                โบนัส DRC
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                placeholder="0.0"
                                                {...register('bonusDrc')}
                                                className="w-full px-3 py-2 border border-green-100 bg-green-50/30 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 font-bold text-green-700"
                                            />
                                        </div>
                                    )}
                                </div>

                                {farmers.find(f => f.id === watchFarmerId)?.fscId && (
                                    <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-amber-800">
                                        <div className="flex items-center text-xs font-bold">
                                            <Leaf size={14} className="mr-1.5 text-amber-600" />
                                            🌿 FSC โบนัส
                                        </div>
                                        <span className="text-xs font-black">+{Number(settings.fsc_bonus || 1).toLocaleString(undefined, { minimumFractionDigits: 1 })} บาท/กก.</span>
                                    </div>
                                )}

                                {selectedFarmer?.memberTypeId && memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId) && (
                                    <div className="mb-2 p-2 bg-rubber-50 border border-rubber-200 rounded-lg flex items-center justify-between text-rubber-800">
                                        <div className="flex items-center text-xs font-black uppercase">
                                            <Percent size={14} className="mr-1.5 text-rubber-600" />
                                            กลุ่ม: {memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId).name}
                                        </div>
                                        <span className="text-xs font-black">+{Number(memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId).bonus).toLocaleString(undefined, { minimumFractionDigits: 1 })} บาท/กก.</span>
                                    </div>
                                )}

                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">ราคาจริงรวมโบนัส:</span>
                                        <span className="text-sm font-black text-gray-700 font-mono">
                                            ฿{(Number(watchBasePrice || 0) + Number(watchBonusDrc || 0) + (selectedFarmer?.fscId ? (Number(settings.fsc_bonus) || 1) : 0) + (selectedFarmer?.memberTypeId ? (Number(memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId)?.bonus) || 0) : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                                    <input type="text" placeholder="ข้อมูลเพิ่มเติม..." {...register('note')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500" />
                                </div>

                                <div className="bg-rubber-50 p-4 rounded-lg border border-rubber-100 mt-6 text-right">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-rubber-800">ยอดจ่ายรวม:</span>
                                        <span className="text-lg font-bold text-rubber-900 font-mono">฿{truncateOneDecimal(calculateTotal()).toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-rubber-600/70 italic">
                                        <span>(คำนวณจากเนื้อยางแห้ง: {truncateOneDecimal(calculateDryRubber()).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.)</span>
                                    </div>
                                    {getEmpPct() > 0 && (
                                        <div className="flex justify-between items-center pt-2 border-t border-rubber-200">
                                            <span className="text-xs text-rubber-700">ส่วนแบ่งพนักงาน ({getEmpPct()}%):</span>
                                            <span className="text-sm font-bold text-blue-600 font-mono">
                                                - ฿{truncateOneDecimal(calculateTotal() * (getEmpPct() / 100)).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex flex-col space-y-1 mt-3 pt-3 border-t border-rubber-200/50">
                                        {watchRubberType !== 'cup_lump' && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-rubber-700">ยางแห้ง:</span>
                                                <span className="font-bold text-rubber-800">{truncateOneDecimal(calculateDryRubber() || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กก.</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-sm text-emerald-700">
                                            <span>{watchRubberType === 'cup_lump' ? 'ยอดสุทธิ' : `เกษตรกร (${100 - getEmpPct()}%)`}:</span>
                                            <span className="font-bold">฿ {truncateOneDecimal((calculateTotal() * (100 - getEmpPct())) / 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                        {watchRubberType !== 'cup_lump' && getEmpPct() > 0 && (
                                            <div className="flex justify-between items-center text-sm text-purple-700">
                                                <span>ลูกจ้าง ({getEmpPct()}%):</span>
                                                <span className="font-bold">฿ {truncateOneDecimal((calculateTotal() * getEmpPct()) / 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-rubber-600 text-white rounded-lg px-4 py-3 font-semibold hover:bg-rubber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rubber-500 disabled:opacity-50 transition-colors flex items-center justify-center mt-4 shadow-md"
                                >
                                    {submitting ? 'กำลังบันทึก...' : 'บันทึกและพิมพ์ใบเสร็จ'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Records Table */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                        <FileText className="mr-2 text-gray-500" size={20} />
                                        ประวัติการรับซื้อ
                                    </h2>
                                    <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                                        <span className="text-xs font-bold text-gray-400 mr-2 uppercase tracking-tighter">วันที่:</span>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="border-none focus:ring-0 text-sm font-bold text-rubber-600 bg-transparent p-0 cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="text-gray-400" size={18} />
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="ค้นหาชื่อ, รหัส..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm bg-white shadow-sm transition-all focus:shadow-md"
                                    />
                                </div>
                            </div>

                            {/* Daily Summary Cards */}
                            <div className="grid grid-cols-3 gap-0 border-b border-gray-100 bg-white">
                                <div className="p-4 text-center border-r border-gray-50">
                                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">รายการ</p>
                                    <p className="text-lg font-black text-gray-900">{dailySummary.count} <span className="text-xs font-bold text-gray-400">บิล</span></p>
                                </div>
                                <div className="p-4 text-center border-r border-gray-50">
                                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">น้ำหนักสุทธิ</p>
                                    <p className="text-lg font-black text-rubber-600">{dailySummary.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs font-bold text-gray-400">กก.</span></p>
                                </div>
                                <div className="p-4 text-center">
                                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">ยอดจ่ายรวม</p>
                                    <p className="text-lg font-black text-blue-600">฿{dailySummary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                {loading ? (
                                    <div className="flex justify-center items-center h-64">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rubber-600"></div>
                                    </div>
                                ) : filteredRecords.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                        <p>ไม่พบประวัติการรับซื้อ</p>
                                    </div>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50/80">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่/เวลา</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เกษตรกร</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">น้ำหนัก (กก.)</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">% DRC</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ราคา/กก.</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ยอดรวม (฿)</th>
                                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredRecords.map((record) => (
                                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {record.date ? format(addYears(new Date(record.date), 543), 'dd MMM yyyy', { locale: th }) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-bold text-gray-900 flex items-center">
                                                            <User size={14} className="mr-1.5 text-gray-400" />
                                                            <span className="flex items-center gap-2">
                                                                {record.farmerName}
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                                                                    (record.rubberType === 'cup_lump' || record.rubber_type === 'cup_lump') 
                                                                        ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                                                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                                }`}>
                                                                    {(record.rubberType === 'cup_lump' || record.rubber_type === 'cup_lump') ? 'ขี้ยาง' : 'น้ำยาง'}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                                        <div className="flex flex-col items-end">
                                                            <span>{Number(record.weight).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                            {record.bucketWeight > 0 && (
                                                                <span className="text-[10px] text-red-400 font-normal">-{Number(record.bucketWeight).toLocaleString(undefined, { minimumFractionDigits: 1 })} (ถัง)</span>
                                                            )}
                                                            {record.bucketWeight > 0 && (
                                                                <span className="text-[11px] text-gray-400 font-bold border-t border-gray-100 mt-0.5">{(Number(record.weight) - Number(record.bucketWeight)).toLocaleString(undefined, { minimumFractionDigits: 1 })} สุทธิ</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-medium">
                                                        {record.drc ? `${record.drc}%` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                        {Number(record.pricePerKg || record.actualPrice).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-rubber-600 text-right bg-rubber-50/30">
                                                        {Number(record.total).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                        <div className="flex justify-center space-x-1">
                                                            <button
                                                                onClick={() => handlePrintReceipt(record)}
                                                                className="p-1.5 text-gray-400 hover:text-rubber-600 hover:bg-rubber-50 rounded-lg transition-all"
                                                                title="พิมพ์ Paper-slip"
                                                            >
                                                                <Printer size={18} />
                                                            </button>
                                                            {user?.role === 'owner' && (
                                                                <button
                                                                    onClick={() => handleDelete(record.id)}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="ลบรายการ"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setViewingEslip(record)}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                title="ดู E-Slip"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                            {(record.receiptUrl || record.receipt_url) && !String(record.receiptUrl || record.receipt_url).startsWith('offline_queue') && (
                                                                <a
                                                                    href={record.receiptUrl || record.receipt_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                                    title="ดูรูปที่บันทึกไว้ใน Cloud"
                                                                >
                                                                    <ImageIcon size={18} />
                                                                </a>
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

                {/* Premium E-Slip Modal */}
                {viewingEslip && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 no-print sm:p-4">
                        <div className="bg-white rounded-[1.2rem] shadow-2xl max-w-[280px] w-full max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300">
                            <button 
                                onClick={() => setViewingEslip(null)}
                                className="absolute right-3 top-3 z-20 bg-black/10 hover:bg-black/20 text-white p-1 rounded-full transition-all hover:scale-110 active:scale-95"
                            >
                                <X size={14} />
                            </button>

                            <div className="flex flex-col font-sans">
                                {/* Header */}
                                <div className="bg-[#2d5a3f] py-4 px-3 text-center text-white relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                                    <div className="absolute left-0 bottom-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                                    
                                    <div className="flex justify-center mb-2">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl overflow-hidden">
                                            {settings.logoUrl || settings.logo_url ? (
                                                <img src={settings.logoUrl || settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Leaf size={24} className="text-white opacity-80" />
                                            )}
                                        </div>
                                    </div>
                                    <h1 className="text-2xl font-black tracking-tight mb-0.5 leading-tight">
                                        {settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา'}
                                    </h1>
                                    <p className="text-[13px] opacity-70 font-medium mb-2 max-w-[280px] mx-auto">
                                        {settings.address || '-'} โทร: {settings.phone || '-'}
                                    </p>
                                    
                                    <div className="inline-block px-3 py-1 bg-white/20 rounded-full border border-white/10 backdrop-blur-sm text-[13px] font-black tracking-[0.2em] leading-none uppercase">
                                        {(viewingEslip.rubberType === 'cup_lump' || viewingEslip.rubber_type === 'cup_lump') ? 'ใบรับซื้อขี้ยางพารา' : 'ใบรับซื้อน้ำยางพารา'}
                                    </div>
                                </div>

                                <div className="px-3 pt-3 pb-4 bg-white">
                                    <div className="flex justify-between items-center mb-3 text-[13px] font-black text-gray-400 bg-gray-50/80 px-2 py-1.5 rounded-lg border border-gray-100">
                                        <span className="flex items-center"><span className="opacity-40 mr-1 font-bold small-caps">ID:</span> <span className="text-gray-900 mono">{viewingEslip.id?.substring(0, 14)}</span></span>
                                        <span>{format(new Date(viewingEslip.date || viewingEslip.timestamp || new Date()), 'dd MMM yy HH:mm', { locale: th })}</span>
                                    </div>

                                    <div className="mb-3">
                                        <p className="text-[12px] font-black text-gray-400 mb-1 uppercase tracking-widest flex items-center">
                                            <User size={12} className="mr-1 opacity-40" />
                                            ข้อมูลลูกค้า
                                        </p>
                                        <div className="flex items-center justify-between border-b border-dotted border-gray-100 pb-2.5">
                                            <div>
                                                <h2 className="text-[22px] font-black text-gray-800 leading-none mb-0.5">
                                                    {viewingEslip.farmerName || viewingEslip.buyerName || 'ลูกค้าทั่วไป'}
                                                </h2>
                                                <div className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded text-[13px] font-bold text-gray-500">
                                                    รหัส: {viewingEslip.farmerId || '-'}
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                                                <User size={24} className="text-gray-200" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1 mb-3">
                                        <p className="text-[12px] font-black text-gray-400 mb-1 uppercase tracking-widest">รายละเอียดการรับซื้อ</p>
                                        
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-gray-400">{(viewingEslip.rubberType === 'cup_lump' || viewingEslip.rubber_type === 'cup_lump') ? 'น้ำหนักขี้ยาง' : 'น้ำหนักยางดิบ'}</span>
                                            <span className="font-black text-gray-900 decoration-rubber-100">{Number(viewingEslip.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs font-bold text-gray-400">กก.</span></span>
                                        </div>

                                        {(Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)) > 0 && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-bold text-red-300 ml-2 flex items-center"><ChevronDown size={14} className="mr-1" /> น้ำหนักถังยาง</span>
                                                <span className="font-bold text-red-500">-{Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                            </div>
                                        )}

                                        {(Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)) > 0 && (
                                            <div className="flex justify-between items-center text-sm border-t border-dotted border-gray-100 pt-0.5 mt-0.5">
                                                <span className="font-bold text-gray-600">น้ำหนักสุทธิ</span>
                                                <span className="font-black text-gray-900">{(Number(viewingEslip.weight || 0) - Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs font-bold text-gray-400">กก.</span></span>
                                            </div>
                                        )}

                                        {(viewingEslip.rubberType !== 'cup_lump' && viewingEslip.rubber_type !== 'cup_lump') && (
                                            <>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-bold text-gray-400">% DRC</span>
                                                    <span className="font-black text-gray-900">{Number(viewingEslip.drc || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                                </div>

                                                <div className="flex justify-between items-center text-base py-1 border-y border-gray-100 font-black bg-gray-50/50 px-2 rounded-lg my-0.5">
                                                    <span className="text-gray-700">ยางแห้ง</span>
                                                    <span className="text-rubber-600">
                                                        {Number(viewingEslip.dry_weight ?? viewingEslip.dry_rubber ?? viewingEslip.dryRubber ?? ((Number(viewingEslip.weight || 0) * Number(viewingEslip.drc || 0)) / 100)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs">กก.</span>
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        <div className="flex justify-between items-center text-sm pt-0.5">
                                            <span className="font-bold text-gray-400">ราคากลาง</span>
                                            <span className="font-black text-gray-900 mono">
                                                ฿{Number(viewingEslip.base_price ?? viewingEslip.basePrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs text-gray-400 font-bold">/กก.</span>
                                            </span>
                                        </div>

                                        {(viewingEslip.rubberType !== 'cup_lump' && viewingEslip.rubber_type !== 'cup_lump') && (
                                            <>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-bold text-gray-400">โบนัส DRC</span>
                                                    <span className="font-bold text-green-600 mono">
                                                        +฿{Number(viewingEslip.bonus_drc ?? viewingEslip.bonusDrc ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs text-gray-400 font-bold">/กก.</span>
                                                    </span>
                                                </div>

                                                {(Number(viewingEslip.fsc_bonus ?? viewingEslip.fscBonus ?? 0)) > 0 && (
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="font-bold text-gray-400">โบนัส FSC</span>
                                                        <span className="font-bold text-amber-600 mono">
                                                            +฿{Number(viewingEslip.fsc_bonus ?? viewingEslip.fscBonus ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs text-gray-400 font-bold">/กก.</span>
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {(Number(viewingEslip.bonusMemberType ?? viewingEslip.bonus_member_type ?? 0)) > 0 && (
                                                    <div className="flex justify-between items-center text-sm px-1 py-0.5 bg-rubber-50 rounded">
                                                        <span className="font-black text-rubber-700">{memberTypes.find(mt => mt.id === viewingEslip.memberTypeId)?.name || 'โบนัสสมาชิก'}</span>
                                                        <span className="font-black text-rubber-700 mono">
                                                            +฿{Number(viewingEslip.bonusMemberType ?? viewingEslip.bonus_member_type ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs font-black italic">/กก.</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="flex justify-between items-center text-base pt-1 border-t border-dotted border-gray-200 mt-0.5 font-black">
                                            <span className="text-gray-800">ราคาจริง (สุทธิ)</span>
                                            <span className="font-black text-gray-900 mono">
                                                ฿{Number(
                                                    viewingEslip.actual_price ?? viewingEslip.actualPrice ?? viewingEslip.price_per_kg ?? viewingEslip.pricePerKg ?? 0
                                                ).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs text-gray-400 font-bold">/กก.</span>
                                            </span>
                                        </div>
                                    </div>

                                    {(viewingEslip.rubberType !== 'cup_lump' && viewingEslip.rubber_type !== 'cup_lump') && (
                                        <div className="bg-gray-50 rounded-[1.2rem] p-3 border border-gray-100 space-y-2 mb-3">
                                            <div className="flex items-center space-x-2">
                                                <div className="p-1 bg-rubber-100 rounded-md"><Coins size={14} className="text-rubber-600" /></div>
                                                <p className="text-[13px] font-black text-rubber-700 uppercase tracking-widest">การจัดสรรเงิน</p>
                                            </div>
                                            
                                            <div className="space-y-1 pt-1 border-t border-dotted border-gray-200">
                                                <div className="flex justify-between items-center text-[14px]">
                                                    <span className="font-bold text-orange-400 flex items-center"><Coins size={14} className="mr-1.5" /> เกษตรกร ({(100 - Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0))}%)</span>
                                                    <span className="font-black text-[#5ba2d7] mono">฿{Math.floor(Number(viewingEslip.total || 0) * (100 - Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                                </div>
                                                
                                                {Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0) > 0 && (
                                                    <div className="flex justify-between items-center text-[14px]">
                                                        <span className="font-bold text-[#a855f7] flex items-center"><User size={14} className="mr-1.5" /> ลูกจ้าง ({Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0)}%)</span>
                                                        <span className="font-black text-[#a855f7] mono">฿{Math.floor(Number(viewingEslip.total || 0) * Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-[#2d5a3f] rounded-xl p-3 flex justify-between items-center text-white shadow-xl shadow-green-900/30 relative overflow-hidden group/total mb-1.5">
                                        <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover/total:scale-150 duration-700"></div>
                                        <span className="text-[14px] font-black uppercase tracking-widest">ยอดรวมจ่าย</span>
                                        <div className="text-right relative z-10">
                                            <span className="text-[26px] font-black leading-none tracking-tighter tabular-nums drop-shadow-md">
                                                ฿{Number(viewingEslip.total || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </div>

                                    {(viewingEslip.receipt_url || viewingEslip.receiptUrl) && !String(viewingEslip.receipt_url || viewingEslip.receiptUrl).startsWith('offline_queue') && (
                                        <div className="mt-8 text-center">
                                            <a 
                                                href={viewingEslip.receipt_url || viewingEslip.receiptUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center px-4 py-2 bg-gray-50 rounded-xl text-xs font-black text-gray-400 hover:text-rubber-600 hover:bg-rubber-50 transition-all border border-gray-100"
                                            >
                                                <Eye size={14} className="mr-2" />
                                                OPEN ORIGINAL CLOUD IMAGE
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Weight Calculator Modal */}
                {showCalculator && (
                    <div className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
                            <div className="bg-rubber-600 p-4 text-white flex justify-between items-center">
                                <div className="flex items-center">
                                    <Calculator className="mr-2" size={20} />
                                    <h3 className="font-bold">เครื่องคิดเลขรวมน้ำหนัก</h3>
                                </div>
                                <button onClick={() => setShowCalculator(false)} className="hover:bg-rubber-700 p-1 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={calcInput}
                                        onChange={(e) => setCalcInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addCalcItem(e)}
                                        className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 font-mono text-lg"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={addCalcItem}
                                        className="bg-rubber-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-rubber-700 transition-colors"
                                    >
                                        เพิ่ม
                                    </button>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto border border-gray-100">
                                    {calcItems.length === 0 ? (
                                        <p className="text-center text-gray-400 text-sm py-4 italic">ยังไม่มีรายการ...</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {calcItems.map((val, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                                                    <span className="font-mono text-gray-700 font-bold">{val.toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                                    <button onClick={() => removeCalcItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                    <div className="flex justify-between items-center mb-4 px-1">
                                        <span className="text-gray-500 font-medium">รวมน้ำหนักทั้งหมด:</span>
                                        <span className="text-2xl font-black text-rubber-700 font-mono">
                                            {calcItems.reduce((sum, v) => sum + v, 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setCalcItems([])}
                                            className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
                                        >
                                            ล้างทั้งหมด
                                        </button>
                                        <button
                                            type="button"
                                            onClick={applyCalcResult}
                                            disabled={calcItems.length === 0}
                                            className="px-4 py-2 text-sm font-bold text-white bg-rubber-600 rounded-lg hover:bg-rubber-700 disabled:opacity-50 shadow-md shadow-rubber-200"
                                        >
                                            ใช้ค่านักสุทธิ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Hidden Premium E-Slip Template for Canvas Capture */}
            <div style={{ display: 'none', position: 'fixed', left: '-9999px', top: '0', zIndex: 9999 }} ref={eslipRef}>
                <div className="eslip-capture w-[500px] bg-white flex flex-col font-sans">
                    {/* Header: Dark Green */}
                    <div className="bg-[#2d5a3f] py-6 px-8 text-center text-white relative">
                        <div className="flex justify-center mb-3">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md overflow-hidden">
                                {settings.logoUrl ? (
                                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Leaf size={36} className="text-white" />
                                )}
                            </div>
                        </div>
                        <h1 className="text-[42px] font-black tracking-tight mb-1 leading-tight">
                            {settings.factoryName || 'ร้านรับซื้อน้ำยางพารา'}
                        </h1>
                        <p className="text-[16px] opacity-70 font-medium mb-4">
                            {settings.address || '-'} โทร: {settings.phone || '-'}
                        </p>

                        <div className="inline-block px-6 py-1.5 bg-white/20 rounded-full border border-white/10 backdrop-blur-sm text-[18px] font-black tracking-widest leading-none">
                            {(watchRubberType === 'cup_lump' || printingReceipt?.rubberType === 'cup_lump') ? 'ใบรับซื้อขี้ยางพารา' : 'ใบรับซื้อน้ำยางพารา'}
                        </div>
                    </div>

                    <div className="px-8 pt-6 pb-8 bg-white">
                        {/* Transaction ID & Date Bar */}
                        <div className="flex justify-between items-center mb-4 text-[18px] font-black text-gray-500 bg-gray-100/80 px-4 py-2 rounded-lg">
                            <span>เลขที่: <span className="text-gray-700">{(editingRecord?.id || ('buy_' + Date.now())).substring(0, 14)}</span></span>
                            <span>{format(addYears(new Date(), 543), 'dd MMMM yyyy HH:mm', { locale: th })}</span>
                        </div>

                        {/* Customer Info Card */}
                        <div className="mb-6">
                            <p className="text-[18px] font-bold text-gray-400 mb-1">ข้อมูลลูกค้า</p>
                            <div className="flex items-center justify-between border-b-2 border-dotted border-gray-100 pb-4">
                                <div>
                                    <h2 className="text-[42px] font-black text-gray-800 leading-tight">
                                        {printingReceipt?.farmerName || farmers.find(f => f.id === watch('farmerId'))?.name || 'ลูกค้าทั่วไป'}
                                    </h2>
                                    <p className="text-[20px] font-bold text-gray-400">
                                        รหัส: {printingReceipt?.lineId || farmers.find(f => f.id === watch('farmerId'))?.lineId || '-'}
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-2xl">
                                    <User size={40} className="text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Details Table */}
                        <div className="space-y-3 mb-6">
                            <p className="text-[18px] font-bold text-gray-400 mb-2">รายละเอียดการรับซื้อ</p>

                            <div className="flex justify-between items-center text-[24px]">
                                <span className="font-bold text-gray-600">{(watchRubberType === 'cup_lump' || printingReceipt?.rubberType === 'cup_lump') ? 'น้ำหนักขี้ยาง' : 'น้ำหนักยางดิบ'}</span>
                                <span className="font-black text-gray-900">{(Number(watch('weight')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                            </div>

                            {Number(watch('bucketWeight')) > 0 && (
                                <div className="flex justify-between items-center text-[24px]">
                                    <span className="font-bold text-red-500 ml-4 italic">- น้ำหนักถังยาง</span>
                                    <span className="font-bold text-red-500">-{Number(watch('bucketWeight')).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                            )}

                            {Number(watch('bucketWeight')) > 0 && (
                                <div className="flex justify-between items-center text-[26px] py-1 border-t border-dotted border-gray-50">
                                    <span className="font-bold text-gray-700">น้ำหนักสุทธิ</span>
                                    <span className="font-black text-gray-900">{(Number(watch('weight')) - Number(watch('bucketWeight'))).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                            )}

                            {(watchRubberType !== 'cup_lump' && printingReceipt?.rubberType !== 'cup_lump') && (
                                <>
                                    <div className="flex justify-between items-center text-[24px]">
                                        <span className="font-bold text-gray-600">% DRC</span>
                                        <span className="font-black text-gray-900">{(Number(watch('drc')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                    </div>

                                    <div className="flex justify-between items-center text-[30px] py-3 border-y-2 border-gray-100 font-black bg-gray-50/50 px-2 rounded-lg">
                                        <span className="text-gray-700">ยางแห้ง</span>
                                        <span className="text-gray-900">{calculateDryRubber().toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-between items-center text-[24px] pt-2">
                                <span className="font-bold text-gray-600">ราคากลาง</span>
                                <span className="font-bold text-gray-900 font-mono">฿{(Number(printingReceipt?.basePrice ?? watch('basePrice')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                            </div>

                            {(watchRubberType !== 'cup_lump' && printingReceipt?.rubberType !== 'cup_lump') && (
                                <div className="flex justify-between items-center text-[24px]">
                                    <span className="font-bold text-gray-600">โบนัส DRC</span>
                                    <span className="font-bold text-green-600 font-mono">+฿{(Number(printingReceipt?.bonusDrc ?? watch('bonusDrc')) || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                </div>
                            )}
                            {(watchRubberType !== 'cup_lump' && printingReceipt?.rubberType !== 'cup_lump') && (
                                <>
                                    {(Number(printingReceipt?.fscBonus || (farmers.find(f => f.id === watch('farmerId'))?.fscId ? (settings.fsc_bonus || 1) : 0))) > 0 && (
                                        <div className="flex justify-between items-center text-[24px] text-amber-600">
                                            <span className="font-bold">โบนัส FSC</span>
                                            <span className="font-bold font-mono">+฿{Number(printingReceipt?.fscBonus || (farmers.find(f => f.id === watch('farmerId'))?.fscId ? (settings.fsc_bonus || 1) : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                        </div>
                                    )}

                                    {(Number(printingReceipt?.bonusMemberType ?? (farmers.find(f => f.id === watch('farmerId'))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === watch('farmerId')).memberTypeId)?.bonus : 0))) > 0 && (
                                        <div className="flex justify-between items-center text-[24px] text-rubber-700 bg-rubber-50 px-2 rounded-lg">
                                            <span className="font-black">{memberTypes.find(mt => mt.id === (printingReceipt?.memberTypeId || farmers.find(f => f.id === watch('farmerId'))?.memberTypeId))?.name || 'โบนัสสมาชิก'}</span>
                                            <span className="font-black font-mono">+฿{Number(printingReceipt?.bonusMemberType ?? (farmers.find(f => f.id === watch('farmerId'))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === watch('farmerId')).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex justify-between items-center text-[28px] pt-2 border-t border-dotted border-gray-100 mt-2 font-black">
                                <span className="text-gray-800">ราคาจริง (สุทธิ)</span>
                                <span className="text-gray-900 font-mono">฿{Math.floor(Number(printingReceipt?.actualPrice ?? (Number(watch('basePrice') || 0) + Number(watch('bonusDrc') || 0) + (selectedFarmer?.fscId ? (Number(settings.fsc_bonus) || 1) : 0) + (selectedFarmer?.memberTypeId ? (Number(memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId)?.bonus) || 0) : 0))) || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}/กก.</span>
                            </div>
                        </div>

                        {/* Shares / Splits */}
                        {(watchRubberType !== 'cup_lump' && printingReceipt?.rubberType !== 'cup_lump') && (
                            <div className="bg-gray-50 rounded-[32px] p-8 border border-gray-100 space-y-6">
                                <div className="flex items-center space-x-4 mb-2">
                                    <div className="p-2 bg-rubber-100 rounded-xl"><Coins size={24} className="text-rubber-600" /></div>
                                    <p className="text-[14px] font-black text-rubber-700 uppercase tracking-widest">การจัดสรรเงิน</p>
                                </div>

                                {/* Shares section */}
                                <div className="space-y-4 pt-6 mt-6 border-t border-dotted border-gray-100">
                                    <div className="flex justify-between items-center text-[22px]">
                                        <div className="flex items-center space-x-3">
                                            <Coins size={32} className="text-orange-400" />
                                            <span className="font-bold text-orange-400">เกษตรกรได้รับ ({(100 - currentEmpPct)}%)</span>
                                        </div>
                                        <span className="font-black text-[#5ba2d7] font-mono italic">฿{Math.floor((calculateTotal() * (100 - currentEmpPct)) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                    </div>

                                    {currentEmpPct > 0 && (
                                        <div className="flex justify-between items-center text-[22px]">
                                            <div className="flex items-center space-x-3">
                                                <User size={32} className="text-[#a855f7]" />
                                                <span className="font-bold text-[#a855f7]">ลูกจ้างได้รับ ({currentEmpPct}%)</span>
                                            </div>
                                            <span className="font-black text-[#a855f7] font-mono italic">฿{Math.floor((calculateTotal() * currentEmpPct) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Note */}
                        {watch('note') && (
                            <div className="mt-8 p-5 bg-amber-50 rounded-2xl border border-amber-100 text-[14px] text-amber-700 font-medium italic">
                                หมายเหตุ: {watch('note')}
                            </div>
                        )}
                    </div>

                    {/* Footer: Large Green Footer */}
                    <div className="bg-[#2d5a3f] p-6 flex justify-between items-center text-white">
                        <span className="text-[28px] font-black uppercase">รวมจ่าย</span>
                        <span className="text-[80px] font-black leading-none tabular-nums tracking-tighter">
                            ฿{Math.floor(calculateTotal()).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Buy;
