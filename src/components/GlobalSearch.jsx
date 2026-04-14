import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, FileText, User, Users, Factory, Truck, Wallet, CreditCard, ChevronRight } from 'lucide-react';
import { fetchGlobalSearch } from '../services/apiService';

const GlobalSearch = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const searchRef = useRef(null);

    // Toggle modal with keyboard shortcut (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Search logic
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults({});
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetchGlobalSearch(query);
                setResults(res.results || {});
            } catch (err) {
                console.error('Search failed:', err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleNavigate = (type, item) => {
        setIsOpen(false);
        setQuery('');
        
        // Navigation logic based on type
        switch (type) {
            case 'buy':
            case 'sell':
                navigate('/report/transaction-history');
                // We might want to pass state to TransactionHistory to filter this specific record
                break;
            case 'farmer':
            case 'employee':
            case 'staff':
            case 'factory':
            case 'truck':
                navigate('/settings');
                break;
            case 'expense':
                navigate('/expenses');
                break;
            case 'wage':
                navigate('/report/monthly'); // or wherever wages are shown
                break;
            default:
                break;
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'buy': return <FileText size={16} className="text-blue-500" />;
            case 'sell': return <FileText size={16} className="text-orange-500" />;
            case 'farmer': return <User size={16} className="text-green-500" />;
            case 'employee': return <Users size={16} className="text-emerald-500" />;
            case 'staff': return <Users size={16} className="text-purple-500" />;
            case 'factory': return <Factory size={16} className="text-gray-500" />;
            case 'truck': return <Truck size={16} className="text-amber-500" />;
            case 'expense': return <Wallet size={16} className="text-red-500" />;
            case 'wage': return <CreditCard size={16} className="text-indigo-500" />;
            default: return <Search size={16} />;
        }
    };

    const getTypeName = (type) => {
        const map = {
            buy: 'บิลรับซื้อ',
            sell: 'บิลขาย',
            farmer: 'เกษตรกร',
            employee: 'ลูกน้อง',
            staff: 'พนักงาน',
            factory: 'โรงงาน',
            truck: 'รถขนส่ง',
            expense: 'ค่าใช้จ่าย',
            wage: 'ค่าแรง'
        };
        return map[type] || type;
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="hidden md:flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-400 rounded-xl transition-all border border-gray-200 group w-64 mr-4"
            >
                <Search size={18} className="mr-2 group-hover:text-rubber-600 transition-colors" />
                <span className="text-sm font-medium">ค้นหาด่วน... (Ctrl+K)</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                ref={searchRef}
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[70vh] animate-in slide-in-from-top-4 duration-300"
            >
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50">
                    <Search className="text-rubber-500 mr-3" size={24} />
                    <input 
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ค้นหาชื่อ, รหัสบิล, เบอร์โทร..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-black text-gray-900 placeholder-gray-400 p-0"
                    />
                    {loading ? (
                        <Loader2 className="animate-spin text-gray-400" size={20} />
                    ) : query && (
                        <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    ) || (
                        <span className="text-[10px] font-black text-gray-300 border border-gray-200 px-1.5 py-0.5 rounded-md">ESC</span>
                    )}
                </div>

                {/* Results Section */}
                <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                    {!query || query.length < 2 ? (
                        <div className="py-12 text-center text-gray-400">
                            <Search size={48} className="mx-auto mb-4 opacity-10" />
                            <p className="font-bold">พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                                {['เกษตรกร', 'บิลซื้อ', 'โรงงาน', 'พนักงาน'].map(tag => (
                                    <span key={tag} className="text-[10px] font-black uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-full">{tag}</span>
                                ))}
                            </div>
                        </div>
                    ) : Object.keys(results).length === 0 && !loading ? (
                        <div className="py-12 text-center text-gray-400">
                            <p className="font-bold">ไม่พบข้อมูลที่ค้นหา "{query}"</p>
                        </div>
                    ) : (
                        <div className="space-y-4 p-2">
                            {Object.entries(results).map(([type, items]) => (
                                <div key={type} className="space-y-1">
                                    <h3 className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                                        {getTypeName(type)}
                                        <div className="ml-2 flex-1 h-[1px] bg-gray-100"></div>
                                    </h3>
                                    <div className="space-y-1">
                                        {items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleNavigate(type, item)}
                                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-rubber-50 transition-colors group text-left"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-rubber-100 transition-colors">
                                                        {getTypeIcon(type)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 leading-none">
                                                            {item.title}
                                                        </p>
                                                        <div className="flex items-center mt-1 space-x-2">
                                                            <span className="text-[10px] font-bold text-gray-400">{item.id}</span>
                                                            {item.subtitle && (
                                                                <>
                                                                    <span className="text-[10px] text-gray-300">•</span>
                                                                    <span className="text-[10px] font-bold text-rubber-600">{item.subtitle}</span>
                                                                </>
                                                            )}
                                                            {item.date && (
                                                                <>
                                                                    <span className="text-[10px] text-gray-300">•</span>
                                                                    <span className="text-[10px] font-bold text-gray-400">{item.date}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} className="text-gray-300 group-hover:text-rubber-400 transition-transform group-hover:translate-x-0.5" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Footer Hints */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-400">
                    <div className="flex items-center space-x-4">
                        <span><kbd className="bg-white border border-gray-200 px-1 rounded shadow-sm">↵</kbd> เพื่อเลือก</span>
                        <span><kbd className="bg-white border border-gray-200 px-1 rounded shadow-sm">↑↓</kbd> เพื่อเลื่อน</span>
                    </div>
                    <span>RubberTrade Global Search</span>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;
