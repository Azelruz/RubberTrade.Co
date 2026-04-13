import React from 'react';
import { FileText, Search, Printer, Trash2, Eye, User, Image as ImageIcon } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { th } from 'date-fns/locale';

const BuyTable = ({ filteredRecords, dailySummary, loading, searchTerm, setSearchTerm, selectedDate, setSelectedDate, handlePrintReceipt, handleDelete, setViewingEslip, user }) => {
    return (
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center">
                            <FileText className="mr-2 text-gray-500" size={20} />
                            ประวัติการรับซื้อ
                        </h2>
                        <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                            <span className="text-xs font-bold text-gray-400 mr-2 uppercase tracking-tighter">วันที่:</span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border-none focus:ring-0 text-sm font-bold text-rubber-600 bg-transparent p-0 cursor-pointer"
                            />
                        </div>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="text-gray-400" size={18} />
                        </span>
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ, รหัส..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 text-sm bg-white shadow-sm transition-all focus:shadow-md"
                        />
                    </div>
                </div>

                {/* Daily Summary Cards */}
                <div className="grid grid-cols-3 gap-0 border-b border-gray-100 bg-white">
                    <div className="p-4 text-center border-r border-gray-50">
                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">รายการ</p>
                        <p className="text-lg font-black text-gray-900">{dailySummary.count} <span className="text-xs font-bold text-gray-400">บิล</span></p>
                    </div>
                    <div className="p-4 text-center border-r border-gray-50">
                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">น้ำหนักสุทธิ</p>
                        <p className="text-lg font-black text-rubber-600">{dailySummary.totalWeight.toLocaleString(undefined, { minimumFractionDigits: 1 })} <span className="text-xs font-bold text-gray-400">กก.</span></p>
                    </div>
                    <div className="p-4 text-center">
                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">ยอดจ่ายรวม</p>
                        <p className="text-lg font-black text-blue-600">฿{dailySummary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 1 })}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rubber-600"></div>
                        </div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                            <p>ไม่พบประวัติการรับซื้อ</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่/เวลา</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เกษตรกร</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">น้ำหนัก (กก.)</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">% DRC</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ราคา/กก.</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ยอดรวม (฿)</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {record.date ? format(addYears(new Date(record.date), 543), 'dd MMM yyyy', { locale: th }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900 flex items-center">
                                                <User size={14} className="mr-1.5 text-gray-400" />
                                                <span className="flex items-center gap-2">
                                                    {record.farmerName}
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                                                        (record.rubberType === 'cup_lump' || record.rubber_type === 'cup_lump') 
                                                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                    }`}>
                                                        {(record.rubberType === 'cup_lump' || record.rubber_type === 'cup_lump') ? 'ขี้ยาง' : 'น้ำยาง'}
                                                    </span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                            <div className="flex flex-col items-end">
                                                <span>{Number(record.weight).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                {record.bucketWeight > 0 && (
                                                    <span className="text-[10px] text-red-400 font-normal">-{Number(record.bucketWeight).toLocaleString(undefined, { minimumFractionDigits: 1 })} (ถัง)</span>
                                                )}
                                                {record.bucketWeight > 0 && (
                                                    <span className="text-[11px] text-gray-400 font-bold border-t border-gray-100 mt-0.5">{(Number(record.weight) - Number(record.bucketWeight)).toLocaleString(undefined, { minimumFractionDigits: 1 })} สุทธิ</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-medium">
                                            {record.drc ? `${record.drc}%` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                            {Number(record.pricePerKg || record.actualPrice).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-rubber-600 text-right bg-rubber-50/30">
                                            {Number(record.total).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                            <div className="flex justify-center space-x-1">
                                                <button
                                                    onClick={() => handlePrintReceipt(record)}
                                                    className="p-1.5 text-gray-400 hover:text-rubber-600 hover:bg-rubber-50 rounded-lg transition-all"
                                                    title="พิมพ์ Paper-slip"
                                                >
                                                    <Printer size={18} />
                                                </button>
                                                {user?.role === 'owner' && (
                                                    <button
                                                        onClick={() => handleDelete(record.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="ลบรายการ"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setViewingEslip(record)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="ดู E-Slip"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {(record.receiptUrl || record.receipt_url) && !String(record.receiptUrl || record.receipt_url).startsWith('offline_queue') && (
                                                    <a
                                                        href={record.receiptUrl || record.receipt_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                                        title="ดูรูปที่บันทึกไว้ใน Cloud"
                                                    >
                                                        <ImageIcon size={18} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BuyTable;
