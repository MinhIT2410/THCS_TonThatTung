/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../services/supabaseClient';
import { isSupabaseConfigured, canUseDemoFallback } from '../../config/env';
import { NewsItem, NewsStatus } from './newsTypes';
import { ApiError, normalizeApiError } from '../../services/apiError';
import { defaultNews } from '../../data/news';

// Static/mock data fallback for development or before public.news table is fully migrated.
const MOCK_NEWS: NewsItem[] = defaultNews.map(n => ({
  id: n.id,
  title: n.title,
  slug: n.id,
  summary: n.summary,
  content: n.content,
  thumbnail_url: n.image,
  status: 'published',
  category_code: n.category === 'Sự kiện' ? 'EVENT' : n.category === 'Gương sáng' ? 'ROLE_MODEL' : n.category === 'Rèn luyện' ? 'TRAINING' : 'LEARNING',
  published_at: n.date ? new Date(n.date).toISOString() : new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

export const newsApi = {
  /**
   * Get all news articles for admin, including draft, published, archived
   */
  async getAllNewsForAdmin(): Promise<NewsItem[]> {
    if (!isSupabaseConfigured) {
      return [...MOCK_NEWS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('public.news query failed, using fallback:', error.message);
        return [...MOCK_NEWS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return (data && data.length > 0) ? data : MOCK_NEWS;
    } catch (err) {
      console.warn('Network error or exception fetching admin news:', err);
      return [...MOCK_NEWS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  /**
   * Get a news article by ID for admin
   */
  async getNewsByIdForAdmin(id: string): Promise<NewsItem | null> {
    return this.getNewsById(id);
  },

  /**
   * Get all published news articles
   */
  async getPublishedNews(): Promise<NewsItem[]> {
    if (!isSupabaseConfigured) {
      return MOCK_NEWS;
    }
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        console.warn('public.news table error or query failed, using fallback news:', error.message);
        return MOCK_NEWS;
      }
      return (data && data.length > 0) ? data : MOCK_NEWS;
    } catch (err) {
      console.warn('Network error fetching published news, using fallback news:', err);
      return MOCK_NEWS;
    }
  },

  /**
   * Get a news article by slug
   */
  async getNewsBySlug(slug: string): Promise<NewsItem | null> {
    if (!isSupabaseConfigured) {
      return MOCK_NEWS.find(n => n.slug === slug || n.id === slug) || null;
    }
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error || !data) {
        return MOCK_NEWS.find(n => n.slug === slug || n.id === slug) || null;
      }
      return data;
    } catch (err) {
      return MOCK_NEWS.find(n => n.slug === slug || n.id === slug) || null;
    }
  },

  /**
   * Get a news article by ID
   */
  async getNewsById(id: string): Promise<NewsItem | null> {
    if (!isSupabaseConfigured) {
      return MOCK_NEWS.find(n => n.id === id) || null;
    }
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        return MOCK_NEWS.find(n => n.id === id) || null;
      }
      return data;
    } catch (err) {
      return MOCK_NEWS.find(n => n.id === id) || null;
    }
  },

  /**
   * Create a new news article
   */
  async createNews(input: Partial<Omit<NewsItem, 'id' | 'created_at' | 'updated_at'>>): Promise<NewsItem> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const newItem: NewsItem = {
          id: `news-${Date.now()}`,
          title: input.title || 'Untitled',
          slug: input.slug || `untitled-${Date.now()}`,
          summary: input.summary,
          content: input.content,
          thumbnail_url: input.thumbnail_url,
          status: input.status || 'draft',
          category_code: input.category_code || null,
          published_at: input.status === 'published' ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        MOCK_NEWS.push(newItem);
        return newItem;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      // TODO: Connect to public.news table when database schema is ready.
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('news')
        .insert({
          title: input.title,
          slug: input.slug,
          summary: input.summary,
          content: input.content,
          thumbnail_url: input.thumbnail_url,
          status: input.status || 'draft',
          category_code: input.category_code || null,
          published_at: input.status === 'published' ? now : null,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) throw normalizeApiError(error);
      return data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Update an existing news article
   */
  async updateNews(id: string, input: Partial<NewsItem>): Promise<NewsItem> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const idx = MOCK_NEWS.findIndex(n => n.id === id);
        if (idx === -1) {
          throw new ApiError('NOT_FOUND', 'Không tìm thấy bài viết.');
        }
        const updated: NewsItem = {
          ...MOCK_NEWS[idx],
          ...input,
          updated_at: new Date().toISOString()
        };
        MOCK_NEWS[idx] = updated;
        return updated;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      // TODO: Connect to public.news table when database schema is ready.
      const { data, error } = await supabase
        .from('news')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw normalizeApiError(error);
      return data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Delete a news article
   */
  async deleteNews(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const idx = MOCK_NEWS.findIndex(n => n.id === id);
        if (idx !== -1) {
          MOCK_NEWS.splice(idx, 1);
        }
        return true;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      // TODO: Connect to public.news table when database schema is ready.
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);

      if (error) throw normalizeApiError(error);
      return true;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Publish a news article
   */
  async publishNews(id: string): Promise<NewsItem> {
    const now = new Date().toISOString();
    return this.updateNews(id, { status: 'published', published_at: now });
  },

  /**
   * Archive a news article
   */
  async archiveNews(id: string): Promise<NewsItem> {
    return this.updateNews(id, { status: 'archived' });
  }
};
