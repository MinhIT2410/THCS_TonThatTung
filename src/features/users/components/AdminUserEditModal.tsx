/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../userTypes';
import { useAuth } from '../../auth/useAuth';
import { X, AlertTriangle, Shield, User, Loader2 } from 'lucide-react';

interface AdminUserEditModalProps {
  userProfile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: { full_name: string; roles: string[]; is_active: boolean }) => Promise<void>;
}

const AVAILABLE_ROLES = [
  { code: 'SUPER_ADMIN', name: 'Quản trị viên cấp cao' },
  { code: 'PRINCIPAL', name: 'Hiệu trưởng' },
  { code: 'VICE_PRINCIPAL', name: 'Hiệu phó' },
  { code: 'CONTENT_EDITOR', name: 'Biên tập viên nội dung' },
  { code: 'STAFF', name: 'Nhân viên hành chính' },
  { code: 'TEACHER', name: 'Giáo viên' },
  { code: 'STUDENT', name: 'Học sinh' },
  { code: 'PARENT', name: 'Phụ huynh' }
];

export const AdminUserEditModal: React.FC<AdminUserEditModalProps> = ({
  userProfile,
  isOpen,
  onClose,
  onSave,
}) => {
  const { profile: currentUserProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = currentUserProfile?.id === userProfile.id;

  useEffect(() => {
    if (isOpen && userProfile) {
      setFullName(userProfile.full_name || '');
      setRoles(userProfile.roles || []);
      setIsActive(userProfile.is_active ?? true);
      setError(null);
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(userProfile.id, {
        full_name: fullName.trim(),
        roles,
        is_active: isActive,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể cập nhật người dùng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Cập nhật thông tin thành viên
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex gap-2.5 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl text-xs text-red-700 dark:text-red-400 leading-relaxed font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSelf && (
            <div className="flex gap-2.5 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Bạn đang tự chỉnh sửa tài khoản của chính mình.</p>
                <p className="mt-0.5 text-[11px] opacity-90">Để bảo mật và tránh vô ý khóa tài khoản, chức năng thay đổi Vai trò và Trạng thái hoạt động của chính bạn tạm thời bị khóa.</p>
              </div>
            </div>
          )}

          {/* User ID */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Mã tài khoản (User ID)
            </span>
            <p className="text-xs font-mono bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              {userProfile.id}
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <User className="h-3 w-3 text-slate-400" />
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nhập họ và tên..."
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium"
            />
          </div>

          {/* Roles Selection */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Vai trò thành viên (Có thể chọn nhiều)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl">
              {AVAILABLE_ROLES.map((r) => {
                const checked = roles.includes(r.code);
                return (
                  <label 
                    key={r.code} 
                    className={`flex items-center space-x-2.5 p-2 rounded-xl text-xs font-semibold cursor-pointer border select-none transition-all ${
                      checked 
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400' 
                        : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isSelf && r.code === 'SUPER_ADMIN'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoles(prev => [...prev, r.code]);
                        } else {
                          setRoles(prev => prev.filter(code => code !== r.code));
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 disabled:opacity-50"
                    />
                    <span>{r.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Status select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Trạng thái hoạt động
            </label>
            <select
              value={isActive ? 'true' : 'false'}
              onChange={(e) => setIsActive(e.target.value === 'true')}
              disabled={isSelf}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed font-medium"
            >
              <option value="true">Đang hoạt động</option>
              <option value="false">Tạm khóa tài khoản</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-900">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 min-w-[80px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu lại</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
