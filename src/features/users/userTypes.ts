/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole, UserProfile } from '../auth/authTypes';

export type { UserRole, UserProfile };

export interface UpdateUserProfileInput {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: UserRole;
  is_active?: boolean;
}
