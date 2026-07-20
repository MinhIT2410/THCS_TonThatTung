/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CmsOverride } from '../cmsTypes';
import { cmsApi } from '../cmsApi';

let cachedHomeOverrides: Record<string, CmsOverride> | null = null;
let cachedAt = 0;
let pendingRequest: Promise<Record<string, CmsOverride>> | null = null;

export function getCachedHomeOverrides(): Record<string, CmsOverride> | null {
  return cachedHomeOverrides;
}

export function setCachedHomeOverrides(overrides: Record<string, CmsOverride>) {
  cachedHomeOverrides = overrides;
  cachedAt = Date.now();
}

export function invalidateHomeOverridesCache() {
  cachedHomeOverrides = null;
  cachedAt = 0;
  pendingRequest = null;
}

export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (!src) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

export async function fetchAndCacheHomeOverrides(forceRefresh = false): Promise<Record<string, CmsOverride>> {
  if (cachedHomeOverrides && !forceRefresh) {
    return cachedHomeOverrides;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = cmsApi.getPageOverrides('home')
    .then((list) => {
      const mapped = list.reduce((acc, item) => {
        acc[item.block_key] = item;
        return acc;
      }, {} as Record<string, CmsOverride>);
      cachedHomeOverrides = mapped;
      cachedAt = Date.now();
      return mapped;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
}
