/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Home, Shield, LogOut, Key, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../features/auth/AuthContext';
import { getRoleLabel, getRoleColorClass, canAccessAdmin } from './accountRoleLabels';
import { ROUTES } from '../../config/routes';

interface AccountMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const AccountMenuPopover: React.FC<AccountMenuPopoverProps> = ({
  isOpen,
  onClose,
  triggerRef,
}) => {
  const { user, profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose, triggerRef]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Focus first menu item for accessibility when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        menuItemsRef.current[0]?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'Thành viên';
  const email = user?.email || '';
  const hasProfileData = !!profile;
  const isActive = profile?.is_active;
  const hasAdminAccess = canAccessAdmin(roles);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  // Setup keyboard accessibility for menu items
  const menuItemsRef = useRef<(HTMLButtonElement | HTMLAnchorElement)[]>([]);

  const handleMenuKeyDown = (event: React.KeyboardEvent, index: number) => {
    const totalItems = menuItemsRef.current.length;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = (index + 1) % totalItems;
      menuItemsRef.current[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = (index - 1 + totalItems) % totalItems;
      menuItemsRef.current[prevIndex]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      menuItemsRef.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      menuItemsRef.current[totalItems - 1]?.focus();
    }
  };

  // Clear menu items list on each render to prevent stale/duplicate refs on DOM changes
  menuItemsRef.current = [];

  return (
    <motion.div
      ref={popoverRef}
      id="account-menu-popover"
      role="menu"
      aria-label="Menu tài khoản"
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="max-sm:fixed max-sm:left-[12px] max-sm:right-[12px] max-sm:top-[68px] max-sm:w-auto max-sm:max-h-[calc(100dvh-88px)] max-sm:overflow-y-auto sm:absolute sm:right-0 sm:mt-2 sm:w-[310px] sm:max-w-[calc(100vw-24px)] rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl z-50 text-slate-800 dark:text-slate-100"
    >
      {/* A. User Info Section */}
      <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-800/60">
        {/* Large Avatar */}
        <div className="relative mb-2.5">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={fullName}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-full object-cover border-2 border-blue-500/20"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400">
              <UserIcon className="h-8 w-8" />
            </div>
          )}
          {/* Active status indicator */}
          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" />
        </div>

        {/* Display name and email */}
        <h3 className="font-sans text-sm font-semibold text-slate-800 dark:text-slate-100 truncate w-full px-2">
          {fullName}
        </h3>
        <p className="text-[11px] font-sans text-slate-400 dark:text-slate-500 break-all [overflow-wrap:anywhere] w-full px-2 mb-3">
          {email}
        </p>

        {/* List of Roles */}
        <div className="flex flex-wrap justify-center gap-1.5 max-h-24 overflow-y-auto px-1 mb-2.5">
          {roles && roles.length > 0 ? (
            roles.map((roleObj) => (
              <span
                key={roleObj.code}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleColorClass(roleObj.code)} whitespace-nowrap`}
              >
                {getRoleLabel(roleObj.code)}
              </span>
            ))
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-900">
              Tài khoản
            </span>
          )}
        </div>

        {/* Account status */}
        <div className="flex items-center space-x-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          {!hasProfileData ? (
            <>
              <XCircle className="h-3.5 w-3.5 text-slate-400" />
              <span>Chưa xác định trạng thái</span>
            </>
          ) : isActive ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Tài khoản: Hoạt động</span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span>Tài khoản: Vô hiệu hóa</span>
            </>
          )}
        </div>
      </div>

      {/* B. Action Items Section */}
      <div className="pt-2.5 space-y-1">
        {/* Home (Trang chủ) */}
        <button
          ref={(el) => { if (el) menuItemsRef.current[0] = el; }}
          role="menuitem"
          onKeyDown={(e) => handleMenuKeyDown(e, 0)}
          onClick={() => handleAction(() => navigate(ROUTES.HOME))}
          className="flex w-full items-center space-x-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 focus:bg-blue-50/50 dark:focus:bg-blue-950/30 focus:text-blue-600 dark:focus:text-blue-400 outline-none transition-colors"
        >
          <Home className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <span>Trang chủ</span>
        </button>

        {/* Admin Area (Khu vực quản trị) - conditional */}
        {hasAdminAccess && (
          <button
            ref={(el) => { if (el) menuItemsRef.current[1] = el; }}
            role="menuitem"
            onKeyDown={(e) => handleMenuKeyDown(e, 1)}
            onClick={() => handleAction(() => navigate(ROUTES.ADMIN))}
            className="flex w-full items-center space-x-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 focus:bg-blue-50/50 dark:focus:bg-blue-950/30 focus:text-blue-600 dark:focus:text-blue-400 outline-none transition-colors"
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
            <span>Khu vực quản trị</span>
          </button>
        )}

        {/* Change password (Đổi mật khẩu) */}
        <button
          ref={(el) => {
            const idx = hasAdminAccess ? 2 : 1;
            if (el) menuItemsRef.current[idx] = el;
          }}
          role="menuitem"
          onKeyDown={(e) => handleMenuKeyDown(e, hasAdminAccess ? 2 : 1)}
          onClick={() => handleAction(() => navigate(ROUTES.RESET_PASSWORD))}
          className="flex w-full items-center space-x-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 focus:bg-blue-50/50 dark:focus:bg-blue-950/30 focus:text-blue-600 dark:focus:text-blue-400 outline-none transition-colors"
        >
          <Key className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <span>Đổi mật khẩu</span>
        </button>

        {/* Divider */}
        <div className="my-1 border-t border-slate-100 dark:border-slate-800/60" />

        {/* Sign out (Đăng xuất) */}
        <button
          ref={(el) => {
            const idx = hasAdminAccess ? 3 : 2;
            if (el) menuItemsRef.current[idx] = el;
          }}
          role="menuitem"
          onKeyDown={(e) => handleMenuKeyDown(e, hasAdminAccess ? 3 : 2)}
          onClick={() => handleAction(() => signOut())}
          className="flex w-full items-center space-x-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 focus:bg-rose-50 dark:focus:bg-rose-950/20 outline-none transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </motion.div>
  );
};
