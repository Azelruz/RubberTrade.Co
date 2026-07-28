import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { 
    fetchBuyHistory, 
    fetchSellHistory, 
    getSettings,
    fetchFarmers,
    fetchMemberTypes,
    fetchFactories
} from '../services/apiService';
import { calculateDrcBonus } from '../utils/calculations';
import { printRecord } from '../utils/PrintService';

// Sub-components
import HistoryHeader from './history/HistoryHeader';
import HistorySummary from './history/HistorySummary';
import HistoryTable from './history/HistoryTable';
import HistoryESlipModal from './history/HistoryESlipModal';
import HistoryPrintTemplates from './history/HistoryPrintTemplates';

export const TransactionHistory = () => {
    const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 50,
        totalCount: 0,
        totalPages: 0
    });
    const [summary, setSummary] = useState({
        totalBills: 0,
        totalWeight: 0,
        totalAmount: 0
    });
    
    const [settings, setSettings] = useState({});
    const [drcBonuses, setDrcBonuses] = useState([]);
    
    const [filters, setFilters] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        searchTerm: '',
        rubberType: '',
        minWeight: '',
        maxWeight: '',
        minTotal: '',
        maxTotal: '',
        farmerId: '',
        factoryId: '',
        farmerStatus: '',
        employeeStatus: ''
    });

    // Debounced search term
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [printingReceipt, setPrintingReceipt] = useState(null);
    const [printingSellRecord, setPrintingSellRecord] = useState(null);
    const [viewingEslip, setViewingEslip] = useState(null);
    const [farmers, setFarmers] = useState([]);
    const [factories, setFactories] = useState([]);
    const [memberTypes, setMemberTypes] = useState([]);
    const buyPrintRef = useRef(null);
    const sellPrintRef = useRef(null);

    const truncateOneDecimal = (num) => {
        return Math.trunc(num * 10) / 10;
    };

    // Load initial lookup data
    useEffect(() => {
        loadInitialData();
    }, []);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(filters.searchTerm);
            setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [filters.searchTerm]);

    // Load records when dependencies change
    useEffect(() => {
        loadRecords();
    }, [
        activeTab, filters.startDate, filters.endDate, debouncedSearch, pagination.page,
        filters.rubberType, filters.minWeight, filters.maxWeight, filters.minTotal, filters.maxTotal,
        filters.farmerId, filters.factoryId, filters.farmerStatus, filters.employeeStatus
    ]);

    const loadInitialData = async () => {
        try {
            const [settingsRes, farmersRes, mtRes, factoriesRes] = await Promise.all([
                getSettings(),
                fetchFarmers(),
                fetchMemberTypes(),
                fetchFactories()
            ]);

            if (settingsRes.status === 'success') {
                setSettings(settingsRes.data);
                if (settingsRes.data.drc_bonuses) {
                    try { setDrcBonuses(JSON.parse(settingsRes.data.drc_bonuses)); } catch(e) {}
                } else if (settingsRes.data.drcBonuses) {
                    try { setDrcBonuses(JSON.parse(settingsRes.data.drcBonuses)); } catch(e) {}
                }
            }

            if (farmersRes) setFarmers(farmersRes);
            if (mtRes) setMemberTypes(mtRes);
            if (factoriesRes) setFactories(factoriesRes);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    };

    const loadRecords = async () => {
        setLoading(true);
        try {
            const params = {
                startDate: filters.startDate,
                endDate: filters.endDate,
                search: debouncedSearch,
                page: pagination.page,
                pageSize: pagination.pageSize,
                rubberType: filters.rubberType,
                minWeight: filters.minWeight,
                maxWeight: filters.maxWeight,
                minTotal: filters.minTotal,
                maxTotal: filters.maxTotal,
                farmerId: filters.farmerId,
                factoryId: filters.factoryId,
                farmerStatus: filters.farmerStatus,
                employeeStatus: filters.employeeStatus
            };

            const res = activeTab === 'buy' 
                ? await fetchBuyHistory(params)
                : await fetchSellHistory(params);
            
            if (res.results) {
                setRecords(res.results);
                if (res.pagination) setPagination(res.pagination);
                if (res.summary) setSummary(res.summary);
            } else {
                setRecords([]);
            }
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        if (name === 'startDate' || name === 'endDate') {
            setPagination(prev => ({ ...prev, page: 1 }));
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleCloseEslip = () => setViewingEslip(null);

    const handlePrintBuy = (record) => {
        setPrintingReceipt(record);
        setTimeout(() => {
            if (buyPrintRef.current) {
                printRecord(buyPrintRef.current.innerHTML);
                setPrintingReceipt(null);
            }
        }, 500);
    };

    const handlePrintSell = (record) => {
        setPrintingSellRecord(record);
        setTimeout(() => {
            if (sellPrintRef.current) {
                printRecord(sellPrintRef.current.innerHTML);
                setPrintingSellRecord(null);
            }
        }, 500);
    };

    const [allPrintRecords, setAllPrintRecords] = useState([]);

    const reportRecords = useMemo(() => {
        return allPrintRecords.length > 0 ? allPrintRecords : records;
    }, [allPrintRecords, records]);

    const totalDryWeight = useMemo(() => {
        return records.reduce((sum, r) => {
            if (r.dry_weight !== undefined && r.dry_weight !== null) return sum + Number(r.dry_weight);
            if (r.dryWeight !== undefined && r.dryWeight !== null) return sum + Number(r.dryWeight);
            if (r.dryRubber !== undefined && r.dryRubber !== null) return sum + Number(r.dryRubber);
            
            const weight = Number(r.weight || 0);
            const bucketWeight = Number(r.bucket_weight ?? r.bucketWeight ?? 0);
            const netWeight = Math.max(0, weight - bucketWeight);
            
            const isCupLump = (r.rubberType === 'cup_lump' || r.rubber_type === 'cup_lump');
            if (isCupLump) return sum + netWeight;
            
            const drc = Number(r.drc || 0);
            return sum + (Math.trunc(((netWeight * drc) / 100) * 10) / 10);
        }, 0);
    }, [records]);

    const enhancedSummary = useMemo(() => ({
        ...summary,
        totalDryWeight
    }), [summary, totalDryWeight]);

    const reportSummary = useMemo(() => {
        const totalBills = reportRecords.length;
        const totalWeight = reportRecords.reduce((sum, r) => sum + Math.max(0, Number(r.weight || 0) - Number(r.bucket_weight ?? r.bucketWeight ?? 0)), 0);
        const totalDryWeight = reportRecords.reduce((sum, r) => {
            if (r.dry_weight !== undefined && r.dry_weight !== null) return sum + Number(r.dry_weight);
            if (r.dryWeight !== undefined && r.dryWeight !== null) return sum + Number(r.dryWeight);
            if (r.dryRubber !== undefined && r.dryRubber !== null) return sum + Number(r.dryRubber);
            
            const weight = Number(r.weight || 0);
            const bucketWeight = Number(r.bucket_weight ?? r.bucketWeight ?? 0);
            const netWeight = Math.max(0, weight - bucketWeight);
            
            const isCupLump = (r.rubberType === 'cup_lump' || r.rubber_type === 'cup_lump');
            if (isCupLump) return sum + netWeight;
            
            const drc = Number(r.drc || 0);
            return sum + (Math.trunc(((netWeight * drc) / 100) * 10) / 10);
        }, 0);
        const totalAmount = reportRecords.reduce((sum, r) => sum + Number(r.total || 0), 0);

        const validDrcs = reportRecords.filter(r => Number(r.drc) > 0);
        const avgDrc = validDrcs.length > 0 ? (validDrcs.reduce((sum, r) => sum + Number(r.drc), 0) / validDrcs.length) : 0;

        const sumPrice = reportRecords.reduce((sum, r) => {
            const price = Number(activeTab === 'buy' 
                ? (r.actual_price ?? r.actualPrice ?? r.price_per_kg ?? r.pricePerKg ?? 0) 
                : (r.pricePerKg ?? r.price_per_kg ?? 0));
            return sum + price;
        }, 0);
        const avgPrice = reportRecords.length > 0 ? (sumPrice / reportRecords.length) : 0;

        return { totalBills, totalWeight, totalDryWeight, totalAmount, avgDrc, avgPrice };
    }, [reportRecords, activeTab]);

    const handlePrintReport = async () => {
        const toastId = toast.loading('กำลังจัดเตรียมรายการทุกหน้าสำหรับพิมพ์...');
        try {
            const params = {
                startDate: filters.startDate,
                endDate: filters.endDate,
                search: debouncedSearch,
                page: 1,
                pageSize: 10000, // Fetch all matching items without pagination limit
                rubberType: filters.rubberType,
                minWeight: filters.minWeight,
                maxWeight: filters.maxWeight,
                minTotal: filters.minTotal,
                maxTotal: filters.maxTotal,
                farmerId: filters.farmerId,
                factoryId: filters.factoryId,
                farmerStatus: filters.farmerStatus,
                employeeStatus: filters.employeeStatus
            };

            const res = activeTab === 'buy' 
                ? await fetchBuyHistory(params)
                : await fetchSellHistory(params);

            if (res && res.results && res.results.length > 0) {
                setAllPrintRecords(res.results);
            } else {
                setAllPrintRecords(records);
            }
            toast.dismiss(toastId);

            setTimeout(() => {
                window.print();
            }, 300);
        } catch (e) {
            toast.dismiss(toastId);
            setAllPrintRecords(records);
            window.print();
        }
    };

    const paperSlipConfig = useMemo(() => {
        try {
            const rawConfig = settings.paperSlipConfig;
            if (rawConfig) {
                return typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
            }
        } catch (e) {
            console.error("Error parsing paperSlipConfig in History:", e);
        }
        return null;
    }, [settings.paperSlipConfig]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                    html, body, #root, main, div {
                        overflow: visible !important;
                        height: auto !important;
                        max-height: none !important;
                    }
                    .receipt-content {
                        width: 100%;
                        max-width: 76mm;
                        padding: 2mm;
                        margin: 0;
                        font-family: 'Noto Sans Thai', sans-serif;
                    }
                    .no-print {
                        display: none !important;
                    }
                    tr {
                        page-break-inside: avoid;
                    }
                    thead {
                        display: table-header-group;
                    }
                    tfoot {
                        display: table-footer-group;
                    }
                }
            ` }} />

            <HistoryHeader 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                filters={filters} 
                handleFilterChange={handleFilterChange} 
                farmers={farmers}
                factories={factories}
                setFilters={setFilters}
                onPrintReport={handlePrintReport}
            />

            <HistorySummary totals={enhancedSummary} />

            <HistoryTable 
                loading={loading} 
                filteredRecords={records} 
                activeTab={activeTab} 
                handlePrintBuy={handlePrintBuy} 
                handlePrintSell={handlePrintSell} 
                setViewingEslip={setViewingEslip} 
                pagination={pagination}
                handlePageChange={handlePageChange}
            />

            <HistoryPrintTemplates 
                printingReceipt={printingReceipt}
                printingSellRecord={printingSellRecord}
                buyPrintRef={buyPrintRef}
                sellPrintRef={sellPrintRef}
                settings={settings}
                farmers={farmers}
                memberTypes={memberTypes}
                drcBonuses={drcBonuses}
                calculateDrcBonus={calculateDrcBonus}
                truncateOneDecimal={truncateOneDecimal}
                paperSlipConfig={paperSlipConfig}
            />

            <HistoryESlipModal 
                viewingEslip={viewingEslip}
                handleCloseEslip={handleCloseEslip}
                activeTab={activeTab}
                settings={settings}
                farmers={farmers}
                memberTypes={memberTypes}
                paperSlipConfig={paperSlipConfig}
            />

            {/* A4 Printable Report View (Visible only during window.print()) */}
            <div className="hidden print:block text-black p-4 font-sans bg-white">
                <div className="text-center border-b-2 border-black pb-3 mb-4">
                    <h1 className="text-2xl font-bold">{settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา'}</h1>
                    {settings.address && <p className="text-xs">{settings.address}</p>}
                    {settings.phone && <p className="text-xs">โทร: {settings.phone}</p>}
                    <h2 className="text-lg font-bold mt-2 underline">
                        รายงานประวัติการ{activeTab === 'buy' ? 'รับซื้อยาง' : 'ขายยาง'}
                    </h2>
                    <p className="text-xs mt-1 font-semibold">
                        ประจำวันที่: {filters.startDate ? format(parseISO(filters.startDate), 'dd/MM/yyyy', { locale: th }) : '-'} ถึง {filters.endDate ? format(parseISO(filters.endDate), 'dd/MM/yyyy', { locale: th }) : '-'}
                        {filters.searchTerm && ` | คำค้นหา: "${filters.searchTerm}"`}
                    </p>
                </div>

                {/* Summary Box */}
                <div className="grid grid-cols-4 gap-2 mb-4 p-3 border border-black rounded bg-gray-50 text-center text-xs">
                    <div>
                        <span className="block text-[10px] font-bold text-gray-600">รายการทั้งหมด</span>
                        <span className="text-sm font-bold">{reportSummary.totalBills} รายการ</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-600">น้ำหนักสุทธิรวม</span>
                        <span className="text-sm font-bold">{reportSummary.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-600">ยางแห้งรวม</span>
                        <span className="text-sm font-bold">{reportSummary.totalDryWeight.toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-gray-600">ยอดรวมเงินสุทธิ</span>
                        <span className="text-sm font-bold">฿{reportSummary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 1 })}</span>
                    </div>
                </div>

                {/* Detail Table */}
                <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black text-[11px]">
                            <th className="border border-black p-1.5 text-center">ลำดับ</th>
                            <th className="border border-black p-1.5 text-left">วันที่</th>
                            <th className="border border-black p-1.5 text-left">{activeTab === 'buy' ? 'เกษตรกร' : 'โรงงาน/ผู้ซื้อ'}</th>
                            <th className="border border-black p-1.5 text-center">ประเภท</th>
                            <th className="border border-black p-1.5 text-right">น้ำหนักสุทธิ (กก.)</th>
                            <th className="border border-black p-1.5 text-center">% DRC</th>
                            <th className="border border-black p-1.5 text-right">ยางแห้ง (กก.)</th>
                            <th className="border border-black p-1.5 text-right">ราคา/กก. (฿)</th>
                            <th className="border border-black p-1.5 text-right">ยอดรวม (฿)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportRecords.map((r, index) => {
                            const weight = Number(r.weight || 0);
                            const bucketWeight = Number(r.bucket_weight ?? r.bucketWeight ?? 0);
                            const netWeight = Math.max(0, weight - bucketWeight);
                            const isCupLump = (r.rubberType === 'cup_lump' || r.rubber_type === 'cup_lump');
                            const dryWeight = isCupLump ? netWeight : (r.dry_weight ?? r.dryWeight ?? ((netWeight * (r.drc || 0)) / 100));
                            const price = Number(activeTab === 'buy' ? (r.actual_price ?? r.actualPrice ?? r.price_per_kg ?? r.pricePerKg ?? 0) : (r.pricePerKg ?? r.price_per_kg ?? 0));
                            
                            return (
                                <tr key={r.id} className="border-b border-black">
                                    <td className="border border-black p-1.5 text-center">{index + 1}</td>
                                    <td className="border border-black p-1.5">{r.date ? format(parseISO(r.date), 'dd/MM/yyyy', { locale: th }) : '-'}</td>
                                    <td className="border border-black p-1.5 font-semibold">{activeTab === 'buy' ? (r.farmerName || 'ลูกค้าทั่วไป') : r.buyerName}</td>
                                    <td className="border border-black p-1.5 text-center">{isCupLump ? 'ขี้ยาง' : 'น้ำยาง'}</td>
                                    <td className="border border-black p-1.5 text-right">{netWeight.toFixed(1)}</td>
                                    <td className="border border-black p-1.5 text-center">{Number(r.drc || 0).toFixed(1)}%</td>
                                    <td className="border border-black p-1.5 text-right font-semibold">{Number(dryWeight).toFixed(1)}</td>
                                    <td className="border border-black p-1.5 text-right">{price.toFixed(1)}</td>
                                    <td className="border border-black p-1.5 text-right font-bold">{Number(r.total || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-100 font-bold border-t-2 border-black">
                            <td colSpan="4" className="border border-black p-1.5 text-center">รวมทั้งสิ้น ({reportRecords.length} รายการ) / เฉลี่ยสุทธิ</td>
                            <td className="border border-black p-1.5 text-right">{reportSummary.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                            <td className="border border-black p-1.5 text-center bg-blue-50">
                                <span className="block text-[8px] text-gray-500 font-normal">เฉลี่ย %DRC</span>
                                <span>{reportSummary.avgDrc.toFixed(1)}%</span>
                            </td>
                            <td className="border border-black p-1.5 text-right bg-emerald-50">{reportSummary.totalDryWeight.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                            <td className="border border-black p-1.5 text-right bg-amber-50">
                                <span className="block text-[8px] text-gray-500 font-normal">เฉลี่ย ราคา/กก.</span>
                                <span>฿{reportSummary.avgPrice.toFixed(2)}</span>
                            </td>
                            <td className="border border-black p-1.5 text-right text-xs">฿{reportSummary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                        </tr>
                    </tfoot>
                </table>

                {/* Signatures */}
                <div className="flex justify-between items-center mt-10 pt-4 text-xs text-center">
                    <div>
                        <p className="mb-6">ลงชื่อ ...........................................................</p>
                        <p className="font-bold">( ........................................................... )</p>
                        <p className="text-gray-600 mt-0.5 text-[10px]">ผู้จัดทำรายงาน</p>
                    </div>
                    <div>
                        <p className="mb-6">ลงชื่อ ...........................................................</p>
                        <p className="font-bold">( ........................................................... )</p>
                        <p className="text-gray-600 mt-0.5 text-[10px]">ผู้ตรวจสอบ / ผู้จัดการ</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionHistory;
