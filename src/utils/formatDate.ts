/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '---';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return '---';
  }
}
