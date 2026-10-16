import React, { useState } from 'react';
import { 
    QrCode, X, Printer, Copy, Check, ExternalLink, 
    PiggyBank, Coins, User, Building2, ShieldCheck, Award 
} from 'lucide-react';
import toast from 'react-hot-toast';

export const MemberQRModal = ({ member, accounts = [], settings = {}, onClose }) => {
    const [copied, setCopied] = useState(false);

    if (!member) return null;

    const portalUrl = `${window.location.origin}/member-portal?id=${member.id}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(portalUrl)}`;

    const memberAccounts = accounts.filter(a => a.memberId === member.id && a.status === 'active');

    const handleCopy = () => {
        navigator.clipboard.writeText(portalUrl);
        setCopied(true);
        toast.success('คัดลอกลิงก์พอร์ทัลสมาชิกสำเร็จ');
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        const win = window.open('', '', 'width=700,height=700');
        win.document.write(`
            <html>
                <head>
                    <title>บัตรสมาชิก - ${member.name} (${member.memberNo})</title>
                    <style>
                        @page { size: auto; margin: 10mm; }
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Prompt', sans-serif; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            padding: 20px; 
                            margin: 0;
                            background: #f8fafc;
                        }
                        .member-card {
                            width: 380px;
                            background: linear-gradient(135deg, #065f46 0%, #0f766e 100%);
                            color: white;
                            padding: 24px;
                            border-radius: 20px;
                            box-shadow: 0 10px 25px -5px rgba(6, 95, 70, 0.4);
                            position: relative;
                            overflow: hidden;
                            box-sizing: border-box;
                        }
                        .card-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            border-bottom: 1px solid rgba(255,255,255,0.2);
                            padding-bottom: 12px;
                            margin-bottom: 16px;
                        }
                        .store-name {
                            font-size: 14px;
                            font-weight: 800;
                            margin: 0;
                        }
                        .card-title {
                            font-size: 10px;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            color: #a7f3d0;
                        }
                        .card-body {
                            display: flex;
                            gap: 16px;
                            align-items: center;
                        }
                        .qr-box {
                            background: white;
                            padding: 8px;
                            border-radius: 12px;
                            width: 110px;
                            height: 110px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                        }
                        .qr-box img {
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                        }
                        .member-info {
                            flex: 1;
                        }
                        .member-name {
                            font-size: 16px;
                            font-weight: 800;
                            margin: 0 0 4px 0;
                            line-height: 1.2;
                        }
                        .member-no {
                            font-family: monospace;
                            font-size: 13px;
                            font-weight: 700;
                            color: #fef08a;
                            margin: 0 0 8px 0;
                        }
                        .info-row {
                            font-size: 11px;
                            color: #d1fae5;
                            margin: 2px 0;
                        }
                        .card-footer {
                            margin-top: 16px;
                            padding-top: 10px;
                            border-top: 1px solid rgba(255,255,255,0.15);
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            font-size: 9px;
                            color: #a7f3d0;
                        }
                        .instruction {
                            margin-top: 20px;
                            text-align: center;
                            font-size: 12px;
                            color: #64748b;
                        }
                    </style>
                </head>
                <body>
                    <div class="member-card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">บัตรสมาชิกกลุ่ม & สัจจะออมทรัพย์</div>
                                <h2 class="store-name">${settings.factoryName || 'กลุ่มเกษตรกรและสหกรณ์ยางพารา'}</h2>
                            </div>
                            <div style="font-size: 10px; font-weight: bold; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 8px;">
                                ${settings.station_code ? `สถานี: ${settings.station_code}` : 'MEMBER'}
                            </div>
                        </div>

                        <div class="card-body">
                            <div class="qr-box">
                                <img src="${qrImageUrl}" alt="Member QR Code" />
                            </div>
                            <div class="member-info">
                                <p class="member-name">${member.name}</p>
                                <p class="member-no">รหัส: ${member.memberNo}</p>
                                <p class="info-row">ตำแหน่ง: ${member.orgPosition === 'chairman' ? 'ประธาน' : member.orgPosition === 'member' ? 'สมาชิกทั่วไป' : member.orgPosition}</p>
                                <p class="info-row">สมุดเงินฝาก: ${memberAccounts.length} เล่ม</p>
                                <p class="info-row">ทุนเรือนหุ้น: ${Number(member.totalShares || 0).toLocaleString()} หุ้น</p>
                            </div>
                        </div>

                        <div class="card-footer">
                            <span>วันที่เข้ากลุ่ม: ${member.joinedDate || '-'}</span>
                            <span>RubberTrade Member Portal</span>
                        </div>
                    </div>

                    <p class="instruction">
                        📲 ใช้กล้องมือถือ หรือแอป LINE สแกน QR Code เพื่อเปิดดูสมุดเงินฝากและข้อมูลสมาชิก
                    </p>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        win.document.close();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center space-x-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <QrCode size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">
                                บัตรสมาชิกดิจิทัล & QR Code
                            </h3>
                            <p className="text-[11px] text-gray-400">
                                สแกนเปิดดูสมุดเงินฝาก หุ้น และปันผลในมือถือ
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

                {/* Digital Card Preview Area */}
                <div className="p-6 overflow-y-auto space-y-4">
                    {/* Visual Card */}
                    <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-start border-b border-white/20 pb-3 mb-4">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                                    บัตรสมาชิกกลุ่ม & สัจจะออมทรัพย์
                                </span>
                                <h4 className="text-sm font-black text-white">
                                    {settings.factoryName || 'กลุ่มเกษตรกรและสหกรณ์ยางพารา'}
                                </h4>
                            </div>
                            <span className="px-2 py-0.5 bg-white/20 rounded-lg text-[10px] font-mono font-bold">
                                {settings.station_code ? `สถานี: ${settings.station_code}` : 'MEMBER'}
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* QR Box */}
                            <div className="bg-white p-2.5 rounded-2xl shadow-md shrink-0">
                                <img
                                    src={qrImageUrl}
                                    alt="QR Code"
                                    className="w-24 h-24 object-contain"
                                />
                            </div>

                            {/* Info */}
                            <div className="space-y-1 min-w-0 flex-1">
                                <h3 className="font-black text-white text-base truncate">
                                    {member.name}
                                </h3>
                                <div className="font-mono text-xs font-bold text-yellow-300">
                                    รหัส: {member.memberNo}
                                </div>
                                <div className="text-[11px] text-emerald-200 flex items-center">
                                    <PiggyBank size={12} className="mr-1" />
                                    เงินฝากรวม: {Number(member.savingsBalance || 0).toLocaleString()} บ.
                                </div>
                                <div className="text-[11px] text-emerald-200 flex items-center">
                                    <Coins size={12} className="mr-1" />
                                    หุ้น: {Number(member.totalShares || 0).toLocaleString()} หุ้น
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-2.5 border-t border-white/10 flex justify-between items-center text-[10px] text-emerald-200">
                            <span>สมุดเงินฝาก: {memberAccounts.length} บัญชี</span>
                            <span>RubberTrade Member Portal</span>
                        </div>
                    </div>

                    {/* Member Accounts List */}
                    {memberAccounts.length > 0 && (
                        <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                                สมุดบัญชีเงินฝากของสมาชิก ({memberAccounts.length} เล่ม):
                            </span>
                            <div className="space-y-1 max-h-36 overflow-y-auto">
                                {memberAccounts.map(acc => (
                                    <div key={acc.id} className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
                                        <div>
                                            <span className="font-bold text-gray-800">{acc.accountName}</span>
                                            <span className="font-mono text-[10px] text-gray-400 block">{acc.accountNo}</span>
                                        </div>
                                        <span className="font-mono font-bold text-emerald-700">
                                            {Number(acc.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} บ.
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Direct Link Input */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">
                            ลิงก์ตรงสำหรับเปิดดูในมือถือ (ส่งทาง SMS หรือแชทได้):
                        </label>
                        <div className="flex items-center space-x-1.5">
                            <input
                                type="text"
                                readOnly
                                value={portalUrl}
                                className="w-full text-xs font-mono p-2.5 bg-gray-50 border border-gray-200 rounded-xl select-all focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs shrink-0 transition-all flex items-center space-x-1"
                            >
                                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => window.open(portalUrl, '_blank')}
                        className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all flex items-center"
                    >
                        <ExternalLink size={14} className="mr-1.5" />
                        เปิดดูตัวอย่างบนเว็บ
                    </button>

                    <div className="flex items-center space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                        >
                            ปิด
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center"
                        >
                            <Printer size={15} className="mr-1.5" />
                            พิมพ์บัตรสมาชิก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberQRModal;
