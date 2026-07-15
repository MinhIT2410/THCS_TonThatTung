/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { UserProfile, UserRole } from './authTypes';
import { authApi } from './authApi';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;

  // Backward compatibility fields for pre-existing UI/routing logic:
  roles: any[];
  primaryRole: any | null;
  profileLoading: boolean;
  error: string | null;
  isActive: boolean;
  isAdminUser: boolean;
  hasRole: (roleCode: string) => boolean;
  hasAnyRole: (roleCodes: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rolesList, setRolesList] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to fetch the profile from profiles table and roles from user_roles
  const fetchProfile = async (userId: string) => {
    try {
      setProfileLoading(true);
      setError(null);
      const [profileData, rolesData] = await Promise.all([
        authApi.getCurrentProfile(userId),
        authApi.getUserRoles(userId)
      ]);
      setProfile(profileData);
      setRolesList(rolesData || []);
    } catch (err: any) {
      console.error('Error loading profile in AuthContext:', err);
      // Do not blank the page or crash, just set error and clear profile
      setError(err?.message || 'Không thể tải hồ sơ tài khoản.');
      setProfile(null);
      setRolesList([]);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    // 1. Initial active session fetch
    const checkActiveSession = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        setProfileLoading(false);
        return;
      }
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        setSession(activeSession);
        const currentUser = activeSession?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setRolesList([]);
          setProfileLoading(false);
        }
      } catch (err) {
        console.error('Unexpected error checking session:', err);
        setProfile(null);
        setRolesList([]);
        setProfileLoading(false);
      } finally {
        setLoading(false);
      }
    };

    checkActiveSession();

    // 2. Auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setRolesList([]);
        setProfileLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { user: signedUser, session: signedSession } = await authApi.signInWithPassword(email, password);
      
      setUser(signedUser);
      setSession(signedSession);
      await fetchProfile(signedUser.id);
      
      return { error: null };
    } catch (err: any) {
      console.error('Sign in failed in AuthContext:', err);
      setLoading(false);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authApi.signOut();
      
      setUser(null);
      setSession(null);
      setProfile(null);
      setRolesList([]);
      setError(null);
      
      return { error: null };
    } catch (err: any) {
      console.error('Sign out failed in AuthContext:', err);
      setLoading(false);
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const isAuthenticated = !!user;
  const role: UserRole | null = (rolesList[0] as UserRole) ?? null;
  const isActive = profile?.is_active === true;
  const isAdminUser = rolesList.includes('SUPER_ADMIN');

  const ROLE_NAMES: Record<string, string> = {
    SUPER_ADMIN: 'Quản trị viên cấp cao',
    PRINCIPAL: 'Hiệu trưởng',
    VICE_PRINCIPAL: 'Hiệu phó',
    CONTENT_EDITOR: 'Biên tập viên nội dung',
    STAFF: 'Nhân viên hành chính',
    TEACHER: 'Giáo viên',
    STUDENT: 'Học sinh',
    PARENT: 'Phụ huynh',
  };

  // Map to mock roles array for backward compatibility
  const roles = rolesList.map((code) => ({
    id: code,
    code: code,
    name: ROLE_NAMES[code] || code,
    description: `Vai trò ${ROLE_NAMES[code] || code}`,
    is_admin: code === 'SUPER_ADMIN'
  }));

  const primaryRole = roles[0] ?? null;

  const hasRole = (roleCode: string) => {
    return rolesList.includes(roleCode);
  };

  const hasAnyRole = (roleCodes: string[]) => {
    return roleCodes.some(code => rolesList.includes(code));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        isAuthenticated,
        signIn,
        signOut,
        refreshProfile,
        roles,
        primaryRole,
        profileLoading,
        error,
        isActive,
        isAdminUser,
        hasRole,
        hasAnyRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
