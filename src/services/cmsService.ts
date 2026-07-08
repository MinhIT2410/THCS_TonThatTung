/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import { CmsCategory, CmsPost, CmsPostWithCategory, CmsPostInput, CmsPostStatus } from '../types/cms';
import { generateSlug } from '../utils/slug';

export const cmsService = {
  async getCategories(): Promise<CmsCategory[]> {
    const { data, error } = await supabase
      .schema('school')
      .from('cms_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error in getCategories:', error.message);
      return [];
    }
    return data || [];
  },

  async getAdminPosts(): Promise<CmsPostWithCategory[]> {
    try {
      // Try fetching with relationship first
      const { data, error } = await supabase
        .schema('school')
        .from('cms_posts')
        .select(`
          *,
          categories:cms_categories (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as CmsPostWithCategory[];
      }

      // Fallback: fetch posts and categories separately, then merge
      const { data: posts, error: postsErr } = await supabase
        .schema('school')
        .from('cms_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsErr) {
        console.error('Error fetching fallback admin posts:', postsErr.message);
        return [];
      }

      const { data: categories } = await supabase
        .schema('school')
        .from('cms_categories')
        .select('id, name, slug');

      const categoryMap = new Map((categories || []).map(c => [c.id, c]));

      return (posts || []).map(post => ({
        ...post,
        categories: categoryMap.get(post.category_id) || null
      })) as CmsPostWithCategory[];
    } catch (err) {
      console.error('Unexpected error in getAdminPosts:', err);
      return [];
    }
  },

  async getPublishedPosts(categorySlug?: string): Promise<CmsPostWithCategory[]> {
    try {
      let categoryId: number | null = null;

      if (categorySlug) {
        const { data: catData, error: catErr } = await supabase
          .schema('school')
          .from('cms_categories')
          .select('id')
          .eq('slug', categorySlug)
          .maybeSingle();

        if (!catErr && catData) {
          categoryId = catData.id;
        } else if (catErr) {
          console.error('Error fetching category by slug:', catErr.message);
        }
      }

      // Query published posts
      let query = supabase
        .schema('school')
        .from('cms_posts')
        .select('*')
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false });

      if (categoryId !== null) {
        query = query.eq('category_id', categoryId);
      }

      const { data: posts, error: postsErr } = await query;

      if (postsErr) {
        console.error('Error fetching published posts:', postsErr.message);
        return [];
      }

      // Load categories to attach
      const { data: categories } = await supabase
        .schema('school')
        .from('cms_categories')
        .select('id, name, slug');

      const categoryMap = new Map((categories || []).map(c => [c.id, c]));

      return (posts || []).map(post => ({
        ...post,
        categories: categoryMap.get(post.category_id) || null
      })) as CmsPostWithCategory[];
    } catch (err) {
      console.error('Unexpected error in getPublishedPosts:', err);
      return [];
    }
  },

  async getPostBySlug(slug: string): Promise<CmsPostWithCategory | null> {
    try {
      const { data: post, error: postErr } = await supabase
        .schema('school')
        .from('cms_posts')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (postErr || !post) {
        console.error('Error fetching post by slug:', postErr?.message);
        return null;
      }

      const { data: category } = await supabase
        .schema('school')
        .from('cms_categories')
        .select('id, name, slug')
        .eq('id', post.category_id)
        .maybeSingle();

      return {
        ...post,
        categories: category || null
      } as CmsPostWithCategory;
    } catch (err) {
      console.error('Unexpected error in getPostBySlug:', err);
      return null;
    }
  },

  async createPost(input: CmsPostInput, userId: string): Promise<{ data: CmsPost | null; error: Error | null }> {
    try {
      const slug = input.slug || generateSlug(input.title);
      const publishedAt = input.status === 'PUBLISHED' && !input.published_at
        ? new Date().toISOString()
        : input.published_at || null;

      const newPost = {
        category_id: input.category_id,
        title: input.title,
        slug,
        excerpt: input.excerpt || '',
        content: input.content,
        cover_image_url: input.cover_image_url || '',
        status: input.status,
        is_featured: !!input.is_featured,
        published_at: publishedAt,
        created_by: userId,
        updated_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .schema('school')
        .from('cms_posts')
        .insert(newPost)
        .select()
        .single();

      if (error) {
        console.error('Error creating post in Supabase:', error.message);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as CmsPost, error: null };
    } catch (err: any) {
      console.error('Unexpected error in createPost:', err);
      return { data: null, error: err };
    }
  },

  async updatePost(id: number, input: CmsPostInput, userId: string): Promise<{ data: CmsPost | null; error: Error | null }> {
    try {
      const slug = input.slug || generateSlug(input.title);
      
      const updateData: any = {
        category_id: input.category_id,
        title: input.title,
        slug,
        excerpt: input.excerpt || '',
        content: input.content,
        cover_image_url: input.cover_image_url || '',
        status: input.status,
        is_featured: !!input.is_featured,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      if (input.status === 'PUBLISHED') {
        if (input.published_at) {
          updateData.published_at = input.published_at;
        } else {
          // If status changes to PUBLISHED or is PUBLISHED but has no published_at, set to now
          // Let's check current post first
          const { data: currentPost } = await supabase
            .schema('school')
            .from('cms_posts')
            .select('published_at')
            .eq('id', id)
            .maybeSingle();
          
          if (currentPost && !currentPost.published_at) {
            updateData.published_at = new Date().toISOString();
          }
        }
      }

      const { data, error } = await supabase
        .schema('school')
        .from('cms_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating post in Supabase:', error.message);
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as CmsPost, error: null };
    } catch (err: any) {
      console.error('Unexpected error in updatePost:', err);
      return { data: null, error: err };
    }
  },

  async deletePost(id: number): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .schema('school')
        .from('cms_posts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting post in Supabase:', error.message);
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err: any) {
      console.error('Unexpected error in deletePost:', err);
      return { error: err };
    }
  }
};
