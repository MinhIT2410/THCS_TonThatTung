/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { UserProfile, BulkAssignRoleInput, BulkAssignRoleResult } from '../userTypes';
import { UserRoleBadge } from './UserRoleBadge';
import { UserStatusBadge } from './UserStatusBadge';
import { AdminUserEditModal } from './AdminUserEditModal';
import { BulkAssignRoleModal } from './BulkAssignRoleModal';
import { useAuth } from '../../auth/useAuth';
import { userApi } from '../userApi';
import { 
  Search, 
  Filter, 
  Edit3, 
  Lock, 
  Unlock, 
  User, 
  Calendar, 
  AlertCircle,
  HelpCircle,
  Users,
  CheckSquare,
  Square,
  UserPlus,
  CheckCircle2
} from 'lucide-react';

interface AdminUsersTableProps {
  users: UserProfile[];
  loading: boolean;
  error: string | null;
  onUpdateUser: (id: string, data: { full_name: string; roles: string[]; is_active: boolean }) => Promise<void>;
  onToggleStatus: (id: string, currentStatus: boolean) => Promise<void>;
  onResetPassword?: (userId: string, newPassword: string) => Promise<void>;
  onRefreshUsers?: () => Promise<void>;
}

export const AdminUsersTable: React.FC<AdminUsersTableProps> = ({
  users,
  loading,
  error,
  onUpdateUser,
  onToggleStatus,
  onResetPassword,
  onRefreshUsers
}) => {
  const { profile: currentUserProfile } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [resetPassUser, setResetPassUser] = useState<UserProfile | null>(null);
  const [isTogglingMap, setIsTogglingMap] = useState<Record<string, boolean>>({});

  // Bulk Selection States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'PAGE_SELECTION' | 'FILTERED_ALL'>('PAGE_SELECTION');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkAlertMessage, setBulkAlertMessage] = useState<string | null>(null);

  // Unassigned role count calculation
  const unassignedCount = useMemo(() => {
    return users.filter(u => !u.roles || u.roles.length === 0).length;
  }, [users]);

  // Filter & Search Logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const nameMatch = (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      let roleMatch = true;
      if (roleFilter === 'unassigned') {
        roleMatch = !user.roles || user.roles.length === 0;
      } else if (roleFilter !== 'all') {
        roleMatch = (user.roles || []).includes(roleFilter);
      }
      
      let statusMatch = true;
      if (statusFilter === 'active') {
        statusMatch = user.is_active === true;
      } else if (statusFilter === 'locked') {
        statusMatch = user.is_active === false;
      }
      
      return nameMatch && roleMatch && statusMatch;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Selection Helper Calculations
  const visibleUserIds = useMemo(() => filteredUsers.map(u => u.id), [filteredUsers]);
  const isAllVisibleSelected = visibleUserIds.length > 0 && visibleUserIds.every(id => selectedUserIds.includes(id));
  const isSomeVisibleSelected = visibleUserIds.some(id => selectedUserIds.includes(id)) && !isAllVisibleSelected;

  const effectiveSelectedCount = selectionMode === 'FILTERED_ALL'
    ? filteredUsers.length
    : selectedUserIds.length;

  const handleToggleSelectAllVisible = () => {
    if (isAllVisibleSelected || selectionMode === 'FILTERED_ALL') {
      setSelectedUserIds([]);
      setSelectionMode('PAGE_SELECTION');
    } else {
      setSelectedUserIds(visibleUserIds);
      setSelectionMode('PAGE_SELECTION');
    }
  };

  const handleToggleSelectUser = (userId: string) => {
    if (selectionMode === 'FILTERED_ALL') {
      setSelectionMode('PAGE_SELECTION');
    }
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
    setSelectionMode('PAGE_SELECTION');
  };

  const handleBulkAssignConfirm = async (input: BulkAssignRoleInput): Promise<BulkAssignRoleResult> => {
    const result = await userApi.bulkAssignRole(input);
    
    const roleLabels: Record<string, string> = {
      STUDENT: 'Học sinh',
      TEACHER: 'Giáo viên',
      STAFF: 'Nhân viên hành chính',
      CONTENT_EDITOR: 'Biên tập viên nội dung'
    };
    const roleName = roleLabels[result.role_code] || result.role_code;

    setBulkAlertMessage(
      `Đã gán vai trò ${roleName} cho ${result.inserted_count.toLocaleString('vi-VN')} tài khoản. Bỏ qua ${result.skipped_count.toLocaleString('vi-VN')} tài khoản.`
    );

    handleClearSelection();

    if (onRefreshUsers) {
      await onRefreshUsers();
    }

    setTimeout(() => {
      setBulkAlertMessage(null);
    }, 8000);

    return result;
  };

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
      {/* Bulk Action Alert Banner */}
      {bulkAlertMessage && (
        <div className="flex items-center gap-2.5 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-bold animate-fade-in" id="bulk-assign-success-alert">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{bulkAlertMessage}</span>
        </div>
      )}

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
          {/* Role Filter Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                handleClearSelection();
              }}
              className="text-xs bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              id="select-role-filter"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="unassigned">Chưa phân quyền ({unassignedCount})</option>
              <option value="SUPER_ADMIN">Quản trị hệ thống</option>
              <option value="PRINCIPAL">Hiệu trưởng</option>
              <option value="VICE_PRINCIPAL">Hiệu phó</option>
              <option value="CONTENT_EDITOR">Biên tập nội dung</option>
              <option value="STAFF">Nhân viên</option>
              <option value="TEACHER">Giáo viên</option>
              <option value="STUDENT">Học sinh</option>
            </select>
          </div>

          {/* Status Filter Dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                handleClearSelection();
              }}
              className="text-xs bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              id="select-status-filter"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Count Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Tìm thấy {filteredUsers.length.toLocaleString('vi-VN')} trên tổng số {users.length.toLocaleString('vi-VN')} thành viên
        </span>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Trong đó: <strong className="text-amber-600 dark:text-amber-400 font-bold">{unassignedCount.toLocaleString('vi-VN')}</strong> tài khoản chưa phân quyền
        </span>
      </div>

      {/* Selection Notification Banner */}
      {(selectedUserIds.length > 0 || selectionMode === 'FILTERED_ALL') && (
        <div className="p-3 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-blue-900 dark:text-blue-300 animate-fade-in" id="selection-notification-banner">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              {selectionMode === 'FILTERED_ALL' ? (
                <>
                  Đã chọn toàn bộ <strong>{filteredUsers.length.toLocaleString('vi-VN')}</strong> tài khoản phù hợp bộ lọc.
                </>
              ) : (
                <>
                  Đã chọn <strong>{selectedUserIds.length.toLocaleString('vi-VN')}</strong> tài khoản trên trang này.
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectionMode === 'PAGE_SELECTION' && filteredUsers.length > selectedUserIds.length && (
              <button
                onClick={() => setSelectionMode('FILTERED_ALL')}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all cursor-pointer text-[11px] shadow-xs"
                id="btn-select-all-filtered"
              >
                Chọn toàn bộ {filteredUsers.length.toLocaleString('vi-VN')} tài khoản phù hợp bộ lọc
              </button>
            )}

            {selectionMode === 'FILTERED_ALL' && (
              <button
                onClick={handleClearSelection}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-all cursor-pointer text-[11px]"
              >
                Bỏ chọn
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {effectiveSelectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 dark:bg-slate-950/95 text-white backdrop-blur-md border border-slate-700/80 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-xs animate-slide-up" id="bulk-action-bar">
          <div className="flex items-center gap-2 font-bold">
            <Users className="h-4.5 w-4.5 text-blue-400" />
            <span>Đã chọn {effectiveSelectedCount.toLocaleString('vi-VN')} tài khoản</span>
          </div>
          <div className="h-4 w-[1px] bg-slate-700" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 font-bold text-white rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              id="btn-open-bulk-assign-modal"
            >
              <UserPlus className="h-4 w-4" />
              <span>Gán vai trò</span>
            </button>
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 font-bold text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                {/* Header Checkbox */}
                <th className="pl-6 pr-2 py-4 w-10">
                  <button
                    onClick={handleToggleSelectAllVisible}
                    className="flex items-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    title={isAllVisibleSelected ? "Bỏ chọn trang hiện tại" : "Chọn toàn bộ trang hiện tại"}
                    id="checkbox-select-all-header"
                  >
                    {isAllVisibleSelected || selectionMode === 'FILTERED_ALL' ? (
                      <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    ) : isSomeVisibleSelected ? (
                      <div className="h-4 w-4 rounded border-2 border-blue-600 bg-blue-600/20 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 bg-blue-600 rounded-xs" />
                      </div>
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>

                <th className="pr-6 pl-2 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Họ và tên
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Email đăng nhập
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                  Vai trò
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
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
                  <td colSpan={8} className="px-6 py-12 text-center">
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
                  const isSelected = selectionMode === 'FILTERED_ALL' || selectedUserIds.includes(user.id);

                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${
                        isSelected
                          ? 'bg-blue-50/20 dark:bg-blue-950/20'
                          : isSelf ? 'bg-blue-50/10 dark:bg-blue-950/5' : ''
                      }`}
                    >
                      {/* Checkbox Cell */}
                      <td className="pl-6 pr-2 py-4 align-middle">
                        <button
                          onClick={() => handleToggleSelectUser(user.id)}
                          className="flex items-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                          )}
                        </button>
                      </td>

                      {/* Member Full Name + Avatar */}
                      <td className="pr-6 pl-2 py-4">
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
                        </div>
                      </td>

                      {/* Login Email Column */}
                      <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {user.email ? (
                          <span className="font-mono text-slate-800 dark:text-slate-200 select-all font-semibold">
                            {user.email}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-sans italic text-[11px]">
                            Không thể tải email
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 text-center align-middle">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((r) => (
                              <UserRoleBadge key={r} role={r} />
                            ))
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-900/40">
                              Chưa phân quyền
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center align-middle">
                        <div className="flex items-center justify-center">
                          <UserStatusBadge isActive={user.is_active} />
                        </div>
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
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all cursor-pointer"
                            title="Sửa thông tin"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>

                          {/* Toggle status Button */}
                          <button
                            onClick={() => handleToggleStatusClick(user)}
                            disabled={isSelf || isToggling}
                            className={`p-1.5 rounded-lg border border-transparent transition-all cursor-pointer ${
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

      {/* Edit User Modal */}
      {selectedUser && (
        <AdminUserEditModal
          userProfile={selectedUser}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
          onSave={onUpdateUser}
          onResetPassword={onResetPassword}
        />
      )}

      {/* Bulk Assign Role Modal */}
      <BulkAssignRoleModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        targetCount={effectiveSelectedCount}
        selectionMode={selectionMode}
        selectedUserIds={selectedUserIds}
        currentRoleFilter={roleFilter}
        currentStatusFilter={statusFilter}
        currentSearchTerm={searchTerm}
        onConfirm={handleBulkAssignConfirm}
      />
    </div>
  );
};
