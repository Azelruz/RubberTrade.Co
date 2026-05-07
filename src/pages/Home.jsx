import React, { useState, useEffect } from 'react';
import { 
    ChevronRight, 
    Leaf, 
    Check, 
    Zap, 
    ShieldCheck, 
    BarChart3, 
    Users, 
    Smartphone, 
    ArrowRight,
    Search,
    Download,
    Lock,
    Globe,
    LayoutDashboard,
    Quote,
    Maximize2,
    X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Preview Images
import previewBuy from '../assets/features/preview_buy.png';
import previewExpenses from '../assets/features/preview_expenses.png';
import previewPromotions from '../assets/features/preview_promotions.png';
import previewPayment from '../assets/features/preview_payment.png';
import previewSettings from '../assets/features/preview_settings.png';

const Home = () => {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [activePreview, setActivePreview] = useState(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        {
            title: 'โมดูลการรับซื้อ (Buy)',
            desc: 'บันทึกน้ำหนักยางสดและค่า DRC% พร้อมคำนวณราคาสุทธิและส่วนแบ่งกำไรอัตโนมัติ ออกใบเสร็จ E-Slip ได้ทันที',
            icon: <Users className="text-rubber-600" size={24} />,
            color: 'bg-blue-50'
        },
        {
            title: 'โมดูลการส่งขาย (Sell)',
            desc: 'ติดตามน้ำหนักสูญหาย (Loss Tracking) อัตโนมัติ พร้อมระบบ Stock Cards และบันทึกประวัติการขนส่งโรงงาน',
            icon: <BarChart3 className="text-rubber-600" size={24} />,
            color: 'bg-green-50'
        },
        {
            title: 'แดชบอร์ดและรายงาน',
            desc: 'วิเคราะห์สถิติ พยากรณ์กำไรรายวัน (Daily Forecast) และสรุปงบบัญชี/ภาษีที่พร้อมใช้งานทันที',
            icon: <LayoutDashboard className="text-rubber-600" size={24} />,
            color: 'bg-amber-50'
        },
        {
            title: 'ระบบหลังบ้านและ LINE',
            desc: 'จัดการสิทธิ์ผู้ใช้ ระบบสมาชิก และเชื่อมต่อ LINE Integration เพื่อความโปร่งใสระหว่างร้านและเกษตรกร',
            icon: <ShieldCheck className="text-rubber-600" size={24} />,
            color: 'bg-purple-50'
        }
    ];

    const previewScreens = [
        {
            title: 'บันทึกรับซื้อน้ำยาง',
            desc: 'บันทึกข้อมูลการรับซื้อที่แม่นยำ พร้อมระบบคำนวณราคาและค่าเคมีอัตโนมัติ',
            image: previewBuy
        },
        {
            title: 'จัดการค่าใช้จ่าย',
            desc: 'บันทึกค่าใช้จ่ายรายวันและค่าจ้างพนักงานอย่างเป็นระบบ ตรวจสอบได้ทุกรายการ',
            image: previewExpenses
        },
        {
            title: 'โปรโมชั่นและของรางวัล',
            desc: 'ระบบคะแนนสะสมสำหรับเกษตรกร เพื่อกระตุ้นยอดขายและรักษาความสัมพันธ์',
            image: previewPromotions
        },
        {
            title: 'การชำระเงิน',
            desc: 'จัดการการโอนเงินให้เกษตรกรและลูกจ้างประจำวันอย่างรวดเร็วและปลอดภัย',
            image: previewPayment
        },
        {
            title: 'ตั้งค่าระบบและใบเสร็จ',
            desc: 'ปรับแต่งรูปแบบใบเสร็จ (Receipt Designer) ให้เข้ากับลานยางของคุณ',
            image: previewSettings
        }
    ];

    const packages = [
        {
            name: 'Starter (ฟรี)',
            price: '0',
            duration: '30 วัน',
            features: ['จัดการพนักงาน 1 คน', 'รายงานสรุปยอดรายวัน', 'บันทึกข้อมูลแบบออฟไลน์', 'รองรับ 1 ลานยาง'],
            cta: 'ทดลองใช้งานฟรี',
            popular: false
        },
        {
            name: 'Professional',
            price: '299',
            duration: 'เดือน',
            features: ['จัดการพนักงาน 5 คน', 'รายงานเชิงลึกรายเดือน', 'ส่งออกข้อมูล CSV/JSON', 'ระบบสำรองข้อมูลอัตโนมัติ', 'รองรับสลิป E-Slip'],
            cta: 'เริ่มใช้งานเลย',
            popular: true
        },
        {
            name: 'Business Local',
            price: '2,990',
            duration: 'ปี',
            features: ['พนักงานไม่จำกัดจำนวน', 'ฟีเจอร์รายงานทั้งหมด', 'ระบบจัดการโปรโมชั่น', 'สิทธิ์การใช้งานถาวร 1 ปี', 'ซัพพอร์ตระดับพรีเมียม'],
            cta: 'สมัครแผนสมาชิกรายปี',
            popular: false
        }
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-rubber-100 selection:text-rubber-700">
            {/* Navbar */}
            <nav className={`fixed w-full z-50 transition-all duration-300 px-6 py-4 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="p-2 bg-rubber-600 rounded-xl shadow-lg shadow-rubber-600/20 group-hover:scale-110 transition-transform">
                            <Leaf size={24} className="text-white" />
                        </div>
                        <span className="text-xl font-black tracking-tight text-gray-900">
                            RubberTrade<span className="text-rubber-600">.Co</span>
                        </span>
                    </div>

                        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-500">
                        <a href="#features" className="hover:text-rubber-600 transition-colors">คุณสมบัติ</a>
                        <a href="#preview" className="hover:text-rubber-600 transition-colors">ตัวอย่างระบบ</a>
                        <a href="#packages" className="hover:text-rubber-600 transition-colors">แพ็กเกจ</a>
                        <a href="#about" className="hover:text-rubber-600 transition-colors">เกี่ยวกับเรา</a>
                    </div>

                    <button 
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-full font-black text-sm hover:bg-rubber-600 hover:shadow-xl hover:shadow-rubber-600/20 transition-all active:scale-95"
                    >
                        เข้าสู่ระบบ
                        <ChevronRight size={16} />
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-rubber-50 rounded-full blur-[120px] opacity-60"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-50 rounded-full blur-[100px] opacity-50"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-rubber-50 text-rubber-700 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
                            <Zap size={14} className="fill-rubber-600" />
                            Next Gen Rubber Trade Management
                        </div>
                        
                        <h1 className="text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight">
                            ยกระดับธุรกิจซื้อขาย <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rubber-600 to-emerald-500">
                                น้ำยางพารา
                            </span> ของคุณ
                        </h1>

                        <p className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed max-w-2xl">
                            จัดการลานยางอย่างมืออาชีพด้วยระบบดิจิทัลที่ออกแบบมาเพื่อความแม่นยำ รวดเร็ว และตรวจสอบได้จริง 
                            ลดข้อผิดพลาดงานบัญชี และเพิ่มประสิทธิภาพการทำงานให้สูงสุด
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                            <button 
                                onClick={() => navigate('/login')}
                                className="w-full sm:w-auto px-8 py-5 bg-rubber-600 text-white rounded-3xl font-black text-lg shadow-2xl shadow-rubber-600/30 hover:bg-rubber-700 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                                เริ่มต้นใช้งานฟรี
                                <ArrowRight size={20} />
                            </button>
                            <button 
                                onClick={() => document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' })}
                                className="w-full sm:w-auto px-8 py-5 bg-white border-2 border-gray-100 text-gray-600 rounded-3xl font-black text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                            >
                                <Smartphone size={20} />
                                ดูตัวอย่างระบบ
                            </button>
                        </div>

                        <div className="flex items-center gap-6 pt-8">
                            <div className="flex -space-x-3">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-rubber-100 flex items-center justify-center text-[10px] font-black text-rubber-600 overflow-hidden">
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                                    </div>
                                ))}
                                <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-900 flex items-center justify-center text-[10px] font-bold text-white">
                                    +50
                                </div>
                            </div>
                            <div className="text-sm font-bold text-gray-400">
                                เชื่อถือโดยผู้ประกอบการลานยางกว่า <span className="text-gray-900">50+ แห่ง</span> ทั่วประเทศ
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-gray-50/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center space-y-4 mb-20 px-4">
                        <h2 className="text-sm font-black text-rubber-600 uppercase tracking-[0.3em]">Comprehensive Modules</h2>
                        <h3 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">จัดการลานยางครบวงจร ในหนึ่งเดียว</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/40 hover:shadow-2xl hover:shadow-rubber-600/10 transition-all group hover:-translate-y-2">
                                <div className={`w-14 h-14 ${f.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    {f.icon}
                                </div>
                                <h4 className="text-xl font-extrabold text-gray-900 mb-4">{f.title}</h4>
                                <p className="text-gray-500 font-medium leading-relaxed italic line-clamp-4">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* System Highlights Banner */}
            <section className="py-12 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-gray-900 rounded-[40px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                        {[
                            { title: 'Offline-first', desc: 'ทำงานได้แม้ไม่มีเน็ต', icon: <Globe size={20} className="text-emerald-400" /> },
                            { title: 'ความแม่นยำสูง', desc: 'ลดข้อผิดพลาดคำนวณมือ', icon: <Check size={20} className="text-rubber-400" /> },
                            { title: 'ติดตั้งได้ทันที (PWA)', desc: 'ไม่ต้องผ่าน App Store', icon: <Smartphone size={20} className="text-blue-400" /> }
                        ].map((h, i) => (
                            <div key={i} className="flex items-center gap-4 text-white">
                                <div className="p-3 bg-white/10 rounded-2xl">{h.icon}</div>
                                <div>
                                    <h5 className="font-black text-lg leading-none mb-1">{h.title}</h5>
                                    <p className="text-gray-400 text-sm font-bold">{h.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Us Section */}
            <section id="about" className="py-24 overflow-hidden bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        {/* Image/Visual Side */}
                        <div className="w-full lg:w-1/2 relative group">
                            <div className="absolute -inset-4 bg-gradient-to-tr from-rubber-600/20 to-emerald-600/20 rounded-[60px] blur-2xl group-hover:opacity-100 opacity-60 transition-opacity"></div>
                            <div className="relative aspect-[4/3] rounded-[48px] overflow-hidden border-8 border-white shadow-2xl bg-gray-100">
                                <img 
                                    src="https://images.unsplash.com/photo-1594498653385-d5172c532c00?auto=format&fit=crop&q=80&w=1000" 
                                    alt="Rubber Plantation" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent flex flex-col justify-end p-10">
                                    <div className="flex items-center gap-4 text-white">
                                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                            <Quote size={20} />
                                        </div>
                                        <p className="text-xl font-medium italic">"เชื่อมโยงวิถีดั้งเดิม สู่ความแม่นยำระดับดิจิทัล"</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Side */}
                        <div className="w-full lg:w-1/2 space-y-10">
                            <div className="space-y-4">
                                <h2 className="text-sm font-black text-rubber-600 uppercase tracking-[0.3em]">Our Identity</h2>
                                <h3 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
                                    จุดเริ่มต้นของความโปร่งใส <br /> ในทุกหยดน้ำยาง
                                </h3>
                                <p className="text-lg text-gray-500 font-medium leading-relaxed">
                                    เราเริ่มจากความเข้าใจในความยากลำบากของการบริหารลานยาง ที่ต้องแบกรับความเสี่ยงทั้งเรื่องตัวเลข และข้อจำกัดด้านพื้นที่ RubberTrade จึงถูกสร้างขึ้นภายใต้แนวคิด "Offline-first" เพื่อให้งานของคุณเดินหน้าต่อได้ไม่สะดุด
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {[
                                    { title: 'เพื่อเจ้าของลานเท', desc: 'เห็นกำไรและสต็อก Real-time สบายใจเรื่องความโปร่งใส', icon: <Users size={20} /> },
                                    { title: 'เพื่อพนักงาน', desc: 'ทำงานแม่นยำขึ้น ลดแรงกดดันเรื่องตัวเลขแม้ไม่มีเน็ต', icon: <Smartphone size={20} /> },
                                    { title: 'เพื่อเกษตรกร', desc: 'มั่นใจในราคาและน้ำหนัก รับ Slip ผ่าน LINE ทันที', icon: <Leaf size={20} /> }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-6 p-6 rounded-3xl border-2 border-gray-50 hover:border-rubber-100 hover:bg-rubber-50/30 transition-all group">
                                        <div className="w-12 h-12 rounded-2xl bg-rubber-50 flex items-center justify-center text-rubber-600 group-hover:scale-110 transition-transform">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{item.title}</h4>
                                            <p className="text-sm text-gray-500 font-medium">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* System Preview Section */}
            <section id="preview" className="py-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                        <div className="space-y-4">
                            <h2 className="text-sm font-black text-rubber-600 uppercase tracking-[0.3em]">System Preview</h2>
                            <h3 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">ดูการทำงานของระบบ</h3>
                        </div>
                        <p className="text-gray-500 font-bold max-w-md text-lg leading-relaxed">
                            สัมผัสประสบการณ์การใช้งานที่ลื่นไหล และอินเทอร์เฟซที่ออกแบบมาเพื่อคนลานยางโดยเฉพาะ
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {previewScreens.map((screen, i) => (
                            <div 
                                key={i} 
                                className={`group relative bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-rubber-600/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer ${i === 3 || i === 4 ? 'lg:col-span-1.5' : ''}`}
                                onClick={() => setActivePreview(screen)}
                            >
                                {/* Image Container */}
                                <div className="aspect-[16/10] overflow-hidden relative">
                                    <img 
                                        src={screen.image} 
                                        alt={screen.title} 
                                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                        <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white">
                                            <Maximize2 size={24} />
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Content */}
                                <div className="p-8 space-y-3">
                                    <h4 className="text-xl font-black text-gray-900">{screen.title}</h4>
                                    <p className="text-gray-500 font-medium text-sm leading-relaxed line-clamp-2">
                                        {screen.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="packages" className="py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center space-y-4 mb-20 text-balance px-4">
                        <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tighter">
                            เลือกแพ็กเกจที่ <span className="text-rubber-600">เหมาะกับคุณ</span>
                        </h2>
                        <p className="text-gray-400 font-bold max-w-2xl mx-auto text-lg leading-relaxed">
                            เรามีแผนการใช้งานที่หลากหลาย เพื่อให้สอดคล้องกับขนาดธุรกิจและความต้องการของลานยางทุกระดับ
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                        {packages.map((pkg, i) => (
                            <div 
                                key={i} 
                                className={`relative flex flex-col p-10 rounded-[48px] border-2 transition-all duration-500 overflow-hidden ${
                                    pkg.popular 
                                    ? 'bg-gray-900 text-white border-gray-900 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] lg:scale-110 z-10' 
                                    : 'bg-white text-gray-900 border-gray-50 shadow-xl shadow-gray-200/50 hover:border-rubber-100 hover:shadow-rubber-600/5'
                                }`}
                            >
                                {pkg.popular && (
                                    <div className="absolute top-0 right-10 bg-rubber-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-b-2xl shadow-lg">
                                        Most Popular
                                    </div>
                                )}

                                <div className="space-y-8 flex-1">
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-black uppercase tracking-widest opacity-60">{pkg.name}</h4>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black tracking-tight">฿{pkg.price}</span>
                                            <span className="text-sm font-bold opacity-60">/ {pkg.duration}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        {pkg.features.map((feat, j) => (
                                            <div key={j} className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${pkg.popular ? 'bg-white/10 text-rubber-400' : 'bg-rubber-50 text-rubber-600'}`}>
                                                    <Check size={12} strokeWidth={4} />
                                                </div>
                                                <span className="text-sm font-bold opacity-90">{feat}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={() => navigate('/login')}
                                    className={`mt-12 w-full py-5 rounded-3xl font-black text-lg transition-all active:scale-95 ${
                                    pkg.popular 
                                    ? 'bg-rubber-600 text-white shadow-xl shadow-rubber-600/40 hover:bg-rubber-500' 
                                    : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-100'
                                }`}>
                                    {pkg.cta}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Banner */}
            <section className="px-6 py-20">
                <div className="max-w-7xl mx-auto">
                    <div className="relative rounded-[60px] bg-rubber-600 overflow-hidden p-12 md:p-24 text-center space-y-8 shadow-2xl shadow-rubber-600/40">
                        {/* Decorative circle */}
                        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl"></div>
                        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-400 opacity-20 rounded-full blur-3xl"></div>

                        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight relative z-10">
                            พร้อมจะยกระดับลานยางของคุณ <br className="hidden md:block" />
                            ด้วยระบบดิจิทัลแล้วหรือยัง?
                        </h2>
                        
                        <p className="text-rubber-50 font-medium text-lg max-w-2xl mx-auto opacity-80 relative z-10">
                            สมัครใช้งานวันนี้ ทดลองใช้ฟรี 30 วันแรก ไม่ต้องผูกบัตรเครดิต
                        </p>

                        <div className="relative z-10 pt-4 cursor-pointer" onClick={() => navigate('/login')}>
                            <button className="bg-white text-rubber-700 px-12 py-6 rounded-3xl font-black text-xl shadow-2xl hover:bg-rubber-50 hover:scale-105 transition-all">
                                สมัครสมาชิกตอนนี้
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="space-y-6 md:col-span-1">
                            <div className="flex items-center gap-2">
                                <Leaf size={32} className="text-rubber-600" />
                                <span className="text-2xl font-black tracking-tight">RubberTrade</span>
                            </div>
                            <p className="text-gray-400 font-bold text-sm leading-relaxed">
                                ระบบจัดการลานรับซื้อน้ำยางพาราอันดับ 1 ที่มุ่งเน้นความโปร่งใส แม่นยำ และความง่ายในการใช้งาน
                            </p>
                        </div>
                        
                        <div className="space-y-6">
                            <h5 className="font-black uppercase text-xs tracking-widest text-gray-900">Explore</h5>
                            <ul className="space-y-4 text-sm font-bold text-gray-400">
                                <li className="hover:text-rubber-600 cursor-pointer">คุณสมบัติ</li>
                                <li className="hover:text-rubber-600 cursor-pointer">แพ็กเกจราคา</li>
                                <li className="hover:text-rubber-600 cursor-pointer">บทความ</li>
                            </ul>
                        </div>

                        <div className="space-y-6">
                            <h5 className="font-black uppercase text-xs tracking-widest text-gray-900">Support</h5>
                            <ul className="space-y-4 text-sm font-bold text-gray-400">
                                <li className="hover:text-rubber-600 cursor-pointer">ศูนย์ช่วยเหลือ</li>
                                <li className="hover:text-rubber-600 cursor-pointer">
                                    <a href="https://www.facebook.com/profile.php?id=61572159400802" target="_blank" rel="noopener noreferrer">
                                        ติดต่อเรา
                                    </a>
                                </li>
                                <li className="hover:text-rubber-600 cursor-pointer">คู่มืออการใช้งาน</li>
                            </ul>
                        </div>

                        <div className="space-y-6">
                            <h5 className="font-black uppercase text-xs tracking-widest text-gray-900">Legal</h5>
                            <ul className="space-y-4 text-sm font-bold text-gray-400">
                                <li className="hover:text-rubber-600 cursor-pointer">Privacy Policy</li>
                                <li className="hover:text-rubber-600 cursor-pointer">Terms of Service</li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-12 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-6">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                            © {new Date().getFullYear()} Rubber Trade .Co. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6">
                            <a 
                                href="https://www.facebook.com/profile.php?id=61572159400802" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rubber-600 cursor-pointer transition-colors"
                            >
                                Facebook
                            </a>
                            {['Line', 'Youtube'].map(s => (
                                <span key={s} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rubber-600 cursor-pointer transition-colors">{s}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>

            {/* Preview Lightbox Modal */}
            {activePreview && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
                    <div 
                        className="absolute inset-0 bg-gray-900/90 backdrop-blur-xl"
                        onClick={() => setActivePreview(null)}
                    ></div>
                    
                    <div className="relative w-full max-w-6xl aspect-[16/10] bg-white rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <button 
                            onClick={() => setActivePreview(null)}
                            className="absolute top-6 right-6 z-10 p-3 bg-black/10 hover:bg-black/20 text-gray-900 rounded-full backdrop-blur-md transition-colors"
                        >
                            <X size={24} />
                        </button>
                        
                        <div className="flex flex-col h-full">
                            <div className="flex-1 min-h-0 overflow-hidden bg-gray-50">
                                <img 
                                    src={activePreview.image} 
                                    alt={activePreview.title} 
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="p-8 bg-white border-t border-gray-100">
                                <div className="max-w-3xl mx-auto text-center space-y-2">
                                    <h2 className="text-2xl font-black text-gray-900">{activePreview.title}</h2>
                                    <p className="text-gray-500 font-bold">{activePreview.desc}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
