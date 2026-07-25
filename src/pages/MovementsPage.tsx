/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Flag,
  Calendar,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Clock,
  Layers,
  FileCheck
} from 'lucide-react';
import { movementService } from '../services/movementService';
import {
  MovementCampaign,
  CampaignType,
  CampaignStatus,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_STATUS_LABELS
} from '../types/movement';

// Cohesive color themes for Tree Timeline nodes & leaf accents
const COLOR_THEMES = [
  {
    name: 'emerald',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    nodeBg: 'bg-emerald-600 text-white ring-emerald-100 dark:ring-emerald-900',
    leafColor: '#10b981',
    textAccent: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    name: 'amber',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    nodeBg: 'bg-amber-600 text-white ring-amber-100 dark:ring-amber-900',
    leafColor: '#f59e0b',
    textAccent: 'text-amber-600 dark:text-amber-400',
  },
  {
    name: 'blue',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    nodeBg: 'bg-blue-600 text-white ring-blue-100 dark:ring-blue-900',
    leafColor: '#3b82f6',
    textAccent: 'text-blue-600 dark:text-blue-400',
  },
  {
    name: 'purple',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    nodeBg: 'bg-purple-600 text-white ring-purple-100 dark:ring-purple-900',
    leafColor: '#a855f7',
    textAccent: 'text-purple-600 dark:text-purple-400',
  },
  {
    name: 'crimson',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    nodeBg: 'bg-rose-600 text-white ring-rose-100 dark:ring-rose-900',
    leafColor: '#f43f5e',
    textAccent: 'text-rose-600 dark:text-rose-400',
  },
  {
    name: 'teal',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    nodeBg: 'bg-teal-600 text-white ring-teal-100 dark:ring-teal-900',
    leafColor: '#14b8a6',
    textAccent: 'text-teal-600 dark:text-teal-400',
  }
];

export default function MovementsPage() {
  const [campaigns, setCampaigns] = useState<MovementCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await movementService.getPublishedCampaigns();
      setCampaigns(data);
    } catch (err: any) {
      console.error('Error loading movement campaigns:', err);
      setError(err.message || 'Không thể tải dữ liệu hoạt động phong trào.');
    } finally {
      setLoading(false);
    }
  };

  // Group 1: Hoạt động theo mốc thời gian (không thuộc loại thường xuyên, có start_date, sắp xếp tăng dần)
  const timelineCampaigns = useMemo(() => {
    return campaigns
      .filter(c => c.campaign_type !== 'thuong_xuyen' && Boolean(c.start_date))
      .sort((a, b) => {
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
  }, [campaigns]);

  // Group 2: Hoạt động thường xuyên
  const regularCampaigns = useMemo(() => {
    return campaigns.filter(c => c.campaign_type === 'thuong_xuyen');
  }, [campaigns]);

  const getStatusBadgeClass = (status: CampaignStatus) => {
    switch (status) {
      case 'dang_dien_ra':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50';
      case 'sap_dien_ra':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50';
      case 'da_ket_thuc':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50';
    }
  };

  const getTypeBadgeClass = (type: CampaignType) => {
    switch (type) {
      case 'thuong_xuyen':
        return 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200/50 dark:border-red-800/50';
      case 'cao_diem':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/50';
      case 'cuoc_thi':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50';
      default:
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/50';
    }
  };

  const formatCampaignDate = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate) return 'Đang cập nhật';
    const start = new Date(startDate);
    const startStr = `${start.getDate().toString().padStart(2, '0')}/${(start.getMonth() + 1).toString().padStart(2, '0')}/${start.getFullYear()}`;
    if (!endDate) return startStr;
    const end = new Date(endDate);
    const endStr = `${end.getDate().toString().padStart(2, '0')}/${(end.getMonth() + 1).toString().padStart(2, '0')}/${end.getFullYear()}`;
    return `${startStr} – ${endStr}`;
  };

  const renderTimelineCard = (campaign: MovementCampaign, theme: typeof COLOR_THEMES[0]) => {
    return (
      <Link
        to={`/hoat-dong/${campaign.slug}`}
        className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2 text-left h-full flex flex-col justify-between"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${theme.badgeBg}`}>
              <Calendar className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              {formatCampaignDate(campaign.start_date, campaign.end_date)}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(campaign.status)}`}>
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </span>
          </div>
          <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 line-clamp-2 transition-colors">
            {campaign.title}
          </h3>
          {campaign.summary && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {campaign.summary}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400 group-hover:underline">
          <span>Xem chi tiết</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16 pb-24 font-sans relative min-h-[60vh]">
      {/* 1. Static Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-extrabold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/40 px-3.5 py-1.5 rounded-full inline-block border border-red-200/30">
          HOẠT ĐỘNG ĐỘI & PHONG TRÀO THIẾU NHI
        </span>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Phong trào & Hoạt động
        </h1>
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
          Nơi cập nhật các chương trình thi đua, hoạt động theo từng thời điểm và các hoạt động thường xuyên của Liên đội THCS Tôn Thất Tùng.
        </p>
      </div>

      {/* Global Error Banner if query fails */}
      {error && !loading && (
        <div className="text-center py-8 border border-dashed border-red-300 dark:border-red-900 rounded-[2.5rem] max-w-xl mx-auto space-y-4 bg-red-50/10 dark:bg-red-950/20 p-8">
          <AlertCircle className="h-10 w-10 mx-auto text-red-500 opacity-80" />
          <h3 className="font-display text-base font-bold text-red-800 dark:text-red-400">
            Không thể tải dữ liệu hoạt động phong trào.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Có lỗi xảy ra trong quá trình kết nối dữ liệu. Vui lòng thử lại sau.
          </p>
          <button
            onClick={loadCampaigns}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors shadow-sm"
          >
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* 2. SECTION: Cây Timeline hoạt động theo mốc */}
      <section className="space-y-8">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Hoạt động theo mốc thời gian
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Các đợt hoạt động thi đua trọng tâm, cuộc thi và phong trào diễn ra theo lịch trình năm học.
          </p>
        </div>

        {/* Loading Skeleton for Timeline */}
        {loading && (
          <div className="space-y-4 animate-pulse py-4">
            <div className="h-64 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center">
              <div className="w-3/4 h-2 bg-slate-200 dark:bg-slate-800 rounded-full relative">
                <div className="absolute left-1/4 -top-12 w-32 h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="absolute right-1/4 -bottom-12 w-32 h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* Empty State for Timeline */}
        {!loading && !error && timelineCampaigns.length === 0 && (
          <div className="max-w-xl mx-auto border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-10 text-center bg-white/50 dark:bg-slate-900/50 space-y-2">
            <Clock className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
            <p className="font-display text-sm font-bold text-slate-700 dark:text-slate-300">
              Chưa có hoạt động theo mốc thời gian.
            </p>
          </div>
        )}

        {/* Cây Timeline Content */}
        {!loading && !error && timelineCampaigns.length > 0 && (
          <div>
            {/* Desktop / Tablet Horizontal Tree Timeline */}
            <div className="hidden md:block w-full overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              <div className="relative min-w-max px-12 py-6 flex items-center min-h-[500px]">
                {/* Horizontal Trunk Line passing through center */}
                <div className="absolute left-8 right-12 top-1/2 -translate-y-1/2 h-2.5 bg-slate-800 dark:bg-slate-200 rounded-full z-0" />

                <div className="relative z-10 flex items-center space-x-10">
                  {timelineCampaigns.map((campaign, idx) => {
                    const isEven = idx % 2 === 0;
                    const theme = COLOR_THEMES[idx % COLOR_THEMES.length];

                    return (
                      <div key={campaign.id} className="relative flex flex-col items-center w-80 shrink-0">
                        {/* Top Slot */}
                        <div className="h-56 w-full flex flex-col items-center justify-end pb-1">
                          {isEven && (
                            <motion.div
                              initial={{ opacity: 0, y: -12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: idx * 0.05 }}
                              className="w-full flex flex-col items-center space-y-1"
                            >
                              <div className="w-full">
                                {renderTimelineCard(campaign, theme)}
                              </div>
                              {/* Branch & Leaves pointing down to node */}
                              <svg className="w-16 h-10 text-slate-800 dark:text-slate-200 pointer-events-none shrink-0" viewBox="0 0 60 40">
                                <path d="M 30 40 L 30 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                <path d="M 30 24 C 15 14, 5 16, 2 24 C 10 32, 25 29, 30 24 Z" fill={theme.leafColor} opacity="0.9" />
                                <path d="M 30 14 C 45 4, 55 6, 58 14 C 50 22, 35 19, 30 14 Z" fill={theme.leafColor} opacity="0.9" />
                              </svg>
                            </motion.div>
                          )}
                        </div>

                        {/* Node Circle directly on Trunk Line */}
                        <div className="relative my-1 flex items-center justify-center z-20">
                          <div className={`w-10 h-10 rounded-full ${theme.nodeBg} flex items-center justify-center font-extrabold text-xs shadow-md ring-4 ring-white dark:ring-slate-950`}>
                            {idx + 1}
                          </div>
                        </div>

                        {/* Bottom Slot */}
                        <div className="h-56 w-full flex flex-col items-center justify-start pt-1">
                          {!isEven && (
                            <motion.div
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: idx * 0.05 }}
                              className="w-full flex flex-col items-center space-y-1"
                            >
                              {/* Branch & Leaves pointing up to node */}
                              <svg className="w-16 h-10 text-slate-800 dark:text-slate-200 pointer-events-none shrink-0" viewBox="0 0 60 40">
                                <path d="M 30 0 L 30 40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                <path d="M 30 16 C 15 26, 5 24, 2 16 C 10 8, 25 11, 30 16 Z" fill={theme.leafColor} opacity="0.9" />
                                <path d="M 30 26 C 45 36, 55 34, 58 26 C 50 18, 35 21, 30 26 Z" fill={theme.leafColor} opacity="0.9" />
                              </svg>
                              <div className="w-full">
                                {renderTimelineCard(campaign, theme)}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Arrowhead / Tip at end of horizontal trunk */}
                  <div className="relative flex items-center pl-2 shrink-0 z-10">
                    <svg className="w-8 h-8 text-slate-800 dark:text-slate-200 pointer-events-none" viewBox="0 0 32 32" fill="currentColor">
                      <path d="M 2 11 C 12 11, 22 7, 30 16 C 22 25, 12 21, 2 21 Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Vertical Tree Timeline */}
            <div className="block md:hidden relative pl-8 pr-2 space-y-8">
              {/* Vertical Trunk Line */}
              <div className="absolute left-3.5 top-3 bottom-3 w-2 bg-slate-800 dark:bg-slate-200 rounded-full z-0" />

              {timelineCampaigns.map((campaign, idx) => {
                const theme = COLOR_THEMES[idx % COLOR_THEMES.length];

                return (
                  <div key={campaign.id} className="relative flex items-start gap-4">
                    {/* Node Circle on Vertical Trunk */}
                    <div className={`absolute -left-8 top-3 w-9 h-9 rounded-full ${theme.nodeBg} flex items-center justify-center font-extrabold text-xs shadow-md ring-4 ring-white dark:ring-slate-950 z-20`}>
                      {idx + 1}
                    </div>

                    {/* Leaf accent beside vertical node */}
                    <svg className="absolute -left-12 top-2.5 w-6 h-6 pointer-events-none z-10" viewBox="0 0 30 30">
                      <path d="M 15 15 C 5 5, 2 12, 0 15 C 8 22, 12 18, 15 15 Z" fill={theme.leafColor} opacity="0.85" />
                    </svg>

                    {/* Card on Right Side */}
                    <div className="w-full">
                      {renderTimelineCard(campaign, theme)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 3. SECTION: Hoạt động thường xuyên */}
      <section className="space-y-8">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Hoạt động thường xuyên
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Các hoạt động được duy trì định kỳ trong suốt năm học.
          </p>
        </div>

        {/* Loading Skeleton for Regular Activities */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60"
              />
            ))}
          </div>
        )}

        {/* Empty State for Regular Activities */}
        {!loading && !error && regularCampaigns.length === 0 && (
          <div className="max-w-xl mx-auto border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-10 text-center bg-white/50 dark:bg-slate-900/50 space-y-2">
            <Flag className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
            <p className="font-display text-sm font-bold text-slate-700 dark:text-slate-300">
              Các hoạt động thường xuyên đang được cập nhật.
            </p>
          </div>
        )}

        {/* Regular Activities Grid */}
        {!loading && !error && regularCampaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularCampaigns.map((campaign) => (
              <motion.article
                key={campaign.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="group cursor-pointer flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg hover:border-red-500/30 transition-all duration-300 relative"
              >
                <Link to={`/hoat-dong/${campaign.slug}`} className="flex flex-col h-full justify-between">
                  <div>
                    {/* Cover Image Container */}
                    <div className="aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                      {campaign.cover_image_url ? (
                        <img
                          src={campaign.cover_image_url}
                          alt={campaign.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/10 to-blue-500/10">
                          <Flag className="w-12 h-12 text-red-500/40" />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-sm ${getTypeBadgeClass(campaign.campaign_type)}`}>
                          {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-sm ${getStatusBadgeClass(campaign.status)}`}>
                          {CAMPAIGN_STATUS_LABELS[campaign.status]}
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3.5 w-3.5 text-red-500" />
                          <span>
                            {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('vi-VN') : '---'}
                          </span>
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Năm học {campaign.academic_year}
                        </span>
                      </div>

                      <h3 className="font-display font-bold text-base text-slate-900 group-hover:text-red-600 dark:text-white dark:group-hover:text-red-400 leading-tight line-clamp-2 transition-colors">
                        {campaign.title}
                      </h3>

                      {campaign.summary && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans">
                          {campaign.summary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        {campaign.events?.length || 0} hoạt động
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {campaign.evidence?.length || 0} minh chứng
                      </span>
                    </div>

                    <span className="inline-flex items-center space-x-1 text-red-600 dark:text-red-400 font-bold group-hover:underline">
                      <span>Chi tiết</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
