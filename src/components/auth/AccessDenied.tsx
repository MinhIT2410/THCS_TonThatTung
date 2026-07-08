/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ROUTES } from '../../config/routes';

interface AccessDeniedProps {
  message: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ message }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4 font-sans text-xs">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 dark:bg-red-950/40 p-4 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-10 w-10" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Không có quyền truy cập</h2>
          <p className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed px-4">{message}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="flex w-full sm:w-auto items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Về trang chủ</span>
          </button>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex w-full sm:w-auto items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            <span>{loading ? 'Đang thoát...' : 'Đăng xuất'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
