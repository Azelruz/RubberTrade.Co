import React from 'react';
import { Droplets, Coins, Activity } from 'lucide-react';

const SellStockCards = ({ stockMetrics }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm flex items-center group hover:shadow-md transition-all relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-700 z-0"></div>
                <div className="p-4 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-200 z-10">
                    <Droplets size={24} />
                </div>
                <div className="ml-5 z-10">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">สต๊อกน้ำยางคงเหลือ</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                        {Number(stockMetrics.currentStock).toLocaleString()} <span className="text-xs font-bold text-gray-400">กก.</span>
                    </h3>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm flex items-center group hover:shadow-md transition-all relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-700 z-0"></div>
                <div className="p-4 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-200 z-10">
                    <Coins size={24} />
                </div>
                <div className="ml-5 z-10">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">สต๊อกขี้ยางคงเหลือ</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                        {Number(stockMetrics.cupLumpStock).toLocaleString()} <span className="text-xs font-bold text-gray-400">กก.</span>
                    </h3>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-cyan-100 shadow-sm flex items-center group hover:shadow-md transition-all relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-50 rounded-full group-hover:scale-150 transition-transform duration-700 z-0"></div>
                <div className="p-4 rounded-xl bg-cyan-500 text-white shadow-lg shadow-cyan-200 z-10">
                    <Activity size={24} />
                </div>
                <div className="ml-5 z-10">
                    <p className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.2em] mb-1">เฉลี่ย % DRC ทั้งหมด</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                        {Number(stockMetrics.avgDrc).toLocaleString()}<span className="text-xs font-bold text-gray-400">%</span>
                    </h3>
                </div>
            </div>
        </div>
    );
};

export default SellStockCards;
