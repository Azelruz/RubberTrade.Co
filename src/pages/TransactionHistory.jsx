import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Search, FileText, Printer, Eye, Calendar, 
    RefreshCw, User, Package, ChevronDown, Leaf, Coins, X
} from 'lucide-react';
import { format, subDays, parseISO, addYears } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { 
    fetchBuyRecords, 
    fetchSellRecords, 
    getSettings,
    fetchFarmers,
    fetchMemberTypes
} from '../services/apiService';
import { platform } from '../utils/platform';
import { calculateDrcBonus } from '../utils/calculations';
import { printRecord } from '../utils/PrintService';

export const TransactionHistory = () => {
    const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [settings, setSettings] = useState({});
    const [drcBonuses, setDrcBonuses] = useState([]);
    
    const [filters, setFilters] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        searchTerm: ''
    });

    const [printingReceipt, setPrintingReceipt] = useState(null);
    const [printingSellRecord, setPrintingSellRecord] = useState(null);
    const [viewingEslip, setViewingEslip] = useState(null);
    const [farmers, setFarmers] = useState([]);
    const [memberTypes, setMemberTypes] = useState([]);
    const buyPrintRef = useRef(null);
    const sellPrintRef = useRef(null);

    const truncateOneDecimal = (num) => {
        return Math.trunc(num * 10) / 10;
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        loadRecords();
    }, [activeTab, filters.startDate, filters.endDate]);

    const loadInitialData = async () => {
        try {
            const [settingsRes, farmersRes, mtRes] = await Promise.all([
                getSettings(),
                fetchFarmers(),
                fetchMemberTypes()
            ]);

            if (settingsRes.status === 'success') {
                setSettings(settingsRes.data);
                if (settingsRes.data.drc_bonuses) {
                    try { setDrcBonuses(JSON.parse(settingsRes.data.drc_bonuses)); } catch(e) {}
                } else if (settingsRes.data.drcBonuses) {
                    try { setDrcBonuses(JSON.parse(settingsRes.data.drcBonuses)); } catch(e) {}
                }
            }

            if (farmersRes) {
                setFarmers(farmersRes);
            }

            if (mtRes) {
                setMemberTypes(mtRes);
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    };

    const loadRecords = async () => {
        setLoading(true);
        try {
            let data = [];
            if (activeTab === 'buy') {
                data = await fetchBuyRecords();
            } else {
                data = await fetchSellRecords();
            }
            
            // Filter by date range
            const filteredByDate = (data || []).filter(r => {
                const recordDate = (r.date || '').split('T')[0];
                return recordDate >= filters.startDate && recordDate <= filters.endDate;
            });
            setRecords(filteredByDate);
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredRecords = useMemo(() => {
        const term = filters.searchTerm.toLowerCase();
        return records.filter(r => {
            const name = activeTab === 'buy' ? (r.farmerName || 'ลูกค้าทั่วไป') : (r.buyerName || '');
            const id = activeTab === 'buy' ? (r.farmerId || '') : (r.id || '');
            const billId = r.id || '';
            
            return !term || 
                name.toLowerCase().includes(term) || 
                id.toLowerCase().includes(term) || 
                billId.toLowerCase().includes(term);
        });
    }, [records, filters.searchTerm, activeTab]);

    const totals = useMemo(() => {
        const totalBills = filteredRecords.length;
        const totalWeight = filteredRecords.reduce((sum, r) => {
            const bucket = Number(r.bucket_weight ?? r.bucketWeight ?? 0);
            return sum + (Number(r.weight || 0) - bucket);
        }, 0);
        const totalAmount = filteredRecords.reduce((sum, r) => sum + Number(r.total || 0), 0);
        return { totalBills, totalWeight, totalAmount };
    }, [filteredRecords]);

    const handleCloseEslip = () => setViewingEslip(null);

    const handlePrintBuy = (record) => {
        setPrintingReceipt(record);
        // Wait for rendering then print via hidden iframe
        setTimeout(() => {
            if (buyPrintRef.current) {
                printRecord(buyPrintRef.current.innerHTML);
                setPrintingReceipt(null);
            }
        }, 500);
    };

    const handlePrintSell = (record) => {
        setPrintingSellRecord(record);
        // Wait for rendering then print via hidden iframe
        setTimeout(() => {
            if (sellPrintRef.current) {
                printRecord(sellPrintRef.current.innerHTML);
                setPrintingSellRecord(null);
            }
        }, 500);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <style dangerouslySetInnerHTML={{ __html: `
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

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
                <div className="flex items-center space-x-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                        <FileText className="text-gray-900" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">
                            ประวัติการ{activeTab === 'buy' ? 'รับซื้อ' : 'ขาย'}
                        </h1>
                    </div>
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-1.5 ml-4">
                        <span className="text-xs font-bold text-gray-400 mr-2">วันที่:</span>
                        <input 
                            type="date" 
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="text-sm font-black text-rubber-600 bg-transparent border-none focus:ring-0 p-0"
                        />
                        <span className="text-xs font-bold text-gray-400 mx-2">-</span>
                        <input 
                            type="date" 
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="text-sm font-black text-rubber-600 bg-transparent border-none focus:ring-0 p-0"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rubber-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            name="searchTerm"
                            value={filters.searchTerm}
                            onChange={handleFilterChange}
                            placeholder="ค้นหาชื่อ, รหัส..."
                            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold w-64 focus:ring-2 focus:ring-rubber-500/20 focus:border-rubber-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                        <button 
                            onClick={() => setActiveTab('buy')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'buy' ? 'bg-rubber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            รับซื้อ
                        </button>
                        <button 
                            onClick={() => setActiveTab('sell')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'sell' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            ขาย
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">รายการ</span>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-black text-gray-900">{totals.totalBills}</span>
                        <span className="text-sm font-bold text-gray-400">บิล</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">น้ำหนักสุทธิ</span>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-black text-rubber-500">{totals.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                        <span className="text-sm font-bold text-gray-400">กก.</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-1 border-b-4 border-b-blue-500">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">ยอดจ่ายรวม</span>
                    <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-black text-blue-600">฿{totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    </div>
                </div>
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden no-print">
                <div className="overflow-x-auto text-sm">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <RefreshCw className="animate-spin text-rubber-500" size={32} />
                            <p className="text-gray-400 font-bold italic tracking-wider">กำลังโหลดข้อมูล...</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">วันที่/เวลา</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">{activeTab === 'buy' ? 'เกษตรกร' : 'โรงงาน/ผู้ซื้อ'}</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-center">น้ำหนัก (กก.)</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-center">% DRC</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-center">ราคา/กก.</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-right">ยอดรวม (฿)</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-24 text-center">
                                            <Search size={48} className="mx-auto mb-4 text-gray-200" />
                                            <p className="text-gray-400 font-black text-lg">ไม่พบข้อมูลประจำวันที่คุณเลือก</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map((r) => (
                                        <tr key={r.id} className="group hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-gray-600 whitespace-nowrap">
                                                    {format(parseISO(r.date), 'dd ม.ค. yyyy', { locale: th })}
                                                </div>
                                                <div className="text-[10px] font-black text-gray-300 uppercase tracking-tighter mt-1 italic">
                                                    {r.id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                                                        <User size={14} />
                                                    </div>
                                                    <span className="font-black text-gray-800 text-sm">
                                                        {activeTab === 'buy' ? (r.farmerName || 'ลูกค้าทั่วไป') : r.buyerName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="font-black text-gray-900 text-base">{Number(r.weight || 0).toFixed(1)}</div>
                                                <div className="text-[10px] font-bold text-red-400">-{Number(r.bucket_weight ?? r.bucketWeight ?? 0).toFixed(1)} (ถัง)</div>
                                                <div className="text-[10px] font-black text-gray-400 mt-0.5">
                                                    {Number((r.weight || 0) - (r.bucket_weight ?? r.bucketWeight ?? 0)).toFixed(1)} <span className="opacity-50">สุทธิ</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="font-bold text-gray-600">{Number(r.drc || 0).toFixed(1)}%</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="font-bold text-gray-600">
                                                    {Number(activeTab === 'buy' 
                                                        ? (r.actual_price ?? r.actualPrice ?? r.price_per_kg ?? r.pricePerKg ?? 0) 
                                                        : (r.pricePerKg ?? r.price_per_kg ?? 0)
                                                    ).toFixed(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="font-black text-rubber-500 text-lg">
                                                    {Number(r.total).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-center space-x-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => activeTab === 'buy' ? handlePrintBuy(r) : handlePrintSell(r)}
                                                        className="p-2.5 bg-gray-50 text-gray-500 hover:text-rubber-600 hover:bg-rubber-50 rounded-xl transition-all shadow-sm"
                                                        title="พิมพ์"
                                                    >
                                                        <Printer size={20} />
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => setViewingEslip(r)}
                                                        className="p-2.5 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-xl transition-all shadow-sm"
                                                        title="ดู E-Slip"
                                                    >
                                                        <Eye size={20} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Hidden Buy Print Container */}
            <div style={{ display: 'none' }}>
                <div ref={buyPrintRef}>
                    {printingReceipt && (
                        <div className="receipt-content text-black text-[12px] leading-snug p-4 font-sans" style={{ width: '57mm', background: 'white' }}>
                            {/* Header - High Contrast for Thermal */}
                            <div className="text-center mb-3 border-b-2 border-black pb-2">
                            <div className="h-12 flex items-center justify-center mb-2">
                                {(settings.logoUrl || settings.logo_url) && (
                                    <img src={settings.logoUrl || settings.logo_url} alt="Logo" className="h-12 mx-auto object-contain" style={{ filter: 'grayscale(1) contrast(2)' }} />
                                )}
                            </div>
                                <h1 className="text-lg font-bold leading-tight">{settings.factoryName || settings.factory_name || 'ร้านรับซื้อน้ำยางพารา'}</h1>
                                <p className="text-[10px] font-medium">{settings.address || '-'}</p>
                                <p className="text-sm font-bold">โทร: {settings.phone || '-'}</p>
                                <div className="mt-2 font-bold border border-black inline-block px-4 py-0.5 text-[11px]">
                                    ใบรับซื้อน้ำยางพารา
                                </div>
                            </div>

                            {/* Invoice Info */}
                            <div className="flex justify-between text-[10px] mb-3 border-b border-black pb-1 font-mono">
                                <span>เลขที่: <span className="font-bold">{printingReceipt.id?.substring(0, 14)}</span></span>
                                <span className="font-bold">{format(addYears(new Date(printingReceipt.timestamp || printingReceipt.date || new Date()), 543), 'dd/MM/yyyy HH:mm', { locale: th })}</span>
                            </div>

                            {/* Farmer Info */}
                            <div className="mb-3">
                                <h2 className="text-sm font-bold">{printingReceipt.farmerName || 'ลูกค้าทั่วไป'}</h2>
                            </div>

                            {/* Details */}
                            <div className="py-2 border-t border-black space-y-1">
                                <div className="flex justify-between items-center">
                                    <span>น้ำหนักยางดิบ</span>
                                    <span className="text-sm font-bold">{Number(printingReceipt.weight).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-black italic mb-1">
                                    <span>น้ำหนักถัง</span>
                                    <span>-{Number(printingReceipt.bucketWeight ?? printingReceipt.bucket_weight ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>น้ำหนักสุทธิ</span>
                                    <span className="text-sm font-bold border-b border-black">{(Number(printingReceipt.weight) - Number(printingReceipt.bucketWeight ?? printingReceipt.bucket_weight ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>% DRC</span>
                                    <span className="text-sm font-bold border-b border-black">{Number(printingReceipt.drc).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>ยางแห้ง</span>
                                    <span className="text-sm font-bold border-b border-black">{Number(printingReceipt.dryWeight ?? printingReceipt.dry_weight ?? printingReceipt.dryRubber ?? printingReceipt.dry_rubber ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                </div>

                                <div className="my-2 border-t border-dashed border-black"></div>

                                <div className="flex justify-between items-center text-[12px]">
                                    <span>ราคากลาง</span>
                                    <span>{Number(printingReceipt.basePrice ?? printingReceipt.base_price ?? ((printingReceipt.actualPrice ?? printingReceipt.actual_price ?? printingReceipt.pricePerKg ?? printingReceipt.price_per_kg ?? 0) - (printingReceipt.bonusDrc ?? printingReceipt.bonus_drc ?? calculateDrcBonus(printingReceipt.drc, drcBonuses)))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                </div>
                                <div className="flex justify-between items-center text-[12px] font-medium">
                                    <span>โบนัส DRC</span>
                                    <span>+{Number(printingReceipt.bonusDrc ?? printingReceipt.bonus_drc ?? calculateDrcBonus(printingReceipt.drc, drcBonuses)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                </div>
                                {Number(printingReceipt.fscBonus ?? printingReceipt.fsc_bonus ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.fscId ? (settings.fsc_bonus || 1) : 0)) > 0 && (
                                    <div className="flex justify-between items-center text-[12px] font-medium text-black">
                                        <span>โบนัส FSC</span>
                                        <span>+{Number(printingReceipt.fscBonus ?? printingReceipt.fsc_bonus ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.fscId ? (settings.fsc_bonus || 1) : 0)).toLocaleString(undefined, { minimumFractionDigits: 0 })}/กก.</span>
                                    </div>
                                )}
                                {Number(printingReceipt.bonusMemberType ?? printingReceipt.bonus_member_type ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id)).memberTypeId)?.bonus : 0)) > 0 && (
                                    <div className="flex justify-between items-center text-[12px] font-black text-rubber-700 bg-rubber-50 px-1 rounded">
                                        <span>{memberTypes.find(mt => mt.id === (printingReceipt.memberTypeId || printingReceipt.member_type_id || farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId))?.name || 'โบนัสสมาชิก'}</span>
                                        <span>+{Number(printingReceipt.bonusMemberType ?? printingReceipt.bonus_member_type ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id)).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center font-bold border-t border-black pt-1 mt-1">
                                    <span>ราคาจริง (สุทธิ)</span>
                                    <span className="text-sm font-bold border-b border-black">{truncateOneDecimal(Number(printingReceipt.actualPrice ?? printingReceipt.actual_price ?? printingReceipt.pricePerKg ?? printingReceipt.price_per_kg ?? (Number(printingReceipt.basePrice ?? printingReceipt.base_price ?? 0) + Number(printingReceipt.bonusDrc ?? printingReceipt.bonus_drc ?? 0) + Number(printingReceipt.fscBonus ?? printingReceipt.fsc_bonus ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.fscId ? 1 : 0)) + Number(printingReceipt.bonusMemberType ?? printingReceipt.bonus_member_type ?? (farmers.find(f => f.id === (printingReceipt.farmerId || printingReceipt.farmer_id))?.memberTypeId ? 1 : 0))))).toLocaleString(undefined, { minimumFractionDigits: 1 })}/กก.</span>
                                </div>
                            </div>

                            {/* Splits */}
                            <div className="py-2 border-t-2 border-black my-2 space-y-1">
                                <div className="flex justify-between items-center font-bold">
                                    <span>เกษตรกร ({100 - (Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0))}%)</span>
                                    <span className="font-bold text-xl">{Math.floor(Number(printingReceipt.farmerTotal ?? printingReceipt.farmer_total ?? (Number(printingReceipt.total) * (100 - (Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0))) / 100))).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                </div>
                                {Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0) > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span>ลูกจ้าง ({Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0)}%)</span>
                                        <span className="font-bold text-xl">{Math.floor(Number(printingReceipt.employeeTotal ?? printingReceipt.employee_total ?? (Number(printingReceipt.total) * (Number(printingReceipt.empPct ?? printingReceipt.emp_pct ?? printingReceipt.employee_percent ?? 0)) / 100))).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                    </div>
                                )}
                            </div>

                            {/* Total Footer */}
                            <div className="border-t-4 border-double border-black py-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-xs uppercase">ยอดรวมสุทธิ</span>
                                    <span className="font-bold text-xl">{Math.floor(Number(printingReceipt.total)).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                </div>
                            </div>

                            {/* Footer Message */}
                            <div className="text-center mt-4 border-t border-black pt-2">
                                <p className="text-[10px] font-bold">=== ขอบคุณที่ใช้บริการ ===</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Sell Print Container */}
            <div style={{ display: 'none' }}>
                <div ref={sellPrintRef}>
                    {printingSellRecord && (
                        <div className="print:opacity-100 opacity-100 p-4 sm:p-12 overflow-visible w-full max-w-4xl mx-auto font-sans" style={{ background: 'white' }}>
                            <div className="max-w-4xl mx-auto text-black font-sans border-2 border-black p-8">
                                <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
                                    <div className="flex space-x-4">
                                        {(settings.logo_url || settings.logoUrl) && <img src={settings.logo_url || settings.logoUrl} className="w-16 h-16 grayscale" />}
                                        <div>
                                            <h1 className="text-3xl font-black">{settings.factory_name || settings.factoryName}</h1>
                                            <p className="text-xs font-bold">{settings.address}</p>
                                            <p className="text-xs font-bold">โทร: {settings.phone}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <h1 className="text-4xl font-black italic">สำเนาใบส่งของ</h1>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Duplicate Delivery Note</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="border border-black p-4 rounded-xl">
                                        <p className="text-[10px] font-black uppercase mb-1">สั่งจ่าย / ส่งถึง</p>
                                        <p className="text-xl font-black">{printingSellRecord.buyerName}</p>
                                        <p className="text-sm font-bold opacity-60">รหัสโรงงาน: {printingSellRecord.factoryId || '-'}</p>
                                        <p className="text-sm font-bold">ทะเบียนรถ: {printingSellRecord.truckInfo || '-'}</p>
                                    </div>
                                    <div className="space-y-2 text-sm font-bold">
                                        <div className="flex justify-between border-b border-black"><span>เลขที่บิล:</span><span>{printingSellRecord.id}</span></div>
                                        <div className="flex justify-between border-b border-black"><span>วันที่ขาย:</span><span>{format(new Date(printingSellRecord.date), 'dd MMMM yyyy', { locale: th })}</span></div>
                                        <div className="flex justify-between border-b border-black opacity-30 italic"><span>วันที่พิมพ์ซ้ำ:</span><span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
                                    </div>
                                </div>

                                <table className="w-full border-collapse border-2 border-black mb-8 text-black">
                                    <thead className="bg-black text-white text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-2 border border-black">รายการ</th>
                                            <th className="p-2 border border-black text-right">น้ำหนักรวม (กก.)</th>
                                            <th className="p-2 border border-black text-center">DRC (%)</th>
                                            <th className="p-2 border border-black text-right">น้ำยางแห้ง (กก.)</th>
                                            <th className="p-2 border border-black text-right">ราคา (บาท/กก.)</th>
                                            <th className="p-2 border border-black text-right">จำนวนเงิน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-bold">
                                        <tr>
                                            <td className="p-3 border border-black">น้ำยางสดคุณภาพสูง (Field Latex)</td>
                                            <td className="p-3 border border-black text-right">{Number(printingSellRecord.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                            <td className="p-3 border border-black text-center">{Number(printingSellRecord.drc || 0).toFixed(1)}%</td>
                                            <td className="p-3 border border-black text-right">{(Number(printingSellRecord.weight || 0) * Number(printingSellRecord.drc || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 1 })}</td>
                                            <td className="p-3 border border-black text-right">{Number(printingSellRecord.price_per_kg ?? printingSellRecord.pricePerKg ?? 0).toFixed(1)}</td>
                                            <td className="p-3 border border-black text-right">{Number(printingSellRecord.total || 0).toLocaleString()}</td>
                                        </tr>
                                        {[...Array(3)].map((_, i) => <tr key={i}><td className="p-4 border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td></tr>)}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-100/50">
                                            <td colSpan="4" className="p-4 border border-black text-center italic text-sm">*** จำนวนเงินทั้งหมดรวมภาษีมูลค่าเพิ่มเรียบร้อยแล้ว ***</td>
                                            <td className="p-4 border border-black text-right font-black">ยอดสุทธิ</td>
                                            <td className="p-4 border border-black text-right text-2xl font-black">฿ {Math.floor(printingSellRecord.total).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>

                                <div className="grid grid-cols-2 gap-20 mt-20 text-center">
                                    <div><div className="border-b-2 border-black mb-1 h-10"></div><p className="font-black">ผู้ส่งของ</p></div>
                                    <div><div className="border-b-2 border-black mb-1 h-10"></div><p className="font-black">ผู้รับของ (โรงงาน)</p></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Premium E-Slip Modal */}
            {viewingEslip && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 no-print sm:p-4">
                    <div className="bg-white rounded-[1.2rem] shadow-2xl max-w-[280px] w-full max-h-[95vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300">
                        {/* Close Button */}
                        <button 
                            onClick={handleCloseEslip}
                            className="absolute right-3 top-3 z-20 bg-black/10 hover:bg-black/20 text-white p-1 rounded-full transition-all hover:scale-110 active:scale-95"
                        >
                            <X size={14} />
                        </button>

                        <div className="flex flex-col font-sans">
                            {/* Header: Dark Green (Branded) */}
                            <div className="bg-[#2d5a3f] py-4 px-3 text-center text-white relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                                <div className="absolute left-0 bottom-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                                
                                <div className="flex justify-center mb-2">
                                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl overflow-hidden">
                                        {settings.logo_url ? (
                                            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Leaf size={24} className="text-white opacity-80" />
                                        )}
                                    </div>
                                </div>
                                <h1 className="text-lg font-black tracking-tight mb-0.5 leading-tight">
                                    {settings.factory_name || 'ณราพงศ์ (จิ๋วยางพารา)'}
                                </h1>
                                <p className="text-[9px] opacity-70 font-medium mb-2 max-w-[280px] mx-auto">
                                    {settings.address || '-'} โทร: {settings.phone || '-'}
                                </p>
                                
                                <div className="inline-block px-3 py-1 bg-white/20 rounded-full border border-white/10 backdrop-blur-sm text-[9px] font-black tracking-[0.2em] leading-none uppercase">
                                    {activeTab === 'buy' ? 'ใบรับซื้อน้ำยางพารา' : 'ใบส่งสินค้า / ใบกำกับสี'}
                                </div>
                            </div>

                            <div className="px-3 pt-3 pb-4 bg-white">
                                {/* Transaction ID & Date Bar */}
                                <div className="flex justify-between items-center mb-3 text-[9px] font-black text-gray-400 bg-gray-50/80 px-2 py-1.5 rounded-lg border border-gray-100">
                                    <span className="flex items-center"><span className="opacity-40 mr-1 font-bold small-caps">ID:</span> <span className="text-gray-900 mono">{viewingEslip.id?.substring(0, 14)}</span></span>
                                    <span>{format(parseISO(viewingEslip.date || viewingEslip.timestamp), 'dd MMM yy HH:mm', { locale: th })}</span>
                                </div>

                                {/* Customer/Factory Info Card */}
                                <div className="mb-3">
                                    <p className="text-[8px] font-black text-gray-400 mb-1 uppercase tracking-widest flex items-center">
                                        <User size={8} className="mr-1 opacity-40" />
                                        {activeTab === 'buy' ? 'ข้อมูลเกษตรกร' : 'ข้อมูลลูกค้า (โรงงาน)'}
                                    </p>
                                    <div className="flex items-center justify-between border-b border-dotted border-gray-100 pb-2.5">
                                        <div>
                                            <h2 className="text-[18px] font-black text-gray-800 leading-none mb-0.5">
                                                {activeTab === 'buy' ? (viewingEslip.farmerName || 'ลูกค้าทั่วไป') : (viewingEslip.buyerName || '-')}
                                            </h2>
                                            <div className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-500">
                                                รหัส: {activeTab === 'buy' ? (viewingEslip.farmerId || '-') : (viewingEslip.factoryId || '-')}
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                                            {activeTab === 'buy' ? <User size={20} className="text-gray-200" /> : <Package size={20} className="text-gray-200" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Details Table */}
                                <div className="space-y-1 mb-3">
                                    <p className="text-[8px] font-black text-gray-400 mb-1 uppercase tracking-widest">รายละเอียดพารามิเตอร์</p>
                                    
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-400">น้ำหนักยางดิบ</span>
                                        <span className="font-black text-gray-900 decoration-rubber-100">{Number(viewingEslip.weight || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] font-bold text-gray-400">กก.</span></span>
                                    </div>

                                    {(Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)) > 0 && (
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-red-300 ml-2 flex items-center"><ChevronDown size={10} className="mr-1" /> น้ำหนักถังยาง</span>
                                            <span className="font-bold text-red-500">-{Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                        </div>
                                    )}

                                    {(Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)) > 0 && (
                                        <div className="flex justify-between items-center text-xs border-t border-dotted border-gray-100 pt-0.5 mt-0.5">
                                            <span className="font-bold text-gray-600">น้ำหนักสุทธิ</span>
                                            <span className="font-black text-gray-900">{(Number(viewingEslip.weight || 0) - Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] font-bold text-gray-400">กก.</span></span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-400">% DRC</span>
                                        <span className="font-black text-gray-900">{Number(viewingEslip.drc || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}%</span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm py-1 border-y border-gray-100 font-black bg-gray-50/50 px-2 rounded-lg my-0.5">
                                        <span className="text-gray-700">เนื้อยางแห้ง</span>
                                        <span className="text-rubber-600">
                                            {Number(viewingEslip.dry_weight ?? viewingEslip.dry_rubber ?? viewingEslip.dryRubber ?? ((Number(viewingEslip.weight || 0) * Number(viewingEslip.drc || 0)) / 100)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px]">กก.</span>
                                        </span>
                                    </div>

                                    {activeTab === 'buy' && (
                                        <>
                                            <div className="flex justify-between items-center text-xs pt-0.5">
                                                <span className="font-bold text-gray-400">ราคากลาง</span>
                                                <span className="font-black text-gray-900 mono">
                                                    ฿{Number(viewingEslip.base_price ?? viewingEslip.basePrice ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-gray-400">โบนัส DRC</span>
                                                <span className="font-bold text-green-600 mono">
                                                    +฿{Number(viewingEslip.bonus_drc ?? viewingEslip.bonusDrc ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                                </span>
                                            </div>

                                            {(Number(viewingEslip.fsc_bonus ?? viewingEslip.fscBonus ?? 0)) > 0 && (
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-gray-400">โบนัส FSC</span>
                                                    <span className="font-bold text-amber-600 mono">
                                                        +฿{Number(viewingEslip.fsc_bonus ?? viewingEslip.fscBonus ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                                    </span>
                                                </div>
                                            )}
                                        {Number(viewingEslip.bonusMemberType ?? viewingEslip.bonus_member_type ?? (farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id)).memberTypeId)?.bonus : 0)) > 0 && (
                                            <div className="flex justify-between items-center text-xs px-1 py-0.5 bg-rubber-50 rounded">
                                                <span className="font-black text-rubber-700">{memberTypes.find(mt => mt.id === (viewingEslip.memberTypeId || viewingEslip.member_type_id || farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id))?.memberTypeId))?.name || 'โบนัสสมาชิก'}</span>
                                                <span className="font-black text-rubber-700 mono">
                                                    +฿{Number(viewingEslip.bonusMemberType ?? viewingEslip.bonus_member_type ?? (farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id))?.memberTypeId ? memberTypes.find(mt => mt.id === farmers.find(f => f.id === (viewingEslip.farmerId || viewingEslip.farmer_id)).memberTypeId)?.bonus : 0)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] font-black italic">/กก.</span>
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}

                                    <div className="flex justify-between items-center text-sm pt-1 border-t border-dotted border-gray-200 mt-0.5 font-black">
                                        <span className="text-gray-800">ราคาจริง (สุทธิ)</span>
                                        <span className="font-black text-gray-900 mono">
                                            ฿{Number(activeTab === 'buy' 
                                                ? (viewingEslip.actual_price ?? viewingEslip.actualPrice ?? viewingEslip.price_per_kg ?? viewingEslip.pricePerKg ?? 0)
                                                : (viewingEslip.price_per_kg ?? viewingEslip.pricePerKg ?? 0)
                                            ).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-[9px] text-gray-400 font-bold">/กก.</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Footer Final Total */}
                                {activeTab === 'buy' && (
                                    <div className="bg-gray-50 rounded-[1.2rem] p-3 border border-gray-100 space-y-2 mb-3">
                                        <div className="flex items-center space-x-2">
                                            <div className="p-1 bg-rubber-100 rounded-md"><Coins size={12} className="text-rubber-600" /></div>
                                            <p className="text-[9px] font-black text-rubber-700 uppercase tracking-widest">การจัดสรรเงิน</p>
                                        </div>
                                        
                                        <div className="space-y-1 pt-1 border-t border-dotted border-gray-200">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="font-bold text-orange-400 flex items-center"><Coins size={12} className="mr-1.5" /> เกษตรกร ({(100 - Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0))}%)</span>
                                                <span className="font-black text-[#5ba2d7] mono">฿{Math.floor(Number(viewingEslip.total || 0) * (100 - Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                            </div>
                                            
                                            {Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0) > 0 && (
                                                <div className="flex justify-between items-center text-[10px]">
                                                    <span className="font-bold text-[#a855f7] flex items-center"><User size={12} className="mr-1.5" /> ลูกจ้าง ({Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0)}%)</span>
                                                    <span className="font-black text-[#a855f7] mono">฿{Math.floor(Number(viewingEslip.total || 0) * Number(viewingEslip.emp_pct ?? viewingEslip.empPct ?? viewingEslip.employee_percent ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-[#2d5a3f] rounded-xl p-3 flex justify-between items-center text-white shadow-xl shadow-green-900/30 relative overflow-hidden group/total mb-1.5">
                                    <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover/total:scale-150 duration-700"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">ยอดรวมจ่าย</span>
                                    <div className="text-right relative z-10">
                                        <span className="text-[22px] font-black leading-none tracking-tighter tabular-nums drop-shadow-md">
                                            ฿{Number(viewingEslip.total || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                </div>

                                {(viewingEslip.receipt_url || viewingEslip.receiptUrl) && (
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

        </div>
    );
};

export default TransactionHistory;
