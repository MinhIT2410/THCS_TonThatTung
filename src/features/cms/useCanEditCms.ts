/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from '../auth/AuthContext';
import { env } from '../../config/env';

export function useCanEditCms() {
  const { profile } = useAuth();

  const canEditByRole =
    Boolean(profile?.is_active) &&
    ['admin', 'editor'].includes(profile.role);

  const canEditCms = canEditByRole || (env.isDev && env.enableCmsEditing);

  return {
    canEditCms,
    canEdit: canEditCms,
    isAdmin: profile?.role === 'admin',
    isEditor: profile?.role === 'editor' || profile?.role === 'admin',
    role: profile?.role ?? null,
  };
}
