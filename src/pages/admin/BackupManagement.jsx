import React from 'react';
import { ShieldCheck } from 'lucide-react';
import DatabaseManagement from '../../components/admin/DatabaseManagement';

const BackupManagement = () => {
    return (
        <div className="max-w-5xl mx-auto pb-12">
            <header className="mb-6">
                <h1 className="text-2xl font-black text-gray-900 mb-2 flex items-center">
                    <ShieldCheck className="mr-3 text-rubber-600" size={28} />
                    ระบบสำรองข้อมูลและประวัติ (System Backups)
                </h1>
                <p className="text-gray-500 text-sm font-medium">จัดการไฟล์สำรองข้อมูล (Snapshot) และประวัติการสำรองข้อมูลอัตโนมัติของระบบ</p>
            </header>

            <DatabaseManagement 
                isAdminMode={true} 
                hideTabs={['import']} 
                initialTab="backups" 
            />
        </div>
    );
};

export default BackupManagement;
