/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { Album, AlbumImage } from './albumTypes';
import { ApiError, normalizeApiError } from '../../services/apiError';

const MOCK_ALBUMS: Album[] = [
  {
    id: "album-1",
    title: "Đại hội Đội viên THCS Tôn Thất Tùng năm học 2025 - 2026",
    description: "Hình ảnh ghi lại không khí rộn ràng, nghiêm túc và đoàn kết của Đại hội.",
    cover_image_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800",
    status: "published",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_IMAGES: AlbumImage[] = [
  {
    id: "img-1",
    album_id: "album-1",
    image_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800",
    caption: "Khai mạc Đại hội Liên đội",
    sort_order: 10,
    created_at: new Date().toISOString()
  },
  {
    id: "img-2",
    album_id: "album-1",
    image_url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800",
    caption: "Chúc mừng Ban chỉ huy Liên đội mới",
    sort_order: 20,
    created_at: new Date().toISOString()
  }
];

export const albumApi = {
  /**
   * Get all albums
   */
  async getAlbums(): Promise<Album[]> {
    if (!isSupabaseConfigured) {
      return MOCK_ALBUMS;
    }
    try {
      // TODO: Connect to public.albums table when database schema is ready.
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn('public.albums table is not available yet, falling back to mock data');
          return MOCK_ALBUMS;
        }
        throw normalizeApiError(error);
      }
      return data || [];
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return MOCK_ALBUMS;
    }
  },

  /**
   * Get an album by ID
   */
  async getAlbumById(id: string): Promise<Album | null> {
    if (!isSupabaseConfigured) {
      return MOCK_ALBUMS.find(a => a.id === id) || null;
    }
    try {
      // TODO: Connect to public.albums table when database schema is ready.
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();

      if (error) {
        if (error.code === '42P01') {
          return MOCK_ALBUMS.find(a => a.id === id) || null;
        }
        throw normalizeApiError(error);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return MOCK_ALBUMS.find(a => a.id === id) || null;
    }
  },

  /**
   * Get all images belonging to an album
   */
  async getAlbumImages(albumId: string): Promise<AlbumImage[]> {
    if (!isSupabaseConfigured) {
      return MOCK_IMAGES.filter(img => img.album_id === albumId);
    }
    try {
      // TODO: Connect to public.album_images table when database schema is ready.
      const { data, error } = await supabase
        .from('album_images')
        .select('*')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.code === '42P01') {
          console.warn('public.album_images table is not available yet, falling back to mock data');
          return MOCK_IMAGES.filter(img => img.album_id === albumId);
        }
        throw normalizeApiError(error);
      }
      return data || [];
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return MOCK_IMAGES.filter(img => img.album_id === albumId);
    }
  },

  /**
   * Create a new album
   */
  async createAlbum(input: Partial<Omit<Album, 'id' | 'created_at' | 'updated_at'>>): Promise<Album> {
    if (!isSupabaseConfigured) {
      const newAlbum: Album = {
        id: `album-${Date.now()}`,
        title: input.title || 'Untitled Album',
        description: input.description,
        cover_image_url: input.cover_image_url || '',
        status: input.status || 'published',
        published_at: input.published_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      MOCK_ALBUMS.push(newAlbum);
      return newAlbum;
    }
    try {
      // TODO: Connect to public.albums table when database schema is ready.
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('albums')
        .insert({
          title: input.title,
          description: input.description,
          cover_image_url: input.cover_image_url,
          status: input.status || 'published',
          published_at: input.published_at || now,
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
   * Update an existing album
   */
  async updateAlbum(id: string, input: Partial<Album>): Promise<Album> {
    if (!isSupabaseConfigured) {
      const idx = MOCK_ALBUMS.findIndex(a => a.id === id);
      if (idx === -1) {
        throw new ApiError('NOT_FOUND', 'Không tìm thấy album.');
      }
      const updated: Album = {
        ...MOCK_ALBUMS[idx],
        ...input,
        updated_at: new Date().toISOString()
      };
      MOCK_ALBUMS[idx] = updated;
      return updated;
    }
    try {
      // TODO: Connect to public.albums table when database schema is ready.
      const { data, error } = await supabase
        .from('albums')
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
   * Delete an album
   */
  async deleteAlbum(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const idx = MOCK_ALBUMS.findIndex(a => a.id === id);
      if (idx !== -1) {
        MOCK_ALBUMS.splice(idx, 1);
      }
      // Also delete associated images
      const remainingImages = MOCK_IMAGES.filter(img => img.album_id !== id);
      MOCK_IMAGES.length = 0;
      MOCK_IMAGES.push(...remainingImages);
      return true;
    }
    try {
      // TODO: Connect to public.albums table when database schema is ready.
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', id);

      if (error) throw normalizeApiError(error);
      return true;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Add an image to an album
   */
  async addAlbumImage(albumId: string, input: Partial<Omit<AlbumImage, 'id' | 'album_id' | 'created_at'>>): Promise<AlbumImage> {
    if (!isSupabaseConfigured) {
      const newImg: AlbumImage = {
        id: `img-${Date.now()}`,
        album_id: albumId,
        image_url: input.image_url || '',
        caption: input.caption,
        sort_order: input.sort_order || 10,
        created_at: new Date().toISOString()
      };
      MOCK_IMAGES.push(newImg);
      return newImg;
    }
    try {
      // TODO: Connect to public.album_images table when database schema is ready.
      const { data, error } = await supabase
        .from('album_images')
        .insert({
          album_id: albumId,
          image_url: input.image_url,
          caption: input.caption,
          sort_order: input.sort_order || 10,
          created_at: new Date().toISOString()
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
   * Delete an image from an album
   */
  async deleteAlbumImage(imageId: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const idx = MOCK_IMAGES.findIndex(img => img.id === imageId);
      if (idx !== -1) {
        MOCK_IMAGES.splice(idx, 1);
      }
      return true;
    }
    try {
      // TODO: Connect to public.album_images table when database schema is ready.
      const { error } = await supabase
        .from('album_images')
        .delete()
        .eq('id', imageId);

      if (error) throw normalizeApiError(error);
      return true;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }
};
