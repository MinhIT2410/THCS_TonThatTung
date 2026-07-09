/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DocumentStatus } from '../documentTypes';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
}

export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({ status }) => {
  let bg = '';
  let text = '';
  let label = '';

  switch (status) {
    case 'published':
      bg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60';
      text = 'text-emerald-700 dark:text-emerald-400';
      label = 'Đã xuất bản';
      break;
    case 'archived':
      bg = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800';
      text = 'text-slate-600 dark:text-slate-400';
      label = 'Đã lưu trữ';
      break;
    case 'draft':
    default:
      bg = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60';
      text = 'text-amber-700 dark:text-amber-400';
      label = 'Bản nháp';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${bg} ${text}`}>
      {label}
    </span>
  );
};
