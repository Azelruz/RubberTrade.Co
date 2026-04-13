import React from 'react';
import { Droplets, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { truncateOneDecimal } from '../../utils/calculations';

const DashboardRecent = ({ recentTransactions }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
            <h2 className="text-lg font-bold text-gray-900 mb-4">รายการล่าสุด</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {recentTransactions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">ไม่มีรายการล่าสุด</p>
                ) : (
                    recentTransactions.map((tx, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${tx.type === 'buy' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {tx.type === 'buy' ? <Droplets size={18} /> : <Truck size={18} />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {tx.type === 'buy' ? `รับซื้อ: ${tx.farmerName}` : `ขาย: ${tx.buyerName}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {format(new Date(tx.timestamp || tx.date), 'dd MMM yyyy HH:mm', { locale: th })}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right ml-4">
                                <p className={`text-sm font-bold ${tx.type === 'buy' ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {tx.type === 'buy' ? '-' : '+'}฿{Number(tx.total).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </p>
                                <p className="text-xs text-gray-500">{truncateOneDecimal(tx.weight).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กก.</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DashboardRecent;
