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
    Quote
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        {
            title: 'จัดการพนักงาน',
            desc: 'เพิ่มและจัดการสิทธิ์พนักงานในลานยางได้ง่ายๆ พร้อมระบบบันทึกเวลาทำงาน',
            icon: <Users className="text-rubber-600" size={24} />,
            color: 'bg-blue-50'
        },
        {
            title: 'รายงานเรียลไทม์',
            desc: 'สรุปยอดซื้อขาย รายได้ และต้นทุนแบบรายวัน ดูผ่านมือถือได้ทุกที่ทุกเวลา',
            icon: <BarChart3 className="text-rubber-600" size={24} />,
            color: 'bg-green-50'
        },
        {
            title: 'แม่นยำและปลอดภัย',
            desc: 'ระบบคำนวณราคาและค่าเคมีอัตโนมัติ ลดข้อผิดพลาด และสำรองข้อมูลบนคลาวด์',
            icon: <ShieldCheck className="text-rubber-600" size={24} />,
            color: 'bg-amber-50'
        },
        {
            title: 'ส่งออกข้อมูล',
            desc: 'รองรับการส่งออกไฟล์ CSV และ JSON เพื่อนำไปส่งบัญชีหรือสรรพากรได้ทันที',
            icon: <Download className="text-rubber-600" size={24} />,
            color: 'bg-purple-50'
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
                            <button className="w-full sm:w-auto px-8 py-5 bg-white border-2 border-gray-100 text-gray-600 rounded-3xl font-black text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
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
                    <div className="text-center space-y-4 mb-20">
                        <h2 className="text-sm font-black text-rubber-600 uppercase tracking-[0.3em]">Powerful Features</h2>
                        <h3 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">ครบทุกฟังก์ชันที่ลานยางต้องการ</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/40 hover:shadow-2xl hover:shadow-rubber-600/10 transition-all group hover:-translate-y-2">
                                <div className={`w-14 h-14 ${f.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    {f.icon}
                                </div>
                                <h4 className="text-xl font-extrabold text-gray-900 mb-4">{f.title}</h4>
                                <p className="text-gray-500 font-medium leading-relaxed italic">{f.desc}</p>
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
                                <li className="hover:text-rubber-600 cursor-pointer">ติดต่อเรา</li>
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
                            {['Facebook', 'Line', 'Youtube'].map(s => (
                                <span key={s} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rubber-600 cursor-pointer transition-colors">{s}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
