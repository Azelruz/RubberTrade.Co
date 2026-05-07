import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Save, Trash2, Database, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    getSettings, 
    updateSettingsAPI, 
    saveReceiptImageToDrive, 
    clearAllCache 
} from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import db from '../../services/db';

export const GeneralSettings = () => {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [logoUrl, setLogoUrl] = useState('');
    
    const { register, handleSubmit, reset } = useForm({
        defaultValues: {
            factoryName: '',
            address: '',
            phone: '',
            pointsPerKg: '10',
            station_code: '',
            format_buy_bill: 'B-{STATION}{YYYY}-{SEQ4}',
            format_sell_bill: 'S-{STATION}{YYYY}-{SEQ4}',
            format_farmer_id: '{STATION}-F-{SEQ4}',
            format_employee_id: '{STATION}-E-{SEQ3}',
            printESlip: true,
            printPaperSlip: true,
            showPrizeDraw: true
        }
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await getSettings();
            if (res.status === 'success' && res.data) {
                // If in God Mode (switchedStoreId present), we should NOT fallback to Admin's local username
                // as that leads to incorrect station codes for tenants.
                const switchedStoreId = localStorage.getItem('rt_active_store_id');
                const defaultStation = (!switchedStoreId && user?.username) ? user.username.substring(0, 3).toUpperCase() : 'RTB';
                
                reset({
                    factoryName: res.data.factoryName || '',
                    address: res.data.address || '',
                    phone: res.data.phone || '',
                    pointsPerKg: res.data.pointsPerKg || '10',
                    lineChannelAccessToken: res.data.lineChannelAccessToken || '',
                    lineChannelSecret: res.data.lineChannelSecret || '',
                    lineLiffIdProfile: res.data.lineLiffIdProfile || '',
                    lineLiffIdAddEmployee: res.data.lineLiffIdAddEmployee || '',
                    station_code: res.data.station_code || defaultStation,
                    format_buy_bill: res.data.format_buy_bill || 'B-{STATION}{YYYY}-{SEQ4}',
                    format_sell_bill: res.data.format_sell_bill || 'S-{STATION}{YYYY}-{SEQ4}',
                    format_farmer_id: res.data.format_farmer_id || '{STATION}-F-{SEQ4}',
                    format_employee_id: res.data.format_employee_id || '{STATION}-E-{SEQ3}',
                    printESlip: res.data.printESlip === undefined ? true : (res.data.printESlip === 'true' || res.data.printESlip === true),
                    printPaperSlip: res.data.printPaperSlip === undefined ? true : (res.data.printPaperSlip === 'true' || res.data.printPaperSlip === true),
                    showPrizeDraw: res.data.showPrizeDraw === undefined ? true : (res.data.showPrizeDraw === 'true' || res.data.showPrizeDraw === true)
                });
                setLogoUrl(res.data.logoUrl || res.data.logo_url || '');
            }
        } catch (error) {
            toast.error('โหลดข้อมูลความผิดพลาด');
        }
    };

    const onSubmit = async (data) => {
        setSaving(true);
        try {
            const payload = {
                ...data,
                logoUrl: logoUrl
            };
            const res = await updateSettingsAPI(payload);
            if (res.status === 'success') {
                toast.success('บันทึกการตั้งค่าสำเร็จ');
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error('บันทึกล้มเหลว: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 2MB)');
            return;
        }

        const toastId = toast.loading('กำลังอัปโหลดโลโก้...');
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result;
                const filename = `logo_${Date.now()}.${file.name.split('.').pop()}`;
                const res = await saveReceiptImageToDrive(base64, filename);
                if (res.status === 'success') {
                    setLogoUrl(res.url);
                    toast.success('อัปโหลดโลโก้สำเร็จ', { id: toastId });
                } else {
                    toast.error('อัปโหลดล้มเหลว: ' + res.message, { id: toastId });
                }
            };
        } catch (error) {
            toast.error('เกิดข้อผิดพลาดในการอัปโหลด', { id: toastId });
        }
    };

    const onResetDB = async () => {
        if (!window.confirm('คำเตือน: นี่คือการล้างข้อมูล "ในเครื่องนี้เท่านั้น" \n- ข้อมูลที่ซิงค์ไปแล้วจะไม่หาย \n- ข้อมูลที่ค้างในคิวซิงค์ (Offline) จะหายทั้งหมด \nคุณแน่ใจหรือไม่ว่าต้องการดำเนินการ?')) {
            return;
        }

        const toastId = toast.loading('กำลังล้างฐานข้อมูลเครื่อง...');
        try {
            await db.delete();
            await db.open();
            clearAllCache();
            toast.success('ล้างข้อมูลสำเร็จ ระบบจะเริ่มใหม่ใน 2 วินาที', { id: toastId });
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (err) {
            toast.error('เกิดข้อผิดพลาด: ' + err.message, { id: toastId });
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                
                {/* Section 1: Store Identity */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center space-x-3">
                        <Building2 className="text-rubber-600" size={16} />
                        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Store Profile</h3>
                    </div>
                    <div className="p-5">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Logo Upload Column */}
                            <div className="lg:col-span-3 flex flex-col items-center">
                                <div className="relative group">
                                    <div className="w-32 h-32 bg-white rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center shadow-inner transition-all group-hover:border-rubber-300">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <div className="text-center p-2">
                                                <Building2 className="mx-auto text-gray-200 mb-1" size={32} />
                                                <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">No Logo</span>
                                            </div>
                                        )}
                                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                                            <Building2 size={18} className="mb-0.5" />
                                            <span className="text-[8px] font-black uppercase tracking-widest">{logoUrl ? 'เปลี่ยน' : 'อัปโหลด'}</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                        </label>
                                    </div>
                                    {logoUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setLogoUrl('')}
                                            className="absolute -top-2 -right-2 p-1.5 bg-white text-red-500 rounded-full shadow-lg border border-red-50 hover:bg-red-50 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Info Details Column */}
                            <div className="lg:col-span-9 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-[9px] font-black text-rubber-600 uppercase tracking-widest ml-1">ชื่อร้าน / ชื่อโรงงาน <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            {...register('factoryName', { required: true })}
                                            className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500 focus:bg-white transition-all font-bold text-gray-800 text-sm"
                                            placeholder="... รับซื้อยางพาราไทย"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์ติดต่อ</label>
                                        <input
                                            type="tel"
                                            {...register('phone')}
                                            className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500 focus:bg-white transition-all font-bold text-gray-800 text-sm"
                                            placeholder="08x-xxx-xxxx"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">รหัสสถานี (Station Code)</label>
                                        <input
                                            type="text"
                                            {...register('station_code')}
                                            className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500 focus:bg-white transition-all font-mono font-bold text-gray-800 text-sm"
                                            placeholder="RTB"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">ที่อยู่สำหรับการออกใบเสร็จ</label>
                                        <textarea
                                            {...register('address')}
                                            className="w-full px-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500 focus:bg-white transition-all font-medium text-gray-700 h-16 text-xs"
                                            placeholder="ระบุที่ตั้ง"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    
                    {/* Section 2: Running Number Config */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center space-x-3">
                            <Database className="text-blue-600" size={16} />
                            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Formats</h3>
                        </div>
                        <div className="p-5 flex-1 space-y-4">
                            <div className="grid grid-cols-1 gap-3.5">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">บิลซื้อ (Buy Bill)</label>
                                    <input type="text" {...register('format_buy_bill')} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg font-mono text-[10px] font-bold text-blue-700" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">บิลขาย (Sell Bill)</label>
                                    <input type="text" {...register('format_sell_bill')} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg font-mono text-[10px] font-bold text-blue-700" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">เกษตรกร</label>
                                        <input type="text" {...register('format_farmer_id')} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg font-mono text-[10px] font-bold text-gray-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">ลูกจ้าง</label>
                                        <input type="text" {...register('format_employee_id')} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg font-mono text-[10px] font-bold text-gray-600" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
                                    <span>{'{STATION}'}=สาขา</span>
                                    <span>{'{SEQn}'}=รันนิ่ง</span>
                                    <span>{'{YYYY}'}=ปี</span>
                                    <span>{'{MM}'}=เดือน</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Operations & Features */}
                    <div className="space-y-5">
                        {/* Points Settings */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 bg-amber-50/50 border-b border-amber-100 flex items-center space-x-3">
                                <Building2 className="text-amber-600" size={16} />
                                <h3 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Points</h3>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <label className="text-[10px] font-bold text-gray-600">กก. ละ 1 คะแนน</label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="number"
                                            {...register('pointsPerKg')}
                                            className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-black text-rubber-600 shadow-sm text-xs"
                                        />
                                        <span className="text-[9px] font-bold text-gray-400">Kg/Pt</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Toggles Group */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
                            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest text-center">Settings</h3>
                            </div>
                            <div className="p-2.5 space-y-1">
                                <label className="flex items-center justify-between p-2.5 bg-white border border-gray-50 rounded-xl hover:bg-gray-50/50 transition-colors cursor-pointer group">
                                    <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-900">พิมพ์ Paper-Slip</span>
                                    <input type="checkbox" {...register('printPaperSlip')} className="w-4 h-4 rounded-md border-gray-300 text-rubber-600" />
                                </label>
                                <label className="flex items-center justify-between p-2.5 bg-white border border-gray-50 rounded-xl hover:bg-gray-50/50 transition-colors cursor-pointer group">
                                    <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-900">สร้าง E-Slip</span>
                                    <input type="checkbox" {...register('printESlip')} className="w-4 h-4 rounded-md border-gray-300 text-rubber-600" />
                                </label>
                                <label className="flex items-center justify-between p-2.5 bg-white border border-gray-50 rounded-xl hover:bg-gray-50/50 transition-colors cursor-pointer group">
                                    <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-900">Lucky Draw</span>
                                    <input type="checkbox" {...register('showPrizeDraw')} className="w-4 h-4 rounded-md border-gray-300 text-rubber-600" />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Footer */}
                <div className="flex justify-center pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-black text-white rounded-full px-10 py-3 font-black uppercase tracking-widest text-[10px] hover:bg-gray-900 shadow-xl transition-all active:scale-95 flex items-center space-x-2"
                    >
                        {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                        <span>{saving ? 'Saving...' : 'บันทึกข้อมูลร้าน'}</span>
                    </button>
                </div>

                {/* Maintenance Section (Danger Zone) */}
                <div className="mt-10 pt-6 border-t border-dashed border-gray-200">
                    <div className="max-w-md mx-auto">
                        <div className="bg-red-50/30 rounded-2xl border border-red-100 p-5 flex flex-col items-center text-center">
                            <h4 className="text-[9px] font-black text-red-800 uppercase tracking-widest mb-1.5 flex items-center">
                                <AlertTriangle size={12} className="mr-1.5" /> Maintenance
                            </h4>
                            <p className="text-[9px] text-gray-500 font-medium leading-relaxed mb-4">ล้างฐานข้อมูลในเครื่องเพื่อแก้ปัญหาการแสดงผล</p>
                            <button
                                type="button"
                                onClick={onResetDB}
                                className="px-5 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm"
                            >
                                <Trash2 size={12} className="mr-1.5 inline" /> Reset Local DB
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};
