/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}
