import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitSubscriptionRequest, getSubscriptionStatus, fetchPackages } from '../services/apiService';
import { CreditCard, CheckCircle, Clock, AlertCircle, Upload, History, DollarSign, ExternalLink, ShieldCheck, Package, Building2, User, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { th } from 'date-fns/locale';

const Subscription = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [subData, setSubData] = useState(null);
    const [packages, setPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [slip64, setSlip64] = useState(null);
    const [filename, setFilename] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showQr, setShowQr] = useState(false);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        setLoading(true);
        try {
            const [statusRes, pkgRes] = await Promise.all([
                getSubscriptionStatus(),
                fetchPackages()
            ]);
            if (statusRes.status === 'success') {
                setSubData(statusRes);
            }
            if (pkgRes.status === 'success') {
                setPackages(pkgRes.packages);
                if (pkgRes.packages.length > 0) setSelectedPackage(pkgRes.packages[0]); // default select first
            }
        } catch (err) {
            toast.error('ไม่สามารถโหลดข้อมูลสมาชิกได้');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('ไฟล์มีขนาดเกิน 2MB');
            return;
        }

        setFilename(file.name);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setSlip64(reader.result);
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPackage) return toast.error('กรุณาเลือกแพ็กเกจที่ต้องการสมัคร');
        if (!slip64) return toast.error('กรุณาแนบหลักฐานการโอนเงิน');

        setIsSubmitting(true);
        try {
            const res = await submitSubscriptionRequest(slip64, filename, selectedPackage.price, selectedPackage.name, selectedPackage.days);
            if (res.status === 'success') {
                toast.success('ส่งหลักฐานเรียบร้อยแล้ว รอการตรวจสอบจากเจ้าหน้าที่');
                setSlip64(null);
                setFilename('');
                loadStatus();
            }
        } catch (err) {
            toast.error('ส่งข้อมูลล้มเหลว: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rubber-600"></div>
        </div>
    );

    const isExpired = user?.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date();
    const expiryDate = user?.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">ระบบสมาชิก & การชำระเงิน</h1>
                    <p className="text-gray-500 font-medium">จัดการอายุการใช้งานและตรวจสอบประวัติการชำระเงิน</p>
                </div>
                <div className={`px-6 py-3 rounded-2xl flex items-center space-x-3 shadow-lg ${isExpired ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-rubber-50 text-rubber-700 border border-rubber-100'}`}>
                    {isExpired ? <AlertCircle size={24} /> : <ShieldCheck size={24} />}
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</div>
                        <div className="font-bold text-lg">{isExpired ? 'หมดอายุแล้ว' : 'กำลังใช้งาน'}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Status Card */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                            <CreditCard size={200} />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center">
                                <Clock className="mr-3 text-rubber-500" size={24} />
                                รายละเอียดการใช้งาน
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">แพ็กเกจปัจจุบัน</div>
                                    <div className="text-2xl font-black text-rubber-700">{user?.role === 'super_admin' ? 'Super User' : (subData?.subscription?.subscription_status === 'trial' ? 'ฟรีทดลองใช้งาน' : 'สมาชิกรายเดือน')}</div>
                                </div>
                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">วันหมดอายุ</div>
                                    <div className={`text-2xl font-black ${isExpired ? 'text-red-500' : 'text-gray-800'}`}>
                                        {expiryDate ? format(expiryDate, 'd MMMM yyyy', { locale: th }) : 'ไม่ระบุ'}
                                    </div>
                                </div>
                            </div>

                            {isExpired && (
                                <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-3xl flex items-start space-x-4">
                                    <div className="p-3 bg-red-100 rounded-2xl text-red-600">
                                        <AlertCircle size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-red-900 text-lg">การใช้งานของคุณสิ้นสุดแล้ว</h4>
                                        <p className="text-red-700 font-medium">คุณยังสามารถดูข้อมูลเดิมได้ แต่จะไม่สามารถบันทึกรายการใหม่หรือส่งออกข้อมูลได้ กรุณาชำระเงินเพื่อเปิดใช้งานเต็มรูปแบบ</p>
                                    </div>
                                </div>
                            )}

                            {!isExpired && expiryDate && (
                                <div className="mt-8 p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-center space-x-4">
                                    <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <p className="text-amber-800 font-bold">คงเหลือเวลาใช้งานอีก {Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))} วัน</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-xl font-black text-gray-800 flex items-center">
                                <History className="mr-3 text-rubber-500" size={24} />
                                ประวัติการชำระเงิน
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-[10px] uppercase font-black tracking-widest text-gray-400">
                                    <tr>
                                        <th className="px-8 py-4">วันที่แจ้ง</th>
                                        <th className="px-8 py-4">จำนวนเงิน</th>
                                        <th className="px-8 py-4">หลักฐาน</th>
                                        <th className="px-8 py-4">สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {subData?.requests?.map(req => (
                                        <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="font-bold text-gray-700">
                                                    {req.package_name ? `${req.package_name} ` : ''}
                                                    <span className="text-gray-400 text-xs">({format(new Date(req.requestedAt), 'HH:mm dd/MM/yy', { locale: th })})</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="font-black text-gray-900">฿{req.amount}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <a href={req.slipUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-rubber-600 hover:text-rubber-700 font-bold text-sm">
                                                    <ExternalLink size={14} className="mr-1" /> ดูรูปสลิป
                                                </a>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                                                    req.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    req.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {req.status === 'approved' ? 'อนุมัติแล้ว' : req.status === 'rejected' ? 'ปฏิเสธ' : 'รอการตรวจสอบ'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!subData?.requests || subData.requests.length === 0) && (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-12 text-center text-gray-400 font-medium">ยังไม่เคยมีประวัติการแจ้งชำระเงิน</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Payment Form */}
                <div className="space-y-6">
                    <div className="bg-[#111827] text-white rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <DollarSign size={100} />
                        </div>
                        <h3 className="text-xl font-black mb-6 flex items-center">
                            <CreditCard className="mr-3" size={24} />
                            แจ้งชำระเงิน (ต่ออายุ)
                        </h3>
                        
                        {/* Bank Details Section */}
                        {subData?.payment_info && (
                            <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                                <div className="text-[10px] font-black text-white/50 uppercase tracking-widest border-b border-white/10 pb-2 mb-2">ช่องทางชำระเงิน</div>
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <div className="text-xs text-white/50">ธนาคาร</div>
                                        <div className="font-bold text-white">{subData.payment_info.bank_name || '-'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <div className="text-xs text-white/50">เลขที่บัญชี</div>
                                        <div className="font-black text-white text-lg tracking-wider">{subData.payment_info.bank_account || '-'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <div className="text-xs text-white/50">ชื่อบัญชี</div>
                                        <div className="font-bold text-white">{subData.payment_info.bank_owner || '-'}</div>
                                    </div>
                                </div>

                                {subData.payment_info.promptpay_id && selectedPackage && (
                                    <div className="pt-4 border-t border-white/10">
                                        <button 
                                            type="button" 
                                            onClick={() => setShowQr(!showQr)}
                                            className="w-full py-3 px-4 bg-rubber-500/20 hover:bg-rubber-500/30 border border-rubber-500/40 rounded-xl flex items-center justify-center gap-2 text-rubber-300 font-black text-xs uppercase tracking-widest transition-all"
                                        >
                                            <QrCode size={16} />
                                            {showQr ? 'ซ่อน QR Code' : 'สแกนชำระเงิน (QR Code)'}
                                        </button>

                                        {showQr && (
                                            <div className="mt-4 p-4 bg-white rounded-2xl flex flex-col items-center animate-in zoom-in-95 duration-300">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PromptPay QR Code</div>
                                                <div className="text-sm font-black text-gray-900 mb-3 border-b border-gray-100 w-full text-center pb-2">฿{selectedPackage.price.toLocaleString()}</div>
                                                <img 
                                                    src={`https://promptpay.io/${subData.payment_info.promptpay_id}/${selectedPackage.price}.png`} 
                                                    alt="PromptPay QR Code" 
                                                    className="w-full max-w-[200px] aspect-square object-contain"
                                                />
                                                <p className="text-[9px] text-gray-400 mt-2 italic text-center leading-tight px-4">สแกนชำระด้วยแอปธนาคารใดก็ได้<br/>เงินโอนเข้าบัญชี PromptPay โดยตรง</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-6">
                            
                            <div className="space-y-3">
                                <label className="text-xs font-black text-white/50 uppercase tracking-widest block">เลือกแพ็กเกจต่ออายุ</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {packages.map(pkg => (
                                        <div 
                                            key={pkg.id} 
                                            onClick={() => setSelectedPackage(pkg)}
                                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                                selectedPackage?.id === pkg.id 
                                                    ? 'border-rubber-500 bg-rubber-500/10' 
                                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                            }`}
                                        >
                                            <div className="text-sm font-bold text-white/90">{pkg.name}</div>
                                            <div className="text-xl font-black mt-1">฿{pkg.price}</div>
                                        </div>
                                    ))}
                                </div>
                                {packages.length === 0 && (
                                    <div className="text-sm text-white/50 italic py-2">ไม่มีแพ็กเกจแสดง กรุณาติดต่อผู้ดูแลระบบ</div>
                                )}
                            </div>

                            {selectedPackage && (
                                <div className="p-5 bg-rubber-500/20 rounded-2xl border border-rubber-500/30 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black text-rubber-300 uppercase tracking-[0.2em] mb-1">ยอดที่ต้องโอน</p>
                                        <div className="text-3xl font-black text-white">{selectedPackage.price.toFixed(2)}</div>
                                    </div>
                                    <Package size={40} className="text-rubber-400 opacity-50" />
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-white/50 uppercase tracking-widest block">แนบหลักฐานการโอนเงิน (สลิป)</label>
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleFileChange}
                                            className="hidden" 
                                            id="slip-upload"
                                        />
                                        <label 
                                            htmlFor="slip-upload" 
                                            className="w-full py-4 px-6 bg-white/10 hover:bg-white/20 border-2 border-dashed border-white/20 hover:border-white/40 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all gap-2"
                                        >
                                            {filename ? (
                                                <div className="flex items-center text-rubber-400 font-bold">
                                                    <CheckCircle size={20} className="mr-2" />
                                                    {filename.length > 20 ? filename.substring(0, 17) + '...' : filename}
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload size={24} className="text-white/40" />
                                                    <span className="font-bold text-sm text-white/60">คลิกเพื่อเลือกไฟล์รูปภาพ</span>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || !slip64}
                                    className="w-full bg-rubber-500 hover:bg-rubber-400 disabled:opacity-50 disabled:bg-gray-700 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-rubber-500/20 hover:shadow-rubber-500/40 transition-all flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? (
                                        <div className="w-6 h-6 border-b-2 border-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>ยืนยันสลิปเงิน</span>
                                            <ExternalLink size={20} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="pt-4 border-t border-white/10 opacity-60 text-[11px] font-medium leading-relaxed">
                                เมื่อส่งสลิปแล้ว เจ้าหน้าที่จะใช้เวลาตรวจสอบภายใน 2-4 ชั่วโมง หากมีปัญหาติดต่อ Line: @rubbertrade
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscription;
