/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { DocumentCategory } from '../documentTypes';

interface DocumentCategoryBadgeProps {
  category: DocumentCategory;
}

export const DocumentCategoryBadge: React.FC<DocumentCategoryBadgeProps> = ({ category }) => {
  let bg = '';
  let text = '';
  let label = '';

  switch (category) {
    case 'ke_hoach':
      bg = 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60';
      text = 'text-blue-700 dark:text-blue-400';
      label = 'Kế hoạch';
      break;
    case 'cong_van':
      bg = 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60';
      text = 'text-indigo-700 dark:text-indigo-400';
      label = 'Công văn';
      break;
    case 'bieu_mau':
      bg = 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60';
      text = 'text-purple-700 dark:text-purple-400';
      label = 'Biểu mẫu';
      break;
    case 'quyet_dinh':
      bg = 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900/60';
      text = 'text-teal-700 dark:text-teal-400';
      label = 'Quyết định';
      break;
    case 'khac':
    default:
      bg = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800';
      text = 'text-slate-700 dark:text-slate-300';
      label = 'Khác';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${bg} ${text}`}>
      {label}
    </span>
  );
};
