import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Navigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getScriptUrl } from '../services/apiService';
import toast from 'react-hot-toast';

export const Login = () => {
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Redirect if already logged in
    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!getScriptUrl() && username !== 'admin') {
                toast.error('รหัสผ่านไม่ถูกต้อง');
                return;
            }

            const result = await login(username, password);
            if (result.success) {
                toast.success('เข้าสู่ระบบสำเร็จ');
                navigate('/');
            } else {
                toast.error(result.message || 'รหัสผ่านไม่ถูกต้อง');
            }
        } catch (err) {
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-rubber-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">

                <div className="bg-rubber-600 p-8 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Leaf size={32} className="text-rubber-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">ระบบจัดการรับซื้อ</h2>
                    <p className="text-rubber-100">น้ำยางพารา (Rubber Trade)</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้ใช้งาน (Username)</label>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 transition-shadow"
                                    placeholder="กรอกชื่อผู้ใช้งาน"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน (Password)</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-rubber-500 focus:border-rubber-500 transition-shadow"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-rubber-600 hover:bg-rubber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rubber-500 disabled:opacity-50 transition-colors"
                            >
                                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                            </button>

                        </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
