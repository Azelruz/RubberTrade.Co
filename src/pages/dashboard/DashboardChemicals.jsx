import React from 'react';
import { FlaskConical, Droplets, Activity } from 'lucide-react';
import { format } from 'date-fns';

const DashboardChemicals = ({ chemicalCalcs, handleRecordChemical, chemicalUsage, stats }) => {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-900 flex items-center tracking-tight">
                    <FlaskConical className="mr-2 text-purple-600" size={24} />
                    การจัดการน้ำยาง (ปริมาณสารเคมีที่ต้องใช้)
                </h2>
                <div className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-black rounded-full border border-purple-200 uppercase tracking-widest">
                    Today's Dosage
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {chemicalCalcs.map((chem) => {
                    const theme = {
                        amber: 'from-amber-500 to-yellow-500 shadow-amber-200 border-amber-100',
                        blue: 'from-blue-500 to-cyan-500 shadow-blue-200 border-blue-100',
                        purple: 'from-purple-500 to-indigo-500 shadow-purple-200 border-purple-100'
                    }[chem.color] || 'from-gray-500 to-slate-500 shadow-gray-200 border-gray-100';

                    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
                    const isRecorded = chemicalUsage.some(u => u.chemicalId === chem.id && u.date === todayDateStr);

                    return (
                        <div key={chem.id} className={`relative overflow-hidden bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group`}>
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme} opacity-[0.03] -mr-8 -mt-8 rounded-full group-hover:scale-110 transition-transform`}></div>
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${theme} text-white shadow-lg`}>
                                    {chem.id === 'ammonia' ? <FlaskConical size={20} /> : 
                                     chem.id === 'water' ? <Droplets size={20} /> : 
                                     <Activity size={20} />}
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Needed</p>
                                    <div className="text-2xl font-black text-gray-900 leading-none">
                                        {chem.result.toLocaleString()} <span className="text-xs font-bold text-gray-400">กก.</span>
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-gray-800 text-sm">{chem.name}</h3>
                                <p className="text-[10px] text-gray-400 font-medium">
                                    อัตราส่วน: {chem.amount} กก. / น้ำยาง {Number(chem.perLatex).toLocaleString()} กก.
                                </p>
                            </div>
                            <div className="flex justify-between items-center mt-4">
                                <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden mr-4">
                                    <div className={`h-full bg-gradient-to-r ${theme} transition-all duration-1000`} style={{ width: stats.todayBuyWeight > 0 ? '100%' : '0%' }}></div>
                                </div>
                                <button
                                    onClick={() => handleRecordChemical(chem)}
                                    disabled={isRecorded || stats.todayBuyWeight === 0}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                                        isRecorded 
                                        ? 'bg-green-100 text-green-700 cursor-default opacity-100' 
                                        : stats.todayBuyWeight === 0 
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                            : 'bg-white border-2 hover:bg-gray-50 active:scale-95 shadow-sm'
                                    } ${!isRecorded && stats.todayBuyWeight > 0 ? (
                                        chem.color === 'amber' ? 'border-amber-200 text-amber-700' : 
                                        chem.color === 'blue' ? 'border-blue-200 text-blue-700' : 
                                        'border-purple-200 text-purple-700'
                                    ) : ''}`}
                                >
                                    {isRecorded ? 'บันทึกแล้ว ✓' : 'บันทึก'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DashboardChemicals;
