/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from '../auth/AuthContext';
import { env } from '../../config/env';

export function useCanEditCms() {
  const { roles, isActive } = useAuth();

  const isSuperAdmin = roles.some((r: any) => r.code === 'SUPER_ADMIN');
  const isContentEditor = roles.some((r: any) => r.code === 'CONTENT_EDITOR');

  const canEditByRole = isActive && (isSuperAdmin || isContentEditor);

  const canEditCms = canEditByRole || (env.isDev && env.enableCmsEditing);

  return {
    canEditCms,
    canEdit: canEditCms,
    isAdmin: isSuperAdmin,
    isEditor: isSuperAdmin || isContentEditor,
    role: isSuperAdmin ? 'SUPER_ADMIN' : (isContentEditor ? 'CONTENT_EDITOR' : null),
  };
}
