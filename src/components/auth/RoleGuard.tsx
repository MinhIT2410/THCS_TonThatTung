/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { UserRole } from '../../features/auth/authTypes';
import { AccessDenied } from './AccessDenied';

export interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback = <AccessDenied message="Bạn không có quyền truy cập khu vực này." />,
}) => {
  const { profile } = useAuth();

  const userRole = profile?.role;
  const isAllowed = userRole && allowedRoles.includes(userRole);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleGuard;
