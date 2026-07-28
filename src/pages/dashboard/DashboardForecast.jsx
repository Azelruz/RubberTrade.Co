import React, { useState, useEffect } from 'react';
import { CloudRain, Compass, AlertCircle, TrendingUp, DollarSign, Truck, Calendar } from 'lucide-react';
import { fetchWeatherForecast } from '../../services/apiService';
import { Link } from 'react-router-dom';

const getWeatherEmojiAndText = (code) => {
    // WMO Weather Codes
    if (code === 0 || code === 1) return { emoji: '☀️', text: 'แดดจัด / ท้องฟ้าโปร่ง' };
    if (code === 2 || code === 3) return { emoji: '⛅', text: 'มีเมฆบางส่วน / ครึ้มฟ้าครึ้มฝน' };
    if (code === 45 || code === 48) return { emoji: '🌫️', text: 'หมอกลงหนา' };
    if (code >= 51 && code <= 57) return { emoji: '🌦️', text: 'ฝนตกปรอย ๆ' };
    if (code >= 61 && code <= 67) return { emoji: '🌧️', text: 'ฝนตกปานกลาง' };
    if (code >= 80 && code <= 82) return { emoji: '🌧️⛈️', text: 'ฝนตกหนักกระจาย' };
    if (code >= 95 && code <= 99) return { emoji: '⛈️', text: 'พายุฝนฟ้าคะนอง' };
    return { emoji: '☁️', text: 'มีเมฆมาก' };
};

const getYieldBadgeStyles = (yieldPct) => {
    if (yieldPct >= 80) return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        text: 'กรีดได้ปกติ',
        dot: 'bg-emerald-500'
    };
    if (yieldPct >= 30) return {
        bg: 'bg-amber-50 text-amber-700 border-amber-100',
        text: 'กรีดได้บางพื้นที่',
        dot: 'bg-amber-500'
    };
    return {
        bg: 'bg-rose-50 text-rose-700 border-rose-100',
        text: 'งดกรีดยาง / ฝนตกหนัก',
        dot: 'bg-rose-500'
    };
};

export const DashboardForecast = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        loadForecast();
    }, []);

    const loadForecast = async () => {
        try {
            const res = await fetchWeatherForecast();
            if (res) {
                setData(res);
            }
        } catch (err) {
            console.error('Error loading yield forecast:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-center h-48 animate-pulse">
                <div className="text-center space-y-2">
                    <CloudRain className="animate-bounce text-gray-300 mx-auto" size={32} />
                    <span className="text-xs text-gray-400 font-black uppercase tracking-widest">กำลังคำนวณคาดการณ์ผลผลิตสภาพอากาศ...</span>
                </div>
            </div>
        );
    }

    if (!data || data.status === 'not_configured') {
        return (
            <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/30 rounded-2xl border border-amber-100 shadow-sm p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                        <div className="p-3 bg-amber-100 text-amber-700 rounded-xl mt-0.5">
                            <Compass size={24} className="animate-spin-slow" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center">
                                🌦️ ระบบคาดการณ์ผลผลิตและวิเคราะห์สภาพอากาศล่วงหน้า
                            </h3>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">
                                ระบบยังไม่สามารถคำนวณปริมาณน้ำยางล่วงหน้าได้ เนื่องจากท่านยังไม่ได้ทำการปักหมุดพิกัดที่ตั้งของลานรับซื้อในระบบ
                            </p>
                        </div>
                    </div>
                    <div>
                        <Link
                            to="/settings"
                            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-black text-white hover:bg-gray-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 whitespace-nowrap"
                        >
                            <span>ปักหมุดพิกัดร้าน</span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-rubber-50 text-rubber-600 rounded-lg">
                        <CloudRain size={18} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Weather & Yield Forecast</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">คาดการณ์ปริมาณผลผลิตและกระแสเงินสดล่วงหน้า 3 วัน</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4 text-[10px] text-gray-500 font-bold">
                    <span>📍 พิกัดร้าน: {data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}</span>
                    <span className="h-3 w-px bg-gray-200"></span>
                    <span>ราคากลางอ้างอิง: {data.dailyPrice} บ./กก.</span>
                </div>
            </div>

            {/* Forecast Cards Grid */}
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {data.forecasts?.map((item, idx) => {
                        const wInfo = getWeatherEmojiAndText(item.weatherCode);
                        const bStyle = getYieldBadgeStyles(item.yieldPct);
                        const dateFormatted = new Date(item.date);
                        
                        let dayLabel = "วันถัดไป";
                        if (idx === 0) dayLabel = "วันนี้";
                        else if (idx === 1) dayLabel = "พรุ่งนี้";

                        return (
                            <div 
                                key={item.date} 
                                className="group relative bg-white hover:bg-gray-50/30 border border-gray-100 hover:border-rubber-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
                            >
                                {/* Date and Status */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <Calendar size={14} className="text-gray-400" />
                                        <span className="text-xs font-black text-gray-800">
                                            {dayLabel} ({dateFormatted.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })})
                                        </span>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider flex items-center space-x-1 ${bStyle.bg}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${bStyle.dot}`}></span>
                                        <span>{bStyle.text} ({item.yieldPct}%)</span>
                                    </span>
                                </div>

                                {/* Weather Details */}
                                <div className="bg-gray-50/50 group-hover:bg-white rounded-xl p-3.5 border border-gray-100/70 mb-4 flex items-center justify-between transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">{wInfo.emoji}</span>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-black text-gray-800 leading-tight block">{wInfo.text}</span>
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight block">
                                                ฝนสะสมช่วงกรีด: {item.tappingHoursRain} มม. (โอกาส {item.rainProbability}%)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Yield and Financial Estimates */}
                                <div className="space-y-3.5 mt-auto">
                                    {/* Estimated Weight */}
                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center space-x-1.5 text-gray-500">
                                            <TrendingUp size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wide">คาดการณ์น้ำยางสด</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-900">
                                            {item.predictedWeight.toLocaleString()} <span className="text-[10px] text-gray-400 font-bold">กก.</span>
                                        </span>
                                    </div>

                                    {/* Cash Required */}
                                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                                        <div className="flex items-center space-x-1.5 text-gray-500">
                                            <DollarSign size={14} className="text-emerald-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wide">เงินหมุนเวียนที่ต้องเตรียม</span>
                                        </div>
                                        <span className="text-sm font-black text-emerald-600">
                                            ฿{item.cashRequired.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Logistics Truck load */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1.5 text-gray-500">
                                            <Truck size={14} className="text-blue-500" />
                                            <span className="text-[10px] font-bold uppercase tracking-wide">การจัดส่ง (รอบรถโรงงาน)</span>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-700 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                                            {item.truckTrips} เที่ยวรถ
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
