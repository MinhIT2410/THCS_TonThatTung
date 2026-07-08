/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Award, Users, ShieldCheck, Heart, ArrowRight } from 'lucide-react';
import { aboutService } from '../../services/aboutService';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

interface HeroProps {
  onNavigate: (viewId: string) => void;
}

export default function Hero({ onNavigate }: HeroProps) {
  const { siteSettings } = useSiteSettings();
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  };

  const stats = [
    { id: 'stat-1', icon: Users, label: 'Đội viên tích cực', value: '1,250+', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { id: 'stat-2', icon: ShieldCheck, label: 'Chi đội tự quản', value: '32', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40' },
    { id: 'stat-3', icon: Award, label: 'Công trình măng non', value: '05', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/40' },
    { id: 'stat-4', icon: Heart, label: 'Năm học dẫn đầu', value: '05+', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  ];

  return (
    <section className="relative overflow-hidden bg-slate-50 py-8 dark:bg-slate-950 sm:py-12 md:py-16 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Sleek Blue/Indigo Gradient Main Hero Card */}
        <div 
          className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white rounded-[2rem] p-6 sm:p-10 md:p-12 shadow-2xl relative overflow-hidden bg-cover bg-center"
          style={siteSettings.home_hero_background_url ? { backgroundImage: `url(${siteSettings.home_hero_background_url})` } : {}}
        >
          {/* Decorative Background Glows */}
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-red-500/20 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -left-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

          {/* Dark Overlay for customized hero backgrounds */}
          {siteSettings.home_hero_background_url && (
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[0.5px] pointer-events-none" />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
            
            {/* Slogan and Text Column */}
            <motion.div 
              className="lg:col-span-7 space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div 
                variants={itemVariants}
                className="inline-flex items-center space-x-2 rounded-full border border-red-500/30 bg-red-500/20 px-3.5 py-1.5"
              >
                <Award className="h-4 w-4 text-red-300" />
                <span className="text-xs font-bold text-red-200 uppercase tracking-wide">
                  Liên đội mạnh xuất sắc cấp thành phố
                </span>
              </motion.div>

              <motion.h1 
                variants={itemVariants}
                className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl leading-tight"
              >
                {siteSettings.home_hero_title || (
                  <>
                    Chào mừng bạn đến với <br />
                    <span className="bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent drop-shadow-sm">
                      {siteSettings.school_name || aboutService.getSchoolName()}
                    </span>
                  </>
                )}
              </motion.h1>

              <motion.p 
                variants={itemVariants}
                className="font-sans text-lg text-blue-100 max-w-2xl font-medium leading-relaxed"
              >
                {siteSettings.home_hero_subtitle ? `"${siteSettings.home_hero_subtitle}"` : `"${siteSettings.slogan || aboutService.getSchoolSlogan()}"`}
              </motion.p>

              <motion.p 
                variants={itemVariants}
                className="font-sans text-sm text-slate-300 max-w-xl leading-relaxed"
              >
                {siteSettings.home_hero_description || "Nơi nuôi dưỡng lý tưởng cách mạng, bồi dưỡng kỹ năng toàn diện, rèn luyện phẩm chất Đội viên tài năng, sẵn sàng tiếp bước xây dựng Tổ quốc xã hội chủ nghĩa tươi đẹp."}
              </motion.p>

              <motion.div 
                variants={itemVariants}
                className="flex flex-wrap gap-4 pt-4"
              >
                <button
                  onClick={() => {
                    const url = siteSettings.home_hero_button_url || '/activities';
                    if (url.includes('activities') || url.includes('hoat-dong')) {
                      onNavigate('activities');
                    } else if (url.includes('news') || url.includes('tin-tuc')) {
                      onNavigate('news');
                    } else if (url.includes('about') || url.includes('gioi-thieu')) {
                      onNavigate('about');
                    } else if (url.includes('contact') || url.includes('lien-he')) {
                      onNavigate('contact');
                    } else {
                      onNavigate('activities');
                    }
                  }}
                  id="hero-primary-btn"
                  className="group flex items-center space-x-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/35 hover:bg-red-700 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  <span>{siteSettings.home_hero_button_text || "Xem hoạt động nổi bật"}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                
                <button
                  onClick={() => onNavigate('about')}
                  id="hero-secondary-btn"
                  className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/25 hover:border-white/30 backdrop-blur-sm active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  Tìm hiểu truyền thống
                </button>
              </motion.div>
            </motion.div>

            {/* Visual Element / Grid of Badges Column */}
            <motion.div 
              className="lg:col-span-5 relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="relative mx-auto max-w-[380px] lg:mr-0">
                {/* Main Decorative Image */}
                <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/5 p-2 shadow-2xl relative">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden relative group">
                    <img 
                      src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&auto=format&fit=crop&q=80" 
                      alt="Pioneer Activities" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-5">
                      <div>
                        <span className="text-[10px] uppercase bg-red-600 text-white font-bold px-2 py-0.5 rounded-full mb-1.5 inline-block">
                          Sinh hoạt Đội
                        </span>
                        <h3 className="text-white text-sm font-bold font-sans">
                          Hành trình rèn luyện phấn đấu lên Đoàn
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Float badge 1 */}
                <motion.div 
                  className="absolute -top-6 -left-6 rounded-2xl bg-slate-900/90 backdrop-blur-md p-3.5 shadow-2xl border border-white/10 flex items-center space-x-3 text-white"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
                    <Award className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white leading-tight">Bằng Khen TW Đoàn</h4>
                    <p className="text-[9px] text-slate-300 leading-none mt-0.5">Năm học 2024 - 2025</p>
                  </div>
                </motion.div>

                {/* Float badge 2 */}
                <motion.div 
                  className="absolute -bottom-6 -right-4 rounded-2xl bg-slate-900/90 backdrop-blur-md p-3.5 shadow-2xl border border-white/10 flex items-center space-x-3 text-white"
                  animate={{ y: [0, 6, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                    <Users className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white leading-tight">100% Đội viên</h4>
                    <p className="text-[9px] text-slate-300 leading-none mt-0.5">Rèn luyện đạt chuẩn</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

          </div>

          {/* Statistics Row embedded inside Hero Card */}
          <motion.div 
            className="mt-12 md:mt-16 pt-8 border-t border-white/10 grid grid-cols-2 gap-4 sm:grid-cols-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {stats.map((stat) => {
              const IconComponent = stat.icon;
              return (
                <div
                  key={stat.id}
                  id={stat.id}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white/5 transition-colors duration-200"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xl font-black text-white tracking-tight leading-none">
                      {stat.value}
                    </span>
                    <span className="block text-[10px] font-semibold text-slate-300 uppercase tracking-wider mt-1">
                      {stat.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>

        </div>

      </div>
    </section>
  );
}
