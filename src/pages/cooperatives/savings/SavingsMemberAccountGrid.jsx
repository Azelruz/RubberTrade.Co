import React from 'react';
import { Users, QrCode, BookPlus, ChevronRight } from 'lucide-react';

export const SavingsMemberAccountGrid = ({
    members = [],
    accounts = [],
    onOpenPassbook,
    onSetQrMember,
    onOpenAccountForMember
}) => {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center">
                    <Users size={15} className="mr-1.5 text-emerald-600" />
                    รายชื่อสมาชิก & บัญชีเงินฝากสัจจะ (คลิกเพื่อดูสมุดบัญชี)
                </h4>
                <span className="text-[11px] text-gray-400">
                    แสดงสมาชิกทั้งหมด {members.length} ราย
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {members.map(m => {
                    const bal = Number(m.savingsBalance || 0);
                    const memAccs = accounts.filter(a => a.memberId === m.id && a.status !== 'closed');
                    return (
                        <div 
                            key={m.id}
                            className={`p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                                bal > 0 
                                    ? 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-100/50 hover:border-emerald-300' 
                                    : 'bg-gray-50/50 border-gray-100 hover:bg-gray-100/80'
                            }`}
                        >
                            <div className="truncate mr-2 cursor-pointer flex-1" onClick={() => onOpenPassbook(m)}>
                                <div className="font-bold text-gray-900 truncate flex items-center">
                                    <span className="font-mono text-[10px] text-gray-400 mr-1.5">{m.memberNo || '-'}</span>
                                    {m.name}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5 font-mono flex items-center gap-1.5">
                                    <span>{memAccs.length > 0 ? `${memAccs.length} สมุดบัญชี` : `SA-${m.memberNo || '000'}`}</span>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 flex flex-col items-end">
                                <span className={`font-mono font-bold block ${bal > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                                    {bal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                                </span>
                                <div className="flex items-center gap-1 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => onSetQrMember(m)}
                                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                        title="ดู QR Code บัตรสมาชิก / สมุดเงินฝากดิจิทัล"
                                    >
                                        <QrCode size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onOpenAccountForMember(m.id)}
                                        className="p-1 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded"
                                        title="เปิดสมุดบัญชีเพิ่มให้สมาชิกคนนี้"
                                    >
                                        <BookPlus size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onOpenPassbook(m)}
                                        className="text-[10px] text-emerald-600 font-bold hover:underline inline-flex items-center pl-0.5"
                                    >
                                        ดูสมุด <ChevronRight size={10} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SavingsMemberAccountGrid;
