import { Building2, Save, CreditCard, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export const GeneralSettings = ({ register, handleSubmit, onSubmit, saving, logoUrl, setLogoUrl, handleLogoUpload }) => {
    return (
        <div className="max-w-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <Building2 className="mr-2 text-gray-400" size={20} />
                ข้อมูลร้านรับซื้อ
            </h2>

            <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="relative w-32 h-32 bg-white rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center group shadow-sm">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                        <div className="text-center p-2">
                            <Building2 className="mx-auto text-gray-300 mb-1" size={32} />
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No Logo</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 space-y-3 text-center sm:text-left">
                    <h3 className="text-sm font-bold text-gray-900">โลโก้ร้านรับซื้อ</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">โลโก้นี้จะปรากฏบนหัวใบเสร็จพิมพความร้อน (Paper-Slip) และบนหัวรูปภาพ E-Slip เพื่อความสวยงามและเป็นทางการ</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                        <label className="cursor-pointer bg-white border border-gray-200 hover:border-rubber-500 hover:text-rubber-600 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center">
                            <span>{logoUrl ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้'}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                        {logoUrl && (
                            <button
                                type="button"
                                onClick={() => setLogoUrl('')}
                                className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                            >
                                ลบออก
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อร้าน / ชื่อโรงงาน (ปรากฏบนใบเสร็จ)</label>
                    <input
                        type="text"
                        {...register('factoryName', { required: true })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 shadow-sm"
                        placeholder="... รับซื้อยางพาราไทย"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่บริษัท / ข้อมูลเพิ่มเติม</label>
                    <textarea
                        {...register('address')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 shadow-sm"
                        placeholder="123 ม.1 ต.ตัวอย่าง อ.เมือง จ.จังหวัด 12345"
                        rows="2"
                    ></textarea>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                        type="tel"
                        {...register('phone')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 shadow-sm"
                        placeholder="08x-xxx-xxxx"
                    />
                </div>

                <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                    <h3 className="text-sm font-bold text-yellow-800 mb-3 flex items-center">
                        ตั้งค่าคะแนนสะสม
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนกิโลกรัมต่อ 1 คะแนน</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="number"
                                min="1"
                                {...register('pointsPerKg')}
                                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 shadow-sm"
                                placeholder="10"
                            />
                            <span className="text-sm text-gray-500">กิโลกรัม = 1 คะแนน</span>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                    <h3 className="text-sm font-bold text-blue-800 flex items-center mb-2">
                        ตั้งค่าหมายเลขรัน (Running Number)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">รหัสสถานี / สาขา (Station Code)</label>
                            <input
                                type="text"
                                {...register('station_code')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 shadow-sm font-mono"
                                placeholder="เช่น RTB หรือ 3 ตัวแรกของชื่อผู้ใช้"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">* ใช้แทนที่ตัวแปร {`{STATION}`} ในฟอร์แมต</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ฟอร์แมตบิลซื้อ (Buy Bill)</label>
                            <input
                                type="text"
                                {...register('format_buy_bill')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 shadow-sm font-mono text-sm"
                                placeholder="B-{STATION}{YYYY}-{SEQ4}"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ฟอร์แมตบิลขาย (Sell Bill)</label>
                            <input
                                type="text"
                                {...register('format_sell_bill')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 shadow-sm font-mono text-sm"
                                placeholder="S-{STATION}{YYYY}-{SEQ4}"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">สมาชิกเกษตรกร (Farmer ID)</label>
                            <input
                                type="text"
                                {...register('format_farmer_id')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 shadow-sm font-mono text-sm"
                                placeholder="{STATION}-F-{SEQ4}"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ลูกจ้าง (Employee ID)</label>
                            <input
                                type="text"
                                {...register('format_employee_id')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 shadow-sm font-mono text-sm"
                                placeholder="{STATION}-E-{SEQ3}"
                            />
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-white/50 rounded-xl border border-blue-100 text-[10px] text-blue-700/70 space-y-1">
                        <p className="font-bold mb-1">💡 ตัวแปรที่รองรับ:</p>
                        <p><span className="font-mono font-bold">{'{STATION}'}</span> = รหัสสถานีข้างบน</p>
                        <p><span className="font-mono font-bold">{'{YYYY}'}, {'{MM}'}, {'{DD}'}</span> = ปี, เดือน, วัน ปัจจุบัน</p>
                        <p><span className="font-mono font-bold">{'{SEQn}'}</span> = เลขลำดับต่อท้าย n หลัก (เช่น {'{SEQ4}'} → 0001)</p>
                    </div>
                </div>

                <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 space-y-4">
                    <h3 className="text-sm font-bold text-amber-800 flex items-center mb-2">
                        ตั้งค่าการพิมพ์และใบเสร็จ (Printing Preferences)
                    </h3>
                    <div className="space-y-4">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    {...register('printESlip')}
                                    className="peer h-6 w-6 cursor-pointer appearance-none rounded-md border border-amber-300 bg-white checked:bg-amber-500 checked:border-amber-500 transition-all"
                                />
                                <div className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-700 group-hover:text-amber-800">สร้าง E-Slip อัตโนมัติ (Digital Receipt)</span>
                                <span className="text-[10px] text-gray-400">ระบบจะสร้างรูปภาพใบเสร็จและส่งแจ้งเตือนทาง LINE ให้อัตโนมัติหลังบันทึก</span>
                            </div>
                        </label>

                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    {...register('printPaperSlip')}
                                    className="peer h-6 w-6 cursor-pointer appearance-none rounded-md border border-amber-300 bg-white checked:bg-amber-500 checked:border-amber-500 transition-all"
                                />
                                <div className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-700 group-hover:text-amber-800">พิมพ์ Paper-slip อัตโนมัติ (Thermal Receipt)</span>
                                <span className="text-[10px] text-gray-400">ระบบจะดึงหน้าต่างสั่งพิมพ์ (Thermal Printer) ขึ้นมาให้อัตโนมัติหลังบันทึก</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 space-y-4">
                    <h3 className="text-sm font-bold text-purple-800 flex items-center mb-2">
                        ตั้งค่าหน้าแดชบอร์ด (Dashboard Settings)
                    </h3>
                    <div className="space-y-4">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    {...register('showPrizeDraw')}
                                    className="peer h-6 w-6 cursor-pointer appearance-none rounded-md border border-purple-300 bg-white checked:bg-purple-500 checked:border-purple-500 transition-all"
                                />
                                <div className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-700 group-hover:text-purple-800">แสดงปุ่มสุ่มจับรางวัล (Lucky Draw)</span>
                                <span className="text-[10px] text-gray-400">แสดงปุ่มสำหรับสุ่มจับรางวัลเกษตรกรผู้โชคดีที่หน้า Dashboard</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-rubber-600 text-white rounded-lg px-6 py-2.5 font-medium hover:bg-rubber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rubber-500 disabled:opacity-50 transition-colors flex items-center"
                    >
                        <Save size={18} className="mr-2" />
                        {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                    </button>
                </div>
            </form>
        </div>
    );
};
