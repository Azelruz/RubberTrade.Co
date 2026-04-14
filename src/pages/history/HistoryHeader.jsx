import React, { useState } from 'react';
import { Search, FileText, Filter, ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react';

const HistoryHeader = ({ 
    activeTab, 
    setActiveTab, 
    filters, 
    handleFilterChange, 
    farmers = [], 
    factories = [], 
    setFilters 
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const activeFilterCount = Object.entries(filters).reduce((acc, [key, value]) => {
        if (['startDate', 'endDate'].includes(key)) return acc;
        return value !== '' ? acc + 1 : acc;
    }, 0);

    const clearFilters = () => {
        setFilters({
            startDate: filters.startDate,
            endDate: filters.endDate,
            searchTerm: '',
            rubberType: '',
            minWeight: '',
            maxWeight: '',
            minTotal: '',
            maxTotal: '',
            farmerId: '',
            factoryId: '',
            farmerStatus: '',
            employeeStatus: ''
        });
    };

    return (
        <div className="space-y-4 no-print">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                        <FileText className="text-gray-900" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">
                            ประวัติการ{activeTab === 'buy' ? 'รับซื้อ' : 'ขาย'}
                        </h1>
                    </div>
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-1.5 ml-4 shadow-sm">
                        <span className="text-xs font-bold text-gray-400 mr-2">วันที่:</span>
                        <input 
                            type="date" 
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="text-sm font-black text-rubber-600 bg-transparent border-none focus:ring-0 p-0"
                        />
                        <span className="text-xs font-bold text-gray-400 mx-2">-</span>
                        <input 
                            type="date" 
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="text-sm font-black text-rubber-600 bg-transparent border-none focus:ring-0 p-0"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-rubber-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            name="searchTerm"
                            value={filters.searchTerm}
                            onChange={handleFilterChange}
                            placeholder="ค้นหาชื่อ, รหัส..."
                            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold w-64 focus:ring-2 focus:ring-rubber-500/20 focus:border-rubber-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                    
                    <button 
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-bold transition-all border shadow-sm ${showAdvanced || activeFilterCount > 0 ? 'bg-rubber-50 border-rubber-200 text-rubber-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Filter size={18} className="mr-2" />
                        ตัวกรอง
                        {activeFilterCount > 1 && (
                            <span className="ml-2 bg-rubber-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                                {activeFilterCount - 1}
                            </span>
                        )}
                        {showAdvanced ? <ChevronUp size={16} className="ml-2" /> : <ChevronDown size={16} className="ml-2" />}
                    </button>

                    <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                        <button 
                            onClick={() => setActiveTab('buy')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'buy' ? 'bg-rubber-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            รับซื้อ
                        </button>
                        <button 
                            onClick={() => setActiveTab('sell')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'sell' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            ขาย
                        </button>
                    </div>
                </div>
            </div>

            {/* Advanced Filter Panel */}
            {showAdvanced && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Column 1: Core Params */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ประเภทน้ำยาง</label>
                                <select 
                                    name="rubberType"
                                    value={filters.rubberType}
                                    onChange={handleFilterChange}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-rubber-500/20 focus:border-rubber-500 outline-none"
                                >
                                    <option value="">ทั้งหมด</option>
                                    <option value="latex">น้ำยางสด</option>
                                    <option value="cup_lump">ยางก้อนถ้วย</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    {activeTab === 'buy' ? 'เกษตรกร' : 'โรงงาน'}
                                </label>
                                <select 
                                    name={activeTab === 'buy' ? 'farmerId' : 'factoryId'}
                                    value={activeTab === 'buy' ? filters.farmerId : filters.factoryId}
                                    onChange={handleFilterChange}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-rubber-500/20 focus:border-rubber-500 outline-none"
                                >
                                    <option value="">ทั้งหมด</option>
                                    {activeTab === 'buy' 
                                        ? farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                                        : factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                                    }
                                </select>
                            </div>
                        </div>

                        {/* Column 2: Weight Range */}
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">ช่วงน้ำหนัก (กิโลกรัม)</label>
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="number"
                                    name="minWeight"
                                    value={filters.minWeight}
                                    onChange={handleFilterChange}
                                    placeholder="ต่ำสุด"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-rubber-500/20 outline-none"
                                />
                                <span className="text-gray-300">-</span>
                                <input 
                                    type="number"
                                    name="maxWeight"
                                    value={filters.maxWeight}
                                    onChange={handleFilterChange}
                                    placeholder="สูงสุด"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-rubber-500/20 outline-none"
                                />
                            </div>
                        </div>

                        {/* Column 3: Amount Range */}
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">ช่วงยอดรวม (บาท)</label>
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="number"
                                    name="minTotal"
                                    value={filters.minTotal}
                                    onChange={handleFilterChange}
                                    placeholder="ต่ำสุด"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-rubber-500/20 outline-none"
                                />
                                <span className="text-gray-300">-</span>
                                <input 
                                    type="number"
                                    name="maxTotal"
                                    value={filters.maxTotal}
                                    onChange={handleFilterChange}
                                    placeholder="สูงสุด"
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-rubber-500/20 outline-none"
                                />
                            </div>
                        </div>

                        {/* Column 4: Status (Buy Only) */}
                        <div className="space-y-4">
                            {activeTab === 'buy' ? (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">สถานะเกษตรกร</label>
                                        <select 
                                            name="farmerStatus"
                                            value={filters.farmerStatus}
                                            onChange={handleFilterChange}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-rubber-500/20 focus:border-rubber-500 outline-none"
                                        >
                                            <option value="">ทั้งหมด</option>
                                            <option value="Pending">รอจ่าย</option>
                                            <option value="Paid">จ่ายแล้ว</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">สถานะลูกน้อง</label>
                                        <select 
                                            name="employeeStatus"
                                            value={filters.employeeStatus}
                                            onChange={handleFilterChange}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-rubber-500/20 focus:border-rubber-500 outline-none"
                                        >
                                            <option value="">ทั้งหมด</option>
                                            <option value="Pending">รอจ่าย</option>
                                            <option value="Paid">จ่ายแล้ว</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col justify-center items-center text-gray-300">
                                    <p className="text-xs font-bold text-center italic">ไม่มีเงื่อนไขสถานะ<br/>สำหรับบิลขาย</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end items-center space-x-4">
                        <button 
                            onClick={clearFilters}
                            className="flex items-center text-xs font-black text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                        >
                            <RotateCcw size={14} className="mr-2" />
                            ล้างตัวกรองทั้งหมด
                        </button>
                        <button 
                            onClick={() => setShowAdvanced(false)}
                            className="bg-rubber-600 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rubber-600/20 hover:scale-105 transition-all"
                        >
                            ตกลง
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryHeader;
