import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitSubscriptionRequest, getSubscriptionStatus, fetchPackages } from '../services/apiService';
import { 
    CreditCard, CheckCircle, Clock, AlertCircle, Upload, History, 
    DollarSign, ExternalLink, ShieldCheck, Package, Building2, 
    User, QrCode, Sparkles, Crown, Zap, Check, ChevronRight, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
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
                if (pkgRes.packages.length > 0) setSelectedPackage(pkgRes.packages[0]);
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
        <div className="flex justify-center items-center h-[60vh]">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-rubber-100 border-t-rubber-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="text-rubber-600 animate-pulse" size={24} />
                </div>
            </div>
        </div>
    );

    const isExpired = user?.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date();
    const expiryDate = user?.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
    const daysLeft = expiryDate ? differenceInDays(expiryDate, new Date()) : 0;
    const progressPercent = Math.max(0, Math.min(100, (daysLeft / 30) * 100)); // Base on 30 days for visual

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-24 px-4 sm:px-6">
            {/* Header with Premium Feel */}
            <div className="text-center space-y-4 pt-8">
                <div className="inline-flex items-center px-4 py-2 bg-rubber-50 rounded-full text-rubber-600 font-black text-[10px] uppercase tracking-[0.2em] animate-in slide-in-from-top-4 duration-700">
                    <Crown size={14} className="mr-2" />
                    Rubber Trade Premium Experience
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                    ยกระดับธุรกิจของคุณด้วย <span className="text-transparent bg-clip-text bg-gradient-to-r from-rubber-600 to-teal-500">Subscription</span>
                </h1>
                <p className="text-gray-500 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
                    จัดการอายุการใช้งาน เพิ่มสิทธิ์พนักงาน และปลดล็อกฟีเจอร์รายงานเชิงลึกเพื่อการเติบโตที่ยั่งยืน
                </p>
            </div>

            {/* Current Status Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 lg:col-start-3">
                    <div className="bg-white/80 backdrop-blur-2xl rounded-[40px] p-8 border border-white/40 shadow-2xl shadow-gray-200/50 relative overflow-hidden group transition-all duration-500 hover:shadow-rubber-500/10">
                        {/* Decorative background elements */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-rubber-500/10 rounded-full blur-[80px] group-hover:bg-rubber-500/20 transition-all duration-700"></div>
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] group-hover:bg-teal-500/20 transition-all duration-700"></div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                            {/* Left: Progress/Status Circle */}
                            <div className="relative w-40 h-40 flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="80" cy="80" r="70" className="stroke-gray-100 fill-none" strokeWidth="12" />
                                    <circle 
                                        cx="80" cy="80" r="70" 
                                        className={`${isExpired ? 'stroke-red-500' : 'stroke-rubber-500'} fill-none transition-all duration-1000 ease-out`}
                                        strokeWidth="12" 
                                        strokeDasharray={440} 
                                        strokeDashoffset={440 - (440 * (isExpired ? 100 : progressPercent)) / 100}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    {isExpired ? (
                                        <AlertCircle size={32} className="text-red-500 animate-pulse" />
                                    ) : (
                                        <>
                                            <span className="text-3xl font-black text-gray-900 leading-none">{daysLeft}</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Days Left</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Right: Info details */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full text-center md:text-left">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Current Plan</p>
                                    <div className="text-2xl font-black text-gray-900 flex items-center justify-center md:justify-start">
                                        {user?.role === 'super_admin' ? 'Super User' : (subData?.subscription?.subscription_status === 'trial' ? 'FREE TRIAL' : 'PREMIUM')}
                                        <Sparkles className="ml-2 text-amber-400" size={20} />
                                    </div>
                                    <div className="flex items-center justify-center md:justify-start text-sm font-bold text-rubber-600 bg-rubber-50 w-fit px-3 py-1 rounded-full mx-auto md:mx-0">
                                        <User size={14} className="mr-1.5" />
                                        Max Staff: {subData?.subscription?.maxStaffLimit || 1}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Expiration Date</p>
                                    <div className={`text-2xl font-black ${isExpired ? 'text-red-500' : 'text-gray-900'}`}>
                                        {expiryDate ? format(expiryDate, 'd MMM yyyy', { locale: th }) : 'ไม่ระบุ'}
                                    </div>
                                    <p className="text-xs font-bold text-gray-400">
                                        {isExpired ? 'หมดอายุการใช้งานแล้ว' : `สิทธิ์การใช้งานพรีเมียมจนถึงวันที่สิ้นสุด`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Section - SaaS Style */}
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-black text-gray-900 flex items-center justify-center">
                        <Package className="mr-3 text-rubber-500" />
                        เลือกแพ็กเกจที่คุณต้องการ
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {packages.map(pkg => (
                        <div 
                            key={pkg.id} 
                            onClick={() => setSelectedPackage(pkg)}
                            className={`relative bg-white rounded-[32px] p-8 border-2 transition-all duration-500 cursor-pointer group ${
                                selectedPackage?.id === pkg.id 
                                ? 'border-rubber-500 shadow-2xl shadow-rubber-500/20 scale-[1.05] z-10' 
                                : 'border-gray-100 shadow-xl hover:border-gray-200 hover:scale-[1.02]'
                            }`}
                        >
                            {selectedPackage?.id === pkg.id && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rubber-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                    Selected Plan
                                </div>
                            )}
                            
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900">{pkg.name}</h3>
                                        <p className="text-sm font-bold text-gray-400 italic">ใช้งานได้ {pkg.days} วัน</p>
                                    </div>
                                    <div className={`p-3 rounded-2xl transition-colors ${selectedPackage?.id === pkg.id ? 'bg-rubber-100 text-rubber-600' : 'bg-gray-50 text-gray-400'}`}>
                                        <Zap size={24} />
                                    </div>
                                </div>

                                <div className="flex items-baseline">
                                    <span className="text-4xl font-black text-gray-900">฿{pkg.price}</span>
                                    <span className="text-gray-400 font-bold ml-1 text-sm">/ {pkg.days} days</span>
                                </div>

                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center text-sm font-bold text-gray-600">
                                        <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 flex-shrink-0">
                                            <Check size={12} strokeWidth={4} />
                                        </div>
                                        เพิ่มพนักงานสูงสุด {pkg.maxStaff || 1} คน
                                    </div>
                                    <div className="flex items-center text-sm font-bold text-gray-600">
                                        <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 flex-shrink-0">
                                            <Check size={12} strokeWidth={4} />
                                        </div>
                                        ปลดล็อกรายงานภาพรวมธุรกิจ
                                    </div>
                                    <div className="flex items-center text-sm font-bold text-gray-600">
                                        <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 flex-shrink-0">
                                            <Check size={12} strokeWidth={4} />
                                        </div>
                                        ส่งออกข้อมูลเป็น CSV / JSON
                                    </div>
                                </div>

                                <button className={`w-full py-4 rounded-2xl font-black transition-all ${
                                    selectedPackage?.id === pkg.id 
                                    ? 'bg-rubber-600 text-white shadow-xl shadow-rubber-500/30' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}>
                                    {selectedPackage?.id === pkg.id ? 'ดำเนินการชำระเงิน' : 'เลือกแพ็กเกจนี้'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Section - Modern & Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Left: Bank details & QR */}
                <div className="lg:col-span-12">
                    <div className="bg-[#0f172a] rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden text-white">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none">
                            <QrCode size={300} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-3xl font-black mb-2 flex items-center">
                                        <CreditCard className="mr-4 text-rubber-400" size={32} />
                                        ช่องทางการชำระเงิน
                                    </h2>
                                    <p className="text-gray-400 font-medium">โอนเงินผ่านธนาคารหรือสแกน QR Code แล้วแนบสลิปด้านขวา</p>
                                </div>

                                {subData?.payment_info && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors group">
                                                <Building2 className="text-rubber-400 mb-4 group-hover:scale-110 transition-transform" size={24} />
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Bank Name</p>
                                                <p className="font-black text-lg">{subData.payment_info.bank_name || '-'}</p>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors group">
                                                <User className="text-rubber-400 mb-4 group-hover:scale-110 transition-transform" size={24} />
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Account Owner</p>
                                                <p className="font-black text-lg">{subData.payment_info.bank_owner || '-'}</p>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors group relative overflow-hidden">
                                                <CreditCard className="text-rubber-400 mb-4 group-hover:scale-110 transition-transform" size={24} />
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Account No.</p>
                                                <p className="font-black text-xl tracking-tighter">{subData.payment_info.bank_account || '-'}</p>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(subData.payment_info.bank_account);
                                                        toast.success('คัดลอกเลขบัญชีแล้ว');
                                                    }}
                                                    className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
                                                >
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {subData.payment_info.promptpay_id && selectedPackage && (
                                            <div className="flex flex-col sm:flex-row items-center gap-8 bg-rubber-600/10 border border-rubber-500/20 rounded-[32px] p-8">
                                                <div className="bg-white p-4 rounded-3xl shadow-lg transform hover:scale-105 transition-transform duration-500">
                                                    <img 
                                                        src={`https://promptpay.io/${subData.payment_info.promptpay_id}/${selectedPackage.price}.png`} 
                                                        alt="PromptPay QR Code" 
                                                        className="w-40 h-40 object-contain"
                                                    />
                                                    <div className="text-center mt-3 border-t border-gray-100 pt-2">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PromptPay</p>
                                                        <p className="text-sm font-black text-rubber-600">฿{selectedPackage.price.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex-1 space-y-4">
                                                    <div className="inline-flex items-center px-3 py-1 bg-rubber-500 rounded-full text-white font-black text-[9px] uppercase tracking-widest">
                                                        Fast Payment
                                                    </div>
                                                    <h4 className="text-2xl font-black">สแกนชำระเงินทันที</h4>
                                                    <p className="text-gray-400 text-sm leading-relaxed">
                                                        แอปธนาคารทุกแอปสามารถสแกน QR นี้เพื่อโอนเงินเข้าบัญชี PromptPay ของเจ้าของระบบได้โดยตรง พร้อมระบุยอดเงินที่ถูกต้องให้ทันที
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Payment Form - Inner Card */}
                            <div className="bg-white rounded-[32px] p-8 text-gray-900 shadow-2xl space-y-8 animate-in slide-in-from-right-8 duration-700">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total to Pay</p>
                                            <div className="text-3xl font-black text-gray-900">฿{selectedPackage?.price.toFixed(2) || '0.00'}</div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Plan</p>
                                            <div className="text-lg font-black text-rubber-600">{selectedPackage?.name || 'Please select'}</div>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest block px-1">แนบหลักฐานการโอนเงิน (สลิป)</label>
                                            <div className="relative group">
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleFileChange}
                                                    className="hidden" 
                                                    id="slip-upload-premium"
                                                />
                                                <label 
                                                    htmlFor="slip-upload-premium" 
                                                    className="w-full py-8 px-6 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 hover:border-rubber-400 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all gap-3 group"
                                                >
                                                    {filename ? (
                                                        <>
                                                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                                <CheckCircle size={24} />
                                                            </div>
                                                            <div className="text-center">
                                                                <span className="font-black text-sm text-gray-900 block">
                                                                    {filename.length > 30 ? filename.substring(0, 27) + '...' : filename}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase">File Attached</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-12 h-12 bg-white text-gray-400 rounded-full flex items-center justify-center shadow-sm group-hover:text-rubber-500 group-hover:scale-110 transition-all">
                                                                <Upload size={24} />
                                                            </div>
                                                            <div className="text-center">
                                                                <span className="font-black text-sm text-gray-600 block">เลือกไฟล์รูปภาพหลักฐาน</span>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Max size: 2MB</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </label>
                                            </div>
                                        </div>

                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting || !slip64}
                                            className="w-full bg-rubber-600 hover:bg-rubber-700 disabled:opacity-50 disabled:bg-gray-400 text-white p-5 rounded-3xl font-black text-xl shadow-xl shadow-rubber-500/20 hover:shadow-rubber-500/40 transform hover:translate-y-[-2px] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-6 h-6 border-b-2 border-white rounded-full animate-spin"></div>
                                            ) : (
                                                <>
                                                    <span>ยืนยันการแจ้งชำระเงิน</span>
                                                    <ChevronRight size={24} />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                    
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start space-x-3">
                                        <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                                            กรุณาตรวจสอบยอดเงินและบัญชีปลายทางให้ถูกต้องก่อนโอน เจ้าหน้าที่จะตรวจสอบสลิปภายใน 2-4 ชั่วโมงทำการ
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Table - Polished */}
            <div className="animate-in fade-in duration-1000 delay-500">
                <div className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-xl shadow-gray-200/30">
                    <div className="p-10 border-b border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mr-4">
                                <History size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">ประวัติการแจ้งชำระ</h2>
                                <p className="text-gray-400 text-sm font-medium">รายการย้อนหลังทั้งหมดของคุณ</p>
                            </div>
                        </div>
                        <button 
                            onClick={loadStatus} 
                            className="bg-gray-50 hover:bg-gray-100 text-gray-500 p-3 rounded-2xl transition-colors"
                            title="Refresh Data"
                        >
                            <Zap size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-[11px] uppercase font-black tracking-[0.2em] text-gray-400">
                                <tr>
                                    <th className="px-10 py-6">รายการ / วันเวลา</th>
                                    <th className="px-10 py-6">ยอดเงิน</th>
                                    <th className="px-10 py-6">หลักฐาน</th>
                                    <th className="px-10 py-6">สถานะการตรวจสอบ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {subData?.requests?.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50/70 transition-colors group">
                                        <td className="px-10 py-7">
                                            <div className="flex items-center group-hover:translate-x-1 transition-transform">
                                                <div className="w-2 h-2 rounded-full bg-rubber-500 mr-4"></div>
                                                <div>
                                                    <div className="font-black text-gray-900">
                                                        {req.package_name || 'สมัครสมาชิก'}
                                                    </div>
                                                    <div className="text-xs text-gray-400 font-bold mt-0.5">
                                                        {format(new Date(req.requestedAt), 'HH:mm • dd MMMM yyyy', { locale: th })}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="text-xl font-black text-gray-900 tracking-tighter">฿{req.amount}</div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <a 
                                                href={req.slipUrl} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="inline-flex items-center h-10 px-4 rounded-xl bg-gray-50 text-rubber-600 hover:bg-rubber-50 font-black text-xs uppercase tracking-widest transition-all"
                                            >
                                                <ExternalLink size={14} className="mr-2" /> 
                                                View Slip
                                            </a>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center">
                                                {req.status === 'approved' ? (
                                                    <div className="flex items-center px-4 py-2 bg-green-50 text-green-600 rounded-2xl border border-green-100/50 shadow-sm text-xs font-black uppercase tracking-widest">
                                                        <CheckCircle size={14} className="mr-2" />
                                                        Approved
                                                    </div>
                                                ) : req.status === 'rejected' ? (
                                                    <div className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-2xl border border-red-100/50 shadow-sm text-xs font-black uppercase tracking-widest">
                                                        <XCircle size={14} className="mr-2" />
                                                        Rejected
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center px-4 py-2 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100/50 shadow-sm text-xs font-black uppercase tracking-widest">
                                                        <Clock size={14} className="mr-2" />
                                                        Pending
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(!subData?.requests || subData.requests.length === 0) && (
                                    <tr>
                                        <td colSpan="4" className="px-10 py-20 text-center">
                                            <div className="bg-gray-50/50 rounded-3xl p-10 max-w-sm mx-auto border border-dashed border-gray-200">
                                                <History size={40} className="text-gray-300 mx-auto mb-4" />
                                                <p className="text-gray-400 font-bold">ยังไม่มีประวัติการแจ้งชำระเงินในระบบ</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div className="text-center text-gray-300 font-bold text-xs uppercase tracking-[0.3em] py-8">
                Powered by Rubber Trade AI Engine
            </div>
        </div>
    );
};

export default Subscription;
