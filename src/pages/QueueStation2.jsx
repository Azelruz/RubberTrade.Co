import React, { useState, useEffect } from 'react';
import { fetchQueues, updateQueue } from '../services/apiService';
import { db } from '../services/db';
import { Beaker, Search, CheckCircle2, Volume2, Save, ArrowRight, RefreshCw, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const QueueStation2 = () => {
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [drcValues, setDrcValues] = useState({}); // { id: drc_value }
    const [autoAnnounce, setAutoAnnounce] = useState(true); // Toggle to speak calling out or not

    // Edit Modal state
    const [editingQueue, setEditingQueue] = useState(null);
    const [editFarmerName, setEditFarmerName] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [editBucketWeight, setEditBucketWeight] = useState('');
    const [editDrc, setEditDrc] = useState('');
    const [editRubberType, setEditRubberType] = useState('fresh_latex');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // Step 1: Read locally from Dexie (Instant)
        try {
            const localQueues = await db.queues.toArray();
            
            // Filter today's queues locally (created_at starts with today YYYY-MM-DD in Bangkok time)
            const todayStr = new Intl.DateTimeFormat('en-CA', { 
                timeZone: 'Asia/Bangkok', 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
            }).format(new Date());

            const todayLocal = localQueues.filter(q => q.created_at && q.created_at.startsWith(todayStr));
            
            // Sort by queue_no
            todayLocal.sort((a, b) => a.queue_no - b.queue_no);
            
            setQueues(todayLocal);

            setDrcValues(prev => {
                const updated = { ...prev };
                todayLocal.forEach(q => {
                    if (q.status === 'waiting_drc') {
                        // Only initialize if not already defined (avoids overwriting active typed values)
                        if (updated[q.id] === undefined) {
                            updated[q.id] = q.drc || '';
                        }
                    }
                });
                return updated;
            });
            setLoading(false);
        } catch (localErr) {
            console.error("Failed to load local queues", localErr);
        }

        // Step 2: Fetch from server in background to revalidate (SWR pattern)
        if (navigator.onLine) {
            try {
                const qList = await fetchQueues();
                if (Array.isArray(qList)) {
                    // Update local Dexie database
                    await db.queues.bulkPut(qList);

                    // Sort by queue_no
                    qList.sort((a, b) => a.queue_no - b.queue_no);

                    setQueues(qList);
                    setDrcValues(prev => {
                        const updated = { ...prev };
                        qList.forEach(q => {
                            if (q.status === 'waiting_drc') {
                                if (updated[q.id] === undefined) {
                                    updated[q.id] = q.drc || '';
                                }
                            }
                        });
                        return updated;
                    });
                }
            } catch (error) {
                console.warn('Background sync failed:', error.message);
            }
        }
    };

    const handleDrcChange = (id, value) => {
        setDrcValues(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSaveDrc = async (q) => {
        const drcVal = drcValues[q.id];
        if (!drcVal || parseFloat(drcVal) <= 0 || parseFloat(drcVal) > 100) {
            toast.error("กรุณากรอกค่าเปอร์เซ็นต์ DRC ระหว่าง 1 - 100");
            return;
        }

        // 1. Optimistic Update (update UI and Local DB instantly)
        try {
            await db.queues.update(q.id, {
                drc: parseFloat(drcVal),
                status: 'waiting_payment'
            });
            
            // Optimistic UI state update
            setQueues(prev => prev.map(item => item.id === q.id ? { ...item, drc: parseFloat(drcVal), status: 'waiting_payment' } : item));
            
            if (autoAnnounce) {
                announceQueue(q.queue_no, q.farmer_name);
            }
        } catch (localErr) {
            console.error("Local database update failed", localErr);
        }

        setSavingId(q.id);
        
        // 2. Cloud Server Sync
        try {
            const res = await updateQueue({
                id: q.id,
                drc: parseFloat(drcVal),
                status: 'waiting_payment'
            });

            if (res.status === 'success') {
                toast.success(`บันทึก %DRC คิว Q${String(q.queue_no).padStart(2, '0')} สำเร็จ!`);
                // Pull fresh server state
                loadData();
            } else throw new Error(res.message);
        } catch (error) {
            toast.error("บันทึกเข้าระบบคลาวด์ไม่สำเร็จ แต่ได้รับการบันทึกบนเครื่องของคุณแล้ว: " + error.message);
        } finally {
            setSavingId(null);
        }
    };

    // Text to Speech announcement
    const announceQueue = (qNo, name) => {
        if ('speechSynthesis' in window) {
            // Cancel current speech if any
            window.speechSynthesis.cancel();
            
            const message = `ขอเชิญคิวที่ ${qNo} คุณ ${name} รับเงินค่าชำระที่จุดบริการจ่ายเงินได้ค่ะ`;
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'th-TH';
            utterance.rate = 1.0;
            
            // Attempt to fetch Thai voice
            const voices = window.speechSynthesis.getVoices();
            const thaiVoice = voices.find(v => v.lang === 'th-TH' || v.lang.startsWith('th'));
            if (thaiVoice) {
                utterance.voice = thaiVoice;
            }
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Speech synthesis not supported on this browser.");
        }
    };

    const handleManualCall = (q) => {
        announceQueue(q.queue_no, q.farmer_name);
        // Set calling status on remote DB too
        updateQueue({ id: q.id, status: 'calling', called_at: new Date().toISOString() })
            .then(() => loadData())
            .catch(() => {});
        toast.success(`ประกาศคิว Q${String(q.queue_no).padStart(2, '0')} แล้ว`);
    };

    const handleOpenEdit = (q) => {
        setEditingQueue(q);
        setEditFarmerName(q.farmer_name || '');
        setEditWeight(q.weight || '');
        setEditBucketWeight(q.bucket_weight || 0);
        setEditDrc(q.drc || '');
        setEditRubberType(q.rubber_type || 'fresh_latex');
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingQueue) return;

        const weightNum = parseFloat(editWeight);
        if (isNaN(weightNum) || weightNum <= 0) {
            toast.error("กรุณากรอกน้ำหนักที่ถูกต้อง");
            return;
        }

        const drcNum = editDrc ? parseFloat(editDrc) : null;
        if (drcNum !== null && (isNaN(drcNum) || drcNum < 1 || drcNum > 100)) {
            toast.error("กรุณากรอกค่า %DRC ระหว่าง 1 - 100");
            return;
        }

        const payload = {
            id: editingQueue.id,
            farmer_name: editFarmerName.trim(),
            weight: weightNum,
            bucket_weight: parseFloat(editBucketWeight) || 0,
            drc: drcNum,
            rubber_type: editRubberType,
            status: drcNum !== null ? 'waiting_payment' : editingQueue.status
        };

        setSavingId(editingQueue.id);
        const toastId = toast.loading("กำลังบันทึกการแก้ไขข้อมูลคิว...");

        try {
            // 1. Local Dexie Update
            await db.queues.update(editingQueue.id, payload);

            // Optimistic UI state update
            setQueues(prev => prev.map(item => item.id === editingQueue.id ? { ...item, ...payload } : item));

            // 2. Server Cloud Update
            const res = await updateQueue(payload);
            if (res && res.status === 'success') {
                toast.success(`แก้ไขข้อมูลคิว Q${String(editingQueue.queue_no).padStart(2, '0')} สำเร็จ!`, { id: toastId });
                setEditingQueue(null);
                loadData();
            } else {
                throw new Error(res?.message || 'บันทึกล้มเหลว');
            }
        } catch (err) {
            toast.error("บันทึกล้มเหลว: " + err.message, { id: toastId });
        } finally {
            setSavingId(null);
        }
    };

    const waitingQueues = queues.filter(q => q.status === 'waiting_drc');
    const waitingPaymentQueues = queues.filter(q => q.status === 'waiting_payment' || q.status === 'calling');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Beaker className="mr-3 text-rubber-600 animate-bounce" size={28} />
                    จุดที่ 2: ห้องแล็บวัดเปอร์เซ็นต์น้ำยาง (% DRC)
                </h1>
                <p className="text-gray-500">สำหรับพนักงานแล็บ บันทึกค่า % น้ำยางที่ตรวจได้และประกาศเรียกคิวตรวจเสร็จ</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Station 2: Entry table */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center justify-between">
                        <span>รอวัดเปอร์เซ็นต์ (% DRC)</span>
                        <div className="flex items-center space-x-2">
                            <button 
                                type="button"
                                onClick={loadData}
                                className="p-1.5 text-gray-400 hover:text-rubber-600 hover:bg-gray-100 rounded-lg transition-all"
                                title="รีเฟรชข้อมูล"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin text-rubber-600' : ''} />
                            </button>
                            <span className="px-2.5 py-0.5 bg-rubber-50 text-rubber-700 text-xs font-bold rounded-lg font-mono">
                                {waitingQueues.length} รายการ
                            </span>
                        </div>
                    </h2>

                    {/* Auto-announce Toggle Checkbox */}
                    <div className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs font-semibold text-gray-700">
                        <input 
                            type="checkbox" 
                            id="autoAnnounce"
                            checked={autoAnnounce}
                            onChange={(e) => setAutoAnnounce(e.target.checked)}
                            className="rounded text-rubber-600 focus:ring-rubber-500 w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="autoAnnounce" className="cursor-pointer select-none">
                            ประกาศเรียกคิวออกลำโพงเสียงอัตโนมัติเมื่อกดบันทึก
                        </label>
                    </div>

                    <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto pr-1">
                        {loading ? (
                            <div className="py-8 text-center text-gray-400">กำลังโหลดรายการ...</div>
                        ) : waitingQueues.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 italic">ไม่มีคิวค้างตรวจสอบค่า %DRC</div>
                        ) : (
                            waitingQueues.map(q => (
                                <div key={q.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-gray-50/40 p-2 rounded-xl transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-mono font-black text-rubber-700 text-xl">
                                                Q{String(q.queue_no).padStart(2, '0')}
                                            </span>
                                            <span className="font-bold text-gray-900">{q.farmer_name}</span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            น้ำยางชั่งดิบ: <span className="font-mono font-bold">{(Number(q.weight) - Number(q.bucket_weight || 0)).toLocaleString()} กก.</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:w-24">
                                            <input 
                                                type="number" 
                                                step="0.1"
                                                min="1"
                                                max="100"
                                                value={drcValues[q.id] || ''}
                                                onChange={(e) => handleDrcChange(q.id, e.target.value)}
                                                placeholder="% DRC" 
                                                className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-rubber-500" 
                                            />
                                            <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">%</span>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleOpenEdit(q)}
                                            className="p-2 text-gray-400 hover:text-rubber-600 hover:bg-gray-100 rounded-xl transition-all"
                                            title="แก้ไขข้อมูลคิว"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleSaveDrc(q)}
                                            disabled={savingId === q.id}
                                            className="px-3.5 py-2.5 bg-rubber-600 hover:bg-rubber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-sm disabled:opacity-50"
                                        >
                                            <Save size={14} />
                                            <span>บันทึก</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Called / Waiting payment list */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center justify-between">
                        <span>ส่งตรวจแล้ว / รอคิวรับเงิน</span>
                        <div className="flex items-center space-x-2">
                            <button 
                                type="button"
                                onClick={loadData}
                                className="p-1.5 text-gray-400 hover:text-rubber-600 hover:bg-gray-100 rounded-lg transition-all"
                                title="รีเฟรชข้อมูล"
                            >
                                <RefreshCw size={16} className={loading ? 'animate-spin text-rubber-600' : ''} />
                            </button>
                            <span className="px-2.5 py-0.5 bg-orange-50 text-orange-700 text-xs font-bold rounded-lg font-mono">
                                {waitingPaymentQueues.length} รายการ
                            </span>
                        </div>
                    </h2>

                    <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                        {loading ? (
                            <div className="py-8 text-center text-gray-400">กำลังโหลด...</div>
                        ) : waitingPaymentQueues.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 italic">ยังไม่มีคิวตรวจ %DRC สำเร็จในวันนี้</div>
                        ) : (
                            waitingPaymentQueues.map(q => (
                                <div key={q.id} className="py-4 flex items-center justify-between hover:bg-gray-50/20 p-2 rounded-xl transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-mono font-bold text-gray-400">
                                                Q{String(q.queue_no).padStart(2, '0')}
                                            </span>
                                            <span className="font-bold text-gray-700">{q.farmer_name}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono">
                                            ยางดิบ: {(Number(q.weight) - Number(q.bucket_weight || 0)).toLocaleString()} กก. | <span className="text-rubber-600 font-bold">%DRC: {q.drc}%</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <button 
                                            onClick={() => handleOpenEdit(q)}
                                            className="p-2 text-gray-400 hover:text-rubber-600 hover:bg-gray-100 rounded-xl transition-all"
                                            title="แก้ไขข้อมูลคิว"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleManualCall(q)}
                                            className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                                            title="เรียกคิวซ้ำ"
                                        >
                                            <Volume2 size={14} />
                                            <span className="hidden sm:inline">ประกาศ</span>
                                        </button>
                                        <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-1 rounded">
                                            รอจ่ายเงิน
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Queue Modal */}
            {editingQueue && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="bg-rubber-700 text-white px-6 py-4 flex items-center justify-between">
                            <h3 className="font-bold flex items-center space-x-2">
                                <Edit2 size={18} />
                                <span>แก้ไขข้อมูลคิว Q{String(editingQueue.queue_no).padStart(2, '0')}</span>
                            </h3>
                            <button 
                                onClick={() => setEditingQueue(null)}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">ชื่อเกษตรกร / ลูกค้า *</label>
                                <input 
                                    type="text"
                                    value={editFarmerName}
                                    onChange={(e) => setEditFarmerName(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-rubber-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">ประเภทน้ำยาง *</label>
                                <select 
                                    value={editRubberType}
                                    onChange={(e) => setEditRubberType(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-rubber-500 outline-none"
                                >
                                    <option value="fresh_latex">น้ำยางสด</option>
                                    <option value="cup_lump">ยางก้อนถ้วย</option>
                                    <option value="sheet">ยางแผ่น</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">น้ำหนักชั่งรวม (กก.) *</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={editWeight}
                                        onChange={(e) => setEditWeight(e.target.value)}
                                        required
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-rubber-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">หักถัง/ภาชนะ (กก.)</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={editBucketWeight}
                                        onChange={(e) => setEditBucketWeight(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-rubber-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">เปอร์เซ็นต์ % DRC</label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        step="0.1"
                                        min="1"
                                        max="100"
                                        value={editDrc}
                                        onChange={(e) => setEditDrc(e.target.value)}
                                        placeholder="ระบุค่า % DRC (เช่น 32.5)"
                                        className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-rubber-500 outline-none"
                                    />
                                    <span className="absolute right-3 top-3 text-xs text-gray-400 font-bold">%</span>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                <button 
                                    type="button"
                                    onClick={() => setEditingQueue(null)}
                                    className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button 
                                    type="submit"
                                    className="px-5 py-2.5 bg-rubber-600 hover:bg-rubber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
                                >
                                    <Save size={16} />
                                    <span>บันทึกการแก้ไข</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QueueStation2;
