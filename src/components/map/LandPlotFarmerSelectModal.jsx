import React from 'react';
import { Search, X, Users } from 'lucide-react';

export const LandPlotFarmerSelectModal = ({
    showModal,
    onClose,
    farmerSearchQuery,
    setFarmerSearchQuery,
    filteredFarmerList,
    selectedFarmerId,
    onSelectFarmer,
    plots
}) => {
    if (!showModal) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100">
                <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-800 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <Users size={22} />
                        <h3 className="font-black text-lg">เลือกเกษตรกรที่ต้องการดูแปลงสวนยาง</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="ค้นหาจากชื่อ, เบอร์โทรศัพท์ หรือรหัสเกษตรกร..."
                            value={farmerSearchQuery}
                            onChange={(e) => setFarmerSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            autoFocus
                        />
                        <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
                    </div>
                </div>

                <div className="p-2 max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
                    {filteredFarmerList.map(f => {
                        const countPlots = plots.filter(p => p.farmerId === f.id).length;
                        const isSelected = selectedFarmerId === f.id;
                        return (
                            <div
                                key={f.id}
                                onClick={() => {
                                    onSelectFarmer(f.id);
                                    onClose();
                                }}
                                className={`p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                                    isSelected
                                        ? 'bg-emerald-50 border border-emerald-200'
                                        : 'hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                                        isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {f.name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-gray-900">{f.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center space-x-2">
                                            <span>รหัส: {f.id}</span>
                                            {f.phone && <span>• โทร: {f.phone}</span>}
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 text-xs font-bold rounded-xl ${
                                    countPlots > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {countPlots} แปลง
                                </span>
                            </div>
                        );
                    })}
                    {filteredFarmerList.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            ไม่พบรายชื่อเกษตรกรตรงกับที่ค้นหา
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
