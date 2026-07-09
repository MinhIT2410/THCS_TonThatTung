/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { SchoolDocument, DocumentCategory } from './documentTypes';
import { ApiError, normalizeApiError } from '../../services/apiError';

const MOCK_DOCUMENTS: SchoolDocument[] = [
  {
    id: "doc-1",
    title: "Kế hoạch Hoạt động Liên đội Học kỳ I năm học 2025 - 2026",
    description: "Kế hoạch chi tiết về các hoạt động thi đua, phong trào học tập và sinh hoạt Sao Nhi đồng.",
    category: "ke_hoach",
    file_url: "https://example.com/ke-hoach-hk1.pdf",
    file_name: "ke-hoach-hk1.pdf",
    file_size: 1024 * 350, // 350 KB
    status: "published",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const documentApi = {
  /**
   * Get all school documents
   */
  async getDocuments(): Promise<SchoolDocument[]> {
    if (!isSupabaseConfigured) {
      return MOCK_DOCUMENTS;
    }
    try {
      // TODO: Connect to public.documents table when database schema is ready.
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn('public.documents table is not available yet, falling back to mock data');
          return MOCK_DOCUMENTS;
        }
        throw normalizeApiError(error);
      }
      return data || [];
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return MOCK_DOCUMENTS;
    }
  },

  /**
   * Get a single school document by ID
   */
  async getDocumentById(id: string): Promise<SchoolDocument | null> {
    if (!isSupabaseConfigured) {
      return MOCK_DOCUMENTS.find(d => d.id === id) || null;
    }
    try {
      // TODO: Connect to public.documents table when database schema is ready.
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();

      if (error) {
        if (error.code === '42P01') {
          return MOCK_DOCUMENTS.find(d => d.id === id) || null;
        }
        throw normalizeApiError(error);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      return MOCK_DOCUMENTS.find(d => d.id === id) || null;
    }
  },

  /**
   * Create a new school document record
   */
  async createDocument(input: Partial<Omit<SchoolDocument, 'id' | 'created_at' | 'updated_at'>>): Promise<SchoolDocument> {
    if (!isSupabaseConfigured) {
      const newDoc: SchoolDocument = {
        id: `doc-${Date.now()}`,
        title: input.title || 'Untitled Document',
        description: input.description,
        category: input.category || 'khac',
        file_url: input.file_url || '',
        file_name: input.file_name || 'document.pdf',
        file_size: input.file_size || 0,
        status: input.status || 'published',
        published_at: input.published_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      MOCK_DOCUMENTS.push(newDoc);
      return newDoc;
    }
    try {
      // TODO: Connect to public.documents table when database schema is ready.
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: input.title,
          description: input.description,
          category: input.category || 'khac',
          file_url: input.file_url,
          file_name: input.file_name,
          file_size: input.file_size,
          mime_type: input.mime_type,
          status: input.status || 'published',
          published_at: input.published_at || now,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();

      if (error) throw normalizeApiError(error);
      return data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Update an existing school document record
   */
  async updateDocument(id: string, input: Partial<SchoolDocument>): Promise<SchoolDocument> {
    if (!isSupabaseConfigured) {
      const idx = MOCK_DOCUMENTS.findIndex(d => d.id === id);
      if (idx === -1) {
        throw new ApiError('NOT_FOUND', 'Không tìm thấy tài liệu.');
      }
      const updated: SchoolDocument = {
        ...MOCK_DOCUMENTS[idx],
        ...input,
        updated_at: new Date().toISOString()
      };
      MOCK_DOCUMENTS[idx] = updated;
      return updated;
    }
    try {
      // TODO: Connect to public.documents table when database schema is ready.
      const { data, error } = await supabase
        .from('documents')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw normalizeApiError(error);
      return data;
    } catch (err) {
      throw normalizeApiError(err);
    }
  },

  /**
   * Delete a school document record
   */
  async deleteDocument(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const idx = MOCK_DOCUMENTS.findIndex(d => d.id === id);
      if (idx !== -1) {
        MOCK_DOCUMENTS.splice(idx, 1);
      }
      return true;
    }
    try {
      // TODO: Connect to public.documents table when database schema is ready.
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw normalizeApiError(error);
      return true;
    } catch (err) {
      throw normalizeApiError(err);
    }
  }
};
