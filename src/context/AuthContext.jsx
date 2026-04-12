import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { getSubscriptionStatus, clearAllCache } from '../services/apiService';
import db from '../services/db';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const updateUser = async (sbUser) => {
        if (sbUser) {
            // Basic info from Supabase
            const baseUser = {
                id: sbUser.id,
                email: sbUser.email,
                role: sbUser.user_metadata?.role || 'owner',
                username: sbUser.email?.split('@')[0] || 'User',
                user_metadata: sbUser.user_metadata
            };

            setUser(baseUser);

            // Fetch extra info (subscription) from our D1 API
            try {
                const subRes = await getSubscriptionStatus();
                if (subRes && subRes.status === 'success') {
                    setUser(prev => ({
                        ...prev,
                        subscriptionStatus: subRes.subscription?.subscription_status || 'trial',
                        subscriptionExpiry: subRes.subscription?.subscription_expiry,
                        // Override role if it exists in our DB (e.g. super_admin)
                        role: subRes.subscription?.role || baseUser.role
                    }));
                }
            } catch (err) {
                console.error("Error fetching subscription status:", err);
            }
        } else {
            setUser(null);
        }
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            updateUser(session?.user);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("DEBUG: Auth State Changed:", event);
            console.log("DEBUG: Session detected:", session ? "YES" : "NO");
            
            setSession(session);
            updateUser(session?.user);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
                queryParams: {
                    prompt: 'select_account'
                }
            }
        });
        if (error) throw error;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        
        // Clear all IndexedDB and Session Storage caches upon logout to prevent multi-tenant data leakage
        try {
            clearAllCache();
            await db.delete(); // Delete the entire IndexedDB database safely
            
            // Reload the page to ensure all memory state is wiped and DB is re-initialized for the next login
            window.location.reload();
        } catch (err) {
            console.error("Failed to clear local cache on logout:", err);
            // Fallback reload if wipe errors out
            window.location.reload();
        }
    };

    const getToken = () => session?.access_token;

    return (
        <AuthContext.Provider value={{ user, session, loginWithGoogle, logout, isLoading, getToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
