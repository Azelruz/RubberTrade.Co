import React, { useState, useEffect, useMemo } from 'react';
import { 
    Wallet, CheckCircle2, Clock, Printer, RefreshCw, 
    ArrowRightLeft, AlertCircle, Search, Filter, Coins, Check, FileText 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchDividendDistributions, updateDividendDistribution } from '../../services/apiService';
import { DividendStatementModal } from './DividendStatementModal';

export const PayoutTab = ({ 
    periods = [], 
    selectedPeriodId, 
    onSelectPeriod, 
    settings = {} 
}) => {
    const [distributions, setDistributions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Printing state
    const [printingDistribution, setPrintingDistribution] = useState(null);

    // Active period
    const activePeriod = useMemo(() => {
        if (!periods || periods.length === 0) return null;
        if (selectedPeriodId) {
            return periods.find(p => p.id === selectedPeriodId) || periods[0];
        }
        return periods[0];
    }, [periods, selectedPeriodId]);

    const loadDistributions = async (periodId) => {
        if (!periodId) return;
        setLoading(true);
        try {
            const res = await fetchDividendDistributions(periodId);
            setDistributions(Array.isArray(res) ? res : []);
        } catch (err) {
            toast.error('โหลดรายการจ่ายเงินล้มเหลว: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activePeriod?.id) {
            loadDistributions(activePeriod.id);
        }
    }, [activePeriod?.id]);

    const handleUpdateStatus = async (dist, newStatus, payoutMethod = 'transfer') => {
        try {
            const res = await updateDividendDistribution({
                id: dist.id,
                payoutStatus: newStatus,
                payoutMethod,
                paidDate: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null
            });

            if (res && res.status === 'success') {
                toast.success(newStatus === 'paid' ? `บันทึกจ่ายเงินให้ ${dist.memberName} สำเร็จ` : 'อัปเดตสถานะสำเร็จ');
                setDistributions(prev => prev.map(d => d.id === dist.id ? { 
                    ...d, 
                    payoutStatus: newStatus,
                    payoutMethod,
                    grossPayout: res.grossPayout,
                    netPayout: res.netPayout
                } : d));
            }
        } catch (err) {
            toast.error('อัปเดตล้มเหลว: ' + err.message);
        }
    };

    const handleAutoDeductDebt = async (dist) => {
        if (!dist.remainingDebt || dist.remainingDebt <= 0) {
            return toast.error('สมาชิกรายนี้ไม่มียอดหนี้คงค้าง');
        }

        const deductAmt = Math.min(dist.grossPayout, dist.remainingDebt);
        try {
            const res = await updateDividendDistribution({
                id: dist.id,
                deductedLoanAmount: deductAmt
            });

            if (res && res.status === 'success') {
                toast.success(`ตัดหนี้ ${deductAmt.toLocaleString()} บ. สำเร็จ`);
                setDistributions(prev => prev.map(d => d.id === dist.id ? {
                    ...d,
                    deductedLoanAmount: deductAmt,
                    netPayout: res.netPayout
                } : d));
            }
        } catch (err) {
            toast.error('ตัดหนี้ล้มเหลว: ' + err.message);
        }
    };

    // Summary calculations
    const summary = useMemo(() => {
        const totalNet = distributions.reduce((sum, d) => sum + Number(d.netPayout || 0), 0);
        const totalPaid = distributions.filter(d => d.payoutStatus === 'paid' || d.payoutStatus === 'reinvested')
                                       .reduce((sum, d) => sum + Number(d.netPayout || 0), 0);
        const totalDebtRecovered = distributions.reduce((sum, d) => sum + Number(d.deductedLoanAmount || 0), 0);
        const paidCount = distributions.filter(d => d.payoutStatus === 'paid').length;
        const reinvestCount = distributions.filter(d => d.payoutStatus === 'reinvested').length;
        const pendingCount = distributions.filter(d => d.payoutStatus === 'pending').length;

        return {
            totalNet,
            totalPaid,
            totalDebtRecovered,
            paidCount,
            reinvestCount,
            pendingCount
        };
    }, [distributions]);

    const filteredDistributions = useMemo(() => {
        return distributions.filter(d => {
            const matchSearch = (d.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (d.memberNo || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = statusFilter === 'all' || d.payoutStatus === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [distributions, searchTerm, statusFilter]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Period Selector & Action Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    <span className="text-xs font-bold text-gray-500 whitespace-nowrap">เลือกรอบปันผล:</span>
                    <select
                        value={activePeriod?.id || ''}
                        onChange={(e) => {
                            if (onSelectPeriod) onSelectPeriod(e.target.value);
                        }}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black text-gray-900 focus:ring-2 focus:ring-emerald-500 flex-1 md:w-80"
                    >
                        {periods.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.title || `ปี ${p.year}`} ({p.startDate} ถึง {p.endDate})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Filters */}
                <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อสมาชิก..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="pending">รอการจ่าย</option>
                        <option value="paid">จ่ายแล้ว</option>
                        <option value="reinvested">ทบเป็นหุ้น</option>
                    </select>
                </div>
            </div>

            {/* Payout Summary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] text-gray-400 block font-bold uppercase">ยอดเงินปันผลสุทธิรวม</span>
                    <span className="text-xl font-black font-mono text-gray-900 mt-1 block">
                        {summary.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1 block">สมาชิก {distributions.length} ราย</span>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                    <span className="text-[10px] text-emerald-800 block font-bold uppercase">จ่ายสำเร็จแล้ว</span>
                    <span className="text-xl font-black font-mono text-emerald-700 mt-1 block">
                        {summary.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                    </span>
                    <span className="text-[11px] text-emerald-600 mt-1 block font-bold">
                        จ่ายแล้ว {summary.paidCount} ราย | ทบหุ้น {summary.reinvestCount} ราย
                    </span>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
                    <span className="text-[10px] text-amber-800 block font-bold uppercase">คงค้างรอจ่าย</span>
                    <span className="text-xl font-black font-mono text-amber-700 mt-1 block">
                        {(summary.totalNet - summary.totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                    </span>
                    <span className="text-[11px] text-amber-600 mt-1 block font-bold">รอจ่าย {summary.pendingCount} ราย</span>
                </div>

                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 shadow-sm">
                    <span className="text-[10px] text-purple-800 block font-bold uppercase">ตัดชำระหนี้เงินกู้คืน</span>
                    <span className="text-xl font-black font-mono text-purple-700 mt-1 block">
                        {summary.totalDebtRecovered.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                    </span>
                    <span className="text-[11px] text-purple-600 mt-1 block font-bold">ลด NPL หนี้ค้างกลุ่ม</span>
                </div>
            </div>

            {/* Payout Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="py-3 px-4">รหัส / สมาชิก</th>
                                <th className="py-3 px-4">บัญชีรับเงิน</th>
                                <th className="py-3 px-4 text-right">ปันผลหุ้น (บ.)</th>
                                <th className="py-3 px-4 text-right">เฉลี่ยคืน (บ.)</th>
                                <th className="py-3 px-4 text-right">โบนัส (บ.)</th>
                                <th className="py-3 px-4 text-right text-red-600">หนี้ที่หัก (บ.)</th>
                                <th className="py-3 px-4 text-right text-emerald-700">ยอดรับสุทธิ (บ.)</th>
                                <th className="py-3 px-4 text-center">สถานะ</th>
                                <th className="py-3 px-4 text-center">จัดการ & จ่ายเงิน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredDistributions.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-gray-400">
                                        {loading ? 'กำลังโหลดรายการจ่ายเงิน...' : 'ไม่พบข้อมูลการจ่ายเงิน'}
                                    </td>
                                </tr>
                            ) : (
                                filteredDistributions.map(dist => {
                                    const isPaid = dist.payoutStatus === 'paid';
                                    const isReinvest = dist.payoutStatus === 'reinvested';

                                    return (
                                        <tr key={dist.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="py-3 px-4">
                                                <p className="font-bold text-gray-900">{dist.memberName}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{dist.memberNo}</p>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {dist.memberBankAcc ? (
                                                    <div>
                                                        <p className="font-mono text-gray-800">{dist.memberBankAcc}</p>
                                                        <p className="text-[10px] text-gray-400">{dist.memberBankName || 'พร้อมเพย์'}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">รับเงินสดหน้าร้าน</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono">
                                                {Number(dist.dividendShareAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono">
                                                {Number(dist.patronageRefundAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono">
                                                {Number(dist.boardBonusAmount || 0) > 0 
                                                    ? Number(dist.boardBonusAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })
                                                    : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-red-600 font-bold">
                                                {Number(dist.deductedLoanAmount || 0) > 0 
                                                    ? `-${Number(dist.deductedLoanAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                                    : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                                                {Number(dist.netPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    isPaid ? 'bg-emerald-100 text-emerald-800' :
                                                    isReinvest ? 'bg-blue-100 text-blue-800' :
                                                    'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {isPaid ? 'จ่ายแล้ว' : isReinvest ? 'ทบเป็นหุ้น' : 'รอจ่าย'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center space-x-1.5">
                                                    {/* Print Statement Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setPrintingDistribution(dist)}
                                                        className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
                                                        title="พิมพ์ใบแจ้งยอดปันผล-เฉลี่ยคืน"
                                                    >
                                                        <Printer size={14} />
                                                    </button>

                                                    {/* Action Dropdown or Buttons */}
                                                    {!isPaid && !isReinvest ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateStatus(dist, 'paid', 'transfer')}
                                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm"
                                                            >
                                                                โอนเงิน
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateStatus(dist, 'paid', 'cash')}
                                                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold"
                                                            >
                                                                เงินสด
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateStatus(dist, 'reinvested', 'reinvest_share')}
                                                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold"
                                                                title="ทบยอดเงินปันผลนี้ไปซื้อหุ้นสะสมเพิ่ม"
                                                            >
                                                                ทบหุ้น
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateStatus(dist, 'pending')}
                                                            className="text-gray-400 hover:text-red-600 text-[10px] underline ml-1"
                                                        >
                                                            ยกเลิก
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print Modal */}
            {printingDistribution && (
                <DividendStatementModal
                    distribution={printingDistribution}
                    period={activePeriod}
                    settings={settings}
                    onClose={() => setPrintingDistribution(null)}
                />
            )}
        </div>
    );
};
