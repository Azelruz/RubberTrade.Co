import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { 
    addSellRecord, fetchSellRecords, deleteRecord, updateRecord, fetchFarmers, fetchStaff, 
    fetchFactories, fetchTrucks, isCached, getSettings, saveReceiptImageToDrive, 
    deleteReceiptFileToDrive, fetchBuyRecords, fetchChemicalUsage 
} from '../services/apiService';
import { truncateOneDecimal, truncateTwoDecimals } from '../utils/calculations';
import { useAuth } from '../context/AuthContext';

// Sub-components
import SellStockCards from './sell/SellStockCards';
import SellForm from './sell/SellForm';
import SellTable from './sell/SellTable';
import SellPaperReceipt from './sell/SellPaperReceipt';
import DeleteConfirmDialog from './buy/DeleteConfirmDialog'; // Reusing from buy folder

export const Sell = () => {
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
    const [lossSign, setLossSign] = useState('minus'); 
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
            receiptUrl: '',
            rubberType: 'latex'
        }
    });

    const watchRubberType = watch('rubberType');
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
         } finally {
             setIsLoading(false);
         }
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
            const dryRubber = isCupLump ? weight : truncateTwoDecimals((weight * drc) / 100);
            const total = truncateTwoDecimals(dryRubber * price);

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
                toast.success(editingRecord ? 'อัปเดตสำเร็จ' : 'บันทึกสำเร็จ', { id: toastId });
                loadData();
                reset({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    lossWeight: '',
                    note: '',
                    rubberType: data.rubberType || 'latex'
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
        const rubberType = watchRubberType;
        const w = truncateOneDecimal(Number(watchWeight) || 0);
        if (rubberType === 'cup_lump') return w;
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
    }, [allBuys, records, chemicalUsage]);

    // Auto Adjust Logic
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

            <SellPaperReceipt printingRecord={printingRecord} printRef={printRef} settings={settings} />

            <div className="print-hidden space-y-6">
                <SellStockCards stockMetrics={stockMetrics} />

                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">บันทึกการขายยางพารา</h1>
                    <p className="text-gray-500 mb-6">บันทึกข้อมูลการขายยางให้โรงงาน/ปลายทาง และแนบหลักฐาน</p>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <SellForm 
                            register={register} handleSubmit={handleSubmit} onSubmit={onSubmit}
                            watch={watch} setValue={setValue} reset={reset} errors={errors}
                            editingRecord={editingRecord} setEditingRecord={setEditingRecord}
                            isSubmitting={isSubmitting} watchRubberType={watchRubberType}
                            watchWeight={watchWeight} watchDrc={watchDrc} watchPricePerKg={watchPricePerKg}
                            factorySearch={factorySearch} setFactorySearch={setFactorySearch}
                            showFactoryResults={showFactoryResults} setShowFactoryResults={setShowFactoryResults}
                            truckSearch={truckSearch} setTruckSearch={setTruckSearch}
                            showTruckResults={showTruckResults} setShowTruckResults={setShowTruckResults}
                            staffSearch={staffSearch} setStaffSearch={setStaffSearch}
                            showStaffResults={showStaffResults} setShowStaffResults={setShowStaffResults}
                            factories={factories} trucks={trucks} staff={staff}
                            lossSign={lossSign} setLossSign={setLossSign}
                            isAutoAdjust={isAutoAdjust} setIsAutoAdjust={setIsAutoAdjust}
                            stockMetrics={stockMetrics} calculateDryRubber={calculateDryRubber}
                            calculateTotal={calculateTotal} previewUrl={previewUrl}
                            setPreviewUrl={setPreviewUrl} setSelectedFile={setSelectedFile}
                            handleImageUpload={handleImageUpload}
                        />

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
        </div>
    );
};

export default Sell;
