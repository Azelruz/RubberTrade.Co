import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { addBuyRecord, fetchBuyRecords, deleteRecord, updateRecord, fetchFarmers, fetchDailyPrice, getSettings, fetchEmployees, saveReceiptImageToDrive, deleteReceiptFileToDrive, sendLineReceipt, fetchMemberTypes, isCached, addFarmer } from '../services/apiService';
import { truncateOneDecimal, calculateDrcBonus } from '../utils/calculations';
import { printRecord } from '../utils/PrintService';

// Sub-components
import DeleteConfirmDialog from './buy/DeleteConfirmDialog';
import WeightCalculator from './buy/WeightCalculator';
import BuyPaperReceipt from './buy/BuyPaperReceipt';
import BuyESlipModal from './buy/BuyESlipModal';
import BuyESlipCapture from './buy/BuyESlipCapture';
import BuyTable from './buy/BuyTable';
import BuyForm from './buy/BuyForm';

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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

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
        
        const selectedFarmer = farmers.find(f => f.id === watchFarmerId);
        const fscBonus = selectedFarmer?.fscId ? (Number(settings.fsc_bonus) || 1) : 0;

        let memberBonus = 0;
        if (selectedFarmer?.memberTypeId) {
            const mType = memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId);
            if (mType) memberBonus = Number(mType.bonus) || 0;
        }

        if (!dirtyFields.basePrice) setValue('basePrice', base.toString());
        if (!dirtyFields.bonusDrc) setValue('bonusDrc', isCupLump ? '0' : bonusDrc.toString());
        setValue('pricePerKg', (base + (isCupLump ? 0 : bonusDrc) + fscBonus + memberBonus).toString());
    }, [watchDrc, watchFarmerId, watchRubberType, farmers, memberTypes, dailyPriceObj.price, settings.cupLumpPrice, setValue, drcBonuses]);

    // Load data
    useEffect(() => {
        loadData();
        loadLocalSettings();

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

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedDate]);

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

    const onSubmit = async (data) => {
        setSubmitting(true);
        const toastId = toast.loading('กำลังประมวลผล...');
        try {
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
                    const resFarmer = await addFarmer({ name: farmerName, note: data.note });
                    if (resFarmer.status === 'success') {
                        farmerId = resFarmer.id;
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
                const sf = farmers.find(f => f.id === farmerId);
                if (sf) farmerName = sf.name;
            }

            let w = Number(data.weight) || 0;
            let bw = Number(data.bucketWeight) || 0;
            let d = Number(data.drc) || 0;
            let bp = Number(data.basePrice) || 0;
            let bDrc = Number(data.bonusDrc) || 0;

            const fscBonus = selectedFarmer?.fscId ? (Number(settings.fsc_bonus) || 1) : 0;
            let bonusMemberType = 0;
            if (selectedFarmer?.memberTypeId) {
                const mType = memberTypes.find(mt => mt.id === selectedFarmer.memberTypeId);
                if (mType) bonusMemberType = Number(mType.bonus) || 0;
            }

            const p = bp + bDrc + fscBonus + bonusMemberType;
            const farmerEmps = employees.filter(e => e.farmerId === farmerId);
            const empPct = farmerEmps.length > 0 ? Number(farmerEmps[0].profitSharePct) : 0;

            const netWeight = truncateOneDecimal(w - bw);
            const dryRubber = truncateOneDecimal((netWeight * d) / 100);
            const actualPrice = truncateOneDecimal(p);
            
            const isCupLump = (data.rubberType || watchRubberType) === 'cup_lump';
            const total = isCupLump ? Math.floor(netWeight * actualPrice) : Math.floor(dryRubber * actualPrice);
            const employeeTotal = Math.floor((total * empPct) / 100);
            const farmerTotal = Math.floor(total - employeeTotal);

            // --- E-Slip Generation ---
            let receiptUrl = '';
            const shouldPrintESlip = settings.printESlip === undefined ? true : (settings.printESlip === 'true' || settings.printESlip === true);
            
            if (!isDemo && shouldPrintESlip) {
                toast.loading('กำลังสร้าง E-Slip...', { id: toastId });
                try {
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
                            width: 500, logging: false, windowWidth: 500,
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

            const payload = {
                date: data.date, farmerId, farmerName,
                weight: Number(data.weight) || 0, bucketWeight: Number(data.bucketWeight) || 0,
                drc: Number(data.drc) || 0, basePrice: bp, bonusDrc: bDrc,
                actualPrice, pricePerKg: Number(actualPrice), total: Math.floor(total),
                dryRubber: isCupLump ? Number(netWeight) : Number(dryRubber),
                dryWeight: isCupLump ? Number(netWeight) : Number(dryRubber),
                empPct: Number(empPct), employeeTotal: Math.floor(employeeTotal),
                farmerTotal: Math.floor(farmerTotal), fscBonus: Number(fscBonus),
                bonusMemberType: Number(bonusMemberType), note: data.note,
                rubberType: data.rubberType || 'latex', receiptUrl,
                status: 'Completed', farmerStatus: 'Pending', employeeStatus: 'Pending',
                timestamp: new Date().toISOString()
            };

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

                    if (receiptUrl && farmerId) {
                        sendLineReceipt(farmerId, receiptUrl)
                            .then(r => console.log('LINE Sent:', r))
                            .catch(e => console.error('LINE Error:', e));
                    }

                    reset({
                        date: format(new Date(), 'yyyy-MM-dd'), farmerId: '', farmerName: '',
                        weight: '', bucketWeight: '', drc: '',
                        pricePerKg: dailyPriceObj.price || '0', note: ''
                    });
                    setFarmerSearch('');
                    setSubmitting(false);

                    const shouldPrintPaper = settings.printPaperSlip === undefined ? true : (settings.printPaperSlip === 'true' || settings.printPaperSlip === true);
                    if (shouldPrintPaper) {
                        setTimeout(() => {
                            toast.dismiss();
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

    const handleDelete = async (id) => { setConfirmDeleteId(id); };

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
            const targetRecord = records.find(r => String(r.id) === String(id));
            const res = await deleteRecord('buys', id);
            if (res && res.status === 'success') {
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
        
        const sf = farmers.find(f => f.id === watchFarmerId);
        const fscBonus = sf?.fscId ? (Number(settings.fsc_bonus) || 1) : 0;
        let memberBonus = 0;
        if (sf?.memberTypeId) {
            const mType = memberTypes.find(mt => mt.id === sf.memberTypeId);
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
        if (watchRubberType === 'cup_lump' || watchRubberType === 'ขี้ยาง') return netWeight;
        return truncateOneDecimal((netWeight * d) / 100);
    };

    const filteredRecords = records.filter(r => {
        const matchesSearch = (r.farmerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = (r.date || '').split('T')[0] === selectedDate;
        return matchesSearch && matchesDate;
    });

    const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
    const paginatedRecords = filteredRecords.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const addCalcItem = (e) => {
        if (e) e.preventDefault();
        if (calcInput && !isNaN(calcInput)) {
            setCalcItems([...calcItems, Number(calcInput)]);
            setCalcInput('');
        }
    };

    const removeCalcItem = (index) => { setCalcItems(calcItems.filter((_, i) => i !== index)); };

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

    const currentEmpPct = Number(employees.find(e => e.farmerId === watchFarmerId)?.profitSharePct) || 0;

    return (
        <div className="space-y-6">
            {/* Direct Print Style Injection for 57mm Thermal Printer */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: 48mm 210mm; margin: 0; }
                    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                    .receipt-content { width: 48mm; padding: 2mm; margin: 0 auto; font-family: 'Noto Sans Thai', sans-serif; }
                    .no-print { display: none !important; }
                }
            ` }} />

            {/* Modals & Overlays */}
            <DeleteConfirmDialog confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} confirmDelete={confirmDelete} />

            {/* Hidden Print Container */}
            <BuyPaperReceipt printingReceipt={printingReceipt} printRef={printRef} setPrintingReceipt={setPrintingReceipt} settings={settings} drcBonuses={drcBonuses} farmers={farmers} memberTypes={memberTypes} />

            {/* Main UI */}
            <div className="print:hidden">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">บันทึกรับซื้อน้ำยาง</h1>
                <p className="text-gray-500 mb-6">บันทึกข้อมูลการรับซื้อน้ำยางจากเกษตรกรและพิมพ์ใบเสร็จ</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Form */}
                    <BuyForm
                        register={register} handleSubmit={handleSubmit} onSubmit={onSubmit}
                        watch={watch} setValue={setValue} errors={errors}
                        watchRubberType={watchRubberType} watchWeight={watchWeight} watchBucketWeight={watchBucketWeight}
                        watchBasePrice={watchBasePrice} watchBonusDrc={watchBonusDrc}
                        watchFarmerId={watchFarmerId} watchFarmerName={watchFarmerName}
                        farmers={farmers} employees={employees} memberTypes={memberTypes}
                        settings={settings} selectedFarmer={selectedFarmer}
                        farmerSearch={farmerSearch} setFarmerSearch={setFarmerSearch}
                        showFarmerDropdown={showFarmerDropdown} setShowFarmerDropdown={setShowFarmerDropdown}
                        farmerDropdownRef={farmerDropdownRef}
                        submitting={submitting} calculateTotal={calculateTotal}
                        calculateDryRubber={calculateDryRubber} getEmpPct={getEmpPct}
                        setShowCalculator={setShowCalculator}
                    />

                    {/* Records Table */}
                    <BuyTable
                        filteredRecords={paginatedRecords} dailySummary={dailySummary}
                        loading={loading} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                        selectedDate={selectedDate} setSelectedDate={setSelectedDate}
                        handlePrintReceipt={handlePrintReceipt} handleDelete={handleDelete}
                        setViewingEslip={setViewingEslip} user={user}
                        pagination={{
                            currentPage,
                            totalPages,
                            totalCount: filteredRecords.length,
                            pageSize: ITEMS_PER_PAGE
                        }}
                        onPageChange={setCurrentPage}
                    />
                </div>

                {/* Premium E-Slip Modal */}
                <BuyESlipModal viewingEslip={viewingEslip} setViewingEslip={setViewingEslip} settings={settings} farmers={farmers} memberTypes={memberTypes} />

                {/* Weight Calculator Modal */}
                <WeightCalculator
                    showCalculator={showCalculator} setShowCalculator={setShowCalculator}
                    calcItems={calcItems} setCalcItems={setCalcItems}
                    calcInput={calcInput} setCalcInput={setCalcInput}
                    addCalcItem={addCalcItem} removeCalcItem={removeCalcItem}
                    applyCalcResult={applyCalcResult}
                />
            </div>

            {/* Hidden E-Slip Capture Template */}
            <BuyESlipCapture
                eslipRef={eslipRef} settings={settings} watch={watch}
                watchRubberType={watchRubberType} printingReceipt={printingReceipt}
                editingRecord={editingRecord} selectedFarmer={selectedFarmer}
                farmers={farmers} memberTypes={memberTypes}
                currentEmpPct={currentEmpPct}
                calculateDryRubber={calculateDryRubber} calculateTotal={calculateTotal}
            />
        </div>
    );
};

export default Buy;
