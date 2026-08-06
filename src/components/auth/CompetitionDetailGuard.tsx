/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { AccessDenied } from './AccessDenied';

const TEACHER_AND_ABOVE_ROLES = [
  'SUPER_ADMIN',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'CONTENT_EDITOR',
  'STAFF',
  'TEACHER',
];

interface CompetitionDetailGuardProps {
  children: React.ReactNode;
}

export const CompetitionDetailGuard: React.FC<CompetitionDetailGuardProps> = ({ children }) => {
  const { isAuthenticated, loading, profileLoading, hasAnyRole } = useAuth();

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-sans text-xs">
        <div className="flex flex-col items-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  const isAllowed = isAuthenticated && hasAnyRole(TEACHER_AND_ABOVE_ROLES);

  if (!isAllowed) {
    return <AccessDenied message="Bạn không có quyền xem nội dung này" />;
  }

  return <>{children}</>;
};

export default CompetitionDetailGuard;
