import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Settings as SettingsIcon, Save, Link, Building2, UserCircle, Leaf, Users, Trash2, DollarSign, RefreshCw, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

// API Services
import {
    getScriptUrl,
    updateScriptUrl,
    getSettings,
    updateSettingsAPI,
    setupSheets,
    fetchFarmers,
    addFarmer,
    fetchEmployees,
    addEmployee,
    fetchStaff,
    addStaff,
    deleteRecord,
    fetchDailyPrice,
    updateDailyPriceAPI,
    clearCache,
    saveReceiptImageToDrive,
    broadcastPrice,
    updateRecord,
    fetchFactories,
    addFactory,
    fetchTrucks,
    addTruck
} from '../services/apiService';

// Sub-components
import { GeneralSettings } from './settings/GeneralSettings';
import { PriceSettings } from './settings/PriceSettings';
import { UserManagement } from './settings/UserManagement';
import { LineIntegration } from './settings/LineIntegration';
import { StaffManagement } from './settings/StaffManagement';
import { FactoryManagement } from './settings/FactoryManagement';
import { TruckManagement } from './settings/TruckManagement';
import { ChemicalManagement } from './settings/ChemicalManagement';

export const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general'); // general, price, farmers_employees, staff, line_integration
    const [dailyPriceObj, setDailyPriceObj] = useState({ price: '50', date: '' });
    const [drcBonuses, setDrcBonuses] = useState([]);
    const [fscBonus, setFscBonus] = useState('1');
    const [lineLogs, setLineLogs] = useState({ lastEvent: '', lastError: '', lastStatus: '' });
    const [notifyPriceLine, setNotifyPriceLine] = useState(true);
    const [previewImage, setPreviewImage] = useState(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const priceCardRef = useRef(null);

    // Farmers & Employees State
    const [farmers, setFarmers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [showFarmerForm, setShowFarmerForm] = useState(false);
    const [editingFarmer, setEditingFarmer] = useState(null);
    const [showEmployeeForm, setShowEmployeeForm] = useState(false);

    // Staff State
    const [staffList, setStaffList] = useState([]);
    const [showStaffForm, setShowStaffForm] = useState(false);

    // Factory State
    const [factories, setFactories] = useState([]);
    const [showFactoryForm, setShowFactoryForm] = useState(false);
    const [editingFactory, setEditingFactory] = useState(null);

    // Truck State
    const [trucks, setTrucks] = useState([]);
    const [showTruckForm, setShowTruckForm] = useState(false);
    const [editingTruck, setEditingTruck] = useState(null);

    const { register, handleSubmit, reset, setValue, watch } = useForm({
        defaultValues: {
            factoryName: '',
            address: '',
            phone: '',
            lineChannelAccessToken: '',
            lineChannelSecret: '',
            scriptUrl: getScriptUrl() || '',
            printESlip: true,
            printPaperSlip: true
        }
    });

    // Separate forms
    const priceForm = useForm();
    const farmerForm = useForm();
    const employeeForm = useForm();
    const staffForm = useForm();

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'general') {
                const res = await getSettings();
                if (res.status === 'success' && res.data) {
                    reset({
                        factoryName: res.data.factoryName || '',
                        address: res.data.address || '',
                        phone: res.data.phone || '',
                        pointsPerKg: res.data.pointsPerKg || '10',
                        lineChannelAccessToken: res.data.lineChannelAccessToken || '',
                        lineChannelSecret: res.data.lineChannelSecret || '',
                        station_code: res.data.station_code || '0335',
                        format_buy_bill: res.data.format_buy_bill || 'B-{STATION}{YYYY}-{SEQ4}',
                        format_sell_bill: res.data.format_sell_bill || 'S-{STATION}{YYYY}-{SEQ4}',
                        format_farmer_id: res.data.format_farmer_id || 'F-{SEQ4}',
                        format_employee_id: res.data.format_employee_id || 'E-{SEQ3}',
                        printESlip: res.data.printESlip === undefined ? true : (res.data.printESlip === 'true' || res.data.printESlip === true),
                        printPaperSlip: res.data.printPaperSlip === undefined ? true : (res.data.printPaperSlip === 'true' || res.data.printPaperSlip === true)
                    });

                    setLogoUrl(res.data.logoUrl || '');
                }
            } else if (activeTab === 'price') {
                const [priceRes, settingsRes] = await Promise.all([
                    fetchDailyPrice(),
                    getSettings()
                ]);
                if (priceRes.status === 'success') {
                    setDailyPriceObj(priceRes.data);
                    priceForm.setValue('dailyPrice', priceRes.data.price);
                }
                if (settingsRes.status === 'success' && settingsRes.data) {
                    if (settingsRes.data.drcBonuses) {
                        try {
                            setDrcBonuses(JSON.parse(settingsRes.data.drcBonuses));
                        } catch (e) {
                            setDrcBonuses(getDefaultDrcBonuses());
                        }
                    } else {
                        setDrcBonuses(getDefaultDrcBonuses());
                    }
                    setFscBonus(settingsRes.data.fsc_bonus || '1');
                }
            } else if (activeTab === 'farmers_employees') {
                clearCache('farmers', 'employees');
                const [fData, eData] = await Promise.all([
                    fetchFarmers(),
                    fetchEmployees()
                ]);
                setFarmers(fData || []);
                setEmployees(eData || []);
            } else if (activeTab === 'line_integration') {
                const res = await getSettings();
                if (res.status === 'success' && res.data) {
                    setValue('lineChannelAccessToken', res.data.lineChannelAccessToken || '');
                    setValue('lineChannelSecret', res.data.lineChannelSecret || '');
                    setLineLogs({
                        lastEvent: res.data.lineLastEvent || 'ยังไม่มีความเคลื่อนไหวที่ได้รับ',
                        lastError: res.data.lineLastError || 'ไม่มีข้อผิดพลาด',
                        lastStatus: res.data.lineLastStatus || 'รอการเชื่อมต่อ'
                    });
                }
            } else if (activeTab === 'staff') {
                const sData = await fetchStaff();
                setStaffList(sData || []);
            } else if (activeTab === 'factories') {
                const fData = await fetchFactories();
                setFactories(fData || []);
            } else if (activeTab === 'trucks') {
                const tData = await fetchTrucks();
                setTrucks(tData || []);
            }
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว');
        } finally {
            setLoading(false);
        }
    };

    const getDefaultDrcBonuses = () => ([
        { drc: '31', bonus: '1' },
        { drc: '32', bonus: '2' },
        { drc: '33', bonus: '3' },
        { drc: '34', bonus: '4' },
        { drc: '35', bonus: '5' },
        { drc: '40', bonus: '10' }
    ]);

    const onSubmitGeneral = async (data) => {
        setSaving(true);
        try {
            const payload = {
                factoryName: data.factoryName,
                address: data.address,
                phone: data.phone,
                pointsPerKg: data.pointsPerKg,
                lineChannelAccessToken: data.lineChannelAccessToken,
                lineChannelSecret: data.lineChannelSecret,
                station_code: data.station_code,
                format_buy_bill: data.format_buy_bill,
                format_sell_bill: data.format_sell_bill,
                format_farmer_id: data.format_farmer_id,
                format_employee_id: data.format_employee_id,
                printESlip: data.printESlip,
                printPaperSlip: data.printPaperSlip,
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

    const onSubmitDailyPrice = async (data) => {
        setSaving(true);
        try {
            const res = await updateDailyPriceAPI(data.dailyPrice);
            if (res.status === 'success') {
                toast.success('อัปเดตราคากลางประจำวันสำเร็จ');
                if (notifyPriceLine) {
                    await handleLinePriceBroadCast();
                }
                loadData();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error('บันทึกล้มเหลว: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleLinePriceBroadCast = async () => {
        const toastId = toast.loading('กำลังเตรียมรูปภาพประกาศราคา...');
        try {
            const cardEl = priceCardRef.current;
            if (cardEl) {
                if (!window.html2canvas) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }
                cardEl.style.display = 'block';
                cardEl.style.visibility = 'visible';
                cardEl.style.position = 'fixed';
                cardEl.style.left = '0';
                cardEl.style.top = '0';
                cardEl.style.zIndex = '9999';

                await new Promise(r => setTimeout(r, 800));

                const cardContent = cardEl.querySelector('.capture-target');
                const canvas = await window.html2canvas(cardContent, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#fdfdfb',
                    width: 600,
                    height: 800,
                    logging: false
                });

                cardEl.style.display = 'none';
                cardEl.style.visibility = 'hidden';

                const base64Image = canvas.toDataURL('image/png');
                setPreviewImage(base64Image);
                setShowPreviewModal(true);
                toast.dismiss(toastId);
            }
        } catch (broadcastErr) {
            console.error('[Preview Error]', broadcastErr);
            toast.error('เกิดข้อผิดพลาดในการสร้างรูปตัวอย่าง', { id: toastId });
        }
    };

    const handleConfirmBroadcast = async () => {
        if (!previewImage) return;
        setIsBroadcasting(true);
        const toastId = toast.loading('กำลังแจ้งเตือนราคากลางใหม่ทาง LINE...');
        try {
            const filename = `PriceUpdate_${new Date().toISOString().split('T')[0]}.png`;
            const uploadRes = await saveReceiptImageToDrive(previewImage, filename);
            if (uploadRes.status === 'success') {
                const broadcastRes = await broadcastPrice(priceForm.getValues('dailyPrice'), uploadRes.url);
                if (broadcastRes.status === 'success') {
                    toast.success('แจ้งเตือนราคากลางทาง LINE เรียบร้อยแล้ว', { id: toastId });
                    setShowPreviewModal(false);
                    setPreviewImage(null);
                } else {
                    toast.error('การแจ้งเตือน LINE ล้มเหลว: ' + broadcastRes.message, { id: toastId });
                }
            } else {
                toast.error('อัปโหลดรูปราคาล้มเหลว', { id: toastId });
            }
        } catch (error) {
            toast.error('ส่งแจ้งเตือนล้มเหลว: ' + error.message, { id: toastId });
        } finally {
            setIsBroadcasting(false);
        }
    };

    const onSubmitFarmer = async (data) => {
        setSaving(true);
        try {
            let res;
            if (editingFarmer) {
                res = await updateRecord('farmers', editingFarmer.id, data);
                if (res.status === 'success') {
                    toast.success('แก้ไขข้อมูลเกษตรกรสำเร็จ');
                    setEditingFarmer(null);
                    farmerForm.reset();
                    setShowFarmerForm(false);
                    loadData();
                }
            } else {
                res = await addFarmer(data);
                if (res.status === 'success') {
                    toast.success('เพิ่มข้อมูลเกษตรกรสำเร็จ');
                    farmerForm.reset();
                    setShowFarmerForm(false);
                    loadData();
                }
            }
        } catch (err) {
            toast.error(editingFarmer ? 'แก้ไขข้อมูลล้มเหลว' : 'บันทึกล้มเหลว');
        } finally {
            setSaving(false);
        }
    };

    const onAddEmployee = async (data) => {
        setSaving(true);
        try {
            const res = await addEmployee(data);
            if (res.status === 'success') {
                toast.success('เพิ่มข้อมูลลูกจ้างสำเร็จ');
                employeeForm.reset();
                setShowEmployeeForm(false);
                loadData();
            }
        } catch (err) {
            toast.error('บันทึกล้มเหลว');
        } finally {
            setSaving(false);
        }
    };

    const onAddStaff = async (data) => {
        setSaving(true);
        try {
            const res = await addStaff(data);
            if (res.status === 'success') {
                toast.success('เพิ่มพนักงานสำเร็จ');
                staffForm.reset();
                setShowStaffForm(false);
                loadData();
            } else {
                toast.error(res.message || 'บันทึกล้มเหลว');
            }
        } catch (err) {
            toast.error('บันทึกล้มเหลว: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const onSubmitFactory = async (data) => {
        setSaving(true);
        try {
            const payload = {
                ...data,
                id: editingFactory?.id || 'fac_' + Date.now()
            };
            const res = await addFactory(payload);
            if (res.status === 'success') {
                toast.success(editingFactory ? 'แก้ไขข้อมูลโรงงานสำเร็จ' : 'เพิ่มโรงงานสำเร็จ');
                setShowFactoryForm(false);
                setEditingFactory(null);
                loadData();
            }
        } catch (err) {
            toast.error('บันทึกล้มเหลว');
        } finally {
            setSaving(false);
        }
    };

    const onSubmitTruck = async (data) => {
        setSaving(true);
        try {
            const payload = {
                ...data,
                id: editingTruck?.id || 'truck_' + Date.now()
            };
            const res = await addTruck(payload);
            if (res.status === 'success') {
                toast.success(editingTruck ? 'แก้ไขข้อมูลรถสำเร็จ' : 'เพิ่มรถส่งน้ำยางสำเร็จ');
                setShowTruckForm(false);
                setEditingTruck(null);
                loadData();
            }
        } catch (err) {
            toast.error('บันทึกล้มเหลว');
        } finally {
            setSaving(false);
        }
    };

    const handleEditTruck = (t) => {
        setEditingTruck(t);
        setShowTruckForm(true);
    };

    const handleDelete = async (sheetName, id) => {
        if (!window.confirm('ยืนยันการลบข้อมูล?')) return;
        try {
            const res = await deleteRecord(sheetName, id);
            if (res.status === 'success') {
                toast.success('ลบข้อมูลสำเร็จ');
                loadData();
            }
        } catch (err) {
            toast.error('ลบล้มเหลว');
        }
    };

    const handleEditFarmer = (farmer) => {
        setEditingFarmer(farmer);
        setShowFarmerForm(true);
        farmerForm.reset({
            name: farmer.name,
            phone: farmer.phone,
            bankAccount: farmer.bankAccount,
            bankName: farmer.bankName,
            address: farmer.address,
            note: farmer.note,
            fscId: farmer.fscId || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEditFactory = (factory) => {
        setEditingFactory(factory);
        setShowFactoryForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveDrcBonuses = async () => {
        setSaving(true);
        try {
            const sortedBonuses = [...drcBonuses].sort((a, b) => Number(a.drc) - Number(b.drc));
            const res = await updateSettingsAPI({ 
                drcBonuses: JSON.stringify(sortedBonuses),
                fsc_bonus: fscBonus
            });
            if (res.status === 'success') {
                toast.success('อัปเดตเงื่อนไขโบนัสสำเร็จ');
                setDrcBonuses(sortedBonuses);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error('บันทึกล้มเหลว: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading && !saving && (activeTab !== 'farmers_employees' && activeTab !== 'price')) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rubber-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            {/* Price Broadcast Preview Modal */}
            {showPreviewModal && (
                <div className="fixed inset-0 bg-[#0c111d]/90 backdrop-blur-md z-[10000] flex items-center justify-center p-4 md:p-8 overflow-y-auto">
                    <div className="bg-white rounded-[40px] overflow-hidden shadow-2xl max-w-[500px] w-full flex flex-col animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">ตรวจสอบความถูกต้อง</h3>
                                <div className="flex items-center mt-1 text-rubber-600 font-bold uppercase tracking-[0.2em] text-[10px]">
                                    <div className="w-1.5 h-1.5 bg-rubber-500 rounded-full mr-2 animate-pulse"></div>
                                    Live Preview
                                </div>
                            </div>
                            <button onClick={() => setShowPreviewModal(false)} className="p-3 hover:bg-gray-200 rounded-2xl transition-all duration-300">
                                <Trash2 size={24} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="p-8 bg-gray-100/50 flex justify-center">
                            <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-white max-w-full aspect-[3/4]">
                                {previewImage ? (
                                    <img src={previewImage} alt="Price Preview" className="w-full h-auto block" />
                                ) : (
                                    <div className="w-[300px] h-[400px] flex flex-col items-center justify-center text-gray-400">
                                        <RefreshCw className="animate-spin mb-4" size={32} />
                                        <p className="font-bold">กำลังโหลดรูปตัวอย่าง...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-8 flex flex-col space-y-6">
                            <div className="bg-rubber-50 border border-rubber-100 rounded-3xl p-5 flex items-start space-x-4">
                                <div className="p-2 bg-rubber-100 rounded-xl"><RefreshCw className="text-rubber-600" size={20} /></div>
                                <div className="text-sm text-rubber-900">
                                    <p className="font-black text-base mb-1">ยืนยันการประกาศราคา?</p>
                                    <p className="opacity-70 leading-relaxed font-medium">รูปภาพใบนี้จะถูกส่งไปยังเกษตรกรทุกคนที่มีการเชื่อมต่อ LINE เพื่อแจ้งราคาประจำวันนี้</p>
                                </div>
                            </div>
                            <div className="flex space-x-4">
                                <button onClick={() => setShowPreviewModal(false)} className="flex-1 px-6 py-5 rounded-2xl font-black text-gray-500 hover:bg-gray-100 transition-all duration-300">ยกเลิก</button>
                                <button onClick={handleConfirmBroadcast} disabled={isBroadcasting} className="flex-[2] bg-rubber-600 text-white px-6 py-5 rounded-2xl font-black text-xl hover:bg-rubber-700 shadow-xl shadow-rubber-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:translate-y-0">
                                    {isBroadcasting ? <RefreshCw size={24} className="animate-spin" /> : <Save size={24} />}
                                    <span>{isBroadcasting ? 'กำลังส่ง...' : 'ยืนยันและส่ง LINE'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Price Card (Remains for Canvas Capture) */}
            <div style={{ display: 'none', position: 'fixed', left: '-9999px', top: '0', zIndex: 9999 }} ref={priceCardRef}>
                <div className="capture-target relative w-[600px] h-[800px] bg-[#fdfdfb] overflow-hidden flex flex-col font-sans" style={{ width: '600px', height: '800px' }}>
                    <div className="absolute top-0 left-0 w-full h-[320px] bg-[#f4fae9]"></div>
                    <div className="absolute top-[8%] right-[-10%] w-[400px] h-[400px] bg-[#e5f3cc] rounded-full blur-[100px] opacity-60"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#fffaf0] rounded-full blur-[120px] opacity-70"></div>
                    <div className="relative z-10 flex flex-col items-center h-full w-full pt-8 pb-16 px-14 text-center">
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="w-14 h-14 bg-rubber-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-rubber-600/30 transform rotate-6 scale-110">
                                <Leaf size={32} className="text-white" />
                            </div>
                            <div className="text-left">
                                <h1 className="text-2xl font-black text-gray-900 leading-none uppercase tracking-tight">{watch('factoryName') || 'PURE LATEX'}</h1>
                                <p className="text-xs font-black text-rubber-600 uppercase tracking-[0.3em] mt-1.5 opacity-80">Official Market Report</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <p className="text-sm font-black text-rubber-700/50 uppercase tracking-[0.4em] mb-4">Daily Announcement</p>
                            <h2 className="text-[52px] font-black text-gray-900 mb-5 leading-[1.1] tracking-tighter">ประกาศราคา<br /><span className="text-rubber-600">น้ำยางสด</span></h2>
                            <div className="flex items-center justify-center space-x-4">
                                <div className="h-[2px] w-8 bg-rubber-200"></div>
                                <p className="text-xl font-bold text-gray-500 tracking-tight">{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <div className="h-[2px] w-8 bg-rubber-200"></div>
                            </div>
                        </div>
                        <div className="w-full flex-grow flex flex-col pt-4">
                            <div className="relative w-full h-[420px] bg-white rounded-[48px] shadow-[0_30px_70px_rgba(0,0,0,0.06)] border border-gray-100/50 flex flex-col items-center pt-10 px-10">
                                <div className="absolute top-0 right-10 -translate-y-1/2 px-6 py-2 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-200">Updated Now</div>
                                <p className="text-sm font-black text-gray-400 uppercase tracking-[0.4em] mb-4">ราคากลางประจำวัน</p>
                                <div className="flex items-center justify-center -mt-2">
                                    <span className="text-5xl font-black text-amber-600 mr-4 mt-2">฿</span>
                                    <span className="text-[170px] font-black text-gray-900 leading-[1] tracking-tighter">{(priceForm.watch('dailyPrice') || dailyPriceObj.price)}</span>
                                </div>
                                <div className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 px-14 py-6 bg-[#508510] text-white rounded-3xl text-2xl font-black shadow-2xl shadow-green-200 uppercase tracking-[0.15em] whitespace-nowrap border-4 border-white">บาท / กิโลกรัม</div>
                            </div>
                        </div>
                        <div className="mt-16 w-full pt-10 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
                            <div className="flex items-center space-x-4 opacity-70">
                                <div className="text-left"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5 font-mono">Verified System</p><p className="text-xs font-black text-gray-800 tracking-tight uppercase">pure rubber latex center</p></div>
                            </div>
                            <div className="bg-rubber-50 px-5 py-3 rounded-2xl border border-rubber-100 flex items-center space-x-3"><span className="text-sm font-black text-rubber-700 tracking-tighter">{watch('phone') || '08x-xxx-xxxx'}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="print:hidden">
                <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ</h1>
                <p className="text-gray-500">จัดการราคากลาง, ข้อมูลร้าน, และรายชื่อบุคลากร</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-100 overflow-x-auto">
                    {[
                        { id: 'general', icon: <SettingsIcon size={18} />, label: 'ทั่วไป' },
                        { id: 'price', icon: <DollarSign size={18} />, label: 'ราคากลางวันนี้' },
                        { id: 'farmers_employees', icon: <Users size={18} />, label: 'เกษตรกรและลูกจ้าง' },
                        { id: 'staff', icon: <UserCircle size={18} />, label: 'พนักงานประจำ' },
                        { id: 'factories', icon: <Building2 size={18} />, label: 'โรงงานที่ส่งขาย' },
                        { id: 'trucks', icon: <Truck size={18} />, label: 'รถส่งน้ำยาง' },
                        { id: 'chemicals', icon: <span className="text-lg">🧪</span>, label: 'สารเคมี' },
                        { id: 'line_integration', icon: <Link size={18} className="text-green-600" />, label: 'LINE OA' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-none py-4 px-6 text-center font-medium text-sm transition-colors border-b-2 ${activeTab === tab.id ? 'border-rubber-500 text-rubber-600 bg-rubber-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        >
                            <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                                {tab.icon}
                                <span>{tab.label}</span>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="p-6 md:p-8">
                    {activeTab === 'general' && (
                        <GeneralSettings
                            register={register}
                            handleSubmit={handleSubmit}
                            onSubmit={onSubmitGeneral}
                            saving={saving}
                            logoUrl={logoUrl}
                            setLogoUrl={setLogoUrl}
                            handleLogoUpload={handleLogoUpload}
                        />
                    )}

                    {activeTab === 'price' && (
                        <PriceSettings
                            dailyPriceObj={dailyPriceObj}
                            priceForm={priceForm}
                            onSubmitDailyPrice={onSubmitDailyPrice}
                            saving={saving}
                            notifyPriceLine={notifyPriceLine}
                            setNotifyPriceLine={setNotifyPriceLine}
                            drcBonuses={drcBonuses}
                            handleAddDrcBonus={() => setDrcBonuses([...drcBonuses, { drc: '', bonus: '' }])}
                            handleRemoveDrcBonus={(idx) => { const nb = [...drcBonuses]; nb.splice(idx, 1); setDrcBonuses(nb); }}
                            handleDrcBonusChange={(idx, f, v) => { const nb = [...drcBonuses]; nb[idx][f] = v; setDrcBonuses(nb); }}
                            handleSaveDrcBonuses={handleSaveDrcBonuses}
                            fscBonus={fscBonus}
                            setFscBonus={setFscBonus}
                        />
                    )}

                    {activeTab === 'farmers_employees' && (
                        <UserManagement
                            farmers={farmers}
                            employees={employees}
                            loading={loading}
                            saving={saving}
                            loadData={loadData}
                            showFarmerForm={showFarmerForm}
                            setShowFarmerForm={setShowFarmerForm}
                            editingFarmer={editingFarmer}
                            handleCancelFarmerEdit={() => { setEditingFarmer(null); farmerForm.reset(); setShowFarmerForm(false); }}
                            farmerForm={farmerForm}
                            onSubmitFarmer={onSubmitFarmer}
                            handleEditFarmer={handleEditFarmer}
                            handleDelete={handleDelete}
                            showEmployeeForm={showEmployeeForm}
                            setShowEmployeeForm={setShowEmployeeForm}
                            employeeForm={employeeForm}
                            onAddEmployee={onAddEmployee}
                        />
                    )}

                    {activeTab === 'staff' && (
                        <StaffManagement
                            staffList={staffList}
                            loading={loading}
                            saving={saving}
                            showStaffForm={showStaffForm}
                            setShowStaffForm={setShowStaffForm}
                            staffForm={staffForm}
                            onAddStaff={onAddStaff}
                            handleDelete={handleDelete}
                        />
                    )}

                    {activeTab === 'factories' && (
                        <FactoryManagement
                            factories={factories}
                            loading={loading}
                            saving={saving}
                            showForm={showFactoryForm}
                            setShowForm={setShowFactoryForm}
                            editingFactory={editingFactory}
                            setEditingFactory={setEditingFactory}
                            onSubmit={onSubmitFactory}
                            onDelete={handleDelete}
                            onEdit={handleEditFactory}
                        />
                    )}

                    {activeTab === 'trucks' && (
                        <TruckManagement
                            trucks={trucks}
                            loading={loading}
                            saving={saving}
                            showForm={showTruckForm}
                            setShowForm={setShowTruckForm}
                            editingTruck={editingTruck}
                            setEditingTruck={setEditingTruck}
                            onSubmit={onSubmitTruck}
                            onDelete={handleDelete}
                            onEdit={handleEditTruck}
                        />
                    )}

                    {activeTab === 'chemicals' && (
                        <ChemicalManagement />
                    )}

                    {activeTab === 'line_integration' && (
                        <LineIntegration
                            register={register}
                            handleSubmit={handleSubmit}
                            onSubmit={onSubmitGeneral}
                            saving={saving}
                            lineLogs={lineLogs}
                            loadData={loadData}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
