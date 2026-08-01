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
