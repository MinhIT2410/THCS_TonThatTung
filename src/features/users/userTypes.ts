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

export interface BulkAssignRoleInput {
  roleCode: string;
  selectionMode: 'PAGE_SELECTION' | 'FILTERED_ALL';
  userIds?: string[];
  onlyWithoutRoles?: boolean;
  requireStudentIdentity?: boolean;
  search?: string;
  isActive?: boolean | null;
  roleFilter?: string | null;
}

export interface BulkAssignRoleResult {
  matched_count: number;
  inserted_count: number;
  skipped_count: number;
  role_code: string;
}
