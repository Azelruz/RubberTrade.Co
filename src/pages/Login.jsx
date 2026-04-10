import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Navigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getScriptUrl } from '../services/apiService';
import toast from 'react-hot-toast';

export const Login = () => {
    const [loading, setLoading] = useState(false);
    const { loginWithGoogle, user, isLoading } = useAuth();
    const navigate = useNavigate();

    // Show loading while checking initial session
    if (isLoading) {
        return (
            <div className="min-h-screen bg-rubber-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rubber-600"></div>
            </div>
        )
    }

    // Redirect if already logged in
    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google');
            console.error(err);
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

                <div className="p-8 space-y-6">
                    <p className="text-gray-600 text-center">
                        กรุณาเข้าสู่ระบบด้วยบัญชี Google เพื่อใช้งานระบบ
                    </p>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rubber-500 disabled:opacity-50 transition-all duration-200"
                    >
                        {loading ? (
                            <span>กำลังเชื่อมต่อ...</span>
                        ) : (
                            <>
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                                <span>เข้าสู่ระบบด้วย Google</span>
                            </>
                        )}
                    </button>

                    <div className="text-center text-xs text-gray-400 mt-8">
                        &copy; {new Date().getFullYear()} Rubber Trade .co
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
