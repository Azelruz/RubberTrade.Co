import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser } from '../services/apiService';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const storedUser = localStorage.getItem('latex_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            // First try real API
            const response = await loginUser(username, password);
            if (response.status === 'success') {
                const userData = response.user;
                setUser(userData);
                localStorage.setItem('latex_user', JSON.stringify(userData));
                return { success: true };
            }
            return { success: false, message: response.message };
        } catch (error) {
            // Fallback for demo/setup if API is not set yet
            if (error.message === "API URL is missing" && username === 'admin' && password === 'admin123') {
                const dummyUser = { username: 'admin', role: 'admin' };
                setUser(dummyUser);
                localStorage.setItem('latex_user', JSON.stringify(dummyUser));
                return { success: true };
            }
            return { success: false, message: error.message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('latex_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
