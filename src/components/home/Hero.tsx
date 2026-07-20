/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Award, Users, ShieldCheck, Heart, ArrowRight } from 'lucide-react';
import { usePageOverrides } from '../../features/cms/usePageOverrides';
import { HOME_HERO_DEFAULT } from '../../config/defaults/home.defaults';
import { deepMerge } from '../../utils/deepMerge';
import EditableBlock from '../editable/EditableBlock';

interface HeroProps {
  onNavigate: (viewId: string) => void;
}

export default function Hero({ onNavigate }: HeroProps) {
  const { overrides, saveOverride, resetOverride, error } = usePageOverrides('home');
  const heroOverride = overrides['hero'];
  const finalHeroData = deepMerge(HOME_HERO_DEFAULT, heroOverride?.data);

  const isDefaultBg = !finalHeroData.backgroundImage || finalHeroData.backgroundImage === HOME_HERO_DEFAULT.backgroundImage;
  const isCustomBrightBg = !isDefaultBg && (() => {
    const url = finalHeroData.backgroundImage.toLowerCase();
    return (
      url.includes('pastel') ||
      url.includes('bright') ||
      url.includes('light') ||
      url.includes('cloud') ||
      url.includes('may') ||
      url.includes('sky') ||
      url.includes('white') ||
      url.includes('bg-') ||
      url.includes('vector') ||
      url.includes('illustration') ||
      url.includes('graphic') ||
      url.includes('banner') ||
      url.includes('png') ||
      url.includes('drawing') ||
      url.includes('pattern') ||
      url.includes('gradient') ||
      (!url.includes('dark') && !url.includes('night') && !url.includes('black'))
    );
  })();

  // Define overlays
  let overlayClass = '';
  let leftGradientClass = '';

  if (finalHeroData.backgroundImage) {
    if (isDefaultBg) {
      overlayClass = 'bg-black/12';
      leftGradientClass = 'bg-gradient-to-r from-black/25 via-black/5 to-transparent';
    } else if (isCustomBrightBg) {
      overlayClass = 'bg-black/2';
      leftGradientClass = 'bg-gradient-to-r from-black/15 via-black/2 to-transparent';
    } else {
      overlayClass = 'bg-black/8';
      leftGradientClass = 'bg-gradient-to-r from-black/20 via-black/4 to-transparent';
    }
  }

  const textShadowStyle = finalHeroData.backgroundImage 
    ? { textShadow: '0 2px 8px rgba(15, 23, 42, 0.65), 0 1px 3px rgba(15, 23, 42, 0.45)' }
    : undefined;

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
        
        <EditableBlock
          pageKey="home"
          blockKey="hero"
          title="Hero trang chủ"
          defaultData={HOME_HERO_DEFAULT}
          overrideData={heroOverride}
          onSave={saveOverride}
          onReset={resetOverride}
          error={error}
        >
          {/* Sleek Blue/Indigo Gradient Main Hero Card */}
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white p-6 sm:p-10 md:p-12 shadow-2xl transition-all duration-300">
            {/* Background Image Layer */}
            {finalHeroData.backgroundImage && (
              <div className="absolute inset-0">
                <img 
                  src={finalHeroData.backgroundImage} 
                  alt="" 
                  className="h-full w-full object-cover select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Decorative Background Glows */}
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-red-500/20 blur-3xl pointer-events-none z-0" />
            <div className="absolute top-1/2 -left-20 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl pointer-events-none z-0" />

            {/* Base Overlay Layer */}
            {finalHeroData.backgroundImage && overlayClass && (
              <div className={`absolute inset-0 ${overlayClass} pointer-events-none z-0`} />
            )}

            {/* Left-to-Right Reader Gradient Overlay */}
            {finalHeroData.backgroundImage && leftGradientClass && (
              <div className={`absolute inset-0 ${leftGradientClass} pointer-events-none z-0`} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
              
              {/* Slogan and Text Column */}
              <motion.div 
                className="lg:col-span-7 space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >


                {/* Decorative script slogan */}
                <motion.div
                  variants={itemVariants}
                  className="font-script text-2xl md:text-3xl text-yellow-300 font-bold tracking-wide mb-3 pl-1 block drop-shadow-sm select-none"
                  style={textShadowStyle}
                >
                  "Tuổi nhỏ làm việc nhỏ, tùy theo sức của mình"
                </motion.div>

                <motion.h1 
                  variants={itemVariants}
                  className="font-display text-[21px] sm:text-[25px] md:text-[32px] lg:text-[36px] font-extrabold tracking-tight text-white leading-[1.1] drop-shadow-sm"
                  style={textShadowStyle}
                >
                  {finalHeroData.title}
                </motion.h1>

                <motion.p 
                  variants={itemVariants}
                  className={`font-sans text-base max-w-2xl font-medium leading-relaxed ${finalHeroData.backgroundImage ? 'text-white font-semibold' : 'text-blue-100'}`}
                  style={textShadowStyle}
                >
                  {finalHeroData.subtitle}
                </motion.p>

                <motion.p 
                  variants={itemVariants}
                  className={`font-sans text-xs max-w-xl leading-relaxed ${finalHeroData.backgroundImage ? 'text-slate-100 font-medium' : 'text-slate-300'}`}
                  style={textShadowStyle}
                >
                  {finalHeroData.description}
                </motion.p>

                <motion.div 
                  variants={itemVariants}
                  className="flex flex-wrap gap-4 pt-4"
                >
                  <button
                    onClick={() => {
                      const url = finalHeroData.primaryButton?.href || '/hoat-dong';
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
                    className="group flex items-center space-x-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-600/35 hover:bg-red-700 hover:shadow-red-700/40 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                  >
                    <span>{finalHeroData.primaryButton?.label || "Xem hoạt động nổi bật"}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  
                  <button
                    onClick={() => {
                      const url = finalHeroData.secondaryButton?.href || '/gioi-thieu';
                      if (url.includes('activities') || url.includes('hoat-dong')) {
                        onNavigate('activities');
                      } else if (url.includes('news') || url.includes('tin-tuc')) {
                        onNavigate('news');
                      } else if (url.includes('about') || url.includes('gioi-thieu')) {
                        onNavigate('about');
                      } else if (url.includes('contact') || url.includes('lien-he')) {
                        onNavigate('contact');
                      } else {
                        onNavigate('about');
                      }
                    }}
                    id="hero-secondary-btn"
                    className="rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/25 hover:border-white/30 backdrop-blur-sm active:scale-[0.98] transition-all duration-200 cursor-pointer"
                  >
                    {finalHeroData.secondaryButton?.label || "Tìm hiểu truyền thống"}
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
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase bg-red-600 text-white font-bold px-2.5 py-0.5 rounded-full inline-block">
                            Sinh hoạt Đội
                          </span>
                          <h3 className="text-white text-sm font-bold font-sans drop-shadow-sm">
                            Hành trình rèn luyện phấn đấu lên Đoàn
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Float badge 1 */}
                  <motion.div 
                    className="absolute -top-6 -left-6 rounded-[1.25rem] bg-slate-900/95 backdrop-blur-md p-3.5 shadow-2xl border border-white/10 flex items-center space-x-3 text-white"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
                      <Award className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-white font-display tracking-tight leading-tight">Liên đội mạnh</h4>
                      <p className="text-[9px] text-slate-300 font-sans leading-none mt-1">Năm học 2025 - 2026</p>
                    </div>
                  </motion.div>

                  {/* Float badge 2 */}
                  <motion.div 
                    className="absolute -bottom-6 -right-4 rounded-[1.25rem] bg-slate-900/95 backdrop-blur-md p-3.5 shadow-2xl border border-white/10 flex items-center space-x-3 text-white"
                    animate={{ y: [0, 6, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-white font-display tracking-tight leading-tight">100% Đội viên</h4>
                      <p className="text-[9px] text-slate-300 font-sans leading-none mt-1">Rèn luyện đạt chuẩn</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

            </div>

            {/* Statistics Row embedded inside Hero Card */}
            <motion.div 
              className="mt-12 md:mt-16 pt-8 border-t border-white/10 grid grid-cols-2 gap-4 sm:grid-cols-4 relative z-10"
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
                      <span className="block text-xl font-extrabold text-white font-display tracking-tight leading-none">
                        {stat.value}
                      </span>
                      <span className="block text-[10px] font-semibold text-slate-300 uppercase tracking-wider mt-1 font-sans">
                        {stat.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </motion.div>

          </div>
        </EditableBlock>

      </div>
    </section>
  );
}
