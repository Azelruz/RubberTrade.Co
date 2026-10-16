import React, { useState, useMemo } from 'react';
import { 
    ArrowDownLeft, ArrowUpRight, Percent, 
    BookPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { calculateSavingsInterest } from '../../services/apiService';
import { SavingsReceiptModal } from './SavingsReceiptModal';
import { OpenAccountModal } from './OpenAccountModal';
import { MemberQRModal } from './MemberQRModal';

import { SavingsMetricsCards } from './savings/SavingsMetricsCards';
import { SavingsMemberAccountGrid } from './savings/SavingsMemberAccountGrid';
import { SavingsTransactionLedger } from './savings/SavingsTransactionLedger';
import { SavingsTxModal } from './savings/SavingsTxModal';
import { SavingsInterestModal } from './savings/SavingsInterestModal';
import { SavingsPassbookModal } from './savings/SavingsPassbookModal';

export const SavingsTab = ({ 
    members = [], 
    accounts = [],
    transactions = [], 
    settings = {},
    onAddTransaction, 
    onDeleteTransaction, 
    onDistributeInterest,
    onOpenAccount,
    onDeleteAccount,
    loading = false 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    // Modals
    const [showTxModal, setShowTxModal] = useState(false);
    const [txType, setTxType] = useState('deposit'); // 'deposit' or 'withdraw'
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Open Account Modal & Member QR Modal
    const [showOpenAccountModal, setShowOpenAccountModal] = useState(false);
    const [openAccountDefaultMemberId, setOpenAccountDefaultMemberId] = useState('');
    const [qrMember, setQrMember] = useState(null);

    // Interest Wizard Modal
    const [showInterestModal, setShowInterestModal] = useState(false);
    const [interestRate, setInterestRate] = useState('2.0');
    const [interestMonths, setInterestMonths] = useState('12');
    const [interestCalcDate, setInterestCalcDate] = useState(new Date().toISOString().split('T')[0]);
    const [interestPreview, setInterestPreview] = useState(null);
    const [isCalculatingInterest, setIsCalculatingInterest] = useState(false);
    const [isPostingInterest, setIsPostingInterest] = useState(false);

    // Passbook / Statement Modal
    const [showPassbookModal, setShowPassbookModal] = useState(false);
    const [selectedPassbookMember, setSelectedPassbookMember] = useState(null);
    const [selectedPassbookAccountId, setSelectedPassbookAccountId] = useState('all');

    // Receipt Print Modal
    const [selectedPrintTx, setSelectedPrintTx] = useState(null);

    // Selected member object for transactions
    const currentSelectedMember = useMemo(() => {
        return members.find(m => m.id === selectedMemberId) || null;
    }, [members, selectedMemberId]);

    // Active accounts for the selected member
    const currentMemberAccounts = useMemo(() => {
        if (!selectedMemberId) return [];
        return accounts.filter(a => a.memberId === selectedMemberId && a.status !== 'closed');
    }, [accounts, selectedMemberId]);

    // Active selected account object
    const currentSelectedAccount = useMemo(() => {
        if (!currentMemberAccounts.length) return null;
        if (!selectedAccountId) return currentMemberAccounts[0];
        return currentMemberAccounts.find(a => a.id === selectedAccountId) || currentMemberAccounts[0];
    }, [currentMemberAccounts, selectedAccountId]);

    // Financial Metrics
    const totalSavingsBalance = useMemo(() => {
        return members.reduce((sum, m) => sum + Number(m.savingsBalance || 0), 0);
    }, [members]);

    const totalDeposits = useMemo(() => {
        return transactions
            .filter(t => t.type === 'deposit')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    }, [transactions]);

    const totalWithdrawals = useMemo(() => {
        return transactions
            .filter(t => t.type === 'withdraw')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    }, [transactions]);

    const totalInterestPaid = useMemo(() => {
        return transactions
            .filter(t => t.type === 'interest')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    }, [transactions]);

    const activeSavingsAccountsCount = useMemo(() => {
        return members.filter(m => Number(m.savingsBalance || 0) > 0).length;
    }, [members]);

    // Filtered Transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const term = searchTerm.toLowerCase();
            const matchSearch = (tx.memberName || '').toLowerCase().includes(term) ||
                                (tx.memberNo || '').toLowerCase().includes(term) ||
                                (tx.accountNo || '').toLowerCase().includes(term) ||
                                (tx.accountName || '').toLowerCase().includes(term) ||
                                (tx.note || '').toLowerCase().includes(term);
            const matchType = typeFilter === 'all' || tx.type === typeFilter;
            return matchSearch && matchType;
        });
    }, [transactions, searchTerm, typeFilter]);

    // Open Transaction Modal
    const openTxModal = (type = 'deposit', defaultMemberId = '', defaultAccountId = '') => {
        const memId = defaultMemberId || members[0]?.id || '';
        setTxType(type);
        setSelectedMemberId(memId);
        const memAccs = accounts.filter(a => a.memberId === memId && a.status !== 'closed');
        setSelectedAccountId(defaultAccountId || memAccs[0]?.id || '');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('cash');
        setNote('');
        setShowTxModal(true);
    };

    // Open Passbook Modal
    const openPassbook = (member, accountId = 'all') => {
        setSelectedPassbookMember(member);
        setSelectedPassbookAccountId(accountId);
        setShowPassbookModal(true);
    };

    // Handle Transaction Submit
    const handleTxSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMemberId) return toast.error('กรุณาเลือกสมาชิก');
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return toast.error('จำนวนเงินต้องมากกว่า 0 บาท');

        const activeAccount = currentSelectedAccount;
        const availableBalance = activeAccount ? Number(activeAccount.balance || 0) : Number(currentSelectedMember?.savingsBalance || 0);

        if (txType === 'withdraw' && numAmount > availableBalance) {
            return toast.error(`ยอดเงินไม่พอสำหรับการถอน (มีเงินในสมุดบัญชีนี้ ${availableBalance.toLocaleString()} บาท)`);
        }

        setIsSubmitting(true);
        try {
            const payload = {
                memberId: selectedMemberId,
                accountId: activeAccount?.id || undefined,
                date,
                type: txType,
                amount: numAmount,
                paymentMethod,
                note: note.trim()
            };

            const res = await onAddTransaction(payload);
            toast.success(txType === 'deposit' ? 'บันทึกฝากเงินสดสำเร็จ' : 'บันทึกถอนเงินสดสำเร็จ');
            setShowTxModal(false);

            // Auto show receipt modal for printing
            if (res && res.id) {
                setSelectedPrintTx({
                    ...payload,
                    id: res.id,
                    balanceAfter: res.balanceAfter,
                    memberName: res.memberName || currentSelectedMember?.name,
                    memberNo: currentSelectedMember?.memberNo,
                    accountNo: activeAccount?.accountNo || (currentSelectedMember?.memberNo ? `SA-${currentSelectedMember.memberNo}` : 'SA-GEN'),
                    accountName: activeAccount?.accountName || 'ออมทรัพย์สัจจะ'
                });
            }
        } catch (err) {
            toast.error('ทำรายการล้มเหลว: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Interest Calculation Handler
    const handleCalculateInterest = async () => {
        const rate = parseFloat(interestRate);
        if (isNaN(rate) || rate <= 0) return toast.error('กรุณาระบุอัตราดอกเบี้ยต่อปี');

        setIsCalculatingInterest(true);
        try {
            const res = await calculateSavingsInterest({
                ratePerYear: rate,
                periodMonths: parseInt(interestMonths) || 12,
                asOfDate: interestCalcDate
            });

            if (res && res.status === 'success') {
                setInterestPreview(res);
                if (res.distributions.length === 0) {
                    toast('ไม่พบสมาชิกที่มีเงินฝากคงเหลือสำหรับการคิดดอกเบี้ย', { icon: 'ℹ️' });
                } else {
                    toast.success(`คำนวณดอกเบี้ยสำเร็จสำหรับสมาชิก ${res.distributions.length} ราย`);
                }
            } else {
                toast.error(res?.message || 'คำนวณล้มเหลว');
            }
        } catch (err) {
            toast.error('เกิดข้อผิดพลาดในการคำนวณ: ' + err.message);
        } finally {
            setIsCalculatingInterest(false);
        }
    };

    // Confirm Bulk Interest Distribution
    const handleConfirmDistributeInterest = async () => {
        if (!interestPreview || !interestPreview.distributions?.length) {
            return toast.error('ไม่มีรายการดอกเบี้ยให้บันทึก');
        }

        const confirmMsg = `ยืนยันบันทึกจ่ายดอกเบี้ยอัตรา ${interestPreview.ratePerYear}% รวมเป็นเงิน ${interestPreview.summary.estimatedTotalInterest.toLocaleString()} บาท เข้าบัญชีสมาชิก ${interestPreview.distributions.length} ราย?`;
        if (!window.confirm(confirmMsg)) return;

        setIsPostingInterest(true);
        try {
            const payload = {
                distributions: interestPreview.distributions,
                date: interestCalcDate,
                note: `ดอกเบี้ยเงินฝากสะสม (${interestPreview.ratePerYear}% / ${interestMonths} เดือน)`
            };

            await onDistributeInterest(payload);
            toast.success(`บันทึกจ่ายดอกเบี้ยเข้าบัญชีสมาชิกเรียบร้อยแล้ว (${interestPreview.distributions.length} บัญชี)`);
            setShowInterestModal(false);
            setInterestPreview(null);
        } catch (err) {
            toast.error('บันทึกดอกเบี้ยล้มเหลว: ' + err.message);
        } finally {
            setIsPostingInterest(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Metrics Cards */}
            <SavingsMetricsCards
                totalSavingsBalance={totalSavingsBalance}
                activeSavingsAccountsCount={activeSavingsAccountsCount}
                totalMembers={members.length}
                totalDeposits={totalDeposits}
                totalWithdrawals={totalWithdrawals}
                totalInterestPaid={totalInterestPaid}
            />

            {/* Quick Action Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => openTxModal('deposit')}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center shadow-md shadow-emerald-200 transition-all"
                    >
                        <ArrowUpRight size={15} className="mr-1.5" />
                        รับฝากเงินสด
                    </button>
                    <button
                        type="button"
                        onClick={() => openTxModal('withdraw')}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center shadow-md shadow-rose-200 transition-all"
                    >
                        <ArrowDownLeft size={15} className="mr-1.5" />
                        ถอนเงินสด
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setOpenAccountDefaultMemberId('');
                            setShowOpenAccountModal(true);
                        }}
                        className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center shadow-md shadow-teal-200 transition-all"
                    >
                        <BookPlus size={15} className="mr-1.5" />
                        + เปิดสมุดบัญชีใหม่
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setInterestPreview(null);
                            setShowInterestModal(true);
                        }}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center shadow-md shadow-amber-200 transition-all"
                    >
                        <Percent size={15} className="mr-1.5" />
                        คำนวณและจ่ายดอกเบี้ยอัตโนมัติ
                    </button>
                </div>

                <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span className="font-bold text-gray-700">เงื่อนไขการถอน:</span>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-100">
                        ถอนได้จนเหลือ 0 บาท
                    </span>
                </div>
            </div>

            {/* Member Account List Shortcut Bar */}
            <SavingsMemberAccountGrid
                members={members}
                accounts={accounts}
                onOpenPassbook={openPassbook}
                onSetQrMember={setQrMember}
                onOpenAccountForMember={(mId) => {
                    setOpenAccountDefaultMemberId(mId);
                    setShowOpenAccountModal(true);
                }}
            />

            {/* Transactions History Ledger Table */}
            <SavingsTransactionLedger
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                filteredTransactions={filteredTransactions}
                onSelectPrintTx={setSelectedPrintTx}
                onDeleteTransaction={onDeleteTransaction}
            />

            {/* Modal: Single Deposit / Withdraw */}
            <SavingsTxModal
                show={showTxModal}
                txType={txType}
                selectedMemberId={selectedMemberId}
                setSelectedMemberId={setSelectedMemberId}
                selectedAccountId={selectedAccountId}
                setSelectedAccountId={setSelectedAccountId}
                amount={amount}
                setAmount={setAmount}
                date={date}
                setDate={setDate}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                note={note}
                setNote={setNote}
                isSubmitting={isSubmitting}
                members={members}
                accounts={accounts}
                currentSelectedMember={currentSelectedMember}
                currentMemberAccounts={currentMemberAccounts}
                currentSelectedAccount={currentSelectedAccount}
                handleTxSubmit={handleTxSubmit}
                onClose={() => setShowTxModal(false)}
                onOpenAccountForMember={(mId) => {
                    setOpenAccountDefaultMemberId(mId);
                    setShowOpenAccountModal(true);
                }}
            />

            {/* Modal: Automated Interest Calculation Wizard */}
            <SavingsInterestModal
                show={showInterestModal}
                interestRate={interestRate}
                setInterestRate={setInterestRate}
                interestMonths={interestMonths}
                setInterestMonths={setInterestMonths}
                interestCalcDate={interestCalcDate}
                setInterestCalcDate={setInterestCalcDate}
                interestPreview={interestPreview}
                isCalculatingInterest={isCalculatingInterest}
                isPostingInterest={isPostingInterest}
                handleCalculateInterest={handleCalculateInterest}
                handleConfirmDistributeInterest={handleConfirmDistributeInterest}
                onClose={() => setShowInterestModal(false)}
            />

            {/* Modal: Member Passbook / Statement */}
            <SavingsPassbookModal
                show={showPassbookModal}
                selectedPassbookMember={selectedPassbookMember}
                selectedPassbookAccountId={selectedPassbookAccountId}
                setSelectedPassbookAccountId={setSelectedPassbookAccountId}
                accounts={accounts}
                transactions={transactions}
                onSetQrMember={setQrMember}
                onOpenAccountForMember={(mId) => {
                    setOpenAccountDefaultMemberId(mId);
                    setShowOpenAccountModal(true);
                }}
                openTxModal={openTxModal}
                onClose={() => setShowPassbookModal(false)}
            />

            {/* Print Slip Modal */}
            {selectedPrintTx && (
                <SavingsReceiptModal
                    transaction={selectedPrintTx}
                    settings={settings}
                    onClose={() => setSelectedPrintTx(null)}
                />
            )}

            {/* Modal: Open New Account */}
            {showOpenAccountModal && (
                <OpenAccountModal
                    members={members}
                    defaultMemberId={openAccountDefaultMemberId}
                    settings={settings}
                    onOpenAccount={onOpenAccount}
                    onClose={() => {
                        setShowOpenAccountModal(false);
                        setOpenAccountDefaultMemberId('');
                    }}
                />
            )}

            {/* Modal: Member QR Code Card */}
            {qrMember && (
                <MemberQRModal
                    member={qrMember}
                    accounts={accounts}
                    settings={settings}
                    onClose={() => setQrMember(null)}
                />
            )}
        </div>
    );
};

export default SavingsTab;
