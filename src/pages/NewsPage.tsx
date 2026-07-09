/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import News from '../components/news/News';
import { NewsItem } from '../types';
import { newsApi } from '../features/news/newsApi';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';

export default function NewsPage() {
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const posts = await newsApi.getPublishedNews();
      const mappedNews = posts.map(post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        category: 'Sự kiện' as const, // Match the visual layout filter
        date: post.published_at ? new Date(post.published_at).toLocaleDateString('vi-VN') : new Date(post.created_at).toLocaleDateString('vi-VN'),
        summary: post.summary || '',
        content: post.content || '',
        image: post.thumbnail_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
        views: 0
      }));
      setNews(mappedNews);
    } catch (err) {
      console.error('Error loading news:', err);
      setError('Không thể tải danh sách tin tức. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  if (loading) {
    return <LoadingState message="Đang tải tin bài hoạt động..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadNews} />;
  }

  return (
    <News
      news={news}
      selectedItem={null}
      onSelectItem={(item) => {
        if (item && item.slug) {
          navigate(`/tin-tuc/${item.slug}`);
        }
      }}
      onIncrementViews={() => {}}
    />
  );
}
