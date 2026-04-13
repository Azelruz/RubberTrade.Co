import React from 'react';
import { 
    Calendar, Search, List, Trash2, Edit2, FileImage, Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

const SellTable = ({
    filteredRecords, searchTerm, setSearchTerm,
    selectedDate, setSelectedDate,
    handleEdit, handleDelete, handlePrint, previewUrl,
    isLoading, user
}) => {
    return (
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <Calendar className="text-gray-400 hidden sm:block" size={20} />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full sm:w-auto px-3 py-1 border border-gray-300 rounded-lg text-sm shadow-sm" 
                        />
                        <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-1 shadow-sm">
                            <Search size={16} className="text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="ค้นหาประวัติ..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="ml-2 bg-transparent border-none focus:ring-0 text-sm" 
                            />
                        </div>
                    </div>
                    <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <List size={16} />
                        พบ {filteredRecords.length} รายการ
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">โรงงาน / วันที่</th>
                                <th className="px-6 py-4">ประเภท</th>
                                <th className="px-6 py-4">น้ำหนัก (สุทธิ)</th>
                                <th className="px-6 py-4">DRC (%)</th>
                                <th className="px-6 py-4">ยอดขาย (บาท)</th>
                                <th className="px-6 py-4 text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">กำลังโหลด...</td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">ไม่พบบันทึกการขาย</td>
                                </tr>
                            ) : (
                                filteredRecords.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{r.buyerName || 'ไม่ระบุชื่อ'}</div>
                                            <div className="text-[10px] text-gray-400 font-mono mt-1">
                                                {format(new Date(r.date), 'dd MMMM yyyy', { locale: th })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.rubberType === 'cup_lump' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                                                {r.rubberType === 'cup_lump' ? 'ขี้ยาง' : 'น้ำยางสด'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-700">{Number(r.weight).toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">กก.</span></div>
                                            {r.lossWeight !== 0 && (
                                                <div className={`text-[10px] font-bold ${Number(r.lossWeight) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {Number(r.lossWeight) > 0 ? '-' : '+'} {Math.abs(Number(r.lossWeight))} กก.
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-gray-600">{r.rubberType === 'cup_lump' ? '-' : `${Number(r.drc).toFixed(2)}%`}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-gray-900 font-mono">฿{Number(r.total).toLocaleString()}</div>
                                            <div className="text-[10px] text-gray-400">@{Number(r.pricePerKg).toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                {r.receiptUrl && (
                                                    <a href={r.receiptUrl} target="_blank" rel="noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ดูหลักฐาน">
                                                        <FileImage size={18} />
                                                    </a>
                                                )}
                                                <button onClick={() => handlePrint(r)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="พิมพ์ใบส่งของ">
                                                    <Printer size={18} />
                                                </button>
                                                <button onClick={() => handleEdit(r)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="แก้ไข">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(r.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
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

export default SellTable;
