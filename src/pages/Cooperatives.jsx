import React, { useState, useEffect } from 'react';
import { 
    Users, Award, Coins, Calculator, Wallet, 
    PieChart, ArrowLeft, RefreshCw, PlusCircle, Settings, PiggyBank 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
    fetchCoopMembers, addCoopMember, deleteCoopMember,
    fetchShareTransactions, addShareTransaction, deleteShareTransaction,
    fetchDividendPeriods, fetchFarmers, getSettings, isCached,
    fetchSavingsTransactions, addSavingsTransaction, deleteSavingsTransaction, distributeSavingsInterest,
    fetchSavingsAccounts, addSavingsAccount, deleteSavingsAccount,
    fetchEmployees
} from '../services/apiService';

// Subcomponents
import { OrgChartTab } from './cooperatives/OrgChartTab';
import { MembersTab } from './cooperatives/MembersTab';
import { SharesTab } from './cooperatives/SharesTab';
import { SavingsTab } from './cooperatives/SavingsTab';
import { DividendWizardTab } from './cooperatives/DividendWizardTab';
import { PayoutTab } from './cooperatives/PayoutTab';

export const Cooperatives = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('members'); // 'org_chart', 'members', 'shares', 'savings', 'wizard', 'payout'
    const [loading, setLoading] = useState(true);

    // Core Data States
    const [members, setMembers] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [savingsTransactions, setSavingsTransactions] = useState([]);
    const [savingsAccounts, setSavingsAccounts] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [settings, setSettings] = useState({});
    const [selectedPeriodId, setSelectedPeriodId] = useState(null);

    const loadAllData = async (force = false) => {
        if (!isCached('coop_members', 'farmers', 'employees') || force) {
            setLoading(true);
        }
        try {
            const [mRes, fRes, txRes, pRes, sRes, svRes, saRes, empRes] = await Promise.all([
                fetchCoopMembers({}, force),
                fetchFarmers(false, force),
                fetchShareTransactions(),
                fetchDividendPeriods(),
                getSettings(),
                fetchSavingsTransactions(),
                fetchSavingsAccounts(),
                fetchEmployees(force)
            ]);

            setMembers(Array.isArray(mRes) ? mRes : []);
            setFarmers(Array.isArray(fRes) ? fRes : []);
            setEmployees(Array.isArray(empRes) ? empRes : []);
            setTransactions(Array.isArray(txRes) ? txRes : []);
            setPeriods(Array.isArray(pRes) ? pRes : []);
            setSavingsTransactions(Array.isArray(svRes) ? svRes : []);
            setSavingsAccounts(Array.isArray(saRes) ? saRes : []);
            if (sRes && sRes.status === 'success') {
                setSettings(sRes.data || {});
            }

            if (pRes && pRes.length > 0 && !selectedPeriodId) {
                setSelectedPeriodId(pRes[0].id);
            }
        } catch (err) {
            console.error('Error loading cooperative data:', err);
            toast.error('โหลดข้อมูลกลุ่มและสหกรณ์ล้มเหลว: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // Handlers for Member Management
    const handleSaveMember = async (payload) => {
        const res = await addCoopMember(payload);
        await loadAllData(true);
        return res;
    };

    const handleDeleteMember = async (id) => {
        try {
            await deleteCoopMember(id);
            toast.success('ลบข้อมูลสมาชิกสำเร็จ');
            await loadAllData(true);
        } catch (err) {
            toast.error('ลบล้มเหลว: ' + err.message);
        }
    };

    // Handlers for Shares Management
    const handleAddShareTransaction = async (payload) => {
        const res = await addShareTransaction(payload);
        await loadAllData(true);
        return res;
    };

    const handleDeleteShareTransaction = async (id) => {
        try {
            await deleteShareTransaction(id);
            toast.success('ลบรายการธุรกรรมหุ้นสำเร็จ');
            await loadAllData(true);
        } catch (err) {
            toast.error('ลบล้มเหลว: ' + err.message);
        }
    };

    // Handlers for Savings Management
    const handleAddSavingsTransaction = async (payload) => {
        const res = await addSavingsTransaction(payload);
        await loadAllData(true);
        return res;
    };

    const handleDeleteSavingsTransaction = async (id) => {
        try {
            await deleteSavingsTransaction(id);
            toast.success('ลบรายการธุรกรรมเงินฝากสำเร็จ');
            await loadAllData(true);
        } catch (err) {
            toast.error('ลบล้มเหลว: ' + err.message);
        }
    };

    const handleDistributeSavingsInterest = async (payload) => {
        const res = await distributeSavingsInterest(payload);
        await loadAllData(true);
        return res;
    };

    // Handlers for Savings Accounts Management
    const handleAddSavingsAccount = async (payload) => {
        const res = await addSavingsAccount(payload);
        await loadAllData(true);
        return res;
    };

    const handleDeleteSavingsAccount = async (id) => {
        try {
            await deleteSavingsAccount(id);
            toast.success('ปิดสมุดบัญชีเรียบร้อยแล้ว');
            await loadAllData(true);
        } catch (err) {
            toast.error('ปิดสมุดบัญชีล้มเหลว: ' + err.message);
        }
    };

    const tabs = [
        { id: 'members', label: 'ทะเบียนสมาชิกกลุ่ม', icon: <Users size={16} />, badge: members.length },
        { id: 'org_chart', label: 'ผังองค์กร & คณะกรรมการ', icon: <Award size={16} /> },
        { id: 'shares', label: 'ทุนเรือนหุ้น', icon: <Coins size={16} /> },
        { id: 'savings', label: 'เงินฝาก - ถอนเงิน', icon: <PiggyBank size={16} />, badge: savingsTransactions.length ? `${savingsTransactions.length} รายการ` : null },
        { id: 'wizard', label: 'คำนวณปันผล & เฉลี่ยคืน', icon: <Calculator size={16} /> },
        { id: 'payout', label: 'การจ่ายเงิน & พิมพ์สลิป', icon: <Wallet size={16} />, badge: periods.length ? `${periods.length} รอบ` : null }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-700/20">
                        <PieChart size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center">
                            ระบบกลุ่มสมาชิกเกษตรกร หุ้นส่วน & ปันผลกำไร
                        </h1>
                        <p className="text-xs font-bold text-gray-400 mt-0.5">
                            จัดการสมาชิกวิสาหกิจชุมชน/สหกรณ์, ทุนเรือนหุ้น, และการจัดสรรเงินปันผล-เงินเฉลี่ยคืนประจำรอบปี
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        type="button"
                        onClick={() => loadAllData(true)}
                        disabled={loading}
                        className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl border border-gray-200 text-xs font-bold transition-all flex items-center shadow-sm"
                    >
                        <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                        รีเฟรชข้อมูล
                    </button>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm flex items-center space-x-1.5 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-1 ring-emerald-600'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.badge && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Contents */}
            <div>
                {activeTab === 'members' && (
                    <MembersTab
                        members={members}
                        farmers={farmers}
                        employees={employees}
                        accounts={savingsAccounts}
                        settings={settings}
                        onSaveMember={handleSaveMember}
                        onDeleteMember={handleDeleteMember}
                        loading={loading}
                    />
                )}

                {activeTab === 'org_chart' && (
                    <OrgChartTab
                        members={members}
                        onUpdateMember={handleSaveMember}
                        onOpenMemberModal={() => setActiveTab('members')}
                    />
                )}

                {activeTab === 'shares' && (
                    <SharesTab
                        members={members}
                        transactions={transactions}
                        onAddTransaction={handleAddShareTransaction}
                        onDeleteTransaction={handleDeleteShareTransaction}
                        loading={loading}
                    />
                )}

                {activeTab === 'savings' && (
                    <SavingsTab
                        members={members}
                        accounts={savingsAccounts}
                        transactions={savingsTransactions}
                        settings={settings}
                        onAddTransaction={handleAddSavingsTransaction}
                        onDeleteTransaction={handleDeleteSavingsTransaction}
                        onDistributeInterest={handleDistributeSavingsInterest}
                        onOpenAccount={handleAddSavingsAccount}
                        onDeleteAccount={handleDeleteSavingsAccount}
                        loading={loading}
                    />
                )}


                {activeTab === 'wizard' && (
                    <DividendWizardTab
                        periods={periods}
                        onPeriodSaved={() => loadAllData(true)}
                        onNavigateToPayout={(periodId) => {
                            setSelectedPeriodId(periodId);
                            setActiveTab('payout');
                        }}
                    />
                )}

                {activeTab === 'payout' && (
                    <PayoutTab
                        periods={periods}
                        selectedPeriodId={selectedPeriodId}
                        onSelectPeriod={setSelectedPeriodId}
                        settings={settings}
                    />
                )}
            </div>
        </div>
    );
};

export default Cooperatives;
