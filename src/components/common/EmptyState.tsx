/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  description?: string;
}

export default function EmptyState({ 
  message = 'Chưa có nội dung nào.',
  description = 'Nội dung đang được cập nhật, em vui lòng quay lại sau nhé!'
}: EmptyStateProps) {
  return (
    <div className="flex flex-col justify-center items-center py-20 text-center max-w-sm mx-auto space-y-4" id="empty-state">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500">
        <Inbox className="h-10 w-10" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display font-bold text-slate-800 dark:text-slate-200">{message}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
