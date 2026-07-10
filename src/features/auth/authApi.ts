/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../services/supabaseClient';
import { isSupabaseConfigured } from '../../config/env';
import { ApiError, normalizeApiError } from '../../services/apiError';
import { UserProfile, UserRole } from './authTypes';
import { User, Session } from '@supabase/supabase-js';

export const authApi = {
  /**
   * Get the current authenticated user from auth storage
   */
  async getCurrentUser(): Promise<User | null> {
    if (!isSupabaseConfigured) {
      return null;
    }
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        throw new ApiError('UNAUTHORIZED', 'Không thể xác định thông tin người dùng.', error);
      }
      return user;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Get profile by User ID from the database profiles table
   */
  async getCurrentProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình. Không thể lấy hồ sơ người dùng.');
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw new ApiError('DATABASE_ERROR', 'Lỗi truy vấn hồ sơ người dùng từ cơ sở dữ liệu.', error);
      }

      return data as UserProfile | null;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Sign in using email and password
   */
  async signInWithPassword(email: string, password: string): Promise<{ user: User; session: Session }> {
    if (!isSupabaseConfigured) {
      throw new ApiError(
        'SUPABASE_NOT_CONFIGURED',
        'Supabase chưa được cấu hình. Bạn không thể thực hiện đăng nhập thực tế.'
      );
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new ApiError('UNAUTHORIZED', 'Email hoặc mật khẩu không đúng.', error);
      }

      if (!data.user || !data.session) {
        throw new ApiError('UNAUTHORIZED', 'Đăng nhập không thành công, thiếu thông tin phiên.');
      }

      return { user: data.user, session: data.session };
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Sign out current session
   */
  async signOut(): Promise<void> {
    if (!isSupabaseConfigured) {
      return;
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new ApiError('UNKNOWN_ERROR', 'Lỗi khi đăng xuất tài khoản.', error);
      }
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Refresh session manually if needed
   */
  async refreshSession(): Promise<Session | null> {
    if (!isSupabaseConfigured) {
      return null;
    }
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        throw new ApiError('UNAUTHORIZED', 'Không thể làm mới phiên đăng nhập.', error);
      }
      return session;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }
};
