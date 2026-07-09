/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Eye, Share2, ThumbsUp } from 'lucide-react';
import { newsApi } from '../features/news/newsApi';
import { NewsItem } from '../features/news/newsTypes';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState<boolean>(false);

  const loadPostDetails = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      const data = await newsApi.getNewsBySlug(slug);
      setPost(data);
    } catch (err) {
      console.error('Error fetching news post:', err);
      setError('Không thể tải chi tiết tin tức này. Em vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPostDetails();
  }, [slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.summary || '',
        url: window.location.href,
      }).catch(() => {});
    } else {
      alert(`Đã sao chép liên kết chia sẻ cho bài viết: "${post?.title}"`);
    }
  };

  if (loading) {
    return <LoadingState message="Đang tải chi tiết tin tức..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadPostDetails} />;
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState 
          message="Không tìm thấy bài viết" 
          description="Bài viết này không tồn tại hoặc đã được chuyển sang chế độ nháp."
        />
        <div className="text-center mt-6">
          <Link 
            to="/tin-tuc" 
            className="inline-flex items-center space-x-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại trang tin tức</span>
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = post.published_at 
    ? new Date(post.published_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date(post.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8 pb-24" id="news-detail-page">
      {/* Back Button */}
      <div>
        <Link 
          to="/tin-tuc" 
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại danh mục tin tức</span>
        </Link>
      </div>

      {/* Main Container */}
      <article className="space-y-6">
        {/* Title and Metadata */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full inline-block">
            Tin Hoạt Động Liên Đội
          </span>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl leading-tight tracking-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-400 border-b border-slate-100 pb-4 dark:border-slate-800">
            <span className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Đăng ngày: {formattedDate}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>120 lượt xem</span>
            </span>
            <span className="ml-auto text-slate-500 dark:text-slate-400">
              Nguồn: Ban Biên Tập Măng Non
            </span>
          </div>
        </div>

        {/* Cover Image */}
        {post.thumbnail_url && (
          <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50">
            <img 
              src={post.thumbnail_url} 
              alt={post.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Summary Block */}
        {post.summary && (
          <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50/50 p-5 dark:bg-blue-950/20">
            <p className="text-sm font-bold text-blue-900 dark:text-blue-200 leading-relaxed font-sans">
              {post.summary}
            </p>
          </div>
        )}

        {/* Content Body */}
        <div className="font-sans text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-4 whitespace-pre-line">
          {/* TODO: sanitize HTML before rendering rich content. Currently safe plain text is rendered. */}
          {post.content}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-6 dark:border-slate-800">
          <Link 
            to="/tin-tuc"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            Quay lại danh sách
          </Link>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsLiked(!isLiked)}
              className={`flex items-center space-x-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                isLiked
                  ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-950/30 dark:border-red-900'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <ThumbsUp className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
              <span>Thích ({isLiked ? 1 : 0})</span>
            </button>

            <button 
              onClick={handleShare}
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Chia sẻ</span>
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
