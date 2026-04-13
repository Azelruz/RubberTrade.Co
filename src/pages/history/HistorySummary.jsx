import React from 'react';

const HistorySummary = ({ totals }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
            <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">รายการ</span>
                <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-gray-900">{totals.totalBills}</span>
                    <span className="text-sm font-bold text-gray-400">บิล</span>
                </div>
            </div>
            <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">น้ำหนักสุทธิ</span>
                <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-black text-rubber-500">{totals.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    <span className="text-sm font-bold text-gray-400">กก.</span>
                </div>
            </div>
            <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-1 border-b-4 border-b-blue-500">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">ยอดจ่ายรวม</span>
                <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black text-blue-600">฿{totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                </div>
            </div>
        </div>
    );
};

export default HistorySummary;
