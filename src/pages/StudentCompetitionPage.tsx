/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Award,
  Gift,
  Star,
  Users,
  Clock,
  ShieldAlert,
  HeartHandshake,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  ShoppingBag,
  Package,
  TrendingUp,
  AlertCircle,
  X,
  FileText,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { competitionService } from '../services/competitionService';
import {
  StudentCompetitionProfile,
  RewardItem,
  RewardRedemption,
  CompetitionReviewRequest,
  REDEMPTION_STATUS_LABELS,
  REVIEW_REQUEST_STATUS_LABELS,
  LedgerType,
} from '../types/competition';
import { useAuth } from '../features/auth/AuthContext';
import { ROUTES } from '../config/routes';
import LoadingState from '../components/common/LoadingState';
import EmptyState from '../components/common/EmptyState';

type StudentTab = 'overview' | 'ledger' | 'shop' | 'redemptions' | 'reviews';

export default function StudentCompetitionPage() {
  const { user, isAuthenticated, loading: authLoading, profileLoading, hasRole, role, roles } = useAuth();

  const isUserAuthenticated = Boolean(user && isAuthenticated);
  const isStudentRole = Boolean(
    isUserAuthenticated &&
    (hasRole('STUDENT') || role === 'STUDENT' || (Array.isArray(roles) && roles.includes('STUDENT')))
  );

  const [activeTab, setActiveTab] = useState<StudentTab>('overview');
  const [profile, setProfile] = useState<StudentCompetitionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sub-data states
  const [transactions, setTransactions] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [goodDeeds, setGoodDeeds] = useState<any[]>([]);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<RewardRedemption[]>([]);
  const [myReviews, setMyReviews] = useState<CompetitionReviewRequest[]>([]);

  // Filter state for ledger
  const [ledgerFilter, setLedgerFilter] = useState<string>('ALL');

  // Modal states
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [redeemQty, setRedeemQty] = useState<number>(1);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewIncidentId, setReviewIncidentId] = useState<string | null>(null);
  const [reviewTxId, setReviewTxId] = useState<string | null>(null);
  const [reviewTargetTitle, setReviewTargetTitle] = useState<string>('');
  const [reviewReason, setReviewReason] = useState<string>('');
  const [reviewEvidenceUrl, setReviewEvidenceUrl] = useState<string>('');

  const [searchParams] = useSearchParams();
  const paramStudentId = searchParams.get('studentId') || searchParams.get('id') || undefined;

  const [submitting, setSubmitting] = useState(false);

  const loadData = async (targetStudentId?: string) => {
    if (!isUserAuthenticated && !targetStudentId) return;
    try {
      setLoading(true);
      setError(null);

      const [profData, txsData, incsData, deedsData, rewardsData, redemptionsData, reviewsData] =
        await Promise.all([
          competitionService.getStudentCompetitionProfile(targetStudentId),
          competitionService.getStudentPointTransactions(targetStudentId),
          competitionService.getStudentIncidents(targetStudentId),
          competitionService.getGoodDeeds(10),
          competitionService.getRewardItems(true),
          competitionService.getRewardRedemptions(targetStudentId),
          competitionService.getReviewRequests(targetStudentId),
        ]);

      setProfile(profData);
      setTransactions(txsData || []);
      setIncidents(incsData || []);
      setGoodDeeds(deedsData || []);
      setRewardItems(rewardsData || []);
      setMyRedemptions(redemptionsData || []);
      setMyReviews(reviewsData || []);
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu thi đua đội viên:', err);
      setError('Không thể tải dữ liệu lúc này. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (paramStudentId) {
        loadData(paramStudentId);
      } else if (isUserAuthenticated && isStudentRole) {
        loadData();
      } else {
        setLoading(false);
      }
    }
  }, [authLoading, profileLoading, isUserAuthenticated, isStudentRole, paramStudentId]);

  const handleOpenRedeemModal = (item: RewardItem) => {
    setSelectedReward(item);
    setRedeemQty(1);
    setShowRedeemModal(true);
  };

  const handleConfirmRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReward) return;

    try {
      setSubmitting(true);
      await competitionService.requestRewardRedemption(selectedReward.id, redeemQty);
      alert('Gửi yêu cầu đổi quà thành công! Đội viên có thể theo dõi trong danh mục "Lịch sử đổi quà".');
      setShowRedeemModal(false);
      setSelectedReward(null);
      await loadData();
    } catch (err: any) {
      console.error('Lỗi đổi quà:', err);
      alert('Không thể thực hiện đổi quà lúc này. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRedemption = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu đổi quà này không?')) return;
    try {
      setSubmitting(true);
      await competitionService.cancelRewardRedemption(id, 'Học sinh tự hủy yêu cầu');
      await loadData();
    } catch (err: any) {
      console.error('Lỗi hủy yêu cầu:', err);
      alert('Không thể hủy yêu cầu lúc này. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReviewModal = (title: string, incidentId?: string, txId?: string) => {
    setReviewTargetTitle(title);
    setReviewIncidentId(incidentId || null);
    setReviewTxId(txId || null);
    setReviewReason('');
    setReviewEvidenceUrl('');
    setShowReviewModal(true);
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewReason.trim()) {
      alert('Vui lòng điền lý do đề nghị xem lại.');
      return;
    }

    try {
      setSubmitting(true);
      await competitionService.submitReviewRequest({
        incident_id: reviewIncidentId || undefined,
        transaction_id: reviewTxId || undefined,
        reason: reviewReason,
        evidence_url: reviewEvidenceUrl || undefined,
      });
      alert('Đã gửi đề nghị xem lại thành công! Ban chỉ huy / Phụ trách Đội sẽ phản hồi sớm.');
      setShowReviewModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Lỗi gửi đề nghị xem lại:', err);
      alert('Không thể gửi đề nghị xem lại lúc này. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (ledgerFilter === 'ALL') return true;
    return t.ledger_type === ledgerFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12 pt-4 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 sm:space-y-5">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 text-center">
          <Link to={ROUTES.COMPETITION} className="hover:text-red-600 transition-colors flex items-center gap-1">
            <span>← Tổng quan Thi đua</span>
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-800 dark:text-white">Thi đua đội viên</span>
        </div>

        {/* Auth Loading State */}
        {(authLoading || (!isUserAuthenticated && profileLoading)) ? (
          <LoadingState message="Đang kiểm tra thông tin tài khoản..." />
        ) : !isUserAuthenticated ? (
          /* Unauthenticated State */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto shadow-xs my-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 mx-auto flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Đăng nhập để xem hồ sơ thi đua
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Hồ sơ thi đua, điểm thưởng và lịch sử hoạt động chỉ dành cho đội viên đã đăng nhập.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        ) : !isStudentRole ? (
          /* Authenticated Non-Student State */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3 max-w-lg mx-auto shadow-xs my-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Tài khoản này không có hồ sơ đội viên.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Hồ sơ thi đua cá nhân chỉ dành cho tài khoản Học sinh / Đội viên.
              </p>
            </div>
          </div>
        ) : (
          /* Authenticated Student Dashboard */
          <>
            {/* Top Header Card - Compact Height */}
            <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-700 rounded-2xl text-white p-4 sm:p-5 sm:px-6 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name}
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <Award className="w-7 h-7 text-amber-200" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-300 text-red-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Hồ sơ đội viên
                      </span>
                      {profile?.unit_info?.has_unit && (
                        <span className="bg-white/20 text-white font-semibold text-[11px] px-2 py-0.5 rounded-full backdrop-blur-xs">
                          {profile.unit_info.class_name}
                        </span>
                      )}
                    </div>

                    <h1 className="text-xl sm:text-2xl font-extrabold font-display mt-0.5">
                      {profile?.full_name || 'Đội viên'}
                    </h1>

                    <p className="text-xs text-amber-100/90 mt-0.5 flex items-center gap-2">
                      <span>Mã ĐV: {profile?.student_code || 'Chưa cập nhật'}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadData}
                  className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl transition backdrop-blur-md border border-white/30 flex items-center gap-1.5 self-start md:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Cập nhật dữ liệu
                </button>
              </div>

              {/* 3 Mandated Separated Values Bar - Compact 1-line view on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20">
                {/* Value A: STUDENT_MERIT */}
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-amber-100 block">
                      A. Điểm thi đua tích lũy
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-display mt-0.5 block">
                      {profile?.accumulated_merit_points ?? 0} <span className="text-xs font-normal">điểm</span>
                    </span>
                    <span className="text-[10px] text-amber-200/80 block mt-0.5">
                      Đánh giá rèn luyện & xếp loại thi đua
                    </span>
                  </div>
                  <div className="p-2.5 bg-amber-400/20 rounded-lg text-amber-300 shrink-0">
                    <Star className="w-5 h-5" />
                  </div>
                </div>

                {/* Value B: STUDENT_REWARD */}
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-amber-100 block">
                      B. Điểm thưởng
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-display text-amber-200 mt-0.5 block">
                      {profile?.available_reward_points ?? 0} <span className="text-xs font-normal">điểm</span>
                    </span>
                    <span className="text-[10px] text-amber-200/80 block mt-0.5">
                      Điểm thưởng các hoạt động
                    </span>
                  </div>
                  <div className="p-2.5 bg-amber-400/20 rounded-lg text-amber-300 shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                </div>

                {/* Value C: UNIT_COMPETITION Contribution */}
                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/20 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-amber-100 block">
                      C. Cống hiến cho chi đội
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-display text-emerald-200 mt-0.5 block">
                      {profile?.unit_contribution_points ?? 0} <span className="text-xs font-normal">điểm</span>
                    </span>
                    <span className="text-[10px] text-amber-200/80 block mt-0.5">
                      Đóng góp cho phong trào tập thể lớp
                    </span>
                  </div>
                  <div className="p-2.5 bg-emerald-400/20 rounded-lg text-emerald-300 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}


        {/* Navigation Tabs Bar - Compact Height */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 overflow-x-auto pb-1.5 scrollbar-none flex-nowrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/20'
                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Tổng quan hồ sơ</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'ledger'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/20'
                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Sổ điểm & nhật ký</span>
          </button>

          <button
            onClick={() => setActiveTab('shop')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'shop'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/20'
                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Cửa hàng phần thưởng</span>
          </button>

          <button
            onClick={() => setActiveTab('redemptions')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'redemptions'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/20'
                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Lịch sử đổi quà ({myRedemptions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/20'
                : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Đề nghị xem lại ({myReviews.length})</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stat Counter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Người tốt - Việc tốt</span>
                  <span className="text-2xl font-extrabold text-emerald-700 block mt-1">
                    {profile?.good_deeds_count ?? 0} <span className="text-xs font-normal text-slate-500">lần</span>
                  </span>
                  <span className="text-[11px] text-emerald-600 mt-1 block font-medium">Tuyên dương cấp Liên đội</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-200">
                  <HeartHandshake className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Thành tích & Phong trào</span>
                  <span className="text-2xl font-extrabold text-amber-700 block mt-1">
                    {profile?.achievements_count ?? 0} <span className="text-xs font-normal text-slate-500">hoạt động</span>
                  </span>
                  <span className="text-[11px] text-amber-600 mt-1 block font-medium">Học tập & phong trào Đội</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 border border-amber-200">
                  <Star className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Lưu ý nề nếp / Nhắc nhở</span>
                  <span className="text-2xl font-extrabold text-slate-800 block mt-1">
                    {profile?.violations_count ?? 0} <span className="text-xs font-normal text-slate-500">lần</span>
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Rèn luyện nâng cao nề nếp</span>
                </div>
                <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 border border-slate-200">
                  <ShieldAlert className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Public Good Deeds Showcase Section */}
            <div className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-emerald-600" />
                  Bảng Vinh Danh "Người Tốt - Việc Tốt"
                </h3>
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Gương sáng Đội viên
                </span>
              </div>

              {goodDeeds.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">Chưa có gương việc tốt nào được ghi nhận.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goodDeeds.map((deed) => (
                    <div
                      key={deed.id}
                      className="p-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 rounded-2xl border border-emerald-100/80 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-slate-900 text-sm">{deed.student_name}</div>
                          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            +{deed.merit_points} đ
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">Chi đội: {deed.unit_name}</div>
                        <h4 className="font-bold text-emerald-950 text-sm mt-2">{deed.title}</h4>
                        {deed.description && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{deed.description}</p>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1 border-t border-emerald-100/60 pt-2">
                        <Clock className="w-3 h-3" />
                        {new Date(deed.occurred_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LEDGER & INCIDENTS */}
        {activeTab === 'ledger' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  Nhật Ký Sự Việc & Giao Dịch Sổ Điểm
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Minh bạch toàn bộ điểm thi đua, điểm thưởng và điểm cống hiến tập thể.
                </p>
              </div>

              {/* Filter Ledger */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={ledgerFilter}
                  onChange={(e) => setLedgerFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Tất cả sổ điểm</option>
                  <option value="STUDENT_MERIT">A. Điểm Thi đua</option>
                  <option value="STUDENT_REWARD">B. Điểm Thưởng</option>
                  <option value="UNIT_COMPETITION">C. Cống hiến Chi đội</option>
                </select>
              </div>
            </div>

            {/* Transactions List */}
            {filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">Chưa có giao dịch điểm nào.</div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-200 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            tx.ledger_type === 'STUDENT_MERIT'
                              ? 'bg-amber-100 text-amber-800'
                              : tx.ledger_type === 'STUDENT_REWARD'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {tx.ledger_type === 'STUDENT_MERIT'
                            ? 'Thi đua'
                            : tx.ledger_type === 'STUDENT_REWARD'
                            ? 'Đổi quà'
                            : 'Cống hiến lớp'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date(tx.effective_at).toLocaleString('vi-VN')}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">{tx.incident_title || 'Giao dịch điểm'}</h4>
                      {tx.rule_name && <p className="text-xs text-slate-500">Quy tắc: {tx.rule_name}</p>}
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <span
                        className={`text-base font-extrabold px-3 py-1 rounded-xl border ${
                          tx.points >= 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {tx.points >= 0 ? `+${tx.points}` : tx.points} điểm
                      </span>

                      <button
                        onClick={() => handleOpenReviewModal(tx.incident_title || 'Giao dịch điểm', tx.incident_id, tx.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-1 shrink-0"
                      >
                        <HelpCircle className="w-3.5 h-3.5" /> Xem lại
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: REWARD SHOP */}
        {activeTab === 'shop' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-600" />
                  Cửa Hàng Phần Thưởng Đội Viên
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đội viên dùng Điểm thưởng để đổi quà tặng học tập & huy hiệu.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Số điểm khả dụng</span>
                <span className="text-xl font-extrabold text-amber-700">
                  {profile?.available_reward_points ?? 0} đ
                </span>
              </div>
            </div>

            {rewardItems.length === 0 ? (
              <div className="py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                Hiện tại chưa có quà tặng nào trong cửa hàng.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {rewardItems.map((item) => {
                  const itemPts = item.points_required ?? 0;
                  const itemQty = item.quantity ?? 0;
                  const canAfford = (profile?.available_reward_points ?? 0) >= itemPts;
                  const hasStock = itemQty > 0;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
                    >
                      <div>
                        <div className="relative h-44 bg-gradient-to-br from-amber-50 to-orange-50 border-b border-slate-100 flex items-center justify-center overflow-hidden">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Gift className="w-12 h-12 text-amber-400" />
                          )}

                          <span className="absolute top-3 right-3 bg-amber-500 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs">
                            {itemPts} điểm
                          </span>
                        </div>

                        <div className="p-5 space-y-2">
                          <h4 className="font-bold text-slate-900 text-base">{item.name}</h4>
                          {item.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                          )}

                          <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-between border-t border-slate-100">
                            <span>Còn {itemQty} quà</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenRedeemModal(item)}
                          disabled={!canAfford || !hasStock}
                          className={`w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs ${
                            canAfford && hasStock
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <Gift className="w-4 h-4" />
                          {!hasStock ? 'Hết quà' : !canAfford ? 'Chưa đủ điểm' : 'Đổi quà ngay'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MY REDEMPTIONS */}
        {activeTab === 'redemptions' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package className="w-5 h-5 text-amber-600" />
              Lịch Sử Đổi Quà Của Tôi
            </h3>

            {myRedemptions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">Bạn chưa đổi phần thưởng nào.</div>
            ) : (
              <div className="space-y-3">
                {myRedemptions.map((red) => (
                  <div
                    key={red.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {red.reward_image_url ? (
                        <img
                          src={red.reward_image_url}
                          alt={red.reward_name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                          <Gift className="w-6 h-6" />
                        </div>
                      )}

                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{red.reward_name || 'Phần thưởng'}</h4>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Số lượng: x{red.quantity} • Tổng: <span className="font-bold text-amber-700">{red.total_points} đ</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Gửi ngày {new Date(red.requested_at).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                          red.status === 'PENDING'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80'
                            : red.status === 'APPROVED'
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/80'
                            : red.status === 'ISSUED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80'
                        }`}
                      >
                        {REDEMPTION_STATUS_LABELS[red.status] || red.status}
                      </span>

                      {red.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelRedemption(red.id)}
                          className="px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition"
                        >
                          Hủy yêu cầu
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MY REVIEW REQUESTS */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <HelpCircle className="w-5 h-5 text-amber-600" />
              Lịch Sử Đề Nghị Xem Lại Của Tôi
            </h3>

            {myReviews.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">Bạn chưa gửi đề nghị xem lại nào.</div>
            ) : (
              <div className="space-y-3">
                {myReviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(rev.submitted_at).toLocaleString('vi-VN')}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                          rev.status === 'PENDING'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80'
                            : rev.status === 'ACCEPTED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80'
                        }`}
                      >
                        {REVIEW_REQUEST_STATUS_LABELS[rev.status] || rev.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 font-medium">Lý do: "{rev.reason}"</p>

                    {rev.resolution_note && (
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 italic">
                        Phản hồi từ Liên đội: "{rev.resolution_note}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Modal Confirm Redeem */}
      {showRedeemModal && selectedReward && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-600" />
                Xác Nhận Đổi Phần Thưởng
              </h3>
              <button
                onClick={() => setShowRedeemModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmRedeem} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <Gift className="w-10 h-10 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedReward.name}</h4>
                  <p className="text-xs text-amber-800 font-semibold mt-0.5">
                    Giá: {selectedReward.points_required} điểm / quà
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng quà muốn đổi</label>
                <input
                  type="number"
                  min={1}
                  max={selectedReward.quantity || 10}
                  value={redeemQty}
                  onChange={(e) => setRedeemQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div>
                  Tổng điểm thưởng trừ:{' '}
                  <span className="font-extrabold text-amber-800">
                    {selectedReward.points_required * redeemQty} điểm
                  </span>
                </div>
                <div>
                  Số điểm còn lại sau đổi:{' '}
                  <span className="font-bold">
                    {(profile?.available_reward_points ?? 0) - selectedReward.points_required * redeemQty} điểm
                  </span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRedeemModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Gửi yêu cầu đổi quà
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Submit Review */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-600" />
                Đề Nghị Xem Lại Điểm
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReview} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-semibold">
                Nội dung: {reviewTargetTitle}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do / Giải trình đề nghị xem lại <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Vui lòng nêu rõ lý do bạn cho rằng điểm chưa chính xác..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Link minh chứng bổ sung (nếu có)</label>
                <input
                  type="url"
                  value={reviewEvidenceUrl}
                  onChange={(e) => setReviewEvidenceUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                  placeholder="https://..."
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Gửi đề nghị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  </div>
);
}
