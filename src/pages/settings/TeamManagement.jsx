import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Mail, Shield, ShieldAlert, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchTeamMembers, inviteTeamMember, removeTeamMember } from '../../services/apiService';

export const TeamManagement = ({ user }) => {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    const loadTeam = async () => {
        setLoading(true);
        try {
            const data = await fetchTeamMembers();
            setTeam(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTeam();
    }, []);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!email) return;
        setInviting(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await inviteTeamMember(email);
            if (res.status === 'success') {
                setMessage({ type: 'success', text: res.message || 'ส่งคำเชิญสำเร็จ' });
                setEmail('');
                loadTeam();
            } else {
                setMessage({ type: 'error', text: res.message || 'เกิดข้อผิดพลาด' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = async (userId, userName) => {
        if (!window.confirm(`ยืนยันการลบ ${userName} ออกจากทีม?`)) return;
        try {
            const res = await removeTeamMember(userId);
            if (res.status === 'success') {
                loadTeam();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert(err.message);
        }
    };

    const isOwner = user?.role === 'owner' || user?.role === 'super_admin';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <Users className="mr-2 text-indigo-600" size={24} />
                        จัดการสมาชิกในทีม (System Access)
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">จัดการสิทธิการใช้งานระบบสำหรับพนักงานของร้าน</p>
                </div>
                <button
                    onClick={loadTeam}
                    className="inline-flex items-center px-3 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition text-sm font-bold"
                >
                    <RefreshCw size={18} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                    รีเฟรช
                </button>
            </div>

            {isOwner && (
                <section className="bg-white border-2 border-dashed border-indigo-100 rounded-2xl p-6 mb-8">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <UserPlus size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">เชิญพนักงานเข้าสู่ระบบ</h3>
                            <p className="text-sm text-gray-500">พนักงานที่ถูกเชิญ จะสามารถล็อกอินด้วย Gmail เพื่อเข้าถึงข้อมูลร้านของท่านได้</p>
                        </div>
                    </div>

                    <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ระบุ Gmail ของพนักงาน"
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={inviting || !email}
                            className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center space-x-2 whitespace-nowrap"
                        >
                            {inviting ? <RefreshCw size={20} className="animate-spin" /> : <UserPlus size={20} />}
                            <span>เชิญพนักงาน</span>
                        </button>
                    </form>

                    {message.text && (
                        <div className={`mt-4 flex items-center p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={16} className="mr-2" /> : <AlertCircle size={16} className="mr-2" />}
                            {message.text}
                        </div>
                    )}

                    <div className="mt-4 flex items-center justify-between py-2 px-4 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-center text-amber-800 text-xs font-bold">
                            <ShieldAlert size={14} className="mr-2" />
                            โควตาพนักงานในแพ็กเกจของคุณ: 
                        </div>
                        <div className="text-sm font-black text-amber-900">
                            {team.filter(m => m.role === 'staff').length} / {user?.maxStaffLimit || 1} คน
                        </div>
                    </div>
                </section>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">สมาชิก</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">บทบาท</th>
                            <th className="px-6 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">วันที่เข้าร่วม</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {team.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${member.role === 'owner' ? 'bg-indigo-600' : member.role === 'admin' ? 'bg-amber-500' : 'bg-gray-400'}`}>
                                            {member.username?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{member.username}</div>
                                            <div className="text-xs text-gray-500">{member.email}</div>
                                            {member.id.startsWith('invited_') && (
                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase mt-1 inline-block">Pending Invite</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                                        member.role === 'owner' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                        member.role === 'super_admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        'bg-gray-50 text-gray-600 border-gray-200'
                                    }`}>
                                        <Shield size={12} className="mr-1.5" />
                                        {member.role === 'owner' ? 'เจ้าของร้าน' : member.role === 'super_admin' ? 'Super Admin' : 'พนักงาน'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                    {member.created_at ? new Date(member.created_at).toLocaleDateString('th-TH') : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {isOwner && member.role !== 'owner' && member.role !== 'super_admin' && (
                                        <button
                                            onClick={() => handleRemove(member.id, member.username)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="ลบออกจากทีม"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {team.length === 0 && !loading && (
                    <div className="py-20 text-center text-gray-400">
                        <Users size={48} className="mx-auto mb-4 opacity-10" />
                        <p>ยังไม่มีข้อมูลทีม</p>
                    </div>
                )}
            </div>
        </div>
    );
};
