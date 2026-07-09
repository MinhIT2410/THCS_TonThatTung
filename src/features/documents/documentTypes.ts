/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DocumentStatus = "draft" | "published" | "archived";

export type DocumentCategory =
  | "ke_hoach"
  | "cong_van"
  | "bieu_mau"
  | "quyet_dinh"
  | "khac";

export interface SchoolDocument {
  id: string;
  title: string;
  description?: string | null;
  category: DocumentCategory;
  file_url: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  status: DocumentStatus;
  published_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}
