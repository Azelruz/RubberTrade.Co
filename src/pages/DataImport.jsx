import React from 'react';
import { Database } from 'lucide-react';
import DatabaseManagement from '../components/admin/DatabaseManagement';

const DataImport = () => {
    return (
        <div className="max-w-5xl mx-auto pb-12">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                    <Database className="mr-3 text-rubber-600" />
                    การจัดการข้อมูลส่วนตัว (My Data Management)
                </h1>
                <p className="text-gray-500 text-sm">นำเข้าหรือส่งออกข้อมูลกิจการของคุณผ่านไฟล์ CSV หรือ JSON</p>
            </header>

            <DatabaseManagement isAdminMode={false} />
        </div>
    );
};

export default DataImport;
