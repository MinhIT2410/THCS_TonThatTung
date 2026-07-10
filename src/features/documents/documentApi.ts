/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../../services/supabaseClient';
import { isSupabaseConfigured, canUseDemoFallback } from '../../config/env';
import { SchoolDocument, CreateDocumentInput, UpdateDocumentInput } from './documentTypes';
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
    mime_type: "application/pdf",
    status: "published",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const documentApi = {
  /**
   * Get all school documents (public, published only)
   */
  async getDocuments(): Promise<SchoolDocument[]> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        return MOCK_DOCUMENTS;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' && canUseDemoFallback) {
          console.warn('public.documents table is not available yet, falling back to mock data');
          return MOCK_DOCUMENTS;
        }
        throw normalizeApiError(error);
      }
      return data || [];
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (canUseDemoFallback) return MOCK_DOCUMENTS;
      throw normalizeApiError(err);
    }
  },

  /**
   * Get all school documents for admin (including draft, published, archived)
   */
  async getAllDocumentsForAdmin(): Promise<SchoolDocument[]> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        return [...MOCK_DOCUMENTS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if ((error.code === '42P01' || error.code === 'PGRST116') && canUseDemoFallback) {
          console.warn('public.documents table is not available yet, falling back to mock data');
          return [...MOCK_DOCUMENTS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        throw normalizeApiError(error);
      }
      return data || [];
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (canUseDemoFallback) {
        return [...MOCK_DOCUMENTS].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      throw normalizeApiError(err);
    }
  },

  /**
   * Get a single school document by ID (public, published only)
   */
  async getDocumentById(id: string): Promise<SchoolDocument | null> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        return MOCK_DOCUMENTS.find(d => d.id === id) || null;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle();

      if (error) {
        if (error.code === '42P01' && canUseDemoFallback) {
          return MOCK_DOCUMENTS.find(d => d.id === id) || null;
        }
        throw normalizeApiError(error);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (canUseDemoFallback) return MOCK_DOCUMENTS.find(d => d.id === id) || null;
      throw normalizeApiError(err);
    }
  },

  /**
   * Get a single school document by ID for admin (any status)
   */
  async getDocumentByIdForAdmin(id: string): Promise<SchoolDocument | null> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        return MOCK_DOCUMENTS.find(d => d.id === id) || null;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01' && canUseDemoFallback) {
          return MOCK_DOCUMENTS.find(d => d.id === id) || null;
        }
        throw normalizeApiError(error);
      }
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (canUseDemoFallback) return MOCK_DOCUMENTS.find(d => d.id === id) || null;
      throw normalizeApiError(err);
    }
  },

  /**
   * Create a new school school document record
   */
  async createDocument(input: CreateDocumentInput): Promise<SchoolDocument> {
    const status = input.status || 'draft';
    const now = new Date().toISOString();
    const published_at = status === 'published' ? now : null;

    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const newDoc: SchoolDocument = {
          id: `doc-${Date.now()}`,
          title: input.title || 'Untitled Document',
          description: input.description,
          category: input.category || 'khac',
          file_url: input.file_url || '',
          file_name: input.file_name || 'document.pdf',
          file_size: input.file_size || 0,
          mime_type: input.mime_type || null,
          status,
          published_at,
          created_at: now,
          updated_at: now
        };
        MOCK_DOCUMENTS.push(newDoc);
        return newDoc;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
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
          status,
          published_at,
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
  async updateDocument(id: string, input: UpdateDocumentInput): Promise<SchoolDocument> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
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
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
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
   * Publish a document
   */
  async publishDocument(id: string): Promise<SchoolDocument> {
    return this.updateDocument(id, {
      status: 'published',
      published_at: new Date().toISOString()
    } as UpdateDocumentInput);
  },

  /**
   * Archive a document
   */
  async archiveDocument(id: string): Promise<SchoolDocument> {
    return this.updateDocument(id, {
      status: 'archived'
    } as UpdateDocumentInput);
  },

  /**
   * Delete a school document record
   */
  async deleteDocument(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      if (canUseDemoFallback) {
        const idx = MOCK_DOCUMENTS.findIndex(d => d.id === id);
        if (idx !== -1) {
          MOCK_DOCUMENTS.splice(idx, 1);
        }
        return true;
      }
      throw new ApiError('SUPABASE_NOT_CONFIGURED', 'Supabase chưa được cấu hình.');
    }
    try {
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
