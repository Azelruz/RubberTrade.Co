import React, { useState } from 'react';
import { 
    FileCode, ExternalLink, Download, Layers, ShieldCheck, 
    Copy, Check, Code, Terminal, Sparkles, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ApiDocsTab = () => {
    const [copiedSnippet, setCopiedSnippet] = useState(null);

    const handleCopy = (text, key) => {
        navigator.clipboard.writeText(text);
        setCopiedSnippet(key);
        toast.success('คัดลอกโค้ดตัวอย่างแล้ว');
        setTimeout(() => setCopiedSnippet(null), 2000);
    };

    const curlSnippet = `curl -X GET "https://rubertrade-padang.pages.dev/api/buys?startDate=2026-10-05" \\
  -H "Authorization: Bearer <YOUR_SUPABASE_JWT_TOKEN>" \\
  -H "Content-Type: application/json"`;

    const jsSnippet = `const response = await fetch('/api/buys', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date: '2026-10-05',
    farmerId: 'F-001',
    rubberType: 'latex',
    weight: 150.0,
    bucketWeight: 4.5,
    drc: 34.5,
    actualPrice: 78.5
  })
});
const result = await response.json();
console.log(result);`;

    const pythonSnippet = `import requests

url = "https://rubertrade-padang.pages.dev/api/buys"
headers = {
    "Authorization": "Bearer <YOUR_SUPABASE_JWT_TOKEN>",
    "Content-Type": "application/json"
}
response = requests.get(url, headers=headers)
print(response.json())`;

    return (
        <div className="space-y-6">
            {/* Hero Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-700/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                            <Sparkles size={14} />
                            OpenAPI 3.0 & Swagger Specification
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">RubberTrade API Documentation</h2>
                        <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                            คู่มือมาตรฐานสำหรับการเชื่อมต่อระบบรับซื้อยางพารา, สหกรณ์, สัจจะออมทรัพย์, คิวชั่งดิจิทัล และอุปกรณ์ IoT รองรับทั้ง Scalar UI, Swagger UI และ OpenAPI JSON Schema
                        </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
                        <a 
                            href="/api-docs/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5"
                        >
                            <ExternalLink size={16} />
                            เปิด Interactive Docs
                        </a>
                        <a 
                            href="/swagger.html" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-600 transition-colors"
                        >
                            <BookOpen size={16} />
                            Swagger UI
                        </a>
                        <a 
                            href="/openapi.json" 
                            download="rubbertrade-openapi.json"
                            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-600 transition-colors"
                            title="ดาวน์โหลด openapi.json"
                        >
                            <Download size={16} />
                            JSON
                        </a>
                    </div>
                </div>

                {/* API Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/60">
                    <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
                        <div className="text-xs text-slate-400 font-medium">Endpoints ทั้งหมด</div>
                        <div className="text-2xl font-black text-emerald-400 mt-1">48 Routes</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
                        <div className="text-xs text-slate-400 font-medium">หมวดหมู่ระบบ</div>
                        <div className="text-2xl font-black text-white mt-1">14 หมวด</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
                        <div className="text-xs text-slate-400 font-medium">ระบบยืนยันตัวตน</div>
                        <div className="text-2xl font-black text-blue-400 mt-1">JWT Bearer</div>
                    </div>
                    <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/40">
                        <div className="text-xs text-slate-400 font-medium">ความเข้ากันได้</div>
                        <div className="text-2xl font-black text-amber-400 mt-1">OpenAPI 3.0</div>
                    </div>
                </div>
            </div>

            {/* Integration Guide & Code Samples */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Code size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900">ตัวอย่างการเรียกใช้งาน API (Quick Start)</h3>
                        <p className="text-xs text-gray-500">การส่ง Authentication Header และคำขอรับ-ส่งข้อมูล</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* cURL */}
                    <div className="rounded-2xl bg-slate-900 text-slate-100 overflow-hidden border border-slate-800">
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-xs font-mono text-slate-400">
                            <span className="flex items-center gap-1.5"><Terminal size={14} /> cURL</span>
                            <button 
                                onClick={() => handleCopy(curlSnippet, 'curl')}
                                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                            >
                                {copiedSnippet === 'curl' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                {copiedSnippet === 'curl' ? 'คัดลอกแล้ว' : 'คัดลอก'}
                            </button>
                        </div>
                        <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">{curlSnippet}</pre>
                    </div>

                    {/* JavaScript Fetch */}
                    <div className="rounded-2xl bg-slate-900 text-slate-100 overflow-hidden border border-slate-800">
                        <div className="flex justify-between items-center px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-xs font-mono text-slate-400">
                            <span className="flex items-center gap-1.5"><Code size={14} /> JavaScript (Fetch)</span>
                            <button 
                                onClick={() => handleCopy(jsSnippet, 'js')}
                                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                            >
                                {copiedSnippet === 'js' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                {copiedSnippet === 'js' ? 'คัดลอกแล้ว' : 'คัดลอก'}
                            </button>
                        </div>
                        <pre className="p-4 text-xs font-mono text-amber-200 overflow-x-auto leading-relaxed">{jsSnippet}</pre>
                    </div>
                </div>
            </div>

            {/* Embedded Interactive Viewer Frame */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 sm:px-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <Layers size={18} className="text-gray-500" />
                        <span className="text-sm font-bold text-gray-800">ตัวอย่างเอกสาร Interactive API Reference</span>
                    </div>
                    <a 
                        href="/api-docs/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                    >
                        ขยายเต็มหน้าจอ <ExternalLink size={14} />
                    </a>
                </div>
                <div className="w-full h-[650px] bg-slate-950">
                    <iframe 
                        src="/api-docs/index.html" 
                        title="RubberTrade API Documentation" 
                        className="w-full h-full border-0"
                    />
                </div>
            </div>
        </div>
    );
};

export default ApiDocsTab;
