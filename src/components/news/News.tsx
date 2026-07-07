/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, Eye, ArrowRight, BookOpen, AlertCircle, X, Sparkles, Share2, ThumbsUp } from 'lucide-react';
import { NewsItem } from '../../types';

interface NewsProps {
  news: NewsItem[];
  selectedItem: NewsItem | null;
  onSelectItem: (item: NewsItem | null) => void;
  onIncrementViews: (id: string) => void;
}

type CategoryFilter = 'Tất cả' | 'Học tập' | 'Rèn luyện' | 'Sự kiện' | 'Gương sáng';

export default function News({
  news,
  selectedItem,
  onSelectItem,
  onIncrementViews
}: NewsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('Tất cả');
  const [isLoading, setIsLoading] = useState(false);
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>({});

  const categories: CategoryFilter[] = ['Tất cả', 'Học tập', 'Rèn luyện', 'Sự kiện', 'Gương sáng'];

  // Simulate loading when category or search changes for enhanced UI
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, activeCategory]);

  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.summary.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = activeCategory === 'Tất cả' || item.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [news, searchTerm, activeCategory]);

  const handleOpenNews = (item: NewsItem) => {
    onIncrementViews(item.id);
    onSelectItem(item);
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedArticles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const simulateShare = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title, text: 'Xem tin tức Liên đội THCS Chu Văn An', url: window.location.href })
        .catch(() => {});
    } else {
      alert(`Đã sao chép liên kết chia sẻ cho bài viết: "${title}"`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 pb-24">
      
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full inline-block">
          Kênh thông tin chính thức
        </span>
        <h1 className="font-display text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-5xl">
          Tin Tức & Sự Kiện
        </h1>
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
          Cập nhật thông tin nhanh nhất về phong trào thiếu nhi, lịch hoạt động và gương mặt Đội viên ưu tú.
        </p>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 dark:border-slate-800">
        {/* Categories slider */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/15 dark:bg-blue-500'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Tìm kiếm tin bài..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* News Content Area */}
      {isLoading ? (
        // Skeleton Skeletons for Loading State
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-2xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden space-y-4 animate-pulse p-4">
              <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800 rounded-xl" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNews.length === 0 ? (
        // Empty Search Results View
        <div className="text-center py-16 space-y-3 max-w-sm mx-auto">
          <AlertCircle className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-200">Không tìm thấy tin bài nào</h3>
          <p className="text-xs text-slate-500">Hãy thử nhập từ khóa khác hoặc chuyển sang chuyên mục khác xem sao em nhé!</p>
          <button 
            onClick={() => { setSearchTerm(''); setActiveCategory('Tất cả'); }}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 underline"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        // Grid layout of news
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          layout
        >
          {filteredNews.map((item) => {
            const isLiked = !!likedArticles[item.id];
            return (
              <motion.article
                key={item.id}
                id={item.id}
                layout
                whileHover={{ y: -5 }}
                onClick={() => handleOpenNews(item)}
                className="group cursor-pointer flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <span className={`absolute top-3 left-3 rounded-md px-2.5 py-1 text-[10px] font-bold text-white ${
                      item.category === 'Sự kiện' ? 'bg-red-600' :
                      item.category === 'Học tập' ? 'bg-blue-600' :
                      item.category === 'Gương sáng' ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}>
                      {item.category}
                    </span>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{item.date}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{item.views} lượt xem</span>
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base text-slate-950 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400 leading-tight line-clamp-2">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {item.summary}
                    </p>
                  </div>
                </div>

                {/* Article footer with actions */}
                <div className="px-5 pb-5 pt-3 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold">
                  <span className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 group-hover:underline">
                    <span>Đọc tiếp</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>

                  <div className="flex items-center space-x-3 text-slate-400">
                    <button 
                      onClick={(e) => toggleLike(item.id, e)}
                      className={`hover:text-red-500 transition-colors p-1 rounded-md ${isLiked ? 'text-red-500' : ''}`}
                      title="Thích bài viết"
                    >
                      <ThumbsUp className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                      onClick={(e) => simulateShare(item.title, e)}
                      className="hover:text-blue-500 transition-colors p-1 rounded-md"
                      title="Chia sẻ"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      {/* 3. News Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="news-detail-modal">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onSelectItem(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 lg:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25 }}
                className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto"
              >
                {/* Close Button */}
                <button
                  onClick={() => onSelectItem(null)}
                  className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all z-10"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Banner image */}
                <div className="aspect-[16/9] -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 overflow-hidden bg-slate-100 relative border-b border-slate-100 dark:border-slate-800">
                  <img 
                    src={selectedItem.image} 
                    alt={selectedItem.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent flex items-end p-6">
                    <div>
                      <span className={`inline-block rounded-md px-2.5 py-1 text-[10px] font-bold text-white mb-2 shadow ${
                        selectedItem.category === 'Sự kiện' ? 'bg-red-600' :
                        selectedItem.category === 'Học tập' ? 'bg-blue-600' :
                        selectedItem.category === 'Gương sáng' ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}>
                        {selectedItem.category}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display leading-tight">
                        {selectedItem.title}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Content space */}
                <div className="space-y-6 pt-6">
                  {/* Metadata info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 text-xs font-semibold text-slate-400 dark:border-slate-800/80">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Đăng ngày: {selectedItem.date}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{selectedItem.views} lượt xem</span>
                      </span>
                    </div>
                    
                    <span className="text-slate-500 dark:text-slate-400">
                      Nguồn: Ban Biên Tập Măng Non
                    </span>
                  </div>

                  {/* Summary Callout */}
                  <div className="rounded-2xl border-l-4 border-blue-500 bg-blue-50/50 p-4 dark:bg-blue-950/20">
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-200 leading-relaxed font-sans">
                      {selectedItem.summary}
                    </p>
                  </div>

                  {/* Article Content */}
                  <div className="font-sans text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-4 whitespace-pre-line">
                    {selectedItem.content}
                  </div>

                  {/* Action block */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-6 dark:border-slate-800/80">
                    <button 
                      onClick={() => onSelectItem(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Đóng bài viết
                    </button>
                    
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={(e) => toggleLike(selectedItem.id, e)}
                        className={`flex items-center space-x-1.5 rounded-xl border px-3 py-2 text-xs font-bold ${
                          likedArticles[selectedItem.id]
                            ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-950/30 dark:border-red-900'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>Thích ({likedArticles[selectedItem.id] ? 1 : 0})</span>
                      </button>

                      <button 
                        onClick={(e) => simulateShare(selectedItem.title, e)}
                        className="flex items-center space-x-1.5 rounded-xl bg-blue-600 text-white px-3.5 py-2 text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span>Chia sẻ</span>
                      </button>
                    </div>
                  </div>
                </div>

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
