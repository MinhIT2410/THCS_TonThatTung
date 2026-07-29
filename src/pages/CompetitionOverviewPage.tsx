/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  User, 
  Award, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  Sparkles, 
  Info,
  ArrowRight,
  ChevronRight
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
          setActivePrograms(data as CompetitionProgram[]);
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
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12 font-sans pb-20">
      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 dark:from-red-950 dark:via-rose-900 dark:to-amber-950 p-8 sm:p-12 text-white shadow-xl">
        <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
          <Award className="w-80 h-80" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-amber-100">
            <Sparkles className="w-3.5 h-3.5" />
            Hệ thống Thi đua Liên đội
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display leading-tight">
            Cổng Thông Tin Thi Đua & Khen Thưởng
          </h1>
          <p className="text-sm sm:text-base text-red-50 dark:text-red-200 leading-relaxed">
            Nơi ghi nhận thành tích, rèn luyện nề nếp, biểu dương tấm gương người tốt - việc tốt và thúc đẩy phong trào thi đua học tập giữa các chi đội và đội viên THCS Tôn Thất Tùng.
          </p>
        </div>
      </div>

      {/* 2 Main Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card A: Thi đua Chi đội */}
        <Link 
          to={ROUTES.COMPETITION_UNITS}
          className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-red-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-red-600 group-hover:w-3 transition-all" />
          
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shadow-inner">
                <Users className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Đang hoạt động (Phần 2)
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                Thi đua Chi đội
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Theo dõi điểm thi đua, kết quả và xếp hạng cờ thi đua các chi đội theo từng tuần.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Tổng hợp tự động điểm cộng/trừ theo từng tuần thi đua</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Bảng xếp hạng cờ thi đua hàng tuần công khai</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400">
            <span>Xem Bảng Xếp Hạng Hàng Tuần</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card B: Thi đua Đội viên */}
        <Link 
          to={ROUTES.COMPETITION_STUDENT}
          className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-amber-600 group-hover:w-3 transition-all" />

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                <User className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Đang hoạt động (Phần 3)
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Hồ Sơ Thi Đua Đội Viên
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Theo dõi 3 sổ điểm riêng biệt (Thi đua tích lũy, Thưởng khả dụng đổi quà, Cống hiến chi đội) và nhật ký khen thưởng/vi phạm.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Theo dõi điểm rèn luyện, việc tốt và lịch sử sự việc</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Cửa hàng quà tặng, đổi điểm thưởng & gửi yêu cầu xem lại</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>Truy Cập Hồ Sơ Cá Nhân</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Active Programs Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-red-600" />
              Chương trình thi đua đang triển khai
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Các phong trào thi đua chính thức áp dụng trong năm học
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Đang tải danh sách chương trình thi đua...
          </div>
        ) : activePrograms.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Hiện chưa có chương trình thi đua chính thức nào được kích hoạt. Ban Chỉ huy Liên đội đang cấu hình quy định cho đợt thi đua mới.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePrograms.map((prog) => (
              <div
                key={prog.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-[11px] font-mono font-bold">
                    {prog.code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Đang hoạt động
                  </span>
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                  {prog.name}
                </h4>
                {prog.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {prog.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rules & Points Calculation Explanation Section */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">
              Nguyên tắc nghiệp vụ & Cách tính điểm thi đua
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quy định đồng bộ giao dịch điểm giữa Đội viên và Chi đội
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 font-mono font-bold text-[10px] flex items-center justify-center">1</span>
              Ghi nhận một điểm nhập
            </div>
            <p>
              Người giám thị hoặc giáo viên ghi nhận duy nhất 1 sự việc phát sinh. Hệ thống sẽ tự động đối chiếu quy tắc cấu hình để tạo đồng thời các giao dịch điểm liên quan mà không cần nhập lại cho chi đội.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-mono font-bold text-[10px] flex items-center justify-center">2</span>
              Cơ chế ba loại sổ điểm
            </div>
            <p>
              Mỗi sự việc có thể tác động đến <strong className="text-slate-800 dark:text-slate-100">Điểm thi đua đội viên</strong>, <strong className="text-slate-800 dark:text-slate-100">Điểm thưởng khả dụng</strong> (để đổi quà), và <strong className="text-slate-800 dark:text-slate-100">Điểm thi đua chi đội</strong>.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 font-mono font-bold text-[10px] flex items-center justify-center">3</span>
              Quy trình kiểm duyệt & Bảo mật
            </div>
            <p>
              Các sự việc yêu cầu minh chứng sẽ qua bước xét duyệt bởi Tổng phụ trách. Giao dịch điểm sau khi đã <strong className="text-slate-800 dark:text-slate-100">POSTED</strong> là bất biến; việc sửa đổi chỉ thực hiện qua giao dịch đảo (Reversal).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
