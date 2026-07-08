/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import { HomeBanner, HomeBannerInput } from '../types/banner';

export const bannerService = {
  async getAdminBanners(): Promise<HomeBanner[]> {
    try {
      const { data, error } = await supabase
        .schema('school')
        .from('home_banners')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in getAdminBanners:', error.message);
        throw error;
      }

      return (data || []) as HomeBanner[];
    } catch (err) {
      console.error('Unexpected error in getAdminBanners:', err);
      return [];
    }
  },

  async getPublishedBanners(): Promise<HomeBanner[]> {
    try {
      const { data, error } = await supabase
        .schema('school')
        .from('home_banners')
        .select('*')
        .eq('status', 'PUBLISHED')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in getPublishedBanners:', error.message);
        throw error;
      }

      return (data || []) as HomeBanner[];
    } catch (err) {
      console.error('Unexpected error in getPublishedBanners:', err);
      return [];
    }
  },

  async createBanner(input: HomeBannerInput, userId: string): Promise<{ data: HomeBanner | null; error: Error | null }> {
    try {
      const bannerPayload = {
        ...input,
        created_by: userId,
        updated_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .schema('school')
        .from('home_banners')
        .insert([bannerPayload])
        .select()
        .single();

      if (error) {
        console.error('Error in createBanner:', error.message);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as HomeBanner, error: null };
    } catch (err: any) {
      console.error('Unexpected error in createBanner:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  async updateBanner(id: string, input: Partial<HomeBannerInput>, userId: string): Promise<{ data: HomeBanner | null; error: Error | null }> {
    try {
      const bannerPayload = {
        ...input,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .schema('school')
        .from('home_banners')
        .update(bannerPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error in updateBanner:', error.message);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as HomeBanner, error: null };
    } catch (err: any) {
      console.error('Unexpected error in updateBanner:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  async deleteBanner(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .schema('school')
        .from('home_banners')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error in deleteBanner:', error.message);
        return { success: false, error: new Error(error.message) };
      }

      return { success: true, error: null };
    } catch (err: any) {
      console.error('Unexpected error in deleteBanner:', err);
      return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
};
