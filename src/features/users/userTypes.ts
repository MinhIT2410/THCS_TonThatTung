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
