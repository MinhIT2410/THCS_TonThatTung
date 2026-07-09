/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { cmsApi } from './cmsApi';
import { CmsOverride } from './cmsTypes';

export function usePageOverrides(pageKey: string) {
  const [overrides, setOverrides] = useState<Record<string, CmsOverride>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOverrides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await cmsApi.getPageOverrides(pageKey);
      const mapped = list.reduce((acc, item) => {
        acc[item.block_key] = item;
        return acc;
      }, {} as Record<string, CmsOverride>);
      setOverrides(mapped);
    } catch (err: any) {
      console.error(`Error loading overrides for page ${pageKey}:`, err);
      setError(err?.message || 'Failed to load page overrides');
    } finally {
      setLoading(false);
    }
  }, [pageKey]);

  useEffect(() => {
    refreshOverrides();
  }, [refreshOverrides]);

  const saveOverride = useCallback(async (blockKey: string, data: object) => {
    try {
      const updated = await cmsApi.upsertOverride(pageKey, blockKey, data);
      setOverrides(prev => ({
        ...prev,
        [blockKey]: updated,
      }));
    } catch (err: any) {
      console.error(`Error saving override for ${pageKey}.${blockKey}:`, err);
      throw err;
    }
  }, [pageKey]);

  const resetOverride = useCallback(async (blockKey: string) => {
    try {
      await cmsApi.deleteOverride(pageKey, blockKey);
      setOverrides(prev => {
        const next = { ...prev };
        delete next[blockKey];
        return next;
      });
    } catch (err: any) {
      console.error(`Error resetting override for ${pageKey}.${blockKey}:`, err);
      throw err;
    }
  }, [pageKey]);

  return {
    overrides,
    loading,
    error,
    saveOverride,
    resetOverride,
    refreshOverrides,
  };
}
