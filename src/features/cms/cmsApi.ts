/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { CmsOverride } from './cmsTypes';
import { ApiError, normalizeApiError } from '../../services/apiError';

const LOCAL_STORAGE_KEY = 'cms_overrides_fallback';

function getLocalFallback(): CmsOverride[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalFallback(overrides: CmsOverride[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(overrides));
  } catch (e) {
    // ignore
  }
}

export const cmsApi = {
  async getOverride(pageKey: string, blockKey: string): Promise<CmsOverride | null> {
    if (!isSupabaseConfigured) {
      const list = getLocalFallback();
      return list.find(o => o.page_key === pageKey && o.block_key === blockKey && o.is_enabled !== false) || null;
    }
    try {
      const { data, error } = await supabase
        .from('cms_overrides')
        .select('*')
        .eq('page_key', pageKey)
        .eq('block_key', blockKey)
        .eq('is_enabled', true)
        .maybeSingle(); // maybeSingle doesn't throw PGRST116 when no row is found
      
      if (error) {
        throw normalizeApiError(error);
      }
      return data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async getPageOverrides(pageKey: string): Promise<CmsOverride[]> {
    if (!isSupabaseConfigured) {
      const list = getLocalFallback();
      return list.filter(o => o.page_key === pageKey && o.is_enabled !== false);
    }
    try {
      const { data, error } = await supabase
        .from('cms_overrides')
        .select('*')
        .eq('page_key', pageKey)
        .eq('is_enabled', true);
      
      if (error) throw normalizeApiError(error);
      return data || [];
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async upsertOverride(pageKey: string, blockKey: string, data: object): Promise<CmsOverride> {
    let updatedBy: string | null = null;
    if (isSupabaseConfigured) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        updatedBy = userData?.user?.id || null;
      } catch {
        // ignore
      }
    }

    if (!isSupabaseConfigured) {
      const list = getLocalFallback();
      const existingIdx = list.findIndex(o => o.page_key === pageKey && o.block_key === blockKey);
      const now = new Date().toISOString();
      const record: CmsOverride = {
        id: existingIdx >= 0 ? list[existingIdx].id : Math.random().toString(36).substring(2),
        page_key: pageKey,
        block_key: blockKey,
        data,
        is_enabled: true,
        updated_by: updatedBy,
        created_at: existingIdx >= 0 ? list[existingIdx].created_at : now,
        updated_at: now
      };

      if (existingIdx >= 0) {
        list[existingIdx] = record;
      } else {
        list.push(record);
      }
      saveLocalFallback(list);
      return record;
    }

    try {
      const now = new Date().toISOString();
      const { data: upsertedData, error } = await supabase
        .from('cms_overrides')
        .upsert(
          {
            page_key: pageKey,
            block_key: blockKey,
            data,
            is_enabled: true,
            updated_at: now,
            updated_by: updatedBy
          },
          {
            onConflict: 'page_key,block_key'
          }
        )
        .select()
        .single();

      if (error) throw normalizeApiError(error);
      return upsertedData;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async deleteOverride(pageKey: string, blockKey: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const list = getLocalFallback();
      const filtered = list.filter(o => !(o.page_key === pageKey && o.block_key === blockKey));
      saveLocalFallback(filtered);
      return true;
    }
    try {
      const { error } = await supabase
        .from('cms_overrides')
        .delete()
        .eq('page_key', pageKey)
        .eq('block_key', blockKey);
      
      if (error) throw normalizeApiError(error);
      return true;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  async disableOverride(pageKey: string, blockKey: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const list = getLocalFallback();
      const item = list.find(o => o.page_key === pageKey && o.block_key === blockKey);
      if (item) {
        item.is_enabled = false;
        saveLocalFallback(list);
      }
      return true;
    }
    try {
      const { error } = await supabase
        .from('cms_overrides')
        .update({ is_enabled: false })
        .eq('page_key', pageKey)
        .eq('block_key', blockKey);
      
      if (error) throw normalizeApiError(error);
      return true;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }
};
