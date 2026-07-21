/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEditMode } from '../../features/cms/useEditMode';
import { Edit2, Eye, Settings, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../config/routes';

export default function EditToolbar() {
  const { editMode, toggleEditMode, canEdit } = useEditMode();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!canEdit) return null;

  return (
    <>
      {/* Desktop CMS Toolbar (>= 640px) */}
      <div className="hidden sm:block fixed bottom-6 right-6 z-50 animate-fade-in">
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

      {/* Mobile CMS Floating Button (< 640px) */}
      <div 
        ref={menuRef}
        className="block sm:hidden fixed right-4 z-50"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <div className="relative">
          {/* Main Floating Trigger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 active:scale-95 transition-all duration-200 cursor-pointer"
            aria-label="CMS Admin Menu"
          >
            <Settings className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
          </button>

          {/* Floating Dropdown Choices above the button */}
          {isOpen && (
            <div className="absolute bottom-14 right-0 mb-1 w-44 rounded-2xl bg-white dark:bg-slate-900 p-2 shadow-2xl border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex flex-col space-y-1 z-50">
              <button
                onClick={() => {
                  navigate(ROUTES.ADMIN);
                  setIsOpen(false);
                }}
                className="flex items-center space-x-2 w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <span>CMS Admin</span>
              </button>
              
              <button
                onClick={() => {
                  toggleEditMode();
                  setIsOpen(false);
                }}
                className="flex items-center space-x-2 w-full text-left px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                {editMode ? (
                  <>
                    <Eye className="h-4 w-4 text-emerald-500" />
                    <span>Xem Thử</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 text-red-500" />
                    <span>Chỉnh Sửa</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
