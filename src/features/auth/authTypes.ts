/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'SUPER_ADMIN'
  | 'PRINCIPAL'
  | 'VICE_PRINCIPAL'
  | 'CONTENT_EDITOR'
  | 'STAFF'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT';

export interface UserProfile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email?: string | null;
  profile?: UserProfile | null;
}
