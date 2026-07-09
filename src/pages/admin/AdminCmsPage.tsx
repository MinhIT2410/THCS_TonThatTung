/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Paintbrush, Info, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminCmsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 py-4 font-sans" id="admin-cms-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Paintbrush className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">CMS & Giao diện</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Chỉnh sửa nội dung các khối hiển thị và thiết kế trang chủ.</p>
        </div>
        <button
          onClick={() => navigate('/quan-tri')}
          className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại</span>
        </button>
      </div>

      {/* Notice Card */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto shadow-sm border border-amber-100/40 dark:border-amber-900/30">
          <Paintbrush className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">CMS giao diện</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Chỉnh sửa Hero và các khối giao diện sẽ được mở rộng sau. Hiện Hero đã có Visual Edit Mode ở trang chủ.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors"
          >
            <Home className="h-4 w-4" />
            <span>Về trang chủ để bật chế độ chỉnh sửa</span>
          </button>
        </div>

        <div className="flex gap-3 p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl text-left max-w-md mx-auto">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-semibold">
            Bản cập nhật CMS tiếp theo sẽ cho phép chỉnh sửa danh sách thông tin cơ bản của trường học trực tiếp từ khu vực này.
          </p>
        </div>
      </div>
    </div>
  );
}
