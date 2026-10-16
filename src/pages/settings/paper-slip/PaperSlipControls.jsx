import React from 'react';
import { 
    Edit3, Printer, Smartphone, Store, Type, Save, RefreshCw 
} from 'lucide-react';

export const PaperSlipControls = ({
    activeTemplate,
    activePlatform,
    setActivePlatform,
    activeSub,
    handleUpdateActiveTemplate,
    activeFontCategory,
    setActiveFontCategory,
    fontSizeCategories,
    fontSizeControls,
    toggleItems,
    handleToggle,
    handleUpdateLabel,
    handleSave,
    saving
}) => {
    return (
        <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Editor Header */}
                <div className="px-6 py-4 bg-gray-900 flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-white">
                        <Edit3 className="text-rubber-400" size={18} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Editing Template</span>
                            <h3 className="text-xs font-black uppercase tracking-widest">{activeTemplate.name}</h3>
                        </div>
                    </div>
                    
                    {/* Platform Switcher */}
                    <div className="flex items-center space-x-1 p-1 bg-white/10 rounded-xl">
                        <button 
                            onClick={() => setActivePlatform('paper')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activePlatform === 'paper' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
                        >
                            <Printer size={14} /> Paper
                        </button>
                        <button 
                            onClick={() => setActivePlatform('eslip')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activePlatform === 'eslip' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
                        >
                            <Smartphone size={14} /> E-Slip
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* Text Inputs (Platform-Specific) */}
                    <div className="bg-gray-50/50 p-4 rounded-2xl mb-8 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <Store className="text-gray-400" size={14} />
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ข้อความสำหรับ {activePlatform === 'paper' ? 'Paper-Slip' : 'E-Slip'}</h4>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">ข้อความโปรยหัวบิล (Top Note)</label>
                                <input 
                                    type="text" 
                                    value={activeSub.topNote || ''}
                                    onChange={(e) => handleUpdateActiveTemplate({ [activePlatform]: { ...activeSub, topNote: e.target.value } })}
                                    className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-rubber-500 font-bold text-gray-700 text-[12px]"
                                    placeholder="ยินดีต้อนรับสู่ร้าน..."
                                />
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">ชื่อบิล ({activePlatform === 'paper' ? 'Paper' : 'E-Slip'})</label>
                                    <input 
                                        type="text" 
                                        value={activeSub.headerTitle}
                                        onChange={(e) => handleUpdateActiveTemplate({ [activePlatform]: { ...activeSub, headerTitle: e.target.value } })}
                                        className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-rubber-500 font-bold text-gray-700 text-[12px]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Font Size Controls (Categorized) */}
                    <div className="bg-rubber-50/30 p-5 rounded-2xl mb-8 border border-rubber-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Type className="text-rubber-600" size={16} />
                                <h4 className="text-[10px] font-black text-rubber-800 uppercase tracking-widest">ปรับแต่งขนาดตัวอักษร อย่างละเอียด</h4>
                            </div>
                        </div>

                        {/* Category Tabs */}
                        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                            {fontSizeCategories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveFontCategory(cat.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all whitespace-nowrap ${activeFontCategory === cat.id ? 'bg-rubber-600 border-rubber-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-rubber-200'}`}
                                >
                                    {cat.icon}
                                    <span className="text-[10px] font-black uppercase tracking-wider">{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            {fontSizeControls[activeFontCategory].map(ctrl => (
                                <div key={ctrl.key} className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{ctrl.label}</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-rubber-600 bg-white px-2 py-0.5 rounded-full border border-rubber-100">
                                                {activeSub[ctrl.key] || ctrl.rec}px
                                            </span>
                                        </div>
                                    </div>
                                    <input 
                                        type="range"
                                        min={ctrl.min}
                                        max={ctrl.max}
                                        step="0.5"
                                        value={activeSub[ctrl.key] || ctrl.rec}
                                        onChange={(e) => handleUpdateActiveTemplate({ [activePlatform]: { ...activeSub, [ctrl.key]: parseFloat(e.target.value) } })}
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rubber-600"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Toggles — All platform-specific */}
                    <div className="space-y-2">
                        {toggleItems.map((item) => {
                            const isActive = activeSub[item.key];
                            
                            return (
                                <div 
                                    key={item.key}
                                    onClick={() => handleToggle(item.key)}
                                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border-2 ${
                                        isActive 
                                        ? 'bg-rubber-50 border-rubber-200 text-rubber-700 shadow-sm' 
                                        : 'bg-white border-gray-50 text-gray-300 hover:border-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-rubber-600 text-white' : 'bg-gray-50 text-gray-300'}`}>
                                            {item.icon}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black uppercase tracking-wider">{item.label}</span>
                                            {item.labelKey && isActive && (
                                                <div className="mt-1 flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                                                    <Type size={10} className="text-rubber-400" />
                                                    <input 
                                                        type="text"
                                                        value={activeSub.labels[item.labelKey]}
                                                        onChange={(e) => handleUpdateLabel(item.labelKey, e.target.value)}
                                                        className="bg-white border border-rubber-100 px-2 py-0.5 rounded-md focus:ring-1 focus:ring-rubber-500 text-[11px] font-bold text-rubber-600 w-full"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${isActive ? 'bg-rubber-600' : 'bg-gray-200'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isActive ? 'left-5' : 'left-1'}`}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Text (Platform-Specific) */}
                    <div className="space-y-4 mt-8 pt-6 border-t border-gray-100">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">ข้อความท้ายบิล ({activePlatform === 'paper' ? 'Paper' : 'E-Slip'})</label>
                            <input 
                                type="text" 
                                value={activeSub.footerText || ''}
                                onChange={(e) => handleUpdateActiveTemplate({ [activePlatform]: { ...activeSub, footerText: e.target.value } })}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rubber-500 font-bold text-gray-700 text-xs"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">ข้อความเพิ่มเติมใต้บิล ({activePlatform === 'paper' ? 'Paper' : 'E-Slip'})</label>
                            <textarea 
                                rows={2}
                                value={activeSub.extraMessage || ''}
                                onChange={(e) => handleUpdateActiveTemplate({ [activePlatform]: { ...activeSub, extraMessage: e.target.value } })}
                                className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-rubber-500 font-bold text-gray-700 text-xs resize-none"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 bg-rubber-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-rubber-200 hover:bg-rubber-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
                {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                Save All Templates
            </button>
        </div>
    );
};

export default PaperSlipControls;
