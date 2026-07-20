/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CmsOverride } from '../cmsTypes';
import { cmsApi } from '../cmsApi';
import { HOME_HERO_DEFAULT } from '../../../config/defaults/home.defaults';
import { deepMerge } from '../../../utils/deepMerge';
import { 
  getCachedHomeOverrides, 
  setCachedHomeOverrides, 
  fetchAndCacheHomeOverrides, 
  preloadImage 
} from '../cache/homeDataCache';

export function useHomeCmsData() {
  const [overrides, setOverrides] = useState<Record<string, CmsOverride>>(() => {
    return getCachedHomeOverrides() || {};
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(() => {
    return getCachedHomeOverrides() ? 'ready' : 'loading';
  });

  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const hasCache = !!getCachedHomeOverrides();

    try {
      if (!hasCache) {
        setStatus('loading');
      }

      // Fetch from API
      const fetchedOverrides = await fetchAndCacheHomeOverrides(forceRefresh);

      // Extract Hero Background Image URL
      const heroOverride = fetchedOverrides['hero'];
      const finalHeroData = deepMerge(HOME_HERO_DEFAULT, heroOverride?.data);
      const bgImage = finalHeroData?.backgroundImage;

      // Only preload if we don't have a cache or if the URL changed
      const currentBgImage = deepMerge(HOME_HERO_DEFAULT, overrides['hero']?.data)?.backgroundImage;

      if (!hasCache || bgImage !== currentBgImage) {
        if (bgImage) {
          await preloadImage(bgImage);
        }
      }

      // Check if data actually changed to avoid redundant setStates
      const prevString = JSON.stringify(overrides);
      const nextString = JSON.stringify(fetchedOverrides);

      if (prevString !== nextString || !hasCache) {
        setOverrides(fetchedOverrides);
      }

      setStatus('ready');
      setError(null);
    } catch (err: any) {
      console.error('Error loading Home CMS overrides:', err);
      setError(err?.message || 'Không thể tải dữ liệu.');
      
      // If we don't have a cache and request failed, fallback to defaults
      if (!hasCache) {
        setOverrides({});
        setStatus('ready'); // Use fallback defaults gracefully
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [overrides]);

  useEffect(() => {
    const hasCache = !!getCachedHomeOverrides();
    // Fetch immediately if no cache, or revalidate in background if has cache
    loadData(!hasCache);
  }, [loadData]);

  const saveOverride = useCallback(async (blockKey: string, data: object) => {
    try {
      const updated = await cmsApi.upsertOverride('home', blockKey, data);
      
      // Update local state and cache synchronously
      setOverrides(prev => {
        const next = {
          ...prev,
          [blockKey]: updated,
        };
        setCachedHomeOverrides(next);
        return next;
      });
    } catch (err: any) {
      console.error(`Error saving override for home.${blockKey}:`, err);
      throw err;
    }
  }, []);

  const resetOverride = useCallback(async (blockKey: string) => {
    try {
      await cmsApi.deleteOverride('home', blockKey);
      
      // Update local state and cache synchronously
      setOverrides(prev => {
        const next = { ...prev };
        delete next[blockKey];
        setCachedHomeOverrides(next);
        return next;
      });
    } catch (err: any) {
      console.error(`Error resetting override for home.${blockKey}:`, err);
      throw err;
    }
  }, []);

  return {
    overrides,
    status,
    loading: status === 'loading',
    error,
    saveOverride,
    resetOverride,
    refreshOverrides: () => loadData(true),
  };
}
