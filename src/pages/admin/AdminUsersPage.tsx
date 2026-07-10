/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { userApi } from '../../features/users/userApi';
import { UserProfile, UserRole } from '../../features/users/userTypes';
import { AdminUsersTable } from '../../features/users/components/AdminUsersTable';
import { RoleGuard } from '../../components/auth/RoleGuard';
import { AccessDenied } from '../../components/auth/AccessDenied';

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { profile: currentUserProfile, refreshProfile } = useAuth();
  const isAdmin = currentUserProfile?.role === 'admin';
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!isAdmin) return;
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

  const handleUpdateUser = async (id: string, data: { full_name: string; role: UserRole; is_active: boolean }) => {
    try {
      const updated = await userApi.updateUserProfile(id, data);
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
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Không thể thay đổi trạng thái người dùng.');
    }
  };

  return (
    <RoleGuard 
      allowedRoles={['admin']} 
      fallback={<AccessDenied message="Bạn không có quyền truy cập khu vực Quản lý người dùng. Chỉ tài khoản Quản trị viên (Admin) mới có thể xem và điều khiển phân quyền." />}
    >
      <div className="space-y-6 py-4 font-sans animate-fade-in" id="admin-users-page">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Quản lý người dùng</h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Danh sách tài khoản cán bộ, giáo viên và điều khiển phân quyền vai trò (Role-based Access Control).
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all"
              title="Làm mới"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/quan-tri')}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </button>
          </div>
        </div>

        {/* Users Table and Controls */}
        <AdminUsersTable
          users={users}
          loading={loading}
          error={error}
          onUpdateUser={handleUpdateUser}
          onToggleStatus={handleToggleStatus}
        />
      </div>
    </RoleGuard>
  );
}
