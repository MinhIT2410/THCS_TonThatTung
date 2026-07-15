/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Menu, LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../config/routes';

interface AdminHeaderProps {
  onOpenSidebar: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onOpenSidebar }) => {
  const { profile, signOut, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur px-4 sm:px-6 lg:px-8 font-sans">
      {/* Left side: hamburger & title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSidebar}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden"
          id="open-sidebar-btn"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="hidden sm:inline-block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Khu vực quản trị hệ thống
        </span>
      </div>

      {/* Right side: User Profile and Sign out */}
      <div className="flex items-center space-x-4">
        {/* Profile Tag */}
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-none">
              {profile?.full_name || 'Người dùng'}
            </p>
            <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-none mt-0.5 uppercase tracking-wide flex items-center gap-0.5">
              <Shield className="h-2.5 w-2.5 text-blue-500" />
              {primaryRole?.name || 'Chưa phân quyền'}
            </p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
          title="Đăng xuất"
          id="header-logout-btn"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
