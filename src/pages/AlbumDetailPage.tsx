/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Image as ImageIcon, Sparkles } from 'lucide-react';
import { albumApi } from '../features/albums/albumApi';
import { Album, AlbumImage } from '../features/albums/albumTypes';
import { PhotoItem } from '../types';
import Gallery from '../components/gallery/Gallery';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlbumDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      
      const [albumData, imagesData] = await Promise.all([
        albumApi.getAlbumById(id),
        albumApi.getAlbumImages(id)
      ]);

      setAlbum(albumData);
      setImages(imagesData);
    } catch (err) {
      console.error('Error fetching album details:', err);
      setError('Không thể tải chi tiết album ảnh. Em vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbumDetails();
  }, [id]);

  if (loading) {
    return <LoadingState message="Đang tải chi tiết album ảnh..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAlbumDetails} />;
  }

  if (!album) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <EmptyState 
          message="Không tìm thấy album" 
          description="Album này không tồn tại hoặc đã bị ẩn khỏi hệ thống."
        />
        <div className="text-center mt-6">
          <Link 
            to="/thu-vien" 
            className="inline-flex items-center space-x-2 text-sm font-bold text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại thư viện ảnh</span>
          </Link>
        </div>
      </div>
    );
  }

  // Map database AlbumImage list to PhotoItem for standard slideshow component
  const mappedPhotos: PhotoItem[] = images.map((img) => ({
    id: img.id,
    title: img.caption || 'Hình ảnh sự kiện',
    category: 'Hoạt động', // Align category for gallery layout filter tabs if any
    imageUrl: img.image_url,
    date: new Date(img.created_at).toLocaleDateString('vi-VN'),
    description: img.caption || undefined
  }));

  const formattedDate = album.published_at
    ? new Date(album.published_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date(album.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-6 pb-24" id="album-detail-page">
      {/* Sub-header controls */}
      <div className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            to="/thu-vien"
            className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách album</span>
          </Link>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold">Đang xem album</span>
            <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center space-x-1 justify-end">
              {album.is_featured && <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-current" />}
              <span>{album.title}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Album Header details */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-3xl leading-snug">
                {album.title}
              </h1>
              {album.description && (
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {album.description}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-bold shrink-0 self-start">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>Đăng ngày: {formattedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Album Photos Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {mappedPhotos.length === 0 ? (
          <div className="py-16 text-center space-y-4 max-w-md mx-auto">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-slate-400">
              <ImageIcon className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-700 dark:text-slate-300">Album này chưa có ảnh</h3>
              <p className="text-xs text-slate-400 font-medium">Ban biên tập và Ban chỉ huy Liên đội sẽ cập nhật hình ảnh sự kiện này sớm nhất nhé!</p>
            </div>
            <Link
              to="/thu-vien"
              className="inline-block px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-colors text-xs font-bold"
            >
              Quay lại thư viện ảnh
            </Link>
          </div>
        ) : (
          <Gallery photos={mappedPhotos} />
        )}
      </div>
    </div>
  );
}
