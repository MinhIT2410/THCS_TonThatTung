/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function formatFileSize(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || bytes <= 0) return '---';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
