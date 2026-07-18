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
      <div className="flex items-center space-x-2 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20 p-1.5 pr-3 select-none opacity-60 animate-pulse">
        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
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
        className="flex items-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-semibold bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
      >
        <UserIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <span>Tài khoản</span>
      </button>
    );
  }

  // 2. Authenticated/Logged in state
  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'Thành viên';
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
        className="flex items-center space-x-2 text-left rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-1.5 pr-3 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
      >
        {/* User Avatar */}
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={fullName}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full object-cover shrink-0 border border-blue-500/10"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
            <UserIcon className="h-4 w-4" />
          </div>
        )}

        {/* User Info (hidden on extreme small, shown on sm+) */}
        <div className="hidden sm:flex flex-col select-none leading-none min-w-0 max-w-[140px] md:max-w-[180px]">
          {/* Full Name (shown only on lg+ to prevent cluttering header) */}
          <span className="hidden lg:block text-xs font-bold text-slate-700 dark:text-slate-200 truncate mb-1">
            {fullName}
          </span>
          {/* Role Label */}
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider truncate">
            {primaryRoleLabel}
          </span>
        </div>

        {/* Small role display on mobile (instead of name) */}
        <span className="sm:hidden text-[10px] text-slate-500 dark:text-slate-400 font-bold max-w-[80px] truncate">
          {primaryRoleLabel}
        </span>

        {/* ChevronDown */}
        <ChevronDown 
          className="h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200" 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
        />
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
