/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AboutItemType = 'ORGANIZATION' | 'SCHOOL_UNIT' | 'TEAM' | 'CLUB' | 'OTHER';

export interface AboutItem {
  id: string;
  title: string;
  slug: string;
  short_title?: string | null;
  summary?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  icon_name?: string | null;
  accent_color?: string | null;
  item_type: AboutItemType;
  parent_id?: string | null;
  display_order: number;
  is_featured: boolean;
  is_published: boolean;
  published_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  
  // Frontend virtual relations
  children?: AboutItem[];
  images?: AboutItemImage[];
  parent_title?: string | null;
}

export interface AboutItemImage {
  id: string;
  about_item_id: string;
  image_url: string;
  caption?: string | null;
  alt_text?: string | null;
  display_order: number;
  created_at?: string;
}
