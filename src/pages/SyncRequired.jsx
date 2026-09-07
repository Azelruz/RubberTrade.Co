import React, { useState } from 'react';
import { Wifi, ShieldAlert, RefreshCw, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SyncRequired = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // If user is not logged in, redirect directly to login page
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const handleRetry = async () => {
        if (!navigator.onLine) {
            toast.error('ยังไม่ได้เชื่อมต่ออินเทอร์เน็ต กรุณาเปิดเน็ตแล้วลองใหม่อีกครั้ง');
            return;
        }

        setLoading(true);
        try {
            // Update last sync timestamp in localStorage to current time
            const nowStr = new Date().toISOString();
            localStorage.setItem('rt_last_sync', nowStr);
            
            toast.success('เชื่อมต่ออินเทอร์เน็ตสำเร็จ กำลังเข้าสู่ระบบ...');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 600);
        } catch (e) {
            console.error(e);
            toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            // Clear all local storage keys related to lock & store
            localStorage.removeItem('rt_last_sync');
            localStorage.removeItem('rt_subscription_expiry');
            localStorage.removeItem('rt_active_store_id');
            await logout();
        } catch (e) {
            console.error(e);
        } finally {
            window.location.href = '/login';
        }
    };

    const isExpired = user?.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                <div className={`p-8 text-center ${isExpired ? 'bg-red-600' : 'bg-rubber-600'}`}>
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6 backdrop-blur-sm">
                        {isExpired ? (
                            <ShieldAlert className="text-white" size={40} />
                        ) : (
                            <Wifi className="text-white animate-pulse" size={40} />
                        )}
                    </div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                        {isExpired ? 'หมดอายุการใช้งาน' : 'ต้องเชื่อมต่ออินเทอร์เน็ต'}
                    </h1>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <p className="text-slate-600 text-center font-medium leading-relaxed">
                            {isExpired 
                                ? 'อายุการใช้งานของคุณสิ้นสุดลงแล้ว กรุณาชำระเงินเพื่อใช้งานต่อ'
                                : 'เพื่อความปลอดภัย ระบบต้องการให้คุณเชื่อมต่ออินเทอร์เน็ตอย่างน้อยทุกๆ 3 วัน เพื่อยืนยันสิทธิ์การใช้งาน'}
                        </p>

                        {!isExpired && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start space-x-3">
                                <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-800 font-bold leading-normal">
                                    คุณใช้งานแบบออฟไลน์เกินกำหนด 3 วันแล้ว แอปถูกระงับชั่วคราวจนกว่าจะมีการออนไลน์
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {!isExpired ? (
                            <button
                                onClick={handleRetry}
                                disabled={loading}
                                className="w-full bg-rubber-600 hover:bg-rubber-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-rubber-100 transition-all active:scale-95 flex items-center justify-center space-x-2"
                            >
                                {loading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                                <span>{loading ? 'กำลังตรวจสอบ...' : 'ลองใหม่อีกครั้ง (เชื่อมต่อเน็ตแล้ว)'}</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/subscription')}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center justify-center space-x-2"
                            >
                                <ShieldAlert size={20} />
                                <span>ไปหน้าชำระเงิน</span>
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            disabled={loading}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all flex items-center justify-center space-x-2"
                        >
                            <LogOut size={20} />
                            <span>ออกจากระบบ</span>
                        </button>
                    </div>

                    <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">
                        RubberTrade Secure Access Policy
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SyncRequired;
