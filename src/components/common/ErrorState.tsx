/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ 
  message = 'Không thể tải dữ liệu. Vui lòng thử lại sau.',
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col justify-center items-center py-20 text-center max-w-sm mx-auto space-y-4" id="error-state">
      <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-full text-red-500">
        <AlertCircle className="h-10 w-10" />
      </div>
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition-colors"
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
}
