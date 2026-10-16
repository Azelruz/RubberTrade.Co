import React from 'react';
import { PiggyBank, ShieldCheck } from 'lucide-react';

export const MemberPortalProfileTab = ({
    member,
    store,
    isTapperOnly,
    isTapper
}) => {
    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Digital Smart Card Display */}
            <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest block">
                            {isTapperOnly 
                                ? 'บัตรประจำตัวคนกรีดยาง (Tapper Card)' 
                                : isTapper 
                                    ? 'บัตรสมาชิกกลุ่มสัจจะ & คนกรีดยาง (Member & Tapper Card)' 
                                    : 'บัตรสมาชิกดิจิทัล (Digital Member Card)'}
                        </span>
                        <h3 className="text-base font-black mt-0.5">
                            {store?.factoryName || 'กลุ่มเกษตรกรและสหกรณ์ยางพารา'}
                        </h3>
                    </div>
                    <div className="px-2.5 py-1 bg-white/20 rounded-xl text-[10px] font-bold backdrop-blur-xs">
                        {isTapperOnly ? 'คนกรีดยาง' : isTapper ? 'สมาชิก & คนกรีด' : (store?.stationCode ? `สถานี: ${store.stationCode}` : 'MEMBER')}
                    </div>
                </div>

                <div className="pt-2">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                        {isTapperOnly ? 'ชื่อคนกรีดยาง' : 'ชื่อสมาชิก'}
                    </span>
                    <h2 className="text-xl font-black text-white">{member?.name}</h2>
                    <span className="text-xs text-yellow-300 font-mono font-bold">
                        รหัส: {member?.memberNo}
                    </span>
                </div>

                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[11px] text-emerald-200">
                    <span>
                        ตำแหน่ง: {isTapperOnly 
                            ? `คนกรีดยาง (ส่วนแบ่ง ${member?.profitSharePct || 50}%)` 
                            : isTapper 
                                ? `คนกรีดยาง + ${member?.orgPosition === 'chairman' ? 'ประธานกลุ่ม' : member?.orgPosition === 'member' ? 'สมาชิกกลุ่ม' : member?.orgPosition} (ส่วนแบ่ง ${member?.profitSharePct || 50}%)`
                                : (member?.orgPosition === 'chairman' ? 'ประธานกลุ่ม' : member?.orgPosition === 'member' ? 'สมาชิกทั่วไป' : member?.orgPosition)}
                    </span>
                    <span>เข้ากลุ่มเมื่อ: {member?.joinedDate || '-'}</span>
                </div>
            </div>

            {/* Invitation for pure tappers to join coop savings */}
            {isTapperOnly && (
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-3xl shadow-sm text-xs space-y-1.5 border border-emerald-500/30">
                    <p className="font-black flex items-center gap-1.5 text-sm text-yellow-300">
                        <PiggyBank size={18} /> คนกรีดยางสามารถเปิดบัญชีเงินฝากสัจจะ & สมัครสมาชิกกลุ่มได้!
                    </p>
                    <p className="text-[11px] text-emerald-100 leading-relaxed">
                        เปิดสมุดสัจจะออมทรัพย์เพื่อออมเงินจากส่วนแบ่งค่ากรีดยาง, ถือหุ้นเพื่อรับเงินปันผลประจำปี และถอนเงินได้ตลอดเวลา สามารถแจ้งแอดมินหรือจุดรับซื้อเพื่อเปิดบัญชีได้ทันที
                    </p>
                </div>
            )}

            {/* Information Ledger List */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center">
                    <ShieldCheck size={15} className="mr-1.5 text-emerald-600" />
                    {isTapperOnly ? 'ข้อมูลคนกรีดยาง & บัญชีรับเงิน' : 'ข้อมูลทะเบียนสมาชิก & บัญชีรับเงิน'}
                </h4>

                <div className="divide-y divide-gray-100 text-xs">
                    <div className="py-2.5 flex justify-between">
                        <span className="text-gray-400">{isTapperOnly ? 'รหัสคนกรีดยาง' : 'รหัสสมาชิก'}</span>
                        <span className="font-mono font-bold text-gray-900">{member?.memberNo}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                        <span className="text-gray-400">สถานะความเชื่อมโยง</span>
                        <span className="font-bold text-emerald-700">
                            {isTapperOnly 
                                ? `คนกรีดยางในระบบ (รับส่วนแบ่ง ${member?.profitSharePct || 50}%)` 
                                : isTapper 
                                    ? `คนกรีดยาง + สมาชิกกลุ่มสัจจะออมทรัพย์ (ส่วนแบ่ง ${member?.profitSharePct || 50}%)`
                                    : member?.farmerId 
                                        ? 'เกษตรกรในระบบ (ขายยาง)' 
                                        : 'หุ้นส่วนภายนอก'}
                        </span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                        <span className="text-gray-400">เบอร์โทรศัพท์</span>
                        <span className="font-mono font-bold text-gray-900">{member?.phone || '-'}</span>
                    </div>
                    {member?.idCard && (
                        <div className="py-2.5 flex justify-between">
                            <span className="text-gray-400">เลขประจำตัวประชาชน</span>
                            <span className="font-mono text-gray-700">{member.idCard}</span>
                        </div>
                    )}
                    <div className="py-2.5 flex justify-between">
                        <span className="text-gray-400">บัญชีธนาคารสำหรับรับเงินโอน</span>
                        <span className="font-mono font-bold text-gray-900">
                            {member?.bankName || ''} {member?.bankAccount || '-'}
                        </span>
                    </div>
                    {member?.address && (
                        <div className="py-2.5 flex justify-between">
                            <span className="text-gray-400">ที่อยู่</span>
                            <span className="text-gray-700 text-right max-w-xs">{member.address}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MemberPortalProfileTab;
