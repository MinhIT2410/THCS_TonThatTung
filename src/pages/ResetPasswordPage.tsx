/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../config/routes';
import { Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // We can also double check if a recovery session exists or if they came from a valid link
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMsg('Hệ thống chưa được cấu hình biến môi trường Supabase.');
      return;
    }

    // Check if we have an active recovery flow or user session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Supabase automatically parses hash tokens on load, so we should have a session
      if (!session) {
        console.warn('No active recovery session found. The user might need to log in first or request a new reset link.');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      setErrorMsg('Hệ thống chưa được cấu hình biến môi trường Supabase.');
      return;
    }

    if (!password || !confirmPassword) {
      setErrorMsg('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setErrorMsg(error.message || 'Không thể cập nhật mật khẩu. Vui lòng kiểm tra lại liên kết khôi phục.');
      } else {
        setSuccessMsg('Cập nhật mật khẩu thành công! Hệ thống sẽ tự động chuyển bạn về trang đăng nhập sau vài giây.');
        
        // Wait 3 seconds and redirect to login page
        setTimeout(() => {
          navigate(ROUTES.LOGIN, { replace: true });
        }, 3000);
      }
    } catch (err: any) {
      setErrorMsg('Đã xảy ra lỗi hệ thống khi cập nhật mật khẩu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-16 px-4 font-sans text-xs flex flex-col items-center min-h-[60vh] justify-center">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-600 text-white shadow-md">
            <Key className="h-6 w-6" />
          </div>
          <h1 className="font-display font-bold text-lg text-slate-900 dark:text-white">Đặt lại mật khẩu mới</h1>
          <p className="text-slate-500 dark:text-slate-400">Thiết lập mật khẩu bảo mật mới cho tài khoản quản trị của bạn.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">Mật khẩu mới (Tối thiểu 8 ký tự):</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting || !!successMsg}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white disabled:opacity-55"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700 dark:text-slate-300">Xác nhận mật khẩu mới:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting || !!successMsg}
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

          {successMsg && (
            <div className="flex items-start space-x-2 text-green-600 bg-green-50 dark:bg-green-950/30 p-3 rounded-xl border border-green-100 dark:border-green-900/50">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !!successMsg}
            className="flex w-full items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-red-600 py-3 text-xs font-bold text-white hover:from-blue-700 hover:to-red-700 transition-all shadow-md disabled:opacity-55"
          >
            <span>{submitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
          </button>

          {!successMsg && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => navigate(ROUTES.LOGIN)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:underline focus:outline-none"
              >
                Quay lại Đăng nhập
              </button>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
