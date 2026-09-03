import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { addBuyRecord, fetchBuyRecords, deleteRecord, updateRecord, fetchFarmers, fetchDailyPrice, getSettings, fetchEmployees, fetchFarmerEmployees, saveReceiptImageToDrive, deleteReceiptFileToDrive, sendLineReceipt, fetchMemberTypes, isCached, addFarmer, updateQueue, fetchQueues, fetchLoans, fetchLoanDeductions, getPendingDeletes, getPendingUpdates } from '../services/apiService';
import { db } from '../services/db';
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
    const [farmerEmployees, setFarmerEmployees] = useState([]);
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

    const [activeQueue, setActiveQueue] = useState(null);
    const [showQueueModal, setShowQueueModal] = useState(false);
    const [waitingPaymentQueues, setWaitingPaymentQueues] = useState([]);
    const [loans, setLoans] = useState([]);
    const [loanDeductions, setLoanDeductions] = useState([]);

    const handleSelectQueue = (q) => {
        setActiveQueue(q);
        setValue('farmerId', q.farmer_id);
        setValue('farmerName', q.farmer_name);
        setFarmerSearch(q.farmer_name);
        
        const mappedType = q.rubber_type === 'cup_lump' ? 'cup_lump' : 'latex';
        setValue('rubberType', mappedType);
        
        setValue('weight', String(q.weight || ''));
        setValue('bucketWeight', String(q.bucket_weight || ''));
        setValue('drc', String(q.drc || ''));
    };

    const handleOpenQueueModal = async () => {
        try {
            const list = await fetchQueues();
            const waiting = (list || []).filter(q => q.status === 'waiting_payment' || q.status === 'calling');
            setWaitingPaymentQueues(waiting);
            setShowQueueModal(true);
        } catch (e) {
            toast.error("ดึงข้อมูลคิวผิดพลาด");
        }
    };

    const handleClearQueue = () => {
        setActiveQueue(null);
        reset({
            date: format(new Date(), 'yyyy-MM-dd'),
            farmerId: '',
            farmerName: '',
            weight: '',
            bucketWeight: '',
            drc: '',
            pricePerKg: dailyPriceObj.price,
            note: '',
            rubberType: 'latex',
            enableFsc: true
        });
        setFarmerSearch('');
    };

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
            rubberType: 'latex',
            enableFsc: true
        }
    });

    const templateConfig = React.useMemo(() => {
        try {
            return settings.paperSlipConfig ? JSON.parse(settings.paperSlipConfig) : null;
        } catch (e) {
            console.error("Error parsing paperSlipConfig:", e);
            return null;
        }
    }, [settings.paperSlipConfig]);

    const paperSlipConfig = templateConfig; // Now passing the FULL root config object

    const watchRubberType = watch('rubberType');
    const watchWeight = watch('weight');
    const watchBucketWeight = watch('bucketWeight');
    const watchPricePerKg = watch('pricePerKg');
    const watchBasePrice = watch('basePrice');
    const watchBonusDrc = watch('bonusDrc');
    const watchDrc = watch('drc');
    const watchFarmerId = watch('farmerId');
    const watchFarmerName = watch('farmerName');
    const watchEnableFsc = watch('enableFsc');
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
        const fscId = selectedFarmer?.fscId || selectedFarmer?.fsc_id;
        const fscBonus = (watchEnableFsc !== false && fscId) ? (Number(settings.fscBonus) || 1) : 0;

        let memberBonus = 0;
        const mId = selectedFarmer?.memberTypeId || selectedFarmer?.member_type_id;
        if (mId) {
            const mType = memberTypes.find(mt => String(mt.id) === String(mId));
            if (mType) memberBonus = Number(mType.bonus) || 0;
        }

        if (!dirtyFields.basePrice) setValue('basePrice', base.toString());
        if (!dirtyFields.bonusDrc) setValue('bonusDrc', isCupLump ? '0' : bonusDrc.toString());
        
        // Ensure DRC is at least 1 for cup lump to avoid API validation error
        if (isCupLump && (!watchDrc || Number(watchDrc) < 1)) {
            setValue('drc', '1');
        }

        const finalPrice = isCupLump ? base : (base + bonusDrc + fscBonus + memberBonus);
        if (String(watchPricePerKg || '') !== String(finalPrice || '')) {
            setValue('pricePerKg', finalPrice.toString());
        }
    }, [watchDrc, watchFarmerId, watchRubberType, farmers, memberTypes, dailyPriceObj.price, settings.cupLumpPrice, setValue, drcBonuses, dirtyFields.basePrice, dirtyFields.bonusDrc, settings.fscBonus, watchEnableFsc, watchPricePerKg]);

    // Load data
    useEffect(() => {
        loadData();

        const handleClickOutside = (event) => {
            if (farmerDropdownRef.current && !farmerDropdownRef.current.contains(event.target)) {
                setShowFarmerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        const handleRefresh = () => {
            loadData(true);
        };
        window.addEventListener('dashboard-refresh', handleRefresh);
        window.addEventListener('price-updated', handleRefresh);

        const handleVisibilityChange = () => {
            if (!document.hidden && navigator.onLine) {
                loadData(true);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('dashboard-refresh', handleRefresh);
            window.removeEventListener('price-updated', handleRefresh);
        };
    }, []);

    // Reset pagination and reload data when date filter changes
    useEffect(() => {
        setCurrentPage(1);
        if (selectedDate) {
            loadData(true);
        }
    }, [selectedDate]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const getActiveStoreId = () => {
        return localStorage.getItem('rt_active_store_id') || user?.storeId || user?.id || null;
    };

    const getLocalDateString = (dateInput) => {
        if (!dateInput) return '';
        const str = String(dateInput).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return str;
        }
        try {
            const d = new Date(str);
            if (isNaN(d.getTime())) {
                return str.split('T')[0].split(' ')[0];
            }
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return str.split('T')[0].split(' ')[0];
        }
    };

    const sortBuys = (arr) => {
        if (!Array.isArray(arr)) return [];
        return [...arr].sort((a, b) => {
            const timeA = new Date(a.created_at || a.timestamp || a.date || 0).getTime();
            const timeB = new Date(b.created_at || b.timestamp || b.date || 0).getTime();
            if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
                return timeB - timeA;
            }
            return String(b.id || '').localeCompare(String(a.id || ''));
        });
    };

    const isSameRecords = (a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        const keyA = a.map(x => `${x.id}:${getLocalDateString(x.date)}:${x.farmerId || ''}:${x.farmerName || ''}:${x.weight}:${x.drc}:${x.pricePerKg}:${x.total}:${x.note || ''}:${x.updated_at || ''}`).join('|');
        const keyB = b.map(x => `${x.id}:${getLocalDateString(x.date)}:${x.farmerId || ''}:${x.farmerName || ''}:${x.weight}:${x.drc}:${x.pricePerKg}:${x.total}:${x.note || ''}:${x.updated_at || ''}`).join('|');
        return keyA === keyB;
    };

    const mergeRecords = (existingRecords, incomingRecords) => {
        if (!Array.isArray(incomingRecords)) return incomingRecords || [];
        
        const currentStoreId = getActiveStoreId();
        const pendingDeletes = getPendingDeletes('buys');
        const pendingUpdates = getPendingUpdates('buys');
        const recordMap = new Map();

        // 1. Add all incoming records matching current store AND NOT deleted locally
        incomingRecords.forEach(r => {
            if (r && r.id && !pendingDeletes.has(String(r.id))) {
                const matchesStore = !currentStoreId || !r.userId || String(r.userId) === String(currentStoreId);
                if (matchesStore) {
                    let finalRecord = r;
                    if (pendingUpdates.has(String(r.id))) {
                        finalRecord = { ...r, ...pendingUpdates.get(String(r.id)) };
                    }
                    recordMap.set(String(r.id), finalRecord);
                }
            }
        });

        // 2. Keep existing records ONLY if they match current active store AND NOT deleted locally
        if (Array.isArray(existingRecords)) {
            existingRecords.forEach(r => {
                if (r && r.id && !pendingDeletes.has(String(r.id))) {
                    const matchesStore = !currentStoreId || !r.userId || String(r.userId) === String(currentStoreId);
                    if (matchesStore && !recordMap.has(String(r.id))) {
                        let finalRecord = r;
                        if (pendingUpdates.has(String(r.id))) {
                            finalRecord = { ...r, ...pendingUpdates.get(String(r.id)) };
                        }
                        recordMap.set(String(r.id), finalRecord);
                    }
                }
            });
        }

        return sortBuys(Array.from(recordMap.values()));
    };

    const isSameData = (a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch {
            return false;
        }
    };

    const isSameMemberTypes = (a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        return a.every((itemA, i) => {
            const itemB = b[i];
            return itemA && itemB && 
                String(itemA.id) === String(itemB.id) && 
                String(itemA.name) === String(itemB.name) && 
                Number(itemA.bonus || 0) === Number(itemB.bonus || 0);
        });
    };

    const isSameFarmerEmployees = (a, b) => {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        return a.every((itemA, i) => {
            const itemB = b[i];
            return itemA && itemB && 
                String(itemA.farmerId || itemA.farmer_id) === String(itemB.farmerId || itemB.farmer_id) && 
                String(itemA.employeeId || itemA.employee_id) === String(itemB.employeeId || itemB.employee_id) && 
                Number(itemA.profitSharePct ?? itemA.profit_share_pct ?? 0) === Number(itemB.profitSharePct ?? itemB.profit_share_pct ?? 0);
        });
    };

    const loadData = async (force = false) => {
        // Step 1: Read locally from Dexie (Instant - <10ms)
        try {
            const [localBuys, localFarmers, localEmployees, localLoans, localDeds, localMts] = await Promise.all([
                db.buys.toArray(),
                db.farmers.toArray(),
                db.employees.toArray(),
                db.loans.toArray(),
                db.loan_deductions.toArray(),
                db.farmer_types.toArray()
            ]);
            const currentStoreId = getActiveStoreId();
            const storeLocalBuys = (localBuys || []).filter(r => 
                !currentStoreId || !r.userId || String(r.userId) === String(currentStoreId)
            );
            setRecords(prev => mergeRecords(prev, storeLocalBuys));
            setFarmers(prev => isSameData(prev, localFarmers) ? prev : (localFarmers || []));
            setEmployees(prev => isSameData(prev, localEmployees) ? prev : (localEmployees || []));
            setLoans(prev => isSameData(prev, localLoans) ? prev : (localLoans || []));
            setLoanDeductions(prev => isSameData(prev, localDeds) ? prev : (localDeds || []));
            setMemberTypes(prev => isSameMemberTypes(prev, localMts) ? prev : (localMts || []));
            
            if ((localBuys && localBuys.length > 0) || (localFarmers && localFarmers.length > 0)) {
                setLoading(false);
            }
        } catch (localErr) {
            console.error("Local load error", localErr);
        }

        // Step 2: Background network revalidation (Non-blocking)
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
                setLoading(false);
                return;
            }

            const [buyData, farmersData, priceData, settingsRes, employeesData, mtData, loansData, dedsData, feLinksData] = await Promise.all([
                fetchBuyRecords(force, selectedDate ? { startDate: selectedDate, endDate: selectedDate } : null),
                fetchFarmers(),
                fetchDailyPrice(),
                getSettings(),
                fetchEmployees(),
                fetchMemberTypes(),
                fetchLoans(),
                fetchLoanDeductions(),
                fetchFarmerEmployees()
            ]);

            React.startTransition(() => {
                if (Array.isArray(buyData)) {
                    setRecords(prev => {
                        const merged = mergeRecords(prev, buyData);
                        return isSameRecords(prev, merged) ? prev : merged;
                    });
                }
                if (Array.isArray(farmersData)) setFarmers(prev => isSameData(prev, farmersData) ? prev : farmersData);
                if (Array.isArray(employeesData)) setEmployees(prev => isSameData(prev, employeesData) ? prev : employeesData);
                if (Array.isArray(feLinksData)) setFarmerEmployees(prev => isSameFarmerEmployees(prev, feLinksData) ? prev : feLinksData);
                if (Array.isArray(mtData)) setMemberTypes(prev => isSameMemberTypes(prev, mtData) ? prev : mtData);
                if (Array.isArray(loansData)) setLoans(prev => isSameData(prev, loansData) ? prev : loansData);
                if (Array.isArray(dedsData)) setLoanDeductions(prev => isSameData(prev, dedsData) ? prev : dedsData);

                if (priceData && priceData.status === 'success') {
                    setDailyPriceObj(priceData.data);
                    setValue('pricePerKg', priceData.data.price);
                }

                if (settingsRes && settingsRes.status === 'success' && settingsRes.data) {
                    setLocalSettings(prev => ({ ...prev, ...settingsRes.data }));
                    if (settingsRes.data.drcBonuses) {
                        try { 
                            setDrcBonuses(typeof settingsRes.data.drcBonuses === 'string' ? JSON.parse(settingsRes.data.drcBonuses) : settingsRes.data.drcBonuses); 
                        } catch (e) { }
                    }
                }
            });
        } catch (error) {
            console.error('Background load failed:', error);
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

            const isCupLump = (data.rubberType || watchRubberType) === 'cup_lump' || (data.rubberType || watchRubberType) === 'ขี้ยาง';
            const mId = selectedFarmer?.memberTypeId || selectedFarmer?.member_type_id;
            const mBonus = mId ? (Number(memberTypes.find(mt => String(mt.id) === String(mId))?.bonus) || 0) : 0;
            const fscId = selectedFarmer?.fscId || selectedFarmer?.fsc_id;
            const fBonus = (data.enableFsc !== false && fscId) ? (Number(settings.fscBonus || settings.fsc_bonus) || 1) : 0;
            const p = isCupLump ? bp : (bp + bDrc + fBonus + mBonus);
            let empPct = Number(data.empPct || 0);
            if (data.employeeId && empPct === 0) {
                const link = farmerEmployees.find(fe => fe.farmerId === farmerId && fe.employeeId === data.employeeId);
                if (link) empPct = Number(link.profitSharePct || 0);
            }

            const netWeight = truncateOneDecimal(w - bw);
            const dryRubber = truncateOneDecimal((netWeight * d) / 100);
            const actualPrice = truncateOneDecimal(p);
            const total = isCupLump ? Math.floor(netWeight * actualPrice) : Math.floor(dryRubber * actualPrice);
            const employeeTotal = Math.floor((total * empPct) / 100);
            const farmerTotal = Math.floor(total - employeeTotal);

            const fDed = parseFloat(data.farmerDeduction) || 0;
            const eDed = parseFloat(data.employeeDeduction) || 0;

            const netFarmerTotal = farmerTotal - fDed;
            const netEmployeeTotal = employeeTotal - eDed;

            const loanDeductions = [];
            if (fDed > 0) {
                loanDeductions.push({
                    borrowerType: 'farmer',
                    borrowerId: farmerId,
                    amount: fDed
                });
            }
            if (eDed > 0 && selectedEmployee) {
                loanDeductions.push({
                    borrowerType: 'employee',
                    borrowerId: selectedEmployee.id,
                    amount: eDed
                });
            }

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
                date: data.date, farmerId, farmerName, employeeId: data.employeeId || selectedEmployee?.id || null,
                weight: Number(data.weight) || 0, bucketWeight: Number(data.bucketWeight) || 0,
                drc: isCupLump ? (Number(data.drc) || 1) : (Number(data.drc) || 0), basePrice: bp, bonusDrc: bDrc,
                actualPrice, pricePerKg: Number(actualPrice), total: Math.floor(total),
                dryRubber: isCupLump ? Number(netWeight) : Number(dryRubber),
                dryWeight: isCupLump ? Number(netWeight) : Number(dryRubber),
                empPct: Number(empPct), employeeTotal: Math.floor(netEmployeeTotal),
                farmerTotal: Math.floor(netFarmerTotal),
                loanDeductions, fscBonus: Number(fBonus),
                bonusMemberType: Number(mBonus), note: data.note,
                rubberType: data.rubberType || 'latex', receiptUrl,
                status: 'Completed', farmerStatus: 'Pending', employeeStatus: 'Pending',
                createdBy: user?.username || 'Owner',
                created_at: new Date().toISOString()
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
                reset({ date: format(new Date(), 'yyyy-MM-dd'), farmerId: '', farmerName: '', weight: '', bucketWeight: '', drc: '', pricePerKg: dailyPriceObj.price, note: '', rubberType: 'latex', enableFsc: true });
                setFarmerSearch('');
            } else {
                const res = await addBuyRecord(payload);
                if (res.status === 'success') {
                    toast.success('บันทึกสำเร็จ', { id: toastId });
                    const newRecord = { ...payload, id: res.id, isOptimistic: true, timestamp: new Date().toISOString() };
                    setRecords(prev => sortBuys([newRecord, ...prev]));

                    // Update local Dexie DB for loans and loan_deductions
                    if (loanDeductions.length > 0) {
                        try {
                            for (const ded of loanDeductions) {
                                const { borrowerType, borrowerId, amount: deductAmt } = ded;
                                
                                // Find active loans in local Dexie
                                const activeLoans = await db.loans.where({ borrowerId }).toArray();
                                // Sort them by date ASC, created_at ASC
                                activeLoans.sort((a, b) => new Date(a.date) - new Date(b.date));
                                
                                let remainingToDeduct = deductAmt;
                                for (const loan of activeLoans) {
                                    if (loan.remainingAmount <= 0) continue;
                                    if (remainingToDeduct <= 0) break;
                                    
                                    let deductionFromThisLoan = 0;
                                    let newRemaining = 0;
                                    
                                    if (loan.remainingAmount >= remainingToDeduct) {
                                        deductionFromThisLoan = remainingToDeduct;
                                        newRemaining = loan.remainingAmount - remainingToDeduct;
                                        remainingToDeduct = 0;
                                    } else {
                                        deductionFromThisLoan = loan.remainingAmount;
                                        newRemaining = 0;
                                        remainingToDeduct -= loan.remainingAmount;
                                    }
                                    
                                    // Update Dexie loan
                                    await db.loans.update(loan.id, { remainingAmount: newRemaining });
                                }
                                
                                // Query total remaining debt in Dexie after updates
                                const allLoans = await db.loans.where({ borrowerId }).toArray();
                                const remainingDebtAfter = allLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
                                
                                // Insert deduction record in Dexie
                                const deductionId = crypto.randomUUID();
                                await db.loan_deductions.put({
                                    id: deductionId,
                                    buyId: res.id,
                                    borrowerType,
                                    borrowerId,
                                    amount: deductAmt,
                                    remainingDebtAfter,
                                    userId: user.storeId || 'SYSTEM',
                                    created_at: new Date().toISOString()
                                });
                            }
                            
                            // Refresh local state
                            setTimeout(loadData, 500);
                        } catch (dexieErr) {
                            console.error("Dexie loan sync error:", dexieErr);
                        }
                    }

                    if (activeQueue) {
                        try {
                            await updateQueue({ id: activeQueue.id, status: 'completed' });
                        } catch (qErr) {
                            console.error("[Queue completion error]", qErr);
                        }
                        setActiveQueue(null);
                    }

                    if (receiptUrl && farmerId) {
                        sendLineReceipt(farmerId, receiptUrl)
                            .then(r => console.log('LINE Sent:', r))
                            .catch(e => console.error('LINE Error:', e));
                    }

                    reset({
                        date: format(new Date(), 'yyyy-MM-dd'), farmerId: '', farmerName: '',
                        weight: '', bucketWeight: '', drc: '',
                        pricePerKg: dailyPriceObj.price || '0', note: '', enableFsc: true,
                        rubberType: 'latex'
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
                // Revert loans locally in Dexie
                try {
                    const localDeds = await db.loan_deductions.where({ buyId: id }).toArray();
                    if (localDeds.length > 0) {
                        for (const ded of localDeds) {
                            const { borrowerId, amount: refundAmt } = ded;
                            const borrowerLoans = await db.loans.where({ borrowerId }).toArray();
                            borrowerLoans.sort((a, b) => new Date(b.date) - new Date(a.date)); // DESC
                            
                            let remainingToRefund = refundAmt;
                            for (const loan of borrowerLoans) {
                                if (remainingToRefund <= 0) break;
                                
                                const maxRefundable = loan.amount - loan.remainingAmount;
                                if (maxRefundable <= 0) continue;
                                
                                let refundToThisLoan = 0;
                                if (maxRefundable >= remainingToRefund) {
                                    refundToThisLoan = remainingToRefund;
                                    remainingToRefund = 0;
                                } else {
                                    refundToThisLoan = maxRefundable;
                                    remainingToRefund -= maxRefundable;
                                }
                                
                                await db.loans.update(loan.id, { remainingAmount: loan.remainingAmount + refundToThisLoan });
                            }
                        }
                        await db.loan_deductions.where({ buyId: id }).delete();
                        
                        // Reload state
                        setTimeout(loadData, 500);
                    }
                } catch (dexieErr) {
                    console.error("Dexie loan delete revert error:", dexieErr);
                }

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
        const isCupLump = watchRubberType === 'cup_lump' || watchRubberType === 'ขี้ยาง';

        if (isCupLump) {
            const actualPrice = truncateOneDecimal(Number(watchBasePrice || 0));
            return Math.floor(netWeight * actualPrice);
        }

        const fscId = sf?.fscId || sf?.fsc_id;
        const fscBonus = (watchEnableFsc !== false && fscId) ? (Number(settings.fscBonus || settings.fsc_bonus) || 1) : 0;
        let memberBonus = 0;
        const mId = sf?.memberTypeId || sf?.member_type_id;
        if (mId) {
            const mType = memberTypes.find(mt => String(mt.id) === String(mId));
            if (mType) memberBonus = Number(mType.bonus) || 0;
        }
        
        const actualPrice = truncateOneDecimal(Number(watchBasePrice || 0) + Number(watchBonusDrc || 0) + fscBonus + memberBonus);
        return Math.floor(dry * actualPrice);
    };

    const getEmpPct = () => {
        const formPct = watch('empPct');
        if (formPct !== undefined && formPct !== null && formPct !== '') {
            return Number(formPct);
        }
        const selectedEmpId = watch('employeeId');
        if (selectedEmpId && watchFarmerId) {
            const link = farmerEmployees.find(fe => fe.farmerId === watchFarmerId && fe.employeeId === selectedEmpId);
            if (link) return Number(link.profitSharePct || 0);
        }
        return 0;
    };

    const calculateDryRubber = () => {
        const w = truncateOneDecimal(Number(watchWeight) || 0);
        const bw = truncateOneDecimal(Number(watchBucketWeight) || 0);
        const netWeight = truncateOneDecimal(w - bw);
        const d = truncateOneDecimal(Number(watchDrc) || 0);
        if (watchRubberType === 'cup_lump' || watchRubberType === 'ขี้ยาง') return netWeight;
        return truncateOneDecimal((netWeight * d) / 100);
    };

    // --- Loan & Auto-Deduction Calculations ---
    const grossTotal = calculateTotal ? calculateTotal() : 0;
    const empPct = getEmpPct ? getEmpPct() : 0;
    
    const farmerGrossShare = (grossTotal * (100 - empPct)) / 100;
    const employeeGrossShare = (grossTotal * empPct) / 100;

    const farmerActiveLoans = React.useMemo(() => {
        if (!watchFarmerId) return [];
        return loans.filter(l => l.borrowerType === 'farmer' && l.borrowerId === watchFarmerId && l.remainingAmount > 0);
    }, [loans, watchFarmerId]);

    const farmerDebt = React.useMemo(() => {
        return farmerActiveLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
    }, [farmerActiveLoans]);

    const selectedEmployee = React.useMemo(() => {
        if (!watchFarmerId) return null;
        const formEmpId = watch('employeeId');
        if (formEmpId) {
            return employees.find(e => e.id === formEmpId);
        }
        const link = farmerEmployees.find(fe => fe.farmerId === watchFarmerId);
        if (link) {
            return employees.find(e => e.id === link.employeeId);
        }
        return employees.find(e => e.farmerId === watchFarmerId);
    }, [employees, farmerEmployees, watchFarmerId, watch]);

    const employeeActiveLoans = React.useMemo(() => {
        if (!selectedEmployee) return [];
        return loans.filter(l => l.borrowerType === 'employee' && l.borrowerId === selectedEmployee.id && l.remainingAmount > 0);
    }, [loans, selectedEmployee]);

    const employeeDebt = React.useMemo(() => {
        return employeeActiveLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
    }, [employeeActiveLoans]);

    useEffect(() => {
        // Suggested deduction for Farmer
        let suggestedFarmerDed = 0;
        if (farmerDebt > 0 && farmerGrossShare > 0) {
            farmerActiveLoans.forEach(l => {
                let ded = 0;
                if (l.deductionMethod === 'full') {
                    ded = l.remainingAmount;
                } else if (l.deductionMethod === 'percent') {
                    ded = farmerGrossShare * (l.deductionValue / 100);
                } else if (l.deductionMethod === 'fixed') {
                    ded = l.deductionValue;
                }
                suggestedFarmerDed += Math.min(ded, l.remainingAmount);
            });
            suggestedFarmerDed = Math.min(suggestedFarmerDed, farmerGrossShare);
            suggestedFarmerDed = Math.round(suggestedFarmerDed);
        }
        const finalFarmerDed = suggestedFarmerDed ? String(suggestedFarmerDed) : '';
        if (String(watch('farmerDeduction') || '') !== finalFarmerDed) {
            setValue('farmerDeduction', finalFarmerDed);
        }

        // Suggested deduction for Employee
        let suggestedEmployeeDed = 0;
        if (employeeDebt > 0 && employeeGrossShare > 0) {
            employeeActiveLoans.forEach(l => {
                let ded = 0;
                if (l.deductionMethod === 'full') {
                    ded = l.remainingAmount;
                } else if (l.deductionMethod === 'percent') {
                    ded = employeeGrossShare * (l.deductionValue / 100);
                } else if (l.deductionMethod === 'fixed') {
                    ded = l.deductionValue;
                }
                suggestedEmployeeDed += Math.min(ded, l.remainingAmount);
            });
            suggestedEmployeeDed = Math.min(suggestedEmployeeDed, employeeGrossShare);
            suggestedEmployeeDed = Math.round(suggestedEmployeeDed);
        }
        const finalEmpDed = suggestedEmployeeDed ? String(suggestedEmployeeDed) : '';
        if (String(watch('employeeDeduction') || '') !== finalEmpDed) {
            setValue('employeeDeduction', finalEmpDed);
        }
    }, [watchFarmerId, farmerGrossShare, employeeGrossShare, farmerDebt, employeeDebt, farmerActiveLoans, employeeActiveLoans, setValue, watch]);

    const filteredRecords = records.filter(r => {
        const matchesSearch = (r.farmerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const recordDateStr = getLocalDateString(r.date);
        const matchesDate = recordDateStr === selectedDate;
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

    const currentEmpPct = Number(watch('empPct') !== undefined ? watch('empPct') : (selectedEmployee?.profitSharePct || 0));


    return (
        <div className="space-y-6">
            {/* Direct Print Style Injection for 57mm Thermal Printer */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: auto; margin: 0; }
                    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                    .receipt-content { width: 100%; max-width: 100%; padding: 2mm; margin: 0; font-family: 'Noto Sans Thai', sans-serif; }
                    .no-print { display: none !important; }
                }
            ` }} />

            {/* Modals & Overlays */}
            <DeleteConfirmDialog confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} confirmDelete={confirmDelete} />

            {showQueueModal && (
                <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-gray-100 animate-in fade-in duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">ดึงข้อมูลคิวที่วัด % ยางเสร็จแล้ว</h3>
                        <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto mb-5">
                            {waitingPaymentQueues.length === 0 ? (
                                <p className="text-sm text-gray-400 py-6 text-center italic">ไม่มีคิวที่รอชำระเงินในขณะนี้</p>
                            ) : (
                                waitingPaymentQueues.map(q => (
                                    <div 
                                        key={q.id} 
                                        onClick={() => {
                                            handleSelectQueue(q);
                                            setShowQueueModal(false);
                                        }}
                                        className="p-3 text-sm hover:bg-rubber-50 hover:text-rubber-700 cursor-pointer transition-colors flex justify-between items-center"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="font-mono font-black text-rubber-700 text-lg">
                                                Q{String(q.queue_no).padStart(2, '0')}
                                            </span>
                                            <span className="font-bold text-gray-900">{q.farmer_name}</span>
                                        </div>
                                        <div className="text-right text-xs text-gray-500 font-mono">
                                            น้ำยางดิบ: {(Number(q.weight) - Number(q.bucket_weight || 0)).toLocaleString()} กก. | <span className="text-rubber-600 font-bold">%DRC: {q.drc}%</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex justify-end">
                            <button 
                                onClick={() => setShowQueueModal(false)}
                                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Container */}
            <BuyPaperReceipt 
                printingReceipt={printingReceipt} printRef={printRef} 
                setPrintingReceipt={setPrintingReceipt} settings={settings} 
                drcBonuses={drcBonuses} farmers={farmers} memberTypes={memberTypes}
                paperSlipConfig={paperSlipConfig}
            />

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
                        watchFarmerId={watchFarmerId} watchFarmerName={watchFarmerName} watchEnableFsc={watchEnableFsc}
                        farmers={farmers} employees={employees} farmerEmployees={farmerEmployees} memberTypes={memberTypes}
                        settings={settings} selectedFarmer={selectedFarmer}
                        farmerSearch={farmerSearch} setFarmerSearch={setFarmerSearch}
                        showFarmerDropdown={showFarmerDropdown} setShowFarmerDropdown={setShowFarmerDropdown}
                        farmerDropdownRef={farmerDropdownRef}
                        submitting={submitting} calculateTotal={calculateTotal}
                        calculateDryRubber={calculateDryRubber} getEmpPct={getEmpPct}
                        setShowCalculator={setShowCalculator}
                        templateConfig={templateConfig} 
                        activeQueue={activeQueue}
                        onOpenQueueModal={handleOpenQueueModal}
                        onClearQueue={handleClearQueue}
                        farmerDebt={farmerDebt}
                        employeeDebt={employeeDebt}
                        selectedEmployee={selectedEmployee}
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
                        loanDeductions={loanDeductions}
                        farmers={farmers}
                        employees={employees}
                    />
                </div>

                {/* Premium E-Slip Modal */}
                <BuyESlipModal 
                    viewingEslip={viewingEslip} setViewingEslip={setViewingEslip} 
                    settings={settings} farmers={farmers} memberTypes={memberTypes}
                    paperSlipConfig={paperSlipConfig}
                    loanDeductions={loanDeductions}
                />

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
                paperSlipConfig={paperSlipConfig}
            />
        </div>
    );
};

export default Buy;
