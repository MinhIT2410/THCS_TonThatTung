/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Calendar, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { albumApi } from '../features/albums/albumApi';
import { Album } from '../features/albums/albumTypes';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';

export default function GalleryPage() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlbums = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await albumApi.getAlbums();
      setAlbums(data);
    } catch (err) {
      console.error('Error loading albums:', err);
      setError('Không thể tải danh sách album ảnh. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, []);

  if (loading) {
    return <LoadingState message="Đang tải danh sách album ảnh..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadAlbums} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 pb-24" id="gallery-page">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full inline-block">
          Ghi lại những khoảnh khắc đẹp
        </span>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Thư Viện Ảnh Liên Đội
        </h1>
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
          Lưu giữ những khoảnh khắc hoạt động sinh động, ý nghĩa của Liên đội trường THCS Tôn Thất Tùng, các phong trào thi đua và ngày hội thiếu nhi.
        </p>
      </div>

      {/* Albums Grid */}
      {albums.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl max-w-md mx-auto p-8 space-y-3">
          <Folder className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300">Chưa có album ảnh nào</h3>
          <p className="text-xs text-slate-400 font-medium">Hình ảnh hoạt động Liên đội đang được tổng hợp và cập nhật sớm nhất.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
          {albums.map((album) => (
            <motion.div
              key={album.id}
              whileHover={{ y: -6 }}
              onClick={() => navigate(`/thu-vien/${album.id}`)}
              className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs relative flex flex-col h-full"
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-950">
                <img 
                  src={album.cover_image_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'} 
                  alt={album.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                {album.is_featured && (
                  <span className="absolute top-3 left-3 bg-amber-500 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center space-x-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Tiêu biểu</span>
                  </span>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {album.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                    {album.description || 'Không có mô tả cho album này.'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center space-x-1 font-semibold">
                    <Calendar className="h-3 w-3" />
                    <span>{album.published_at ? new Date(album.published_at).toLocaleDateString('vi-VN') : new Date(album.created_at).toLocaleDateString('vi-VN')}</span>
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:underline">
                    Xem album &rarr;
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
