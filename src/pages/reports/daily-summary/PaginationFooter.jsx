import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PaginationFooter = ({ totalCount, currentPage, setCurrentPage, itemsPerPage = 15 }) => {
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} จาก {totalCount} รายการ
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronLeft size={16} />
                </button>
                
                <div className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 flex items-center space-x-2">
                    <span className="text-xs font-black text-gray-900">{currentPage}</span>
                    <span className="text-[10px] font-bold text-gray-300">/</span>
                    <span className="text-xs font-black text-gray-400">{totalPages}</span>
                </div>

                <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default PaginationFooter;
