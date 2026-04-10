import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleRoute = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">กำลังโหลด...</div>;
    }

    // For Supabase, roles might be in user_metadata or we default to owner for now to allow migration
    const userRole = user?.user_metadata?.role || user?.role || 'owner';
    const isSuperAdminFallback = user?.email === 'narapong.an@gmail.com' || user?.username === 'narapong.an';

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles) {
        const hasRolePermission = allowedRoles.includes(userRole.toLowerCase());
        const isAllowedByFallback = isSuperAdminFallback && allowedRoles.includes('super_admin');
        
        if (!hasRolePermission && !isAllowedByFallback) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default RoleRoute;
