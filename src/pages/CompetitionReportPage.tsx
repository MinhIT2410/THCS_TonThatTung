/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  ArrowLeft, 
  FileSpreadsheet, 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  Users
} from 'lucide-react';
import { ROUTES } from '../config/routes';

export default function CompetitionReportPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 font-sans pb-16">
      {/* Header & Navigation */}
      <div className="space-y-4">
        <Link
          to={ROUTES.COMPETITION}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang Thi đua & Khen thưởng</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Báo cáo thống kê thi đua
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 pl-0.5">
              Theo dõi tình hình thi đua trong ngày, tổng hợp tuần, phân tích vi phạm và xuất báo cáo.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-xs font-bold text-blue-700 dark:text-blue-300">
              <Calendar className="w-3.5 h-3.5" />
              <span>Năm học hiện tại</span>
            </span>
          </div>
        </div>
      </div>

      {/* Overview Metric Placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Ghi nhận trong tuần</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 dark:text-white">--</div>
          <p className="text-[11px] text-slate-400">Đang cập nhật dữ liệu tự động</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Lớp dẫn đầu thi đua</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 dark:text-white">--</div>
          <p className="text-[11px] text-slate-400">Xếp hạng theo điểm tổng kết</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Nhóm lỗi phổ biến</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 dark:text-white">--</div>
          <p className="text-[11px] text-slate-400">Phân loại theo quy định nề nếp</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">Lực lượng ghi nhận</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="font-display text-2xl font-bold text-slate-900 dark:text-white">--</div>
          <p className="text-[11px] text-slate-400">Giám thị & Đội Sao đỏ</p>
        </div>
      </div>

      {/* Frame placeholder section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-200/40 dark:border-blue-900/40">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Khung báo cáo thống kê
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hệ thống đang sẵn sàng tổng hợp biểu đồ trực quan, phân tích xu hướng vi phạm và xuất báo cáo tuần/tháng.
          </p>
        </div>
        <div className="pt-2">
          <Link
            to={ROUTES.COMPETITION}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            Quay lại trang thi đua
          </Link>
        </div>
      </div>
    </div>
  );
}
