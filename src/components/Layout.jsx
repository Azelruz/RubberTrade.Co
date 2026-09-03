import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Droplets,
    Truck,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Factory,
    Wallet,
    Gift,
    FileText,
    Database,
    ChevronDown,
    ChevronRight,
    Wifi,
    WifiOff,
    RefreshCw,
    CreditCard,
    Bell,
    Clock,
    ShieldCheck,
    History,
    ShieldAlert,
    Tv,
    Maximize2,
    Minimize2,
    MapPin,
    Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchNotificationStats, adminFetchAllMembers, clearAllCache, fetchTeamMembers, getSettings } from '../services/apiService';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';
import GlobalSearch from './GlobalSearch';

// --- NEW: Store Switcher Component ---
const StoreSwitcher = () => {
    const { user, activeStoreId, setActiveStoreId } = useAuth();
    const [stores, setStores] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin' || 
                        user?.email === 'narapong.an@gmail.com' || 
                        user?.username === 'narapong.an';
    const isOwner = user?.role?.toLowerCase() === 'owner';

    useEffect(() => {
        if (!isSuperAdmin && !isOwner) return;
        
        const loadStores = async () => {
            setIsLoading(true);
            try {
                if (isSuperAdmin) {
                    const res = await adminFetchAllMembers();
                    if (res.status === 'success') {
                        // Filter for users who are 'owner' (stores)
                        const ownerStores = res.members.filter(m => m.id !== user.id);
                        setStores(ownerStores);
                    }
                } else if (isOwner) {
                    const res = await fetchTeamMembers();
                    if (Array.isArray(res)) {
                        // Filter out the owner themselves, leaving team members (acting as branches)
                        const staffMembers = res.filter(m => m.id !== user.id);
                        setStores(staffMembers);
                    }
                }
            } catch (err) {
                console.error('Failed to load stores:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadStores();
    }, [isSuperAdmin, isOwner, user.id]);

    if (!isSuperAdmin && !isOwner) return null;

    return (
        <div className="flex items-center space-x-2 mr-4">
            <div className="relative group">
                <select
                    value={activeStoreId || ''}
                    onChange={(e) => {
                        const val = e.target.value || null;
                        setActiveStoreId(val);
                        // Trigger a global refresh to reload data for the new store
                        clearAllCache();
                        const selectedStore = stores.find(s => s.id === val);
                        const storeDisplayName = selectedStore?.store_name || selectedStore?.username || selectedStore?.email?.split('@')[0] || 'รหัส ' + val;
                        toast.success(val ? `สลับไปยังสาขา: ${storeDisplayName}` : 'กลับสู่ร้านหลัก');
                        setTimeout(() => window.location.reload(), 500);
                    }}
                    className={`pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-rubber-500 transition-all appearance-none cursor-pointer
                        ${activeStoreId ? 'text-rubber-600 border-rubber-200 bg-rubber-50/30' : 'text-gray-600 hover:border-gray-300'}`}
                >
                    <option value="">🏠 {user?.storeName || 'ร้านหลัก'}</option>
                    {stores.map(store => (
                        <option key={store.id} value={store.id}>
                            {isSuperAdmin 
                                ? `🏪 ${store.store_name || store.username || store.email}`
                                : `📍 ${store.store_name || store.username || store.email?.split('@')[0]} (${store.email})`}
                        </option>
                    ))}
                </select>
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${activeStoreId ? 'text-rubber-600' : 'text-gray-400'}`}>
                    <Factory size={18} />
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown size={14} />
                </div>
            </div>
            
            {activeStoreId && (
                <div className="flex items-center px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse border border-amber-200 shadow-sm">
                    <ShieldCheck size={12} className="mr-1" />
                    {isSuperAdmin ? 'God Mode' : 'สวมบทบาทสาขา'}
                </div>
            )}
        </div>
    );
};

export const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState([]); // Default collapsed menus
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncQueueCount, setSyncQueueCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Notification State
    const [notifications, setNotifications] = useState({
        subscription: { expiryDays: null, isExpired: false },
        admin: { pendingApprovalsCount: 0 }
    });
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);

    // Feature Toggles State (Enable/Disable Menus)
    const parseBoolSetting = (val, defaultVal = true) => {
        if (val === undefined || val === null) return defaultVal;
        if (typeof val === 'boolean') return val;
        const str = String(val).trim().toLowerCase();
        if (str === 'false' || str === '0' || str === 'off') return false;
        if (str === 'true' || str === '1' || str === 'on') return true;
        return defaultVal;
    };

    const [featureToggles, setFeatureToggles] = useState(() => ({
        enableBuyMap: parseBoolSetting(localStorage.getItem('rt_enable_buy_map'), true),
        enableSellAI: parseBoolSetting(localStorage.getItem('rt_enable_sell_ai'), true)
    }));

    useEffect(() => {
        const updateTogglesState = (buyMapVal, sellAIVal) => {
            const mapVal = parseBoolSetting(buyMapVal, true);
            const aiVal = parseBoolSetting(sellAIVal, true);
            localStorage.setItem('rt_enable_buy_map', String(mapVal));
            localStorage.setItem('rt_enable_sell_ai', String(aiVal));
            setFeatureToggles({ enableBuyMap: mapVal, enableSellAI: aiVal });
        };

        const loadFeatureSettings = async () => {
            try {
                const res = await getSettings();
                if (res.status === 'success' && res.data) {
                    updateTogglesState(res.data.enableBuyMap, res.data.enableSellAI);
                }
            } catch (e) {
                console.error('Error loading feature toggles in Layout:', e);
            }
        };

        loadFeatureSettings();

        const handleSettingsUpdated = (e) => {
            if (e?.detail?.payload) {
                const p = e.detail.payload;
                if (p.enableBuyMap !== undefined || p.enableSellAI !== undefined) {
                    updateTogglesState(
                        p.enableBuyMap !== undefined ? p.enableBuyMap : localStorage.getItem('rt_enable_buy_map'),
                        p.enableSellAI !== undefined ? p.enableSellAI : localStorage.getItem('rt_enable_sell_ai')
                    );
                }
            }
            loadFeatureSettings();
        };

        window.addEventListener('settings-updated', handleSettingsUpdated);

        const updateQueueCount = async () => {
            try {
                const { db } = await import('../services/db');
                const count = await db.sync_queue.count();
                setSyncQueueCount(count);
            } catch (err) {
                console.error('Error fetching sync count:', err);
            }
        };

        const handleOnline = () => {
            setIsOnline(true);
            updateQueueCount();
        };
        const handleOffline = () => setIsOnline(false);
        const handleSyncComplete = (e) => {
            if (e.detail && e.detail.count > 0) {
                toast.success(`อัปโหลดล่วงล้ำเข้าระบบสำเร็จ ${e.detail.count} รายการ 🚀`, { duration: 4000 });
            }
            updateQueueCount();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('sync-complete', handleSyncComplete);

        // Initial count and periodic update
        updateQueueCount();
        const interval = setInterval(updateQueueCount, 5000); 

        // Notification Stats Polling
        const updateNotifications = async () => {
            if (!user) return;
            try {
                const res = await fetchNotificationStats();
                if (res.status === 'success') {
                    setNotifications(res.notifications);
                }
            } catch (err) {
                console.error('Error fetching notifications:', err);
            }
        };

        if (navigator.onLine) {
            updateNotifications();
        }
        const notifInterval = setInterval(() => {
            if (navigator.onLine) updateNotifications();
        }, 5 * 60 * 1000); // Poll every 5 minutes

        return () => {
            window.removeEventListener('settings-updated', handleSettingsUpdated);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('sync-complete', handleSyncComplete);
            clearInterval(interval);
            clearInterval(notifInterval);
        };
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'แดชบอร์ด', path: '/', icon: <LayoutDashboard size={20} />, roles: ['owner', 'admin', 'staff'] },
        { name: 'รับซื้อน้ำยาง', path: '/buy', icon: <Droplets size={20} />, roles: ['owner', 'admin', 'staff'] },
        { name: 'รับซื้อน้ำยาง (Map View)', path: '/buy-map', icon: <MapPin size={20} className="text-emerald-500" />, roles: ['owner', 'admin', 'staff'] },
        { name: 'ขายน้ำยาง', path: '/sell-ai', icon: <Truck size={20} />, roles: ['owner', 'admin', 'staff'] },
        { 
            name: 'การชำระเงิน', 
            path: '/payments', 
            icon: <Wallet size={20} />, 
            roles: ['owner', 'admin', 'staff'],
            subItems: [
                { name: 'ประวัติจ่ายเงิน', path: '/payments' },
                { name: 'ระบบเงินกู้ & หนี้สิน', path: '/loans' }
            ]
        },
        { name: 'ค่าใช้จ่าย', path: '/expenses', icon: <Wallet size={20} />, roles: ['owner', 'admin', 'staff'] },
        { name: 'โปรโมชั่น', path: '/promotions', icon: <Gift size={20} />, roles: ['owner', 'staff'] },
        { 
            name: 'ระบบจัดการคิว', 
            path: '/queue', 
            icon: <Tv size={20} />, 
            roles: ['owner', 'admin', 'staff'],
            subItems: [
                { name: 'จุดที่ 1: รับชั่งยางสด', path: '/queue/station-1' },
                { name: 'จุดที่ 2: ป้อนผลตรวจ %DRC', path: '/queue/station-2' },
                { name: 'คิวบริการทั่วไป & คิดเงิน', path: '/queue/services' }
            ]
        },
        { 
            name: 'รายงาน', 
            path: '/report', 
            icon: <BarChart3 size={20} />, 
            roles: ['owner', 'staff'],
            subItems: [
                { name: 'รายงานสรุปยอดรายวัน', path: '/report/daily-summary' },
                { name: 'รายงานคาดการณ์ประจำวัน', path: '/report/daily-forecast' },
                { name: 'รายงานปรับปรุงสต็อก', path: '/report/stock-adjustments' },
                { name: 'รายงานยอดขายประจำเดือน', path: '/report/monthly' },
                { name: 'รายงานประวัติการซื้อ-ขาย', path: '/report/transaction-history' },
                { name: 'ระบบบัญชี & ภาษีสรรพากร', path: '/tax-report' }
            ]
        },
        { 
            name: 'Super Admin', 
            path: '/admin', 
            icon: <ShieldCheck size={20} className="text-amber-500" />, 
            roles: ['super_admin'],
            subItems: [
                { name: 'ภาพรวมระบบสมาชิก', path: '/admin/subscription-dashboard' },
                { name: 'จัดการสมาชิก & อนุมัติ', path: '/admin/subscriptions' },
                { name: 'รายงานแอดมิน', path: '/admin/reports' },
                { name: 'สำรองข้อมูล (Backup)', path: '/admin/backups' },
                { name: 'บันทึกกิจกรรม (Logs)', path: '/activity-log' }
            ]
        },
        { 
            name: 'ตั้งค่าร้าน', 
            path: '/settings', 
            icon: <Settings size={20} />, 
            roles: ['owner', 'staff'],
            subItems: [
                { name: 'ข้อมูลร้านค้า', path: '/settings' },
                { name: 'จัดการแปลงสวนยาง', path: '/land-plots' },
                { name: 'สถานะและการสมัครสมาชิก', path: '/subscription' },
                { name: 'จัดการข้อมูล (Import/Export)', path: '/import' },
                { name: 'บันทึกกิจกรรม', path: '/activity-log' },
                { name: 'คิวซิงค์ออฟไลน์', path: '/offline-sync' }
            ]
        },
    ];

    const filteredNavItems = navItems.filter(item => {
        // Feature Toggles Check (Enable/Disable Menus)
        if (item.path === '/buy-map' && !featureToggles.enableBuyMap) return false;
        if (item.path === '/sell-ai' && !featureToggles.enableSellAI) return false;

        if (!item.roles) return true;
        const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin' || 
                           user?.email === 'narapong.an@gmail.com' || 
                           user?.username === 'narapong.an';
                           
        if (isSuperAdmin) return true;
        return item.roles.includes(user?.role?.toLowerCase());
    }).map(item => {
        if (item.subItems) {
            return {
                ...item,
                subItems: item.subItems.filter(sub => {
                    if (!sub.roles) return true;
                    const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin' || 
                                       user?.email === 'narapong.an@gmail.com' || 
                                       user?.username === 'narapong.an';
                                       
                    if (isSuperAdmin) return true;
                    return sub.roles.includes(user?.role?.toLowerCase());
                })
            };
        }
        return item;
    });

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Mobile sidebar overlay */}
            {!isFullscreen && sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden print:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - hidden in fullscreen mode */}
            {!isFullscreen && (
            <aside
                className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col print:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex items-center justify-center h-16 border-b border-gray-200 bg-rubber-600 text-white">
                    <Factory size={24} className="mr-2" />
                    <span className="text-lg font-bold">RubberTrade</span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {filteredNavItems.map((item) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
                        const isOpen = openMenus.includes(item.name);

                        const toggleMenu = (e) => {
                            if (hasSubItems) {
                                e.preventDefault();
                                setOpenMenus(prev => 
                                    prev.includes(item.name) 
                                        ? prev.filter(m => m !== item.name) 
                                        : [...prev, item.name]
                                );
                            } else {
                                setSidebarOpen(false);
                            }
                        };

                        return (
                            <div key={item.name} className="space-y-1">
                                <NavLink
                                    to={item.path}
                                    onClick={toggleMenu}
                                    className={({ isActive }) =>
                                        `flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                                        ${(isActive && !hasSubItems) || (hasSubItems && isOpen)
                                            ? 'bg-rubber-100 text-rubber-700 shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
                                    }
                                >
                                    <div className="flex items-center">
                                        <span className="mr-3">{item.icon}</span>
                                        {item.name}
                                    </div>
                                    {hasSubItems && (
                                        isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                                    )}
                                </NavLink>

                                {hasSubItems && isOpen && (
                                    <div className="ml-9 space-y-1 mt-1 border-l-2 border-rubber-100 pl-2">
                                        {item.subItems.map((sub) => {
                                            const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';
                                            const isApprovalPage = sub.path === '/admin/subscriptions';
                                            const pendingCount = notifications.admin.pendingApprovalsCount;

                                            return (
                                                <NavLink
                                                    key={sub.path}
                                                    to={sub.path}
                                                    onClick={() => setSidebarOpen(false)}
                                                    className={({ isActive }) =>
                                                        `flex items-center justify-between px-4 py-2 text-xs font-bold rounded-md transition-colors
                                                        ${isActive
                                                            ? 'bg-rubber-50 text-rubber-600'
                                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`
                                                    }
                                                >
                                                    <span>{sub.name}</span>
                                                    {isSuperAdmin && isApprovalPage && pendingCount > 0 && (
                                                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full shadow-sm ml-2">
                                                            {pendingCount}
                                                        </span>
                                                    )}
                                                    {sub.path === '/offline-sync' && syncQueueCount > 0 && (
                                                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full shadow-sm ml-2">
                                                            {syncQueueCount}
                                                        </span>
                                                    )}
                                                </NavLink>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center mb-4 px-4">
                        <div className="w-8 h-8 rounded-full bg-rubber-200 flex items-center justify-center text-rubber-700 font-bold shadow-sm">
                            {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3 truncate">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                                {user?.username || user?.email?.split('@')[0] || 'ผู้ใช้งาน'}
                            </p>
                            <p className="text-xs text-rubber-600 font-medium capitalize">
                                {user?.role || 'owner'}
                            </p>
                        </div>
                    </div>
                    <button 
                        disabled={isSyncing}
                        onClick={async () => {
                            if (isSyncing) return;
                            setIsSyncing(true);
                            // Dynamic import to clear caches and trigger refresh
                            const { clearAllCache } = await import('../services/apiService');
                            const { hydrateLocalDB, syncQueueToServer } = await import('../services/syncService');
                            clearAllCache();
                            if (navigator.onLine) {
                                toast.loading('กำลังอัปโหลดข้อมูลออฟไลน์...', { id: 'manual-refresh' });
                                await syncQueueToServer();
                                toast.loading('กำลังดึงข้อมูลล่าสุดจากเซิร์ฟเวอร์...', { id: 'manual-refresh' });
                                await hydrateLocalDB();
                                toast.success('อัปเดตข้อมูลล่าสุดเรียบร้อย', { id: 'manual-refresh' });
                            } else {
                                toast.error('ไม่สามารถซิงค์ได้ขณะออฟไลน์', { id: 'manual-refresh' });
                            }
                            setIsSyncing(false);
                            window.dispatchEvent(new Event('dashboard-refresh'));
                        }}
                        className={`flex items-center justify-between w-full px-4 py-3 text-sm font-bold text-white rounded-xl transition-all mb-2 shadow-md relative overflow-hidden group
                            ${isSyncing ? 'bg-rubber-400 cursor-not-allowed' : 'bg-rubber-600 hover:bg-rubber-700 active:scale-95'}`}
                    >
                        <div className="flex items-center">
                            <RefreshCw size={20} className={`mr-3 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            <span>{isSyncing ? 'กำลังทำงาน...' : 'ซิงค์ข้อมูลล่าสุด'}</span>
                        </div>
                        
                        {syncQueueCount > 0 && (
                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-black rounded-full shadow-sm animate-bounce">
                                {syncQueueCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={20} className="mr-3" />
                        ออกจากระบบ
                    </button>
                </div>
            </aside>
            )}

            {/* Main content */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Subscription & Sync Warning Banner */}
                {user && (
                    (() => {
                        const now = new Date();
                        
                        // 1. Subscription Expiry Warning
                        if (user.subscriptionExpiry) {
                            const expiry = new Date(user.subscriptionExpiry);
                            const isExpired = expiry < now;
                            const isCloseToExpiry = !isExpired && (expiry - now) < (7 * 24 * 60 * 60 * 1000); 
                            
                            if (isExpired || isCloseToExpiry) {
                                return (
                                    <div className={`px-8 py-3 flex items-center justify-between text-sm font-bold ${isExpired ? 'bg-red-600 text-white' : 'bg-amber-400 text-amber-950'}`}>
                                        <div className="flex items-center">
                                            <ShieldAlert size={18} className="mr-3" />
                                            <span>
                                                {isExpired 
                                                    ? `อายุการใช้งานของคุณสิ้นสุดแล้วเมื่อ ${format(expiry, 'd MMM yyyy', { locale: th })} (ขณะนี้คุณดูข้อมูลได้อย่างเดียว)` 
                                                    : `อายุการใช้งานของคุณจะหมดภายในวัน ${format(expiry, 'd MMM yyyy', { locale: th })}`}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => navigate('/subscription')}
                                            className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm transition-all hover:scale-105 ${isExpired ? 'bg-white text-red-600' : 'bg-amber-950 text-white'}`}
                                        >
                                            ชำระเงินต่ออายุ
                                        </button>
                                    </div>
                                );
                            }
                        }

                        // 2. Sync Heartbeat Warning (3 days)
                        if (user.lastSync && !navigator.onLine) {
                            const lastSync = new Date(user.lastSync);
                            const threeDaysMs = 72 * 60 * 60 * 1000;
                            const remaining = threeDaysMs - (now - lastSync);
                            const remainingHours = Math.floor(remaining / (60 * 60 * 1000));
                            
                            // Show warning if less than 24 hours left and offline
                            if (remainingHours <= 24 && remainingHours > 0) {
                                return (
                                    <div className="px-8 py-3 bg-red-500 text-white flex items-center justify-between text-sm font-bold animate-pulse">
                                        <div className="flex items-center">
                                            <Wifi className="mr-3" size={18} />
                                            <span>
                                                เตือน: คุณต้องเชื่อมต่ออินเทอร์เน็ตภายใน {remainingHours} ชั่วโมง เพื่อยืนยันสิทธิ์ใช้งาน
                                            </span>
                                        </div>
                                    </div>
                                );
                            }
                        }

                        return null;
                    })()
                )}

                {/* Top Header - hidden in fullscreen mode */}
                {!isFullscreen && (
                <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:px-8 print:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-1 text-gray-400 lg:hidden hover:text-gray-500 focus:outline-none focus:ring focus:ring-rubber-500 focus:ring-opacity-50"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-rubber-600 lg:hidden">RubberTrade</span>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rubber-50 text-rubber-700 rounded-full border border-rubber-200 lg:hidden">
                            v1.7.4
                        </span>
                    </div>

                    <div className="flex items-center ml-auto space-x-3">
                        <span className="px-2.5 py-1 text-xs font-mono font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 shadow-xs hidden md:inline-flex items-center">
                            v1.7.4
                        </span>
                        <StoreSwitcher />
                        <GlobalSearch />
                        <button 
                            onClick={async () => {
                                // Dynamic import to clear caches and trigger refresh
                                const { clearAllCache } = await import('../services/apiService');
                                const { hydrateLocalDB } = await import('../services/syncService');
                                clearAllCache();
                                if (navigator.onLine) {
                                    toast.loading('กำลังดึงข้อมูลล่าสุด...', { id: 'manual-refresh' });
                                    await hydrateLocalDB();
                                    toast.success('อัปเดตข้อมูลล่าสุดเรียบร้อย', { id: 'manual-refresh' });
                                }
                                window.dispatchEvent(new Event('dashboard-refresh'));
                            }}
                            className="flex items-center text-gray-500 hover:text-rubber-600 bg-gray-50 hover:bg-rubber-50 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 transition-colors"
                        >
                            <RefreshCw size={14} className="mr-1.5" />
                            <span>รีเฟรชข้อมูล</span>
                        </button>
                    
                        {isOnline ? (
                            <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium border border-green-200">
                                <Wifi size={14} className="mr-1.5" />
                                <span>ออนไลน์</span>
                            </div>
                        ) : (
                            <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-medium border border-amber-200 animate-pulse">
                                <WifiOff size={14} className="mr-1.5" />
                                <span>ออฟไลน์</span>
                            </div>
                        )}
                        {/* Notifications */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                                className={`p-2 rounded-full transition-all relative ${showNotifDropdown ? 'bg-rubber-50 text-rubber-600 shadow-inner' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                            >
                                <Bell size={20} />
                                {(notifications.admin.pendingApprovalsCount > 0 || (notifications.subscription.expiryDays !== null && notifications.subscription.expiryDays <= 7)) && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                                )}
                            </button>

                            {showNotifDropdown && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifDropdown(false)}></div>
                                    <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="p-4 border-b border-gray-50">
                                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">การแจ้งเตือน</h3>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {/* Admin Alerts */}
                                            {notifications.admin.pendingApprovalsCount > 0 && (
                                                <div 
                                                    onClick={() => { navigate('/admin/subscriptions'); setShowNotifDropdown(false); }}
                                                    className="p-4 bg-blue-50/50 hover:bg-blue-50 border-b border-gray-50 transition-colors cursor-pointer group"
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                            <CreditCard size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900">มีสลิปรอการอนุมัติ</p>
                                                            <p className="text-[10px] text-blue-600 font-bold">รอคุณยืนยัน {notifications.admin.pendingApprovalsCount} รายการ</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Expiry Alerts */}
                                            {notifications.subscription.expiryDays !== null && notifications.subscription.expiryDays <= 7 && (
                                                <div 
                                                    onClick={() => { navigate('/subscription'); setShowNotifDropdown(false); }}
                                                    className={`p-4 hover:bg-gray-50 border-b border-gray-50 transition-colors cursor-pointer group ${notifications.subscription.isExpired ? 'bg-red-50/50' : 'bg-amber-50/50'}`}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`p-2 rounded-xl transition-all ${notifications.subscription.isExpired ? 'bg-red-100 text-red-600 group-hover:bg-red-600' : 'bg-amber-100 text-amber-600 group-hover:bg-amber-600'} group-hover:text-white`}>
                                                            {notifications.subscription.isExpired ? <ShieldAlert size={18} /> : <Clock size={18} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900">
                                                                {notifications.subscription.isExpired ? 'สมาชิกหมดอายุแล้ว' : 'สมาชิกใกล้หมดอายุ'}
                                                            </p>
                                                            <p className={`text-[10px] font-bold ${notifications.subscription.isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                                                                {notifications.subscription.isExpired 
                                                                    ? 'กรุณาต่ออายุสมาชิกเพื่อใช้งานต่อ' 
                                                                    : `จะหมดอายุในอีก ${notifications.subscription.expiryDays} วัน`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Empty State */}
                                            {notifications.admin.pendingApprovalsCount === 0 && (notifications.subscription.expiryDays === null || notifications.subscription.expiryDays > 7) && (
                                                <div className="p-8 text-center text-gray-400">
                                                    <Bell size={24} className="mx-auto mb-2 opacity-20" />
                                                    <p className="text-xs font-bold">ไม่มีการแจ้งเตือนใหม่</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>
                )}

                {/* Main section */}
                <main className={`flex-1 overflow-y-auto bg-gray-50 print:p-0 print:bg-white ${isFullscreen ? 'p-2' : 'p-4 lg:p-8'}`}>
                    <Outlet />
                </main>

                {/* Fullscreen toggle button */}
                <button
                    onClick={() => setIsFullscreen(prev => !prev)}
                    className={`fixed z-50 p-2.5 rounded-full shadow-lg border transition-all duration-200 print:hidden
                        ${isFullscreen 
                            ? 'bottom-4 right-4 bg-gray-800 text-white border-gray-700 hover:bg-gray-700' 
                            : 'bottom-4 right-4 bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-rubber-600'}`}
                    title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'เปิดโหมดเต็มจอ'}
                >
                    {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
            </div>
        </div>
    );
};

export default Layout;
