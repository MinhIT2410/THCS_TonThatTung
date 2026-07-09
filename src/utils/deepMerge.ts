/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Deeply merges a source object into a target object.
 * Useful for merging frontend default configurations with partial database overrides.
 */
export function deepMerge<T>(target: T, source?: Partial<T> | null): T {
  if (!source) return target;

  const output: any = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = (target as any)[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        output[key] = deepMerge(targetValue, sourceValue as any);
      } else {
        output[key] = sourceValue;
      }
    }
  }

  return output;
}
