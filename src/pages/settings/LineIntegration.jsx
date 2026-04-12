import React from 'react';
import { Link, Info, Save, Database } from 'lucide-react';
import toast from 'react-hot-toast';

export const LineIntegration = ({ 
    register, 
    handleSubmit, 
    onSubmit, 
    saving, 
    lineLogs, 
    loadData,
    user
}) => {
    const webhookUrl = `${window.location.origin}/api/line-webhook${user?.id ? '?uid=' + user.id : ''}`;

    return (
        <div className="max-w-2xl">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <Link className="mr-2 text-green-600" size={20} />
                        เชื่อมต่อ LINE Official Account
                    </h2>
                    <p className="text-gray-500 text-sm">ตั้งค่าเพื่อให้ระบบรับข้อมูลเพื่อนจาก LINE OA มาเป็นฐานข้อมูลเกษตรกร</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <h3 className="text-sm font-bold text-green-800 mb-2 flex items-center">
                        <Info size={16} className="mr-2" />
                        วิธีการตั้งค่า
                    </h3>
                    <ol className="text-xs text-green-700 space-y-2 list-decimal ml-4">
                        <li>สร้าง Messaging API Channel ใน <a href="https://developers.line.biz/" target="_blank" className="underline font-bold">LINE Developers Console</a></li>
                        <li>คัดลอก **Channel Access Token** และ **Channel Secret** มาใส่ในฟิลด์ด้านล่าง</li>
                        <li>นำ Webhook URL ด้านล่างนี้ไปใส่ในหน้า Messaging API settings ใน LINE Developers</li>
                        <li>กดเปิดใช้งาน **Webhook** ใน LINE Developers</li>
                    </ol>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Webhook URL สำหรับนำไปใส่ใน LINE OA</label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            readOnly
                            value={webhookUrl}
                            className="flex-1 bg-gray-50 px-3 py-2 text-xs font-mono border rounded-lg"
                        />
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(webhookUrl);
                                toast.success('คัดลอกสำเร็จ');
                            }}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-bold"
                        >
                            คัดลอก
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Messaging API: Channel Access Token</label>
                        <input
                            type="text"
                            {...register('lineChannelAccessToken')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 shadow-sm text-sm"
                            placeholder="ey..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Messaging API: Channel Secret</label>
                        <input
                            type="text"
                            {...register('lineChannelSecret')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 shadow-sm text-sm"
                            placeholder="secret..."
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                            <span className="w-8 h-8 bg-rubber-100 rounded-full flex items-center justify-center text-rubber-600 mr-2 text-xs">LIFF</span>
                            ตั้งค่า LIFF แอปพลิเคชัน
                        </h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">LIFF ID: หน้าโปรไฟล์เกษตรกร (Farmer Profile)</label>
                                <input
                                    type="text"
                                    {...register('lineLiffIdProfile')}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 shadow-sm text-sm"
                                    placeholder="เช่น 200xxxxxxx-xxxxxxxx"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">URL ใน LINE Developers: {window.location.origin}/liff/profile?shopId={user?.id}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">LIFF ID: หน้าเพิ่มพนักงาน (Add Employee)</label>
                                <input
                                    type="text"
                                    {...register('lineLiffIdAddEmployee')}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 shadow-sm text-sm"
                                    placeholder="เช่น 200xxxxxxx-xxxxxxxx"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">URL ใน LINE Developers: {window.location.origin}/liff/add-employee?shopId={user?.id}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-rubber-600 text-white rounded-lg px-6 py-2.5 font-medium hover:bg-rubber-700 disabled:opacity-50 transition-colors flex items-center"
                        >
                            <Save size={18} className="mr-2" />
                            {saving ? 'กำลังบันทึก...' : 'บันทึกค่า LINE API'}
                        </button>
                    </div>
                </form>

                <div className="mt-10 pt-10 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                        <Database className="mr-2 text-gray-400" size={20} />
                        ตรวจสอบการเชื่อมต่อ (Debug Logs)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">สถานะล่าสุด</label>
                            <div className="font-bold text-sm text-gray-700">{lineLogs.lastStatus}</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <label className="block text-[10px] font-bold text-red-400 uppercase mb-1">ข้อผิดพลาดล่าสุด</label>
                            <div className="font-bold text-sm text-red-700">{lineLogs.lastError}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase">ข้อมูลดิบล่าสุดจาก LINE (Raw Event Payload)</label>
                        <pre className="w-full bg-gray-900 text-green-400 p-4 rounded-xl text-[10px] font-mono overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto border border-gray-800">
                            {lineLogs.lastEvent}
                        </pre>
                        <p className="text-[10px] text-gray-400 italic">
                            * หากข้อมูลด้านบนว่างเปล่า แสดงว่า Webhook ยังไม่ได้รับข้อมูลใดๆ จาก LINE เลย (ให้เช็คการกด Verify หรือการ Block/Unblock ใน LINE)
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => loadData()}
                        className="mt-4 text-xs font-bold text-rubber-600 hover:text-rubber-700 underline"
                    >
                        กดเพื่อรีเฟรช Log ล่าสุด
                    </button>
                </div>
            </div>
        </div>
    );
};
