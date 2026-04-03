import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleRoute = ({ children, allowedRoles }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">กำลังโหลด...</div>;
    }

    if (!user || (allowedRoles && !allowedRoles.includes(user.role?.toLowerCase()))) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default RoleRoute;
