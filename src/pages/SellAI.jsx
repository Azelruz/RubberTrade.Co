import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import { 
    Sparkles, Upload, FileText, CheckCircle2, AlertTriangle, Truck, 
    ChevronDown, RefreshCw, ZoomIn, ZoomOut, RotateCw, X, Edit2, ShieldAlert
} from 'lucide-react';
import { 
    addSellRecord, fetchSellRecords, deleteRecord, updateRecord, fetchStaff, 
    fetchFactories, fetchTrucks, getSettings, saveReceiptImageToDrive, 
    deleteReceiptFileToDrive, fetchBuyRecords, fetchChemicalUsage, fetchStockSummary,
    scanSellReceiptWithAI
} from '../services/apiService';
import { truncateOneDecimal, truncateTwoDecimals } from '../utils/calculations';
import { useAuth } from '../context/AuthContext';
import { printRecord } from '../utils/PrintService';

// Sub-components
import SellStockCards from './sell/SellStockCards';
import SellTable from './sell/SellTable';
import SellPaperReceipt from './sell/SellPaperReceipt';
import DeleteConfirmDialog from './buy/DeleteConfirmDialog';

export const SellAI = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [factories, setFactories] = useState([]);
    const [trucks, setTrucks] = useState([]);
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setSubmitting] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [modelUsed, setModelUsed] = useState('');
    
    // AI Result Meta
    const [aiResult, setAiResult] = useState(null);
    const [selectedItemIndex, setSelectedItemIndex] = useState(null);
    const [truckMatchStatus, setTruckMatchStatus] = useState(null); // { matched: boolean, truck: object, searchedPlate: string }
    const [mathWarning, setMathWarning] = useState(null);

    // Image & Preview Controls
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [imageZoom, setImageZoom] = useState(1);
    const [imageRotation, setImageRotation] = useState(0);

    // List & Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [allBuys, setAllBuys] = useState([]);
    const [chemicalUsage, setChemicalUsage] = useState([]);
    const [serverStockMetrics, setServerStockMetrics] = useState(null);

    // Selection dropdown states
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
    const [lossSign, setLossSign] = useState('minus'); 
    const [isAutoAdjust, setIsAutoAdjust] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);

    const printRef = useRef(null);

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
            dryWeight: '',
            pricePerKg: '',
            total: '',
            note: '',
            receiptUrl: '',
            rubberType: 'latex'
        }
    });

    const watchRubberType = watch('rubberType');
    const watchWeight = watch('weight');
    const watchDrc = watch('drc');
    const watchDryWeight = watch('dryWeight');
    const watchPricePerKg = watch('pricePerKg');
    const watchTotal = watch('total');

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
            const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
            const [recs, facs, trks, stf, buys, chems, stockRes] = await Promise.all([
                fetchSellRecords().catch(() => []),
                fetchFactories().catch(() => []),
                fetchTrucks().catch(() => []),
                fetchStaff().catch(() => []),
                fetchBuyRecords(false, { startDate: thirtyDaysAgo }).catch(() => []),
                fetchChemicalUsage().catch(() => []),
                fetchStockSummary().catch(() => null)
            ]);
            setRecords(recs || []);
            setFactories(facs || []);
            setTrucks(trks || []);
            setStaff(stf || []);
            setAllBuys(buys || []);
            setChemicalUsage(chems || []);
            if (stockRes) {
                setServerStockMetrics(stockRes);
            }
        } catch (error) {
            console.error('[SellAI loadData error]', error);
            toast.error('โหลดข้อมูลบางส่วนล้มเหลว: ' + (error?.message || 'ข้อผิดพลาดเครือข่าย'));
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate Stock Metrics
    const stockMetrics = React.useMemo(() => {
        if (serverStockMetrics) return serverStockMetrics;

        const latexBuys = allBuys.filter(b => b.rubberType === 'latex' || !b.rubberType);
        const cupLumpBuys = allBuys.filter(b => b.rubberType === 'cup_lump' || b.rubberType === 'ขี้ยาง');

        const buyWeightLatex = latexBuys.reduce((sum, item) => {
            const net = Number(item.netWeight);
            if (!isNaN(net) && net > 0) return sum + net;
            return sum + (Number(item.weight || 0) - Number(item.bucketWeight || 0));
        }, 0);

        const buyWeightCupLump = cupLumpBuys.reduce((sum, item) => {
            const net = Number(item.netWeight);
            if (!isNaN(net) && net > 0) return sum + net;
            return sum + (Number(item.weight || 0) - Number(item.bucketWeight || 0));
        }, 0);

        const ammoniaWeight = chemicalUsage.filter(c => c.chemicalId === 'ammonia').reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const waterWeight = chemicalUsage.filter(c => c.chemicalId === 'water').reduce((sum, c) => sum + Number(c.amount || 0), 0);
        const whiteMedWeight = chemicalUsage.filter(c => c.chemicalId === 'whiteMedicine').reduce((sum, c) => sum + Number(c.amount || 0), 0);

        const sellLatex = records.filter(r => r.rubberType === 'latex' || !r.rubberType);
        const sellCupLump = records.filter(r => r.rubberType === 'cup_lump');
        const sellWeightLatex = sellLatex.reduce((sum, r) => sum + Number(r.weight || 0), 0);
        const sellLossLatex = sellLatex.reduce((sum, r) => sum + Number(r.lossWeight || 0), 0);
        const sellWeightCupLump = sellCupLump.reduce((sum, r) => sum + Number(r.weight || 0), 0);

        const currentStockLatex = truncateOneDecimal(buyWeightLatex + ammoniaWeight + waterWeight + whiteMedWeight - sellWeightLatex - sellLossLatex);
        const currentStockCupLump = truncateOneDecimal(buyWeightCupLump - sellWeightCupLump);

        const totalWeightedDrc = latexBuys.reduce((sum, b) => {
            const net = Number(b.netWeight);
            const w = (!isNaN(net) && net > 0) ? net : (Number(b.weight || 0) - Number(b.bucketWeight || 0));
            return sum + (w * (Number(b.drc || 0)));
        }, 0);
        const avgDrc = buyWeightLatex > 0 ? truncateOneDecimal(totalWeightedDrc / buyWeightLatex) : 0;

        return { currentStock: currentStockLatex, cupLumpStock: currentStockCupLump, avgDrc };
    }, [serverStockMetrics, allBuys, records, chemicalUsage]);

    // Template config for printing
    const templateConfig = React.useMemo(() => {
        let config = { activeTemplateId: null, defaultTemplateId: null, templates: [] };
        try {
            const rawConfig = settings.paperSlipConfig;
            if (rawConfig) {
                const parsed = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
                if (parsed.templates) config = parsed;
            }
        } catch (e) {
            console.error("Error parsing paperSlipConfig:", e);
        }
        return config;
    }, [settings.paperSlipConfig]);

    const activeTemplate = React.useMemo(() => {
        const idToUse = selectedTemplateId || templateConfig.activeTemplateId || templateConfig.defaultTemplateId;
        const template = templateConfig.templates.find(t => t.id === idToUse);
        if (template) return template;
        return {
            id: 'default',
            name: 'Default',
            showLogo: true, showStoreName: true, showAddress: true, showPhone: true,
            showBillType: true, showBillId: true, showDateTime: true, showSelectedDate: true, showRecordingTime: true, showFarmerName: true,
            showRawWeight: true, showBucketWeight: true, showNetWeight: true, showDrc: true,
            showDryWeight: true, showBasePrice: true, showBonusDrc: true, showBonusFsc: true,
            showBonusMember: true, showActualPrice: true, showSplits: true,
            footerText: '=== ขอบคุณที่ใช้บริการ ===',
            headerTitle: 'ใบส่งสินค้า / DELIVERY NOTE',
            labels: {}
        };
    }, [selectedTemplateId, templateConfig]);

    // Auto Adjust Stock logic
    useEffect(() => {
        if (isAutoAdjust && watchWeight !== undefined && watchRubberType !== 'cup_lump') {
            const currentStock = stockMetrics.currentStock;
            const weightValue = Number(watchWeight) || 0;
            const diff = truncateOneDecimal(currentStock - weightValue);
            if (diff > 0) { setLossSign('minus'); setValue('lossWeight', diff); }
            else if (diff < 0) { setLossSign('plus'); setValue('lossWeight', Math.abs(diff)); }
            else { setValue('lossWeight', 0); }
        }
    }, [isAutoAdjust, watchWeight, watchRubberType, stockMetrics.currentStock, setValue]);

    const populateFormWithTarget = (targetData, globalBuyerName) => {
        if (!targetData) return;

        if (targetData.rubberType) {
            setValue('rubberType', targetData.rubberType);
        }
        if (targetData.date) {
            setValue('date', targetData.date);
        }

        const buyer = targetData.buyerName || globalBuyerName;
        if (buyer) {
            setFactorySearch(buyer);
            setValue('buyerName', buyer);
            const matchedFac = factories.find(f => 
                f.name?.toLowerCase().includes(buyer.toLowerCase()) || 
                buyer.toLowerCase().includes(f.name?.toLowerCase())
            );
            if (matchedFac) setValue('factoryId', matchedFac.id);
        }

        if (targetData.licensePlate) {
            const scannedPlate = String(targetData.licensePlate).trim();
            const cleanScanned = scannedPlate.replace(/[^a-zA-Z0-9ก-ฮ]/g, '').toLowerCase();

            const matchedTruck = trucks.find(t => {
                const plateClean = (t.licensePlate || '').replace(/[^a-zA-Z0-9ก-ฮ]/g, '').toLowerCase();
                return plateClean && (plateClean.includes(cleanScanned) || cleanScanned.includes(plateClean));
            });

            if (matchedTruck) {
                setValue('truckInfo', matchedTruck.licensePlate);
                setValue('truckId', matchedTruck.id);
                setTruckSearch(matchedTruck.licensePlate);
                setTruckMatchStatus({ matched: true, truck: matchedTruck, searchedPlate: scannedPlate });
            } else {
                setValue('truckInfo', scannedPlate);
                setValue('truckId', '');
                setTruckSearch(scannedPlate);
                setTruckMatchStatus({ matched: false, truck: null, searchedPlate: scannedPlate });
            }
        } else {
            setTruckMatchStatus(null);
        }

        if (targetData.netWeight && targetData.netWeight > 0) setValue('weight', targetData.netWeight);
        if (targetData.drc && targetData.drc > 0) setValue('drc', targetData.drc);
        if (targetData.dryWeight && targetData.dryWeight > 0) setValue('dryWeight', targetData.dryWeight);
        if (targetData.pricePerKg && targetData.pricePerKg > 0) setValue('pricePerKg', targetData.pricePerKg);
        if (targetData.total && targetData.total > 0) setValue('total', targetData.total);
        if (targetData.ticketNo) setValue('note', `ใบชั่งเลขที่: ${targetData.ticketNo}`);

        // Math warning check
        let warningText = null;
        if (targetData.netWeight > 0 && targetData.drc > 0 && targetData.dryWeight > 0) {
            const expectedDry = truncateTwoDecimals((targetData.netWeight * targetData.drc) / 100);
            if (Math.abs(expectedDry - targetData.dryWeight) > 1.5) {
                warningText = `น้ำหนักยางแห้งในเอกสาร (${targetData.dryWeight} กก.) ไม่ตรงกับสูตรคำนวณ (${expectedDry} กก.)`;
            }
        }
        if (targetData.dryWeight > 0 && targetData.pricePerKg > 0 && targetData.total > 0) {
            const expectedTotal = truncateTwoDecimals(targetData.dryWeight * targetData.pricePerKg);
            if (Math.abs(expectedTotal - targetData.total) > 5) {
                warningText = (warningText ? warningText + ' | ' : '') + `ยอดเงินรวม (${targetData.total.toLocaleString()} บาท) ไม่ตรงกับผลคูณราคารวม (${expectedTotal.toLocaleString()} บาท)`;
            }
        }
        setMathWarning(warningText);
    };

    const handleSelectItem = (index) => {
        setSelectedItemIndex(index);
        if (!aiResult) return;
        if (index === null || index === undefined) {
            populateFormWithTarget(aiResult, aiResult.buyerName);
        } else if (aiResult.items && aiResult.items[index]) {
            populateFormWithTarget(aiResult.items[index], aiResult.buyerName);
        }
    };

    // --- AI Image Scan Handler ---
    const handleAIScan = async (file) => {
        if (!file) return;
        setSelectedFile(file);
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        setIsScanning(true);
        const toastId = toast.loading('กำลังใช้ Gemini 3.1 Flash อ่านใบชั่งโรงงาน...');

        try {
            const res = await scanSellReceiptWithAI(file);
            if (res.status === 'success' && res.data) {
                const data = res.data;
                setAiResult(data);
                setModelUsed(res.model || 'Google Gemini 3.1 Flash');
                setSelectedItemIndex(null);

                populateFormWithTarget(data, data.buyerName);

                toast.success('อ่านข้อมูลใบชั่งสำเร็จ!', { id: toastId });
            } else {
                toast.error('ไม่สามารถอ่านข้อมูลใบชั่งได้', { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error('สแกนล้มเหลว: ' + error.message, { id: toastId });
        } finally {
            setIsScanning(false);
        }
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) handleAIScan(file);
    };

    const onSubmit = async (data) => {
        setSubmitting(true);
        const toastId = toast.loading(editingRecord ? 'กำลังอัปเดต...' : 'กำลังบันทึก...');
        
        try {
            let receiptUrl = data.receiptUrl || '';

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
            const isCupLump = data.rubberType === 'cup_lump';
            
            const rawLoss = isCupLump ? 0 : Number(data.lossWeight || 0);
            const lWeight = lossSign === 'plus' ? -rawLoss : rawLoss;
            
            const drc = isCupLump ? 100 : Number(data.drc);
            const price = Number(data.pricePerKg);

            // Use exact dryWeight & total from form if present, else fallback to math calculation
            const dryRubber = (data.dryWeight !== undefined && data.dryWeight !== '' && !isNaN(Number(data.dryWeight)) && Number(data.dryWeight) > 0)
                ? Number(data.dryWeight)
                : (isCupLump ? weight : truncateTwoDecimals((weight * drc) / 100));

            const total = (data.total !== undefined && data.total !== '' && !isNaN(Number(data.total)) && Number(data.total) > 0)
                ? Number(data.total)
                : truncateTwoDecimals(dryRubber * price);

            const payload = {
                ...data,
                weight,
                lossWeight: lWeight,
                drc,
                pricePerKg: price,
                total,
                receiptUrl,
                profitShareAmount: 0 
            };

            let res;
            if (editingRecord) {
                const { id, created_at, timestamp, ...updatePayload } = payload;
                res = await updateRecord('sells', editingRecord.id, updatePayload);
            } else {
                res = await addSellRecord(payload);
            }

            if (res.status === 'success') {
                toast.success(editingRecord ? 'อัปเดตสำเร็จ' : 'บันทึกรายการขายเรียบร้อย', { id: toastId });
                loadData();
                reset({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    lossWeight: '',
                    dryWeight: '',
                    total: '',
                    note: '',
                    rubberType: data.rubberType || 'latex'
                });
                setFactorySearch('');
                setTruckSearch('');
                setStaffSearch('');
                setSelectedFile(null);
                setPreviewUrl(null);
                setEditingRecord(null);
                setAiResult(null);
                setTruckMatchStatus(null);
                setMathWarning(null);
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
            total: record.total,
            note: record.note,
            receiptUrl: record.receiptUrl || '',
            rubberType: record.rubberType || 'latex'
        });

        setLossSign(lSign);
        setFactorySearch(record.buyerName || '');
        setTruckSearch(record.truckInfo || '');
        setPreviewUrl(record.receiptUrl || null);
        const currentStaff = staff.find(s => s.id === record.employeeId);
        setStaffSearch(currentStaff ? currentStaff.name : '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id) => { setConfirmDeleteId(id); };

    const confirmDelete = async () => {
        if (!confirmDeleteId) return;
        const id = confirmDeleteId;
        setConfirmDeleteId(null);
        const toastId = toast.loading('กำลังลบรายการ...');
        try {
            const targetRecord = records.find(r => String(r.id) === String(id));
            const res = await deleteRecord('sells', id);
            if (res.status === 'success') {
                if (targetRecord && targetRecord.receiptUrl) {
                    deleteReceiptFileToDrive(targetRecord.receiptUrl).catch(e => console.warn(e));
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
        setTimeout(() => {
            if (printRef.current) {
                printRecord(printRef.current.innerHTML);
                toast.dismiss(toastId);
                setPrintingRecord(null);
            }
        }, 600);
    };

    const calculateDryRubber = () => {
        const rubberType = watchRubberType;
        const w = truncateOneDecimal(Number(watchWeight) || 0);
        if (rubberType === 'cup_lump') return w;
        if (watchDryWeight !== undefined && watchDryWeight !== '' && !isNaN(Number(watchDryWeight)) && Number(watchDryWeight) > 0) {
            return truncateTwoDecimals(Number(watchDryWeight));
        }
        const d = truncateTwoDecimals(Number(watchDrc) || 0);
        return truncateTwoDecimals((w * d) / 100);
    };

    const calculateTotal = () => {
        if (watchTotal !== undefined && watchTotal !== '' && !isNaN(Number(watchTotal)) && Number(watchTotal) > 0) {
            return truncateTwoDecimals(Number(watchTotal));
        }
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

    return (
        <div className="space-y-6">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: auto; margin: 10mm; }
                    body { margin: 0; padding: 0; background: white; }
                    .print-hidden { display: none !important; }
                    .receipt-content { display: block !important; width: 100%; font-family: 'Noto Sans Thai', sans-serif; color: black; }
                }
            ` }} />

            <DeleteConfirmDialog confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} confirmDelete={confirmDelete} />

            <SellPaperReceipt 
                printingRecord={printingRecord} printRef={printRef} 
                settings={settings} 
                paperSlipConfig={activeTemplate}
                staff={staff}
            />

            <div className="print-hidden space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 opacity-15 flex items-center pr-6 pointer-events-none">
                        <Sparkles size={180} />
                    </div>
                    <div className="relative z-10 max-w-3xl space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black tracking-wider uppercase">
                            <Sparkles size={14} className="animate-spin text-yellow-200" />
                            AI Powered Slip Scanner (Gemini 3.1 Flash)
                        </div>
                        <h1 className="text-3xl font-black">บันทึกขายยางด้วย AI สแกนใบเสร็จ (Sell AI)</h1>
                        <p className="text-orange-100 text-sm">
                            อัปโหลดรูปใบเสร็จหรือตั๋วชั่งโรงงาน ให้ Gemini 3.1 Flash สกัดข้อมูล วันที่, น้ำหนัก, %DRC, ทะเบียนรถ และยอดเงิน เพื่อบันทึกเข้าในระบบอัตโนมัติ
                        </p>
                    </div>
                </div>

                {/* Stock Summary Cards */}
                <SellStockCards stockMetrics={stockMetrics} />

                {/* Main Action Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Pane: Image Scan & Viewer (5 Cols on large screens) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="font-black text-gray-900 flex items-center gap-2 text-base">
                                    <FileText size={18} className="text-orange-500" />
                                    รูปภาพใบเสร็จ / ใบชั่งโรงงาน
                                </h2>
                                {modelUsed && (
                                    <span className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-bold border border-orange-200">
                                        🤖 {modelUsed}
                                    </span>
                                )}
                            </div>

                            {/* Upload Dropzone */}
                            <div className="relative">
                                <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                    isScanning ? 'border-orange-400 bg-orange-50/50' : 
                                    previewUrl ? 'border-gray-300 hover:border-orange-400 bg-gray-50' : 'border-gray-300 hover:border-orange-500 hover:bg-orange-50/30'
                                }`}>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="sr-only" 
                                        onChange={handleFileInput} 
                                        disabled={isScanning}
                                    />
                                    {isScanning ? (
                                        <div className="flex flex-col items-center py-4 space-y-3">
                                            <RefreshCw size={36} className="text-orange-600 animate-spin" />
                                            <div className="text-center">
                                                <p className="font-bold text-gray-800 text-sm">กำลังวิเคราะห์เอกสารใบชั่ง...</p>
                                                <p className="text-xs text-gray-400">Gemini 3.1 Flash กำลังอ่านตัวเลขและสกัดข้อมูล</p>
                                            </div>
                                        </div>
                                    ) : previewUrl ? (
                                        <div className="w-full space-y-3">
                                            <div className="relative overflow-hidden rounded-lg bg-black/5 flex items-center justify-center min-h-[250px] max-h-[400px]">
                                                <img 
                                                    src={previewUrl} 
                                                    alt="Receipt Preview" 
                                                    className="object-contain max-h-[380px] transition-all"
                                                    style={{ 
                                                        transform: `scale(${imageZoom}) rotate(${imageRotation}deg)` 
                                                    }}
                                                />
                                            </div>
                                            {/* Viewer Controls */}
                                            <div className="flex justify-between items-center pt-1 border-t border-gray-200 text-xs text-gray-500">
                                                <div className="flex gap-2">
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); setImageZoom(z => Math.min(z + 0.2, 2.5)); }}
                                                        className="p-1.5 bg-white border rounded hover:bg-gray-50 text-gray-700"
                                                        title="Zoom In"
                                                    >
                                                        <ZoomIn size={14} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); setImageZoom(z => Math.max(z - 0.2, 0.8)); }}
                                                        className="p-1.5 bg-white border rounded hover:bg-gray-50 text-gray-700"
                                                        title="Zoom Out"
                                                    >
                                                        <ZoomOut size={14} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); setImageRotation(r => (r + 90) % 360); }}
                                                        className="p-1.5 bg-white border rounded hover:bg-gray-50 text-gray-700"
                                                        title="Rotate"
                                                    >
                                                        <RotateCw size={14} />
                                                    </button>
                                                </div>
                                                <label className="text-orange-600 hover:underline font-bold cursor-pointer">
                                                    เปลี่ยนรูปใหม่
                                                    <input type="file" accept="image/*" className="sr-only" onChange={handleFileInput} />
                                                </label>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-center space-y-2 py-4">
                                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                <Upload size={24} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">คลิกหรือลากวางรูปใบชั่งที่นี่</p>
                                                <p className="text-xs text-gray-400 mt-1">รองรับ JPG, PNG (ถ่ายภาพจากมือถือได้ทันที)</p>
                                            </div>
                                        </div>
                                    )}
                                </label>
                            </div>

                            {/* Multi-Item Ticket Selector (If receipt contains multiple tickets) */}
                            {aiResult?.items?.length > 0 && (
                                <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-xl space-y-2">
                                    <div className="text-xs font-bold text-orange-900 flex items-center justify-between">
                                        <span>พบ {aiResult.items.length} ตั๋ว/รายการในเอกสารนี้:</span>
                                        <span className="text-[10px] text-orange-600 font-normal">* คลิกเพื่อเลือกเติมข้อมูลในฟอร์ม</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectItem(null)}
                                            className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all border ${
                                                selectedItemIndex === null 
                                                    ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            ยอดรวมทั้งหมด ({aiResult.netWeight?.toLocaleString() || 0} กก.)
                                        </button>
                                        {aiResult.items.map((it, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectItem(idx)}
                                                type="button"
                                                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all border ${
                                                    selectedItemIndex === idx 
                                                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm' 
                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                ตั๋วที่ {idx + 1}: {it.ticketNo || it.licensePlate || `รายการ ${idx + 1}`} ({it.netWeight?.toLocaleString() || 0} กก. - {it.drc}%)
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Truck License Match Status Badge */}
                            {truckMatchStatus && (
                                <div className={`p-3 rounded-xl border text-xs font-medium space-y-1 ${
                                    truckMatchStatus.matched 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                        : 'bg-amber-50 border-amber-200 text-amber-900'
                                }`}>
                                    <div className="flex items-center gap-1.5 font-bold">
                                        {truckMatchStatus.matched ? (
                                            <>
                                                <CheckCircle2 size={16} className="text-emerald-600" />
                                                <span>พบรถในระบบ: {truckMatchStatus.truck.licensePlate} ({truckMatchStatus.truck.brand || 'รถขนส่ง'})</span>
                                            </>
                                        ) : (
                                            <>
                                                <ShieldAlert size={16} className="text-amber-600" />
                                                <span>ทะเบียนรถ "{truckMatchStatus.searchedPlate}" ยังไม่มีในระบบ</span>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-[11px] opacity-80 pl-5">
                                        {truckMatchStatus.matched 
                                            ? '* เลือกรถในระบบอัตโนมัติแล้ว' 
                                            : '* ตรวจสอบข้อมูลเฉพาะรถที่มีในระบบเท่านั้น กรุณาเลือกรถที่มี หรือเพิ่มรถคันนี้ลงระบบก่อน'}
                                    </p>
                                </div>
                            )}

                            {/* Math Warning Alert */}
                            {mathWarning && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold text-red-700">
                                        <AlertTriangle size={16} />
                                        <span>ข้อสังเกตการคำนวณจาก AI</span>
                                    </div>
                                    <p className="text-[11px] text-red-600 pl-5">{mathWarning}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Sell Form (7 Cols on large screens) */}
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <Truck className="mr-2 text-orange-500" size={20} />
                                {editingRecord ? 'แก้ไขรายการขาย' : 'กรอกและยืนยันข้อมูลขายยาง'}
                            </h2>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="flex p-1 bg-gray-100 rounded-lg">
                                    <button 
                                        type="button"
                                        onClick={() => { setValue('rubberType', 'latex'); setIsAutoAdjust(true); }}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${watchRubberType === 'latex' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        น้ำยางสด
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { setValue('rubberType', 'cup_lump'); setIsAutoAdjust(false); setValue('lossWeight', '0'); }}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${watchRubberType === 'cup_lump' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        ขี้ยาง
                                    </button>
                                </div>
                                <input type="hidden" {...register('rubberType')} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">วันที่ส่งน้ำยาง <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            {...register('date', { required: 'กรุณาระบุวันที่ขาย' })} 
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${errors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        />
                                        {errors.date && <p className="text-red-500 text-xs mt-1 font-medium">{errors.date.message}</p>}
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
                                                placeholder="ค้นหาชื่อโรงงาน / ผู้ซื้อ..." 
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 cursor-pointer" 
                                            />
                                            {showFactoryResults && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                                    {factories.filter(f => 
                                                        !factorySearch || f.name?.toLowerCase().includes(factorySearch.toLowerCase())
                                                    ).map(f => (
                                                        <div 
                                                            key={f.id}
                                                            className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                            onClick={() => {
                                                                setValue('buyerName', f.name);
                                                                setValue('factoryId', f.id);
                                                                setFactorySearch(f.name);
                                                                setShowFactoryResults(false);
                                                            }}
                                                        >
                                                            <div className="font-bold text-gray-900">{f.name}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <input type="hidden" {...register('buyerName', { required: true })} />
                                        <input type="hidden" {...register('factoryId')} />
                                    </div>
                                </div>

                                {watchRubberType === 'latex' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                รถขนส่ง (เฉพาะในระบบ)
                                                {truckMatchStatus?.matched && <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 rounded">MATCHED</span>}
                                            </label>
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
                                                    placeholder="เลือกทะเบียนรถในระบบ..." 
                                                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500 cursor-pointer ${
                                                        truckMatchStatus && !truckMatchStatus.matched ? 'border-amber-400 bg-amber-50/30' : 'border-gray-300'
                                                    }`} 
                                                />
                                                {showTruckResults && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                                        {trucks.filter(t => 
                                                            !truckSearch || 
                                                            t.licensePlate?.toLowerCase().includes(truckSearch.toLowerCase()) || 
                                                            t.brand?.toLowerCase().includes(truckSearch.toLowerCase())
                                                        ).map(t => (
                                                            <div 
                                                                key={t.id}
                                                                className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                                onClick={() => {
                                                                    setValue('truckInfo', t.licensePlate);
                                                                    setValue('truckId', t.id);
                                                                    setTruckSearch(t.licensePlate);
                                                                    setShowTruckResults(false);
                                                                    setTruckMatchStatus({ matched: true, truck: t, searchedPlate: t.licensePlate });
                                                                }}
                                                            >
                                                                <div className="font-bold text-gray-900">{t.licensePlate} ({t.brand})</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <input type="hidden" {...register('truckInfo')} />
                                            <input type="hidden" {...register('truckId')} />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">พนักงานรับผิดชอบ</label>
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
                                                    placeholder="เลือกชื่อพนักงาน..." 
                                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 cursor-pointer" 
                                                />
                                                {showStaffResults && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                                                        {staff.filter(s => !staffSearch || s.name?.toLowerCase().includes(staffSearch.toLowerCase())).map(s => (
                                                            <div 
                                                                key={s.id}
                                                                className="px-4 py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50"
                                                                onClick={() => {
                                                                    setValue('employeeId', s.id);
                                                                    setStaffSearch(s.name);
                                                                    setShowStaffResults(false);
                                                                }}
                                                            >
                                                                <div className="font-bold text-gray-900">{s.name}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <input type="hidden" {...register('employeeId')} />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-bold text-gray-700">น้ำหนักขายสุทธิ (กก.)</label>
                                            <button 
                                                type="button"
                                                onClick={() => setValue('weight', watchRubberType === 'cup_lump' ? stockMetrics.cupLumpStock : stockMetrics.currentStock)}
                                                className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold hover:bg-gray-200"
                                            >
                                                สต๊อก: {(watchRubberType === 'cup_lump' ? stockMetrics.cupLumpStock : stockMetrics.currentStock).toLocaleString()} กก.
                                            </button>
                                        </div>
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            {...register('weight', { 
                                                required: 'กรุณาระบุน้ำหนักขาย',
                                                min: { value: 0.1, message: 'น้ำหนักต้องมากกว่า 0' }
                                            })} 
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500 font-bold ${errors.weight ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                        />
                                        {errors.weight && <p className="text-red-500 text-[10px] mt-1">{errors.weight.message}</p>}
                                    </div>

                                    {watchRubberType === 'latex' && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-sm font-medium text-gray-700">DRC (%)</label>
                                                <button 
                                                    type="button"
                                                    onClick={() => setValue('drc', stockMetrics.avgDrc)}
                                                    className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-bold hover:bg-orange-100"
                                                >
                                                    เฉลี่ย: {stockMetrics.avgDrc.toFixed(2)}%
                                                </button>
                                            </div>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                {...register('drc', { 
                                                    required: 'กรุณาระบุเปอร์เซ็นต์ DRC',
                                                    min: { value: 1, message: 'ขั้นต่ำ 1%' },
                                                    max: { value: 100, message: 'สูงสุด 100%' }
                                                })} 
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-orange-500 focus:border-orange-500 ${errors.drc ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} 
                                            />
                                            {errors.drc && <p className="text-red-500 text-[10px] mt-1">{errors.drc.message}</p>}
                                        </div>
                                    )}
                                </div>

                                {watchRubberType === 'latex' && (
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs font-bold text-gray-700">ปรับปรุงสต๊อก (Loss/Gain Adjustment)</label>
                                            <button 
                                                type="button"
                                                onClick={() => setIsAutoAdjust(!isAutoAdjust)}
                                                className={`px-2 py-0.5 rounded text-[10px] font-black ${isAutoAdjust ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                                            >
                                                {isAutoAdjust ? 'AUTO ON' : 'AUTO OFF'}
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <div className={`absolute inset-y-0 left-0 pl-3 flex items-center font-bold ${lossSign === 'plus' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {lossSign === 'plus' ? '+' : '-'}
                                            </div>
                                            <input 
                                                type="number" 
                                                step="0.1" 
                                                {...register('lossWeight')} 
                                                readOnly={isAutoAdjust}
                                                placeholder="น้ำหนักปรับยอด (กก.)"
                                                className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-sm bg-white font-bold" 
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {watchRubberType === 'cup_lump' ? 'ราคาขายขี้ยาง (บาท/กก.)' : 'ราคาขายน้ำยาง (บาท/กก. ยางแห้ง)'} <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        {...register('pricePerKg', { required: 'กรุณาระบุราคาขาย', min: { value: 0.1, message: 'ราคาต้องมากกว่า 0' } })} 
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 font-bold" 
                                    />
                                    {errors.pricePerKg && <p className="text-red-500 text-xs mt-1">{errors.pricePerKg.message}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                                    <input type="text" placeholder="เลขที่ตั๋ว หรือข้อมูลเพิ่มเติม..." {...register('note')} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                                </div>

                                {/* Financial Summary & Exact AI Overrides */}
                                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-orange-800">
                                            {watchRubberType === 'cup_lump' ? 'น้ำหนักขี้ยางรวม:' : 'น้ำหนักยางแห้งรวม (กก.):'}
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                step="0.01"
                                                {...register('dryWeight')}
                                                placeholder={calculateDryRubber().toString()}
                                                className="w-32 px-2.5 py-1 text-right border border-orange-300 rounded-lg text-sm font-bold text-orange-900 bg-white focus:ring-2 focus:ring-orange-500"
                                            />
                                            <span className="text-sm font-bold text-orange-900">กก.</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                                        <label className="text-sm font-bold text-orange-800">ยอดเงินรวมสุทธิ (บาท):</label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xl font-black text-orange-900">฿</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                {...register('total')}
                                                placeholder={calculateTotal().toString()}
                                                className="w-44 px-2.5 py-1 text-right border border-orange-300 rounded-lg text-xl font-black text-orange-900 bg-white focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-2">
                                    {editingRecord && (
                                        <button 
                                            type="button"
                                            onClick={() => { 
                                                setEditingRecord(null); 
                                                reset(); 
                                                setFactorySearch('');
                                                setTruckSearch('');
                                                setStaffSearch('');
                                                setPreviewUrl(null);
                                                setSelectedFile(null);
                                            }}
                                            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                                        >
                                            ยกเลิก
                                        </button>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="flex-[2] bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors shadow-md disabled:opacity-50 text-base"
                                    >
                                        {isSubmitting ? 'กำลังบันทึก...' : (editingRecord ? 'อัปเดตรายการขาย' : 'บันทึกรายการขาย')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Sell History Table */}
                <div className="pt-6">
                    <SellTable 
                        filteredRecords={filteredRecords} searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm} selectedDate={selectedDate}
                        setSelectedDate={setSelectedDate} handleEdit={handleEdit}
                        handleDelete={handleDelete} handlePrint={handlePrint}
                        isLoading={isLoading} user={user}
                    />
                </div>
            </div>
        </div>
    );
};

export default SellAI;
