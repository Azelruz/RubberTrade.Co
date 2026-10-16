import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Printer, Download, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, 
    Calendar, User, Search, CheckCircle2, ShieldCheck, Filter, Award, RefreshCw, 
    Layers, Building, Truck, Scale, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { 
    fetchBuyRecords, fetchSellRecords, fetchFarmers, fetchFactories, 
    getSettings, updateRecord, isCached 
} from '../services/apiService';
import { exportElementToPDF } from '../utils/pdfExport';

// Helper: Format Buddhist Year Thai Month
const formatThaiMonth = (yyyyMm) => {
    if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm || '';
    try {
        const [year, month] = yyyyMm.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        const thaiMonthName = format(date, 'MMMM', { locale: th });
        const thaiYear = year + 543;
        return `${thaiMonthName} ${thaiYear}`;
    } catch {
        return yyyyMm;
    }
};

const formatThaiDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = d.getDate();
        const monthName = format(d, 'MMM', { locale: th });
        const thaiYear = d.getFullYear() + 543;
        return `${day} ${monthName} ${thaiYear}`;
    } catch {
        return dateStr;
    }
};

const getMonthRange = (yyyyMm) => {
    if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return { startDate: '', endDate: '' };
    const [year, month] = yyyyMm.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
        startDate: `${yyyyMm}-01`,
        endDate: `${yyyyMm}-${String(lastDay).padStart(2, '0')}`
    };
};

const shiftMonth = (yyyyMm, delta) => {
    if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return format(new Date(), 'yyyy-MM');
    const [year, month] = yyyyMm.split('-').map(Number);
    const targetDate = new Date(year, month - 1 + delta, 1);
    return format(targetDate, 'yyyy-MM');
};

const RUBBER_TYPE_LABELS = {
    'all': 'ทุกชนิดยาง',
    'latex': 'น้ำยางสด',
    'cup': 'ยางก้อนถ้วย',
    'raw_sheet': 'ยางแผ่นดิบ',
    'scrap': 'เศษยาง/ขี้ยาง'
};

const getRubberTypeLabel = (type) => {
    if (!type) return 'น้ำยางสด';
    const t = String(type).toLowerCase();
    if (t.includes('cup') || t.includes('ก้อน') || t.includes('ขี้ยาง')) return 'ยางก้อนถ้วย';
    if (t.includes('sheet') || t.includes('แผ่น')) return 'ยางแผ่นดิบ';
    if (t.includes('scrap') || t.includes('เศษ')) return 'เศษยาง';
    return 'น้ำยางสด';
};

export const RaotReport = () => {
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
    const [activeTab, setActiveTab] = useState('ky6'); // 'ky6', 'ky7', 'ky8', 'cert'
    const [rubberTypeFilter, setRubberTypeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Data states
    const [buys, setBuys] = useState([]);
    const [sells, setSells] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [factories, setFactories] = useState([]);
    const [settings, setSettings] = useState({});

    // RAOT License state (can be saved to settings)
    const [licenseNo, setLicenseNo] = useState('');
    const [isEditingLicense, setIsEditingLicense] = useState(false);
    const [isSavingLicense, setIsSavingLicense] = useState(false);

    // Farmer Certificate tab state
    const [selectedFarmerId, setSelectedFarmerId] = useState('');
    const [certDateRange, setCertDateRange] = useState('1m'); // '1m', '3m', '6m', '1y'

    // Exporting states
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const printAreaRef = useRef(null);

    // Load initial settings and data
    useEffect(() => {
        getSettings().then(s => {
            if (s) {
                setSettings(s);
                setLicenseNo(s.raotLicenseNo || s.raot_license_no || '');
            }
        }).catch(() => {});
    }, []);

    // Load monthly buy and sell records
    const loadReportData = async () => {
        setLoading(true);
        try {
            const { startDate, endDate } = getMonthRange(selectedMonth);
            const [bRes, sRes, fRes, fcRes] = await Promise.all([
                fetchBuyRecords(false, { startDate, endDate }),
                fetchSellRecords(false, { startDate, endDate }),
                fetchFarmers(),
                fetchFactories()
            ]);
            setBuys(Array.isArray(bRes) ? bRes : []);
            setSells(Array.isArray(sRes) ? sRes : []);
            setFarmers(Array.isArray(fRes) ? fRes : []);
            setFactories(Array.isArray(fcRes) ? fcRes : []);
        } catch (e) {
            console.error('Error loading RAOT report data:', e);
            toast.error('โหลดข้อมูลรายงานล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReportData();
    }, [selectedMonth]);

    // Save License No
    const handleSaveLicense = async () => {
        setIsSavingLicense(true);
        try {
            const updated = { ...settings, raotLicenseNo: licenseNo };
            const res = await updateRecord('Settings', settings.id || 'general', updated);
            if (res && res.status === 'success') {
                setSettings(updated);
                setIsEditingLicense(false);
                toast.success('บันทึกเลขที่ใบอนุญาตค้ายาง กยท. สำเร็จ');
            } else {
                toast.error('บันทึกล้มเหลว');
            }
        } catch (e) {
            toast.error('บันทึกล้มเหลว: ' + e.message);
        } finally {
            setIsSavingLicense(false);
        }
    };

    // Farmers Map for quick lookup
    const farmersMap = useMemo(() => {
        const map = {};
        farmers.forEach(f => {
            if (f.id) map[f.id] = f;
            if (f.name) map[f.name] = f;
            if (f.realName) map[f.realName] = f;
        });
        return map;
    }, [farmers]);

    // Factories Map
    const factoriesMap = useMemo(() => {
        const map = {};
        factories.forEach(f => {
            if (f.id) map[f.id] = f;
        });
        return map;
    }, [factories]);

    // Filtered Buys for แบบ ค.ย. ๖
    const filteredBuys = useMemo(() => {
        return buys.filter(b => {
            const fm = farmersMap[b.farmerId] || farmersMap[b.farmerName] || {};
            const matchSearch = !searchTerm || 
                (b.farmerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (fm.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (fm.realName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (fm.idCard || '').includes(searchTerm) ||
                (b.id || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const rType = getRubberTypeLabel(b.rubberType);
            const matchType = rubberTypeFilter === 'all' || 
                (rubberTypeFilter === 'latex' && rType === 'น้ำยางสด') ||
                (rubberTypeFilter === 'cup' && rType === 'ยางก้อนถ้วย') ||
                (rubberTypeFilter === 'raw_sheet' && rType === 'ยางแผ่นดิบ') ||
                (rubberTypeFilter === 'scrap' && rType === 'เศษยาง');

            return matchSearch && matchType;
        }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }, [buys, searchTerm, rubberTypeFilter, farmersMap]);

    // Filtered Sells for แบบ ค.ย. ๗
    const filteredSells = useMemo(() => {
        return sells.filter(s => {
            const buyer = s.buyerName || factoriesMap[s.factoryId]?.name || '';
            const matchSearch = !searchTerm || 
                buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.id || '').toLowerCase().includes(searchTerm.toLowerCase());

            const rType = getRubberTypeLabel(s.rubberType);
            const matchType = rubberTypeFilter === 'all' || 
                (rubberTypeFilter === 'latex' && rType === 'น้ำยางสด') ||
                (rubberTypeFilter === 'cup' && rType === 'ยางก้อนถ้วย') ||
                (rubberTypeFilter === 'raw_sheet' && rType === 'ยางแผ่นดิบ') ||
                (rubberTypeFilter === 'scrap' && rType === 'เศษยาง');

            return matchSearch && matchType;
        }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }, [sells, searchTerm, rubberTypeFilter, factoriesMap]);

    // Totals for แบบ ค.ย. ๖
    const totalsKy6 = useMemo(() => {
        let totalWeight = 0;
        let totalDryRubber = 0;
        let totalAmount = 0;

        filteredBuys.forEach(b => {
            const w = Number(b.weight || 0);
            const drc = Number(b.drc || 0);
            const dry = Number(b.dryRubber || (drc > 0 ? (w * drc) / 100 : w));
            const amt = Number(b.total || 0);

            totalWeight += w;
            totalDryRubber += dry;
            totalAmount += amt;
        });

        return { totalWeight, totalDryRubber, totalAmount };
    }, [filteredBuys]);

    // Totals for แบบ ค.ย. ๗
    const totalsKy7 = useMemo(() => {
        let totalWeight = 0;
        let totalDryRubber = 0;
        let totalAmount = 0;

        filteredSells.forEach(s => {
            const w = Number(s.weight || 0);
            const drc = Number(s.drc || 0);
            const dry = Number(drc > 0 ? (w * drc) / 100 : w);
            const amt = Number(s.total || 0);

            totalWeight += w;
            totalDryRubber += dry;
            totalAmount += amt;
        });

        return { totalWeight, totalDryRubber, totalAmount };
    }, [filteredSells]);

    // Summary Matrix for แบบ ค.ย. ๘ (Stock Summary by Type)
    const stockSummaryKy8 = useMemo(() => {
        const types = ['น้ำยางสด', 'ยางก้อนถ้วย', 'ยางแผ่นดิบ', 'เศษยาง'];
        
        return types.map(typeName => {
            // Bought in this month
            const buySubset = buys.filter(b => getRubberTypeLabel(b.rubberType) === typeName);
            const boughtWeight = buySubset.reduce((sum, b) => sum + Number(b.weight || 0), 0);
            const boughtDry = buySubset.reduce((sum, b) => {
                const w = Number(b.weight || 0);
                const drc = Number(b.drc || 0);
                return sum + (b.dryRubber ? Number(b.dryRubber) : (drc > 0 ? (w * drc) / 100 : w));
            }, 0);

            // Sold in this month
            const sellSubset = sells.filter(s => getRubberTypeLabel(s.rubberType) === typeName);
            const soldWeight = sellSubset.reduce((sum, s) => sum + Number(s.weight || 0), 0);
            const soldDry = sellSubset.reduce((sum, s) => {
                const w = Number(s.weight || 0);
                const drc = Number(s.drc || 0);
                return sum + (drc > 0 ? (w * drc) / 100 : w);
            }, 0);
            const lossWeight = sellSubset.reduce((sum, s) => sum + Number(s.lossWeight || 0), 0);

            // In real trade, rubber bought is sold within the day or week. Balance is remainder.
            const balanceWeight = Math.max(0, boughtWeight - soldWeight - lossWeight);
            const balanceDry = Math.max(0, boughtDry - soldDry);

            return {
                typeName,
                broughtForward: 0, // ยอดยกมา
                boughtWeight,
                boughtDry,
                soldWeight,
                soldDry,
                lossWeight,
                balanceWeight,
                balanceDry
            };
        });
    }, [buys, sells]);

    // Data for Farmer Certificate
    const farmerCertData = useMemo(() => {
        if (!selectedFarmerId) return null;
        const farmer = farmers.find(f => String(f.id) === String(selectedFarmerId));
        if (!farmer) return null;

        // Filter buys for this farmer in the selected period
        const farmerBuys = buys.filter(b => 
            String(b.farmerId) === String(farmer.id) || 
            b.farmerName === farmer.name ||
            (farmer.realName && b.farmerName === farmer.realName)
        ).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        const totalWeight = farmerBuys.reduce((sum, b) => sum + Number(b.weight || 0), 0);
        const totalDry = farmerBuys.reduce((sum, b) => {
            const w = Number(b.weight || 0);
            const d = Number(b.drc || 0);
            return sum + (b.dryRubber ? Number(b.dryRubber) : (d > 0 ? (w * d) / 100 : w));
        }, 0);
        const totalAmount = farmerBuys.reduce((sum, b) => sum + Number(b.total || 0), 0);

        return {
            farmer,
            records: farmerBuys,
            count: farmerBuys.length,
            totalWeight,
            totalDry,
            totalAmount
        };
    }, [selectedFarmerId, farmers, buys]);

    // CSV Export function
    const handleExportCSV = () => {
        let headers = [];
        let rows = [];
        let filename = '';

        if (activeTab === 'ky6') {
            filename = `RAOT_KY6_${selectedMonth}.csv`;
            headers = [
                'ลำดับ', 'วันที่', 'รหัสบิล', 'ชื่อผู้ขาย', 'เลขบัตรประชาชน', 
                'ทะเบียนชาวสวน กยท.', 'ชนิดยาง', 'น้ำหนักสด (กก.)', '%DRC', 
                'เนื้อยางแห้ง (กก.)', 'ราคา/กก. (บาท)', 'จำนวนเงิน (บาท)', 'หมายเหตุ'
            ];
            rows = filteredBuys.map((b, idx) => {
                const fm = farmersMap[b.farmerId] || farmersMap[b.farmerName] || {};
                const dry = Number(b.dryRubber || (b.drc > 0 ? (b.weight * b.drc) / 100 : b.weight));
                return [
                    idx + 1,
                    b.date || '',
                    b.id || '',
                    fm.realName || b.farmerName || fm.name || '',
                    fm.idCard || fm.id_card || '',
                    fm.fscId || fm.raotId || '',
                    getRubberTypeLabel(b.rubberType),
                    Number(b.weight || 0).toFixed(2),
                    Number(b.drc || 0).toFixed(2),
                    dry.toFixed(2),
                    Number(b.pricePerKg || 0).toFixed(2),
                    Number(b.total || 0).toFixed(2),
                    b.note || ''
                ];
            });
        } else if (activeTab === 'ky7') {
            filename = `RAOT_KY7_${selectedMonth}.csv`;
            headers = [
                'ลำดับ', 'วันที่', 'รหัสบิล', 'ผู้ซื้อ/โรงงานปลายทาง', 
                'ชนิดยาง', 'น้ำหนักจำหน่าย (กก.)', '%DRC', 
                'เนื้อยางแห้ง (กก.)', 'ราคาจำหน่าย (บาท)', 'มูลค่ารวม (บาท)', 'ทะเบียนรถขนส่ง', 'หมายเหตุ'
            ];
            rows = filteredSells.map((s, idx) => {
                const buyer = s.buyerName || factoriesMap[s.factoryId]?.name || 'โรงงานแปรรูป';
                const dry = Number(s.drc > 0 ? (s.weight * s.drc) / 100 : s.weight);
                return [
                    idx + 1,
                    s.date || '',
                    s.id || '',
                    buyer,
                    getRubberTypeLabel(s.rubberType),
                    Number(s.weight || 0).toFixed(2),
                    Number(s.drc || 0).toFixed(2),
                    dry.toFixed(2),
                    Number(s.pricePerKg || 0).toFixed(2),
                    Number(s.total || 0).toFixed(2),
                    s.truckInfo || '',
                    s.note || ''
                ];
            });
        } else if (activeTab === 'ky8') {
            filename = `RAOT_KY8_${selectedMonth}.csv`;
            headers = [
                'ชนิดยาง', 'ยอดยกมา (กก.)', 'รับซื้อในเดือน (กก.)', 
                'เนื้อยางแห้งรับซื้อ (กก.)', 'จำหน่ายในเดือน (กก.)', 
                'เนื้อยางแห้งจำหน่าย (กก.)', 'น้ำหนักลด/สูญเสีย (กก.)', 'คงเหลือสิ้นเดือน (กก.)'
            ];
            rows = stockSummaryKy8.map(s => [
                s.typeName,
                s.broughtForward.toFixed(2),
                s.boughtWeight.toFixed(2),
                s.boughtDry.toFixed(2),
                s.soldWeight.toFixed(2),
                s.soldDry.toFixed(2),
                s.lossWeight.toFixed(2),
                s.balanceWeight.toFixed(2)
            ]);
        } else if (activeTab === 'cert' && farmerCertData) {
            filename = `RAOT_Certificate_${farmerCertData.farmer.realName || farmerCertData.farmer.name}_${selectedMonth}.csv`;
            headers = [
                'ลำดับ', 'วันที่ขาย', 'เลขที่บิล', 'ชนิดยาง', 
                'น้ำหนักสด (กก.)', '%DRC', 'เนื้อยางแห้ง (กก.)', 'ราคา/กก. (บาท)', 'จำนวนเงิน (บาท)'
            ];
            rows = farmerCertData.records.map((b, idx) => {
                const dry = Number(b.dryRubber || (b.drc > 0 ? (b.weight * b.drc) / 100 : b.weight));
                return [
                    idx + 1,
                    b.date || '',
                    b.id || '',
                    getRubberTypeLabel(b.rubberType),
                    Number(b.weight || 0).toFixed(2),
                    Number(b.drc || 0).toFixed(2),
                    dry.toFixed(2),
                    Number(b.pricePerKg || 0).toFixed(2),
                    Number(b.total || 0).toFixed(2)
                ];
            });
        }

        if (rows.length === 0) {
            toast.error('ไม่มีข้อมูลสำหรับส่งออกเป็น CSV');
            return;
        }

        const csvContent = "\uFEFF" + [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว`);
    };

    // PDF Export function
    const handleExportPDF = async () => {
        if (!printAreaRef.current) return;
        setIsExportingPdf(true);
        const toastId = toast.loading('กำลังแปลงเอกสารเป็น PDF คุณภาพสูง...');
        try {
            const titleMap = {
                'ky6': `แบบ_คย6_รับซื้อยาง_${selectedMonth}`,
                'ky7': `แบบ_คย7_จำหน่ายยาง_${selectedMonth}`,
                'ky8': `แบบ_คย8_สต็อกคงเหลือ_${selectedMonth}`,
                'cert': `หนังสือรับรองยอดขาย_${farmerCertData?.farmer?.name || 'ชาวสวน'}_${selectedMonth}`
            };
            const fileName = `${titleMap[activeTab] || 'RAOT_Report'}.pdf`;
            await exportElementToPDF(printAreaRef.current, fileName, {
                orientation: activeTab === 'ky6' || activeTab === 'ky7' ? 'landscape' : 'portrait'
            });
            toast.success('ดาวน์โหลดเอกสาร PDF สำเร็จ', { id: toastId });
        } catch (e) {
            console.error('PDF Export Error:', e);
            toast.error('ไม่สามารถส่งออก PDF ได้: ' + e.message, { id: toastId });
        } finally {
            setIsExportingPdf(false);
        }
    };

    const storeName = settings.factoryName || settings.factory_name || 'จุดรับซื้อน้ำยางพารามาตรฐาน';
    const storeAddress = settings.address || 'เลขที่ - หมู่ - ตำบล - อำเภอ - จังหวัด';

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { 
                        size: ${activeTab === 'ky6' || activeTab === 'ky7' ? 'A4 landscape' : 'A4 portrait'}; 
                        margin: 8mm; 
                    }
                    html, body, #root, main, div { 
                        overflow: visible !important; 
                        height: auto !important; 
                        max-height: none !important; 
                    }
                    .no-print { display: none !important; }
                    .print-area { display: block !important; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }
            ` }} />

            {/* Screen Header Controls (Hidden during print) */}
            <div className="no-print space-y-4">
                {/* Header Title & Month Picker */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                                <Award size={22} />
                            </span>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    รายงานการยางแห่งประเทศไทย (กยท.)
                                    <span className="text-[11px] px-2 py-0.5 font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                                        พ.ร.บ. ควบคุมยาง ๒๕๔๒
                                    </span>
                                </h1>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    จัดทำบัญชีแสดงการซื้อ-จำหน่ายยางพารา ตามแบบ ค.ย. ๖, ค.ย. ๗, ค.ย. ๘ และหนังสือรับรองชาวสวน
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Month Selector */}
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 shadow-xs">
                            <button
                                type="button"
                                onClick={() => setSelectedMonth(prev => shiftMonth(prev, -1))}
                                className="p-1 text-gray-500 hover:text-rubber-600 hover:bg-gray-200 rounded-lg transition-all"
                                title="เดือนก่อนหน้า"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="flex items-center mx-1.5">
                                <Calendar size={14} className="text-emerald-600 mr-1.5" />
                                <input 
                                    type="month" 
                                    value={selectedMonth} 
                                    onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                                    className="border-none focus:ring-0 text-xs font-bold text-gray-800 bg-transparent p-0 cursor-pointer"
                                />
                                <span className="text-[11px] text-gray-500 font-bold ml-1.5 hidden sm:inline">
                                    ({formatThaiMonth(selectedMonth)})
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedMonth(prev => shiftMonth(prev, 1))}
                                className="p-1 text-gray-500 hover:text-rubber-600 hover:bg-gray-200 rounded-lg transition-all"
                                title="เดือนถัดไป"
                            >
                                <ChevronRight size={16} />
                            </button>
                            {selectedMonth !== currentMonthStr && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedMonth(currentMonthStr)}
                                    className="ml-1.5 px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-all"
                                >
                                    เดือนนี้
                                </button>
                            )}
                        </div>

                        {/* Export Buttons */}
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            className="flex items-center px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs shadow-xs transition-all"
                            title="ส่งออกไฟล์ CSV สำหรับเปิดใน Excel"
                        >
                            <FileSpreadsheet size={15} className="mr-1.5" />
                            Excel (CSV)
                        </button>
                        <button
                            type="button"
                            disabled={isExportingPdf}
                            onClick={handleExportPDF}
                            className="flex items-center px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs shadow-xs transition-all disabled:opacity-50"
                            title="ดาวน์โหลดเป็นไฟล์ PDF"
                        >
                            <Download size={15} className="mr-1.5" />
                            {isExportingPdf ? 'กำลังแปลง PDF...' : 'ดาวน์โหลด PDF'}
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="flex items-center px-3.5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-xs shadow-sm transition-all"
                            title="สั่งพิมพ์เอกสาร A4"
                        >
                            <Printer size={15} className="mr-1.5" />
                            พิมพ์ฟอร์ม A4
                        </button>
                    </div>
                </div>

                {/* License Information Bar */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-amber-600 flex-shrink-0" size={18} />
                        <div>
                            <span className="font-bold text-amber-900 mr-2">เลขที่ใบอนุญาตค้ายาง กยท.:</span>
                            {isEditingLicense ? (
                                <div className="inline-flex items-center gap-2 mt-1 sm:mt-0">
                                    <input 
                                        type="text" 
                                        value={licenseNo} 
                                        onChange={(e) => setLicenseNo(e.target.value)}
                                        placeholder="เช่น ข/จ ๑๒๓/๒๕๖๙ หรือ รหัสจุดรับซื้อ"
                                        className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-amber-500 w-56"
                                    />
                                    <button 
                                        type="button"
                                        disabled={isSavingLicense}
                                        onClick={handleSaveLicense}
                                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all"
                                    >
                                        {isSavingLicense ? 'บันทึก...' : 'บันทึก'}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { setIsEditingLicense(false); setLicenseNo(settings.raotLicenseNo || ''); }}
                                        className="px-2 py-1 text-gray-600 hover:bg-amber-100 rounded-lg"
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            ) : (
                                <span className="font-black text-amber-950 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200">
                                    {licenseNo || '(ยังไม่ได้ระบุเลขที่ใบอนุญาต)'}
                                </span>
                            )}
                        </div>
                    </div>
                    {!isEditingLicense && (
                        <button 
                            type="button"
                            onClick={() => setIsEditingLicense(true)}
                            className="text-amber-700 hover:text-amber-900 underline font-bold transition-colors cursor-pointer"
                        >
                            แก้ไขเลขที่ใบอนุญาต
                        </button>
                    )}
                </div>

                {/* Form Navigation Tabs */}
                <div className="flex border-b border-gray-200 bg-white rounded-xl shadow-xs p-1">
                    <button
                        type="button"
                        onClick={() => { setActiveTab('ky6'); setSearchTerm(''); }}
                        className={`flex-1 py-3 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'ky6' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <FileText size={16} />
                        <span>แบบ ค.ย. ๖ (บัญชีรับซื้อยาง)</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                            {filteredBuys.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('ky7'); setSearchTerm(''); }}
                        className={`flex-1 py-3 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'ky7' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Truck size={16} />
                        <span>แบบ ค.ย. ๗ (บัญชีจำหน่ายยาง)</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                            {filteredSells.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('ky8'); setSearchTerm(''); }}
                        className={`flex-1 py-3 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'ky8' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Layers size={16} />
                        <span>แบบ ค.ย. ๘ (สต็อกคงเหลือ)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('cert'); setSearchTerm(''); }}
                        className={`flex-1 py-3 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'cert' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Award size={16} />
                        <span>หนังสือรับรองชาวสวน</span>
                    </button>
                </div>

                {/* Sub-Filters: Search & Rubber Type */}
                {activeTab !== 'ky8' && activeTab !== 'cert' && (
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs">
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-full sm:w-72">
                            <Search size={15} className="text-gray-400 mr-2 flex-shrink-0" />
                            <input 
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="ค้นหาชื่อเกษตรกร, โรงงาน, รหัส..."
                                className="bg-transparent text-xs w-full focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500 font-bold mr-1 flex items-center">
                                <Filter size={13} className="mr-1 text-gray-400" /> ชนิดยาง:
                            </span>
                            {['all', 'latex', 'cup', 'raw_sheet', 'scrap'].map(tKey => (
                                <button
                                    key={tKey}
                                    type="button"
                                    onClick={() => setRubberTypeFilter(tKey)}
                                    className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] ${
                                        rubberTypeFilter === tKey 
                                            ? 'bg-rubber-600 text-white shadow-xs' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {RUBBER_TYPE_LABELS[tKey]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Summary Metrics Cards */}
                {activeTab === 'ky6' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-center space-x-3">
                            <Scale className="text-emerald-600" size={26} />
                            <div>
                                <p className="text-xs text-emerald-700 font-bold">น้ำหนักรับซื้อสดรวม</p>
                                <p className="text-lg font-black text-emerald-950">{totalsKy6.totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2 })} กก.</p>
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-center space-x-3">
                            <Award className="text-blue-600" size={26} />
                            <div>
                                <p className="text-xs text-blue-700 font-bold">เนื้อยางแห้งรวม (DRC)</p>
                                <p className="text-lg font-black text-blue-950">{totalsKy6.totalDryRubber.toLocaleString('th-TH', { minimumFractionDigits: 2 })} กก. DRC</p>
                            </div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-center space-x-3">
                            <DollarSign className="text-amber-600" size={26} />
                            <div>
                                <p className="text-xs text-amber-700 font-bold">มูลค่ารับซื้อสุทธิรวม</p>
                                <p className="text-lg font-black text-amber-950">฿{totalsKy6.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ky7' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 flex items-center space-x-3">
                            <Truck className="text-purple-600" size={26} />
                            <div>
                                <p className="text-xs text-purple-700 font-bold">น้ำหนักจำหน่ายออกรวม</p>
                                <p className="text-lg font-black text-purple-950">{totalsKy7.totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2 })} กก.</p>
                            </div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-center space-x-3">
                            <Award className="text-blue-600" size={26} />
                            <div>
                                <p className="text-xs text-blue-700 font-bold">เนื้อยางแห้งจำหน่ายรวม</p>
                                <p className="text-lg font-black text-blue-950">{totalsKy7.totalDryRubber.toLocaleString('th-TH', { minimumFractionDigits: 2 })} กก. DRC</p>
                            </div>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-center space-x-3">
                            <DollarSign className="text-emerald-600" size={26} />
                            <div>
                                <p className="text-xs text-emerald-700 font-bold">มูลค่าจำหน่ายรวม</p>
                                <p className="text-lg font-black text-emerald-950">฿{totalsKy7.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Farmer Certificate Selector Box */}
                {activeTab === 'cert' && (
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    เลือกเกษตรกรชาวสวนยาง *
                                </label>
                                <select
                                    value={selectedFarmerId}
                                    onChange={(e) => setSelectedFarmerId(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">-- กรุณาเลือกเกษตรกรเพื่อออกหนังสือรับรอง --</option>
                                    {farmers.map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.name} {f.realName ? `(${f.realName})` : ''} {f.phone ? `[${f.phone}]` : ''} {f.idCard ? `[บัตร: ${f.idCard}]` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    รอบเวลาที่รับรอง
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700">
                                        ประจำเดือน {formatThaiMonth(selectedMonth)}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        (สามารถเปลี่ยนเดือนได้จากแถบด้านบน)
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Document Content View (Both for Screen and High-Res Print/PDF) */}
            <div ref={printAreaRef} className="print-area bg-white text-black p-4 sm:p-8 rounded-2xl border border-gray-200 shadow-sm font-sans">
                {/* ═════════════════════════════════════════════════════════════════════════════ */}
                {/* 1. แบบ ค.ย. ๖ — บัญชีแสดงการรับซื้อยางพารา */}
                {/* ═════════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'ky6' && (
                    <div className="space-y-4">
                        {/* Official Document Header */}
                        <div className="relative text-center border-b border-black pb-3">
                            <span className="absolute right-0 top-0 text-sm font-bold border border-black px-2 py-0.5">
                                แบบ ค.ย. ๖
                            </span>
                            <h2 className="text-xl font-bold tracking-tight">บัญชีแสดงการรับซื้อยางพารา</h2>
                            <p className="text-xs mt-1">ตามพระราชบัญญัติควบคุมยาง พ.ศ. ๒๕๔๒</p>
                            <p className="text-sm font-bold mt-1.5">
                                ประจำเดือน {formatThaiMonth(selectedMonth)}
                            </p>
                            
                            <div className="grid grid-cols-2 text-left text-xs mt-3 pt-2 border-t border-dashed border-gray-400 gap-x-4 gap-y-1">
                                <div>
                                    <span className="font-bold">ชื่อผู้รับใบอนุญาตค้ายาง:</span> {storeName}
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">เลขที่ใบอนุญาตค้ายาง:</span> {licenseNo || '........................................'}
                                </div>
                                <div className="col-span-2">
                                    <span className="font-bold">สถานที่ตั้งจุดรับซื้อ:</span> {storeAddress}
                                </div>
                            </div>
                        </div>

                        {/* Official KY6 Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-[11px] leading-tight">
                                <thead>
                                    <tr className="bg-gray-100 text-center font-bold border-b border-black">
                                        <th className="border border-black p-1.5 w-8">ลำดับ</th>
                                        <th className="border border-black p-1.5 w-16">วัน เดือน ปี</th>
                                        <th className="border border-black p-1.5 text-left">ชื่อ - สกุล ผู้ขาย (เกษตรกร)</th>
                                        <th className="border border-black p-1.5 w-24">เลขประจำตัวประชาชน / รหัส กยท.</th>
                                        <th className="border border-black p-1.5 w-18">ชนิดยาง</th>
                                        <th className="border border-black p-1.5 text-right w-16">น้ำหนักสด (กก.)</th>
                                        <th className="border border-black p-1.5 text-right w-12">% DRC</th>
                                        <th className="border border-black p-1.5 text-right w-16">เนื้อยางแห้ง (กก.)</th>
                                        <th className="border border-black p-1.5 text-right w-14">ราคา/กก. (บาท)</th>
                                        <th className="border border-black p-1.5 text-right w-20">จำนวนเงิน (บาท)</th>
                                        <th className="border border-black p-1.5 text-center w-16">ลายมือชื่อผู้ขาย</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="11" className="text-center py-8 text-gray-400">
                                                กำลังโหลดข้อมูลแบบ ค.ย. ๖...
                                            </td>
                                        </tr>
                                    ) : filteredBuys.length === 0 ? (
                                        <tr>
                                            <td colSpan="11" className="text-center py-8 text-gray-400">
                                                ไม่มีรายการรับซื้อยางในเดือน {formatThaiMonth(selectedMonth)}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBuys.map((b, idx) => {
                                            const fm = farmersMap[b.farmerId] || farmersMap[b.farmerName] || {};
                                            const dry = Number(b.dryRubber || (b.drc > 0 ? (b.weight * b.drc) / 100 : b.weight));
                                            return (
                                                <tr key={b.id || idx} className="hover:bg-gray-50">
                                                    <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                                                    <td className="border border-black p-1.5 text-center whitespace-nowrap">{b.date}</td>
                                                    <td className="border border-black p-1.5 font-bold text-left">
                                                        {fm.realName ? (
                                                            <span>{fm.realName} <span className="text-[10px] text-gray-500 font-normal">({b.farmerName || fm.name})</span></span>
                                                        ) : (
                                                            b.farmerName || fm.name
                                                        )}
                                                    </td>
                                                    <td className="border border-black p-1.5 text-center font-mono text-[10px]">{fm.idCard || fm.id_card || fm.fscId || '-'}</td>
                                                    <td className="border border-black p-1.5 text-center">{getRubberTypeLabel(b.rubberType)}</td>
                                                    <td className="border border-black p-1.5 text-right font-mono">{Number(b.weight || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="border border-black p-1.5 text-right font-mono">{Number(b.drc || 0).toFixed(1)}%</td>
                                                    <td className="border border-black p-1.5 text-right font-mono font-bold">{dry.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="border border-black p-1.5 text-right font-mono">{Number(b.pricePerKg || 0).toFixed(2)}</td>
                                                    <td className="border border-black p-1.5 text-right font-mono font-bold">{Number(b.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="border border-black p-1 text-center text-[9px] text-gray-400"></td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold border-t-2 border-black">
                                        <td colSpan="5" className="border border-black p-1.5 text-right font-black">
                                            รวมทั้งสิ้น ({filteredBuys.length} รายการ):
                                        </td>
                                        <td className="border border-black p-1.5 text-right font-mono font-black">
                                            {totalsKy6.totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-black p-1.5 text-center">-</td>
                                        <td className="border border-black p-1.5 text-right font-mono font-black text-blue-900">
                                            {totalsKy6.totalDryRubber.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-black p-1.5 text-center">-</td>
                                        <td className="border border-black p-1.5 text-right font-mono font-black text-red-900">
                                            {totalsKy6.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-black p-1.5 text-center"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Official Signature Verification Footer */}
                        <div className="pt-6 grid grid-cols-2 text-xs">
                            <div className="space-y-1">
                                <p className="font-bold">หมายเหตุ:</p>
                                <p className="text-[10px] text-gray-600">
                                    ๑. ผู้รับซื้อต้องจัดทำบัญชีนี้ประจำวันให้เสร็จสิ้นภายในวันที่มีการรับซื้อ<br />
                                    ๒. จัดส่งแบบ ค.ย. ๖ ให้สำนักงานการยางแห่งประเทศไทยสาขา/จังหวัด ภายในวันที่ ๕ ของเดือนถัดไป
                                </p>
                            </div>
                            <div className="text-center space-y-4">
                                <p className="font-bold">ขอรับรองว่ารายการดังกล่าวข้างต้นเป็นความจริงทุกประการ</p>
                                <p className="pt-6">ลงชื่อ ................................................................ ผู้ประกอบกิจการค้ายาง</p>
                                <p>(................................................................)</p>
                                <p>วันที่ .......... เดือน .............................. พ.ศ. ...............</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════════════ */}
                {/* 2. แบบ ค.ย. ๗ — บัญชีแสดงการจำหน่ายยางพารา */}
                {/* ═════════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'ky7' && (
                    <div className="space-y-4">
                        {/* Official Document Header */}
                        <div className="relative text-center border-b border-black pb-3">
                            <span className="absolute right-0 top-0 text-sm font-bold border border-black px-2 py-0.5">
                                แบบ ค.ย. ๗
                            </span>
                            <h2 className="text-xl font-bold tracking-tight">บัญชีแสดงการจำหน่ายยางพารา</h2>
                            <p className="text-xs mt-1">ตามพระราชบัญญัติควบคุมยาง พ.ศ. ๒๕๔๒</p>
                            <p className="text-sm font-bold mt-1.5">
                                ประจำเดือน {formatThaiMonth(selectedMonth)}
                            </p>
                            
                            <div className="grid grid-cols-2 text-left text-xs mt-3 pt-2 border-t border-dashed border-gray-400 gap-x-4 gap-y-1">
                                <div>
                                    <span className="font-bold">ชื่อผู้รับใบอนุญาตค้ายาง:</span> {storeName}
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">เลขที่ใบอนุญาตค้ายาง:</span> {licenseNo || '........................................'}
                                </div>
                                <div className="col-span-2">
                                    <span className="font-bold">สถานที่ตั้ง:</span> {storeAddress}
                                </div>
                            </div>
                        </div>

                        {/* Official KY7 Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-[11px] leading-tight">
                                <thead>
                                    <tr className="bg-gray-100 text-center font-bold border-b border-black">
                                        <th className="border border-black p-1.5 w-8">ลำดับ</th>
                                        <th className="border border-black p-1.5 w-18">วัน เดือน ปี</th>
                                        <th className="border border-black p-1.5 text-left">ผู้ซื้อ / โรงงานปลายทาง</th>
                                        <th className="border border-black p-1.5 w-20">เลขที่บิล/ใบส่งของ</th>
                                        <th className="border border-black p-1.5 w-20">ชนิดยาง</th>
                                        <th className="border border-black p-1.5 text-right w-18">น้ำหนักจำหน่าย (กก.)</th>
                                        <th className="border border-black p-1.5 text-right w-12">% DRC</th>
                                        <th className="border border-black p-1.5 text-right w-18">เนื้อยางแห้ง (กก.)</th>
                                        <th className="border border-black p-1.5 text-right w-16">ราคา/กก. (บาท)</th>
                                        <th className="border border-black p-1.5 text-right w-22">มูลค่ารวม (บาท)</th>
                                        <th className="border border-black p-1.5 text-center w-20">ทะเบียนรถขนส่ง</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="11" className="text-center py-8 text-gray-400">
                                                กำลังโหลดข้อมูลแบบ ค.ย. ๗...
                                            </td>
                                        </tr>
                                    ) : filteredSells.length === 0 ? (
                                        <tr>
                                            <td colSpan="11" className="text-center py-8 text-gray-400">
                                                ไม่มีรายการจำหน่ายยางในเดือน {formatThaiMonth(selectedMonth)}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSells.map((s, idx) => {
                                            const buyer = s.buyerName || factoriesMap[s.factoryId]?.name || 'โรงงานแปรรูป';
                                            const dry = Number(s.drc > 0 ? (s.weight * s.drc) / 100 : s.weight);
                                            return (
                                                <tr key={s.id || idx} className="hover:bg-gray-50">
                                                    <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                                                    <td className="border border-black p-1.5 text-center whitespace-nowrap">{s.date}</td>
                                                    <td className="border border-black p-1.5 font-bold text-left">{buyer}</td>
                                                    <td className="border border-black p-1.5 text-center font-mono text-[10px]">{s.id}</td>
                                                    <td className="border border-black p-1.5 text-center">{getRubberTypeLabel(s.rubberType)}</td>
                                                    <td className="border border-black p-1.5 text-right font-mono">{Number(s.weight || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="border border-black p-1.5 text-right font-mono">{Number(s.drc || 0).toFixed(1)}%</td>
                                                    <td className="border border-black p-1.5 text-right font-mono font-bold">{dry.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="border border-black p-1.5 text-right font-mono">{Number(s.pricePerKg || 0).toFixed(2)}</td>
                                                    <td className="border border-black p-1.5 text-right font-mono font-bold">{Number(s.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="border border-black p-1.5 text-center font-mono text-[10px]">{s.truckInfo || '-'}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold border-t-2 border-black">
                                        <td colSpan="5" className="border border-black p-1.5 text-right font-black">
                                            รวมทั้งสิ้น ({filteredSells.length} รายการ):
                                        </td>
                                        <td className="border border-black p-1.5 text-right font-mono font-black">
                                            {totalsKy7.totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-black p-1.5 text-center">-</td>
                                        <td className="border border-black p-1.5 text-right font-mono font-black text-blue-900">
                                            {totalsKy7.totalDryRubber.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-black p-1.5 text-center">-</td>
                                        <td className="border border-black p-1.5 text-right font-mono font-black text-purple-900">
                                            {totalsKy7.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-black p-1.5 text-center"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Signature Footer */}
                        <div className="pt-6 grid grid-cols-2 text-xs">
                            <div className="space-y-1">
                                <p className="font-bold">หมายเหตุ:</p>
                                <p className="text-[10px] text-gray-600">
                                    จัดส่งแบบ ค.ย. ๗ ให้สำนักงานการยางแห่งประเทศไทยสาขา/จังหวัด ภายในวันที่ ๕ ของเดือนถัดไป
                                </p>
                            </div>
                            <div className="text-center space-y-4">
                                <p className="font-bold">ขอรับรองว่ารายการดังกล่าวข้างต้นเป็นความจริงทุกประการ</p>
                                <p className="pt-6">ลงชื่อ ................................................................ ผู้ประกอบกิจการค้ายาง</p>
                                <p>(................................................................)</p>
                                <p>วันที่ .......... เดือน .............................. พ.ศ. ...............</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════════════ */}
                {/* 3. แบบ ค.ย. ๘ — บัญชีแสดงปริมาณยางคงเหลือประจำเดือน */}
                {/* ═════════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'ky8' && (
                    <div className="space-y-4">
                        {/* Official Document Header */}
                        <div className="relative text-center border-b border-black pb-3">
                            <span className="absolute right-0 top-0 text-sm font-bold border border-black px-2 py-0.5">
                                แบบ ค.ย. ๘
                            </span>
                            <h2 className="text-xl font-bold tracking-tight">บัญชีแสดงปริมาณยางคงเหลือประจำเดือน</h2>
                            <p className="text-xs mt-1">ตามพระราชบัญญัติควบคุมยาง พ.ศ. ๒๕๔๒</p>
                            <p className="text-sm font-bold mt-1.5">
                                ประจำเดือน {formatThaiMonth(selectedMonth)}
                            </p>
                            
                            <div className="grid grid-cols-2 text-left text-xs mt-3 pt-2 border-t border-dashed border-gray-400 gap-x-4 gap-y-1">
                                <div>
                                    <span className="font-bold">ชื่อผู้รับใบอนุญาตค้ายาง:</span> {storeName}
                                </div>
                                <div className="text-right">
                                    <span className="font-bold">เลขที่ใบอนุญาตค้ายาง:</span> {licenseNo || '........................................'}
                                </div>
                                <div className="col-span-2">
                                    <span className="font-bold">สถานที่ตั้ง:</span> {storeAddress}
                                </div>
                            </div>
                        </div>

                        {/* KY8 Breakdown Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-xs leading-tight">
                                <thead>
                                    <tr className="bg-gray-100 text-center font-bold border-b border-black">
                                        <th className="border border-black p-2 w-10">ลำดับ</th>
                                        <th className="border border-black p-2 text-left">ชนิดยางพารา</th>
                                        <th className="border border-black p-2 text-right">ยอดยกมาจากเดือนก่อน (กก.)</th>
                                        <th className="border border-black p-2 text-right">รับซื้อในเดือน (กก.)</th>
                                        <th className="border border-black p-2 text-right">รวมปริมาณทั้งสิ้น (กก.)</th>
                                        <th className="border border-black p-2 text-right">จำหน่ายในเดือน (กก.)</th>
                                        <th className="border border-black p-2 text-right">น้ำหนักลด/สูญเสีย (กก.)</th>
                                        <th className="border border-black p-2 text-right">คงเหลือยกไป (กก.)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockSummaryKy8.map((row, idx) => {
                                        const totalWeight = row.broughtForward + row.boughtWeight;
                                        return (
                                            <tr key={row.typeName} className="hover:bg-gray-50">
                                                <td className="border border-black p-2 text-center">{idx + 1}</td>
                                                <td className="border border-black p-2 font-bold">{row.typeName}</td>
                                                <td className="border border-black p-2 text-right font-mono">{row.broughtForward.toFixed(2)}</td>
                                                <td className="border border-black p-2 text-right font-mono font-bold text-emerald-800">{row.boughtWeight.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td className="border border-black p-2 text-right font-mono">{totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td className="border border-black p-2 text-right font-mono font-bold text-purple-800">{row.soldWeight.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td className="border border-black p-2 text-right font-mono text-gray-500">{row.lossWeight.toFixed(2)}</td>
                                                <td className="border border-black p-2 text-right font-mono font-black text-blue-900 bg-blue-50/20">{row.balanceWeight.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold border-t-2 border-black">
                                        <td colSpan="2" className="border border-black p-2 text-right font-black">รวมทุกชนิดยาง:</td>
                                        <td className="border border-black p-2 text-right font-mono font-black">0.00</td>
                                        <td className="border border-black p-2 text-right font-mono font-black text-emerald-900">
                                            {stockSummaryKy8.reduce((s, r) => s + r.boughtWeight, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-black p-2 text-right font-mono font-black">
                                            {stockSummaryKy8.reduce((s, r) => s + r.boughtWeight, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-black p-2 text-right font-mono font-black text-purple-900">
                                            {stockSummaryKy8.reduce((s, r) => s + r.soldWeight, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-black p-2 text-right font-mono font-black">
                                            {stockSummaryKy8.reduce((s, r) => s + r.lossWeight, 0).toFixed(2)}
                                        </td>
                                        <td className="border border-black p-2 text-right font-mono font-black text-blue-950">
                                            {stockSummaryKy8.reduce((s, r) => s + r.balanceWeight, 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Signature Footer */}
                        <div className="pt-8 text-right space-y-4 text-xs pr-12">
                            <p className="font-bold">ขอรับรองว่าปริมาณยางคงเหลือดังกล่าวถูกต้องตามความเป็นจริง</p>
                            <p className="pt-6">ลงชื่อ ................................................................ ผู้ประกอบกิจการค้ายาง</p>
                            <p>(................................................................)</p>
                            <p>วันที่ .......... เดือน .............................. พ.ศ. ...............</p>
                        </div>
                    </div>
                )}

                {/* ═════════════════════════════════════════════════════════════════════════════ */}
                {/* 4. หนังสือรับรองประวัติการขายยาง (สำหรับชาวสวนนำไปยื่น กยท.) */}
                {/* ═════════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'cert' && (
                    <div>
                        {!farmerCertData ? (
                            <div className="text-center py-16 text-gray-400">
                                <Award size={48} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-bold">กรุณาเลือกเกษตรกรจากช่องด้านบนเพื่อสร้างหนังสือรับรอง</p>
                            </div>
                        ) : (
                            <div className="space-y-6 max-w-3xl mx-auto py-4">
                                {/* Certificate Header */}
                                <div className="text-center space-y-2 border-b-2 border-black pb-4">
                                    <h2 className="text-2xl font-black tracking-tight">หนังสือรับรองการจำหน่ายผลผลิตยางพารา</h2>
                                    <p className="text-xs font-bold text-gray-700">
                                        (สำหรับเกษตรกรชาวสวนยางใช้ประกอบการยื่นขอรับเงินชดเชย / สิทธิประโยชน์ ต่อการยางแห่งประเทศไทย)
                                    </p>
                                    <p className="text-xs">
                                        ออกโดย: <span className="font-bold">{storeName}</span> | เลขที่ใบอนุญาตค้ายาง กยท.: <span className="font-bold">{licenseNo || '................................'}</span>
                                    </p>
                                </div>

                                {/* Statement */}
                                <div className="text-sm leading-relaxed space-y-3 pt-2 text-justify">
                                    <p className="indent-8">
                                        หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า <span className="font-bold underline text-base">{farmerCertData.farmer.realName || farmerCertData.farmer.name}</span>
                                        {farmerCertData.farmer.realName && farmerCertData.farmer.name && farmerCertData.farmer.realName !== farmerCertData.farmer.name && (
                                            <span className="text-xs text-gray-600"> (ชื่อที่ใช้ในร้าน: {farmerCertData.farmer.name})</span>
                                        )}
                                        {farmerCertData.farmer.idCard && <> เลขประจำตัวประชาชน <span className="font-bold font-mono">{farmerCertData.farmer.idCard}</span></>}
                                        {farmerCertData.farmer.fscId && <> ทะเบียนเกษตรกรชาวสวนยาง (กยท.) เลขที่ <span className="font-bold font-mono">{farmerCertData.farmer.fscId}</span></>}
                                        {farmerCertData.farmer.phone && <> เบอร์โทรศัพท์ <span className="font-bold font-mono">{farmerCertData.farmer.phone}</span></>}
                                        {farmerCertData.farmer.address && <> ที่อยู่ <span className="font-medium">{farmerCertData.farmer.address}</span></>}
                                    </p>
                                    <p className="indent-8">
                                        ได้นำผลผลิตยางพารามาจำหน่าย ณ จุดรับซื้อของข้าพเจ้าจริง ในรอบประจำเดือน <span className="font-bold underline">{formatThaiMonth(selectedMonth)}</span> โดยมีรายละเอียดการส่งมอบผลผลิตยางพาราดังต่อไปนี้:
                                    </p>
                                </div>

                                {/* Certificate Table */}
                                <table className="w-full border-collapse border border-black text-xs">
                                    <thead>
                                        <tr className="bg-gray-100 text-center font-bold">
                                            <th className="border border-black p-1.5 w-10">ลำดับ</th>
                                            <th className="border border-black p-1.5 w-24">วันที่ขาย</th>
                                            <th className="border border-black p-1.5">ชนิดยาง</th>
                                            <th className="border border-black p-1.5 text-right w-24">น้ำหนักสด (กก.)</th>
                                            <th className="border border-black p-1.5 text-right w-16">% DRC</th>
                                            <th className="border border-black p-1.5 text-right w-24">เนื้อยางแห้ง (กก.)</th>
                                            <th className="border border-black p-1.5 text-right w-28">ยอดเงินที่ได้รับ (บาท)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {farmerCertData.records.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center py-6 text-gray-400">
                                                    ไม่พบประวัติการขายยางในเดือน {formatThaiMonth(selectedMonth)}
                                                </td>
                                            </tr>
                                        ) : (
                                            farmerCertData.records.map((r, idx) => {
                                                const dry = Number(r.dryRubber || (r.drc > 0 ? (r.weight * r.drc) / 100 : r.weight));
                                                return (
                                                    <tr key={r.id || idx}>
                                                        <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                                                        <td className="border border-black p-1.5 text-center">{formatThaiDate(r.date)}</td>
                                                        <td className="border border-black p-1.5 font-bold">{getRubberTypeLabel(r.rubberType)}</td>
                                                        <td className="border border-black p-1.5 text-right font-mono">{Number(r.weight || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                        <td className="border border-black p-1.5 text-right font-mono">{Number(r.drc || 0).toFixed(1)}%</td>
                                                        <td className="border border-black p-1.5 text-right font-mono font-bold">{dry.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                        <td className="border border-black p-1.5 text-right font-mono font-bold">{Number(r.total || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-100 font-bold border-t-2 border-black">
                                            <td colSpan="3" className="border border-black p-1.5 text-right font-black">
                                                สรุปรวมทั้งสิ้น ({farmerCertData.count} ครั้ง):
                                            </td>
                                            <td className="border border-black p-1.5 text-right font-mono font-black text-emerald-900">
                                                {farmerCertData.totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="border border-black p-1.5 text-center">-</td>
                                            <td className="border border-black p-1.5 text-right font-mono font-black text-blue-900">
                                                {farmerCertData.totalDry.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="border border-black p-1.5 text-right font-mono font-black text-red-900">
                                                ฿{farmerCertData.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {/* Summary Words */}
                                <div className="p-3 bg-gray-50 border border-gray-300 rounded text-xs space-y-1">
                                    <p>
                                        <span className="font-bold">สรุปเนื้อยางแห้งรวม:</span> {farmerCertData.totalDry.toLocaleString('th-TH', { minimumFractionDigits: 2 })} กิโลกรัม (DRC)
                                    </p>
                                    <p>
                                        <span className="font-bold">รวมเป็นเงินทั้งสิ้น:</span> {farmerCertData.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                                    </p>
                                </div>

                                {/* Official Sign & Seal Box */}
                                <div className="pt-10 grid grid-cols-2 text-xs">
                                    <div className="flex flex-col items-center justify-center border border-dashed border-gray-300 h-28 text-gray-400 rounded">
                                        <span>(ประทับตราจุดรับซื้อยาง)</span>
                                    </div>
                                    <div className="text-center space-y-4">
                                        <p className="font-bold">ขอรับรองว่าข้อมูลทั้งหมดข้างต้นเป็นความจริง</p>
                                        <p className="pt-6">ลงชื่อ ................................................................ ผู้รับซื้อยาง / ผู้จัดการ</p>
                                        <p>(................................................................)</p>
                                        <p>วันที่ .......... เดือน .............................. พ.ศ. ...............</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RaotReport;
