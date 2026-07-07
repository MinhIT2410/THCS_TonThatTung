/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, X, ChevronLeft, ChevronRight, Play, Pause, Download, Calendar, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import { PhotoItem } from '../../types';

interface GalleryProps {
  photos: PhotoItem[];
}

type PhotoCategory = 'Tất cả' | 'Hoạt động' | 'Đại hội' | 'Thể thao' | 'Văn nghệ';

export default function Gallery({ photos }: GalleryProps) {
  const [activeCategory, setActiveCategory] = useState<PhotoCategory>('Tất cả');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  
  // Slide auto-play variables
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIntervalId, setPlayIntervalId] = useState<NodeJS.Timeout | null>(null);
  
  // Download simulation state
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);

  const categories: PhotoCategory[] = ['Tất cả', 'Hoạt động', 'Đại hội', 'Thể thao', 'Văn nghệ'];

  const filteredPhotos = useMemo(() => {
    if (activeCategory === 'Tất cả') return photos;
    return photos.filter(p => p.category === activeCategory);
  }, [photos, activeCategory]);

  const handleOpenLightbox = (index: number) => {
    setLightboxIdx(index);
  };

  const handleCloseLightbox = () => {
    stopAutoPlay();
    setLightboxIdx(null);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx + 1) % filteredPhotos.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  const startAutoPlay = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    const id = setInterval(() => {
      handleNext();
    }, 3000);
    setPlayIntervalId(id);
  };

  const stopAutoPlay = () => {
    if (!isPlaying) return;
    setIsPlaying(false);
    if (playIntervalId) {
      clearInterval(playIntervalId);
      setPlayIntervalId(null);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
  };

  const simulateDownload = (photo: PhotoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloadingId(photo.id);
    
    setTimeout(() => {
      setIsDownloadingId(null);
      
      // Simulate download trigger
      const link = document.createElement('a');
      link.href = photo.imageUrl;
      link.download = `${photo.title}.jpg`;
      // We can't actually download cross-origin easily, so we just log or open
      window.open(photo.imageUrl, '_blank');
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 pb-24">
      
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full inline-block">
          Ghi lại những khoảnh khắc
        </span>
        <h1 className="font-display text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-5xl">
          Thư Viện Ảnh Đội
        </h1>
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
          Hình ảnh sinh động về các buổi chuyên đề dưới cờ, hội trại truyền thống, hoạt động xã hội và các cuộc thi học tập.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center justify-center space-x-1.5 border-b border-slate-100 pb-4 dark:border-slate-800">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); stopAutoPlay(); }}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Photos Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredPhotos.map((photo, index) => (
            <motion.div
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -4 }}
              onClick={() => handleOpenLightbox(index)}
              className="group cursor-pointer rounded-2xl overflow-hidden border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm relative aspect-square"
            >
              {/* Image element */}
              <img 
                src={photo.imageUrl} 
                alt={photo.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />

              {/* Hover overlay description */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-5 transition-opacity duration-300">
                <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider mb-1">
                  {photo.category}
                </span>
                <h3 className="text-white text-sm font-bold font-sans leading-snug line-clamp-2">
                  {photo.title}
                </h3>
                <div className="flex items-center space-x-1 text-slate-300 text-[10px] mt-2 font-medium">
                  <Calendar className="h-3 w-3" />
                  <span>{photo.date}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Lightbox Slideshow Modal Overlay */}
      <AnimatePresence>
        {lightboxIdx !== null && filteredPhotos[lightboxIdx] && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/95 flex flex-col justify-between" id="photo-lightbox">
            
            {/* Header controls */}
            <div className="flex items-center justify-between p-4 text-white">
              <div className="flex items-center space-x-2 text-xs font-semibold">
                <span className="bg-red-600 text-white text-[10px] uppercase px-2 py-0.5 rounded-full">
                  {filteredPhotos[lightboxIdx].category}
                </span>
                <span className="text-slate-400">
                  {lightboxIdx + 1} / {filteredPhotos.length}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-4">
                {/* Auto-Play toggler */}
                <button
                  onClick={togglePlay}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title={isPlaying ? "Tạm dừng chiếu" : "Tự động phát chiếu slide"}
                >
                  {isPlaying ? <Pause className="h-5 w-5 text-red-500" /> : <Play className="h-5 w-5" />}
                </button>

                {/* Download simulation */}
                <button
                  onClick={(e) => simulateDownload(filteredPhotos[lightboxIdx], e)}
                  disabled={isDownloadingId !== null}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                  title="Tải ảnh về máy"
                >
                  <Download className="h-5 w-5" />
                </button>

                {/* Close Lightbox */}
                <button
                  onClick={handleCloseLightbox}
                  className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Đóng xem ảnh"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Main Stage viewport */}
            <div className="flex-1 flex items-center justify-between px-4 sm:px-12 relative">
              {/* Previous Button */}
              <button
                onClick={handlePrev}
                className="absolute left-4 z-10 p-3 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/15 hover:text-white transition-all"
                title="Ảnh trước"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {/* Slideshow Active image viewport */}
              <div className="mx-auto max-w-4xl max-h-[70vh] flex items-center justify-center p-2 relative">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={filteredPhotos[lightboxIdx].id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    src={filteredPhotos[lightboxIdx].imageUrl}
                    alt={filteredPhotos[lightboxIdx].title}
                    className="max-w-full max-h-[70vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>

                {/* Simulated downloading notice banner */}
                <AnimatePresence>
                  {isDownloadingId === filteredPhotos[lightboxIdx].id && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-6 bg-slate-900 border border-slate-800 text-emerald-400 px-4 py-2.5 rounded-full text-xs font-bold flex items-center space-x-1.5 shadow-2xl"
                    >
                      <Sparkles className="h-4 w-4 animate-spin text-yellow-400" />
                      <span>Đang chuẩn bị tải xuống ảnh độ nét cao...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Next Button */}
              <button
                onClick={handleNext}
                className="absolute right-4 z-10 p-3 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/15 hover:text-white transition-all"
                title="Ảnh tiếp"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Bottom description panel */}
            <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-6 sm:p-10 text-center max-w-3xl mx-auto space-y-2.5">
              <h4 className="text-white font-display text-lg sm:text-xl font-bold tracking-tight">
                {filteredPhotos[lightboxIdx].title}
              </h4>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                {filteredPhotos[lightboxIdx].description || "Không có mô tả chi tiết."}
              </p>
              <div className="text-[11px] font-bold text-red-500">
                Chụp ngày: {filteredPhotos[lightboxIdx].date}
              </div>
            </div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
