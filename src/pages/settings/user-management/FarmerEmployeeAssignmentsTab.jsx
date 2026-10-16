import React from 'react';
import { Plus, Edit2, Trash2, Search, Link2, Leaf, UserCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const FarmerEmployeeAssignmentsTab = ({
    farmerEmployees,
    farmers,
    employees,
    assignmentSearch,
    setAssignmentSearch,
    filteredAssignments,
    setEditingAssignment,
    setLinkingEmployee,
    setLinkFarmerId,
    setLinkPct,
    setLinkIsDefault,
    setShowLinkModal,
    deleteFarmerEmployeeLink,
    loadData
}) => {
    return (
        <section className="animate-in fade-in duration-300 space-y-6">
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อเกษตรกร หรือชื่อคนกรีด..."
                        value={assignmentSearch}
                        onChange={(e) => setAssignmentSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-sm shadow-sm font-medium"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    {assignmentSearch && (
                        <button onClick={() => setAssignmentSearch('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => {
                        setEditingAssignment(null);
                        setLinkingEmployee(null);
                        setLinkFarmerId('');
                        setLinkPct('50');
                        setLinkIsDefault(false);
                        setShowLinkModal(true);
                    }}
                    className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition shadow-sm font-bold text-sm"
                >
                    <Plus size={18} className="mr-1.5" />
                    ผูกคนกรีดกับสวนยางเพิ่ม
                </button>
            </div>

            {/* Summary Counter Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
                    <div className="p-3 bg-emerald-600 text-white rounded-lg shadow-sm">
                        <Link2 size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-emerald-800 font-bold uppercase">การผูกสวนทั้งหมด</div>
                        <div className="text-2xl font-black text-emerald-900">{farmerEmployees.length} <span className="text-xs font-medium">รายการ</span></div>
                    </div>
                </div>

                <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
                    <div className="p-3 bg-blue-600 text-white rounded-lg shadow-sm">
                        <Leaf size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-blue-800 font-bold uppercase">สวนยางที่มีคนกรีด</div>
                        <div className="text-2xl font-black text-blue-900">
                            {new Set(farmerEmployees.map(fe => fe.farmerId)).size} <span className="text-xs font-medium">สวน</span>
                        </div>
                    </div>
                </div>

                <div className="bg-purple-50/60 border border-purple-100 p-4 rounded-xl flex items-center space-x-3 shadow-sm">
                    <div className="p-3 bg-purple-600 text-white rounded-lg shadow-sm">
                        <UserCircle size={20} />
                    </div>
                    <div>
                        <div className="text-xs text-purple-800 font-bold uppercase">ลูกจ้างที่รับกรีด</div>
                        <div className="text-2xl font-black text-purple-900">
                            {new Set(farmerEmployees.map(fe => fe.employeeId)).size} <span className="text-xs font-medium">คน</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignments Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 font-bold text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left">เกษตรกร (เจ้าของสวน)</th>
                            <th className="px-6 py-4 text-left">คนกรีด (ลูกจ้าง)</th>
                            <th className="px-6 py-4 text-center">% ส่วนแบ่งกำไร</th>
                            <th className="px-6 py-4 text-center">สถานะคนกรีดหลัก</th>
                            <th className="px-6 py-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredAssignments.map(item => {
                            const farmerObj = farmers.find(f => f.id === item.farmerId);
                            const empObj = employees.find(e => e.id === item.employeeId);
                            return (
                                <tr key={item.id || `${item.farmerId}-${item.employeeId}`} className="hover:bg-emerald-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 flex items-center">
                                            <Leaf size={14} className="mr-1.5 text-emerald-600" />
                                            {item.farmerName || farmerObj?.name || item.farmerId}
                                        </div>
                                        <div className="text-[11px] text-gray-400 font-mono">ID: {item.farmerId}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 flex items-center">
                                            <UserCircle size={14} className="mr-1.5 text-blue-600" />
                                            {item.employeeName || empObj?.name || item.employeeId}
                                        </div>
                                        <div className="text-[11px] text-gray-400 font-mono">ID: {item.employeeId}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-black rounded-lg text-xs border border-emerald-200">
                                            {item.profitSharePct}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.isDefault === 1 ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                                ★ สวนหลักประจำ
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">ทั่วไป</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center space-x-1">
                                            <button
                                                onClick={() => {
                                                    setEditingAssignment(item);
                                                    setLinkingEmployee(empObj || { id: item.employeeId, name: item.employeeName });
                                                    setLinkFarmerId(item.farmerId);
                                                    setLinkPct(item.profitSharePct.toString());
                                                    setLinkIsDefault(item.isDefault === 1);
                                                    setShowLinkModal(true);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="แก้ไข"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (window.confirm(`ยืนยันการยกเลิกการผูกสวนนี้?`)) {
                                                        await deleteFarmerEmployeeLink({ farmerId: item.farmerId, employeeId: item.employeeId });
                                                        toast.success('ยกเลิกการผูกเรียบร้อย');
                                                        loadData();
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                title="ลบ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredAssignments.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                    <Link2 size={40} className="mb-2 opacity-20 mx-auto" />
                                    ยังไม่มีข้อมูลการผูกคนกรีดประจำสวน
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};
