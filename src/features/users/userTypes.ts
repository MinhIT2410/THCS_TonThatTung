/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile } from '../auth/authTypes';

export type { UserProfile };

export interface UpdateUserProfileInput {
  full_name?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
}

export interface GetAdminUsersParams {
  search?: string | null;
  roleCode?: string | null;
  isActive?: boolean | null;
  unassignedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface GetAdminUsersResult {
  users: UserProfile[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface BulkAssignRoleInput {
  roleCode: string;
  selectionMode: 'PAGE_SELECTION' | 'FILTERED_ALL' | 'PAGE';
  userIds?: string[] | null;
  search?: string | null;
  filterRoleCode?: string | null;
  filterIsActive?: boolean | null;
  unassignedOnly?: boolean;
  onlyWithoutRoles?: boolean;
  requireStudentIdentity?: boolean;
  isActive?: boolean | null;
  roleFilter?: string | null;
}

export interface BulkAssignRoleResult {
  matched_count: number;
  inserted_count: number;
  skipped_count: number;
  role_code: string;
}

export interface StudentForPasswordReset {
  user_id: string;
  full_name: string;
  student_code: string | null;
  email: string | null;
  class_id: string;
  class_name: string;
  grade_level_id: string | null;
  total_count: number;
}

export interface GetStudentsForPasswordResetParams {
  academicYearId: string;
  gradeLevelId?: string | null;
  classId?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}

export interface GetStudentsForPasswordResetResult {
  students: StudentForPasswordReset[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface BulkResetPasswordItem {
  user_id: string;
  new_password: string;
}

export interface BulkResetPasswordPayload {
  academic_year_id: string;
  students: BulkResetPasswordItem[];
}

export interface BulkResetPasswordResultItem {
  user_id: string;
  success: boolean;
  error?: string;
}

export interface BulkResetPasswordResponse {
  success: boolean;
  message: string;
  results: BulkResetPasswordResultItem[];
}
