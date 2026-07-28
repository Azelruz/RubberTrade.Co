import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/db';
import { fetchLoans, addLoan, fetchFarmers, fetchEmployees, fetchStaff, deleteRecord, fetchLoanDeductions, updateRecord, addLoanDeduction } from '../services/apiService';
import { PlusCircle, Search, User, Calendar, DollarSign, FileText, ChevronRight, X, ArrowLeftRight, Percent, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const Loans = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('farmer'); // 'farmer', 'employee', or 'staff'
    const [loans, setLoans] = useState([]);
    const [deductions, setDeductions] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [showLoanForm, setShowLoanForm] = useState(false);
    const [selectedBorrower, setSelectedBorrower] = useState(null);
    const [searchBorrowerQuery, setSearchBorrowerQuery] = useState('');
    const [showBorrowerDropdown, setShowBorrowerDropdown] = useState(false);
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [deductionMethod, setDeductionMethod] = useState('full'); // 'full', 'percent', 'fixed'
    const [deductionValue, setDeductionValue] = useState('');
    const [note, setNote] = useState('');

    // Borrower Detail Modal
    const [selectedBorrowerDetail, setSelectedBorrowerDetail] = useState(null); // { id, name, type }

    // Clear Debt Modal states
    const [showClearModal, setShowClearModal] = useState(false);
    const [selectedClearBorrower, setSelectedClearBorrower] = useState(null);
    const [repayAmount, setRepayAmount] = useState('');
    const [repayNote, setRepayNote] = useState('ชำระคืนด้วยเงินสดหน้าร้าน');
    const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
    const [submittingRepayment, setSubmittingRepayment] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // Step 1: Load locally from Dexie (Instant 0ms)
        try {
            const [localLoans, localDeds, localFarmers, localEmployees, localStaff] = await Promise.all([
                db.loans.toArray(),
                db.loan_deductions.toArray(),
                db.farmers.toArray(),
                db.employees.toArray(),
                db.staff.toArray()
            ]);
            setLoans(localLoans || []);
            setDeductions(localDeds || []);
            setFarmers(localFarmers || []);
            setEmployees(localEmployees || []);
            setStaff(localStaff || []);
            setLoading(false);
        } catch (err) {
            console.error("Local load error", err);
        }

        // Step 2: Fetch background revalidation from remote D1
        if (navigator.onLine) {
            try {
                const [lList, dList, fList, eList, sList] = await Promise.all([
                    fetchLoans(),
                    fetchLoanDeductions(),
                    fetchFarmers(),
                    fetchEmployees(),
                    fetchStaff()
                ]);

                if (Array.isArray(lList)) {
                    await db.loans.clear();
                    await db.loans.bulkPut(lList);
                    setLoans(lList);
                }
                if (Array.isArray(dList)) {
                    await db.loan_deductions.clear();
                    await db.loan_deductions.bulkPut(dList);
                    setDeductions(dList);
                }
                if (Array.isArray(fList)) {
                    await db.farmers.bulkPut(fList);
                    setFarmers(fList);
                }
                if (Array.isArray(eList)) {
                    await db.employees.bulkPut(eList);
                    setEmployees(eList);
                }
                if (Array.isArray(sList)) {
                    await db.staff.bulkPut(sList);
                    setStaff(sList);
                }
            } catch (error) {
                console.warn("Background revalidation failed:", error.message);
            }
        }
    };

    // Calculate aggregated debt per borrower
    const getBorrowerDebtSummary = (type) => {
        const borrowerMap = {};
        
        // Initialize names map for lookup
        const nameMap = {};
        if (type === 'farmer') {
            farmers.forEach(f => nameMap[f.id] = f.name);
        } else if (type === 'employee') {
            employees.forEach(e => nameMap[e.id] = e.name);
        } else {
            staff.forEach(s => nameMap[s.id] = s.name);
        }

        // Aggregate loans
        loans.filter(l => l.borrowerType === type).forEach(l => {
            if (!borrowerMap[l.borrowerId]) {
                borrowerMap[l.borrowerId] = {
                    id: l.borrowerId,
                    name: nameMap[l.borrowerId] || l.borrowerName || 'ไม่ระบุชื่อ',
                    totalLoan: 0,
                    remainingDebt: 0,
                    loansCount: 0
                };
            }
            borrowerMap[l.borrowerId].totalLoan += l.amount;
            borrowerMap[l.borrowerId].remainingDebt += l.remainingAmount;
            borrowerMap[l.borrowerId].loansCount += 1;
        });

        // Filter and convert to array
        return Object.values(borrowerMap).filter(b => 
            b.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const getEmployeeFarmerName = (employeeId) => {
        const emp = employees.find(e => e.id === employeeId);
        if (!emp) return '';
        const f = farmers.find(farm => farm.id === emp.farmerId);
        return f ? f.name : '';
    };

    const handleCreateLoan = async (e) => {
        e.preventDefault();
        if (!selectedBorrower) {
            toast.error('กรุณาเลือกผู้กู้ยืม');
            return;
        }
        const numAmt = parseFloat(amount);
        if (isNaN(numAmt) || numAmt <= 0) {
            toast.error('กรุณากรอกจำนวนเงินกู้ยืมที่ถูกต้อง');
            return;
        }

        const methodVal = parseFloat(deductionValue);
        if ((deductionMethod === 'percent' || deductionMethod === 'fixed') && (isNaN(methodVal) || methodVal <= 0)) {
            toast.error('กรุณากรอกสัดส่วนการหักที่ถูกต้อง');
            return;
        }

        setSubmitting(true);
        const newLoan = {
            id: crypto.randomUUID(),
            borrowerType: activeTab,
            borrowerId: selectedBorrower.id,
            borrowerName: selectedBorrower.name,
            date,
            amount: numAmt,
            remainingAmount: numAmt,
            deductionMethod,
            deductionValue: deductionMethod === 'full' ? 0 : methodVal,
            note,
            userId: user.storeId || 'SYSTEM'
        };

        try {
            // Optimistic update in Dexie
            await db.loans.put(newLoan);
            setLoans(prev => [newLoan, ...prev]);

            // Save to server API
            await addLoan(newLoan);
            toast.success('บันทึกเงินเบิกล่วงหน้าสำเร็จ');
            
            // Reset form states
            setShowLoanForm(false);
            setSelectedBorrower(null);
            setSearchBorrowerQuery('');
            setAmount('');
            setDeductionMethod('full');
            setDeductionValue('');
            setNote('');
            
            loadData();
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClearDebtSubmit = async (e) => {
        e.preventDefault();
        if (!selectedClearBorrower) return;
        const numAmt = parseFloat(repayAmount);
        if (isNaN(numAmt) || numAmt <= 0) {
            toast.error('กรุณากรอกจำนวนเงินชำระคืนที่ถูกต้อง');
            return;
        }
        if (numAmt > selectedClearBorrower.remainingDebt) {
            toast.error('ยอดเงินชำระคืนห้ามเกินยอดหนี้สะสมคงเหลือปัจจุบัน');
            return;
        }

        setSubmittingRepayment(true);
        try {
            // FIFO Order loan balance updates
            let repayRemaining = numAmt;
            const updatedLoansList = [...loans];
            const writePromises = [];

            // Sort loans by date ASC (oldest first)
            const borrowerLoans = updatedLoansList
                .filter(l => l.borrowerType === activeTab && l.borrowerId === selectedClearBorrower.id && l.remainingAmount > 0)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            for (const loan of borrowerLoans) {
                if (repayRemaining <= 0) break;
                const subtract = Math.min(repayRemaining, loan.remainingAmount);
                loan.remainingAmount -= subtract;
                repayRemaining -= subtract;

                // 1. Update local Dexie DB
                writePromises.push(db.loans.put(loan));

                // 2. Call backend /updateRecord
                writePromises.push(updateRecord('loans', loan.id, { remainingAmount: loan.remainingAmount }));
            }

            // 3. Create deduction record
            const newDeduction = {
                id: crypto.randomUUID(),
                buyId: 'cash_payment_' + crypto.randomUUID().substring(0, 8),
                borrowerType: activeTab,
                borrowerId: selectedClearBorrower.id,
                amount: numAmt,
                remainingDebtAfter: selectedClearBorrower.remainingDebt - numAmt,
                userId: user.storeId || 'SYSTEM',
                created_at: new Date(repayDate).toISOString(),
                date: repayDate,
                note: repayNote
            };

            // Save deduction to local Dexie
            writePromises.push(db.loan_deductions.put(newDeduction));

            // Save deduction online/offline
            writePromises.push(addLoanDeduction(newDeduction));

            // Wait for all writes
            await Promise.all(writePromises);

            // Update state variables to refresh UI instantly
            setLoans(updatedLoansList);
            setDeductions(prev => [newDeduction, ...prev]);

            toast.success('บันทึกการชำระหนี้ด้วยเงินสดสำเร็จ');
            setShowClearModal(false);
            setSelectedClearBorrower(null);
            setRepayAmount('');
            setRepayNote('ชำระคืนด้วยเงินสดหน้าร้าน');
        } catch (err) {
            console.error("Cash repayment save error", err);
            toast.error('เกิดข้อผิดพลาดในการบันทึกรายการชำระคืน');
        } finally {
            setSubmittingRepayment(false);
        }
    };

    // Aggregate statistics
    const stats = React.useMemo(() => {
        let farmerDebt = 0;
        let employeeDebt = 0;
        let staffDebt = 0;
        loans.forEach(l => {
            if (l.borrowerType === 'farmer') farmerDebt += l.remainingAmount;
            else if (l.borrowerType === 'staff') staffDebt += l.remainingAmount;
            else employeeDebt += l.remainingAmount;
        });
        return {
            farmerDebt,
            employeeDebt,
            staffDebt,
            totalDebt: farmerDebt + employeeDebt + staffDebt
        };
    }, [loans]);

    const activeSummary = getBorrowerDebtSummary(activeTab);

    // Get list of potential borrowers to autocomplete in modal
    const getFilteredBorrowerList = () => {
        const list = activeTab === 'farmer' ? farmers : activeTab === 'employee' ? employees : staff;
        return list.filter(item => 
            item.name.toLowerCase().includes(searchBorrowerQuery.toLowerCase()) ||
            (item.phone && item.phone.includes(searchBorrowerQuery))
        );
    };

    // Get history for selected borrower
    const getBorrowerHistory = (borrowerId) => {
        const borrowerLoans = loans.filter(l => l.borrowerId === borrowerId).map(l => ({
            ...l,
            type: 'loan'
        }));
        const borrowerDeductions = deductions.filter(d => d.borrowerId === borrowerId).map(d => ({
            ...d,
            type: 'deduction',
            date: d.created_at.split('T')[0] // Format date for sorting
        }));

        // Merge and sort DESC
        return [...borrowerLoans, ...borrowerDeductions].sort((a, b) => 
            new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <DollarSign className="mr-2 text-emerald-600" size={28} />
                        ระบบเงินกู้ & หนี้สินสะสม
                    </h1>
                    <p className="text-gray-500">จัดการข้อมูลเงินเบิกล่วงหน้าและการตั้งค่าชำระคืนสำหรับชาวสวนและลูกจ้าง</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={loadData}
                        className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center"
                        title="รีเฟรชข้อมูล"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowLoanForm(true)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center space-x-2 text-sm"
                    >
                        <PlusCircle size={18} />
                        <span>บันทึกเงินเบิกใหม่</span>
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400">หนี้รวมเกษตรกร (ชาวสวน)</p>
                        <h3 className="text-xl font-bold text-gray-800 mt-1 font-mono">฿{stats.farmerDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400">หนี้รวมลูกจ้างกรีดยาง</p>
                        <h3 className="text-xl font-bold text-gray-800 mt-1 font-mono">฿{stats.employeeDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400">หนี้รวมพนักงาน</p>
                        <h3 className="text-xl font-bold text-gray-800 mt-1 font-mono">฿{stats.staffDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400">หนี้สินสะสมลานยางทั้งหมด</p>
                        <h3 className="text-xl font-bold text-orange-600 mt-1 font-mono">฿{stats.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>
            </div>

            {/* Tabs and Search */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex bg-gray-50 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => { setActiveTab('farmer'); setSearchTerm(''); }}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'farmer' 
                                    ? 'bg-white text-emerald-700 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            เกษตรกร (ชาวสวน)
                        </button>
                        <button
                            onClick={() => { setActiveTab('employee'); setSearchTerm(''); }}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'employee' 
                                    ? 'bg-white text-indigo-700 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            ลูกจ้างกรีดยาง
                        </button>
                        <button
                            onClick={() => { setActiveTab('staff'); setSearchTerm(''); }}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                                activeTab === 'staff' 
                                    ? 'bg-white text-purple-700 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            พนักงาน
                        </button>
                    </div>

                    <div className="relative md:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อผู้กู้ยืม..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* Debts Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">รายชื่อผู้กู้ยืม</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">จำนวนสัญญา</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">ยอดกู้สะสมทั้งหมด</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">หนี้สะสมคงเหลือปัจจุบัน</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">การทำงาน</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">กำลังโหลดข้อมูล...</td>
                                </tr>
                            ) : activeSummary.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400 italic">ไม่พบข้อมูลหนี้สินของ{activeTab === 'farmer' ? 'เกษตรกร' : 'ลูกจ้างกรีดยาง'}</td>
                                </tr>
                            ) : (
                                activeSummary.map(b => (
                                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-gray-800 flex items-center">
                                            <div className={`p-2 rounded-xl mr-3 ${activeTab === 'farmer' ? 'bg-emerald-50 text-emerald-600' : activeTab === 'staff' ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <div>{b.name}</div>
                                                {activeTab === 'employee' && (
                                                    <div className="text-[11px] text-gray-400 font-normal">
                                                        สังกัด: {getEmployeeFarmerName(b.id) || 'ไม่ระบุ'}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-600 font-mono">{b.loansCount} รายการ</td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-600 font-mono">฿{b.totalLoan.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right font-bold text-orange-600 font-mono">
                                            ฿{b.remainingDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center space-x-2">
                                                <button
                                                    onClick={() => setSelectedBorrowerDetail({ id: b.id, name: b.name, type: activeTab })}
                                                    className="px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-100 rounded-lg hover:border-gray-200 text-xs font-bold transition-all inline-flex items-center space-x-1"
                                                >
                                                    <span>ดูประวัติหักหนี้</span>
                                                    <ChevronRight size={14} />
                                                </button>
                                                {b.remainingDebt > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedClearBorrower({ 
                                                                id: b.id, 
                                                                name: b.name, 
                                                                remainingDebt: b.remainingDebt 
                                                            });
                                                            setRepayAmount(b.remainingDebt.toString());
                                                            setRepayNote('ชำระคืนด้วยเงินสดหน้าร้าน');
                                                            setRepayDate(new Date().toISOString().split('T')[0]);
                                                            setShowClearModal(true);
                                                        }}
                                                        className="px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-100 rounded-lg hover:bg-orange-100/50 hover:border-orange-200 text-xs font-bold transition-all inline-flex items-center space-x-1"
                                                    >
                                                        <DollarSign size={14} />
                                                        <span>เคลียร์หนี้</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Loan Modal */}
            {showLoanForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <PlusCircle className="mr-2 text-emerald-600" size={20} />
                                บันทึกเงินเบิกล่วงหน้า ({activeTab === 'farmer' ? 'ชาวสวน' : activeTab === 'employee' ? 'ลูกจ้าง' : 'พนักงาน'})
                            </h2>
                            <button onClick={() => { setShowLoanForm(false); setSelectedBorrower(null); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateLoan} className="p-6 space-y-4">
                            {/* Borrower Select */}
                            <div className="relative">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">เลือกผู้กู้ยืม *</label>
                                {selectedBorrower ? (
                                    <div className="w-full px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 flex items-center justify-between">
                                        <span className="flex items-center">
                                            <User size={16} className="mr-2" /> 
                                            {selectedBorrower.name}
                                            {activeTab === 'employee' && (
                                                <span className="text-xs font-normal text-emerald-600 ml-2">
                                                    (สังกัด: {farmers.find(f => f.id === selectedBorrower.farmerId)?.name || 'ไม่ระบุ'})
                                                </span>
                                            )}
                                        </span>
                                        <button type="button" onClick={() => setSelectedBorrower(null)} className="text-emerald-600 hover:text-emerald-800">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="relative">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder={`พิมพ์ค้นหาชื่อ${activeTab === 'farmer' ? 'ชาวสวน' : activeTab === 'employee' ? 'ลูกจ้าง' : 'พนักงาน'}...`}
                                                value={searchBorrowerQuery}
                                                onChange={(e) => {
                                                    setSearchBorrowerQuery(e.target.value);
                                                    setShowBorrowerDropdown(true);
                                                }}
                                                onFocus={() => setShowBorrowerDropdown(true)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                        </div>
                                        
                                        {/* Dropdown results */}
                                        {showBorrowerDropdown && searchBorrowerQuery && (
                                            <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
                                                {getFilteredBorrowerList().length === 0 ? (
                                                    <div className="px-4 py-3 text-xs text-gray-400 italic">ไม่พบรายชื่อในระบบ</div>
                                                ) : (
                                                    getFilteredBorrowerList().map(b => (
                                                        <button
                                                            key={b.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedBorrower(b);
                                                                setShowBorrowerDropdown(false);
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center border-b border-gray-50/50"
                                                        >
                                                            <User size={14} className="mr-2 text-gray-400" />
                                                            <div className="flex-1">
                                                                <div className="font-semibold text-gray-900">{b.name}</div>
                                                                {activeTab === 'employee' && (
                                                                    <div className="text-[11px] text-gray-400 font-normal">
                                                                        สังกัด: {farmers.find(f => f.id === b.farmerId)?.name || 'ไม่ระบุ'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {b.phone && <span className="ml-auto text-xs text-gray-400">({b.phone})</span>}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Loan Amount & Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1 font-sans">จำนวนเงินเบิกกู้ (บาท) *</label>
                                    <input
                                        type="number"
                                        step="1"
                                        placeholder="0"
                                        required
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">วันที่ทำสัญญา *</label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>
                            </div>

                            {/* Deduction Agreement Method */}
                            <div className="space-y-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                <label className="block text-xs font-bold text-gray-800">เงื่อนไขและข้อตกลงหักหนี้ออโต้รายบิล</label>
                                
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setDeductionMethod('full'); setDeductionValue(''); }}
                                        className={`py-2 px-1 text-center text-xs font-bold rounded-lg border transition-all ${
                                            deductionMethod === 'full' 
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        หักเต็มจำนวน
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeductionMethod('percent')}
                                        className={`py-2 px-1 text-center text-xs font-bold rounded-lg border transition-all ${
                                            deductionMethod === 'percent' 
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        หักเปรียบ %
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeductionMethod('fixed')}
                                        className={`py-2 px-1 text-center text-xs font-bold rounded-lg border transition-all ${
                                            deductionMethod === 'fixed' 
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        หักคงที่/บิล
                                    </button>
                                </div>

                                {/* Custom method inputs */}
                                {deductionMethod === 'percent' && (
                                    <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">เปอร์เซ็นต์ที่หัก (%) *</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="1"
                                                min="1"
                                                max="100"
                                                placeholder="เช่น 15"
                                                required
                                                value={deductionValue}
                                                onChange={(e) => setDeductionValue(e.target.value)}
                                                className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                            <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        </div>
                                    </div>
                                )}

                                {deductionMethod === 'fixed' && (
                                    <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase">ยอดเงินหักคงที่ (บาท/บิล) *</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="10"
                                                placeholder="เช่น 500"
                                                required
                                                value={deductionValue}
                                                onChange={(e) => setDeductionValue(e.target.value)}
                                                className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">บาท</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">หมายเหตุ</label>
                                <textarea
                                    rows="2"
                                    placeholder="กรอกหมายเหตุสั้นๆ เช่น เบิกค่าปุ๋ยสูตร"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowLoanForm(false); setSelectedBorrower(null); }}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-all text-xs text-center"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-bold transition-all text-xs text-center"
                                >
                                    {submitting ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Borrower History Modal */}
            {selectedBorrowerDetail && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                    <FileText className="mr-2 text-emerald-600" size={20} />
                                    ประวัติกู้ยืมและหักหนี้
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    ของ {selectedBorrowerDetail.name} 
                                    {selectedBorrowerDetail.type === 'farmer' 
                                        ? ' (ชาวสวน)' 
                                        : ` (ลูกจ้างของ ${getEmployeeFarmerName(selectedBorrowerDetail.id) || 'ไม่ระบุ'})`
                                    }
                                </p>
                            </div>
                            <button onClick={() => setSelectedBorrowerDetail(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[500px] overflow-y-auto space-y-4">
                            <div className="divide-y divide-gray-100">
                                {getBorrowerHistory(selectedBorrowerDetail.id).length === 0 ? (
                                    <div className="py-8 text-center text-gray-400 italic">ไม่มีข้อมูลประวัติการทำรายการ</div>
                                ) : (
                                    getBorrowerHistory(selectedBorrowerDetail.id).map(item => (
                                        <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                                            <div className="flex items-center space-x-3">
                                                <div className={`p-2.5 rounded-xl ${
                                                    item.type === 'loan' 
                                                        ? 'bg-red-50 text-red-600' 
                                                        : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                    {item.type === 'loan' ? (
                                                        <DollarSign size={16} />
                                                    ) : (
                                                        <ArrowLeftRight size={16} />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-800">
                                                        {item.type === 'loan' ? 'เบิกเงินกู้ยืมล่วงหน้า' : 'หักชำระหนี้ผ่านบิลรับซื้อ'}
                                                    </h4>
                                                    <div className="flex items-center space-x-2 mt-1 text-[11px] font-semibold text-gray-400">
                                                        <span className="flex items-center"><Calendar size={12} className="mr-1" /> {item.date}</span>
                                                        <span>•</span>
                                                        <span>{item.type === 'loan' ? `ข้อตกลง: ${
                                                            item.deductionMethod === 'full' ? 'หักทั้งหมด' :
                                                            item.deductionMethod === 'percent' ? `หัก ${item.deductionValue}% ของบิล` :
                                                            `หักคงที่ ${item.deductionValue} บ./บิล`
                                                        }` : `บิล: ${item.buyId}`}</span>
                                                    </div>
                                                    {item.note && (
                                                        <p className="text-[11px] text-gray-400 italic mt-0.5">"{item.note}"</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span className={`text-sm font-bold font-mono ${
                                                    item.type === 'loan' ? 'text-red-600' : 'text-emerald-600'
                                                }`}>
                                                    {item.type === 'loan' ? '+' : '-'}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <p className="text-[10px] font-bold text-gray-400 mt-1">
                                                    คงค้าง: ฿{(item.type === 'loan' ? item.remainingAmount : item.remainingDebtAfter).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setSelectedBorrowerDetail(null)}
                                className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-all"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Debt Modal */}
            {showClearModal && selectedClearBorrower && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center">
                                <DollarSign className="mr-2 text-orange-600" size={20} />
                                ชำระคืนเงินกู้ด้วยเงินสด
                            </h2>
                            <button onClick={() => { setShowClearModal(false); setSelectedClearBorrower(null); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleClearDebtSubmit} className="p-6 space-y-4">
                            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl space-y-1">
                                <p className="text-xs text-orange-800">
                                    ผู้กู้ยืม: <span className="font-bold">{selectedClearBorrower.name}</span>
                                    {activeTab === 'employee' && (
                                        <span className="text-[11px] font-normal block mt-0.5 opacity-80">
                                            (ลูกจ้างสังกัด: {getEmployeeFarmerName(selectedClearBorrower.id) || 'ไม่ระบุ'})
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-orange-800">
                                    หนี้คงเหลือสะสม: <span className="font-mono font-bold text-sm">฿{selectedClearBorrower.remainingDebt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </p>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">จำนวนเงินชำระคืน (บาท) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={selectedClearBorrower.remainingDebt}
                                    placeholder="กรอกจำนวนเงินชำระคืน"
                                    required
                                    value={repayAmount}
                                    onChange={(e) => setRepayAmount(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-700">วันที่ทำรายการ *</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="date"
                                            required
                                            value={repayDate}
                                            onChange={(e) => setRepayDate(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">หมายเหตุ</label>
                                <textarea
                                    rows="2"
                                    placeholder="เช่น รับชำระคืนเงินสดปิดหนี้หน้าร้าน"
                                    value={repayNote}
                                    onChange={(e) => setRepayNote(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => { setShowClearModal(false); setSelectedClearBorrower(null); }}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl text-xs font-bold transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRepayment}
                                    className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center space-x-1.5"
                                >
                                    <DollarSign size={14} />
                                    <span>{submittingRepayment ? 'กำลังบันทึก...' : 'ยืนยันชำระคืน'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
