/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Đang tải dữ liệu...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col justify-center items-center py-24 min-h-[40vh] space-y-4" id="loading-state">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 animate-pulse">{message}</p>
    </div>
  );
}
