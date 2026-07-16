/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, UserPlus, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { userApi } from '../../features/users/userApi';
import { UserProfile } from '../../features/users/userTypes';
import { AdminUsersTable } from '../../features/users/components/AdminUsersTable';
import { RoleGuard } from '../../components/auth/RoleGuard';
import { AccessDenied } from '../../components/auth/AccessDenied';
import { CreateUserModal } from '../../features/users/components/CreateUserModal';
import { UserImportModal } from '../../features/users/import/UserImportModal';

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { profile: currentUserProfile, refreshProfile, hasRole } = useAuth();
  const isAdmin = hasRole('SUPER_ADMIN');
  const canCreateUser = hasRole('SUPER_ADMIN') || hasRole('PRINCIPAL') || hasRole('VICE_PRINCIPAL') || hasRole('STAFF') || hasRole('TEACHER');

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!isAdmin) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tải danh sách người dùng. Bạn có thể không có đủ quyền hạn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const handleCreateSuccess = () => {
    setSuccessMessage('Đã tạo tài khoản và gửi email mời thành công.');
    if (isAdmin) {
      fetchUsers();
    }
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };

  const handleUpdateUser = async (id: string, data: { full_name: string; roles: string[]; is_active: boolean }) => {
    try {
      const targetUser = users.find(u => u.id === id);
      const currentRoles = targetUser?.roles || [];
      const updated = await userApi.updateUserWithRoles(id, currentRoles, data.roles, {
        full_name: data.full_name,
        is_active: data.is_active
      });
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      
      // Nếu tự cập nhật bản thân, đồng bộ lại profile trong AuthContext
      if (currentUserProfile?.id === id) {
        await refreshProfile();
      }
    } catch (err: any) {
      throw new Error(err.message || 'Không thể cập nhật thông tin người dùng.');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await userApi.setUserActive(id, !currentStatus);
      setUsers(prev => prev.map(u => u.id === id ? { ...updated, roles: u.roles } : u));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Không thể thay đổi trạng thái người dùng.');
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
                Danh sách tài khoản cán bộ, giáo viên và điều khiển phân quyền vai trò (Role-based Access Control).
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {canCreateUser && (
              <>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all w-fit shadow-sm hover:shadow-md cursor-pointer"
                  id="btn-open-create-user"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Tạo tài khoản</span>
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all w-fit shadow-sm hover:shadow-md cursor-pointer"
                  id="btn-open-import-excel"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Nhập tài khoản từ Excel</span>
                </button>
              </>
            )}
            {isAdmin && (
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
                title="Làm mới"
                id="btn-refresh-users"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
            users={users}
            loading={loading}
            error={error}
            onUpdateUser={handleUpdateUser}
            onToggleStatus={handleToggleStatus}
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
          onSuccess={fetchUsers}
        />
      </div>
    </RoleGuard>
  );
}
