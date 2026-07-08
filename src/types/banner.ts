/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HomeBannerStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface HomeBanner {
  id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string;
  button_text: string | null;
  button_url: string | null;
  sort_order: number;
  is_active: boolean;
  status: HomeBannerStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeBannerInput {
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  image_url: string;
  button_text?: string | null;
  button_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
  status?: HomeBannerStatus;
}
