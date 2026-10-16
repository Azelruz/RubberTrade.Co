import React from 'react';
import { QrCode, Copy, ExternalLink, Printer, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export const LandPlotQrModal = ({
    showModal,
    onClose,
    currentFarmer,
    farmerPlots,
    copiedLink,
    setCopiedLink
}) => {
    if (!showModal || !currentFarmer) return null;

    const portalUrl = `${window.location.origin}/farmer-portal?farmerId=${currentFarmer.id}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(portalUrl)}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(portalUrl);
        setCopiedLink(true);
        toast.success('คัดลอกลิงก์เรียบร้อย');
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center border border-gray-100">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                    <div className="flex items-center space-x-2 text-emerald-800">
                        <QrCode size={20} />
                        <h3 className="font-black text-base">พอร์ตัลสวนยางสำหรับเกษตรกร</h3>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <div className="font-black text-gray-900 text-lg">{currentFarmer.name}</div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                            รหัส: {currentFarmer.id} | มี {farmerPlots.length} แปลง
                        </div>
                    </div>

                    <div className="flex justify-center p-3 bg-white border-2 border-emerald-100 rounded-2xl shadow-inner inline-block">
                        <img
                            src={qrApiUrl}
                            alt="QR Code Farmer Portal"
                            className="w-48 h-48 rounded-lg"
                        />
                    </div>

                    <p className="text-xs text-gray-500 font-medium">
                        สแกน QR Code นี้ผ่านกล้องมือถือ เพื่อเปิดดูข้อมูลผลผลิต ใส่ปุ๋ย ตัดหญ้า และคำนวณกำไรย้อนหลัง
                    </p>

                    <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                        <input
                            type="text"
                            readOnly
                            value={portalUrl}
                            className="w-full text-xs font-mono bg-transparent text-gray-600 outline-hidden px-2"
                        />
                        <button
                            onClick={handleCopy}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shrink-0"
                        >
                            {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedLink ? 'ก๊อปแล้ว' : 'คัดลอก'}</span>
                        </button>
                    </div>

                    <div className="flex space-x-2 pt-2">
                        <a
                            href={portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all"
                        >
                            <ExternalLink size={15} />
                            <span>เปิดทดลองดู</span>
                        </a>
                        <button
                            onClick={() => window.print()}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 transition-all"
                        >
                            <Printer size={15} />
                            <span>พิมพ์ QR Code</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
