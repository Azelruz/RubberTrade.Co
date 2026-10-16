import React, { useState, useMemo } from 'react';
import { 
    Coins, TrendingUp, PlusCircle, ArrowDownLeft, ArrowUpRight, 
    RefreshCw, Search, Calendar, FileText, Trash2, CheckCircle2, X 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SharesTab = ({ 
    members = [], 
    transactions = [], 
    onAddTransaction, 
    onDeleteTransaction, 
    loading = false 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [txType, setTxType] = useState('buy'); // 'buy', 'redeem', 'transfer'
    const [shares, setShares] = useState('10');
    const [pricePerShare, setPricePerShare] = useState('100');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Summary Metrics
    const totalShares = useMemo(() => {
        return members.reduce((sum, m) => sum + Number(m.totalShares || 0), 0);
    }, [members]);

    const totalShareCapital = useMemo(() => {
        return members.reduce((sum, m) => sum + Number(m.shareValue || 0), 0);
    }, [members]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchSearch = (tx.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (tx.memberNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (tx.note || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchType = typeFilter === 'all' || tx.type === typeFilter;
            return matchSearch && matchType;
        });
    }, [transactions, searchTerm, typeFilter]);

    const openModal = (type = 'buy') => {
        setTxType(type);
        setSelectedMemberId(members[0]?.id || '');
        setShares('10');
        setPricePerShare('100');
        setDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('cash');
        setNote('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMemberId) return toast.error('กรุณาเลือกสมาชิก');
        const numShares = parseInt(shares) || 0;
        if (numShares <= 0) return toast.error('จำนวนหุ้นต้องมากกว่า 0');

        setIsSubmitting(true);
        try {
            const pps = Number(pricePerShare) || 100;
            const payload = {
                memberId: selectedMemberId,
                date,
                type: txType,
                shares: numShares,
                pricePerShare: pps,
                totalAmount: numShares * pps,
                paymentMethod,
                note: note.trim()
            };

            await onAddTransaction(payload);
            toast.success(txType === 'buy' ? 'บันทึกซื้อหุ้นเพิ่มสำเร็จ' : txType === 'redeem' ? 'บันทึกการถอนหุ้นสำเร็จ' : 'บันทึกธุรกรรมหุ้นสำเร็จ');
            setShowModal(false);
        } catch (err) {
            toast.error('ทำรายการล้มเหลว: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Capital Metrics Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg shadow-emerald-700/20">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200 block">
                        ทุนเรือนหุ้นรวมสะสม
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black font-mono mt-1 text-white tracking-tight">
                        {totalShareCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-sans font-bold">บาท</span>
                    </h3>
                    <p className="text-emerald-200 text-xs mt-2 flex items-center">
                        <Coins size={14} className="mr-1 text-amber-300" />
                        คิดเป็น {totalShares.toLocaleString()} หุ้น (เฉลี่ย 100 บ./หุ้น)
                    </p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block">
                            จำนวนผู้ถือหุ้นทั้งหมด
                        </span>
                        <h3 className="text-2xl md:text-3xl font-black font-mono mt-1 text-gray-900 tracking-tight">
                            {members.filter(m => Number(m.totalShares) > 0).length} <span className="text-sm font-sans text-gray-500 font-bold">ราย</span>
                        </h3>
                    </div>
                    <p className="text-gray-400 text-xs mt-2">
                        จากสมาชิกในทะเบียนทั้งหมด {members.length} ราย
                    </p>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 block">
                            การดำเนินการด่วน
                        </span>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <button
                                type="button"
                                onClick={() => openModal('buy')}
                                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center transition-all border border-emerald-200"
                            >
                                <PlusCircle size={14} className="mr-1" />
                                ซื้อหุ้นเพิ่ม
                            </button>
                            <button
                                type="button"
                                onClick={() => openModal('redeem')}
                                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs flex items-center justify-center transition-all border border-amber-200"
                            >
                                <ArrowDownLeft size={14} className="mr-1" />
                                ถอน/ลดหุ้น
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction Ledger Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="flex items-center space-x-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อสมาชิก, รหัส, หมายเหตุ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                            />
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="all">ทุกประเภทธุรกรรม</option>
                            <option value="buy">ซื้อหุ้น (แรกเข้า / เพิ่ม)</option>
                            <option value="dividend_reinvest">ทบจากเงินปันผล</option>
                            <option value="redeem">ถอน/ไถ่ถอนหุ้น</option>
                        </select>
                    </div>

                    <div className="text-xs text-gray-400 font-medium">
                        ประวัติธุรกรรม {filteredTransactions.length} รายการ
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="py-3 px-4">วันที่</th>
                                <th className="py-3 px-4">รหัส / ชื่อสมาชิก</th>
                                <th className="py-3 px-4">ประเภทธุรกรรม</th>
                                <th className="py-3 px-4 text-right">จำนวนหุ้น</th>
                                <th className="py-3 px-4 text-right">ราคา/หุ้น</th>
                                <th className="py-3 px-4 text-right">ยอดเงินรวม (บ.)</th>
                                <th className="py-3 px-4">ช่องทาง</th>
                                <th className="py-3 px-4">หมายเหตุ</th>
                                <th className="py-3 px-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-gray-400">
                                        ยังไม่มีรายการธุรกรรมหุ้น
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="py-3 px-4 font-mono text-gray-600">
                                            {tx.date}
                                        </td>
                                        <td className="py-3 px-4">
                                            <p className="font-bold text-gray-900">{tx.memberName}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">{tx.memberNo}</p>
                                        </td>
                                        <td className="py-3 px-4">
                                            {tx.type === 'buy' && (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    tx.note?.includes('แรกเข้า')
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                    <ArrowUpRight size={12} className="mr-1" />
                                                    {tx.note?.includes('แรกเข้า') ? 'หุ้นแรกเข้า' : 'ซื้อหุ้นเพิ่ม'}
                                                </span>
                                            )}
                                            {tx.type === 'dividend_reinvest' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                    <RefreshCw size={11} className="mr-1" />
                                                    ทบจากปันผล
                                                </span>
                                            )}
                                            {tx.type === 'redeem' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    <ArrowDownLeft size={12} className="mr-1" />
                                                    ถอนหุ้น
                                                </span>
                                            )}
                                        </td>
                                        <td className={`py-3 px-4 text-right font-mono font-bold ${
                                            tx.type === 'redeem' ? 'text-amber-600' : 'text-gray-900'
                                        }`}>
                                            {tx.type === 'redeem' ? '-' : '+'}{Number(tx.shares || 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-gray-500">
                                            {Number(tx.pricePerShare || 100).toLocaleString()}
                                        </td>
                                        <td className={`py-3 px-4 text-right font-mono font-black ${
                                            tx.type === 'redeem' ? 'text-amber-700' : 'text-emerald-700'
                                        }`}>
                                            {tx.type === 'redeem' ? '-' : '+'}{Number(tx.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500">
                                            {tx.paymentMethod === 'cash' ? 'เงินสด' : tx.paymentMethod === 'transfer' ? 'โอนเงิน' : 'ตัดเงินปันผล'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-400 max-w-xs truncate">
                                            {tx.note || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm('ยืนยันลบรายการธุรกรรมหุ้นนี้? (ระบบจะปรับยอดสะสมของสมาชิกให้อัตโนมัติ)')) {
                                                        onDeleteTransaction(tx.id);
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="ลบ"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Share Transaction Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8 border border-gray-100">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-base font-black text-gray-900">
                                {txType === 'buy' ? 'บันทึกการซื้อหุ้นเพิ่ม' : txType === 'redeem' ? 'บันทึกการถอน/คืนค่าหุ้น' : 'ทำธุรกรรมหุ้น'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">เลือกสมาชิกผู้ถือหุ้น *</label>
                                <select
                                    value={selectedMemberId}
                                    onChange={(e) => setSelectedMemberId(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold"
                                >
                                    {members.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.memberNo} - {m.name} (ถืออยู่ {m.totalShares || 0} หุ้น)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">ประเภทรายการ</label>
                                    <select
                                        value={txType}
                                        onChange={(e) => setTxType(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold"
                                    >
                                        <option value="buy">ซื้อหุ้นเพิ่ม (Buy Shares)</option>
                                        <option value="redeem">ถอน/ลดหุ้น (Redeem Shares)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">วันที่ทำรายการ</label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">จำนวนหุ้น *</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={shares}
                                        onChange={(e) => setShares(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono font-bold text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">มูลค่าต่อหุ้น (บาท)</label>
                                    <input
                                        type="number"
                                        value={pricePerShare}
                                        onChange={(e) => setPricePerShare(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono font-bold"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                                <span className="font-bold text-gray-600">รวมยอดเงินทั้งสิ้น:</span>
                                <span className="text-base font-black font-mono text-emerald-700">
                                    {(Number(shares || 0) * Number(pricePerShare || 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">วิธีการชำระเงิน</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl font-bold"
                                    >
                                        <option value="cash">เงินสด (Cash)</option>
                                        <option value="transfer">โอนเงิน (Bank Transfer)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">หมายเหตุ</label>
                                    <input
                                        type="text"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="เช่น ซื้อหุ้นเพิ่มครั้งที่ 2"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-200"
                                >
                                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
