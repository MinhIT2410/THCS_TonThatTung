/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generateSlug } from './slug';

export function slugify(input: string): string {
  if (!input) return '';
  return generateSlug(input);
}
