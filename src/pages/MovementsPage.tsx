/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Flag,
  Search,
  Calendar,
  Sparkles,
  AlertCircle,
  ArrowRight,
  FileCheck,
  Layers
} from 'lucide-react';
import { movementService } from '../services/movementService';
import {
  MovementCampaign,
  CampaignType,
  CampaignStatus,
  CAMPAIGN_TYPE_LABELS,
  CAMPAIGN_STATUS_LABELS
} from '../types/movement';

export default function MovementsPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<MovementCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<CampaignType | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<'all' | 'thuong_xuyen' | 'dang_dien_ra' | 'sap_dien_ra' | 'da_ket_thuc'>('all');

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

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchSummary = c.summary?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchSummary) return false;
      }

      // Type filter
      if (selectedType !== 'all' && c.campaign_type !== selectedType) {
        return false;
      }

      // Group filter
      if (selectedGroup === 'thuong_xuyen' && c.campaign_type !== 'thuong_xuyen') {
        return false;
      }
      if (selectedGroup === 'dang_dien_ra' && c.status !== 'dang_dien_ra') {
        return false;
      }
      if (selectedGroup === 'sap_dien_ra' && c.status !== 'sap_dien_ra') {
        return false;
      }
      if (selectedGroup === 'da_ket_thuc' && c.status !== 'da_ket_thuc') {
        return false;
      }

      return true;
    });
  }, [campaigns, searchQuery, selectedType, selectedGroup]);

  // Grouped datasets
  const regularCampaigns = useMemo(() => {
    return campaigns.filter(c => c.campaign_type === 'thuong_xuyen');
  }, [campaigns]);

  const ongoingCampaigns = useMemo(() => {
    return campaigns.filter(c => c.status === 'dang_dien_ra' && c.campaign_type !== 'thuong_xuyen');
  }, [campaigns]);

  const upcomingCampaigns = useMemo(() => {
    return campaigns.filter(c => c.status === 'sap_dien_ra');
  }, [campaigns]);

  const completedCampaigns = useMemo(() => {
    return campaigns.filter(c => c.status === 'da_ket_thuc');
  }, [campaigns]);

  // Calculate campaign progress percentage
  const getProgressPercentage = (startDate?: string | null, endDate?: string | null) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();

    if (now < start) return 0;
    if (now > end) return 100;

    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  const getStatusBadgeClass = (status: CampaignStatus) => {
    switch (status) {
      case 'dang_dien_ra':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'sap_dien_ra':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'da_ket_thuc':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  const getTypeBadgeClass = (type: CampaignType) => {
    switch (type) {
      case 'thuong_xuyen':
        return 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'cao_diem':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'cuoc_thi':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/60 pb-16">
      {/* Hero Header Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-blue-800 text-white py-10 md:py-14 px-4 sm:px-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl space-y-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Phong trào & Hoạt động
          </h1>
          <p className="text-red-100 text-sm sm:text-base leading-relaxed">
            Nơi quản lý, theo dõi các chương trình thi đua, đợt vận động và hoạt động trọng tâm trong năm học của Liên đội THCS Tôn Thất Tùng.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 space-y-8">
        
        {/* Search & Filter Toolbar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tên phong trào, từ khóa..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedGroup('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedGroup === 'all'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Tất cả ({campaigns.length})
              </button>
              <button
                onClick={() => setSelectedGroup('thuong_xuyen')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedGroup === 'thuong_xuyen'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Thường xuyên ({regularCampaigns.length})
              </button>
              <button
                onClick={() => setSelectedGroup('dang_dien_ra')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedGroup === 'dang_dien_ra'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Đang diễn ra ({ongoingCampaigns.length})
              </button>
              <button
                onClick={() => setSelectedGroup('sap_dien_ra')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedGroup === 'sap_dien_ra'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Sắp diễn ra ({upcomingCampaigns.length})
              </button>
              <button
                onClick={() => setSelectedGroup('da_ket_thuc')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedGroup === 'da_ket_thuc'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                Đã kết thúc ({completedCampaigns.length})
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải danh sách phong trào...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Không thể tải dữ liệu hoạt động phong trào.</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && campaigns.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 space-y-3">
            <Flag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Các hoạt động phong trào đang được cập nhật.
            </h3>
          </div>
        )}

        {/* Empty Search Filter State */}
        {!loading && !error && campaigns.length > 0 && filteredCampaigns.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 space-y-3">
            <Flag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Không tìm thấy phong trào phù hợp</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.
            </p>
          </div>
        )}

        {/* Campaign List Grid */}
        {!loading && !error && filteredCampaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => {
              const progress = getProgressPercentage(campaign.start_date, campaign.end_date);

              return (
                <motion.article
                  key={campaign.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="group cursor-pointer flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-200"
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

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border backdrop-blur-md shadow-sm ${getTypeBadgeClass(campaign.campaign_type)}`}>
                            {CAMPAIGN_TYPE_LABELS[campaign.campaign_type]}
                          </span>
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border backdrop-blur-md shadow-sm ${getStatusBadgeClass(campaign.status)}`}>
                            {CAMPAIGN_STATUS_LABELS[campaign.status]}
                          </span>
                        </div>

                        {campaign.is_featured && (
                          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-slate-900 text-[10px] font-extrabold uppercase shadow-sm">
                            <Sparkles className="w-3 h-3" />
                            Trọng tâm
                          </div>
                        )}
                      </div>

                      {/* Body Content */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3.5 w-3.5 text-red-500" />
                            <span>
                              {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('vi-VN') : '---'}
                              {campaign.end_date ? ` - ${new Date(campaign.end_date).toLocaleDateString('vi-VN')}` : ''}
                            </span>
                          </span>
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">
                            Năm học {campaign.academic_year}
                          </span>
                        </div>

                        <h3 className="font-display font-bold text-base text-slate-950 group-hover:text-red-600 dark:text-slate-100 dark:group-hover:text-red-400 leading-tight line-clamp-2 transition-colors">
                          {campaign.title}
                        </h3>

                        {campaign.summary && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-sans">
                            {campaign.summary}
                          </p>
                        )}

                        {/* Time Progress Bar */}
                        {progress !== null && campaign.status === 'dang_dien_ra' && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                              <span>Tiến độ thời gian</span>
                              <span className="text-red-600 dark:text-red-400 font-bold">{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 pb-5 pt-3 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold">
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
