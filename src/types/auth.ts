/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppRoleCode =
  | 'SUPER_ADMIN'
  | 'PRINCIPAL'
  | 'VICE_PRINCIPAL'
  | 'CONTENT_EDITOR'
  | 'STAFF'
  | 'TEACHER'
  | 'STUDENT';

export interface UserProfile {
  user_id: string;
  employee_code: string | null;
  student_code: string | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  code: AppRoleCode;
  name: string;
  description: string | null;
  is_admin: boolean;
}
