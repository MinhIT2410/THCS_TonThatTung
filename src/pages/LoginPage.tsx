/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../config/routes';
import { Lock, Key, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { isSupabaseConfigured } from '../lib/supabase/client';

export default function LoginPage() {
  const { signIn, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(ROUTES.ADMIN, { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setErrorMsg('Hệ thống chưa được cấu hình biến môi trường Supabase. Vui lòng thiết lập VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong Settings.');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg('Email hoặc mật khẩu không đúng.');
      } else {
        navigate(ROUTES.ADMIN, { replace: true });
      }
    } catch (err) {
      setErrorMsg('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-sans text-xs">
        <div className="flex flex-col items-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16 px-4 font-sans text-xs flex flex-col items-center min-h-[60vh] justify-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white shadow-md">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-display font-bold text-lg text-slate-900 dark:text-white">Bảo mật hệ thống CMS</h1>
          <p className="text-slate-500 dark:text-slate-400">Đăng nhập tài khoản Quản trị viên Supabase để thay đổi cấu trúc, nội dung và phê duyệt phản hồi.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {!isSupabaseConfigured && (
            <div className="flex items-start space-x-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-150 dark:border-amber-900/50">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">
                Hệ thống chưa được cấu hình biến môi trường Supabase. Vui lòng thêm <strong>VITE_SUPABASE_URL</strong> và <strong>VITE_SUPABASE_ANON_KEY</strong> vào phần Settings (Secrets).
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">Email đăng nhập:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@domain.com"
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-55"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">Mật khẩu:</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-55"
              required
            />
          </div>

          {errorMsg && (
            <div className="flex items-start space-x-2 text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-100 dark:border-red-900/50">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-red-600 py-3 text-xs font-bold text-white hover:from-blue-700 hover:to-red-700 transition-all shadow-md disabled:opacity-55"
          >
            <Key className="h-4.5 w-4.5" />
            <span>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập hệ thống'}</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
}
