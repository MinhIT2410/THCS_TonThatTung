/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NewsStatus = "draft" | "published" | "archived";

export interface NewsItem {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  thumbnail_url?: string | null;
  status: NewsStatus;
  published_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateNewsInput = {
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  thumbnail_url?: string | null;
  status?: NewsStatus;
};

export type UpdateNewsInput = Partial<CreateNewsInput>;

