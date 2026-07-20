/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NewsCategoryCode = 'LEARNING' | 'TRAINING' | 'EVENT' | 'ROLE_MODEL';

export interface CategoryInfo {
  code: NewsCategoryCode;
  label: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
}

export const NEWS_CATEGORY_CONFIG: Record<NewsCategoryCode, CategoryInfo> = {
  LEARNING: {
    code: 'LEARNING',
    label: 'Học tập',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  TRAINING: {
    code: 'TRAINING',
    label: 'Rèn luyện',
    badgeClass: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900',
    bgClass: 'bg-green-50 dark:bg-green-950/40',
    textClass: 'text-green-700 dark:text-green-400',
  },
  EVENT: {
    code: 'EVENT',
    label: 'Sự kiện',
    badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
  ROLE_MODEL: {
    code: 'ROLE_MODEL',
    label: 'Gương sáng',
    badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900',
    bgClass: 'bg-purple-50 dark:bg-purple-950/40',
    textClass: 'text-purple-700 dark:text-purple-400',
  },
};

export const DEFAULT_CATEGORY_INFO = {
  label: 'Chưa phân loại',
  publicLabel: 'Tin tức',
  badgeClass: 'bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
  bgClass: 'bg-slate-50 dark:bg-slate-900/40',
  textClass: 'text-slate-500 dark:text-slate-400',
};
