import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, FileText, Printer, Eye, Calendar, 
    RefreshCw, User, Package, ChevronDown, Leaf, Coins, X
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { 
    fetchBuyRecords, 
    fetchSellRecords, 
    getSettings
} from '../services/apiService';
import { calculateDrcBonus } from '../utils/calculations';

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

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        loadRecords();
    }, [activeTab, filters.startDate, filters.endDate]);

    const loadSettings = async () => {
        try {
            const res = await getSettings();
            if (res.status === 'success') {
                setSettings(res.data);
                if (res.data.drc_bonuses) {
                    try { setDrcBonuses(JSON.parse(res.data.drc_bonuses)); } catch(e) {}
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
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
                const recordDate = r.date;
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
        setTimeout(() => {
            window.print();
            setPrintingReceipt(null);
        }, 500);
    };

    const handlePrintSell = (record) => {
        setPrintingSellRecord(record);
        setTimeout(() => {
            window.print();
            setPrintingSellRecord(null);
        }, 1000);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 0; }
                    .no-print { display: none !important; }
                    body { -webkit-print-color-adjust: exact; }
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
                                                    
                                                    {(r.receipt_url || r.receiptUrl) && (
                                                        <button 
                                                            onClick={() => setViewingEslip(r)}
                                                            className="p-2.5 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-xl transition-all shadow-sm"
                                                            title="ดูรูป E-Slip"
                                                        >
                                                            <Eye size={20} />
                                                        </button>
                                                    )}
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

            {/* Reprint Logic remains same as previous version but hidden in UI */}
            {printingReceipt && (
                <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-start print:relative print:z-auto">
                    <style dangerouslySetInnerHTML={{ __html: `
                        @media print {
                            @page { size: 48mm 210mm; margin: 0; }
                            .receipt-content { width: 48mm; padding: 2mm; font-family: 'Noto Sans Thai', sans-serif; font-size: 11px; }
                        }
                    ` }} />
                    <div className="receipt-content text-black leading-snug">
                        <div className="text-center mb-3 border-b-2 border-black pb-2">
                            {settings.logo_url && <img src={settings.logo_url} className="h-10 mx-auto mb-1 grayscale contrast-125" />}
                            <h1 className="text-sm font-bold">{settings.factory_name || 'ร้านรับซื้อน้ำยาง'}</h1>
                            <p className="text-[9px]">{settings.address || '-'}</p>
                            <p className="text-[9px]">โทร: {settings.phone || '-'}</p>
                            <div className="mt-1 border border-black inline-block px-2 text-[10px] font-bold">สำเนาใบซื้อน้ำยาง</div>
                        </div>
                        <div className="flex justify-between text-[9px] mb-2 font-mono">
                            <span># {printingReceipt.id}</span>
                            <span>{format(new Date(printingReceipt.timestamp || printingReceipt.date), 'dd/MM/yy HH:mm', { locale: th })}</span>
                        </div>
                        <div className="mb-2">
                            <p className="text-[10px] font-bold">{printingReceipt.farmerName}</p>
                            <p className="text-[9px] opacity-60">ID: {printingReceipt.farmerId || '-'}</p>
                        </div>
                        <div className="border-t border-black py-2 space-y-1 text-[10px]">
                            <div className="flex justify-between"><span>น้ำหนักสุทธิ</span><span className="font-bold">{(Number(printingReceipt.weight || 0) - Number(printingReceipt.bucket_weight ?? printingReceipt.bucketWeight ?? 0)).toFixed(1)} กก.</span></div>
                            <div className="flex justify-between"><span>% DRC</span><span className="font-bold">{Number(printingReceipt.drc || 0).toFixed(1)}%</span></div>
                            <div className="flex justify-between"><span>เนื้อยางแห้ง</span><span className="font-bold underline">{(Number(printingReceipt.dry_weight ?? printingReceipt.dry_rubber ?? printingReceipt.dryRubber ?? 0)).toFixed(1)} กก.</span></div>
                            <div className="flex justify-between mt-1 text-[9px]"><span>ราคากลาง</span><span>{Number(printingReceipt.base_price ?? printingReceipt.basePrice ?? ((printingReceipt.actual_price ?? printingReceipt.actualPrice ?? printingReceipt.price_per_kg ?? printingReceipt.pricePerKg ?? 0) - calculateDrcBonus(printingReceipt.drc, drcBonuses))).toFixed(2)} /กก.</span></div>
                            <div className="flex justify-between text-[9px]"><span>โบนัส DRC</span><span>+{Number(printingReceipt.bonus_drc ?? printingReceipt.bonusDrc ?? calculateDrcBonus(printingReceipt.drc, drcBonuses)).toFixed(2)} /กก.</span></div>
                            <div className="flex justify-between font-bold border-t border-black pt-1"><span>ราคาจริง</span><span>{Number(printingReceipt.actual_price ?? printingReceipt.actualPrice ?? printingReceipt.price_per_kg ?? printingReceipt.pricePerKg ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} /กก.</span></div>
                        </div>
                        <div className="border-t-2 border-black py-2 mt-1">
                            <div className="flex justify-between text-base font-black"><span>รวมสุทธิ</span><span>฿{Math.floor(printingReceipt.total).toLocaleString()}</span></div>
                        </div>
                        <div className="text-center mt-3 pt-1 border-t border-dashed border-black">
                            <p className="text-[9px] font-bold">=== ขอบคุณที่ใช้บริการ ===</p>
                            <p className="text-[7px] opacity-40 italic">พิมพ์ซ้ำเมื่อ {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                    </div>
                </div>
            )}

            {printingSellRecord && (
                <div className="fixed inset-0 z-[-1] opacity-0 print:opacity-100 print:z-[9999] print:bg-white p-12 overflow-hidden">
                    <div className="max-w-4xl mx-auto text-black font-sans border-2 border-black p-8">
                        <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
                            <div className="flex space-x-4">
                                {settings.logo_url && <img src={settings.logo_url} className="w-16 h-16 grayscale" />}
                                <div>
                                    <h1 className="text-3xl font-black">{settings.factory_name}</h1>
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

                        <table className="w-full border-collapse border-2 border-black mb-8">
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
            {/* Premium E-Slip Modal */}
            {viewingEslip && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 no-print sm:p-6">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300">
                        {/* Close Button */}
                        <button 
                            onClick={handleCloseEslip}
                            className="absolute right-6 top-6 z-20 bg-black/10 hover:bg-black/20 text-white p-2.5 rounded-full transition-all hover:scale-110 active:scale-95"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col font-sans">
                            {/* Header: Dark Green (Branded) */}
                            <div className="bg-[#2d5a3f] py-10 px-8 text-center text-white relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                                <div className="absolute left-0 bottom-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
                                
                                <div className="flex justify-center mb-5">
                                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl overflow-hidden">
                                        {settings.logo_url ? (
                                            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <Leaf size={40} className="text-white opacity-80" />
                                        )}
                                    </div>
                                </div>
                                <h1 className="text-3xl font-black tracking-tight mb-1 leading-tight">
                                    {settings.factory_name || 'ณราพงศ์ (จิ๋วยางพารา)'}
                                </h1>
                                <p className="text-[13px] opacity-70 font-medium mb-5 max-w-[280px] mx-auto">
                                    {settings.address || '-'} โทร: {settings.phone || '-'}
                                </p>
                                
                                <div className="inline-block px-7 py-2 bg-white/20 rounded-full border border-white/10 backdrop-blur-sm text-[13px] font-black tracking-[0.2em] leading-none uppercase">
                                    {activeTab === 'buy' ? 'ใบรับซื้อน้ำยางพารา' : 'ใบส่งสินค้า / ใบกำกับสี'}
                                </div>
                            </div>

                            <div className="px-8 pt-8 pb-10 bg-white">
                                {/* Transaction ID & Date Bar */}
                                <div className="flex justify-between items-center mb-8 text-[13px] font-black text-gray-400 bg-gray-50/80 px-5 py-3 rounded-2xl border border-gray-100">
                                    <span className="flex items-center"><span className="opacity-40 mr-1.5 font-bold small-caps">ID:</span> <span className="text-gray-900 mono">{viewingEslip.id?.substring(0, 14)}</span></span>
                                    <span>{format(parseISO(viewingEslip.date || viewingEslip.timestamp), 'dd MMMM yyyy HH:mm', { locale: th })}</span>
                                </div>

                                {/* Customer/Factory Info Card */}
                                <div className="mb-8">
                                    <p className="text-[11px] font-black text-gray-400 mb-2 uppercase tracking-widest flex items-center">
                                        <User size={12} className="mr-1.5 opacity-40" />
                                        {activeTab === 'buy' ? 'ข้อมูลเกษตรกร' : 'ข้อมูลลูกค้า (โรงงาน)'}
                                    </p>
                                    <div className="flex items-center justify-between border-b-2 border-dotted border-gray-100 pb-6">
                                        <div>
                                            <h2 className="text-[32px] font-black text-gray-800 leading-none mb-2">
                                                {activeTab === 'buy' ? (viewingEslip.farmerName || 'ลูกค้าทั่วไป') : (viewingEslip.buyerName || '-')}
                                            </h2>
                                            <div className="inline-flex items-center px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-500">
                                                รหัส: {activeTab === 'buy' ? (viewingEslip.farmerId || '-') : (viewingEslip.factoryId || '-')}
                                            </div>
                                        </div>
                                        <div className="w-16 h-16 bg-gray-50 rounded-[1.5rem] flex items-center justify-center border border-gray-100">
                                            {activeTab === 'buy' ? <User size={32} className="text-gray-200" /> : <Package size={32} className="text-gray-200" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Details Table */}
                                <div className="space-y-4 mb-10">
                                    <p className="text-[11px] font-black text-gray-400 mb-3 uppercase tracking-widest">รายละเอียดพารามิเตอร์</p>
                                    
                                    <div className="flex justify-between items-center text-xl">
                                        <span className="font-bold text-gray-400">น้ำหนักยางดิบ</span>
                                        <span className="font-black text-gray-900 decoration-rubber-100">{Number(viewingEslip.weight || 0).toLocaleString()} <span className="text-sm font-bold text-gray-400">กก.</span></span>
                                    </div>

                                    {(Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0)) > 0 && (
                                        <div className="flex justify-between items-center text-lg">
                                            <span className="font-bold text-red-300 ml-4 flex items-center"><ChevronDown size={14} className="mr-1" /> หักถัง</span>
                                            <span className="font-bold text-red-500">-{Number(viewingEslip.bucket_weight ?? viewingEslip.bucketWeight ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-xl">
                                        <span className="font-bold text-gray-400">% DRC</span>
                                        <span className="font-black text-gray-900">{Number(viewingEslip.drc || 0).toFixed(1)}%</span>
                                    </div>

                                    <div className="flex justify-between items-center text-2xl py-4 border-y-2 border-gray-100 font-black bg-gray-50/50 px-4 rounded-[1.5rem] my-2">
                                        <span className="text-gray-700">เนื้อยางแห้ง</span>
                                        <span className="text-rubber-600">
                                            {Number(viewingEslip.dry_weight ?? viewingEslip.dry_rubber ?? viewingEslip.dryRubber ?? ((Number(viewingEslip.weight || 0) * Number(viewingEslip.drc || 0)) / 100)).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-sm">กก.</span>
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center text-xl pt-2">
                                        <span className="font-bold text-gray-400">ราคาต่อหน่วย</span>
                                        <span className="font-black text-gray-900 mono">
                                            ฿{Number(activeTab === 'buy' 
                                                ? (viewingEslip.actual_price ?? viewingEslip.actualPrice ?? viewingEslip.price_per_kg ?? viewingEslip.pricePerKg ?? 0)
                                                : (viewingEslip.price_per_kg ?? viewingEslip.pricePerKg ?? 0)
                                            ).toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-sm text-gray-400 font-bold">/กก.</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Footer Final Total */}
                                <div className="bg-[#2d5a3f] rounded-[2rem] p-8 flex justify-between items-center text-white shadow-2xl shadow-green-900/40 relative overflow-hidden group/total">
                                    <div className="absolute right-0 top-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 transition-transform group-hover/total:scale-150 duration-700"></div>
                                    <span className="text-xl font-black uppercase tracking-[0.2em]">ยอดรวมจ่าย</span>
                                    <div className="text-right relative z-10">
                                        <span className="text-[56px] font-black leading-none tracking-tighter tabular-nums drop-shadow-md">
                                            ฿{Number(viewingEslip.total || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {viewingEslip.receipt_url && (
                                    <div className="mt-8 text-center">
                                        <a 
                                            href={viewingEslip.receipt_url}
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
            {/* Premium E-Slip Modal */}
            {viewingEslip && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:hidden">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in duration-300">
                        {/* Close Button */}
                        <button 
                            onClick={() => setViewingEslip(null)}
                            className="absolute right-4 top-4 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full transition-colors z-20"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col font-sans">
                            {/* Proactive Image Display from Database */}
                            {(viewingEslip.receipt_url || viewingEslip.receiptUrl) && (
                                <div className="bg-gray-100 rounded-3xl overflow-hidden flex justify-center">
                                    <img 
                                        src={viewingEslip.receipt_url || viewingEslip.receiptUrl} 
                                        alt="E-Slip จากฐานข้อมูล" 
                                        className="max-w-full rounded-2xl shadow-lg object-contain max-h-[85vh]"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.style.display = 'none';
                                            setViewingEslip(null);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionHistory;
