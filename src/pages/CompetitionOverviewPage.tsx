/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  User, 
  Trophy, 
  Award, 
  Medal,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Clock,
  Lock,
  Gift,
  AlertCircle,
  Calendar,
  HeartHandshake
} from 'lucide-react';
import { competitionService } from '../services/competitionService';
import { ROUTES } from '../config/routes';
import { supabase } from '../lib/supabase/client';
import CompetitionQuickActions from '../components/competition/CompetitionQuickActions';

interface GradeTopClasses {
  grade: string;
  gradeLabel: string;
  classes: {
    unit_name: string;
    final_points: number;
    rank: number;
  }[];
}

interface GradeTheme {
  topBarClass: string;
  cardBorderClass: string;
  cardBgClass: string;
  cardShadowClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
  badgeBorderClass: string;
  headerTextClass: string;
  footerTextClass: string;
  footerHoverTextClass: string;
  watermarkColorClass: string;
  top1RowClass: string;
  top1BadgeClass: string;
}

const GRADE_THEMES: Record<string, GradeTheme> = {
  '6': {
    // Khối 6: Xanh dương (Blue)
    topBarClass: 'bg-blue-500 dark:bg-blue-400',
    cardBorderClass: 'border-blue-200 dark:border-blue-800/80 hover:border-blue-400 dark:hover:border-blue-500',
    cardBgClass: 'bg-gradient-to-b from-blue-50/70 via-white to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900',
    cardShadowClass: 'shadow-xs hover:shadow-xl hover:shadow-blue-500/10',
    badgeBgClass: 'bg-blue-500 dark:bg-blue-600',
    badgeTextClass: 'text-white',
    badgeBorderClass: 'ring-1 ring-blue-500/20 dark:ring-blue-400/20',
    headerTextClass: 'text-blue-700 dark:text-blue-300',
    footerTextClass: 'text-blue-600 dark:text-blue-400',
    footerHoverTextClass: 'group-hover:text-blue-700 dark:group-hover:text-blue-300',
    watermarkColorClass: 'text-blue-500/10 dark:text-blue-400/10',
    top1RowClass: 'bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40',
    top1BadgeClass: 'bg-blue-500 text-white',
  },
  '7': {
    // Khối 7: Tím (Purple)
    topBarClass: 'bg-purple-500 dark:bg-purple-400',
    cardBorderClass: 'border-purple-200 dark:border-purple-800/80 hover:border-purple-400 dark:hover:border-purple-500',
    cardBgClass: 'bg-gradient-to-b from-purple-50/70 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900',
    cardShadowClass: 'shadow-xs hover:shadow-xl hover:shadow-purple-500/10',
    badgeBgClass: 'bg-purple-500 dark:bg-purple-600',
    badgeTextClass: 'text-white',
    badgeBorderClass: 'ring-1 ring-purple-500/20 dark:ring-purple-400/20',
    headerTextClass: 'text-purple-700 dark:text-purple-300',
    footerTextClass: 'text-purple-600 dark:text-purple-400',
    footerHoverTextClass: 'group-hover:text-purple-700 dark:group-hover:text-purple-300',
    watermarkColorClass: 'text-purple-500/10 dark:text-purple-400/10',
    top1RowClass: 'bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40',
    top1BadgeClass: 'bg-purple-500 text-white',
  },
  '8': {
    // Khối 8: Xanh ngọc (Teal)
    topBarClass: 'bg-teal-500 dark:bg-teal-400',
    cardBorderClass: 'border-teal-200 dark:border-teal-800/80 hover:border-teal-400 dark:hover:border-teal-500',
    cardBgClass: 'bg-gradient-to-b from-teal-50/70 via-white to-white dark:from-teal-950/20 dark:via-slate-900 dark:to-slate-900',
    cardShadowClass: 'shadow-xs hover:shadow-xl hover:shadow-teal-500/10',
    badgeBgClass: 'bg-teal-500 dark:bg-teal-600',
    badgeTextClass: 'text-white',
    badgeBorderClass: 'ring-1 ring-teal-500/20 dark:ring-teal-400/20',
    headerTextClass: 'text-teal-700 dark:text-teal-300',
    footerTextClass: 'text-teal-600 dark:text-teal-400',
    footerHoverTextClass: 'group-hover:text-teal-700 dark:group-hover:text-teal-300',
    watermarkColorClass: 'text-teal-500/10 dark:text-teal-400/10',
    top1RowClass: 'bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40',
    top1BadgeClass: 'bg-teal-500 text-white',
  },
  '9': {
    // Khối 9: Đỏ san hô (Rose / Coral)
    topBarClass: 'bg-rose-500 dark:bg-rose-400',
    cardBorderClass: 'border-rose-200 dark:border-rose-800/80 hover:border-rose-400 dark:hover:border-rose-500',
    cardBgClass: 'bg-gradient-to-b from-rose-50/70 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900',
    cardShadowClass: 'shadow-xs hover:shadow-xl hover:shadow-rose-500/10',
    badgeBgClass: 'bg-rose-500 dark:bg-rose-600',
    badgeTextClass: 'text-white',
    badgeBorderClass: 'ring-1 ring-rose-500/20 dark:ring-rose-400/20',
    headerTextClass: 'text-rose-700 dark:text-rose-300',
    footerTextClass: 'text-rose-600 dark:text-rose-400',
    footerHoverTextClass: 'group-hover:text-rose-700 dark:group-hover:text-rose-300',
    watermarkColorClass: 'text-rose-500/10 dark:text-rose-400/10',
    top1RowClass: 'bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40',
    top1BadgeClass: 'bg-rose-500 text-white',
  },
};

const LaurelWreathWatermark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M50,85 C38,82 28,75 22,65 C18,58 16,50 16,40 C16,35 18,28 22,22 C20,26 19,32 19,38 C19,48 22,56 28,62 C34,68 42,72 50,75 C58,72 66,68 72,62 C78,56 81,48 81,38 C81,32 80,26 78,22 C82,28 84,35 84,40 C84,50 82,58 78,65 C72,75 62,82 50,85 Z" />
    <path d="M30,30 C25,25 20,28 15,22 C18,30 25,32 30,30 Z M25,45 C18,42 15,46 10,42 C15,48 20,49 25,45 Z M26,60 C20,60 17,66 12,65 C18,70 23,68 26,60 Z M70,30 C75,25 80,28 85,22 C82,30 75,32 70,30 Z M75,45 C82,42 85,46 90,42 C85,48 80,49 75,45 Z M74,60 C80,60 83,66 88,65 C82,70 77,68 74,60 Z" />
  </svg>
);

interface TopStudent {
  id: string;
  full_name: string;
  unit_name: string;
  available_reward_points: number;
}

export default function CompetitionOverviewPage() {
  const navigate = useNavigate();

  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [latestWeekInfo, setLatestWeekInfo] = useState<any>(null);
  const [gradeData, setGradeData] = useState<GradeTopClasses[]>([
    { grade: '6', gradeLabel: 'Khối 6', classes: [] },
    { grade: '7', gradeLabel: 'Khối 7', classes: [] },
    { grade: '8', gradeLabel: 'Khối 8', classes: [] },
    { grade: '9', gradeLabel: 'Khối 9', classes: [] },
  ]);

  const [topStudents, setTopStudents] = useState<TopStudent[]>([]);
  const [goodDeeds, setGoodDeeds] = useState<any[]>([]);
  const [loadingGoodDeeds, setLoadingGoodDeeds] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [privacyToast, setPrivacyToast] = useState<string | null>(null);

  useEffect(() => {
    checkCurrentUser();
    loadOverviewData();
  }, []);

  async function checkCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch {
      setCurrentUserId(null);
    }
  }

  async function loadOverviewData() {
    // 1. Fetch latest published week & unit competition leaderboard
    try {
      setLoadingUnits(true);
      const weeks = await competitionService.getPublicPublishedWeeks();
      if (weeks && weeks.length > 0) {
        const latestWeek = weeks[0];
        const leaderboardData = await competitionService.getPublicWeekLeaderboard(latestWeek.id);
        if (leaderboardData) {
          setLatestWeekInfo(leaderboardData.week);

          // Group by grade
          const gradeMap: Record<string, any[]> = { '6': [], '7': [], '8': [], '9': [] };

          (leaderboardData.leaderboard || []).forEach((item: any) => {
            let assignedGrade: string | null = null;

            if (item.grade_name) {
              if (item.grade_name.includes('6')) assignedGrade = '6';
              else if (item.grade_name.includes('7')) assignedGrade = '7';
              else if (item.grade_name.includes('8')) assignedGrade = '8';
              else if (item.grade_name.includes('9')) assignedGrade = '9';
            }

            if (!assignedGrade) {
              const cleanName = String(item.unit_name || '').trim();
              const match = cleanName.match(/^(?:Khối\s*)?([6789])/i);
              if (match) assignedGrade = match[1];
            }

            if (assignedGrade && gradeMap[assignedGrade]) {
              gradeMap[assignedGrade].push(item);
            }
          });

          const updatedGrades: GradeTopClasses[] = ['6', '7', '8', '9'].map(g => {
            const list = gradeMap[g] || [];
            // Sort by final_points desc
            list.sort((a, b) => (b.final_points ?? 0) - (a.final_points ?? 0));
            const top3 = list.slice(0, 3).map((item, idx) => ({
              unit_name: item.unit_name,
              final_points: item.final_points ?? 0,
              rank: idx + 1,
            }));

            return {
              grade: g,
              gradeLabel: `Khối ${g}`,
              classes: top3,
            };
          });

          setGradeData(updatedGrades);
        }
      }
    } catch (err) {
      console.error('Error loading unit competition overview:', err);
    } finally {
      setLoadingUnits(false);
    }

    // 2. Fetch top 5 student rewards
    try {
      setLoadingStudents(true);
      const students = await competitionService.getTopStudentRewards(5);
      setTopStudents(students || []);
    } catch (err) {
      console.error('Error loading top student rewards:', err);
    } finally {
      setLoadingStudents(false);
    }

    // 3. Fetch public good deeds (max 6 records)
    try {
      setLoadingGoodDeeds(true);
      const deeds = await competitionService.getPublicGoodDeeds(6);
      setGoodDeeds(deeds || []);
    } catch (err) {
      console.error('Error loading public good deeds:', err);
      setGoodDeeds([]);
    } finally {
      setLoadingGoodDeeds(false);
    }
  }

  const handleStudentClick = (student: TopStudent) => {
    if (!currentUserId) {
      setPrivacyToast('Đăng nhập bằng tài khoản phù hợp để xem hồ sơ thi đua cá nhân.');
      setTimeout(() => setPrivacyToast(null), 4000);
      return;
    }

    if (currentUserId === student.id) {
      navigate(ROUTES.COMPETITION_STUDENT);
    } else {
      setPrivacyToast('Đăng nhập bằng tài khoản phù hợp để xem hồ sơ thi đua cá nhân.');
      setTimeout(() => setPrivacyToast(null), 4000);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10 font-sans pb-16 relative min-h-[60vh]">
      {/* Toast notification for privacy */}
      {privacyToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{privacyToast}</span>
        </div>
      )}

      {/* 1. Static Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-extrabold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/40 px-3.5 py-1.5 rounded-full inline-block border border-red-200/30">
          THI ĐUA VÀ KHEN THƯỞNG LIÊN ĐỘI
        </span>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Thi đua & Khen thưởng
        </h1>
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
          Theo dõi kết quả thi đua của các chi đội, thành tích của đội viên và các hoạt động tuyên dương trong năm học.
        </p>
      </div>

      {/* 1.5 Quick Actions */}
      <CompetitionQuickActions />

      {/* 2. SECTION 1: THI ĐUA CHI ĐỘI */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-red-600" />
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Thi đua chi đội
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Xếp hạng các chi đội dẫn đầu theo từng khối trong năm học hiện tại.
            </p>

            {latestWeekInfo && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                <Calendar className="w-3 h-3 text-amber-600" />
                <span>Kết quả {latestWeekInfo.name || 'tuần gần nhất'} ({latestWeekInfo.starts_on} – {latestWeekInfo.ends_on})</span>
              </div>
            )}
          </div>

          <Link
            to={ROUTES.COMPETITION_UNITS}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold text-xs transition-colors shrink-0"
          >
            <span>Xem bảng xếp hạng chi đội</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grade Cards Grid (4 cards: Khối 6, Khối 7, Khối 8, Khối 9) */}
        {loadingUnits ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-slate-100 dark:bg-slate-900 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
            {gradeData.map(g => {
              const theme = GRADE_THEMES[g.grade] || GRADE_THEMES['6'];

              return (
                <div
                  key={g.grade}
                  className={`relative overflow-hidden bg-white dark:bg-slate-900 border ${theme.cardBorderClass} ${theme.cardBgClass} rounded-3xl ${theme.cardShadowClass} flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 ease-out group z-0`}
                >
                  {/* Top Accent Bar */}
                  <div className={`h-1.5 w-full ${theme.topBarClass}`} />

                  {/* Laurel Wreath Background Watermark */}
                  <div className={`absolute -right-2 bottom-12 w-28 h-28 pointer-events-none select-none z-0 ${theme.watermarkColorClass}`}>
                    <LaurelWreathWatermark className="w-full h-full" />
                  </div>

                  <div className="p-5 pt-4 space-y-4 flex-1 flex flex-col justify-between relative z-10">
                    <div className="space-y-4">
                      {/* Card Header */}
                      <div className="flex items-center justify-center border-b border-slate-100 dark:border-slate-800/80 pb-3">
                        <div className={`w-8 h-8 rounded-xl ${theme.badgeBgClass} ${theme.badgeTextClass} ${theme.badgeBorderClass} font-black font-display text-sm flex items-center justify-center shadow-xs`}>
                          {g.grade}
                        </div>
                      </div>

                      {/* Top 3 Class List */}
                      {g.classes.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 space-y-1">
                          <Clock className="w-5 h-5 mx-auto text-slate-300 dark:text-slate-700" />
                          <p>Chưa có kết quả thi đua của {g.gradeLabel}.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {g.classes.map((cls) => {
                            const rankBadgeClass = 
                              cls.rank === 1
                                ? `${theme.top1BadgeClass} ring-2 ring-white/40 shadow-xs`
                                : cls.rank === 2
                                ? 'bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-200'
                                : 'bg-amber-700 text-amber-50 dark:bg-amber-800 dark:text-amber-100';

                            return (
                              <div
                                key={cls.unit_name}
                                className={`flex items-center justify-between p-2.5 rounded-2xl transition-colors ${
                                  cls.rank === 1
                                    ? theme.top1RowClass
                                    : 'bg-slate-50/80 dark:bg-slate-800/40 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black shrink-0 ${rankBadgeClass}`}>
                                    {cls.rank}
                                  </span>
                                  <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                    {cls.unit_name}
                                  </span>
                                </div>

                                <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 text-slate-900 dark:text-white shrink-0 ml-2">
                                  {cls.final_points} đ
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Link */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-4">
                      <Link
                        to={`${ROUTES.COMPETITION_UNITS}?grade=${g.grade}`}
                        className={`flex items-center justify-between text-xs font-bold ${theme.footerTextClass} ${theme.footerHoverTextClass}`}
                      >
                        <span>Bảng xếp hạng {g.gradeLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. SECTION 2: ĐỘI VIÊN CÓ ĐIỂM THƯỞNG CAO NHẤT */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Thi đua Đội viên
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Danh sách Đội viên tích cực tham gia các hoạt động thi đua!
            </p>
          </div>

          <Link
            to={ROUTES.COMPETITION_STUDENT}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-xs transition-colors shrink-0"
          >
            <span>Xem hồ sơ thi đua</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Top 5 Students List Container */}
        {loadingStudents ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-3 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            ))}
          </div>
        ) : topStudents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-2">
            <Gift className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Chưa có dữ liệu điểm thưởng đội viên.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-3">
            <div className="grid grid-cols-1 gap-2.5">
              {topStudents.map((st, idx) => {
                const rank = idx + 1;
                const isTop1 = rank === 1;

                return (
                  <div
                    key={st.id}
                    onClick={() => handleStudentClick(st)}
                    className={`group cursor-pointer p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isTop1
                        ? 'bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-amber-300/80 dark:border-amber-800/60'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 hover:border-amber-400/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black shrink-0 ${
                          rank === 1
                            ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/30'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-900'
                            : rank === 3
                            ? 'bg-amber-700 text-amber-50'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {rank}
                      </span>

                      <div className="min-w-0">
                        <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          <span className="truncate">{st.full_name}</span>
                          {isTop1 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold shrink-0">
                              Dẫn đầu điểm thưởng
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                          {st.unit_name || 'Chi đội'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-black text-sm sm:text-base text-amber-600 dark:text-amber-400 block">
                          {st.available_reward_points}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          điểm thưởng
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 4. SECTION 3: BẢNG VINH DANH NGƯỜI TỐT - VIỆC TỐT */}
      <section className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-emerald-200/80 dark:border-emerald-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200/80 dark:border-emerald-800/80">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Bảng vinh danh Người tốt - Việc tốt
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Ghi nhận những Đội viên có hành động đẹp, việc làm ý nghĩa và đóng góp tích cực trong trường học.
            </p>
          </div>

          <Link
            to={ROUTES.COMPETITION_GOOD_DEEDS}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs transition-colors shrink-0 border border-emerald-200/60 dark:border-emerald-800/60"
          >
            <span>Xem tất cả gương Người tốt - Việc tốt</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Good Deeds Grid Container */}
        {loadingGoodDeeds ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-100 dark:border-emerald-900/50 p-6 space-y-4 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2" />
                  </div>
                </div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800/40 rounded-xl" />
              </div>
            ))}
          </div>
        ) : goodDeeds.length === 0 ? (
          <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-dashed border-emerald-200/80 dark:border-emerald-800/60 rounded-3xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-semibold">
              Chưa có gương Người tốt - Việc tốt nào được ghi nhận.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goodDeeds.map((item) => (
                <div
                  key={item.id}
                  className="bg-emerald-50/20 dark:bg-slate-900/90 rounded-3xl border border-emerald-200/80 dark:border-emerald-800/60 p-5 sm:p-6 shadow-xs hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Header: Student avatar, name, class & merit points */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-200 dark:border-emerald-800 overflow-hidden">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                            {item.student_name}
                          </h3>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5 truncate">
                            Chi đội: {item.unit_name}
                          </p>
                        </div>
                      </div>

                      {item.merit_points > 0 && (
                        <span className="font-extrabold text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                          +{item.merit_points} điểm
                        </span>
                      )}
                    </div>

                    {/* Content: Title & Description */}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-start gap-2 leading-snug">
                        <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item.title}</span>
                      </h4>
                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed line-clamp-3">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Evidence Thumbnails */}
                    {item.evidence_items && item.evidence_items.length > 0 && (
                      <div className="pt-1 flex items-center gap-2 overflow-x-auto">
                        {item.evidence_items.map((ev: any) =>
                          ev.file_url ? (
                            <img
                              key={ev.id || ev.file_url}
                              src={ev.file_url}
                              alt=""
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                          ) : null
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Date & Xem hồ sơ button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(item.occurred_at).toLocaleDateString('vi-VN')}
                    </span>

                    <Link
                      to={
                        item.student_id
                          ? `${ROUTES.COMPETITION_STUDENT}?studentId=${item.student_id}`
                          : ROUTES.COMPETITION_STUDENT
                      }
                      className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors py-1 px-2.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
                    >
                      <span>Xem hồ sơ</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom button */}
            <div className="text-center pt-2">
              <Link
                to={ROUTES.COMPETITION_GOOD_DEEDS}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <HeartHandshake className="w-4 h-4" />
                <span>Xem tất cả gương Người tốt - Việc tốt</span>
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
