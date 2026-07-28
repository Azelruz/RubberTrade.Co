import React, { useState, useEffect } from 'react';
import { fetchFarmers, fetchQueues, addQueue, updateQueue, addFarmer } from '../services/apiService';
import { db } from '../services/db';
import { Search, PlusCircle, User, Scale, FileText, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const QueueStation1 = () => {
    const [farmers, setFarmers] = useState([]);
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [searchFarmer, setSearchFarmer] = useState('');
    const [newFarmerNote, setNewFarmerNote] = useState('');
    const [weight, setWeight] = useState('');
    const [bucketWeight, setBucketWeight] = useState('');
    const [rubberType, setRubberType] = useState('fresh_latex');
    const [showFarmerDropdown, setShowFarmerDropdown] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // Step 1: Read locally from Dexie (Instant)
        try {
            const [localFarmers, localQueues] = await Promise.all([
                db.farmers.toArray(),
                db.queues.toArray()
            ]);

            setFarmers(localFarmers || []);

            const todayStr = new Intl.DateTimeFormat('en-CA', { 
                timeZone: 'Asia/Bangkok', 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
            }).format(new Date());

            const todayLocal = (localQueues || []).filter(q => q.created_at && q.created_at.startsWith(todayStr));
            todayLocal.sort((a, b) => a.queue_no - b.queue_no);
            setQueues(todayLocal);
            setLoading(false);
        } catch (localErr) {
            console.error("Local load error", localErr);
        }

        // Step 2: Fetch background revalidation
        if (navigator.onLine) {
            try {
                const [fList, qList] = await Promise.all([fetchFarmers(), fetchQueues()]);
                if (Array.isArray(fList)) {
                    await db.farmers.bulkPut(fList);
                    setFarmers(fList);
                }
                if (Array.isArray(qList)) {
                    await db.queues.bulkPut(qList);
                    qList.sort((a, b) => a.queue_no - b.queue_no);
                    setQueues(qList);
                }
            } catch (error) {
                console.warn("Background sync failed:", error.message);
            }
        }
    };

    // Filter farmers based on query
    const filteredFarmers = farmers.filter(f => 
        (f.name || '').toLowerCase().includes(searchFarmer.toLowerCase()) ||
        (f.phone || '').includes(searchFarmer)
    );

    const handleSelectFarmer = (farmer) => {
        setSelectedFarmer(farmer);
        setSearchFarmer(farmer.name);
        setShowFarmerDropdown(false);
    };

    const handleAddQueue = async (e) => {
        e.preventDefault();
        
        let targetFarmerId = selectedFarmer?.id;
        let targetFarmerName = selectedFarmer?.name;

        // Check if there is no selected farmer, but we typed a name
        if (!selectedFarmer && searchFarmer.trim()) {
            // Check if matches an existing farmer exactly
            const exactMatch = farmers.find(f => f.name.trim().toLowerCase() === searchFarmer.trim().toLowerCase());
            if (exactMatch) {
                targetFarmerId = exactMatch.id;
                targetFarmerName = exactMatch.name;
            } else {
                // Must be a new farmer registration
                if (!newFarmerNote || newFarmerNote.trim().length < 5) {
                    toast.error("กรุณากรอกเบอร์โทรหรือหมายเหตุสำหรับเกษตรกรใหม่ (อย่างน้อย 5 ตัวอักษร)");
                    return;
                }
                setSubmitting(true);
                const loader = toast.loading("กำลังลงทะเบียนเกษตรกรใหม่...");
                try {
                    const resFarmer = await addFarmer({ name: searchFarmer.trim(), note: newFarmerNote.trim() });
                    if (resFarmer.status === 'success') {
                        targetFarmerId = resFarmer.id;
                        targetFarmerName = searchFarmer.trim();
                        toast.success("ลงทะเบียนเกษตรกรใหม่สำเร็จ!", { id: loader });
                    } else {
                        throw new Error(resFarmer.message || "ลงทะเบียนไม่สำเร็จ");
                    }
                } catch (err) {
                    toast.error("ล้มเหลวในการลงทะเบียนเกษตรกรใหม่: " + err.message, { id: loader });
                    setSubmitting(false);
                    return;
                }
            }
        }

        if (!targetFarmerId) {
            toast.error("กรุณาเลือกเกษตรกร หรือพิมพ์ชื่อเพื่อลงทะเบียนใหม่");
            return;
        }

        if (!weight || parseFloat(weight) <= 0) {
            toast.error("กรุณากรอกน้ำหนักยางที่ถูกต้อง");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                farmer_id: targetFarmerId,
                farmer_name: targetFarmerName,
                rubber_type: rubberType,
                weight: parseFloat(weight) || 0,
                bucket_weight: parseFloat(bucketWeight) || 0,
                status: 'waiting_drc'
            };

            const res = await addQueue(payload);
            if (res.status === 'success') {
                toast.success(`ออกบัตรคิวสำเร็จ: Q${String(res.queue_no).padStart(2, '0')}`);
                // Reset form
                setSelectedFarmer(null);
                setSearchFarmer('');
                setNewFarmerNote('');
                setWeight('');
                setBucketWeight('');
                setRubberType('fresh_latex');
                loadData();
            } else {
                throw new Error(res.message);
            }
        } catch (error) {
            toast.error("ออกคิวล้มเหลว: " + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelQueue = async (qId) => {
        if (!window.confirm("ยืนยันการยกเลิกคิวนี้?")) return;
        try {
            const res = await updateQueue({ id: qId, status: 'cancelled' });
            if (res.status === 'success') {
                toast.success("ยกเลิกคิวเรียบร้อยแล้ว");
                loadData();
            } else throw new Error(res.message);
        } catch (error) {
            toast.error("ยกเลิกล้มเหลว: " + error.message);
        }
    };

    // Filter queues by status
    const waitingQueues = queues.filter(q => q.status === 'waiting_drc');
    const processedQueues = queues.filter(q => q.status !== 'waiting_drc');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Scale className="mr-3 text-rubber-600 animate-pulse" size={28} />
                    จุดที่ 1: รับชั่งน้ำยางสด & ออกคิว
                </h1>
                <p className="text-gray-500">สำหรับเจ้าหน้าที่จุดรับชั่งยาง ออกลำดับคิวและป้อนน้ำหนักยางสดดิบ</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Issue Queue Ticket Form */}
                <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center">
                        <PlusCircle className="mr-2 text-rubber-600" size={20} />
                        ออกตั๋วคิวใหม่
                    </h2>
                    
                    <form onSubmit={handleAddQueue} className="space-y-4">
                        {/* Farmer Selection */}
                        <div className="relative">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">เลือกเกษตรกร / ลูกค้า *</label>
                            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                <User size={18} className="text-gray-400 mr-2" />
                                <input 
                                    type="text" 
                                    value={searchFarmer} 
                                    onChange={(e) => {
                                        setSearchFarmer(e.target.value);
                                        setShowFarmerDropdown(true);
                                        if (selectedFarmer && e.target.value !== selectedFarmer.name) {
                                            setSelectedFarmer(null);
                                        }
                                    }}
                                    onFocus={() => setShowFarmerDropdown(true)}
                                    placeholder="ค้นหาชื่อ หรือเบอร์โทร..." 
                                    className="bg-transparent text-sm w-full focus:outline-none" 
                                />
                            </div>
                            
                            {showFarmerDropdown && searchFarmer && (
                                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                                    {filteredFarmers.length === 0 ? (
                                        <div className="p-3 text-sm text-gray-400 italic text-center">พิมพ์ต่อเพื่อสร้างสมาชิกใหม่...</div>
                                    ) : (
                                        filteredFarmers.map(f => (
                                            <div 
                                                key={f.id} 
                                                onClick={() => handleSelectFarmer(f)}
                                                className="p-3 text-sm hover:bg-rubber-50 hover:text-rubber-700 cursor-pointer transition-colors"
                                            >
                                                {f.name} {f.phone ? `(${f.phone})` : ''}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* New farmer details field */}
                        {searchFarmer.trim() && !selectedFarmer && !farmers.some(f => f.name.trim().toLowerCase() === searchFarmer.trim().toLowerCase()) && (
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3.5 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                <p className="text-[10px] font-bold text-orange-700">📌 ลงทะเบียนเกษตรกรใหม่ (ระบุเบอร์โทร/เลขบัตรเพื่อความปลอดภัย):</p>
                                <input 
                                    type="text" 
                                    value={newFarmerNote} 
                                    onChange={(e) => setNewFarmerNote(e.target.value)}
                                    placeholder="เบอร์โทรศัพท์ หรือเลขประจำตัวผู้เสียภาษี *" 
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rubber-500 font-mono" 
                                />
                            </div>
                        )}



                        {/* Weight details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">น้ำหนักชั่งรวม (กก.) *</label>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    value={weight} 
                                    onChange={(e) => setWeight(e.target.value)}
                                    placeholder="0.0" 
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">หักถัง/ภาชนะ (กก.)</label>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    value={bucketWeight} 
                                    onChange={(e) => setBucketWeight(e.target.value)}
                                    placeholder="0.0" 
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rubber-500" 
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={submitting || loading}
                            className="w-full py-3 bg-rubber-600 hover:bg-rubber-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            <span>ออกคิวใหม่</span>
                        </button>
                    </form>
                </div>

                {/* Queue Lists Dashboard */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Waiting list */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                            <span>รายการคิวรอห้องแล็บ (%DRC)</span>
                            <div className="flex items-center space-x-2">
                                <button 
                                    type="button"
                                    onClick={loadData}
                                    className="p-1.5 text-gray-400 hover:text-rubber-600 hover:bg-gray-100 rounded-lg transition-all"
                                    title="รีเฟรชข้อมูลคิว"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin text-rubber-600' : ''} />
                                </button>
                                <span className="px-2 py-0.5 bg-rubber-50 text-rubber-700 text-xs font-bold rounded-lg font-mono">
                                    {waitingQueues.length} คิว
                                </span>
                            </div>
                        </h2>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase font-mono">คิวที่</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">เกษตรกร</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">ประเภท</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">น้ำหนักสด (กก.)</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">กำลังโหลด...</td></tr>
                                    ) : waitingQueues.length === 0 ? (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400 italic">ไม่มีคิวค้างส่งตรวจ %DRC</td></tr>
                                    ) : (
                                        waitingQueues.map((q) => (
                                            <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 font-mono font-black text-rubber-700 text-lg">
                                                    Q{String(q.queue_no).padStart(2, '0')}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-900">{q.farmer_name}</td>
                                                <td className="px-4 py-3 text-right text-xs font-bold">
                                                    {q.rubber_type === 'fresh_latex' ? 'น้ำยางสด' : q.rubber_type === 'cup_lump' ? 'ยางก้อนถ้วย' : 'ยางแผ่น'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-gray-700">
                                                    {(Number(q.weight) - Number(q.bucket_weight || 0)).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button 
                                                        onClick={() => handleCancelQueue(q.id)}
                                                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                        title="ยกเลิกคิว"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Today's processed list */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                            <span>คิวที่ดำเนินการแล้วของวันนี้</span>
                            <button 
                                type="button"
                                onClick={loadData}
                                className="p-1.5 text-gray-400 hover:text-rubber-600 hover:bg-gray-100 rounded-lg transition-all"
                                title="รีเฟรชข้อมูลคิว"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin text-rubber-600' : ''} />
                            </button>
                        </h2>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase font-mono">คิวที่</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">เกษตรกร</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">น้ำหนักสุทธิ</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">DRC (%)</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">สถานะคิว</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">กำลังโหลด...</td></tr>
                                    ) : processedQueues.length === 0 ? (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400 italic">ไม่มีคิวที่เสร็จสิ้นในวันนี้</td></tr>
                                    ) : (
                                        processedQueues.map((q) => (
                                            <tr key={q.id} className="hover:bg-gray-50/50 transition-colors text-xs">
                                                <td className="px-4 py-3 font-mono font-bold text-gray-500">
                                                    Q{String(q.queue_no).padStart(2, '0')}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 font-medium">{q.farmer_name}</td>
                                                <td className="px-4 py-3 text-right font-mono">{(Number(q.weight) - Number(q.bucket_weight || 0)).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-rubber-600">{q.drc ? `${q.drc}%` : '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        q.status === 'waiting_payment' ? 'bg-orange-50 text-orange-700' :
                                                        q.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {q.status === 'waiting_payment' ? 'รอเงินจ่าย' :
                                                         q.status === 'completed' ? 'จ่ายเงินเสร็จ' :
                                                         'ยกเลิกคิว'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QueueStation1;
