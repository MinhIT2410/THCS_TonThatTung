/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { UserProfile, UserRole, AppRoleCode } from '../types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  profile: UserProfile | null;
  roles: UserRole[];
  primaryRole: UserRole | null;
  profileLoading: boolean;
  error: string | null;
  isActive: boolean;
  isAdminUser: boolean;
  hasRole: (roleCode: AppRoleCode) => boolean;
  hasAnyRole: (roleCodes: AppRoleCode[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check active session on mount
    const checkSession = async () => {
      try {
        const { data: { session: activeSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error.message);
        }
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
      } catch (err) {
        console.error('Unexpected error checking session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchProfileAndRoles = async () => {
      if (!user) {
        setProfile(null);
        setRoles([]);
        setError(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      setError(null);

      try {
        // 1. Fetch user profile
        const { data: profileData, error: profileErr } = await supabase
          .schema('school')
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileErr) {
          console.error('Error fetching profile:', profileErr.message);
          setError('Có lỗi xảy ra khi tải thông tin tài khoản.');
          setProfile(null);
          setRoles([]);
          setProfileLoading(false);
          return;
        }

        if (!profileData) {
          setError('Tài khoản chưa được cấp quyền trong hệ thống');
          setProfile(null);
          setRoles([]);
          setProfileLoading(false);
          return;
        }

        setProfile(profileData as UserProfile);

        if (profileData.is_active === false) {
          setError('Tài khoản đã bị khóa hoặc chưa được kích hoạt');
          setRoles([]);
          setProfileLoading(false);
          return;
        }

        // 2. Fetch user roles (with robust fallback)
        let fetchedRoles: UserRole[] = [];
        try {
          // Try relationship query first
          const { data: relationshipData, error: relErr } = await supabase
            .schema('school')
            .from('user_roles')
            .select(`
              role_id,
              roles (
                id,
                code,
                name,
                description,
                is_admin
              )
            `)
            .eq('user_id', user.id);

          if (!relErr && relationshipData && relationshipData.length > 0) {
            fetchedRoles = relationshipData
              .map((item: any) => item.roles)
              .filter((role: any) => role !== null) as UserRole[];
          } else {
            // Fallback to 2-step query
            const { data: userRolesData, error: userRolesErr } = await supabase
              .schema('school')
              .from('user_roles')
              .select('role_id')
              .eq('user_id', user.id);

            if (!userRolesErr && userRolesData && userRolesData.length > 0) {
              const roleIds = userRolesData.map((item: any) => item.role_id);
              const { data: rolesData, error: rolesErr } = await supabase
                .schema('school')
                .from('roles')
                .select('id, code, name, description, is_admin')
                .in('id', roleIds);

              if (!rolesErr && rolesData) {
                fetchedRoles = rolesData as UserRole[];
              }
            }
          }
        } catch (e) {
          console.error('Error fetching user roles:', e);
        }

        setRoles(fetchedRoles);
      } catch (err) {
        console.error('Unexpected error during profile & roles load:', err);
        setError('Có lỗi bất ngờ xảy ra khi tải thông tin tài khoản.');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfileAndRoles();
  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      return { error };
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      return { error: err as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
      setRoles([]);
      setError(null);
      return { error };
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
      return { error: err as AuthError };
    }
  };

  const isAuthenticated = !!user;
  const isAdminUser = roles.some(role => role.is_admin);
  const isActive = profile?.is_active === true;
  const primaryRole = roles[0] ?? null;

  const hasRole = (roleCode: AppRoleCode) => {
    return roles.some(role => role.code === roleCode);
  };

  const hasAnyRole = (roleCodes: AppRoleCode[]) => {
    return roles.some(role => roleCodes.includes(role.code));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated,
        signIn,
        signOut,
        profile,
        roles,
        primaryRole,
        profileLoading,
        error,
        isActive,
        isAdminUser,
        hasRole,
        hasAnyRole,
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
