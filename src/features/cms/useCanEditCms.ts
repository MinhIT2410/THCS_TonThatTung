/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from '../auth/AuthContext';

export function useCanEditCms() {
  const { profile } = useAuth();
  const isDev = import.meta.env.DEV;
  const enableCmsEditing = import.meta.env.VITE_ENABLE_CMS_EDITING === 'true';

  const canEditByRole =
    Boolean(profile?.is_active) &&
    ['admin', 'editor'].includes(profile.role);

  const canEditCms = canEditByRole || (isDev && enableCmsEditing);

  return {
    canEditCms,
    canEdit: canEditCms,
    isAdmin: profile?.role === 'admin',
    isEditor: profile?.role === 'editor' || profile?.role === 'admin',
    role: profile?.role ?? null,
  };
}
