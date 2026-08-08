/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, RefreshCw, UserPlus, CheckCircle2, FileSpreadsheet, KeyRound } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { userApi } from '../../features/users/userApi';
import { AdminUsersTable } from '../../features/users/components/AdminUsersTable';
import { RoleGuard } from '../../components/auth/RoleGuard';
import { AccessDenied } from '../../components/auth/AccessDenied';
import { CreateUserModal } from '../../features/users/components/CreateUserModal';
import { UserImportModal } from '../../features/users/import/UserImportModal';
import { StudentAccountHandoverModal } from '../../features/users/components/StudentAccountHandoverModal';

export default function AdminUsersPage() {
  const { profile: currentUserProfile, refreshProfile, hasRole } = useAuth();
  const isAdmin = hasRole('SUPER_ADMIN');
  const canCreateUser = hasRole('SUPER_ADMIN') || hasRole('PRINCIPAL') || hasRole('VICE_PRINCIPAL');
  const canHandoverAccounts = hasRole('SUPER_ADMIN') || hasRole('PRINCIPAL') || hasRole('VICE_PRINCIPAL');

  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCreateSuccess = () => {
    setSuccessMessage('Đã tạo tài khoản và gửi email mời thành công.');
    handleRefresh();
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  const handleUpdateUser = async (id: string, data: { full_name: string; roles: string[]; is_active: boolean }) => {
    try {
      // Get target user roles if possible, or update
      await userApi.updateUserWithRoles(id, [], data.roles, {
        full_name: data.full_name,
        is_active: data.is_active
      });

      // Synchronize current profile if self
      if (currentUserProfile?.id === id) {
        await refreshProfile();
      }
    } catch (err: any) {
      throw new Error(err.message || 'Không thể cập nhật thông tin người dùng.');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await userApi.setUserActive(id, !currentStatus);
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || 'Không thể thay đổi trạng thái người dùng.');
    }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      await userApi.resetUserPassword(userId, newPassword);
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || 'Không thể đặt lại mật khẩu.');
    }
  };

  return (
    <RoleGuard 
      allowedRoles={['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'STAFF', 'TEACHER']} 
      fallback={<AccessDenied message="Bạn không có quyền truy cập khu vực Quản lý người dùng. Chỉ tài khoản Quản trị viên và các vai trò quản lý cấp cao mới có thể xem và thực hiện điều khiển phân quyền." />}
    >
      <div className="space-y-6 py-4 font-sans animate-fade-in" id="admin-users-page">
        {/* Success Alert */}
        {successMessage && (
          <div className="flex items-center gap-2.5 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-xs text-emerald-800 dark:text-emerald-400 font-bold animate-fade-in" id="user-success-alert">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-450 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                {isAdmin ? 'Quản lý người dùng' : 'Tạo tài khoản'}
              </h1>
            </div>
            {isAdmin && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Danh sách tài khoản cán bộ, giáo viên, học sinh và điều khiển phân quyền vai trò (Role-based Access Control).
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {canCreateUser && (
              <>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all w-fit shadow-xs hover:shadow-md cursor-pointer"
                  id="btn-open-create-user"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Tạo tài khoản</span>
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all w-fit shadow-xs hover:shadow-md cursor-pointer"
                  id="btn-open-import-excel"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Nhập tài khoản từ Excel</span>
                </button>
              </>
            )}
            {canHandoverAccounts && (
              <button
                onClick={() => setIsHandoverModalOpen(true)}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:hover:text-white dark:bg-blue-950/60 dark:hover:bg-blue-900/80 border border-blue-200 dark:border-blue-900/60 rounded-xl transition-all w-fit shadow-xs hover:shadow-md cursor-pointer"
                id="btn-open-student-handover"
              >
                <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Bàn giao tài khoản học sinh</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleRefresh}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
                title="Làm mới"
                id="btn-refresh-users"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Notice Info for non-admin users */}
        {!isAdmin && (
          <div className="p-6 bg-blue-50/40 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/40 rounded-3xl flex gap-3" id="role-notice-banner">
            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Thông báo phân quyền</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Bạn chỉ được tạo tài khoản trong phạm vi được hệ thống cho phép.
              </p>
            </div>
          </div>
        )}

        {/* Users Table and Controls */}
        {isAdmin && (
          <AdminUsersTable
            refreshKey={refreshKey}
            onUpdateUser={handleUpdateUser}
            onToggleStatus={handleToggleStatus}
            onResetPassword={handleResetPassword}
            onRefreshUsers={handleRefresh}
          />
        )}

        {/* Create User Modal Popup */}
        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />

        {/* Import User Modal Popup */}
        <UserImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={handleRefresh}
        />

        {/* Student Account Handover Modal */}
        {isHandoverModalOpen && (
          <StudentAccountHandoverModal
            isOpen={isHandoverModalOpen}
            onClose={() => setIsHandoverModalOpen(false)}
            onSuccessRefresh={handleRefresh}
          />
        )}
      </div>
    </RoleGuard>
  );
}
