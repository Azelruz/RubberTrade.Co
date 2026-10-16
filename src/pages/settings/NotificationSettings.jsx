import React, { useState, useEffect } from 'react';
import { 
    Bell, Clock, CreditCard, Receipt, 
    HandCoins, CloudOff, Check, RotateCcw, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { 
    NOTIFICATION_CATEGORIES, 
    DEFAULT_NOTIFICATION_PREFERENCES,
    getNotificationPreferences, 
    saveNotificationPreferences 
} from '../../utils/notificationPreferences';

export const NotificationSettings = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin' || 
                         user?.email === 'narapong.an@gmail.com' || 
                         user?.username === 'narapong.an';

    const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
    const [hasChanged, setHasChanged] = useState(false);

    useEffect(() => {
        setPrefs(getNotificationPreferences());
    }, []);

    const handleToggle = (id) => {
        setPrefs(prev => {
            const next = { ...prev, [id]: !prev[id] };
            setHasChanged(true);
            return next;
        });
    };

    const handleSave = () => {
        saveNotificationPreferences(prefs);
        setHasChanged(false);
        toast.success('บันทึกการตั้งค่าการแจ้งเตือนสำเร็จ');
    };

    const handleReset = () => {
        setPrefs(DEFAULT_NOTIFICATION_PREFERENCES);
        saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        setHasChanged(false);
        toast.success('รีเซ็ตเป็นค่าเริ่มต้นเรียบร้อยแล้ว');
    };

    const renderIcon = (iconName) => {
        switch (iconName) {
            case 'Clock': return <Clock size={20} className="text-amber-500" />;
            case 'HandCoins': return <HandCoins size={20} className="text-rose-500" />;
            case 'Receipt': return <Receipt size={20} className="text-emerald-500" />;
            case 'CloudOff': return <CloudOff size={20} className="text-sky-500" />;
            case 'CreditCard': return <CreditCard size={20} className="text-blue-500" />;
            default: return <Bell size={20} className="text-gray-500" />;
        }
    };

    const visibleCategories = NOTIFICATION_CATEGORIES.filter(cat => !cat.adminOnly || isSuperAdmin);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base font-black text-gray-900">กำหนดประเภทการแจ้งเตือน (Notification Bell Preferences)</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            เลือกหมวดหมู่ที่ต้องการให้ระบบแสดงจุดแดงและแจ้งเตือนบนไอคอนกระดิ่งที่แถบเมนูด้านบน
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleReset}
                            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            <RotateCcw size={14} />
                            <span>คืนค่าเริ่มต้น</span>
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!hasChanged}
                            className={`flex items-center space-x-1.5 px-4 py-1.5 text-xs font-black rounded-xl transition-all shadow-xs ${
                                hasChanged 
                                    ? 'bg-rubber-600 hover:bg-rubber-700 text-white' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            <Check size={14} />
                            <span>บันทึกการเปลี่ยนแปลง</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {visibleCategories.map(cat => {
                        const isChecked = prefs[cat.id] ?? true;
                        return (
                            <div
                                key={cat.id}
                                onClick={() => handleToggle(cat.id)}
                                className={`flex items-start justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                                    isChecked
                                        ? 'bg-rubber-50/20 border-rubber-200 hover:border-rubber-300'
                                        : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 opacity-60'
                                }`}
                            >
                                <div className="flex items-start space-x-3 pr-3">
                                    <div className="p-2.5 rounded-xl bg-white shadow-xs border border-gray-100 mt-0.5 shrink-0">
                                        {renderIcon(cat.icon)}
                                    </div>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-black text-gray-900">{cat.label}</span>
                                            {cat.adminOnly && (
                                                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 rounded-md">
                                                    Admin Only
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{cat.description}</p>
                                    </div>
                                </div>

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
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center space-x-3 text-xs text-blue-700">
                <ShieldCheck size={20} className="text-blue-500 shrink-0" />
                <span>
                    การตั้งค่านี้จะมีผลทันทีและถูกบันทึกลงในเครื่องของคุณ ทำให้ระบบทำงานได้อย่างรวดเร็วแม้ในโหมดออฟไลน์
                </span>
            </div>
        </div>
    );
};

export default NotificationSettings;
