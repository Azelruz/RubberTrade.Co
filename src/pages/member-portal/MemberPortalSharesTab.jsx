import React from 'react';
import { Coins, Award } from 'lucide-react';

export const MemberPortalSharesTab = ({
    member,
    dividendInfo,
    shareTransactions
}) => {
    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* 2-Column Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                {/* Share Capital Card */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center">
                        <Coins size={13} className="mr-1 text-amber-500" />
                        ทุนเรือนหุ้นสะสม
                    </span>
                    <div className="text-2xl font-black font-mono text-gray-900">
                        {Number(member?.totalShares || 0).toLocaleString()} <span className="text-xs font-sans font-bold text-gray-500">หุ้น</span>
                    </div>
                    <span className="text-xs text-emerald-700 font-bold block">
                        มูลค่า: {Number(member?.shareValue || 0).toLocaleString()} บาท
                    </span>
                </div>

                {/* Dividends Card */}
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center">
                        <Award size={13} className="mr-1 text-purple-500" />
                        เงินปันผลล่าสุด
                    </span>
                    <div className="text-2xl font-black font-mono text-purple-900">
                        {dividendInfo ? `฿${dividendInfo.netPayout?.toLocaleString()}` : '-'}
                    </div>
                    <span className="text-[10px] text-gray-400 block truncate">
                        {dividendInfo ? dividendInfo.periodTitle : 'รอประกาศรอบปี'}
                    </span>
                </div>
            </div>

            {/* Dividend Breakdown Card */}
            {dividendInfo && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-3xl p-5 space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center">
                            <Award size={15} className="mr-1.5 text-purple-600" />
                            รายละเอียดเงินปันผล & เฉลี่ยคืน ({dividendInfo.periodTitle})
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200/60 text-purple-800">
                            {dividendInfo.payoutStatus === 'paid' ? 'จ่ายแล้ว' : 'รอจ่าย'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-3 bg-white/80 rounded-2xl border border-purple-100">
                            <span className="text-[10px] text-gray-400 block font-bold">ปันผลตามหุ้น</span>
                            <span className="font-mono font-bold text-gray-900 text-sm">
                                +{dividendInfo.shareDividend?.toLocaleString()} บ.
                            </span>
                        </div>
                        <div className="p-3 bg-white/80 rounded-2xl border border-purple-100">
                            <span className="text-[10px] text-gray-400 block font-bold">เฉลี่ยคืนจากยอดขายยาง</span>
                            <span className="font-mono font-bold text-gray-900 text-sm">
                                +{dividendInfo.patronageRefund?.toLocaleString()} บ.
                            </span>
                        </div>
                    </div>

                    <div className="p-3 bg-purple-600 text-white rounded-2xl flex justify-between items-center">
                        <span className="text-xs font-bold">ยอดเงินปันผลสุทธิ</span>
                        <span className="font-mono font-black text-lg">
                            ฿{dividendInfo.netPayout?.toLocaleString()} บาท
                        </span>
                    </div>
                </div>
            )}

            {/* Share Transactions History */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-gray-700 flex items-center">
                    <Coins size={14} className="mr-1.5 text-amber-500" />
                    ประวัติการทำรายการหุ้น
                </h4>

                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] border-b border-gray-100">
                            <tr>
                                <th className="py-2 px-2.5">วันที่</th>
                                <th className="py-2 px-2.5">รายการ</th>
                                <th className="py-2 px-2.5 text-right">จำนวนหุ้น</th>
                                <th className="py-2 px-2.5 text-right">มูลค่า (บ.)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 font-mono text-[11px]">
                            {shareTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-gray-400 font-sans">
                                        ยังไม่มีประวัติการทำรายการหุ้น
                                    </td>
                                </tr>
                            ) : (
                                shareTransactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-gray-50">
                                        <td className="py-2.5 px-2.5 text-gray-600">{tx.date}</td>
                                        <td className="py-2.5 px-2.5 font-sans font-bold text-gray-800">
                                            {tx.type === 'buy' ? 'ซื้อหุ้นเพิ่ม' : 'ถอนหุ้น'}
                                        </td>
                                        <td className="py-2.5 px-2.5 text-right font-bold text-emerald-700">
                                            +{Number(tx.shares).toLocaleString()}
                                        </td>
                                        <td className="py-2.5 px-2.5 text-right font-black text-gray-900">
                                            {Number(tx.amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MemberPortalSharesTab;
