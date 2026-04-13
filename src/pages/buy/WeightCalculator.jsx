import React from 'react';
import { Calculator, X, Trash2 } from 'lucide-react';

const WeightCalculator = ({ showCalculator, setShowCalculator, calcItems, setCalcItems, calcInput, setCalcInput, addCalcItem, removeCalcItem, applyCalcResult }) => {
    if (!showCalculator) return null;

    return (
        <div className="fixed inset-0 bg-black/40 z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
                <div className="bg-rubber-600 p-4 text-white flex justify-between items-center">
                    <div className="flex items-center">
                        <Calculator className="mr-2" size={20} />
                        <h3 className="font-bold">เครื่องคิดเลขรวมน้ำหนัก</h3>
                    </div>
                    <button onClick={() => setShowCalculator(false)} className="hover:bg-rubber-700 p-1 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="0.00"
                            value={calcInput}
                            onChange={(e) => setCalcInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCalcItem(e)}
                            className="flex-grow px-3 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 font-mono text-lg"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={addCalcItem}
                            className="bg-rubber-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-rubber-700 transition-colors"
                        >
                            เพิ่ม
                        </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto border border-gray-100">
                        {calcItems.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-4 italic">ยังไม่มีรายการ...</p>
                        ) : (
                            <div className="space-y-2">
                                {calcItems.map((val, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                                        <span className="font-mono text-gray-700 font-bold">{val.toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.</span>
                                        <button onClick={() => removeCalcItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-4 px-1">
                            <span className="text-gray-500 font-medium">รวมน้ำหนักทั้งหมด:</span>
                            <span className="text-2xl font-black text-rubber-700 font-mono">
                                {calcItems.reduce((sum, v) => sum + v, 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} กก.
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setCalcItems([])}
                                className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                ล้างทั้งหมด
                            </button>
                            <button
                                type="button"
                                onClick={applyCalcResult}
                                disabled={calcItems.length === 0}
                                className="px-4 py-2 text-sm font-bold text-white bg-rubber-600 rounded-lg hover:bg-rubber-700 disabled:opacity-50 shadow-md shadow-rubber-200"
                            >
                                ใช้ค่านักสุทธิ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeightCalculator;
