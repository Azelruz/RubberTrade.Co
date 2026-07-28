import React, { useState, useEffect } from 'react';
import { 
    Database, Wifi, WifiOff, RefreshCw, Trash2, Edit, AlertTriangle, 
    CheckCircle2, Clock, X, Save, Eye, ArrowRight, CornerDownRight 
} from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../../services/db';
import { syncQueueToServer } from '../../services/syncService';

const OfflineSyncSettings = () => {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('failed'); // Default to failed items
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncing, setSyncing] = useState(false);

    // Edit Modal State
    const [editingItem, setEditingItem] = useState(null);
    const [editedPayloadJson, setEditedPayloadJson] = useState('');
    const [jsonError, setJsonError] = useState('');

    useEffect(() => {
        loadQueue();

        const handleConnectionChange = () => setIsOnline(navigator.onLine);
        const handleSyncComplete = () => {
            loadQueue();
            setSyncing(false);
        };
        const handleSyncFailed = () => {
            loadQueue();
            setSyncing(false);
        };

        window.addEventListener('online', handleConnectionChange);
        window.addEventListener('offline', handleConnectionChange);
        window.addEventListener('sync-complete', handleSyncComplete);
        window.addEventListener('sync-item-failed', handleSyncFailed);

        return () => {
            window.removeEventListener('online', handleConnectionChange);
            window.removeEventListener('offline', handleConnectionChange);
            window.removeEventListener('sync-complete', handleSyncComplete);
            window.removeEventListener('sync-item-failed', handleSyncFailed);
        };
    }, []);

    const loadQueue = async () => {
        setLoading(true);
        try {
            const allItems = await db.sync_queue.orderBy('createdAt').toArray();
            setQueue(allItems);
        } catch (err) {
            console.error('Failed to load sync queue:', err);
            toast.error('โหลดข้อมูลคิวซิงค์ล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    const handleSyncNow = async () => {
        if (!navigator.onLine) {
            toast.error('ไม่สามารถซิงค์ได้ขณะออฟไลน์ กรุณาเชื่อมต่ออินเทอร์เน็ต');
            return;
        }
        setSyncing(true);
        const toastId = toast.loading('กำลังเริ่มซิงค์ข้อมูลคิวออฟไลน์...');
        try {
            await syncQueueToServer();
            await loadQueue();
            toast.success('กระบวนการซิงค์เสร็จสิ้น', { id: toastId });
        } catch (err) {
            console.error('Sync trigger error:', err);
            toast.error('เกิดข้อผิดพลาดในการรันคิวซิงค์', { id: toastId });
        } finally {
            setSyncing(false);
        }
    };

    const handleRetryItem = async (item) => {
        if (!navigator.onLine) {
            toast.error('กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อลองใหม่อีกครั้ง');
            return;
        }
        try {
            // Reset retryCount and set status back to pending
            await db.sync_queue.update(item.uuid, { retryCount: 0, status: 'pending' });
            toast.success('รีเซ็ตสถานะและเตรียมซิงค์ใหม่สำเร็จ');
            handleSyncNow();
        } catch (err) {
            toast.error('ไม่สามารถอัปเดตสถานะคิวได้');
        }
    };

    const handleDeleteItem = async (item) => {
        if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากคิวรอซิงค์?\n- ข้อมูลนี้จะไม่ถูกส่งขึ้นคลาวด์เซิร์ฟเวอร์\n- แนะนำให้ลบเฉพาะรายการที่คีย์ผิดซ้ำซ้อนเท่านั้น')) {
            return;
        }
        try {
            await db.sync_queue.delete(item.uuid);
            toast.success('ลบรายการออกจากคิวสำเร็จ');
            loadQueue();
            window.dispatchEvent(new Event('dashboard-refresh'));
        } catch (err) {
            toast.error('ไม่สามารถลบรายการได้');
        }
    };

    const handleClearAllFailed = async () => {
        const failedItems = queue.filter(item => item.status === 'failed');
        if (failedItems.length === 0) return;

        if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการซิงค์ที่ล้มเหลวทั้งหมด (${failedItems.length} รายการ) ออกจากคิว?`)) {
            return;
        }

        try {
            for (const item of failedItems) {
                await db.sync_queue.delete(item.uuid);
            }
            toast.success('ล้างรายการล้มเหลวทั้งหมดสำเร็จ');
            loadQueue();
        } catch (err) {
            toast.error('เกิดข้อผิดพลาดในการล้างคิว');
        }
    };

    // Edit payload helper
    const handleOpenEditModal = (item) => {
        setEditingItem(item);
        setJsonError('');
        try {
            // Format JSON nicely for the text area
            const formattedJson = JSON.stringify(item.payload, null, 4);
            setEditedPayloadJson(formattedJson);
        } catch {
            setEditedPayloadJson(JSON.stringify(item.payload));
        }
    };

    const handleSaveEditedPayload = async () => {
        setJsonError('');
        try {
            const parsedPayload = JSON.parse(editedPayloadJson);
            
            // Basic structural check
            if (!parsedPayload) {
                setJsonError('Payload ต้องไม่ว่างเปล่า');
                return;
            }

            // Save back to db.sync_queue
            // Note: Also update status back to pending so it gets picked up again
            await db.sync_queue.update(editingItem.uuid, { 
                payload: parsedPayload,
                status: 'pending',
                retryCount: 0,
                note: null // Clear old error note
            });

            // Optional: If the item type is a local DB table write, also update local IndexedDB record
            // to keep the frontend view consistent before syncing.
            const recordData = parsedPayload.payload || parsedPayload;
            const recordId = recordData?.id;
            const table = editingItem.type;

            if (recordId && db[table] && editingItem.type !== 'deleteRecord' && editingItem.type !== 'updateRecord') {
                try {
                    await db[table].put(recordData);
                } catch (dbErr) {
                    console.warn(`[OfflineSync] Failed to update local table ${table} during edit:`, dbErr);
                }
            }

            toast.success('บันทึกการแก้ไขและเตรียมรอซิงค์ใหม่สำเร็จ');
            setEditingItem(null);
            loadQueue();
            
            // Refresh dashboard
            window.dispatchEvent(new Event('dashboard-refresh'));
            window.dispatchEvent(new Event('data-updated'));
        } catch (err) {
            setJsonError(`รูปแบบ JSON ไม่ถูกต้อง: ${err.message}`);
        }
    };

    const formatTimestamp = (ts) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const getEntityTypeName = (type) => {
        const names = {
            'buys': 'ซื้อน้ำยาง',
            'sells': 'ขายน้ำยาง',
            'farmers': 'ข้อมูลเกษตรกร',
            'staff': 'พนักงาน',
            'employees': 'ลูกจ้างพนักงานกรีด',
            'expenses': 'ค่าใช้จ่าย',
            'wages': 'ค่าจ้างพนักงาน',
            'chemicals': 'การใช้สารเคมี',
            'promotions': 'โปรโมชั่นแต้ม',
            'farmer_types': 'ประเภทสมาชิก',
            'settings': 'ตั้งค่า',
            'deleteRecord': 'ลบข้อมูล',
            'updateRecord': 'แก้ไขข้อมูล'
        };
        return names[type] || type;
    };

    const getEntityTypeColor = (type) => {
        const colors = {
            'buys': 'bg-green-50 text-green-700 border-green-150',
            'sells': 'bg-blue-50 text-blue-700 border-blue-150',
            'farmers': 'bg-amber-50 text-amber-700 border-amber-150',
            'deleteRecord': 'bg-red-50 text-red-700 border-red-150',
            'updateRecord': 'bg-purple-50 text-purple-700 border-purple-150'
        };
        return colors[type] || 'bg-gray-50 text-gray-700 border-gray-150';
    };

    // Filter queue items
    const failedItems = queue.filter(item => item.status === 'failed');
    const pendingItems = queue.filter(item => item.status !== 'failed');
    const activeItems = activeTab === 'failed' ? failedItems : pendingItems;

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/30 border border-gray-50 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-rubber-600 rounded-2xl shadow-lg shadow-rubber-200 text-white">
                        <Database size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">คิวซิงค์ข้อมูลออฟไลน์</h1>
                        <p className="text-xs md:text-sm font-medium text-gray-500">จัดการข้อมูลธุรกรรมที่จัดเก็บออฟไลน์ และแก้ปัญหารายการที่ซิงค์ไม่สำเร็จ</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Status Badge */}
                    {isOnline ? (
                        <div className="flex items-center text-green-600 bg-green-50 px-3.5 py-2 rounded-xl text-xs font-black border border-green-200 shadow-sm">
                            <Wifi size={16} className="mr-2 animate-pulse" />
                            <span>ออนไลน์ (Connected)</span>
                        </div>
                    ) : (
                        <div className="flex items-center text-amber-600 bg-amber-50 px-3.5 py-2 rounded-xl text-xs font-black border border-amber-200 animate-pulse shadow-sm">
                            <WifiOff size={16} className="mr-2" />
                            <span>ออฟไลน์ (Offline)</span>
                        </div>
                    )}

                    {/* Sync Trigger Button */}
                    <button
                        onClick={handleSyncNow}
                        disabled={syncing || queue.length === 0 || !isOnline}
                        className={`flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${
                            syncing 
                                ? 'bg-gray-150 text-gray-400 cursor-not-allowed shadow-none'
                                : queue.length === 0 
                                    ? 'bg-gray-50 text-gray-400 border border-gray-100 shadow-none cursor-not-allowed'
                                    : !isOnline
                                        ? 'bg-amber-100 text-amber-700 border border-amber-200 cursor-not-allowed shadow-none'
                                        : 'bg-rubber-600 hover:bg-rubber-700 text-white shadow-rubber-100'
                        }`}
                    >
                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                        <span>{syncing ? 'กำลังซิงค์...' : 'เริ่มซิงค์ข้อมูลทันที'}</span>
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-50 shadow-md p-5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">คิวทั้งหมดค้างในเครื่อง</p>
                        <p className="text-2xl font-black text-gray-900">{queue.length} <span className="text-xs font-bold text-gray-500">รายการ</span></p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center border border-gray-100">
                        <Database size={18} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-50 shadow-md p-5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">รอดำเนินการซิงค์</p>
                        <p className="text-2xl font-black text-blue-600">{pendingItems.length} <span className="text-xs font-bold text-gray-500">รายการ</span></p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
                        <Clock size={18} />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-50 shadow-md p-5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">การซิงค์ล้มเหลว</p>
                        <p className="text-2xl font-black text-red-600">{failedItems.length} <span className="text-xs font-bold text-gray-500">รายการ</span></p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center border border-red-100">
                        <AlertTriangle size={18} className={failedItems.length > 0 ? 'animate-bounce' : ''} />
                    </div>
                </div>
            </div>

            {/* Queue Listing Area */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/30 border border-gray-50 overflow-hidden min-h-[500px] flex flex-col">
                {/* Tabs Bar Header */}
                <div className="bg-gray-50/50 border-b border-gray-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex bg-gray-100/80 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('failed')}
                            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center space-x-1.5 ${
                                activeTab === 'failed'
                                    ? 'bg-white text-red-600 shadow-sm border border-gray-200/50'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <AlertTriangle size={14} />
                            <span>ซิงค์ล้มเหลว ({failedItems.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center space-x-1.5 ${
                                activeTab === 'pending'
                                    ? 'bg-white text-blue-600 shadow-sm border border-gray-200/50'
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            <Clock size={14} />
                            <span>รอดำเนินการ ({pendingItems.length})</span>
                        </button>
                    </div>

                    {activeTab === 'failed' && failedItems.length > 0 && (
                        <button
                            onClick={handleClearAllFailed}
                            className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center space-x-1.5 bg-red-50 hover:bg-red-100/55 px-3 py-2 rounded-xl transition-all w-fit"
                        >
                            <Trash2 size={13} />
                            <span>ล้างรายการล้มเหลวทั้งหมด</span>
                        </button>
                    )}
                </div>

                {/* Queue Content list */}
                <div className="flex-1 p-5 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-80 space-y-3">
                            <RefreshCw className="animate-spin text-rubber-600" size={30} />
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">กำลังโหลดข้อมูลคิว...</p>
                        </div>
                    ) : activeItems.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-80 text-gray-400 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                                <CheckCircle2 size={32} className="text-gray-300" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-black text-gray-700">ไม่มีข้อมูลในคิวนี้</p>
                                <p className="text-xs font-medium text-gray-400 mt-1">
                                    {activeTab === 'failed' 
                                        ? 'การซิงค์ออฟไลน์ราบรื่น ไม่มีธุรกรรมผิดพลาดสะสม' 
                                        : 'ไม่มีธุรกรรมใหม่ที่ยังไม่ได้อัปโหลด รอเก็บข้อมูลตอนออฟไลน์ถัดไป'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeItems.map((item) => {
                                const recordData = item.payload?.payload || item.payload || {};
                                
                                return (
                                    <div 
                                        key={item.uuid} 
                                        className={`rounded-2xl border p-5 transition-all shadow-sm ${
                                            item.status === 'failed'
                                                ? 'bg-red-50/10 border-red-100 hover:border-red-200'
                                                : 'bg-white border-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        {/* Row Header */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {/* Entity Type Tag */}
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${getEntityTypeColor(item.type)}`}>
                                                    {getEntityTypeName(item.type)}
                                                </span>
                                                {/* Action Tag */}
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border uppercase tracking-widest ${
                                                    item.action === 'POST' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    item.action === 'DELETE' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {item.action === 'POST' ? 'เพิ่มข้อมูล' : item.action === 'DELETE' ? 'ลบข้อมูล' : 'แก้ไขข้อมูล'}
                                                </span>
                                                <span className="text-[11px] font-medium text-gray-400">
                                                    บันทึกเมื่อ: {formatTimestamp(item.createdAt)}
                                                </span>
                                            </div>

                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                ส่งไม่สำเร็จ: {item.retryCount || 0}/5 ครั้ง
                                            </div>
                                        </div>

                                        {/* Payload Data details mapping */}
                                        <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-50/80 mb-4 text-xs">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-4">
                                                {item.type === 'deleteRecord' ? (
                                                    <>
                                                        <div><span className="text-gray-400 font-bold">ตารางที่จะลบ:</span> <span className="font-bold text-red-600">{getEntityTypeName(recordData.sheetName)}</span></div>
                                                        <div className="md:col-span-2"><span className="text-gray-400 font-bold">รหัสรายการ (ID):</span> <span className="font-mono font-bold text-gray-700">{recordData.id}</span></div>
                                                    </>
                                                ) : item.type === 'updateRecord' ? (
                                                    <>
                                                        <div><span className="text-gray-400 font-bold">ตารางที่จะแก้ไข:</span> <span className="font-bold text-purple-600">{getEntityTypeName(recordData.sheetName)}</span></div>
                                                        <div><span className="text-gray-400 font-bold">รหัสรายการ (ID):</span> <span className="font-mono font-bold text-gray-700">{recordData.id}</span></div>
                                                        <div>
                                                            <span className="text-gray-400 font-bold">แก้ไขฟิลด์:</span> 
                                                            <span className="font-bold text-gray-700"> {Object.keys(recordData.updates || {}).join(', ')}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {recordData.date && <div><span className="text-gray-400 font-bold">วันที่บันทึก:</span> <span className="font-bold text-gray-700">{recordData.date}</span></div>}
                                                        {recordData.farmerName && <div><span className="text-gray-400 font-bold">ชื่อเกษตรกร:</span> <span className="font-bold text-gray-700">{recordData.farmerName}</span></div>}
                                                        {recordData.name && <div><span className="text-gray-400 font-bold">ชื่อรายการ:</span> <span className="font-bold text-gray-700">{recordData.name}</span></div>}
                                                        {recordData.weight && <div><span className="text-gray-400 font-bold">น้ำหนักรวม:</span> <span className="font-bold text-gray-700">{recordData.weight} กก.</span></div>}
                                                        {recordData.bucketWeight !== undefined && <div><span className="text-gray-400 font-bold">น้ำหนักถัง:</span> <span className="font-bold text-gray-700">{recordData.bucketWeight} กก.</span></div>}
                                                        {recordData.total && <div><span className="text-gray-400 font-bold">ยอดเงินสุทธิ:</span> <span className="font-bold text-green-600">{parseFloat(recordData.total).toLocaleString('th-TH')} บาท</span></div>}
                                                        {recordData.phone && <div><span className="text-gray-400 font-bold">เบอร์โทรศัพท์:</span> <span className="font-bold text-gray-700">{recordData.phone}</span></div>}
                                                        {recordData.plateNo && <div><span className="text-gray-400 font-bold">ทะเบียนรถ:</span> <span className="font-bold text-gray-700">{recordData.plateNo}</span></div>}
                                                        {recordData.id && <div className="md:col-span-3"><span className="text-gray-400 font-bold">คีย์ UUID ชั่วคราว:</span> <span className="font-mono text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600">{recordData.id}</span></div>}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Error Alert Box for Failed item */}
                                        {item.status === 'failed' && (
                                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start space-x-3 mb-4">
                                                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                                                <div>
                                                    <h4 className="text-[10px] font-black text-red-800 uppercase tracking-widest mb-0.5">สาเหตุการปฏิเสธ (Error Reason)</h4>
                                                    <p className="text-xs font-bold text-red-700">{item.note || 'ไม่ทราบสาเหตุการล้มเหลวแน่ชัด หรือข้อมูลมีโครงสร้างไม่ถูกต้อง'}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            {item.status === 'failed' && (
                                                <button
                                                    onClick={() => handleRetryItem(item)}
                                                    className="flex items-center space-x-1.5 px-4 py-2 border border-rubber-200 text-rubber-600 bg-rubber-50 hover:bg-rubber-100/50 rounded-xl text-xs font-bold transition-all"
                                                >
                                                    <RefreshCw size={13} />
                                                    <span>ลองซิงค์ใหม่ (Retry)</span>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleOpenEditModal(item)}
                                                className="flex items-center space-x-1.5 px-4 py-2 border border-blue-200 text-blue-600 bg-blue-55/10 hover:bg-blue-50 rounded-xl text-xs font-bold transition-all"
                                            >
                                                <Edit size={13} />
                                                <span>แก้ไข Payload (Edit)</span>
                                            </button>

                                            <button
                                                onClick={() => handleDeleteItem(item)}
                                                className="flex items-center space-x-1.5 px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-all"
                                            >
                                                <Trash2 size={13} />
                                                <span>ลบรายการทิ้ง (Delete)</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal Dialog popup */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl border border-gray-100 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Edit className="text-blue-600" size={18} />
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 leading-none mb-1">แก้ไขข้อมูลคิวรอซิงค์</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">แก้ไขตัวแปร JSON ก่อนอัปโหลด</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingItem(null)}
                                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 flex-1 overflow-y-auto space-y-4">
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed font-bold">
                                💡 แนะนำ: กรุณาแก้ไขเฉพาะฟิลด์ที่มีข้อผิดพลาดของข้อมูล (เช่น แก้ตัวเลขติดลบ, เปลี่ยนวันที่ หรือแก้ ID ที่ไม่ตรง) และตรวจสอบโครงสร้างวงเล็บและเครื่องหมายคำพูดให้ถูกต้องก่อนกดบันทึก
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">โครงสร้างข้อมูล JSON (Payload)</label>
                                <textarea
                                    value={editedPayloadJson}
                                    onChange={(e) => setEditedPayloadJson(e.target.value)}
                                    className="w-full h-80 px-4 py-3 bg-gray-900 border border-gray-800 rounded-2xl font-mono text-xs text-green-400 focus:ring-2 focus:ring-blue-500 transition-all resize-none shadow-inner"
                                    placeholder="Loading JSON payload..."
                                ></textarea>
                            </div>

                            {jsonError && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 font-bold">
                                    ⚠️ {jsonError}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-all active:scale-95"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSaveEditedPayload}
                                className="flex items-center space-x-1.5 px-6 py-2.5 bg-rubber-600 hover:bg-rubber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-rubber-100"
                            >
                                <Save size={14} />
                                <span>บันทึกการแก้ไข</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfflineSyncSettings;
