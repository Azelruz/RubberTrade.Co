import React, { useState, useEffect } from 'react';
import { fetchPublicQueues, fetchServiceQueues } from '../services/apiService';
import { Volume2, Tv, AlertCircle, Wrench, Droplets, RefreshCw, Clock, CheckCircle2, PlayCircle } from 'lucide-react';
import { db } from '../services/db';

export const QueueMonitor = () => {
    const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'service'
    const [autoRotate, setAutoRotate] = useState(true);
    const [queues, setQueues] = useState([]);
    const [serviceQueues, setServiceQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get storeId from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get('storeId');

    useEffect(() => {
        // Initial fetch
        loadAllQueues();

        // Setup polling every 5 seconds
        const interval = setInterval(loadAllQueues, 5000);
        return () => clearInterval(interval);
    }, [storeId]);

    // Auto-rotate tab every 15 seconds if enabled
    useEffect(() => {
        if (!autoRotate) return;
        const rotateTimer = setInterval(() => {
            setActiveTab(prev => (prev === 'buy' ? 'service' : 'buy'));
        }, 15000);
        return () => clearInterval(rotateTimer);
    }, [autoRotate]);

    const loadAllQueues = async () => {
        try {
            // Load buy queues
            if (storeId) {
                const data = await fetchPublicQueues(storeId);
                setQueues(Array.isArray(data) ? data : []);
            } else {
                const localBuy = await db.queues.toArray();
                setQueues(localBuy || []);
            }

            // Load service queues
            const localService = await db.service_queues.toArray();
            setServiceQueues(localService || []);
            
            if (navigator.onLine) {
                const sData = await fetchServiceQueues();
                if (Array.isArray(sData)) {
                    setServiceQueues(sData);
                }
            }
            setError(null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Filter Buy Queues
    const callingQueue = queues.find(q => q.status === 'calling');
    const waitingDrc = queues.filter(q => q.status === 'waiting_drc');
    const waitingPayment = queues.filter(q => q.status === 'waiting_payment');

    // Filter Service Queues
    const inProgressService = serviceQueues.filter(q => q.status === 'in_progress');
    const pendingService = serviceQueues.filter(q => q.status === 'pending');
    const completedService = serviceQueues.filter(q => q.status === 'completed');

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 font-sans flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 mb-6 gap-4">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-900/30">
                        <Tv size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center">
                            จอแสดงลำดับคิวประจำร้าน
                        </h1>
                        <p className="text-xs md:text-sm text-slate-400 font-medium mt-0.5">
                            ระบบจัดคิวรับซื้อยางพารา & คิวงานบริการเกษตรทั่วไป
                        </p>
                    </div>
                </div>
                
                {/* Monitor Tabs & Auto Rotate Controls */}
                <div className="flex items-center space-x-3">
                    <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                        <button
                            onClick={() => { setActiveTab('buy'); setAutoRotate(false); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                                activeTab === 'buy' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Droplets size={16} />
                            <span>คิวรับซื้อน้ำยาง ({queues.filter(q => q.status !== 'completed').length})</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('service'); setAutoRotate(false); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                                activeTab === 'service' ? 'bg-rubber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Wrench size={16} />
                            <span>คิวบริการทั่วไป ({pendingService.length + inProgressService.length})</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setAutoRotate(!autoRotate)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center space-x-1 ${
                            autoRotate ? 'bg-emerald-950/80 border-emerald-800 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                        title={autoRotate ? 'กำลังเปิดสลับแท็บบนทีวีอัตโนมัติ (ทุก 15 วินาที)' : 'ปิดการสลับแท็บอัตโนมัติ'}
                    >
                        <RefreshCw size={16} className={autoRotate ? 'animate-spin' : ''} />
                        <span className="hidden xl:inline">{autoRotate ? 'Auto Rotate: ON' : 'Auto Rotate: OFF'}</span>
                    </button>
                </div>
            </div>

            {loading && queues.length === 0 && serviceQueues.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">กำลังเชื่อมต่อหน้าจอคิว...</div>
                </div>
            ) : activeTab === 'buy' ? (
                /* TAB 1: RUBBER BUY QUEUES */
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                    {/* Left Column: Calling Queue (Big TV Display) */}
                    <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full filter blur-3xl"></div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-xs md:text-sm font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-900/50">
                                กำลังเรียกคิวซื้อยาง (Calling Now)
                            </span>
                            {callingQueue && (
                                <span className="flex items-center space-x-2 text-emerald-400 animate-pulse text-sm font-bold">
                                    <Volume2 size={16} />
                                    <span>เชิญที่จุดแล็บ / วัด %DRC</span>
                                </span>
                            )}
                        </div>

                        {callingQueue ? (
                            <div className="my-10 text-center space-y-4">
                                <div className="text-[120px] md:text-[200px] font-mono font-black text-emerald-400 leading-none drop-shadow-[0_10px_30px_rgba(16,185,129,0.2)] animate-pulse">
                                    Q{String(callingQueue.queue_no).padStart(2, '0')}
                                </div>
                                <div className="text-3xl md:text-5xl font-extrabold text-white">
                                    คุณ {callingQueue.farmer_name}
                                </div>
                                <div className="text-slate-400 text-sm md:text-lg font-medium">
                                    ประเภท: {callingQueue.rubber_type === 'fresh_latex' ? 'น้ำยางสด' : callingQueue.rubber_type === 'cup_lump' ? 'ยางก้อนถ้วย' : 'ยางแผ่น'} | น้ำหนัก: {((Number(callingQueue.weight) - Number(callingQueue.bucket_weight || 0))).toLocaleString()} กก.
                                </div>
                            </div>
                        ) : (
                            <div className="my-14 text-center py-12">
                                <div className="text-slate-500 text-lg italic">ไม่มีคิวที่กำลังเรียกในขณะนี้</div>
                                <div className="text-slate-600 text-xs mt-2">คิวถัดไปโปรดตรวจสอบตารางความเคลื่อนไหวด้านข้าง</div>
                            </div>
                        )}

                        <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80 text-xs text-slate-500 flex justify-between">
                            <span>ความเร็วการประกาศ: อัตโนมัติ</span>
                            <span className="font-mono">Live Monitor Board</span>
                        </div>
                    </div>

                    {/* Right Column: Queue lists (Waiting for Lab & Waiting for Payment) */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        {/* Box 1: Waiting Payment (ตรวจเสร็จแล้วรอเงิน) */}
                        <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
                            <h2 className="text-sm font-black uppercase tracking-wider text-orange-400 mb-4 pb-3 border-b border-slate-800 flex justify-between items-center">
                                <span>คิวตรวจ % แล้ว (รอรับเงิน)</span>
                                <span className="font-mono bg-orange-950 text-orange-400 px-2 py-0.5 rounded text-xs">
                                    {waitingPayment.length} คิว
                                </span>
                            </h2>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[250px]">
                                {waitingPayment.length === 0 ? (
                                    <div className="text-slate-600 text-xs italic text-center py-6">ไม่มีคิวรอรับเงิน</div>
                                ) : (
                                    waitingPayment.map(q => (
                                        <div key={q.id} className="flex justify-between items-center bg-slate-900/80 p-3 rounded-2xl border border-slate-800/50 hover:border-orange-500/20 transition-colors">
                                            <div className="flex items-center space-x-3">
                                                <span className="font-mono font-black text-orange-400 text-lg bg-orange-950/40 w-12 h-8 rounded-lg flex items-center justify-center">
                                                    Q{String(q.queue_no).padStart(2, '0')}
                                                </span>
                                                <span className="font-bold text-sm text-slate-200">{q.farmer_name}</span>
                                            </div>
                                            <span className="font-mono text-xs font-bold text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded">
                                                %DRC: {q.drc}%
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Box 2: Waiting Lab (%DRC) */}
                        <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
                            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 pb-3 border-b border-slate-800 flex justify-between items-center">
                                <span>คิวรอวัด % (ห้องแล็บ)</span>
                                <span className="font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-xs">
                                    {waitingDrc.length} คิว
                                </span>
                            </h2>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[250px]">
                                {waitingDrc.length === 0 ? (
                                    <div className="text-slate-600 text-xs italic text-center py-6">ไม่มีคิวค้างในห้องแล็บ</div>
                                ) : (
                                    waitingDrc.map(q => (
                                        <div key={q.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-2xl border border-slate-800/20">
                                            <div className="flex items-center space-x-3">
                                                <span className="font-mono font-bold text-slate-400 bg-slate-800/40 w-12 h-8 rounded-lg flex items-center justify-center">
                                                    Q{String(q.queue_no).padStart(2, '0')}
                                                </span>
                                                <span className="font-medium text-sm text-slate-300">{q.farmer_name}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">
                                                Waiting
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* TAB 2: GENERAL SERVICES QUEUES (ตัดหญ้า, ฉีดพ่นยา, ไถสวน, ตัดไม้) */
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                    {/* Left Column: In Progress Services */}
                    <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                            <span className="text-xs md:text-sm font-black uppercase tracking-widest text-blue-400 bg-blue-950/80 px-4 py-1.5 rounded-full border border-blue-900/50 flex items-center">
                                <PlayCircle size={16} className="mr-1.5" /> งานบริการกำลังปฏิบัติงาน (In Progress)
                            </span>
                            <span className="font-mono text-sm text-blue-400 font-bold">
                                {inProgressService.length} งาน
                            </span>
                        </div>

                        <div className="my-6 space-y-4 max-h-[450px] overflow-y-auto pr-2">
                            {inProgressService.length === 0 ? (
                                <div className="text-center py-16 text-slate-500 italic">
                                    ไม่มีงานบริการที่กำลังปฏิบัติงานในขณะนี้
                                </div>
                            ) : (
                                inProgressService.map(q => (
                                    <div key={q.id} className="bg-slate-900/80 p-5 rounded-2xl border border-blue-500/30 flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="px-3.5 py-2 bg-blue-950 text-blue-400 font-mono font-black text-xl rounded-xl border border-blue-800">
                                                {q.service_no}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">{q.customer_name}</h3>
                                                <p className="text-xs text-blue-400 font-bold mt-0.5">
                                                    บริการ: {q.service_name} ({q.quantity} {q.unit_type === 'rai' ? 'ไร่' : q.unit_type === 'hour' ? 'ชั่วโมง' : 'หน่วย'})
                                                </p>
                                                {q.location_note && (
                                                    <p className="text-xs text-slate-400 mt-1">📍 {q.location_note}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-mono font-bold text-emerald-400">
                                                ฿{Number(q.total_amount || 0).toLocaleString()}
                                            </div>
                                            <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-950 text-blue-400 rounded-full text-[11px] font-bold border border-blue-900">
                                                กำลังทำงาน
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80 text-xs text-slate-500 flex justify-between">
                            <span>ระบบจัดการบริการทางการเกษตรทั่วไป</span>
                            <span className="font-mono">Live Service Monitor</span>
                        </div>
                    </div>

                    {/* Right Column: Pending Service Queues */}
                    <div className="lg:col-span-1 bg-slate-900/30 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
                        <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 mb-4 pb-3 border-b border-slate-800 flex justify-between items-center">
                            <span className="flex items-center">
                                <Clock size={16} className="mr-1.5 text-amber-400" /> คิวบริการถัดไป (Pending)
                            </span>
                            <span className="font-mono bg-amber-950 text-amber-400 px-2 py-0.5 rounded text-xs">
                                {pendingService.length} คิว
                            </span>
                        </h2>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[500px]">
                            {pendingService.length === 0 ? (
                                <div className="text-slate-600 text-xs italic text-center py-12">ไม่มีคิวรอปฏิบัติงาน</div>
                            ) : (
                                pendingService.map(q => (
                                    <div key={q.id} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="font-mono font-bold text-amber-400 bg-amber-950/40 px-2.5 py-1.5 rounded-lg text-sm border border-amber-900/50">
                                                {q.service_no}
                                            </span>
                                            <div>
                                                <div className="font-bold text-sm text-slate-200">{q.customer_name}</div>
                                                <div className="text-xs text-slate-400">{q.service_name}</div>
                                            </div>
                                        </div>
                                        <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded">
                                            ฿{Number(q.total_amount || 0).toLocaleString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QueueMonitor;
