/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import News from '../components/news/News';
import { NewsItem } from '../types';
import { cmsService } from '../services/cmsService';

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  useEffect(() => {
    async function loadNews() {
      try {
        setLoading(true);
        const posts = await cmsService.getPublishedPosts('tin-tuc');
        const mappedNews = posts.map(post => ({
          id: String(post.id),
          title: post.title,
          category: 'Sự kiện' as const, // Match the visual layout filter
          date: post.published_at ? new Date(post.published_at).toLocaleDateString('vi-VN') : new Date(post.created_at).toLocaleDateString('vi-VN'),
          summary: post.excerpt || '',
          content: post.content,
          image: post.cover_image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
          views: 0
        }));
        setNews(mappedNews);
      } catch (err) {
        console.error('Error loading news:', err);
        setError('Không thể tải tin tức từ Supabase.');
      } finally {
        setLoading(false);
      }
    }
    loadNews();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 font-bold text-slate-600 dark:text-slate-400">Đang tải tin bài từ Supabase...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-red-500 font-bold">{error}</p>
      </div>
    );
  }

  return (
    <News
      news={news}
      selectedItem={selectedNews}
      onSelectItem={setSelectedNews}
      onIncrementViews={() => {}}
    />
  );
}
