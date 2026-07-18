/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useAuth } from '../../features/auth/AuthContext';
import { AccountMenuPopover } from './AccountMenuPopover';
import { getRoleLabel, getPrimaryRole } from './accountRoleLabels';
import { ROUTES } from '../../config/routes';

export const AccountMenu: React.FC = () => {
  const { user, profile, roles, loading, profileLoading, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on pressing Escape inside the container
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const container = containerRef.current;
    if (container && isOpen) {
      container.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [isOpen]);

  // Wait for auth loading or, if user is logged in, wait for profile loading
  const isCurrentlyLoading = loading || (isAuthenticated && profileLoading);

  if (isCurrentlyLoading) {
    // Elegant skeleton / disabled state to prevent layout shift and flicker
    return (
      <div className="flex h-11 items-center space-x-2 rounded-xl border border-blue-100/40 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-950/10 px-3 select-none opacity-60 animate-pulse">
        <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
        <div className="flex flex-col space-y-1">
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-2 w-10 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // 1. Unauthenticated/Logged out state
    return (
      <button
        onClick={() => navigate(ROUTES.LOGIN)}
        className="flex h-11 items-center space-x-1.5 rounded-xl px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 cursor-pointer"
      >
        <UserIcon className="h-4 w-4" />
        <span>Đăng nhập</span>
      </button>
    );
  }

  // 2. Authenticated/Logged in state
  const displayName = profile?.full_name || user?.email || 'Tài khoản';
  const mainRoleCode = getPrimaryRole(roles);
  const primaryRoleLabel = getRoleLabel(mainRoleCode);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id="account-menu-trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="account-menu-popover"
        onClick={() => setIsOpen(!isOpen)}
        className={`group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border p-1 px-2.5 hover:shadow-sm transition-all duration-200 cursor-pointer select-none xl:min-w-[190px] xl:max-w-[220px] xl:px-3 2xl:px-3.5 ${
          isOpen 
            ? 'ring-2 ring-blue-500/20 border-blue-500 bg-blue-100/50 dark:bg-blue-900/40' 
            : 'border-blue-100/50 bg-blue-50/50 hover:bg-blue-100/60 dark:border-blue-900/40 dark:bg-blue-950/20 dark:hover:bg-blue-900/30'
        }`}
      >
        {/* User Avatar */}
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full object-cover shrink-0 border border-blue-500/20"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100/80 dark:bg-blue-950/80 border border-blue-200/50 dark:border-blue-800 text-blue-600 dark:text-blue-400 shrink-0">
            <UserIcon className="h-4 w-4" />
          </div>
        )}

        {/* User Info */}
        <span className="hidden min-w-0 flex-1 flex-col items-center justify-center xl:flex select-none leading-none">
          {/* Full Name */}
          <span className="block max-w-[150px] truncate whitespace-nowrap text-center text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-tight">
            {displayName}
          </span>
          {/* Role Label */}
          <span className="hidden max-w-[140px] truncate whitespace-nowrap text-center text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5 leading-[1.15] 2xl:block">
            {primaryRoleLabel}
          </span>
        </span>

        {/* ChevronDown */}
        <span className="flex w-5 shrink-0 items-center justify-center">
          <ChevronDown 
            className="h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200" 
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
          />
        </span>
      </button>

      {/* Popover Widget */}
      <AnimatePresence>
        {isOpen && (
          <AccountMenuPopover
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            triggerRef={triggerRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
