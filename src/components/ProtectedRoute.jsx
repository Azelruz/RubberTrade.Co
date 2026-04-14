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

    // Skip lock checks for subscription page so they can renew
    const isSubscriptionPage = location.pathname === '/subscription';

    if (user && !isSubscriptionPage) {
        const now = Date.now();
        const expiryStr = localStorage.getItem('rt_subscription_expiry');
        const lastSyncStr = localStorage.getItem('rt_last_sync');
        
        // 1. Check Expiry
        if (expiryStr) {
            const expiry = new Date(expiryStr).getTime();
            if (now > expiry) {
                return <Navigate to="/sync-required" replace />;
            }
        }

        // 2. Check Heartbeat (3 days = 72 hours)
        if (lastSyncStr) {
            const lastSync = new Date(lastSyncStr).getTime();
            const threeDaysMs = 72 * 60 * 60 * 1000;
            
            // Over 3 days offline
            if (now - lastSync > threeDaysMs) {
                return <Navigate to="/sync-required" replace />;
            }

            // Anti-Clock-Tampering (Now is before last sync)
            if (now < lastSync - (5 * 60 * 1000)) { // 5 min buffer for slight clock drifts
                return <Navigate to="/sync-required" replace />;
            }
        } else if (user) {
            // If logged in but no sync record (shouldn't happen with updated AuthContext),
            // we let it pass for the first time but it will be set on next successful sync.
        }
    }

    return children;
};

export default ProtectedRoute;
