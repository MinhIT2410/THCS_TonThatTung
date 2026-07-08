/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { galleryService } from '../services/galleryService';
import { GalleryAlbum, GalleryImage } from '../types/gallery';
import { PhotoItem } from '../types';
import Gallery from '../components/gallery/Gallery';
import { Folder, ArrowLeft, Calendar, Image as ImageIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function GalleryPage() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [albumImages, setAlbumImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingImages, setLoadingImages] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlbums() {
      try {
        setLoading(true);
        setError(null);
        const data = await galleryService.getPublishedAlbums();
        setAlbums(data);
      } catch (err) {
        console.error('Error loading albums:', err);
        setError('Không thể tải danh sách album ảnh từ hệ thống.');
      } finally {
        setLoading(false);
      }
    }
    loadAlbums();
  }, []);

  const handleSelectAlbum = async (album: GalleryAlbum) => {
    setSelectedAlbum(album);
    setLoadingImages(true);
    try {
      const images = await galleryService.getImagesByAlbum(album.id);
      setAlbumImages(images);
    } catch (err) {
      console.error('Error loading album images:', err);
      setError('Không thể tải danh sách hình ảnh của album này.');
    } finally {
      setLoadingImages(false);
    }
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
    setAlbumImages([]);
  };

  // Map database GalleryImage to standard PhotoItem for the Gallery slideshow component
  const mappedPhotos: PhotoItem[] = albumImages.map((img) => ({
    id: String(img.id),
    title: img.title || 'Hình ảnh',
    category: 'Hoạt động', // default categorization for tab matching
    imageUrl: img.image_url,
    date: new Date(img.created_at).toLocaleDateString('vi-VN'),
    description: img.description || undefined
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <span className="ml-3 font-bold text-slate-600 dark:text-slate-400">Đang tải album ảnh từ hệ thống...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl max-w-md mx-auto">
          <p className="text-red-500 font-bold mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-xs"
          >
            Thử tải lại trang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh]">
      <AnimatePresence mode="wait">
        {!selectedAlbum ? (
          <motion.div
            key="albums-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10"
          >
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full inline-block">
                Ghi lại những khoảnh khắc đẹp
              </span>
              <h1 className="font-display text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-5xl">
                Thư Viện Ảnh Đội
              </h1>
              <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
                Lưu giữ những khoảnh khắc hoạt động sinh động, ý nghĩa của Liên đội, các phong trào thi đua và ngày hội thiếu nhi.
              </p>
            </div>

            {/* Albums List */}
            {albums.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl max-w-md mx-auto p-8 space-y-3">
                <Folder className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300">Chưa có album ảnh nào</h3>
                <p className="text-xs text-slate-400">Hãy quay lại sau để cập nhật các khoảnh khắc thú vị nhé!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
                {albums.map((album) => (
                  <motion.div
                    key={album.id}
                    whileHover={{ y: -6 }}
                    onClick={() => handleSelectAlbum(album)}
                    className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs relative flex flex-col h-full"
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
                        <h3 className="font-display font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                          {album.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {album.description || 'Không có mô tả cho album này.'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center space-x-1 font-medium">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(album.created_at).toLocaleDateString('vi-VN')}</span>
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-extrabold group-hover:underline">
                          Xem album &rarr;
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="album-photos-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {/* Sub-header controls */}
            <div className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
              <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
                <button
                  onClick={handleBackToAlbums}
                  className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Quay lại danh sách album</span>
                </button>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Đang xem album</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">{selectedAlbum.title}</span>
                </div>
              </div>
            </div>

            {loadingImages ? (
              <div className="flex justify-center items-center py-24 min-h-[40vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 font-bold text-slate-600 dark:text-slate-400 text-sm">Đang tải hình ảnh trong album...</span>
              </div>
            ) : mappedPhotos.length === 0 ? (
              <div className="mx-auto max-w-md py-16 px-4 text-center space-y-3">
                <ImageIcon className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 dark:text-slate-300">Album này chưa có ảnh</h3>
                <p className="text-xs text-slate-400">Ban chỉ huy Liên đội sẽ sớm bổ sung hình ảnh sự kiện này.</p>
                <button
                  onClick={handleBackToAlbums}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-xs font-bold"
                >
                  Quay lại album khác
                </button>
              </div>
            ) : (
              <Gallery photos={mappedPhotos} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
