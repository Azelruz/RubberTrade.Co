import React from 'react';
import { X, Link2 } from 'lucide-react';

export const FarmerEmployeeLinkModal = ({
    showModal,
    onClose,
    linkingEmployee,
    linkFarmerId,
    setLinkFarmerId,
    linkPct,
    setLinkPct,
    linkIsDefault,
    setLinkIsDefault,
    editingAssignment,
    farmers,
    saving,
    onSaveLink
}) => {
    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100">
                <div className="flex justify-between items-center pb-3 border-b mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        <Link2 className="text-blue-600 mr-2" size={20} />
                        {editingAssignment ? 'แก้ไขการผูกสวน' : `ผูกสวนยางให้คนกรีด`}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {linkingEmployee && (
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <span className="text-xs font-bold text-blue-700 uppercase">คนกรีด:</span>
                            <div className="font-bold text-blue-900 text-sm">{linkingEmployee.name}</div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">เจ้าของสวน / เกษตรกร <span className="text-red-500">*</span></label>
                        <select
                            value={linkFarmerId}
                            onChange={(e) => setLinkFarmerId(e.target.value)}
                            disabled={!!editingAssignment}
                            className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-blue-500 bg-white"
                        >
                            <option value="">-- เลือกเจ้าของสวน --</option>
                            {farmers.map(f => (
                                <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">% ส่วนแบ่งส่วนกรีด</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={linkPct}
                                onChange={(e) => setLinkPct(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-blue-500"
                            />
                            <span className="text-sm font-bold text-gray-500">%</span>
                        </div>
                        <p className="text-[11px] text-gray-400">เช่น 50% หมายถึงแบ่งค่ากรีดครึ่งหนึ่งให้คนกรีด</p>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <input
                            type="checkbox"
                            id="chkDefaultLink"
                            checked={linkIsDefault}
                            onChange={(e) => setLinkIsDefault(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="chkDefaultLink" className="text-xs font-bold text-gray-700 cursor-pointer">
                            ตั้งเป็นสวนหลักประจำของคนกรีดนี้
                        </label>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl text-sm font-medium"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={onSaveLink}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50"
                    >
                        {saving ? 'กำลังบันทึก...' : 'บันทึกการผูกสวน'}
                    </button>
                </div>
            </div>
        </div>
    );
};
