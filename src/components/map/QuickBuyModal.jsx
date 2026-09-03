import React, { useState, useEffect } from 'react';
import { X, Scale, User, DollarSign, Award, Calculator, Printer, CheckCircle } from 'lucide-react';
import { truncateOneDecimal, calculateDrcBonus } from '../../utils/calculations';
import toast from 'react-hot-toast';

export const QuickBuyModal = ({ plot, farmers = [], employees = [], farmerEmployees = [], dailyPriceObj = { price: '50' }, drcBonuses = [], onClose, onSubmit }) => {
    const [weight, setWeight] = useState('');
    const [bucketWeight, setBucketWeight] = useState('0');
    const [drc, setDrc] = useState('35');
    const [rubberType, setRubberType] = useState('latex');
    const [pricePerKg, setPricePerKg] = useState('50');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [empPct, setEmpPct] = useState(50);
    const [submitting, setSubmitting] = useState(false);
    const [printReceipt, setPrintReceipt] = useState(true);

    // Auto-update price per kg when dailyPriceObj or rubberType changes
    useEffect(() => {
        const defaultLatexPrice = typeof dailyPriceObj === 'string' ? dailyPriceObj : (dailyPriceObj?.price || '50');
        const defaultCupLumpPrice = typeof dailyPriceObj === 'object' ? (dailyPriceObj?.cupLumpPrice || defaultLatexPrice) : defaultLatexPrice;
        
        if (rubberType === 'cup_lump') {
            setPricePerKg(String(defaultCupLumpPrice));
        } else {
            setPricePerKg(String(defaultLatexPrice));
        }
    }, [dailyPriceObj, rubberType]);

    // Find farmer details
    const farmer = farmers.find(f => f.id === plot?.farmerId) || { name: plot?.farmerName || 'ไม่ระบุ' };

    // Find employees linked to this farmer from farmer_employees table
    const linkedEmployeeIds = farmerEmployees
        .filter(fe => fe.farmerId === plot?.farmerId)
        .map(fe => fe.employeeId);

    const availableEmployees = employees.filter(e => linkedEmployeeIds.includes(e.id));

    useEffect(() => {
        if (plot?.employeeId) {
            setSelectedEmployeeId(plot.employeeId);
            const link = farmerEmployees.find(fe => fe.farmerId === plot.farmerId && fe.employeeId === plot.employeeId);
            if (link && link.profitSharePct != null) {
                setEmpPct(link.profitSharePct);
            }
        } else if (availableEmployees.length > 0) {
            setSelectedEmployeeId(availableEmployees[0].id);
            const link = farmerEmployees.find(fe => fe.farmerId === plot.farmerId && fe.employeeId === availableEmployees[0].id);
            if (link && link.profitSharePct != null) {
                setEmpPct(link.profitSharePct);
            }
        }
    }, [plot, farmerEmployees]);

    const handleEmployeeChange = (eId) => {
        setSelectedEmployeeId(eId);
        const link = farmerEmployees.find(fe => fe.farmerId === plot.farmerId && fe.employeeId === eId);
        if (link && link.profitSharePct != null) {
            setEmpPct(link.profitSharePct);
        } else {
            setEmpPct(50);
        }
    };

    // Calculations
    const netWeight = Math.max(0, (parseFloat(weight) || 0) - (parseFloat(bucketWeight) || 0));
    const drcVal = parseFloat(drc) || 0;
    const basePriceVal = parseFloat(pricePerKg) || 0;

    let dryRubber = 0;
    if (rubberType === 'latex') {
        dryRubber = truncateOneDecimal(netWeight * (drcVal / 100));
    } else {
        dryRubber = netWeight;
    }

    const bonusDrc = calculateDrcBonus(drcVal, drcBonuses);
    const actualPrice = basePriceVal + bonusDrc;
    const totalAmount = dryRubber * actualPrice;

    const empPctVal = selectedEmployeeId ? (parseFloat(empPct) || 0) : 0;
    const employeeTotal = totalAmount * (empPctVal / 100);
    const farmerTotal = totalAmount - employeeTotal;

    const handleSubmit = async (shouldPrint = false) => {
        if (!weight || parseFloat(weight) <= 0) {
            toast.error('กรุณากรอกน้ำหนักน้ำยาง');
            return;
        }

        const selectedEmp = employees.find(e => e.id === selectedEmployeeId);

        const buyPayload = {
            farmerId: plot.farmerId,
            farmerName: farmer.name,
            employeeId: selectedEmployeeId || null,
            employeeName: selectedEmp ? selectedEmp.name : '',
            landPlotId: plot.id,
            landPlotName: plot.plotName || 'แปลงสวนยาง',
            weight: parseFloat(weight),
            bucketWeight: parseFloat(bucketWeight) || 0,
            drc: parseFloat(drc) || 0,
            pricePerKg: basePriceVal,
            basePrice: basePriceVal,
            bonusDrc: bonusDrc,
            actualPrice: actualPrice,
            total: totalAmount,
            dryRubber: dryRubber,
            empPct: empPctVal,
            employeeTotal: employeeTotal,
            farmerTotal: farmerTotal,
            rubberType: rubberType,
            date: new Date().toISOString().split('T')[0],
            status: 'Completed'
        };

        try {
            setSubmitting(true);
            await onSubmit(buyPayload, shouldPrint);
            onClose();
        } catch (err) {
            console.error('Error submitting quick buy:', err);
            toast.error('เกิดข้อผิดพลาดในการทำรายการ');
        } finally {
            setSubmitting(false);
        }
    };

    if (!plot) return null;

    return (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-rubber-600 via-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between shadow-md">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur">
                            <Scale size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">ทำรายการซื้อน้ำยาง (Map Quick Buy)</h3>
                            <p className="text-xs text-white/80">{plot.plotName || 'แปลงสวนยาง'} &bull; {farmer.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Form */}
                <div className="p-5 space-y-4 overflow-y-auto">
                    {/* Plot & Farmer Summary Banner */}
                    <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-3.5 space-y-1 text-xs">
                        <div className="flex justify-between items-center text-emerald-900">
                            <span className="font-medium text-gray-600">เจ้าของแปลง (เกษตรกร):</span>
                            <span className="font-bold text-sm text-emerald-950">{farmer.name}</span>
                        </div>
                        {plot.deedNumber && (
                            <div className="flex justify-between items-center text-gray-600">
                                <span>โฉนด / เอกสารสิทธิ์:</span>
                                <span className="font-medium text-gray-800">{plot.deedNumber} ({plot.deedType || 'น.ส.4'})</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-gray-600">
                            <span>พื้นที่สวนยาง:</span>
                            <span className="font-medium text-gray-800">{plot.rai || 0} ไร่ {plot.ngan || 0} งาน {plot.sqWah || 0} วา</span>
                        </div>
                    </div>

                    {/* Employee Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                            <span>คนกรีดยางประจำแปลงนี้</span>
                            {empPctVal > 0 && (
                                <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                                    ส่วนแบ่งคนกรีด: {empPctVal}%
                                </span>
                            )}
                        </label>
                        <select
                            value={selectedEmployeeId}
                            onChange={(e) => handleEmployeeChange(e.target.value)}
                            className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500 focus:bg-white transition-all"
                        >
                            <option value="">-- ไม่มีคนกรีด (เกษตรกรกรีดเอง 100%) --</option>
                            {availableEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Rubber Type & Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ชนิดยาง</label>
                            <select
                                value={rubberType}
                                onChange={(e) => setRubberType(e.target.value)}
                                className="w-full text-xs font-semibold p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rubber-500"
                            >
                                <option value="latex">น้ำยางสด (Latex)</option>
                                <option value="cup_lump">ยางก้อนถ้วย (Cup Lump)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ราคายางประจำวัน (บาท/กก.)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={pricePerKg}
                                onChange={(e) => setPricePerKg(e.target.value)}
                                className="w-full text-xs font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-rubber-700 focus:ring-2 focus:ring-rubber-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">น้ำหนักชั่ง (Kg)</label>
                            <input
                                type="number"
                                step="0.1"
                                placeholder="0.0"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="w-full text-sm font-bold p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">หักน้ำหนักถัง (Kg)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={bucketWeight}
                                onChange={(e) => setBucketWeight(e.target.value)}
                                className="w-full text-sm font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-rubber-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">% DRC (เปอร์เซ็นต์)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={drc}
                                onChange={(e) => setDrc(e.target.value)}
                                disabled={rubberType === 'cup_lump'}
                                className="w-full text-sm font-bold p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {/* Calculation Real-Time Summary Box */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 space-y-2.5 shadow-lg border border-slate-700">
                        <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-700 pb-2">
                            <span>น้ำหนักเนื้อยางแห้ง (Dry Rubber):</span>
                            <span className="font-mono font-bold text-emerald-400 text-sm">{dryRubber.toFixed(1)} กก.</span>
                        </div>

                        {bonusDrc > 0 && (
                            <div className="flex items-center justify-between text-xs text-amber-300">
                                <span>โบนัส DRC (+{bonusDrc} บาท):</span>
                                <span className="font-bold">ราคาจริง {actualPrice.toFixed(2)} บาท/กก.</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                            <span className="text-xs text-slate-300 font-medium">ยอดเงินรวมทั้งหมด:</span>
                            <span className="text-xl font-black text-amber-400">฿{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {/* Employee vs Farmer share breakdown */}
                        {selectedEmployeeId && (
                            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                                    <div className="text-slate-400 text-[11px] mb-0.5">ยอดเงินคนกรีด ({empPctVal}%):</div>
                                    <div className="font-bold text-emerald-400 text-sm">฿{employeeTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </div>
                                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                                    <div className="text-slate-400 text-[11px] mb-0.5">ยอดเงินเกษตรกร ({100 - empPctVal}%):</div>
                                    <div className="font-bold text-blue-400 text-sm">฿{farmerTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-all"
                    >
                        ยกเลิก
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSubmit(false)}
                        disabled={submitting}
                        className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
                    >
                        <CheckCircle size={16} />
                        <span>บันทึกธุรกรรม</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSubmit(true)}
                        disabled={submitting}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-all"
                    >
                        <Printer size={16} />
                        <span>บันทึก & พิมพ์ใบเสร็จ</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickBuyModal;
