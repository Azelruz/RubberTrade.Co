import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
    ShieldAlert,
    CreditCard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import toast from 'react-hot-toast';

export const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState([]); // Default collapsed menus
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        const handleSyncComplete = (e) => {
            if (e.detail && e.detail.count > 0) {
                toast.success(`อัปโหลดล่วงล้ำเข้าระบบสำเร็จ ${e.detail.count} รายการ 🚀`, { duration: 4000 });
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('sync-complete', handleSyncComplete);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('sync-complete', handleSyncComplete);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'แดชบอร์ด', path: '/', icon: <LayoutDashboard size={20} />, roles: ['owner', 'admin'] },
        { name: 'รับซื้อน้ำยาง', path: '/buy', icon: <Droplets size={20} />, roles: ['owner', 'admin'] },
        { name: 'ขายน้ำยาง', path: '/sell', icon: <Truck size={20} />, roles: ['owner', 'admin'] },
        { name: 'การชำระเงิน', path: '/payments', icon: <Wallet size={20} />, roles: ['owner', 'admin'] },
        { name: 'ค่าใช้จ่าย', path: '/expenses', icon: <Wallet size={20} />, roles: ['owner', 'admin'] },
        { name: 'โปรโมชั่น', path: '/promotions', icon: <Gift size={20} />, roles: ['owner'] },
        { 
            name: 'รายงาน', 
            path: '/report', 
            icon: <BarChart3 size={20} />, 
            roles: ['owner'],
            subItems: [
                { name: 'รายงานสรุปยอดรายวัน', path: '/report/daily-summary' },
                { name: 'รายงานคาดการณ์ประจำวัน', path: '/report/daily-forecast' },
                { name: 'รายงานยอดขายประจำเดือน', path: '/report/monthly' },
                { name: 'รายงานประวัติการซื้อ-ขาย', path: '/report/transaction-history' },
                { name: 'บัญชีสำหรับสรรพากร', path: '/tax-report' }
            ]
        },
        { 
            name: 'ระบบสมาชิก', 
            path: '/subscription', 
            icon: <CreditCard size={20} />, 
            roles: ['owner', 'admin', 'super_admin'],
            subItems: [
                { name: 'ภาพรวมระบบสมาชิก', path: '/admin/subscription-dashboard', roles: ['super_admin'] },
                { name: 'สถานะและการสมัคร', path: '/subscription', roles: ['owner', 'admin', 'super_admin'] },
                { name: 'อนุมัติสมาชิก', path: '/admin/subscriptions', roles: ['super_admin'] }
            ]
        },
        { 
            name: 'ตั้งค่า', 
            path: '/settings', 
            icon: <Settings size={20} />, 
            roles: ['owner'],
            subItems: [
                { name: 'ตั้งค่าร้านค้า', path: '/settings' },
                { name: 'จัดการข้อมูล (Import/Export)', path: '/import' }
            ]
        },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (!item.roles) return true;
        const isSuperAdminFallback = user?.email === 'narapong.an@gmail.com' || user?.username === 'narapong.an';
        if (isSuperAdminFallback && item.roles.includes('super_admin')) return true;
        return item.roles.includes(user?.role?.toLowerCase());
    }).map(item => {
        if (item.subItems) {
            return {
                ...item,
                subItems: item.subItems.filter(sub => {
                    if (!sub.roles) return true;
                    const isSuperAdminFallback = user?.email === 'narapong.an@gmail.com' || user?.username === 'narapong.an';
                    if (isSuperAdminFallback && sub.roles.includes('super_admin')) return true;
                    return sub.roles.includes(user?.role?.toLowerCase());
                })
            };
        }
        return item;
    });

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden print:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
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
                                        {item.subItems.map((sub) => (
                                            <NavLink
                                                key={sub.path}
                                                to={sub.path}
                                                onClick={() => setSidebarOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center px-4 py-2 text-xs font-bold rounded-md transition-colors
                                                    ${isActive
                                                        ? 'bg-rubber-50 text-rubber-600'
                                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`
                                                }
                                            >
                                                {sub.name}
                                            </NavLink>
                                        ))}
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
                        onClick={async () => {
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
                            }
                            window.dispatchEvent(new Event('dashboard-refresh'));
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm font-medium text-white bg-rubber-600 rounded-lg hover:bg-rubber-700 transition-colors mb-2 shadow-sm"
                    >
                        <RefreshCw size={20} className="mr-3" />
                        ดึงข้อมูลล่าสุด (Sync)
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

            {/* Main content */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Subscription Warning Banner */}
                {user?.subscriptionExpiry && (
                    (() => {
                        const expiry = new Date(user.subscriptionExpiry);
                        const isExpired = expiry < new Date();
                        const isCloseToExpiry = !isExpired && (expiry - new Date()) < (3 * 24 * 60 * 60 * 1000); // 3 days
                        
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
                        return null;
                    })()
                )}

                {/* Top Header */}
                <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:px-8 print:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-1 text-gray-400 lg:hidden hover:text-gray-500 focus:outline-none focus:ring focus:ring-rubber-500 focus:ring-opacity-50"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center lg:hidden">
                        <span className="text-lg font-bold text-rubber-600">RubberTrade</span>
                    </div>

                    <div className="flex items-center ml-auto space-x-4">
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
                        {/* Can add notifications/profile here later */}
                    </div>
                </header>

                {/* Main section */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-8 print:p-0 print:bg-white">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
