import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCcw, Database, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, resetLocalDatabase } from '../../services/db';

export const MaintenanceSettings = () => {
    const [pendingCount, setPendingCount] = useState(0);
    const [isResetting, setIsResetting] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        checkSyncQueue();
    }, []);

    const checkSyncQueue = async () => {
        try {
            const count = await db.sync_queue.count();
            setPendingCount(count);
        } catch (e) {
            console.error("Failed to check sync queue:", e);
        }
    };

    const handleReset = async () => {
        if (confirmText !== 'RESET') {
            toast.error('กรุณาพิมพ์ RESET เพื่อยืนยัน');
            return;
        }

        setIsResetting(true);
        const toastId = toast.loading('กำลังล้างข้อมูลในเครื่อง...');

        try {
            await resetLocalDatabase();
            toast.success('ล้างข้อมูลสำเร็จ ระบบจะเริ่มใหม่ใน 2 วินาที', { id: toastId });
            
            // Wait 2s and reload
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            toast.error('เกิดข้อผิดพลาด: ' + error.message, { id: toastId });
            setIsResetting(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
                    <Database className="mr-2 text-gray-400" size={24} />
                    จัดการฐานข้อมูลในเครื่อง
                </h2>
                <p className="text-sm text-gray-500">
                    เมนูสำหรับดูแลรักษาข้อมูลที่เก็บไว้ภายในเบราว์เซอร์ของคุณ
                </p>
            </div>

            {/* Sync Queue Warning */}
            <div className={`p-6 rounded-2xl border-2 transition-all ${pendingCount > 0 ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl ${pendingCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                        {pendingCount > 0 ? <AlertTriangle size={24} /> : <RefreshCcw size={24} />}
                    </div>
                    <div>
                        <h3 className={`font-bold mb-1 ${pendingCount > 0 ? 'text-amber-900' : 'text-green-900'}`}>
                            {pendingCount > 0 ? 'มีรายการรอซิงค์ค้างอยู่' : 'ข้อมูลทั้งหมดซิงค์เรียบร้อยแล้ว'}
                        </h3>
                        <p className={`text-sm ${pendingCount > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                            {pendingCount > 0 
                                ? `คุณมี ${pendingCount} รายการที่บันทึกขณะออฟไลน์และยังส่งไม่ถึงเซิร์ฟเวอร์ การล้างข้อมูลตอนนี้จะทำให้รายการเหล่านี้หายไปถาวร`
                                : 'ข้อมูลในเครื่องของคุณตรงกับบนเซิร์ฟเวอร์ (หรือไม่มีรายการค้าง) สามารถล้างข้อมูลได้อย่างปลอดภัย'}
                        </p>
                        {pendingCount > 0 && (
                            <button 
                                onClick={checkSyncQueue}
                                className="mt-4 text-xs font-bold uppercase tracking-wider text-amber-600 hover:text-amber-800 flex items-center"
                            >
                                <RefreshCcw size={12} className="mr-1" /> ตรวจสอบใหม่
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-8 border-t border-gray-100">
                <div className="bg-red-50 rounded-3xl border border-red-100 overflow-hidden">
                    <div className="p-6 bg-red-100/50 flex items-center space-x-3">
                        <ShieldAlert className="text-red-600" size={20} />
                        <h3 className="font-black text-red-900 uppercase tracking-wider text-sm">Danger Zone</h3>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        <div>
                            <h4 className="font-bold text-gray-900 mb-2 text-lg">ล้างข้อมูลในเครื่องทั้งหมด (Reset Local DB)</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                การดำเนินการนี้จะลบตารางข้อมูลทั้งหมด (เกษตรกร, บิลซื้อ-ขาย, ตั้งค่าหน้าจอ) เฉพาะในเครื่องนี้เท่านั้น 
                                ข้อมูลบนระบบ Cloud จะไม่หายไป แต่ระบบจะบังคับให้คุณโหลดข้อมูลใหม่ทั้งหมดเมื่อเข้าใช้งานครั้งถัดไป
                            </p>
                        </div>

                        {!showConfirm ? (
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="w-full sm:w-auto px-8 py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 hover:-translate-y-1 transition-all active:translate-y-0"
                            >
                                เริ่มต้นการล้างข้อมูล
                            </button>
                        ) : (
                            <div className="space-y-4 animate-in zoom-in-95 duration-300">
                                <div className="p-4 bg-white border border-red-200 rounded-2xl">
                                    <label className="block text-xs font-bold text-red-600 uppercase tracking-widest mb-2">
                                        พิมพ์คำว่า "RESET" เพื่อยืนยัน
                                    </label>
                                    <input
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder="RESET"
                                        className="w-full px-4 py-3 bg-red-50 border-2 border-red-100 rounded-xl focus:border-red-500 focus:ring-0 font-black text-center text-xl text-red-600 placeholder:text-red-200"
                                    />
                                </div>
                                
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                                        className="flex-1 px-6 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        disabled={confirmText !== 'RESET' || isResetting}
                                        className="flex-[2] px-6 py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 disabled:opacity-30 disabled:shadow-none transition-all flex items-center justify-center space-x-2"
                                    >
                                        {isResetting ? <RefreshCcw className="animate-spin" /> : null}
                                        <span>ยืนยันล้างข้อมูลและเริ่มระบบใหม่</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
