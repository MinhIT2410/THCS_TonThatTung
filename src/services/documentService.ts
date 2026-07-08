/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import { 
  DocumentCategory, 
  CmsDocument, 
  CmsDocumentWithCategory, 
  CmsDocumentInput 
} from '../types/document';
import { generateSlug } from '../utils/slug';

export const documentService = {
  getAll(): any[] {
    return [];
  },

  async getDocumentCategories(): Promise<DocumentCategory[]> {
    const { data, error } = await supabase
      .schema('school')
      .from('cms_document_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error in getDocumentCategories:', error.message);
      return [];
    }
    return data || [];
  },

  async getAdminDocuments(): Promise<CmsDocumentWithCategory[]> {
    try {
      // Fetch with relationship
      const { data, error } = await supabase
        .schema('school')
        .from('cms_documents')
        .select(`
          *,
          category:cms_document_categories (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as unknown as CmsDocumentWithCategory[];
      }

      // Fallback if relation fetch fails (such as in some custom Supabase environments)
      const { data: documents, error: docErr } = await supabase
        .schema('school')
        .from('cms_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (docErr) {
        console.error('Error fetching fallback admin documents:', docErr.message);
        return [];
      }

      const { data: categories } = await supabase
        .schema('school')
        .from('cms_document_categories')
        .select('id, name, slug');

      const categoryMap = new Map((categories || []).map(c => [c.id, c]));

      return (documents || []).map(doc => ({
        ...doc,
        category: categoryMap.get(doc.category_id) || null
      })) as unknown as CmsDocumentWithCategory[];
    } catch (err) {
      console.error('Unexpected error in getAdminDocuments:', err);
      return [];
    }
  },

  async getPublishedDocuments(categorySlug?: string): Promise<CmsDocumentWithCategory[]> {
    try {
      let categoryId: number | null = null;

      if (categorySlug) {
        const { data: catData, error: catErr } = await supabase
          .schema('school')
          .from('cms_document_categories')
          .select('id')
          .eq('slug', categorySlug)
          .maybeSingle();

        if (!catErr && catData) {
          categoryId = catData.id;
        } else if (catErr) {
          console.error('Error fetching document category by slug:', catErr.message);
        }
      }

      let query = supabase
        .schema('school')
        .from('cms_documents')
        .select(`
          *,
          category:cms_document_categories (
            id,
            name,
            slug
          )
        `)
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false });

      if (categoryId !== null) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (!error && data) {
        return data as unknown as CmsDocumentWithCategory[];
      }

      // Fallback
      let fbQuery = supabase
        .schema('school')
        .from('cms_documents')
        .select('*')
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false });

      if (categoryId !== null) {
        fbQuery = fbQuery.eq('category_id', categoryId);
      }

      const { data: documents, error: docErr } = await fbQuery;
      if (docErr) {
        console.error('Error fetching fallback published documents:', docErr.message);
        return [];
      }

      const { data: categories } = await supabase
        .schema('school')
        .from('cms_document_categories')
        .select('id, name, slug');

      const categoryMap = new Map((categories || []).map(c => [c.id, c]));

      return (documents || []).map(doc => ({
        ...doc,
        category: categoryMap.get(doc.category_id) || null
      })) as unknown as CmsDocumentWithCategory[];
    } catch (err) {
      console.error('Unexpected error in getPublishedDocuments:', err);
      return [];
    }
  },

  async getDocumentBySlug(slug: string): Promise<CmsDocumentWithCategory | null> {
    try {
      const { data, error } = await supabase
        .schema('school')
        .from('cms_documents')
        .select(`
          *,
          category:cms_document_categories (
            id,
            name,
            slug
          )
        `)
        .eq('slug', slug)
        .maybeSingle();

      if (!error && data) {
        return data as unknown as CmsDocumentWithCategory;
      }

      // Fallback
      const { data: document, error: docErr } = await supabase
        .schema('school')
        .from('cms_documents')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (docErr || !document) {
        return null;
      }

      const { data: category } = await supabase
        .schema('school')
        .from('cms_document_categories')
        .select('id, name, slug')
        .eq('id', document.category_id)
        .maybeSingle();

      return {
        ...document,
        category: category || null
      } as unknown as CmsDocumentWithCategory;
    } catch (err) {
      console.error('Unexpected error in getDocumentBySlug:', err);
      return null;
    }
  },

  async createDocument(input: CmsDocumentInput, userId: string) {
    const slug = input.slug?.trim() ? generateSlug(input.slug) : generateSlug(input.title);
    
    let publishedAt: string | null = null;
    if (input.status === 'PUBLISHED') {
      publishedAt = input.published_at || new Date().toISOString();
    }

    const { data, error } = await supabase
      .schema('school')
      .from('cms_documents')
      .insert({
        category_id: input.category_id,
        title: input.title,
        slug,
        description: input.description || '',
        file_url: input.file_url,
        file_name: input.file_name,
        file_type: input.file_type,
        file_size: input.file_size,
        status: input.status,
        is_featured: !!input.is_featured,
        published_at: publishedAt,
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single();

    return { data, error };
  },

  async updateDocument(id: number, input: Partial<CmsDocumentInput>, userId: string) {
    const updateData: any = {
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    if (input.title && !input.slug) {
      updateData.slug = generateSlug(input.title);
    } else if (input.slug) {
      updateData.slug = generateSlug(input.slug);
    }

    if (input.status === 'PUBLISHED') {
      updateData.published_at = input.published_at || new Date().toISOString();
    } else if (input.status === 'DRAFT' || input.status === 'ARCHIVED') {
      updateData.published_at = null;
    }

    const { data, error } = await supabase
      .schema('school')
      .from('cms_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async deleteDocument(id: number) {
    const { error } = await supabase
      .schema('school')
      .from('cms_documents')
      .delete()
      .eq('id', id);

    return { error };
  }
};
