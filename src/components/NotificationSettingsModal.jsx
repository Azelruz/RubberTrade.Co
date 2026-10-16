import React, { useState, useEffect } from 'react';
import { 
    X, Settings, Bell, Clock, CreditCard, Receipt, 
    HandCoins, CloudOff, Check, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    NOTIFICATION_CATEGORIES, 
    DEFAULT_NOTIFICATION_PREFERENCES,
    getNotificationPreferences, 
    saveNotificationPreferences 
} from '../utils/notificationPreferences';

export const NotificationSettingsModal = ({ isOpen, onClose, isSuperAdmin = false }) => {
    const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATION_PREFERENCES);

    useEffect(() => {
        if (isOpen) {
            setPrefs(getNotificationPreferences());
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleToggle = (id) => {
        setPrefs(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleSave = () => {
        saveNotificationPreferences(prefs);
        toast.success('บันทึกการตั้งค่าการแจ้งเตือนแล้ว');
        onClose();
    };

    const handleReset = () => {
        setPrefs(DEFAULT_NOTIFICATION_PREFERENCES);
        saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        toast.success('รีเซ็ตเป็นค่าเริ่มต้นแล้ว');
    };

    const renderIcon = (iconName) => {
        switch (iconName) {
            case 'Clock': return <Clock size={18} className="text-amber-500" />;
            case 'HandCoins': return <HandCoins size={18} className="text-rose-500" />;
            case 'Receipt': return <Receipt size={18} className="text-emerald-500" />;
            case 'CloudOff': return <CloudOff size={18} className="text-sky-500" />;
            case 'CreditCard': return <CreditCard size={18} className="text-blue-500" />;
            default: return <Bell size={18} className="text-gray-500" />;
        }
    };

    const visibleCategories = NOTIFICATION_CATEGORIES.filter(cat => !cat.adminOnly || isSuperAdmin);

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notif-settings-title"
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-rubber-50 text-rubber-600 rounded-xl">
                            <Settings size={20} />
                        </div>
                        <div>
                            <h3 id="notif-settings-title" className="text-base font-black text-gray-900">ตั้งค่าการแจ้งเตือน</h3>
                            <p className="text-xs text-gray-500">เลือกประเภทที่ต้องการให้ระบบแจ้งเตือน</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:ring-2 focus:ring-rubber-500 focus:outline-none"
                        title="ปิด (Esc)"
                        aria-label="ปิดหน้าต่างตั้งค่าการแจ้งเตือน"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body - List of Toggles */}
                <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                    {visibleCategories.map(cat => {
                        const isChecked = prefs[cat.id] ?? true;
                        return (
                            <div 
                                key={cat.id}
                                onClick={() => handleToggle(cat.id)}
                                className={`flex items-start justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                                    isChecked 
                                        ? 'bg-rubber-50/20 border-rubber-200 hover:border-rubber-300' 
                                        : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 opacity-60'
                                }`}
                            >
                                <div className="flex items-start space-x-3 pr-3">
                                    <div className="p-2 rounded-lg bg-white shadow-xs border border-gray-100 mt-0.5">
                                        {renderIcon(cat.icon)}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-1.5">
                                            <span className="text-sm font-bold text-gray-900">{cat.label}</span>
                                            {cat.adminOnly && (
                                                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 rounded-md">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cat.description}</p>
                                    </div>
                                </div>

                                {/* Custom Switch */}
                                <div className="relative inline-flex items-center mt-1 shrink-0">
                                    <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={() => handleToggle(cat.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rubber-600"></div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <button
                        onClick={handleReset}
                        className="flex items-center space-x-1 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                        title="คืนค่าการตั้งค่าเริ่มต้น"
                    >
                        <RotateCcw size={14} />
                        <span>รีเซ็ต</span>
                    </button>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200/60 rounded-xl transition-all"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex items-center space-x-1 px-5 py-2 text-xs font-black text-white bg-rubber-600 hover:bg-rubber-700 rounded-xl shadow-xs transition-all"
                        >
                            <Check size={16} />
                            <span>บันทึกการตั้งค่า</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettingsModal;
