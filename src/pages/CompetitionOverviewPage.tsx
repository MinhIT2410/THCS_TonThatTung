/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  User, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { CompetitionProgram } from '../types/competition';
import { ROUTES } from '../config/routes';

export default function CompetitionOverviewPage() {
  const [activePrograms, setActivePrograms] = useState<CompetitionProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrograms() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('competition_programs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const now = new Date();
          const validPrograms = (data as CompetitionProgram[]).filter((prog) => {
            if (!prog.is_active) return false;
            if (prog.starts_at && new Date(prog.starts_at) > now) return false;
            if (prog.ends_at && new Date(prog.ends_at) < now) return false;
            return true;
          });
          setActivePrograms(validPrograms);
        }
      } catch (err) {
        console.error('Error loading competition programs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPrograms();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 font-sans pb-16 relative min-h-[60vh]">
      {/* 1. Static Page Header matching /hoat-dong */}
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

      {/* 2. Primary Navigation Cards (Thi đua chi đội & Thi đua đội viên) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Card 1: Thi đua chi đội */}
        <Link 
          to={ROUTES.COMPETITION_UNITS}
          className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-md hover:border-red-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          <div className="space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shadow-inner">
              <Users className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                Thi đua chi đội
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Theo dõi điểm thi đua, kết quả và xếp hạng của các chi đội theo từng tuần.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Kết quả thi đua hàng tuần</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Bảng xếp hạng các chi đội</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Nhận xét và kết quả đã công bố</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400">
            <span>Xem bảng xếp hạng</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Thi đua đội viên */}
        <Link 
          to={ROUTES.COMPETITION_STUDENT}
          className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-md hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          <div className="space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <User className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Thi đua đội viên
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Theo dõi việc tốt, thành tích, vi phạm và điểm thưởng của từng đội viên.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Điểm thi đua cá nhân</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Lịch sử việc tốt và thành tích</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Điểm thưởng và phần thưởng</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>Xem hồ sơ thi đua</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* 3. Active Competition Programs Section */}
      <section className="space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Chương trình thi đua đang triển khai
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Các phong trào thi đua chính thức áp dụng trong năm học.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800/60"
              />
            ))}
          </div>
        ) : activePrograms.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Chưa có chương trình thi đua đang triển khai.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePrograms.map((prog) => {
              const startDateStr = prog.starts_at ? new Date(prog.starts_at).toLocaleDateString('vi-VN') : null;
              const endDateStr = prog.ends_at ? new Date(prog.ends_at).toLocaleDateString('vi-VN') : null;
              const dateRange = startDateStr && endDateStr 
                ? `${startDateStr} – ${endDateStr}`
                : startDateStr 
                  ? `Từ ${startDateStr}` 
                  : prog.academic_year_name 
                    ? `Năm học ${prog.academic_year_name}` 
                    : null;

              return (
                <div
                  key={prog.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col justify-between hover:border-red-500/40 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-[11px] font-mono font-bold">
                        {prog.code}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Đang diễn ra
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold font-display text-base text-slate-900 dark:text-white line-clamp-2">
                        {prog.name}
                      </h3>
                      {prog.academic_year_name && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                          Năm học: {prog.academic_year_name}
                        </span>
                      )}
                    </div>

                    {prog.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {prog.description}
                      </p>
                    )}
                  </div>

                  {dateRange && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Thời gian:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{dateRange}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

