import React from 'react';
import { Wallet, Gift } from 'lucide-react';

const WageConfirmModal = ({ 
    wageConfirmData, setWageConfirmData, confirmAndRecordWages, stats 
}) => {
    if (!wageConfirmData.show) return null;
    
    return (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <Wallet className="text-blue-600" size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">ยืนยันบันทึกค่าจ้าง</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                    พนักงานที่ยังไม่ได้บันทึกวันนี้ <strong>{wageConfirmData.unpaidStaff.length} คน</strong>:
                </p>
                <ul className="text-sm text-gray-700 mb-3 space-y-1 max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
                    {wageConfirmData.unpaidStaff.map(s => (
                        <li key={s.id} className="flex justify-between">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-gray-500">ค่าจ้าง ฿{(Number(s.salary)||0).toLocaleString()} + โบนัส ฿{wageConfirmData.bonus}</span>
                        </li>
                    ))}
                </ul>
                <p className="text-xs text-gray-400 mb-4">โบนัสคำนวณจากน้ำยาง {stats.todayBuyWeight.toLocaleString()} กก. = ฿{wageConfirmData.bonus}/คน</p>
                <div className="flex space-x-3">
                    <button onClick={() => setWageConfirmData({ show: false, unpaidStaff: [], bonus: 0 })}
                        className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium">ยกเลิก</button>
                    <button onClick={confirmAndRecordWages}
                        className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold">ยืนยัน บันทึกค่าจ้าง</button>
                </div>
            </div>
        </div>
    );
};

const LuckyDrawModal = ({
    showLuckyDraw, setShowLuckyDraw, isSpinning, winner, luckyStartDate, setLuckyStartDate,
    luckyEndDate, setLuckyEndDate, startLuckyDraw, rewardName, setRewardName, handleSaveWinner,
    savingReward
}) => {
    if (!showLuckyDraw) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-white text-center rounded-t-2xl relative">
                    <button onClick={() => !isSpinning && setShowLuckyDraw(false)} className="absolute top-4 right-4 text-white/80 hover:text-white">ปิด</button>
                    <Gift size={48} className="mx-auto mb-2 opacity-90" />
                    <h2 className="text-2xl font-black tracking-tight">จับผู้โชคดีสุ่มแจกรางวัล</h2>
                    <p className="text-yellow-100 text-sm mt-1">สุ่มรางวัลจากรายชื่อเกษตรกรที่นำยางมาขาย</p>
                </div>
                
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">เริ่มต้น:</label>
                            <input 
                                type="date" 
                                value={luckyStartDate} 
                                onChange={e => setLuckyStartDate(e.target.value)}
                                disabled={isSpinning}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">สิ้นสุด:</label>
                            <input 
                                type="date" 
                                value={luckyEndDate} 
                                onChange={e => setLuckyEndDate(e.target.value)}
                                disabled={isSpinning}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 min-h-[140px] flex flex-col items-center justify-center relative overflow-hidden mb-6">
                        {!winner && !isSpinning ? (
                            <p className="text-gray-400 font-medium text-center">กดปุ่มเริ่มสุ่มเพื่อหาผู้โชคดี</p>
                        ) : (
                            <div className={`text-center transition-all ${isSpinning ? 'scale-105 opacity-80 blur-[1px]' : 'scale-110 opacity-100'}`}>
                                <p className="text-xs font-bold text-gray-500 mb-1">เลขที่บิล: {winner?.id}</p>
                                <h3 className="text-3xl font-black text-gray-900 mb-2 truncate max-w-[280px]">{winner?.farmerName}</h3>
                                <div className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                                    น้ำยาง: {winner?.weight} กก.
                                </div>
                            </div>
                        )}
                    </div>

                    {!isSpinning && winner && (
                        <div className="mb-6 animate-in slide-in-from-bottom-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">🎈 รางวัลที่จะให้:</label>
                            <input 
                                type="text" 
                                value={rewardName}
                                onChange={e => setRewardName(e.target.value)}
                                placeholder="ไข่ไก่ 1 แผง, ปุ๋ยเคมี 1 กระสอบ..."
                                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 shadow-sm"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="mt-2">
                        <div className="flex flex-col space-y-2">
                            {!winner || isSpinning ? (
                                <button 
                                    onClick={startLuckyDraw}
                                    disabled={isSpinning}
                                    className={`w-full py-4 rounded-xl font-black text-base text-white shadow-lg transition-all transform active:scale-95 ${isSpinning ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-rubber-600 to-rubber-700 hover:shadow-rubber-200'}`}
                                >
                                    {isSpinning ? (
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>กำลังสุ่มผู้โชคดี...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center space-x-2">
                                            <Gift size={20} />
                                            <span>🎯 เริ่มสุ่มรางวัลตอนนี้</span>
                                        </div>
                                    )}
                                </button>
                            ) : (
                                <>
                                    <button 
                                        onClick={handleSaveWinner}
                                        disabled={savingReward}
                                        className="w-full py-4 rounded-xl font-black text-base text-white shadow-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:shadow-yellow-200 transition-all transform active:scale-95 flex justify-center items-center space-x-2"
                                    >
                                        {savingReward ? (
                                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : <Gift size={20} />}
                                        <span>{savingReward ? 'กำลังบันทึก...' : 'บันทึกรางวัลผู้โชคดี'}</span>
                                    </button>
                                    <button 
                                        onClick={startLuckyDraw}
                                        className="w-full py-2 rounded-xl font-bold text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all underline decoration-dotted"
                                    >
                                        สุ่มผู้โชคดีคนถัดไป
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { WageConfirmModal, LuckyDrawModal };
