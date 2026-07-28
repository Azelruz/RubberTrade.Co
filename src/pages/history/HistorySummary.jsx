import React from 'react';

const HistorySummary = ({ totals }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">รายการทั้งหมด</span>
                <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-gray-900">{totals.totalBills || 0}</span>
                    <span className="text-xs font-bold text-gray-400">บิล</span>
                </div>
            </div>
            <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">น้ำหนักสุทธิ</span>
                <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-rubber-600">{(totals.totalWeight || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    <span className="text-xs font-bold text-gray-400">กก.</span>
                </div>
            </div>
            <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-1 border-b-4 border-b-emerald-500">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">ยางแห้งรวม</span>
                <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-emerald-600">{(totals.totalDryWeight || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    <span className="text-xs font-bold text-gray-400">กก.</span>
                </div>
            </div>
            <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-1 border-b-4 border-b-blue-500">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">ยอดรวมเงิน</span>
                <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-blue-600">฿{(totals.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                </div>
            </div>
        </div>
    );
};

export default HistorySummary;
