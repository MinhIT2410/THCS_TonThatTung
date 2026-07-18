/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Quản trị hệ thống',
  PRINCIPAL: 'Hiệu trưởng',
  VICE_PRINCIPAL: 'Hiệu phó',
  CONTENT_EDITOR: 'Biên tập nội dung',
  STAFF: 'Nhân viên',
  TEACHER: 'Giáo viên',
  STUDENT: 'Học sinh',
};

export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
  PRINCIPAL: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900',
  VICE_PRINCIPAL: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900',
  CONTENT_EDITOR: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
  STAFF: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900',
  TEACHER: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
  STUDENT: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
};

const ROLE_PRIORITY: string[] = [
  'SUPER_ADMIN',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'CONTENT_EDITOR',
  'STAFF',
  'TEACHER',
  'STUDENT',
];

export function getRoleLabel(roleCode: string): string {
  if (!roleCode) return 'Tài khoản';
  return ROLE_LABELS[roleCode] || 'Tài khoản';
}

export function getRoleColorClass(roleCode: string): string {
  return ROLE_COLORS[roleCode] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-900';
}

export function getPrimaryRole(roles: string[] | { code: string }[] | any[] | null | undefined): string {
  if (!roles || roles.length === 0) {
    return '';
  }

  // Extract codes from roles which can be an array of string or object
  const codes: string[] = roles.map(r => {
    if (typeof r === 'string') return r;
    if (r && typeof r === 'object' && 'code' in r) return r.code;
    if (r && typeof r === 'object' && 'id' in r) return r.id;
    return '';
  }).filter(Boolean);

  // Find the highest priority role in codes
  for (const pRole of ROLE_PRIORITY) {
    if (codes.includes(pRole)) {
      return pRole;
    }
  }

  // Fallback to first role if none match the list
  return codes[0] || '';
}

/**
 * Check if the user has admin/CMS area access
 */
export function canAccessAdmin(roles: string[] | { code: string }[] | any[] | null | undefined): boolean {
  if (!roles) return false;
  
  const codes: string[] = roles.map(r => {
    if (typeof r === 'string') return r;
    if (r && typeof r === 'object' && 'code' in r) return r.code;
    if (r && typeof r === 'object' && 'id' in r) return r.id;
    return '';
  }).filter(Boolean);

  const allowedRoles = ['SUPER_ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'CONTENT_EDITOR', 'STAFF', 'TEACHER'];
  return codes.some(code => allowedRoles.includes(code));
}
