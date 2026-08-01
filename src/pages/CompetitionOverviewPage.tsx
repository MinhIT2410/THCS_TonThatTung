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
  Calendar
} from 'lucide-react';
import { competitionService } from '../services/competitionService';
import { ROUTES } from '../config/routes';
import { supabase } from '../lib/supabase/client';

interface GradeTopClasses {
  grade: string;
  gradeLabel: string;
  classes: {
    unit_name: string;
    final_points: number;
    rank: number;
  }[];
}

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
              <div key={i} className="h-56 bg-slate-100 dark:bg-slate-900 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
            {gradeData.map(g => (
              <div
                key={g.grade}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-red-500/40 transition-all group"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-center border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-black font-display text-lg flex items-center justify-center shadow-xs">
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
                            ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/30'
                            : cls.rank === 2
                            ? 'bg-slate-300 text-slate-900'
                            : 'bg-amber-700 text-amber-50';

                        return (
                          <div
                            key={cls.unit_name}
                            className={`flex items-center justify-between p-2.5 rounded-2xl transition-colors ${
                              cls.rank === 1
                                ? 'bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-800/40'
                                : 'bg-slate-50 dark:bg-slate-800/50'
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
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                  <Link
                    to={`${ROUTES.COMPETITION_UNITS}?grade=${g.grade}`}
                    className="flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300"
                  >
                    <span>Bảng xếp hạng {g.gradeLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
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
    </div>
  );
}
