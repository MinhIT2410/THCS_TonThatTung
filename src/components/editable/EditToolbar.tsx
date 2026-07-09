/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useEditMode } from '../../features/cms/useEditMode';
import { Edit2, Eye, Settings, ShieldCheck } from 'lucide-react';

export default function EditToolbar() {
  const { editMode, toggleEditMode, canEdit } = useEditMode();

  if (!canEdit) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="flex items-center space-x-3 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300">
        <div className="flex items-center space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            CMS Admin
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        <button
          onClick={toggleEditMode}
          className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
            editMode
              ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {editMode ? (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span>Xem Thử</span>
            </>
          ) : (
            <>
              <Edit2 className="h-3.5 w-3.5" />
              <span>Chỉnh Sửa</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
