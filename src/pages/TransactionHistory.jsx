import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { 
    fetchBuyRecords, 
    fetchSellRecords, 
    getSettings,
    fetchFarmers,
    fetchMemberTypes
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

            if (farmersRes) setFarmers(farmersRes);
            if (mtRes) setMemberTypes(mtRes);
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

            <HistoryHeader 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                filters={filters} 
                handleFilterChange={handleFilterChange} 
            />

            <HistorySummary totals={totals} />

            <HistoryTable 
                loading={loading} 
                filteredRecords={filteredRecords} 
                activeTab={activeTab} 
                handlePrintBuy={handlePrintBuy} 
                handlePrintSell={handlePrintSell} 
                setViewingEslip={setViewingEslip} 
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
            />

            <HistoryESlipModal 
                viewingEslip={viewingEslip}
                handleCloseEslip={handleCloseEslip}
                activeTab={activeTab}
                settings={settings}
                farmers={farmers}
                memberTypes={memberTypes}
            />
        </div>
    );
};

export default TransactionHistory;
