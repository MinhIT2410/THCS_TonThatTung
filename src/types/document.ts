/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CmsDocumentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface DocumentCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CmsDocument {
  id: number;
  category_id: number;
  title: string;
  slug: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: CmsDocumentStatus;
  is_featured: boolean;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  document_number: string | null;
  issuing_unit: string | null;
  issued_date: string | null;
}

export interface CmsDocumentWithCategory extends CmsDocument {
  category?: DocumentCategory;
}

export interface CmsDocumentInput {
  category_id: number;
  title: string;
  slug?: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: CmsDocumentStatus;
  is_featured: boolean;
  published_at?: string | null;
  document_number?: string | null;
  issuing_unit?: string | null;
  issued_date?: string | null;
}
