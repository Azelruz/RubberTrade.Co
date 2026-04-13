import React from 'react';
import { Search, FileText } from 'lucide-react';

const HistoryHeader = ({ activeTab, setActiveTab, filters, handleFilterChange }) => {
    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
            <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                    <FileText className="text-gray-900" size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                        ประวัติการ{activeTab === 'buy' ? 'รับซื้อ' : 'ขาย'}
                    </h1>
                </div>
                <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 py-1.5 ml-4">
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
    );
};

export default HistoryHeader;
