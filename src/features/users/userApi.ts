/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../services/supabaseClient';
import { isSupabaseConfigured } from '../../config/env';
import { UserProfile, UpdateUserProfileInput, BulkAssignRoleInput, BulkAssignRoleResult } from './userTypes';
import { ApiError, normalizeApiError } from '../../services/apiError';

export const userApi = {
  /**
   * Get all user profiles with their roles from user_roles and emails via RPC get_admin_users_paginated
   */
  async getUsers(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const result = await this.getUsersPaginated({ page: 1, pageSize: 1000 });
      return result.users;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Reset password for a specific user via admin Edge Function
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-user-password', {
        body: {
          user_id: userId,
          new_password: newPassword
        }
      });

      if (error) {
        let errorMsg = error.message;
        if ('context' in error && error.context) {
          try {
            const res = error.context as Response;
            if (res && typeof res.json === 'function') {
              const body = await res.clone().json();
              if (body && body.message) {
                errorMsg = body.message;
              }
            }
          } catch (_) {
            // Ignore JSON parse error
          }
        }
        throw new ApiError('VALIDATION_ERROR', errorMsg || 'Lỗi khi gọi Edge Function đặt lại mật khẩu.');
      }

      if (!data || !data.success) {
        throw new ApiError('VALIDATION_ERROR', data?.message || 'Đặt lại mật khẩu không thành công.');
      }

      return {
        success: true,
        message: data.message || 'Đã đặt lại mật khẩu cho tài khoản.'
      };
    } catch (err: any) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Get paginated user profiles with their roles and emails via get_admin_users_paginated RPC
   */
  async getUsersPaginated(params: import('./userTypes').GetAdminUsersParams): Promise<import('./userTypes').GetAdminUsersResult> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const {
        search = null,
        roleCode = null,
        isActive = null,
        unassignedOnly = false,
        page = 1,
        pageSize = 50
      } = params;

      const { data, error } = await supabase.rpc('get_admin_users_paginated', {
        p_search: search?.trim() || null,
        p_role_code: roleCode || null,
        p_is_active: isActive ?? null,
        p_unassigned_only: unassignedOnly,
        p_page: page,
        p_page_size: pageSize
      });

      if (error) {
        console.error('Error fetching admin users via RPC:', error);
        throw normalizeApiError(error);
      }

      const users: UserProfile[] = (data || []).map((row: any) => ({
        id: row.user_id,
        full_name: row.full_name || 'Chưa cập nhật tên',
        email: row.email || null,
        roles: Array.isArray(row.roles) ? row.roles : [],
        is_active: row.is_active ?? true,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
      }));

      const totalCount = data && data.length > 0 ? Number(data[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;

      return {
        users,
        totalCount,
        totalPages,
        page,
        pageSize
      };
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Bulk assign role via administrative RPC
   */
  async bulkAssignRole(input: BulkAssignRoleInput): Promise<BulkAssignRoleResult> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase.rpc('bulk_assign_user_role', {
        p_role_code: input.roleCode,
        p_selection_mode: input.selectionMode,
        p_user_ids: input.userIds && input.userIds.length > 0 ? input.userIds : null,
        p_search: input.search?.trim() || null,
        p_filter_role_code: input.filterRoleCode || input.roleFilter || null,
        p_filter_is_active: input.filterIsActive !== undefined ? input.filterIsActive : (input.isActive !== undefined ? input.isActive : null),
        p_unassigned_only: input.unassignedOnly ?? false,
        p_only_without_roles: input.onlyWithoutRoles ?? false,
        p_require_student_identity: input.requireStudentIdentity ?? false
      });

      if (error) {
        throw normalizeApiError(error);
      }

      return data as BulkAssignRoleResult;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Fetch paginated student list for password reset handover
   */
  async getStudentsForPasswordReset(
    params: import('./userTypes').GetStudentsForPasswordResetParams
  ): Promise<import('./userTypes').GetStudentsForPasswordResetResult> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const page = params.page && params.page > 0 ? params.page : 1;
      const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 50;

      const { data, error } = await supabase.rpc('get_students_for_password_reset', {
        p_academic_year_id: params.academicYearId,
        p_grade_level_id: params.gradeLevelId || null,
        p_class_id: params.classId || null,
        p_search: params.search?.trim() || null,
        p_page: page,
        p_page_size: pageSize,
      });

      if (error) {
        throw normalizeApiError(error);
      }

      const rows = (data || []) as import('./userTypes').StudentForPasswordReset[];
      const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;

      return {
        students: rows,
        totalCount,
        totalPages,
        page,
        pageSize,
      };
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Bulk reset student passwords via admin-bulk-reset-passwords Edge Function
   */
  async bulkResetPasswords(
    payload: import('./userTypes').BulkResetPasswordPayload
  ): Promise<import('./userTypes').BulkResetPasswordResponse> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase.functions.invoke('admin-bulk-reset-passwords', {
        body: payload,
      });

      if (error) {
        let errorMsg = error.message;
        if ('context' in error && error.context) {
          try {
            const res = error.context as Response;
            if (res && typeof res.json === 'function') {
              const body = await res.clone().json();
              if (body && body.message) {
                errorMsg = body.message;
              }
            }
          } catch (_) {
            // Ignore parse error
          }
        }
        throw new ApiError('VALIDATION_ERROR', errorMsg || 'Lỗi khi gọi Edge Function đặt lại mật khẩu hàng loạt.');
      }

      if (!data || !data.success) {
        throw new ApiError('VALIDATION_ERROR', data?.message || 'Thao tác không thành công.');
      }

      return data as import('./userTypes').BulkResetPasswordResponse;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Get a single user profile by ID
   */
  async getUserById(id: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (profileError) {
        throw normalizeApiError(profileError);
      }

      if (!profile) return null;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role_code')
        .eq('user_id', id);

      if (rolesError) {
        throw normalizeApiError(rolesError);
      }

      return {
        ...profile,
        roles: (userRoles || []).map((row: any) => row.role_code)
      };
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Update a user profile and their associated roles via RPC transactionally
   */
  async updateUserWithRoles(
    id: string,
    currentRoles: string[],
    newRoles: string[],
    data: { full_name: string; is_active: boolean }
  ): Promise<UserProfile> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data: updatedProfile, error } = await supabase.rpc('update_user_with_roles', {
        target_user_id: id,
        new_full_name: data.full_name,
        new_is_active: data.is_active,
        new_role_codes: newRoles
      });

      if (error) {
        throw normalizeApiError(error);
      }

      return updatedProfile as UserProfile;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Update a user profile
   */
  async updateUserProfile(id: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    const now = new Date().toISOString();
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const updatePayload: Record<string, any> = {
        updated_at: now
      };

      if (input.full_name !== undefined) {
        updatePayload.full_name = input.full_name;
      }
      if (input.avatar_url !== undefined) {
        updatePayload.avatar_url = input.avatar_url;
      }
      if (input.is_active !== undefined) {
        updatePayload.is_active = input.is_active;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw normalizeApiError(error);
      return data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Set a user active / inactive status
   */
  async setUserActive(id: string, isActive: boolean): Promise<UserProfile> {
    return this.updateUserProfile(id, { is_active: isActive });
  }
};
