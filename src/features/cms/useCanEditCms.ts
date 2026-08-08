/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from '../auth/AuthContext';
import { env } from '../../config/env';

export function useCanEditCms() {
  const { roles, isActive } = useAuth();

  const isSuperAdmin = roles.some((r: any) => r.code === 'SUPER_ADMIN');
  const isPrincipal = roles.some((r: any) => r.code === 'PRINCIPAL');
  const isVicePrincipal = roles.some((r: any) => r.code === 'VICE_PRINCIPAL');

  const canEditByRole = isActive && (isSuperAdmin || isPrincipal || isVicePrincipal);

  const canEditCms = canEditByRole || (env.isDev && env.enableCmsEditing);

  return {
    canEditCms,
    canEdit: canEditCms,
    isAdmin: isSuperAdmin,
    isEditor: isSuperAdmin || isPrincipal || isVicePrincipal,
    role: isSuperAdmin ? 'SUPER_ADMIN' : (isPrincipal ? 'PRINCIPAL' : (isVicePrincipal ? 'VICE_PRINCIPAL' : null)),
  };
}
