import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Users, Phone, Database, Plus, Loader2, CheckCircle2, Percent } from 'lucide-react';
import liff from '@line/liff';
import { addLiffEmployee } from '../services/liffService';
import toast from 'react-hot-toast';

const LIFFAddEmployee = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState(null);
    const [success, setSuccess] = useState(false);
    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            profitSharePct: 10
        }
    });

    useEffect(() => {
        const init = async () => {
            try {
                await liff.init({ liffId: '2009445413-EuVTEBaS' });
                if (!liff.isLoggedIn()) {
                    liff.login();
                    return;
                }
                const lineProfile = await liff.getProfile();
                setProfile(lineProfile);
            } catch (err) {
                console.error('LIFF Init Error:', err);
                toast.error('ไม่สามารถโหลดข้อมูล LINE ได้');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const onSubmit = async (data) => {
        setSaving(true);
        try {
            const accessToken = liff.getAccessToken();
            const res = await addLiffEmployee(profile.userId, accessToken, data);
            if (res.status === 'success') {
                setSuccess(true);
                toast.success('เพิ่มลูกจ้างสำเร็จ');
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
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">กำลังเตรียมข้อมูล...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="text-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">เพิ่มลูกจ้างสำเร็จ</h1>
                    <p className="text-gray-500">ข้อมูลลูกจ้างถูกบันทึกเข้าระบบแล้ว</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <div className="bg-blue-600 pt-8 pb-16 px-6 text-white text-center">
                <Users className="w-16 h-16 text-blue-100/40 mx-auto mb-4" />
                <h1 className="text-xl font-bold">ลงทะเบียนลูกจ้างใหม่</h1>
                <p className="text-blue-100 text-sm opacity-80 mt-1">เพิ่มลูกจ้างเข้าในสังกัดของคุณ</p>
            </div>

            <div className="px-5 -mt-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center">
                                <Users size={14} className="mr-1.5" />
                                ชื่อ-นามสกุล ลูกจ้าง
                            </label>
                            <input 
                                {...register('name', { required: true })}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                                placeholder="ชื่อลูกจ้าง"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center">
                                <Phone size={14} className="mr-1.5" />
                                เบอร์โทรศัพท์
                            </label>
                            <input 
                                {...register('phone')}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                                placeholder="08x-xxx-xxxx"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center">
                                <Percent size={14} className="mr-1.5" />
                                ส่วนแบ่งกำไร (%)
                            </label>
                            <input 
                                type="number"
                                step="0.01"
                                {...register('profitSharePct', { required: true })}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium font-mono"
                                placeholder="เช่น 10"
                            />
                            <p className="text-[10px] text-gray-400">เงินส่วนที่ลูกจ้างจะได้รับจากน้ำหนักยางที่ขายได้</p>
                        </div>

                        <div className="grid grid-cols-1 gap-5">
                            <div className="space-y-1.5 text-left">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center">
                                    <Database size={14} className="mr-1.5" />
                                    ธนาคาร (ถ้ามี)
                                </label>
                                <input 
                                    {...register('bankName')}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                                    placeholder="เช่น กสิกรไทย"
                                />
                            </div>
                            <div className="space-y-1.5 text-left">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">
                                    เลขบัญชีธนาคาร (ถ้ามี)
                                </label>
                                <input 
                                    {...register('bankAccount')}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
                                    placeholder="xxx-x-xxxxx-x"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <Plus size={20} className="mr-2" />
                        )}
                        เพิ่มลูกจ้างเข้าสังกัด
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LIFFAddEmployee;
