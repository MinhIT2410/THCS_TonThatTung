/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GalleryAlbumStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface GalleryAlbum {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  sort_order: number;
  is_featured: boolean;
  status: GalleryAlbumStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: number;
  album_id: number;
  title: string | null;
  description: string | null;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_featured: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryAlbumWithImages extends GalleryAlbum {
  images?: GalleryImage[];
}

export interface GalleryAlbumInput {
  title: string;
  slug?: string;
  description?: string;
  cover_image_url?: string;
  sort_order?: number;
  is_featured?: boolean;
  status?: GalleryAlbumStatus;
}

export interface GalleryImageInput {
  album_id: number;
  title?: string;
  description?: string;
  image_url: string;
  alt_text?: string;
  sort_order?: number;
  is_featured?: boolean;
}
