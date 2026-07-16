/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const UserRoleBadge: React.FC<{ role: string }> = ({ role }) => {
  let bg = '';
  let text = '';
  let label = '';

  switch (role) {
    case 'SUPER_ADMIN':
      bg = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60';
      text = 'text-rose-700 dark:text-rose-400';
      label = 'Quản trị hệ thống';
      break;
    case 'PRINCIPAL':
      bg = 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60';
      text = 'text-indigo-700 dark:text-indigo-400';
      label = 'Hiệu trưởng';
      break;
    case 'VICE_PRINCIPAL':
      bg = 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60';
      text = 'text-purple-700 dark:text-purple-400';
      label = 'Hiệu phó';
      break;
    case 'CONTENT_EDITOR':
      bg = 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60';
      text = 'text-blue-700 dark:text-blue-400';
      label = 'Biên tập nội dung';
      break;
    case 'STAFF':
      bg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60';
      text = 'text-amber-700 dark:text-amber-400';
      label = 'Nhân viên';
      break;
    case 'TEACHER':
      bg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60';
      text = 'text-emerald-700 dark:text-emerald-400';
      label = 'Giáo viên';
      break;
    case 'STUDENT':
      bg = 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900/60';
      text = 'text-cyan-700 dark:text-cyan-400';
      label = 'Học sinh';
      break;
    default:
      bg = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800';
      text = 'text-slate-600 dark:text-slate-400';
      label = role;
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${bg} ${text}`}>
      {label}
    </span>
  );
};
