/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../config/routes';
import { AppRoleCode } from '../../types/auth';
import { AccessDenied } from './AccessDenied';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowedRoles?: AppRoleCode[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  allowedRoles,
}) => {
  const {
    isAuthenticated,
    loading,
    profile,
    roles,
    profileLoading,
    error,
    isActive,
    isAdminUser,
    hasAnyRole,
  } = useAuth();

  // Show a beautifully simple loading spinner while authentication and profile loading are in progress
  if (loading || (isAuthenticated && profileLoading)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-sans text-xs">
        <div className="flex flex-col items-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold">Đang xác thực quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // 1. Not authenticated -> Redirect to Login page
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // 2. Authenticated but missing database profile
  if (!profile && !profileLoading) {
    return <AccessDenied message="Tài khoản chưa được cấp quyền trong hệ thống" />;
  }

  // 3. Profile inactive
  if (!isActive) {
    return <AccessDenied message="Tài khoản đã bị khóa hoặc chưa được kích hoạt" />;
  }

  // 4. Admin required but not an admin
  if (requireAdmin && !isAdminUser) {
    return <AccessDenied message="Bạn không có quyền truy cập khu vực quản trị" />;
  }

  // 5. Allowed roles specified but user roles don't match
  if (allowedRoles && allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
    return <AccessDenied message="Bạn không có vai trò phù hợp để truy cập trang này" />;
  }

  return <>{children}</>;
};
