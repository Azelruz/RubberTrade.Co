import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { 
    DollarSign, Save, RefreshCw, Info, ChevronRight, Trash2, 
    Leaf, X, ExternalLink, Image as ImageIcon, CheckCircle2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    fetchDailyPrice, 
    updateDailyPriceAPI, 
    getSettings, 
    updateSettingsAPI,
    saveReceiptImageToDrive,
    broadcastPrice 
} from '../../services/apiService';

export const PriceSettings = () => {
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [dailyPriceObj, setDailyPriceObj] = useState({ price: 0, cup_lump_price: 0, date: '' });
    const [drcBonuses, setDrcBonuses] = useState([]);
    const [fscBonus, setFscBonus] = useState(0);
    const [notifyPriceLine, setNotifyPriceLine] = useState(false);
    const [shopInfo, setShopInfo] = useState({ factoryName: '', phone: '' });

    // Broadcast logic states
    const [previewImage, setPreviewImage] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const priceCardRef = useRef(null);

    const priceForm = useForm({
        defaultValues: {
            dailyPrice: 0,
            cupLumpPrice: 0
        }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch daily price
            const priceRes = await fetchDailyPrice();
            if (priceRes.status === 'success' && priceRes.data) {
                setDailyPriceObj(priceRes.data);
                // Update form dailyPrice
                priceForm.setValue('dailyPrice', priceRes.data.price);
            }

            // Fetch bonuses and shop info from settings
            const settingsRes = await getSettings();
            if (settingsRes.status === 'success' && settingsRes.data) {
                // Populate cupLumpPrice from settings
                priceForm.setValue('cupLumpPrice', settingsRes.data.cupLumpPrice || 0);
                
                // Safely parse DRC Bonuses (stored as JSON string)
                let parsedBonuses = [];
                try {
                    if (settingsRes.data.drcBonuses) {
                        const raw = settingsRes.data.drcBonuses;
                        if (raw === '[object Object]') {
                            parsedBonuses = [];
                        } else {
                            parsedBonuses = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse drcBonuses:', e, 'Raw value:', settingsRes.data.drcBonuses);
                    parsedBonuses = []; // Fallback to empty array
                }
                
                setDrcBonuses(Array.isArray(parsedBonuses) ? parsedBonuses : []);
                setFscBonus(settingsRes.data.fscBonus || 0);
                setShopInfo({
                    factoryName: settingsRes.data.factoryName || '',
                    phone: settingsRes.data.phone || ''
                });
            }
        } catch (error) {
            toast.error('โหลดข้อมูลล้มเหลว: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const onSubmitDailyPrice = async (data) => {
        setSaving(true);
        try {
            // 1. Update Daily Price
            const res = await updateDailyPriceAPI(data.dailyPrice);
            
            // 2. Update Settings (Cup Lump Price AND FSC Bonus)
            // We save both to ensure parity if user edited either on the left side
            await updateSettingsAPI({ 
                cupLumpPrice: data.cupLumpPrice,
                fscBonus: fscBonus 
            });

            if (res.status === 'success') {
                toast.success('อัปเดตราคาสินค้าและเงื่อนไขสำเร็จ');
                if (notifyPriceLine) {
                    await handleLinePriceBroadCast();
                } else {
                    loadData();
                }
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
                    loadData();
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

    const handleSaveDrcBonuses = async () => {
        setSaving(true);
        try {
            const payload = {
                drcBonuses: drcBonuses.filter(b => b.drc && b.bonus),
                fscBonus: fscBonus
            };
            const res = await updateSettingsAPI(payload);
            if (res.status === 'success') {
                toast.success('บันทึกเงื่อนไขโบนัสสำเร็จ');
                loadData();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error('บันทึกล้มเหลว');
        } finally {
            setSaving(false);
        }
    };

    const handleAddDrcBonus = () => setDrcBonuses([...drcBonuses, { drc: '', bonus: '' }]);
    const handleRemoveDrcBonus = (idx) => {
        const nb = [...drcBonuses];
        nb.splice(idx, 1);
        setDrcBonuses(nb);
    };
    const handleDrcBonusChange = (idx, f, v) => {
        const nb = [...drcBonuses];
        nb[idx][f] = v;
        setDrcBonuses(nb);
    };

    return (
        <div className="max-w-4xl">
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
                                <h1 className="text-2xl font-black text-gray-900 leading-none uppercase tracking-tight">{shopInfo.factoryName || 'PURE LATEX'}</h1>
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
                                    <span className="text-[170px] font-black text-gray-900 leading-[1] tracking-tighter">{priceForm.watch('dailyPrice')}</span>
                                </div>
                                <div className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 px-14 py-6 bg-[#508510] text-white rounded-3xl text-2xl font-black shadow-2xl shadow-green-200 uppercase tracking-[0.15em] whitespace-nowrap border-4 border-white">บาท / กิโลกรัม</div>
                            </div>
                        </div>
                        <div className="mt-16 w-full pt-10 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
                            <div className="flex items-center space-x-4 opacity-70">
                                <div className="text-left"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5 font-mono">Verified System</p><p className="text-xs font-black text-gray-800 tracking-tight uppercase">pure rubber latex center</p></div>
                            </div>
                            <div className="bg-rubber-50 px-5 py-3 rounded-2xl border border-rubber-100 flex items-center space-x-3"><span className="text-sm font-black text-rubber-700 tracking-tighter">{shopInfo.phone || '08x-xxx-xxxx'}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreviewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-md">
                    <div className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center">
                                <ImageIcon size={18} className="mr-2 text-rubber-600" />
                                ตัวอย่างประกาศราคา
                            </h3>
                            <button onClick={() => setShowPreviewModal(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-4 bg-gray-100">
                            {previewImage && (
                                <div className="rounded-2xl overflow-hidden border-2 border-white shadow-lg mx-auto aspect-[3/4] relative">
                                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-lg flex items-center">
                                        <CheckCircle2 size={12} className="mr-1" /> HD Rendered
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 space-y-3">
                            <p className="text-xs text-gray-500 text-center px-4">รูปภาพนี้จะถูกอัปโหลดขึ้น Google Drive และส่งไปยังสมาชิกทุกคนทาง LINE OA</p>
                            <button
                                onClick={handleConfirmBroadcast}
                                disabled={isBroadcasting}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-green-200 transition-all flex items-center justify-center space-x-2"
                            >
                                {isBroadcasting ? (
                                    <>
                                        <RefreshCw size={20} className="animate-spin" />
                                        <span>กำลังส่งประกาศ...</span>
                                    </>
                                ) : (
                                    <>
                                        <ExternalLink size={20} />
                                        <span>ยืนยันส่งประกาศทาง LINE</span>
                                    </>
                                )}
                            </button>
                            <button 
                                onClick={() => setShowPreviewModal(false)}
                                className="w-full py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all"
                            >
                                แก้ไขข้อมูลใหม่
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-4 space-y-4">
                    <form onSubmit={priceForm.handleSubmit(onSubmitDailyPrice)} className="space-y-4">
                        <div className="bg-white border border-gray-100 rounded-[24px] p-5 shadow-xl shadow-gray-100/50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-rubber-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
                            
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ราคาน้ำยางสดวันนี้ (บาท/กก.)</label>
                            <div className="relative mb-4">
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-3xl font-black text-rubber-200">฿</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...priceForm.register('dailyPrice', { required: true })}
                                    className="w-full text-5xl font-black text-rubber-700 pl-8 pr-4 py-2 focus:outline-none transition-all placeholder:text-gray-100"
                                    placeholder="0.00"
                                />
                            </div>

                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ราคายางก้อนถ้วย (บาท/กก.)</label>
                            <div className="relative mb-6">
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl font-black text-amber-200">฿</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...priceForm.register('cupLumpPrice')}
                                    className="w-full text-3xl font-black text-amber-700 pl-6 pr-4 py-1 focus:outline-none transition-all placeholder:text-gray-100"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 mb-4 group cursor-pointer" onClick={() => setNotifyPriceLine(!notifyPriceLine)}>
                                <label className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input 
                                            type="checkbox" 
                                            className="sr-only" 
                                            checked={notifyPriceLine}
                                            onChange={(e) => setNotifyPriceLine(e.target.checked)}
                                        />
                                        <div className={`block w-10 h-6 rounded-full transition-all duration-300 ${notifyPriceLine ? 'bg-green-500 shadow-lg shadow-green-100' : 'bg-gray-200'}`}></div>
                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${notifyPriceLine ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <div className="ml-3">
                                        <div className={`text-xs font-black transition-colors ${notifyPriceLine ? 'text-green-700' : 'text-gray-500'}`}>
                                            ประกาศทาง LINE
                                        </div>
                                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Broadcast to everyone</div>
                                    </div>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-rubber-600 text-white rounded-xl px-4 py-3.5 font-black text-base hover:bg-rubber-700 shadow-xl shadow-rubber-200 transition-all flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-50"
                            >
                                <Save size={20} />
                                <span>{saving ? 'กำลังบันทึก...' : 'อัปเดตราคาและประกาศ'}</span>
                            </button>
                        </div>
                    </form>

                    <div className="bg-amber-50/50 border border-amber-100 rounded-[24px] p-5">
                        <h3 className="font-black text-amber-800 flex items-center mb-3 text-[11px] uppercase tracking-widest">
                            <Info size={14} className="mr-2" />
                            โบนัสสมาชิก FSC
                        </h3>
                        <div className="relative mb-2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-amber-300">฿</span>
                            <input
                                type="number"
                                step="0.1"
                                value={fscBonus}
                                onChange={(e) => setFscBonus(e.target.value)}
                                className="w-full text-2xl font-black text-amber-600 pl-8 pr-4 py-2 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                placeholder="1.0"
                            />
                            <span className="absolute right-3 bottom-2 text-gray-400 font-bold text-[9px]">บาท/กก.</span>
                        </div>
                        <p className="text-[9px] text-amber-600/70 font-bold text-center mt-1 px-2 leading-relaxed italic">
                            ระบบจะเพิ่มโบนัสนี้ให้โดยอัตโนมัติ<br />สำหรับเกษตรกรที่มีรหัส FSC
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-[24px] p-5 shadow-sm h-full">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-black text-blue-900 flex items-center text-base">
                                    โบนัสตามคุณภาพ %DRC
                                </h3>
                                <p className="text-[10px] text-blue-600/60 font-bold uppercase tracking-wider">Custom Thresholds</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddDrcBonus}
                                className="bg-white text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm border border-blue-100 hover:bg-white transition-all hover:scale-105 active:scale-95 flex items-center"
                            >
                                <span className="mr-1 text-base leading-none">+</span> เพิ่มเงื่อนไข
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                            <div className="grid grid-cols-12 gap-2 text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1 px-3 text-center">
                                <div className="col-span-1"></div>
                                <div className="col-span-5">เริ่มที่ %DRC</div>
                                <div className="col-span-4">โบนัส (+บาท)</div>
                                <div className="col-span-2"></div>
                            </div>

                            {drcBonuses.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center bg-white p-3 rounded-xl border border-blue-50 shadow-sm animate-in fade-in slide-in-from-right-2">
                                    <div className="col-span-1 flex justify-center text-blue-200">
                                        <ChevronRight size={14} />
                                    </div>
                                    <div className="col-span-5">
                                        <div className="relative group">
                                            <input 
                                                type="number" 
                                                value={item.drc} 
                                                onChange={(e) => handleDrcBonusChange(index, 'drc', e.target.value)}
                                                className="w-full text-center py-2 px-2 border-2 border-transparent bg-gray-50 rounded-lg focus:border-blue-500 focus:bg-white focus:outline-none text-lg font-black text-gray-700 transition-all"
                                                placeholder="31"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-300 group-focus-within:text-blue-400">%</span>
                                        </div>
                                    </div>
                                    <div className="col-span-4">
                                        <div className="relative group">
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={item.bonus} 
                                                onChange={(e) => handleDrcBonusChange(index, 'bonus', e.target.value)}
                                                className="w-full text-center py-2 px-2 border-2 border-transparent bg-blue-100/30 rounded-lg focus:border-blue-500 focus:bg-white focus:outline-none text-lg font-black text-blue-600 transition-all"
                                                placeholder="1.0"
                                            />
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-300 group-focus-within:text-blue-500">฿</span>
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveDrcBonus(index)}
                                            className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {drcBonuses.length === 0 && (
                                <div className="text-center py-8 bg-white/50 rounded-2xl border border-dashed border-blue-200">
                                    <p className="text-gray-400 font-bold mb-1 text-xs">ยังไม่มีการตั้งค่าโบนัส DRC</p>
                                    <button onClick={handleAddDrcBonus} className="text-[9px] text-blue-500 font-black uppercase tracking-widest hover:underline">+ คลิกเพื่อเพิ่ม</button>
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={handleSaveDrcBonuses}
                                disabled={saving}
                                className="w-full bg-blue-600 text-white rounded-xl px-4 py-3 font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                            >
                                <Save size={18} />
                                <span>{saving ? 'กำลังบันทึก...' : 'บันทึกเงื่อนไขทั้งหมด'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
