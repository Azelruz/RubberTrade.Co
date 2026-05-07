import React, { useState, useMemo } from 'react';
import { 
    Settings as SettingsIcon, Building2, UserCircle, Leaf, 
    Users, DollarSign, Truck, Shield, MessageSquare, ClipboardList, Beaker,
    ChevronRight, Layout, Database, Radio, Receipt
} from 'lucide-react';

// Sub-components (Self-contained)
import { GeneralSettings } from './settings/GeneralSettings';
import { PriceSettings } from './settings/PriceSettings';
import { UserManagement } from './settings/UserManagement';
import { LineIntegration } from './settings/LineIntegration';
import { StaffManagement } from './settings/StaffManagement';
import { TeamManagement } from './settings/TeamManagement';
import { FactoryManagement } from './settings/FactoryManagement';
import { TruckManagement } from './settings/TruckManagement';
import { ChemicalManagement } from './settings/ChemicalManagement';
import { PaperSlipSettings } from './settings/PaperSlipSettings';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('price'); // Default to price as it's most common

    const groups = useMemo(() => [
        {
            title: 'ร้านค้าและการเงิน',
            items: [
                { id: 'general', icon: <SettingsIcon size={20} />, label: 'ข้อมูลร้านค้า', desc: 'ชื่อร้าน, โลโก้, และที่อยู่' },
                { id: 'paper_slip', icon: <Receipt size={20} />, label: 'รูปแบบใบเสร็จ', desc: 'ปรับแต่งข้อมูลบน Paper-Slip และ E-Slip' },
                { id: 'price', icon: <DollarSign size={20} />, label: 'ราคากลางวันนี้', desc: 'ตั้งราคารับซื้อและประกาศ' },
                { id: 'line_integration', icon: <MessageSquare size={20} />, label: 'LINE OA', desc: 'เชื่อมต่อการประกาศราคา' },
            ]
        },
        {
            title: 'การจัดการบุคลากร',
            items: [
                { id: 'farmers_employees', icon: <Users size={20} />, label: 'เกษตรกรและลูกจ้าง', desc: 'รายชื่อสมาชิกและสิทธิ์' },
                { id: 'staff', icon: <UserCircle size={20} />, label: 'พนักงานประจำ', desc: 'คนขับรถและพนักงานร้าน' },
                { id: 'team', icon: <Shield size={20} />, label: 'จัดการทีม', desc: 'ผู้ดูแลระบบและระดับการเข้าถึง' },
            ]
        },
        {
            title: 'ทรัพยากรและระบบ',
            items: [
                { id: 'factories', icon: <Building2 size={20} />, label: 'โรงงานส่งขาย', desc: 'จัดการโรงงานปลายทาง' },
                { id: 'trucks', icon: <Truck size={20} />, label: 'รถส่งน้ำยาง', desc: 'ข้อมูลทะเบียนรถขนส่ง' },
                { id: 'chemicals', icon: <Beaker size={20} />, label: 'สารเคมี', desc: 'จัดการหน่วยและราคา' },
            ]
        }
    ], []);

    // Flatten items for easier lookups
    const flatItems = useMemo(() => groups.flatMap(g => g.items), [groups]);
    const currentTab = flatItems.find(i => i.id === activeTab);

    return (
        <div className="min-h-[85vh] animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="mb-8 ml-2">
                <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2.5 bg-rubber-600 rounded-xl shadow-lg shadow-rubber-200 text-white">
                        <SettingsIcon size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">ตั้งค่าระบบ</h1>
                        <p className="text-sm font-medium text-gray-500">จัดการข้อมูลพื้นฐานและการทำงานของแพลตฟอร์ม</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs Bar (Top) */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/30 border border-gray-50 overflow-hidden mb-6 p-2">
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    {groups.map((group, gIdx) => (
                        <div key={gIdx} className="p-2 flex-1">
                            <h3 className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mt-1">
                                {group.title}
                            </h3>
                            <div className="flex flex-wrap md:flex-nowrap gap-1">
                                {group.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`flex-1 min-w-[120px] flex items-center p-2.5 rounded-xl transition-all duration-300 group ${
                                            activeTab === item.id 
                                                ? 'bg-rubber-600 text-white shadow-lg shadow-rubber-200 ring-1 ring-rubber-500' 
                                                : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900 border border-transparent'
                                        }`}
                                    >
                                        <div className={`mr-2.5 p-1.5 rounded-lg transition-colors ${
                                            activeTab === item.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-gray-600'
                                        }`}>
                                            {React.cloneElement(item.icon, { size: 16 })}
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-[11px] font-bold leading-none ${activeTab === item.id ? 'text-white' : 'text-gray-700'}`}>
                                                {item.label}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 items-start">
                {/* Content Area */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/30 border border-gray-50 overflow-hidden min-h-[700px] flex flex-col">
                    
                    {/* Sticky Content Header */}
                    <div className="bg-white/80 backdrop-blur-md border-b border-gray-50 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm">
                                {currentTab?.icon}
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 leading-none mb-1">{currentTab?.label}</h2>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">Settings Module</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                             <div className="px-3 py-1.5 bg-rubber-50 text-rubber-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rubber-100">
                                Active Module
                             </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-6 md:p-10">
                        <div className="max-w-4xl mx-auto">
                             {activeTab === 'general' && <GeneralSettings />}
                            {activeTab === 'paper_slip' && <PaperSlipSettings />}
                            {activeTab === 'price' && <PriceSettings />}
                            {activeTab === 'farmers_employees' && <UserManagement />}
                            {activeTab === 'staff' && <StaffManagement />}
                            {activeTab === 'team' && <TeamManagement />}
                            {activeTab === 'factories' && <FactoryManagement />}
                            {activeTab === 'trucks' && <TruckManagement />}
                            {activeTab === 'chemicals' && <ChemicalManagement />}
                            {activeTab === 'line_integration' && <LineIntegration />}
                        </div>
                    </div>

                    {/* Content Footer (Subtle) */}
                    <div className="px-10 py-4 bg-gray-50/50 border-t border-gray-50 text-[10px] font-medium text-gray-400 flex justify-between items-center">
                        <span>RubberTrade.Co Cloud Settings Engine v2.1</span>
                        <div className="flex items-center space-x-4">
                            <span>Privacy Policy</span>
                            <span>Security Docs</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Settings;
