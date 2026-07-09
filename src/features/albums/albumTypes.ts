/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AlbumStatus = "draft" | "published" | "archived";

export interface Album {
  id: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  status: AlbumStatus;
  published_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlbumImage {
  id: string;
  album_id: string;
  image_url: string;
  caption?: string | null;
  sort_order: number;
  created_by?: string | null;
  created_at: string;
}
