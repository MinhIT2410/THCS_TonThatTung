/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CmsPostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CmsCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsPost {
  id: number;
  category_id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  status: CmsPostStatus;
  is_featured: boolean;
  published_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsPostWithCategory extends CmsPost {
  categories?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

export interface CmsPostInput {
  category_id: number;
  title: string;
  slug?: string;
  excerpt?: string | null;
  content: string;
  cover_image_url?: string | null;
  status: CmsPostStatus;
  is_featured?: boolean;
  published_at?: string | null;
}
