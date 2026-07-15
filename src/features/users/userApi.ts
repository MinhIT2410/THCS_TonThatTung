/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../services/supabaseClient';
import { isSupabaseConfigured } from '../../config/env';
import { UserProfile, UpdateUserProfileInput } from './userTypes';
import { ApiError, normalizeApiError } from '../../services/apiError';

export const userApi = {
  /**
   * Get all user profiles (Admin only)
   */
  /**
   * Get all user profiles with their roles from user_roles
   */
  async getUsers(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) {
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        throw normalizeApiError(profilesError);
      }

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role_code');

      if (rolesError) {
        throw normalizeApiError(rolesError);
      }

      const rolesMap: Record<string, string[]> = {};
      (userRoles || []).forEach((row: any) => {
        if (!rolesMap[row.user_id]) {
          rolesMap[row.user_id] = [];
        }
        rolesMap[row.user_id].push(row.role_code);
      });

      return (profiles || []).map((p: any) => ({
        ...p,
        roles: rolesMap[p.id] || []
      }));
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
