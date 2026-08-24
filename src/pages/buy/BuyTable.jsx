import React, { useState } from 'react';
import { FileText, Search, Printer, Trash2, Eye, User, Users, Image as ImageIcon, ChevronLeft, ChevronRight, QrCode, X } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';

const BuyTable = ({ filteredRecords, dailySummary, loading, searchTerm, setSearchTerm, selectedDate, setSelectedDate, handlePrintReceipt, handleDelete, setViewingEslip, user, pagination, onPageChange, loanDeductions = [], farmers = [], employees = [] }) => {
    const [qrModalData, setQrModalData] = useState(null);

    const handleShowQR = (record) => {
        const farmer = (farmers || []).find(f => f.id === record.farmerId || f.name === record.farmerName);
        const farmerPromptpay = farmer?.phone || farmer?.bankAccount || record.phone || '';
        
        const emp = (employees || []).find(e => e.farmerId === record.farmerId || e.farmerId === farmer?.id);
        const empPromptpay = emp?.phone || emp?.bankAccount || '';
        
        const hasEmp = Number(record.employeeTotal) > 0;
        const farmerAmt = Number(record.farmerTotal || (record.total - (record.employeeTotal || 0))) || 0;
        const empAmt = Number(record.employeeTotal) || 0;

        setQrModalData({
            farmerName: record.farmerName || farmer?.name || 'เกษตรกร',
            farmerPromptpay,
            farmerAmt,
            hasEmp,
            empName: emp?.name || 'ลูกจ้าง (คนกรีด)',
            empPromptpay,
            empAmt,
            activeTab: 'farmer'
        });
    };
    return (
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center">
                            <FileText className="mr-2 text-gray-500" size={20} />
                            ประวัติการรับซื้อ
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 ml-2.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Real-time
                            </span>
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

                <div className="overflow-x-auto overflow-y-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rubber-600"></div>
                        </div>
                    ) : (
                        <>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50/80">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">วันที่/เวลา</th>
                                        <th className="px-6 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-widest">เกษตรกร</th>
                                        <th className="px-6 py-3 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">น้ำหนัก (กก.)</th>
                                        <th className="px-6 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">% DRC</th>
                                        <th className="px-6 py-3 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">ราคา/กก.</th>
                                        <th className="px-6 py-3 text-right text-[11px] font-black text-gray-400 uppercase tracking-widest">ยอดรวม (฿)</th>
                                        <th className="px-6 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-12 text-gray-500">
                                                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                                <p className="font-bold">ไม่พบประวัติการรับซื้อ</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map((record) => {
                                            const hasAnyDed = loanDeductions.some(d => d.buyId === record.id);
                                            return (
                                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {record.date ? format(addYears(new Date(record.date), 543), 'dd MMM yyyy', { locale: th }) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-bold text-gray-900 flex items-center">
                                                            <User size={14} className="mr-1.5 text-gray-400" />
                                                            <span className="flex items-center gap-2">
                                                                {record.farmerName}{hasAnyDed ? '*' : ''}
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${
                                                                    (record.rubberType === 'cup_lump' || record.rubber_type === 'cup_lump') 
                                                                        ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                                                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                                }`}>
                                                                    {(record.rubberType === 'cup_lump' || record.rubber_type === 'cup_lump') ? 'ขี้ยาง' : 'น้ำยาง'}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleShowQR(record)}
                                                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                                                    title="สร้าง PromptPay QR Code ชำระเงิน"
                                                                >
                                                                    <QrCode size={15} />
                                                                </button>
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
                                                        {(user?.role === 'owner' || user?.role === 'staff') && (
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
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {pagination && pagination.totalPages > 1 && (
                                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        หน้า {pagination.currentPage} / {pagination.totalPages}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => onPageChange(pagination.currentPage - 1)}
                                            disabled={pagination.currentPage === 1}
                                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            onClick={() => onPageChange(pagination.currentPage + 1)}
                                            disabled={pagination.currentPage === pagination.totalPages}
                                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* PromptPay QR Code Modal */}
            {qrModalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="bg-blue-600 p-5 text-white relative">
                            <button 
                                onClick={() => setQrModalData(null)}
                                className="absolute right-4 top-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-white/20 rounded-xl">
                                    <QrCode size={22} />
                                </div>
                                <h3 className="text-xl font-bold">PromptPay QR Code</h3>
                            </div>

                            {/* Tab Switcher if has employee */}
                            {qrModalData.hasEmp ? (
                                <div className="flex bg-blue-700/60 p-1 rounded-xl mt-3 border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setQrModalData(prev => ({ ...prev, activeTab: 'farmer' }))}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                            qrModalData.activeTab === 'farmer' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:bg-white/10'
                                        }`}
                                    >
                                        <User size={14} /> เกษตรกร
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setQrModalData(prev => ({ ...prev, activeTab: 'employee' }))}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                            qrModalData.activeTab === 'employee' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:bg-white/10'
                                        }`}
                                    >
                                        <Users size={14} /> ลูกจ้าง (คนกรีด)
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-2">
                                    <p className="text-xs opacity-80 uppercase tracking-wider font-medium">เกษตรกรผู้รับเงิน</p>
                                    <p className="text-lg font-bold truncate">{qrModalData.farmerName}</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Body */}
                        <div className="p-6 flex flex-col items-center">
                            {(() => {
                                const isFarmer = qrModalData.activeTab === 'farmer';
                                const targetName = isFarmer ? qrModalData.farmerName : qrModalData.empName;
                                const targetPromptpay = isFarmer ? qrModalData.farmerPromptpay : qrModalData.empPromptpay;
                                const targetAmt = isFarmer ? qrModalData.farmerAmt : qrModalData.empAmt;

                                if (!targetPromptpay) {
                                    return (
                                        <div className="w-full text-center py-8 px-4">
                                            <div className="p-3 bg-amber-50 text-amber-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                                                <QrCode size={24} />
                                            </div>
                                            <p className="font-bold text-gray-800 text-sm mb-1">{targetName}</p>
                                            <p className="text-xs text-amber-600 font-medium">
                                                ยังไม่ได้ระบุเบอร์โทรศัพท์หรือเลขบัญชี PromptPay ของ{isFarmer ? 'เกษตรกร' : 'ลูกจ้าง'}รายนี้
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <>
                                        <div className="bg-white p-3 border-2 border-dashed border-gray-100 rounded-2xl shadow-inner mb-4">
                                            <img 
                                                src={`https://promptpay.io/${targetPromptpay}/${targetAmt}.png`} 
                                                alt="PromptPay QR Code"
                                                className="w-44 h-44"
                                            />
                                        </div>

                                        <div className="w-full bg-gray-50 rounded-xl p-3.5 mb-5 border border-gray-100 space-y-1.5">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">ชื่อผู้รับโอน ({isFarmer ? 'เกษตรกร' : 'ลูกจ้าง'})</span>
                                                <span className="font-bold text-gray-900 truncate max-w-[160px]">{targetName}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">PromptPay / เบอร์โทร</span>
                                                <span className="font-bold text-gray-700">{targetPromptpay}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                                                <span className="text-xs text-gray-500 font-medium">ยอดโอนสุทธิ</span>
                                                <span className="text-base font-black text-blue-600">฿ {targetAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}

                            <button 
                                onClick={() => setQrModalData(null)}
                                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-colors"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuyTable;
