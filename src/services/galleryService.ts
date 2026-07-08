/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import { generateSlug } from '../utils/slug';
import { 
  GalleryAlbum, 
  GalleryAlbumStatus, 
  GalleryAlbumWithImages, 
  GalleryAlbumInput, 
  GalleryImage, 
  GalleryImageInput 
} from '../types/gallery';
import { PhotoItem } from '../types';

export const galleryService = {
  // Legacy compatibility methods
  getAll(): PhotoItem[] {
    return [];
  },
  saveAll(photos: PhotoItem[]): void {},

  // Supabase Database Methods for Albums
  async getAdminAlbums(): Promise<GalleryAlbum[]> {
    const { data, error } = await supabase
      .schema('school')
      .from('gallery_albums')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error in getAdminAlbums:', error.message);
      return [];
    }
    return data || [];
  },

  async getPublishedAlbums(): Promise<GalleryAlbum[]> {
    const { data, error } = await supabase
      .schema('school')
      .from('gallery_albums')
      .select('*')
      .eq('status', 'PUBLISHED')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error in getPublishedAlbums:', error.message);
      return [];
    }
    return data || [];
  },

  async getAlbumBySlug(slug: string): Promise<GalleryAlbumWithImages | null> {
    const { data: album, error: albumError } = await supabase
      .schema('school')
      .from('gallery_albums')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'PUBLISHED')
      .maybeSingle();

    if (albumError || !album) {
      console.error('Error in getAlbumBySlug:', albumError?.message);
      return null;
    }

    const { data: images, error: imagesError } = await supabase
      .schema('school')
      .from('gallery_images')
      .select('*')
      .eq('album_id', album.id)
      .order('sort_order', { ascending: true });

    if (imagesError) {
      console.error('Error fetching images for album by slug:', imagesError.message);
    }

    return {
      ...album,
      images: images || []
    };
  },

  async createAlbum(input: GalleryAlbumInput, userId: string) {
    const slug = input.slug || generateSlug(input.title);
    const { data, error } = await supabase
      .schema('school')
      .from('gallery_albums')
      .insert({
        title: input.title,
        slug,
        description: input.description || null,
        cover_image_url: input.cover_image_url || null,
        sort_order: input.sort_order ?? 0,
        is_featured: !!input.is_featured,
        status: input.status || 'DRAFT',
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single();

    return { data, error };
  },

  async updateAlbum(id: number, input: Partial<GalleryAlbumInput>, userId: string) {
    const updateData: any = {
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };
    if (input.title && !input.slug) {
      updateData.slug = generateSlug(input.title);
    }
    const { data, error } = await supabase
      .schema('school')
      .from('gallery_albums')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async deleteAlbum(id: number) {
    // Delete associated images first to respect foreign key constraint
    await supabase
      .schema('school')
      .from('gallery_images')
      .delete()
      .eq('album_id', id);

    const { error } = await supabase
      .schema('school')
      .from('gallery_albums')
      .delete()
      .eq('id', id);

    return { error };
  },

  // Supabase Database Methods for Images
  async getImagesByAlbum(albumId: number): Promise<GalleryImage[]> {
    const { data, error } = await supabase
      .schema('school')
      .from('gallery_images')
      .select('*')
      .eq('album_id', albumId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error in getImagesByAlbum:', error.message);
      return [];
    }
    return data || [];
  },

  async createImage(input: GalleryImageInput, userId: string) {
    const { data, error } = await supabase
      .schema('school')
      .from('gallery_images')
      .insert({
        album_id: input.album_id,
        title: input.title || null,
        description: input.description || null,
        image_url: input.image_url,
        alt_text: input.alt_text || null,
        sort_order: input.sort_order ?? 0,
        is_featured: !!input.is_featured,
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single();

    return { data, error };
  },

  async updateImage(id: number, input: Partial<GalleryImageInput>, userId: string) {
    const { data, error } = await supabase
      .schema('school')
      .from('gallery_images')
      .update({
        ...input,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async deleteImage(id: number) {
    const { error } = await supabase
      .schema('school')
      .from('gallery_images')
      .delete()
      .eq('id', id);

    return { error };
  }
};
