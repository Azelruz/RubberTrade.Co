import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, ArrowUp, ArrowDown, LayoutGrid, Sliders, Layers } from 'lucide-react';
import { 
    STAT_CARD_DEFINITIONS, 
    WIDGET_SECTION_DEFINITIONS, 
    PRESET_CONFIGS 
} from '../../utils/dashboardConfig';

export const DashboardCustomizeModal = ({ isOpen, onClose, currentConfig, onSave, onReset }) => {
    const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'stats' | 'widgets'
    const [draftConfig, setDraftConfig] = useState({
        visibleStats: [],
        widgetOrder: [],
        visibleWidgets: [],
        activePreset: 'custom'
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentConfig) {
            setDraftConfig({
                visibleStats: [...(currentConfig.visibleStats || [])],
                widgetOrder: [...(currentConfig.widgetOrder || [])],
                visibleWidgets: [...(currentConfig.visibleWidgets || [])],
                activePreset: currentConfig.activePreset || 'custom'
            });
        }
    }, [currentConfig, isOpen]);

    if (!isOpen) return null;

    const handleApplyPreset = (presetKey) => {
        const preset = PRESET_CONFIGS[presetKey];
        if (preset) {
            setDraftConfig({
                visibleStats: [...preset.visibleStats],
                widgetOrder: [...preset.widgetOrder],
                visibleWidgets: [...preset.visibleWidgets],
                activePreset: presetKey
            });
        }
    };

    const handleToggleStatCard = (statId) => {
        setDraftConfig(prev => {
            const exists = prev.visibleStats.includes(statId);
            const updated = exists 
                ? prev.visibleStats.filter(id => id !== statId)
                : [...prev.visibleStats, statId];
            return { ...prev, visibleStats: updated, activePreset: 'custom' };
        });
    };

    const handleToggleAllStats = (selectAll) => {
        setDraftConfig(prev => ({
            ...prev,
            visibleStats: selectAll ? STAT_CARD_DEFINITIONS.map(s => s.id) : [],
            activePreset: 'custom'
        }));
    };

    const handleToggleWidget = (widgetId) => {
        setDraftConfig(prev => {
            const exists = prev.visibleWidgets.includes(widgetId);
            const updated = exists 
                ? prev.visibleWidgets.filter(id => id !== widgetId)
                : [...prev.visibleWidgets, widgetId];
            return { ...prev, visibleWidgets: updated, activePreset: 'custom' };
        });
    };

    const handleMoveWidget = (index, direction) => {
        const newOrder = [...draftConfig.widgetOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newOrder.length) return;

        const temp = newOrder[index];
        newOrder[index] = newOrder[targetIndex];
        newOrder[targetIndex] = temp;

        setDraftConfig(prev => ({ ...prev, widgetOrder: newOrder, activePreset: 'custom' }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(draftConfig);
            onClose();
        } catch (e) {
            console.error('Save failed:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (window.confirm('คุณต้องการรีเซ็ตการตั้งค่าหน้า Dashboard เป็นค่าเริ่มต้นใช่หรือไม่?')) {
            setIsSaving(true);
            try {
                await onReset();
                onClose();
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <Sliders className="text-rubber-600 mr-2" size={22} />
                            ปรับแต่งหน้าจอ Dashboard
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            เลือกข้อมูลที่ต้องการแสดงและจัดลำดับหน้าจอให้เหมาะกับการทำงานของคุณ (ซิงค์ผ่านคลาวด์อัตโนมัติ)
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-200 bg-white px-6">
                    <button
                        onClick={() => setActiveTab('presets')}
                        className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
                            activeTab === 'presets' 
                                ? 'border-rubber-600 text-rubber-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <LayoutGrid size={16} />
                        <span>เทมเพลตสำเร็จรูป</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
                            activeTab === 'stats' 
                                ? 'border-rubber-600 text-rubber-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Sliders size={16} />
                        <span>การ์ดสรุปตัวเลข ({draftConfig.visibleStats.length}/{STAT_CARD_DEFINITIONS.length})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('widgets')}
                        className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
                            activeTab === 'widgets' 
                                ? 'border-rubber-600 text-rubber-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Layers size={16} />
                        <span>บล็อกวิดเจ็ต & ลำดับ ({draftConfig.visibleWidgets.length}/{WIDGET_SECTION_DEFINITIONS.length})</span>
                    </button>
                </div>

                {/* Tab Contents */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Tab 1: Presets */}
                    {activeTab === 'presets' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 font-medium">
                                เลือกรูปแบบหน้าจอสำเร็จรูปที่ตรงตามลักษณะการทำงานของคุณ:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {Object.keys(PRESET_CONFIGS).map(key => {
                                    const preset = PRESET_CONFIGS[key];
                                    const isSelected = draftConfig.activePreset === key;
                                    return (
                                        <div
                                            key={key}
                                            onClick={() => handleApplyPreset(key)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                                isSelected 
                                                    ? 'border-rubber-600 bg-rubber-50/50 shadow-sm' 
                                                    : 'border-gray-200 hover:border-rubber-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className="font-bold text-gray-900 text-sm">{preset.name}</h3>
                                                    {isSelected && (
                                                        <span className="w-5 h-5 rounded-full bg-rubber-600 text-white flex items-center justify-center text-xs">
                                                            <Check size={12} />
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 leading-relaxed mb-3">
                                                    {preset.description}
                                                </p>
                                            </div>
                                            <div className="text-[11px] font-medium text-gray-400 border-t border-gray-100 pt-2">
                                                เปิดใช้การ์ด {preset.visibleStats.length} ใบ • วิดเจ็ต {preset.visibleWidgets.length} ส่วน
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Stat Cards Toggle */}
                    {activeTab === 'stats' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    เลือกการ์ดตัวเลขที่ต้องการให้แสดงบน Dashboard
                                </span>
                                <div className="space-x-2">
                                    <button 
                                        onClick={() => handleToggleAllStats(true)}
                                        className="text-xs font-bold text-rubber-600 hover:underline"
                                    >
                                        เลือกทั้งหมด
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button 
                                        onClick={() => handleToggleAllStats(false)}
                                        className="text-xs font-bold text-gray-500 hover:underline"
                                    >
                                        ยกเลิกทั้งหมด
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {STAT_CARD_DEFINITIONS.map(stat => {
                                    const isChecked = draftConfig.visibleStats.includes(stat.id);
                                    const isNew = stat.id === 'today_dry_weight' || stat.id === 'inactive_farmers_15d';
                                    return (
                                        <label
                                            key={stat.id}
                                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                                isChecked 
                                                    ? 'border-rubber-500 bg-rubber-50/30 font-medium text-gray-900' 
                                                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleStatCard(stat.id)}
                                                    className="w-4 h-4 rounded text-rubber-600 focus:ring-rubber-500"
                                                />
                                                <span className="text-sm">{stat.label}</span>
                                                {isNew && (
                                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                        ใหม่
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                stat.category === 'daily' ? 'bg-blue-50 text-blue-600' :
                                                stat.category === 'members' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'
                                            }`}>
                                                {stat.category === 'daily' ? 'รายวัน' : stat.category === 'members' ? 'สมาชิก' : 'รายเดือน'}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Widgets Visibility & Reordering */}
                    {activeTab === 'widgets' && (
                        <div className="space-y-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                เปิด-ปิด และปรับลำดับบล็อกวิดเจ็ต (กดปุ่ม เลื่อนขึ้น/ลง เพื่อจัดตำแหน่ง)
                            </p>
                            <div className="space-y-2">
                                {draftConfig.widgetOrder.map((widgetId, index) => {
                                    const widgetDef = WIDGET_SECTION_DEFINITIONS.find(w => w.id === widgetId);
                                    if (!widgetDef) return null;
                                    const isVisible = draftConfig.visibleWidgets.includes(widgetId);

                                    return (
                                        <div
                                            key={widgetId}
                                            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                                                isVisible 
                                                    ? 'border-gray-200 bg-white shadow-sm' 
                                                    : 'border-gray-100 bg-gray-50 opacity-60'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isVisible}
                                                    onChange={() => handleToggleWidget(widgetId)}
                                                    className="w-4 h-4 rounded text-rubber-600 focus:ring-rubber-500"
                                                />
                                                <div>
                                                    <p className={`text-sm font-bold ${isVisible ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {widgetDef.label}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {widgetDef.description}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={() => handleMoveWidget(index, 'up')}
                                                    disabled={index === 0}
                                                    className="p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
                                                    title="เลื่อนขึ้น"
                                                >
                                                    <ArrowUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleMoveWidget(index, 'down')}
                                                    disabled={index === draftConfig.widgetOrder.length - 1}
                                                    className="p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
                                                    title="เลื่อนลง"
                                                >
                                                    <ArrowDown size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                        onClick={handleReset}
                        disabled={isSaving}
                        className="text-xs font-bold text-gray-500 hover:text-red-600 flex items-center space-x-1 transition-colors"
                    >
                        <RotateCcw size={14} />
                        <span>รีเซ็ตเป็นค่าเริ่มต้น</span>
                    </button>

                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200/60 rounded-xl transition-colors w-1/2 sm:w-auto"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2 text-sm font-bold text-white bg-rubber-600 hover:bg-rubber-700 rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 w-1/2 sm:w-auto"
                        >
                            {isSaving ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                            ) : (
                                <>
                                    <Check size={16} />
                                    <span>บันทึกการตั้งค่า (ซิงค์คลาวด์)</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardCustomizeModal;
