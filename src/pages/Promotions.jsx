import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Gift, Award, Clock, Users, Search, Trash2, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchBuyRecords, fetchFarmers, fetchPromotions, addPromotion, getSettings, deleteRecord, isCached } from '../services/apiService';

export const Promotions = () => {
    const [activeTab, setActiveTab] = useState('points'); // points, history
    const [farmers, setFarmers] = useState([]);
    const [buyRecords, setBuyRecords] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [pointsPerKg, setPointsPerKg] = useState(10); // default 10kg = 1 point
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showRedeemForm, setShowRedeemForm] = useState(false);
    const [selectedFarmerId, setSelectedFarmerId] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const isDemo = false;

    const redeemForm = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd') } });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        if (!isCached('buys', 'farmers')) setLoading(true);
        try {
            const [bRaw, fData, pRaw, sRes] = await Promise.all([
                fetchBuyRecords(),
                fetchFarmers(),
                fetchPromotions(),
                getSettings()
            ]);
            setBuyRecords(Array.isArray(bRaw) ? bRaw : []);
            setFarmers(fData || []);
            setPromotions(Array.isArray(pRaw) ? [...pRaw].reverse() : []);

            if (sRes && sRes.status === 'success' && sRes.data && sRes.data.pointsPerKg) {
                setPointsPerKg(Number(sRes.data.pointsPerKg));
            }
        } catch (e) {
            toast.error('โหลดข้อมูลล้มเหลว: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Points
    const getFarmerPoints = (farmerId) => {
        const farmer = farmers.find(f => String(f.id) === String(farmerId));
        if (!farmer) {
            return { totalWeight: 0, earnedPoints: 0, usedPoints: 0, currentPoints: 0 };
        }

        // 1. Total Weight (fallback to name if farmerId missing from sheet)
        const farmerBuys = buyRecords.filter(r => 
            (r.farmerId && String(r.farmerId) === String(farmerId)) ||
            (r.farmerName && String(r.farmerName).trim() === String(farmer.name).trim())
        );
        const totalWeight = farmerBuys.reduce((sum, r) => sum + Number(r.dryRubber || r.dryWeight || 0), 0);
        
        // 2. Total Earned Points
        const earnedPoints = Math.floor(totalWeight / pointsPerKg);

        // 3. Points Used (fallback to name just in case)
        const farmerPromos = promotions.filter(p => 
            (p.farmerId && String(p.farmerId) === String(farmerId)) ||
            (p.farmerName && String(p.farmerName).trim() === String(farmer.name).trim())
        );
        const usedPoints = farmerPromos.reduce((sum, p) => sum + Number(p.pointsUsed || 0), 0);

        return {
            totalWeight,
            earnedPoints,
            usedPoints,
            currentPoints: Math.max(0, earnedPoints - usedPoints)
        };
    };

    const handleRedeemClick = (farmerId) => {
        setSelectedFarmerId(farmerId);
        redeemForm.setValue('farmerId', farmerId);
        setShowRedeemForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const onRedeem = async (data) => {
        const farmer = farmers.find(f => String(f.id) === String(data.farmerId));
        if (!farmer) {
            toast.error("ไม่พบข้อมูลเกษตรกร");
            return;
        }

        const stats = getFarmerPoints(farmer.id);
        const pointsToUse = Number(data.pointsUsed);

        if (pointsToUse <= 0) {
            toast.error("ระบุคะแนนที่ใช้ให้ถูกต้อง");
            return;
        }
        if (pointsToUse > stats.currentPoints) {
            toast.error(`คะแนนไม่พอ (มีอยู่ ${stats.currentPoints} คะแนน)`);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                date: data.date,
                farmerId: farmer.id,
                farmerName: farmer.name,
                pointsUsed: pointsToUse,
                rewardName: data.rewardName
            };

            if (isDemo) {
                const newRec = { ...payload, id: Date.now().toString(), timestamp: new Date().toISOString() };
                setPromotions(prev => [newRec, ...prev]);
                toast.success('บันทึกสำเร็จ (Demo)');
                setShowRedeemForm(false);
                redeemForm.reset();
                return;
            }

            const res = await addPromotion(payload);
            if (res.status === 'success') {
                toast.success('แลกคะแนนสำเร็จ');
                setShowRedeemForm(false);
                redeemForm.reset();
                loadData();
            } else {
                toast.error(res.message || 'บันทึกล้มเหลว');
            }
        } catch (e) {
            toast.error('บันทึกล้มเหลว: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        const id = confirmDeleteId;
        setConfirmDeleteId(null);
        const toastId = toast.loading('กำลังลบ...');
        try {
            if (isDemo) {
                setPromotions(prev => prev.filter(r => String(r.id) !== String(id)));
                toast.success('ลบสำเร็จ (Demo)', { id: toastId });
                return;
            }
            const res = await deleteRecord('Promotions', id);
            if (res && res.status === 'success') {
                toast.success('ลบสำเร็จ', { id: toastId });
                loadData();
            } else {
                toast.error('ลบล้มเหลว', { id: toastId });
            }
        } catch (e) {
            toast.error('ลบล้มเหลว: ' + e.message, { id: toastId });
        }
    };

    // Filtered data
    const filteredFarmers = farmers.filter(f => 
        (f.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredPromotions = promotions.filter(p =>
        (p.farmerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.rewardName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Confirm Delete Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
                        <div className="flex items-center mb-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                                <Trash2 className="text-red-600" size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">ยกเลิกการแลกของรางวัล?</h3>
                        </div>
                        <p className="text-gray-600 mb-5 text-sm">การลบประวัติจะทำให้คะแนนตีกลับคืนให้เกษตรกร คุณต้องการลบใช่หรือไม่?</p>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setConfirmDeleteId(null)}
                                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">ยกเลิก</button>
                            <button onClick={confirmDelete}
                                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg">ลบรายการ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">โปรโมชั่นและของรางวัล</h1>
                    <p className="text-gray-500">ระบบคะแนนสะสมและแลกของรางวัลสำหรับสมาชิก</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 flex items-center shadow-sm">
                    <Award className="text-yellow-600 mr-2" size={20} />
                    <div>
                        <p className="text-xs text-yellow-700 font-bold uppercase tracking-wider">อัตราแลกคะแนน</p>
                        <p className="text-sm font-black text-yellow-800">{pointsPerKg} กก. (ยางแห้ง) = 1 คะแนน</p>
                    </div>
                </div>
            </div>

            {/* Redeem Form Action Area */}
            {showRedeemForm && (
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 shadow-md animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-yellow-900 flex items-center">
                            <Gift className="mr-2" size={24} /> แลกคะแนน / ของรางวัล
                        </h3>
                        <button onClick={() => setShowRedeemForm(false)} className="text-gray-400 hover:text-gray-600">ปิด</button>
                    </div>
                    
                    <form onSubmit={redeemForm.handleSubmit(onRedeem)} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">วันที่</label>
                            <input type="date" {...redeemForm.register('date', { required: true })}
                                className="w-full px-3 py-2 border border-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none shadow-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1">เลือกเกษตรกร *</label>
                            <select {...redeemForm.register('farmerId', { required: true })}
                                onChange={(e) => setSelectedFarmerId(e.target.value)}
                                className="w-full px-3 py-2 border border-white rounded-lg text-sm bg-white focus:ring-2 focus:ring-yellow-400 focus:outline-none shadow-sm">
                                <option value="">-- เลือกเกษตรกร --</option>
                                {farmers.map(f => (
                                    <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                                ))}
                            </select>
                        </div>
                        {selectedFarmerId && (
                            <div className="bg-white rounded-lg px-3 py-2 border border-yellow-100 shadow-sm flex items-center justify-between">
                                <span className="text-xs text-gray-500">คะแนนคงเหลือ:</span>
                                <span className="font-black text-lg text-green-600">{getFarmerPoints(selectedFarmerId).currentPoints}</span>
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1">รางวัล/โปรโมชั่น ที่ต้องการแลก *</label>
                            <input {...redeemForm.register('rewardName', { required: true })} placeholder="เช่น ปุ๋ย 1 กระสอบ, เสื้อยืด"
                                className="w-full px-3 py-2 border border-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none shadow-sm" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-700 mb-1">คะแนนที่ใช้ *</label>
                            <input type="number" min="1" {...redeemForm.register('pointsUsed', { required: true, min: 1 })} placeholder="จำนวนคะแนน"
                                className="w-full px-3 py-2 border border-white rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none shadow-sm" />
                        </div>
                        <div className="md:col-span-1">
                            <button type="submit" disabled={submitting}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors disabled:opacity-50">
                                ยืนยันการแลก
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex border-b border-gray-100">
                    <button onClick={() => { setActiveTab('points'); setSearchTerm(''); }}
                        className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors border-b-2 ${activeTab === 'points' ? 'border-yellow-500 text-yellow-700 bg-yellow-50/30' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                        <div className="flex items-center justify-center space-x-2">
                            <Users size={18} /><span>คะแนนสะสมรายบุคคล</span>
                        </div>
                    </button>
                    <button onClick={() => { setActiveTab('history'); setSearchTerm(''); }}
                        className={`flex-1 py-4 px-6 text-center font-medium text-sm transition-colors border-b-2 ${activeTab === 'history' ? 'border-yellow-500 text-yellow-700 bg-yellow-50/30' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                        <div className="flex items-center justify-center space-x-2">
                            <Clock size={18} /><span>ประวัติการแลกของรางวัล</span>
                        </div>
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-4 flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full max-w-sm">
                        <Search size={18} className="text-gray-400 mr-2 flex-shrink-0" />
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาชื่อเกษตรกร, ของรางวัล..."
                            className="bg-transparent text-sm w-full focus:outline-none" />
                    </div>

                    {/* POINTS TAB */}
                    {activeTab === 'points' && (
                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-5 py-4 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">รหัส</th>
                                        <th className="px-5 py-4 text-left font-bold text-gray-500 uppercase tracking-wider text-xs">รายชื่อเกษตรกร</th>
                                        <th className="px-5 py-4 text-right font-bold text-gray-500 uppercase tracking-wider text-xs bg-blue-50/50">น้ำหนักยางแห้ง (กก.)</th>
                                        <th className="px-5 py-4 text-right font-bold text-gray-500 uppercase tracking-wider text-xs bg-yellow-50/50">คะแนนที่ได้</th>
                                        <th className="px-5 py-4 text-right font-bold text-gray-500 uppercase tracking-wider text-xs bg-red-50/50">ใช้ไปแล้ว</th>
                                        <th className="px-5 py-4 text-right font-bold text-green-700 uppercase tracking-wider text-xs bg-green-50/50">คงเหลือสุทธิ</th>
                                        <th className="px-5 py-4 text-center font-bold text-gray-500 uppercase tracking-wider text-xs">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan="7" className="px-5 py-10 text-center text-gray-400">กำลังโหลด...</td></tr>
                                    ) : filteredFarmers.length === 0 ? (
                                        <tr><td colSpan="7" className="px-5 py-10 text-center text-gray-400">ไม่พบข้อมูลเกษตรกร</td></tr>
                                    ) : filteredFarmers.map(f => {
                                        const stats = getFarmerPoints(f.id);
                                        return (
                                            <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-5 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">{f.code}</td>
                                                <td className="px-5 py-3 font-semibold text-gray-900">{f.name}</td>
                                                <td className="px-5 py-3 text-right text-gray-600 bg-blue-50/10 border-l border-blue-50/50">{stats.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                                                <td className="px-5 py-3 text-right text-yellow-600 font-bold bg-yellow-50/10 border-l border-yellow-50/50">{stats.earnedPoints.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-right text-red-500 bg-red-50/10 border-l border-red-50/50">{stats.usedPoints > 0 ? `-${stats.usedPoints.toLocaleString()}` : '0'}</td>
                                                <td className="px-5 py-3 text-right font-black text-green-700 bg-green-50/30 border-l border-green-100 text-lg">{stats.currentPoints.toLocaleString()}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <button onClick={() => handleRedeemClick(f.id)}
                                                        className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-full text-xs font-bold transition-colors">
                                                        <Gift size={12} className="mr-1" /> แลกคะแนน
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase text-xs">วันที่</th>
                                        <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase text-xs">เกษตรกร</th>
                                        <th className="px-5 py-3 text-left font-semibold text-gray-500 uppercase text-xs">ของรางวัลที่แลก</th>
                                        <th className="px-5 py-3 text-right font-semibold text-gray-500 uppercase text-xs">คะแนนที่ใช้</th>
                                        <th className="px-5 py-3 text-center font-semibold text-gray-500 uppercase text-xs">ยกเลิกรายการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {loading ? (
                                        <tr><td colSpan="5" className="px-5 py-10 text-center text-gray-400">กำลังโหลด...</td></tr>
                                    ) : filteredPromotions.length === 0 ? (
                                        <tr><td colSpan="5" className="px-5 py-10 text-center text-gray-400 flex-col items-center">
                                            <Gift size={32} className="mx-auto mb-2 opacity-20" />ยังไม่มีประวัติการแลกของรางวัล
                                        </td></tr>
                                    ) : filteredPromotions.map((p, i) => (
                                        <tr key={p.id || i} className="hover:bg-gray-50/50">
                                            <td className="px-5 py-4 whitespace-nowrap text-gray-500">{p.date}</td>
                                            <td className="px-5 py-4 font-semibold text-gray-900">{p.farmerName}</td>
                                            <td className="px-5 py-4 text-gray-700 font-medium">
                                                {Number(p.pointsUsed) === 0 ? p.rewardName : `✨ ${p.rewardName}`}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {Number(p.pointsUsed) === 0 ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                                        รางวัลจับฉลาก
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                        -{Number(p.pointsUsed).toLocaleString()}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <button onClick={() => { setConfirmDeleteId(p.id); }}
                                                    className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Promotions;
