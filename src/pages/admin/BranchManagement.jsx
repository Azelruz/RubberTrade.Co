import React, { useState, useEffect } from 'react';
import { 
    adminFetchBranches, 
    adminRegisterBranch, 
    adminDeleteBranch, 
    adminToggleBranchStatus 
} from '../../services/apiService';
import { 
    GitBranch, Globe, Database, ShieldCheck, Plus, CheckCircle2, 
    ExternalLink, Copy, Check, RefreshCw, Terminal, Layers, 
    AlertTriangle, Server, Trash2, ArrowUpRight, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export const BranchManagement = () => {
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [healthStatus, setHealthStatus] = useState({});
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);

    // Form modal / create state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        code: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadBranches();
    }, []);

    const loadBranches = async () => {
        setLoading(true);
        try {
            const data = await adminFetchBranches();
            if (Array.isArray(data)) {
                setBranches(data);
                checkAllHealth(data);
            } else if (data?.data && Array.isArray(data.data)) {
                setBranches(data.data);
                checkAllHealth(data.data);
            }
        } catch (error) {
            console.error('Failed to load branches:', error);
            toast.error('ไม่สามารถโหลดข้อมูลสาขาได้');
        } finally {
            setLoading(false);
        }
    };

    const checkAllHealth = async (branchList) => {
        setIsCheckingHealth(true);
        const statuses = {};
        for (const b of branchList) {
            try {
                const res = await fetch(`${b.url}/api/member_portal/public`, { method: 'HEAD', cache: 'no-cache' });
                statuses[b.slug] = res.ok || res.status === 404 || res.status === 401 ? 'online' : 'error';
            } catch (err) {
                // CORS or network
                statuses[b.slug] = 'reachable';
            }
        }
        setHealthStatus(statuses);
        setIsCheckingHealth(false);
    };

    const handleCopy = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        toast.success('คัดลอกลงคลิปบอร์ดแล้ว!');
        setTimeout(() => setCopiedIndex(null), 2500);
    };

    const handleRegisterBranch = async (e) => {
        e.preventDefault();
        const slug = formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const code = formData.code.trim().toUpperCase();
        const name = formData.name.trim();

        if (!slug || !code || !name) {
            toast.error('กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                slug,
                name,
                code,
                project: `rubertrade-${slug}`,
                url: `https://rubertrade-${slug}.pages.dev`,
                database: `rubertrade-${slug}-db`,
                status: 'active'
            };

            await adminRegisterBranch(payload);
            toast.success(`ลงทะเบียนสาขา ${name} สำเร็จ!`);
            setShowCreateModal(false);
            setFormData({ name: '', slug: '', code: '' });
            await loadBranches();
        } catch (error) {
            console.error('Error creating branch:', error);
            toast.error(error.message || 'บันทึกสาขาไม่สำเร็จ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (slug) => {
        try {
            await adminToggleBranchStatus(slug);
            toast.success('เปลี่ยนสถานะสาขาเรียบร้อย');
            loadBranches();
        } catch (err) {
            toast.error('เปลี่ยนสถานะไม่สำเร็จ: ' + err.message);
        }
    };

    const handleDeleteBranch = async (slug, branchName) => {
        if (slug === 'main') {
            toast.error('ไม่สามารถลบสาขาหลักได้');
            return;
        }
        if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบสาขา "${branchName}" ออกจากรายชื่อ? (ฐานข้อมูลและ Cloudflare Project จะยังคงอยู่ แต่จะถูกตัดออกจากระบบแดชบอร์ด)`)) {
            return;
        }

        try {
            await adminDeleteBranch(slug);
            toast.success(`ลบสาขา ${branchName} ออกจากรายการแล้ว`);
            loadBranches();
        } catch (err) {
            toast.error('ลบสาขาไม่สำเร็จ: ' + err.message);
        }
    };

    const liveProject = formData.slug ? `rubertrade-${formData.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')}` : 'rubertrade-[slug]';
    const liveUrl = `https://${liveProject}.pages.dev`;
    const liveDb = `${liveProject}-db`;
    const oneClickCommand = `npm run branch:create -- --slug="${formData.slug || 'example'}" --code="${formData.code || 'EXP'}" --name="${formData.name || 'สาขาตัวอย่าง'}"`;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <ShieldCheck size={14} /> Super Admin Only
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            Multi-Tenant Isolated Architecture
                        </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 mt-2 flex items-center gap-3">
                        <GitBranch className="text-rubber-600" size={32} />
                        ระบบจัดการสาขา (Multi-Branch Engine)
                    </h1>
                    <p className="text-gray-600 text-sm mt-1">
                        บริหารจัดการสาขาอิสระ แต่ละสาขามี Cloudflare Pages URL และฐานข้อมูล D1 ส่วนตัวแยกเด็ดขาด 100%
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadBranches}
                        disabled={loading}
                        className="p-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition"
                        title="รีเฟรชข้อมูล"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-rubber-600 hover:bg-rubber-700 text-white font-medium rounded-lg shadow-sm transition transform hover:-translate-y-0.5"
                    >
                        <Plus size={18} />
                        เปิดสาขาใหม่ (1-Click Branch)
                    </button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rubber-50 text-rubber-600 flex items-center justify-center font-bold">
                        <Globe size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">สาขาทั้งหมดในระบบ</div>
                        <div className="text-2xl font-black text-gray-900">{branches.length} <span className="text-xs font-normal text-gray-500">สาขา</span></div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Activity size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">สาขาที่เปิดให้บริการ</div>
                        <div className="text-2xl font-black text-emerald-600">
                            {branches.filter(b => b.status === 'active').length} <span className="text-xs font-normal text-gray-500">สาขา</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Database size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">ฐานข้อมูล D1 อิสระ</div>
                        <div className="text-2xl font-black text-blue-600">{branches.length} <span className="text-xs font-normal text-gray-500">DBs</span></div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <Server size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-medium">Pages Deployment</div>
                        <div className="text-2xl font-black text-purple-600">100% <span className="text-xs font-normal text-gray-500">Automated</span></div>
                    </div>
                </div>
            </div>

            {/* Quick Automation Guide Banner */}
            <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white rounded-2xl p-6 shadow-md border border-gray-800">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-rubber-400 font-semibold text-sm">
                            <Terminal size={18} /> 
                            <span>คำสั่ง CLI Automation สำหรับ Super Admin</span>
                        </div>
                        <h3 className="text-xl font-bold">Deploy ทุกสาขาพร้อมกัน หรือสร้างสาขาใหม่อัตโนมัติ</h3>
                        <p className="text-gray-300 text-sm max-w-2xl">
                            เมื่อมีการอัปเดตระบบโค้ดใหม่ คุณสามารถรันคำสั่งเพียงบรรทัดเดียวเพื่อ Deploy ทุกสาขาทั่วประเทศให้อัปเดตเวอร์ชันล่าสุดได้ทันที
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => handleCopy('npm run branch:deploy-all', 'deploy-all')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-rubber-600 hover:bg-rubber-700 text-white text-xs font-mono rounded-lg transition"
                        >
                            {copiedIndex === 'deploy-all' ? <Check size={14} /> : <Copy size={14} />}
                            npm run branch:deploy-all
                        </button>
                        <button
                            onClick={() => handleCopy('npm run branch:list', 'list')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-mono rounded-lg transition"
                        >
                            {copiedIndex === 'list' ? <Check size={14} /> : <Copy size={14} />}
                            npm run branch:list
                        </button>
                    </div>
                </div>
            </div>

            {/* Branch Cards List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Layers size={20} className="text-gray-500" />
                        รายชื่อสาขาที่เปิดให้บริการ ({branches.length})
                    </h2>
                    <span className="text-xs text-gray-500">
                        {isCheckingHealth ? 'กำลังตรวจเช็คการเชื่อมต่อสาขา...' : 'สถานะระบบทั้งหมดออนไลน์ปกติ'}
                    </span>
                </div>

                {loading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                        <RefreshCw className="animate-spin mx-auto mb-3 text-rubber-600" size={32} />
                        กำลังโหลดข้อมูลสาขา...
                    </div>
                ) : branches.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                        ยังไม่มีสาขาที่ลงทะเบียน กรุณากดปุ่ม "เปิดสาขาใหม่"
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {branches.map((b, idx) => (
                            <div 
                                key={b.slug}
                                className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                            >
                                <div className="space-y-4">
                                    {/* Top Bar of Card */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-blue-100 text-blue-800">
                                                    {b.code}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                    !b.databaseId
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                        : b.status === 'active' 
                                                            ? 'bg-emerald-100 text-emerald-800' 
                                                            : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {!b.databaseId ? '🟡 รอสร้าง D1 & Pages บน Cloudflare' : b.status === 'active' ? 'เปิดใช้งาน' : 'ปิดปรับปรุง'}
                                                </span>
                                                {b.slug === 'main' && (
                                                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                                                        สำนักงานใหญ่
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mt-1">{b.name}</h3>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleToggleStatus(b.slug)}
                                                className="px-2.5 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-100 transition text-gray-700"
                                                title="สลับสถานะ"
                                            >
                                                {b.status === 'active' ? 'พักระบบ' : 'เปิดระบบ'}
                                            </button>
                                            {b.slug !== 'main' && (
                                                <button
                                                    onClick={() => handleDeleteBranch(b.slug, b.name)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                                                    title="ลบออกจากระบบ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Info Grid */}
                                    <div className="bg-gray-50 rounded-xl p-3.5 space-y-2.5 text-xs text-gray-600">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 font-medium">Domain / URL:</span>
                                            <div className="flex items-center gap-1.5 font-mono">
                                                <a 
                                                    href={b.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-rubber-600 hover:underline flex items-center gap-1 font-semibold"
                                                >
                                                    {b.url.replace('https://', '')}
                                                    <ArrowUpRight size={13} />
                                                </a>
                                                <button
                                                    onClick={() => handleCopy(b.url, `url-${idx}`)}
                                                    className="text-gray-400 hover:text-gray-700 p-0.5"
                                                    title="คัดลอก URL"
                                                >
                                                    {copiedIndex === `url-${idx}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 font-medium">Pages Project:</span>
                                            <span className="font-mono text-gray-800 font-semibold">{b.project}</span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 font-medium">Database (D1):</span>
                                            <div className="flex items-center gap-1 font-mono text-gray-800">
                                                <Database size={13} className="text-blue-500" />
                                                <span>{b.database}</span>
                                            </div>
                                        </div>

                                        {b.databaseId && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-500 font-medium">Database UUID:</span>
                                                <span className="font-mono text-[11px] text-gray-500 truncate max-w-[200px]" title={b.databaseId}>
                                                    {b.databaseId}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Quick Actions */}
                                {!b.databaseId ? (
                                    <div className="mt-5 pt-3 border-t border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50/70 p-2.5 rounded-xl">
                                        <div className="text-[11px] text-amber-900 flex items-center gap-1 font-medium">
                                            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                                            <span>ลงทะเบียนแล้ว แต่ยังไม่ได้สร้าง D1 & Deploy บน Cloudflare</span>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(`npm run branch:create -- --slug="${b.slug}" --code="${b.code}" --name="${b.name}"`, `create-${idx}`)}
                                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rubber-600 hover:bg-rubber-700 text-white px-2.5 py-1.5 rounded-lg shadow-sm transition whitespace-nowrap self-start sm:self-auto"
                                            title="คัดลอกคำสั่งเพื่อสั่งรันสร้างระบบ"
                                        >
                                            {copiedIndex === `create-${idx}` ? <Check size={12} /> : <Terminal size={12} />}
                                            คัดลอกคำสั่งสร้าง (หรือแจ้ง AI)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <button
                                            onClick={() => handleCopy(`npm run branch:deploy -- --slug=${b.slug}`, `dep-${idx}`)}
                                            className="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600 hover:text-rubber-700 hover:bg-gray-100 px-2 py-1 rounded transition"
                                            title="คัดลอกคำสั่ง Deploy สาขานี้"
                                        >
                                            {copiedIndex === `dep-${idx}` ? <Check size={13} className="text-emerald-600" /> : <Terminal size={13} />}
                                            Deploy สาขานี้
                                        </button>

                                        <a
                                            href={b.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rubber-50 text-rubber-700 hover:bg-rubber-100 font-medium text-xs rounded-lg transition"
                                        >
                                            เข้าใช้งานสาขา
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Branch Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 space-y-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Plus className="text-rubber-600" />
                                    ลงทะเบียนสาขาใหม่ (Register Branch)
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    กำหนดชื่อสาขา, รหัสสถานี และ URL เพื่อเตรียมระบบโครงสร้างพื้นฐาน Cloudflare
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleRegisterBranch} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    ชื่อสาขาภาษาไทย <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="เช่น สาขาสุราษฎร์ธานี หรือ สาขาหาดใหญ่"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rubber-500 focus:border-rubber-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        URL Slug (ภาษาอังกฤษ) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="เช่น surat หรือ hatyai"
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rubber-500 focus:border-rubber-500 outline-none font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        รหัสสถานี (Station Code) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="เช่น SRT หรือ HYI"
                                        maxLength={6}
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rubber-500 focus:border-rubber-500 outline-none font-mono uppercase"
                                    />
                                </div>
                            </div>

                            {/* Live Architecture Preview */}
                            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono space-y-2">
                                <div className="text-gray-400 font-bold mb-1 flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                    การตั้งค่าที่จะถูกสร้างโดยอัตโนมัติ:
                                </div>
                                <div className="text-gray-300">🌐 URL: <span className="text-amber-300">{liveUrl}</span></div>
                                <div className="text-gray-300">🗄️ Database: <span className="text-blue-300">{liveDb}</span> (42 Tables Clean)</div>
                                <div className="text-gray-300">🏢 Station: <span className="text-emerald-300">[{formData.code || 'CODE'}] {formData.name || 'ชื่อสาขา'}</span></div>
                            </div>

                            {/* CLI Automation Option */}
                            {/* CLI Automation Option */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-2">
                                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                                    <Terminal size={15} /> 
                                    วิธีสร้าง Cloudflare D1 & Pages จริงแบบสมบูรณ์ 100%:
                                </div>
                                <div className="space-y-1 text-blue-800">
                                    <p>• <b>วิธีที่ 1 (ง่ายที่สุด):</b> เพียงพิมพ์บอก AI Assistant ในแชทว่า <span className="font-bold text-rubber-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">"สร้างสาขา {formData.name || '...'} เลย"</span> ระบบจะสร้าง D1, ลง 42 ตาราง, และ Deploy ให้ทันทีโดยไม่ต้องเปิด Terminal!</p>
                                    <p>• <b>วิธีที่ 2 (ผ่าน Terminal):</b> คัดลอกคำสั่งด้านล่างนี้ไปรันใน Terminal ด้วยตนเอง:</p>
                                </div>
                                <div className="flex items-center gap-2 bg-blue-100/80 p-2 rounded font-mono text-[11px] text-blue-950 overflow-x-auto">
                                    <span className="flex-1 select-all">{oneClickCommand}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(oneClickCommand, 'modal-cli')}
                                        className="p-1 hover:bg-blue-200 rounded transition"
                                        title="คัดลอกคำสั่ง"
                                    >
                                        {copiedIndex === 'modal-cli' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-rubber-600 hover:bg-rubber-700 text-white font-medium text-sm rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    บันทึกข้อมูลสาขาลงระบบ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BranchManagement;
