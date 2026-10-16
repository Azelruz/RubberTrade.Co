import React, { useState } from 'react';
import { PlusCircle, X, CheckCircle2, PiggyBank, BookPlus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const OpenAccountModal = ({ 
    members = [], 
    defaultMemberId = '', 
    settings = {}, 
    onOpenAccount, 
    onClose 
}) => {
    const [selectedMemberId, setSelectedMemberId] = useState(defaultMemberId || members[0]?.id || '');
    const [accountName, setAccountName] = useState('ออมทรัพย์สัจจะทั่วไป');
    const [accountType, setAccountType] = useState('savings');
    const [initialDeposit, setInitialDeposit] = useState('0');
    const [openedDate, setOpenedDate] = useState(new Date().toISOString().split('T')[0]);
    const [customAccountNo, setCustomAccountNo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedMember = members.find(m => m.id === selectedMemberId);

    const accountPresets = [
        'ออมทรัพย์สัจจะทั่วไป',
        'เงินออมเพื่อการศึกษาบุตร',
        'เงินฝากสวัสดิการ & ฌาปนกิจ',
        'เงินฝากเพื่อการลงทุนการเกษตร',
        'เงินฝากพิเศษประจำรอบปี'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedMemberId) return toast.error('กรุณาเลือกสมาชิก');
        if (!accountName.trim()) return toast.error('กรุณาระบุชื่อบัญชี');

        setIsSubmitting(true);
        try {
            const payload = {
                memberId: selectedMemberId,
                accountName: accountName.trim(),
                accountType,
                initialDeposit: parseFloat(initialDeposit) || 0,
                openedDate,
                customAccountNo: customAccountNo.trim()
            };

            await onOpenAccount(payload);
            toast.success(`เปิดสมุดบัญชี "${accountName}" ให้สมาชิกสำเร็จ`);
            onClose();
        } catch (err) {
            toast.error('เปิดบัญชีล้มเหลว: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
                    <div className="flex items-center space-x-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                            <BookPlus size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">
                                เปิดสมุดบัญชีเงินฝากเล่มใหม่
                            </h3>
                            <p className="text-[11px] text-emerald-800 font-medium">
                                เพิ่มสมุดบัญชีเงินฝากสัจจะให้แก่สมาชิก
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 flex items-center justify-center transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Member Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            เลือกสมาชิกเจ้าของบัญชี <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={selectedMemberId}
                            onChange={(e) => setSelectedMemberId(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                            required
                        >
                            <option value="" disabled>-- เลือกสมาชิก --</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.memberNo ? `[${m.memberNo}] ` : ''}{m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Account Name Presets */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            ชื่อสมุดบัญชีเงินฝาก <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            placeholder="ระบุชื่อบัญชี..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white text-gray-900 mb-2"
                            required
                        />
                        <div className="flex flex-wrap gap-1.5">
                            {accountPresets.map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setAccountName(preset)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                                        accountName === preset 
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Account Type & Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">ประเภทบัญชี</label>
                            <select
                                value={accountType}
                                onChange={(e) => setAccountType(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                            >
                                <option value="savings">ออมทรัพย์สัจจะ (Savings)</option>
                                <option value="fixed">เงินฝากประจำ (Fixed)</option>
                                <option value="welfare">กองทุนสวัสดิการ (Welfare)</option>
                                <option value="other">อื่นๆ (Other)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">วันที่เปิดบัญชี</label>
                            <input
                                type="date"
                                value={openedDate}
                                onChange={(e) => setOpenedDate(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                                required
                            />
                        </div>
                    </div>

                    {/* Initial Deposit */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            ยอดเงินฝากแรกเข้า (บาท)
                        </label>
                        <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0.00"
                            value={initialDeposit}
                            onChange={(e) => setInitialDeposit(e.target.value)}
                            className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-base font-black font-mono focus:ring-2 focus:ring-emerald-500 focus:bg-white text-gray-900"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">
                            * สามารถระบุเป็น 0 บาท หากยังไม่มีการฝากเงินทันที
                        </p>
                    </div>

                    {/* Account No Preview */}
                    {selectedMember && (
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                            <span className="text-[10px] text-gray-400 font-bold block uppercase">
                                รูปแบบเลขที่บัญชีอัตโนมัติ
                            </span>
                            <span className="font-mono font-bold text-emerald-700 text-sm">
                                SA-{selectedMember.memberNo}-XX
                            </span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 flex items-center justify-center transition-all"
                        >
                            {isSubmitting ? (
                                <RefreshCw size={15} className="animate-spin mr-1.5" />
                            ) : (
                                <CheckCircle2 size={15} className="mr-1.5" />
                            )}
                            {isSubmitting ? 'กำลังสร้างบัญชี...' : 'ยืนยันเปิดสมุดบัญชีเงินฝาก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OpenAccountModal;
