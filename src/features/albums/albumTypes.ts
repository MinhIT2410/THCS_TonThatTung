/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Album {
  id: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlbumImage {
  id: string;
  album_id: string;
  image_url: string;
  caption?: string | null;
  sort_order?: number | null;
  created_at: string;
}
