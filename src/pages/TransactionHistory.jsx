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
                farmers={farmers}
                factories={factories}
                setFilters={setFilters}
            />

            <HistorySummary totals={summary} />

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
