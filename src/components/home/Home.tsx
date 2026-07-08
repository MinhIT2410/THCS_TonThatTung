/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, ArrowRight, Eye, Calendar, Sparkles, BookOpen, Volume2, Landmark } from 'lucide-react';
import { NewsItem, ActivityItem, PhotoItem } from '../../types';
import Hero from './Hero';
import { bannerService } from '../../services/bannerService';
import { HomeBanner } from '../../types/banner';

interface HomeProps {
  news: NewsItem[];
  activities: ActivityItem[];
  photos: PhotoItem[];
  onNavigate: (viewId: string) => void;
  onSelectNews: (item: NewsItem) => void;
  onSelectActivity: (item: ActivityItem) => void;
}

export default function Home({
  news,
  activities,
  photos,
  onNavigate,
  onSelectNews,
  onSelectActivity
}: HomeProps) {
  const [publishedBanners, setPublishedBanners] = useState<HomeBanner[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const fetchBanners = async () => {
      try {
        const list = await bannerService.getPublishedBanners();
        if (active) {
          setPublishedBanners(list);
        }
      } catch (err) {
        console.error('Error fetching published banners:', err);
      } finally {
        if (active) {
          setIsLoadingBanners(false);
        }
      }
    };
    fetchBanners();
    return () => {
      active = false;
    };
  }, []);

  // Get featured/latest news items (max 3)
  const featuredNews = news.filter(n => n.featured).slice(0, 3);
  const displayNews = featuredNews.length > 0 ? featuredNews : news.slice(0, 3);

  // Get active activities (max 2)
  const activeActivities = activities.filter(a => a.status === 'ongoing').slice(0, 2);
  const displayActivities = activeActivities.length > 0 ? activeActivities : activities.slice(0, 2);

  // Get latest 4 photos for gallery highlights
  const photoHighlights = photos.slice(0, 4);

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Hero Banner Component */}
      <Hero onNavigate={onNavigate} />

      {/* 2. Quick Broadcast / Phát thanh măng non strip */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between rounded-[2rem] bg-gradient-to-r from-red-600 to-blue-700 p-5 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full pointer-events-none blur-2xl" />
          <div className="flex items-center space-x-4 mb-4 md:mb-0 relative z-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md animate-bounce">
              <Volume2 className="h-6 w-6 text-yellow-300" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold bg-white/20 px-2.5 py-0.5 rounded-full inline-block mb-1 tracking-wider text-yellow-200">
                Phát thanh Măng non
              </span>
              <h3 className="text-sm md:text-base font-bold font-sans">
                Chương trình phát thanh kỳ này: "Thiếu nhi Thủ đô thi đua học tốt rèn ngoan"
              </h3>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('news')}
            className="flex items-center space-x-1.5 rounded-xl bg-white text-blue-700 px-5 py-3 text-xs font-bold shadow-md hover:bg-slate-50 active:scale-95 transition-all duration-200 relative z-10 shrink-0"
          >
            <span>Nghe chương trình</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      {/* 3. Featured News & Announcements Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/40 px-3.5 py-1.5 rounded-full inline-block mb-3.5">
              Măng non tin nhanh
            </span>
            <h2 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Tin tức măng non
            </h2>
            <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
              Cập nhật tin hoạt động Đội, gương sáng thiếu nhi và thông báo mới nhất.
            </p>
          </div>
          <button
            onClick={() => onNavigate('news')}
            id="view-all-news-btn"
            className="flex items-center space-x-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline mt-2 sm:mt-0 transition-colors"
          >
            <span>Xem tất cả tin tức</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {displayNews.map((item, idx) => (
            <motion.article
              key={item.id}
              id={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              whileHover={{ y: -6 }}
              onClick={() => onSelectNews(item)}
              className="group cursor-pointer overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="aspect-[16/10] overflow-hidden bg-slate-100 relative">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <span className={`absolute top-4 left-4 rounded-full px-3 py-1 text-[10px] font-bold text-white shadow-sm ${
                  item.category === 'Sự kiện' ? 'bg-red-600' :
                  item.category === 'Học tập' ? 'bg-blue-600' :
                  item.category === 'Gương sáng' ? 'bg-amber-500' : 'bg-emerald-600'
                }`}>
                  {item.category}
                </span>
              </div>
              <div className="p-6 space-y-3.5">
                <div className="flex items-center space-x-3.5 text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{item.date}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{item.views} lượt xem</span>
                  </span>
                </div>
                <h3 className="font-display font-bold text-base text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400 line-clamp-2 leading-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {item.summary}
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center space-x-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 group-hover:underline">
                    <span>Đọc chi tiết</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* 4. Movements & Activities Tracker (Call to Action) */}
      <section className="bg-blue-900/5 dark:bg-blue-950/10 py-16 transition-colors duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3.5 py-1.5 rounded-full inline-block mb-3.5">
                Phong trào sôi nổi
              </span>
              <h2 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Phong trào thi đua đang diễn ra
              </h2>
              <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
                Các bạn hãy tham gia tích cực để cùng hoàn thành phong trào Đội viên tốt nhé.
              </p>
            </div>
            <button
              onClick={() => onNavigate('activities')}
              id="view-all-activities-btn"
              className="flex items-center space-x-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline mt-2 sm:mt-0 transition-colors"
            >
              <span>Xem toàn bộ kế hoạch</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {displayActivities.map((act, idx) => (
              <motion.div
                key={act.id}
                id={act.id}
                initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="rounded-[2rem] border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 flex flex-col sm:flex-row gap-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="w-full sm:w-44 h-44 shrink-0 rounded-2xl overflow-hidden bg-slate-100 relative">
                  <img 
                    src={act.image} 
                    alt={act.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 left-3 uppercase text-[9px] font-extrabold px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-md">
                    Đang chạy
                  </span>
                </div>
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center space-x-1">
                      <Sparkles className="h-3 w-3 animate-pulse text-red-500" />
                      <span>Thời gian: {act.date}</span>
                    </span>
                    <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white leading-tight">
                      {act.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {act.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                      Đã có <strong className="text-slate-700 dark:text-slate-300 font-bold">{act.participantsCount}+</strong> tham gia
                    </span>
                    <button
                      onClick={() => onSelectActivity(act)}
                      className="rounded-xl bg-blue-50 text-blue-600 px-4 py-2 text-xs font-bold hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      Đăng ký ngay
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Traditional Section / Lịch sử măng non */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 md:p-12 relative overflow-hidden shadow-2xl border border-white/5">
          {/* Accent decoration */}
          <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600 via-blue-600 to-transparent pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-5 relative z-10">
              <span className="inline-flex items-center space-x-1.5 rounded-full bg-red-600/30 border border-red-500/40 px-3.5 py-1.5 text-xs font-bold text-red-300 uppercase tracking-wider">
                <Landmark className="h-3.5 w-3.5" />
                <span>Phòng truyền thống</span>
              </span>
              <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl leading-tight">
                Bác Hồ Với Thiếu Niên Nhi Đồng
              </h2>
              <p className="font-sans text-sm text-slate-300 leading-relaxed max-w-3xl">
                "Ai yêu các nhi đồng bằng Bác Hồ Chí Minh". Cả cuộc đời Người luôn dành tình cảm sâu sắc, ấm áp nhất cho các thế hệ tương lai. Lời dạy "5 Điều Bác Hồ dạy" luôn là kim chỉ nam soi đường, khích lệ thiếu niên nhi đồng cả nước tu dưỡng đạo đức, rèn luyện tri thức để đưa non sông Việt Nam vươn vai sánh vai với các cường quốc năm châu.
              </p>
              <div className="flex flex-wrap gap-2.5 text-xs font-bold pt-2">
                <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
                  1. Yêu Tổ quốc, yêu đồng bào
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
                  2. Học tập tốt, lao động tốt
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
                  3. Đoàn kết tốt, kỷ luật tốt
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
                  4. Giữ gìn vệ sinh thật tốt
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2">
                  5. Khiêm tốn, thật thà, dũng cảm
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-4 flex justify-center relative z-10">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-2 backdrop-blur-md max-w-[280px] shadow-2xl">
                <div className="overflow-hidden rounded-2xl aspect-[4/5] bg-slate-800 relative">
                  <img 
                    src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80" 
                    alt="Bác Hồ cùng thiếu nhi" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                    <p className="text-[10px] text-slate-300 italic text-center w-full">
                      Bác Hồ phát kẹo cho các cháu nhi đồng
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Photo Gallery Highlights */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest bg-amber-50 dark:bg-amber-950/40 px-3.5 py-1.5 rounded-full inline-block mb-3.5">
              Ghi dấu kỷ niệm
            </span>
            <h2 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Khoảnh khắc đẹp Liên đội
            </h2>
            <p className="font-sans text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ghi lại những khoảnh khắc tươi đẹp đầy sức trẻ dưới mái trường của chúng mình.
            </p>
          </div>
          <button
            onClick={() => onNavigate('gallery')}
            id="view-all-gallery-btn"
            className="flex items-center space-x-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline mt-2 sm:mt-0 transition-colors"
          >
            <span>Mở thư viện ảnh</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {photoHighlights.map((photo, idx) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.08 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onNavigate('gallery')}
              className="aspect-square rounded-[2rem] overflow-hidden bg-slate-100 border border-slate-200 dark:border-slate-800 cursor-pointer relative group shadow-sm hover:shadow-md transition-all duration-300"
            >
              <img 
                src={photo.imageUrl} 
                alt={photo.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-end p-5 transition-opacity duration-300">
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider mb-1">
                  {photo.category}
                </span>
                <h4 className="text-xs font-bold text-white leading-tight line-clamp-2">
                  {photo.title}
                </h4>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
