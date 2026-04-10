import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    // If still loading, show loader
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-12 h-12 text-rubber-600 animate-spin" />
            </div>
        );
    }

    // Check if we are currently in an OAuth redirect flow (hash contains access_token)
    const isAuthenticating = window.location.hash.includes('access_token=') || 
                             window.location.hash.includes('id_token=') ||
                             window.location.hash.includes('error=');

    if (!user && !isAuthenticating) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If we have no user but we ARE authenticating (token is in URL), 
    // we show the loader while Supabase processes the hash
    if (!user && isAuthenticating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-rubber-600 animate-spin" />
                    <p className="text-gray-500 font-medium">กำลังยืนยันตัวตน...</p>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
