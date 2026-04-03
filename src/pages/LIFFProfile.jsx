import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { User, Phone, MapPin, Database, Save, Loader2, CheckCircle2 } from 'lucide-react';
import liff from '@line/liff';
import { getLiffFarmer, updateLiffFarmer } from '../services/liffService';
import toast from 'react-hot-toast';

const LIFFProfile = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState(null);
    const [success, setSuccess] = useState(false);
    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        const init = async () => {
            try {
                // In production, LIFF ID should be from config
                // For now we try to init with a placeholder or handled by user
                await liff.init({ liffId: '2009445413-LKTCq5J8' }); 
                
                if (!liff.isLoggedIn()) {
                    liff.login();
                    return;
                }

                const lineProfile = await liff.getProfile();
                setProfile(lineProfile);
                
                const accessToken = liff.getAccessToken();
                const res = await getLiffFarmer(lineProfile.userId, accessToken);
                
                if (res.status === 'success' && res.data) {
                    reset(res.data);
                } else {
                    // Pre-fill name from LINE if first time
                    reset({ name: lineProfile.displayName });
                }
            } catch (err) {
                console.error('LIFF Init Error:', err);
                toast.error('ไม่สามารถโหลดข้อมูล LINE ได้');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [reset]);

    const onSubmit = async (data) => {
        setSaving(true);
        try {
            const accessToken = liff.getAccessToken();
            const res = await updateLiffFarmer(profile.userId, accessToken, data);
            if (res.status === 'success') {
                setSuccess(true);
                toast.success('บันทึกข้อมูลสำเร็จ');
                setTimeout(() => liff.closeWindow(), 2000);
            } else {
                toast.error('บันทึกล้มเหลว: ' + res.message);
            }
        } catch (err) {
            toast.error('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-rubber-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">กำลังโหลดข้อมูลเกษตรกร...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="text-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">บันทึกข้อมูลสำรเร็จ</h1>
                    <p className="text-gray-500">ระบบกำลังปิดหน้าต่างนี้อัตโนมัติ...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="bg-rubber-600 pt-8 pb-16 px-6 text-white text-center">
                {profile?.pictureUrl && (
                    <img 
                        src={profile.pictureUrl} 
                        alt="Profile" 
                        className="w-20 h-20 rounded-full border-4 border-white/20 mx-auto mb-4 shadow-lg"
                    />
                )}
                <h1 className="text-xl font-bold">ข้อมูลส่วนตัวเกษตรกร</h1>
                <p className="text-rubber-100 text-sm opacity-80 mt-1">จัดการข้อมูลบัญชีและที่อยู่ของคุณ</p>
            </div>

            <div className="px-5 -mt-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center">
                                <User size={14} className="mr-1.5" />
                                ชื่อ-นามสกุล
                            </label>
                            <input 
                                {...register('name', { required: true })}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-rubber-500 text-gray-900 font-medium"
                                placeholder="นายสมชาย ใจดี"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center">
                                <Phone size={14} className="mr-1.5" />
                                เบอร์โทรศัพท์
                            </label>
                            <input 
                                {...register('phone')}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-rubber-500 text-gray-900 font-medium"
                                placeholder="08x-xxx-xxxx"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-5">
                            <div className="space-y-1.5 text-left">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center">
                                    <Database size={14} className="mr-1.5" />
                                    ธนาคาร
                                </label>
                                <input 
                                    {...register('bankName')}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-rubber-500 text-gray-900 font-medium"
                                    placeholder="เช่น กสิกรไทย"
                                />
                            </div>
                            <div className="space-y-1.5 text-left">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">
                                    เลขบัญชีธนาคาร
                                </label>
                                <input 
                                    {...register('bankAccount')}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-rubber-500 text-gray-900 font-medium"
                                    placeholder="xxx-x-xxxxx-x"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center">
                                <MapPin size={14} className="mr-1.5" />
                                ที่อยู่
                            </label>
                            <textarea 
                                {...register('address')}
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-rubber-500 text-gray-900 font-medium"
                                placeholder="บ้านเลขที่ ตำบล อำเภอ..."
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-4 bg-rubber-600 text-white rounded-2xl font-bold shadow-lg shadow-rubber-200 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <Save size={20} className="mr-2" />
                        )}
                        บันทึกข้อมูล
                    </button>
                    
                    <p className="text-center text-[11px] text-gray-400 px-6">
                        ข้อมูลนี้จะถูกส่งไปยังโรงงานเพื่อให้การรับซื่้อและโอนเงินเป็นไปอย่างถูกต้อง
                    </p>
                </form>
            </div>
        </div>
    );
};

export default LIFFProfile;
