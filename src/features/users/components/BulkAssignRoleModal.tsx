/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Users, CheckCircle, X, Loader2 } from 'lucide-react';
import { BulkAssignRoleInput, BulkAssignRoleResult } from '../userTypes';

interface BulkAssignRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCount: number;
  selectionMode: 'PAGE_SELECTION' | 'FILTERED_ALL';
  selectedUserIds: string[];
  currentRoleFilter: string;
  currentStatusFilter: string;
  currentSearchTerm: string;
  onConfirm: (input: BulkAssignRoleInput) => Promise<BulkAssignRoleResult>;
}

const ASSIGNABLE_ROLES = [
  { code: 'STUDENT', label: 'Học sinh', desc: 'Quyền truy cập thông tin học tập cá nhân' },
  { code: 'TEACHER', label: 'Giáo viên', desc: 'Quyền giảng dạy và quản lý lớp học được phân công' },
  { code: 'STAFF', label: 'Nhân viên hành chính', desc: 'Quyền thực hiện công tác hành chính' },
  { code: 'CONTENT_EDITOR', label: 'Biên tập viên nội dung', desc: 'Quyền quản lý bài viết, tin tức và tài liệu' },
];

export const BulkAssignRoleModal: React.FC<BulkAssignRoleModalProps> = ({
  isOpen,
  onClose,
  targetCount,
  selectionMode,
  selectedUserIds,
  currentRoleFilter,
  currentStatusFilter,
  currentSearchTerm,
  onConfirm,
}) => {
  const [roleCode, setRoleCode] = useState<string>('STUDENT');
  const [onlyWithoutRoles, setOnlyWithoutRoles] = useState<boolean>(
    currentRoleFilter === 'unassigned' || true
  );
  const [requireStudentIdentity, setRequireStudentIdentity] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRoleCode('STUDENT');
      setOnlyWithoutRoles(currentRoleFilter === 'unassigned' || true);
      setRequireStudentIdentity(true);
      setErrorMessage(null);
    }
  }, [isOpen, currentRoleFilter]);

  if (!isOpen) return null;

  const handleRoleChange = (code: string) => {
    setRoleCode(code);
    if (code === 'STUDENT') {
      setRequireStudentIdentity(true);
    } else {
      setRequireStudentIdentity(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: BulkAssignRoleInput = {
        roleCode,
        selectionMode,
        userIds: selectionMode === 'PAGE_SELECTION' ? selectedUserIds : undefined,
        onlyWithoutRoles,
        requireStudentIdentity,
        search: currentSearchTerm,
        isActive: currentStatusFilter === 'active' ? true : currentStatusFilter === 'locked' ? false : null,
        roleFilter: currentRoleFilter !== 'all' ? currentRoleFilter : null
      };

      await onConfirm(payload);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Không thể gán vai trò hàng loạt. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoleLabel = ASSIGNABLE_ROLES.find(r => r.code === roleCode)?.label || roleCode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-fade-in" id="bulk-assign-role-modal">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Gán vai trò hàng loạt</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectionMode === 'FILTERED_ALL'
                  ? `Áp dụng cho toàn bộ ${targetCount.toLocaleString('vi-VN')} tài khoản phù hợp bộ lọc`
                  : `Áp dụng cho ${targetCount.toLocaleString('vi-VN')} tài khoản được chọn`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start space-x-3 text-xs text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Vai trò cần gán <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ASSIGNABLE_ROLES.map((r) => (
                <label
                  key={r.code}
                  className={`flex items-start p-3 rounded-2xl border transition-all cursor-pointer ${
                    roleCode === r.code
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-slate-900 dark:text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulk_role_code"
                    value={r.code}
                    checked={roleCode === r.code}
                    onChange={() => handleRoleChange(r.code)}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <div className="ml-3 space-y-0.5">
                    <span className="text-xs font-bold block">{r.label} <code className="text-[10px] text-slate-400 font-mono">({r.code})</code></span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{r.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Safety Checkboxes */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Tùy chọn an toàn</span>
            </div>

            <label className="flex items-start space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyWithoutRoles}
                onChange={(e) => setOnlyWithoutRoles(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Chỉ các tài khoản chưa có bất kỳ vai trò nào (bỏ qua tài khoản đã phân quyền)
              </span>
            </label>

            {roleCode === 'STUDENT' && (
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireStudentIdentity}
                  onChange={(e) => setRequireStudentIdentity(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Ưu tiên an toàn: Chỉ áp dụng tài khoản có Mã học sinh hoặc quá trình học tập
                </span>
              </label>
            )}
          </div>

          {/* Confirmation Warning Notice Box */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Bạn sắp gán vai trò <span className="underline">{selectedRoleLabel}</span> cho {targetCount.toLocaleString('vi-VN')} tài khoản.
              </span>
            </div>
            <ul className="text-[11px] text-amber-700 dark:text-amber-400/90 space-y-1 pl-6 list-disc font-medium">
              <li>Tài khoản đã có vai trò {selectedRoleLabel} sẽ được tự động bỏ qua;</li>
              <li>Không xóa hoặc thay đổi các vai trò khác của người dùng;</li>
              <li>Không thay đổi trạng thái hoạt động (Đang hoạt động / Khóa);</li>
              <li>Không làm ảnh hưởng tới lớp học hay dữ liệu cá nhân của học sinh.</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || targetCount === 0}
              className="flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Gán vai trò cho {targetCount.toLocaleString('vi-VN')} tài khoản</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
