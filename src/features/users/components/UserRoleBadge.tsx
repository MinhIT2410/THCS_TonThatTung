/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole } from '../userTypes';

interface UserRoleBadgeProps {
  role: UserRole;
}

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role }) => {
  let bg = '';
  let text = '';
  let label = '';

  switch (role) {
    case 'admin':
      bg = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60';
      text = 'text-rose-700 dark:text-rose-400';
      label = 'Quản trị viên';
      break;
    case 'editor':
      bg = 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60';
      text = 'text-blue-700 dark:text-blue-400';
      label = 'Biên tập viên';
      break;
    case 'teacher':
      bg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60';
      text = 'text-emerald-700 dark:text-emerald-400';
      label = 'Giáo viên';
      break;
    case 'viewer':
    default:
      bg = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800';
      text = 'text-slate-600 dark:text-slate-400';
      label = 'Người xem';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${bg} ${text}`}>
      {label}
    </span>
  );
};
