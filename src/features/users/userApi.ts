/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../services/supabaseClient';
import { isSupabaseConfigured, canUseDemoFallback } from '../../config/env';
import { UserProfile, UserRole, UpdateUserProfileInput } from './userTypes';
import { ApiError, normalizeApiError } from '../../services/apiError';

const MOCK_PROFILES: UserProfile[] = [
  {
    id: "user-1",
    full_name: "Nguyễn Đăng Minh",
    avatar_url: null,
    role: "admin",
    is_active: true,
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user-2",
    full_name: "Biên Tập",
    avatar_url: null,
    role: "editor",
    is_active: true,
    created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user-3",
    full_name: "Giáo Viên",
    avatar_url: null,
    role: "teacher",
    is_active: true,
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "user-4",
    full_name: "Khách",
    avatar_url: null,
    role: "viewer",
    is_active: false,
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const userApi = {
  /**
   * Get all user profiles (Admin only)
   */
  async getUsers(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw normalizeApiError(error);
      }
      return data || [];
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw normalizeApiError(error);
      }
      return data;
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
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...input,
          updated_at: now
        })
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
   * Update a user's role
   */
  async updateUserRole(id: string, role: UserRole): Promise<UserProfile> {
    return this.updateUserProfile(id, { role });
  },

  /**
   * Set a user active / inactive status
   */
  async setUserActive(id: string, isActive: boolean): Promise<UserProfile> {
    return this.updateUserProfile(id, { is_active: isActive });
  }
};
