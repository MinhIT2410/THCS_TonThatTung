/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Award, 
  Calendar, 
  Trophy, 
  Clock, 
  Sparkles, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { competitionService } from '../services/competitionService';
import { CompetitionWeek } from '../types/competition';
import { ROUTES } from '../config/routes';

export default function PublicUnitCompetitionPage() {
  const [publishedWeeks, setPublishedWeeks] = useState<CompetitionWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [currentWeekInfo, setCurrentWeekInfo] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadPublishedWeeks();
  }, []);

  async function loadPublishedWeeks() {
    try {
      setLoading(true);
      const weeks = await competitionService.getPublicPublishedWeeks();
      setPublishedWeeks(weeks);

      if (weeks.length > 0) {
        setSelectedWeekId(weeks[0].id);
        await loadLeaderboard(weeks[0].id);
      }
    } catch (err) {
      console.error('Error fetching published weeks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaderboard(weekId: string) {
    try {
      setLoading(true);
      const data = await competitionService.getPublicWeekLeaderboard(weekId);
      if (data) {
        setCurrentWeekInfo(data.week);
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('Error loading public leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wId = e.target.value;
    setSelectedWeekId(wId);
    if (wId) {
      loadLeaderboard(wId);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8 font-sans pb-20">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to={ROUTES.COMPETITION} className="hover:text-red-600 transition-colors flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          <span>Tổng quan Thi đua</span>
        </Link>
        <span>/</span>
        <span className="font-bold text-slate-800 dark:text-white">Thi Đua Chi Đội theo Tuần</span>
      </div>

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 dark:from-red-950 dark:via-rose-900 dark:to-amber-950 p-8 sm:p-10 text-white shadow-xl">
        <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none">
          <Trophy className="w-72 h-72" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-amber-100">
            <Sparkles className="w-3.5 h-3.5" />
            Bảng Cờ Thi Đua Chi Đội
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-display leading-tight">
            Kết Quả Thi Đua Chi Đội Hàng Tuần
          </h1>
          <p className="text-xs sm:text-sm text-red-50 dark:text-red-200 leading-relaxed">
            Công bố công khai tổng điểm thi đua và thứ hạng các chi đội THCS Tôn Thất Tùng. Bảng điểm được tổng hợp minh bạch từ sổ ghi nhận và quy tắc thi đua chính thức của Liên đội.
          </p>
        </div>
      </div>

      {/* Filter / Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-600" />
            Chọn Tuần Thi Đua
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chỉ hiển thị các tuần thi đua đã chính thức chốt và công bố kết quả
          </p>
        </div>

        <div className="min-w-[260px]">
          <select
            value={selectedWeekId}
            onChange={handleWeekChange}
            disabled={publishedWeeks.length === 0}
            className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-white shadow-sm disabled:opacity-50"
          >
            {publishedWeeks.length === 0 ? (
              <option value="">Chưa có kết quả công bố</option>
            ) : (
              publishedWeeks.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.starts_on} - {w.ends_on})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Main Leaderboard Section */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center text-xs text-slate-400 animate-pulse">
          Đang tải bảng xếp hạng cờ thi đua...
        </div>
      ) : publishedWeeks.length === 0 || !currentWeekInfo ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 mx-auto flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Chưa Có Kết Quả Tuần Thi Đua Được Công Bố
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ban Chỉ huy Liên đội đang tổng hợp điểm và xử lý các sự việc thi đua trong tuần. Kết quả chính thức sẽ được cập nhật công khai ngay sau khi Tổng phụ trách chốt tuần.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Week Info Banner */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                {currentWeekInfo.program_name || 'Chương trình thi đua năm học'}
              </div>
              <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white mt-0.5">
                {currentWeekInfo.name}
              </h2>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 sm:text-right">
              <div>Thời gian: <strong className="text-slate-800 dark:text-slate-200">{currentWeekInfo.starts_on}</strong> đến <strong className="text-slate-800 dark:text-slate-200">{currentWeekInfo.ends_on}</strong></div>
              <div>Ngày công bố: <strong className="text-slate-800 dark:text-slate-200">{new Date(currentWeekInfo.published_at).toLocaleDateString('vi-VN')}</strong></div>
            </div>
          </div>

          {/* Desktop Leaderboard Table (Hidden on mobile) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6 w-20 text-center">Hạng</th>
                  <th className="py-4 px-6">Chi đội</th>
                  <th className="py-4 px-6 text-center">Khởi điểm</th>
                  <th className="py-4 px-6 text-center text-emerald-600 dark:text-emerald-400">Điểm cộng</th>
                  <th className="py-4 px-6 text-center text-rose-600 dark:text-rose-400">Điểm trừ</th>
                  <th className="py-4 px-6 text-center font-black">Điểm tổng kết</th>
                  <th className="py-4 px-6">Nhận xét thi đua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {leaderboard.map((item, index) => {
                  const rank = item.rank || index + 1;
                  return (
                    <tr 
                      key={item.unit_name}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        rank === 1 ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-2xl text-xs font-black shadow-sm ${
                            rank === 1
                              ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-400/20'
                              : rank === 2
                              ? 'bg-slate-300 text-slate-900'
                              : rank === 3
                              ? 'bg-amber-700 text-amber-50'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {rank}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          {item.unit_name}
                          {rank === 1 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                              Dẫn đầu khối
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center font-mono text-slate-500">
                        {item.starting_points}
                      </td>
                      <td className="py-4 px-6 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{item.manual_bonus_points || 0}
                      </td>
                      <td className="py-4 px-6 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{item.manual_penalty_points || 0}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="font-mono font-black text-base px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/60 dark:border-slate-700 shadow-inner">
                          {item.final_points}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-300">
                        {item.comment || <span className="italic text-slate-400">Tuyên dương nề nếp thi đua</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View (Visible on < md) */}
          <div className="block md:hidden space-y-3">
            {leaderboard.map((item, index) => {
              const rank = item.rank || index + 1;
              return (
                <div
                  key={item.unit_name}
                  className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm space-y-3 ${
                    rank === 1
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-500/5'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-2xl text-xs font-black shadow-sm ${
                          rank === 1
                            ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-400/20'
                            : rank === 2
                            ? 'bg-slate-300 text-slate-900'
                            : rank === 3
                            ? 'bg-amber-700 text-amber-50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {rank}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {item.unit_name}
                      </h3>
                    </div>

                    <span className="font-mono font-black text-base px-3 py-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/60 dark:border-slate-700">
                      {item.final_points} điểm
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-bold">Khởi điểm</div>
                      <div className="font-mono font-bold text-slate-700 dark:text-slate-200">{item.starting_points}</div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl">
                      <div className="text-[10px] text-emerald-600 font-bold">Điểm cộng</div>
                      <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">+{item.manual_bonus_points || 0}</div>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl">
                      <div className="text-[10px] text-rose-600 font-bold">Điểm trừ</div>
                      <div className="font-mono font-bold text-rose-700 dark:text-rose-300">-{item.manual_penalty_points || 0}</div>
                    </div>
                  </div>

                  {item.comment && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl italic">
                      "{item.comment}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
