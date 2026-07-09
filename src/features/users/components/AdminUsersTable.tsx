/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { UserProfile, UserRole } from '../userTypes';
import { UserRoleBadge } from './UserRoleBadge';
import { UserStatusBadge } from './UserStatusBadge';
import { AdminUserEditModal } from './AdminUserEditModal';
import { useAuth } from '../../auth/useAuth';
import { 
  Search, 
  Filter, 
  Edit3, 
  Lock, 
  Unlock, 
  User, 
  Mail, 
  Calendar, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface AdminUsersTableProps {
  users: UserProfile[];
  loading: boolean;
  error: string | null;
  onUpdateUser: (id: string, data: { full_name: string; role: UserRole; is_active: boolean }) => Promise<void>;
  onToggleStatus: (id: string, currentStatus: boolean) => Promise<void>;
}

export const AdminUsersTable: React.FC<AdminUsersTableProps> = ({
  users,
  loading,
  error,
  onUpdateUser,
  onToggleStatus,
}) => {
  const { profile: currentUserProfile } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTogglingMap, setIsTogglingMap] = useState<Record<string, boolean>>({});

  // Filter & Search Logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const nameMatch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const roleMatch = roleFilter === 'all' || user.role === roleFilter;
      
      let statusMatch = true;
      if (statusFilter === 'active') {
        statusMatch = user.is_active === true;
      } else if (statusFilter === 'locked') {
        statusMatch = user.is_active === false;
      }
      
      return nameMatch && roleMatch && statusMatch;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const handleEditClick = (user: UserProfile) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleToggleStatusClick = async (user: UserProfile) => {
    if (currentUserProfile?.id === user.id) {
      alert("Bạn không thể tự khóa tài khoản của chính mình!");
      return;
    }

    const action = user.is_active ? 'khóa' : 'mở khóa';
    const confirmMessage = `Bạn có chắc chắn muốn ${action} tài khoản của người dùng "${user.full_name || user.id}" không?\n\n` +
      (user.is_active 
        ? "Lưu ý: Sau khi khóa, người dùng này sẽ KHÔNG thể thực hiện các thao tác quản lý dữ liệu trên hệ thống."
        : "Người dùng sẽ có thể tiếp tục thực hiện các thao tác tương ứng với vai trò của họ.");

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsTogglingMap(prev => ({ ...prev, [user.id]: true }));
    try {
      await onToggleStatus(user.id, user.is_active);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTogglingMap(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '---';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 font-sans">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold">Đang tải danh sách thành viên...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border border-red-100 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10 rounded-3xl text-center space-y-3 max-w-lg mx-auto font-sans">
        <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
        <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Không thể tải danh sách</h3>
        <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed font-medium">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Quản trị viên</option>
              <option value="editor">Biên tập viên</option>
              <option value="teacher">Giáo viên</option>
              <option value="viewer">Người xem</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Count Info */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Tìm thấy {filteredUsers.length} trên tổng số {users.length} thành viên
        </span>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Thành viên
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Vai trò
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tham gia
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Cập nhật
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <User className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                      <p className="text-xs text-slate-500 font-semibold">Không tìm thấy thành viên phù hợp.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = currentUserProfile?.id === user.id;
                  const isToggling = isTogglingMap[user.id] || false;

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${
                        isSelf ? 'bg-blue-50/10 dark:bg-blue-950/5' : ''
                      }`}
                    >
                      {/* User Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                            {user.avatar_url ? (
                              <img 
                                src={user.avatar_url} 
                                alt={user.full_name || 'User'} 
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {user.full_name || 'Chưa cập nhật tên'}
                              </span>
                              {isSelf && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[9px] font-bold">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              <span>ID: {user.id.substring(0, 8)}...</span>
                              <span className="text-slate-300 dark:text-slate-700">|</span>
                              <span className="flex items-center gap-0.5">
                                <HelpCircle className="h-3 w-3" title="Email is kept secure at DB level" />
                                <span>Email: [Bảo mật]</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <UserRoleBadge role={user.role} />
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <UserStatusBadge isActive={user.is_active} />
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      </td>

                      {/* Updated At */}
                      <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(user.updated_at)}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all"
                            title="Sửa thông tin"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>

                          {/* Toggle status (Lock/Unlock) Button */}
                          <button
                            onClick={() => handleToggleStatusClick(user)}
                            disabled={isSelf || isToggling}
                            className={`p-1.5 rounded-lg border border-transparent transition-all ${
                              isSelf 
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                                : user.is_active
                                  ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-100 dark:hover:border-red-900/40'
                                  : 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-100 dark:hover:border-emerald-900/40'
                            }`}
                            title={isSelf ? "Không thể tự khóa tài khoản" : user.is_active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                          >
                            {isToggling ? (
                              <div className="w-4.5 h-4.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : user.is_active ? (
                              <Lock className="h-4.5 w-4.5" />
                            ) : (
                              <Unlock className="h-4.5 w-4.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TODO message about email verification */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
        <p className="font-bold text-slate-700 dark:text-slate-300">💡 Ghi chú Bảo mật:</p>
        <p className="mt-1">
          Hệ thống không hiển thị và cho phép chỉnh sửa trực tiếp email của thành viên ở trang này. Điều này tuân thủ nguyên tắc bảo mật thông tin tài khoản và phân tách quyền của Supabase Auth (dữ liệu email lưu ở schema `auth.users`, không truy cập trực tiếp từ frontend để tránh lộ lọt thông tin).
        </p>
        {/* TODO: Show user email via secure admin API/Edge Function later. */}
      </div>

      {/* Edit Modal */}
      {selectedUser && (
        <AdminUserEditModal
          userProfile={selectedUser}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          onSave={onUpdateUser}
        />
      )}
    </div>
  );
};
