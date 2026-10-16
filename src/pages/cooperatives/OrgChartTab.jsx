import React, { useState } from 'react';
import { 
    Users, Shield, Award, Edit3, DollarSign, Phone, CreditCard, 
    Briefcase, PlusCircle, CheckCircle, ChevronRight 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const OrgChartTab = ({ members = [], onUpdateMember, onOpenMemberModal }) => {
    const [editingAllowanceId, setEditingAllowanceId] = useState(null);
    const [allowanceVal, setAllowanceVal] = useState('');

    const positionMeta = {
        chairman: { label: 'ประธานกลุ่ม', color: 'bg-red-50 text-red-700 border-red-200', badge: 'bg-red-600 text-white', icon: '👑' },
        vice_chairman: { label: 'รองประธาน', color: 'bg-amber-50 text-amber-700 border-amber-200', badge: 'bg-amber-600 text-white', icon: '🥈' },
        treasurer: { label: 'เหรัญญิก', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', badge: 'bg-emerald-600 text-white', icon: '💰' },
        secretary: { label: 'เลขานุการ', color: 'bg-blue-50 text-blue-700 border-blue-200', badge: 'bg-blue-600 text-white', icon: '📝' },
        procurement: { label: 'กก. ฝ่ายรับซื้อ & QC', color: 'bg-teal-50 text-teal-700 border-teal-200', badge: 'bg-teal-600 text-white', icon: '⚖️' },
        auditor: { label: 'กก. ตรวจสอบภายใน', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', badge: 'bg-indigo-600 text-white', icon: '🔍' },
        advisor: { label: 'ที่ปรึกษากลุ่ม', color: 'bg-purple-50 text-purple-700 border-purple-200', badge: 'bg-purple-600 text-white', icon: '🎓' },
        member: { label: 'สมาชิกทั่วไป', color: 'bg-gray-50 text-gray-700 border-gray-200', badge: 'bg-gray-500 text-white', icon: '👤' }
    };

    // Filter board members vs regular members
    const boardPositions = ['chairman', 'vice_chairman', 'treasurer', 'secretary', 'procurement', 'auditor', 'advisor'];
    const boardMembers = members.filter(m => boardPositions.includes(m.orgPosition) && m.status === 'active');
    const regularMembers = members.filter(m => (!boardPositions.includes(m.orgPosition) || m.orgPosition === 'member') && m.status === 'active');

    // Calculate total monthly allowance
    const totalMonthlyAllowance = boardMembers.reduce((sum, m) => sum + Number(m.positionAllowance || 0), 0);

    const handleSaveAllowance = async (member) => {
        try {
            await onUpdateMember({
                ...member,
                positionAllowance: Number(allowanceVal) || 0
            });
            toast.success(`อัปเดตค่าตำแหน่ง ${member.name} สำเร็จ`);
            setEditingAllowanceId(null);
        } catch (err) {
            toast.error('อัปเดตล้มเหลว: ' + err.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm border border-white/10">
                        Organization Structure
                    </span>
                    <h2 className="text-xl md:text-2xl font-black mt-2 tracking-tight">ผังโครงสร้างคณะกรรมการและตำแหน่ง</h2>
                    <p className="text-emerald-200 text-xs md:text-sm font-medium mt-0.5">
                        บริหารจัดการบทบาท หน้าที่รับผิดชอบ และค่าตอบแทนตำแหน่งประจำของกลุ่ม
                    </p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right min-w-[200px]">
                    <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-widest block">ค่าตำแหน่งรวม/เดือน</span>
                    <span className="text-2xl font-black font-mono tracking-tight text-amber-300">
                        {totalMonthlyAllowance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs text-white">บ.</span>
                    </span>
                </div>
            </div>

            {/* Board Members Hierarchy Grid */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center">
                        <Award size={18} className="text-emerald-600 mr-2" />
                        คณะกรรมการดำเนินงาน ({boardMembers.length} ท่าน)
                    </h3>
                </div>

                {boardMembers.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-xs">
                        ยังไม่มีการแต่งตั้งคณะกรรมการ (สามารถคลิกแก้ไขสมาชิกในแท็บ "ทะเบียนสมาชิก" เพื่อกำหนดตำแหน่งได้)
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {boardMembers.map(member => {
                            const meta = positionMeta[member.orgPosition] || positionMeta.member;
                            const isEditing = editingAllowanceId === member.id;

                            return (
                                <div 
                                    key={member.id}
                                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                                >
                                    <div>
                                        {/* Position Badge */}
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center space-x-1.5 ${meta.color}`}>
                                                <span>{meta.icon}</span>
                                                <span>{meta.label}</span>
                                            </span>
                                            <span className="text-[11px] font-mono font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
                                                {member.memberNo}
                                            </span>
                                        </div>

                                        {/* Member Profile */}
                                        <h4 className="text-base font-black text-gray-900 group-hover:text-emerald-700 transition-colors">
                                            {member.name}
                                        </h4>
                                        <div className="mt-2 space-y-1 text-xs text-gray-500">
                                            {member.phone && (
                                                <div className="flex items-center">
                                                    <Phone size={13} className="text-gray-400 mr-1.5" />
                                                    <span className="font-mono">{member.phone}</span>
                                                </div>
                                            )}
                                            {member.bankAccount && (
                                                <div className="flex items-center">
                                                    <CreditCard size={13} className="text-gray-400 mr-1.5" />
                                                    <span>{member.bankName ? `${member.bankName} - ` : ''}<span className="font-mono">{member.bankAccount}</span></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Position Allowance Card */}
                                    <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center bg-gray-50/70 p-3 rounded-xl">
                                        <div className="flex-1 mr-2">
                                            <span className="text-[10px] font-bold text-gray-400 block uppercase">ค่าตำแหน่งประจำ</span>
                                            {isEditing ? (
                                                <div className="flex items-center space-x-1 mt-1">
                                                    <input 
                                                        type="number"
                                                        value={allowanceVal}
                                                        onChange={(e) => setAllowanceVal(e.target.value)}
                                                        className="w-24 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold font-mono"
                                                        placeholder="0"
                                                        autoFocus
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveAllowance(member)}
                                                        className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                                                    >
                                                        บันทึก
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingAllowanceId(null)}
                                                        className="px-2 py-1 bg-gray-200 text-gray-600 rounded-lg text-xs font-bold"
                                                    >
                                                        ยกเลิก
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-black text-gray-900 font-mono">
                                                    {Number(member.positionAllowance || 0).toLocaleString()} <span className="text-[10px] text-gray-400">บ./เดือน</span>
                                                </span>
                                            )}
                                        </div>
                                        {!isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingAllowanceId(member.id);
                                                    setAllowanceVal(String(member.positionAllowance || 0));
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                title="แก้ไขค่าตำแหน่ง"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quick Summary of All Members */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
                        <Users size={20} />
                    </div>
                    <div>
                        <h4 className="font-black text-gray-900">สมาชิกสามัญผู้ถือหุ้นทั้งหมด</h4>
                        <p className="text-gray-400">มีสมาชิกในระบบรวม {members.length} ท่าน (เป็นกรรมการ {boardMembers.length} ท่าน, สมาชิกทั่วไป {regularMembers.length} ท่าน)</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onOpenMemberModal}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center shadow-md shadow-emerald-200 transition-all text-xs"
                >
                    <PlusCircle size={15} className="mr-1.5" />
                    เพิ่ม / ดึงสมาชิกใหม่
                </button>
            </div>
        </div>
    );
};
