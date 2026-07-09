/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface UserStatusBadgeProps {
  isActive: boolean;
}

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({ isActive }) => {
  return isActive ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400">
      Đang hoạt động
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400">
      Đã khóa
    </span>
  );
};
