import React from 'react';
import { Trash2 } from 'lucide-react';

const DeleteConfirmDialog = ({ confirmDeleteId, setConfirmDeleteId, confirmDelete }) => {
    React.useEffect(() => {
        if (!confirmDeleteId) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setConfirmDeleteId(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmDeleteId, setConfirmDeleteId]);

    if (!confirmDeleteId) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center print:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
        >
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100">
                <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                        <Trash2 className="text-red-600" size={20} />
                    </div>
                    <h3 id="delete-confirm-title" className="text-lg font-bold text-gray-900">ยืนยันการลบ</h3>
                </div>
                <p className="text-gray-600 mb-5 text-sm">คุณต้องการลบรายการนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:ring-2 focus:ring-gray-400 focus:outline-none"
                        autoFocus
                    >ยกเลิก (Esc)</button>
                    <button
                        onClick={confirmDelete}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >ลบรายการ</button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmDialog;
