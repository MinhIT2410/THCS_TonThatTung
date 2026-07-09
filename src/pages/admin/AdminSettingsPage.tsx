/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Settings, Info, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminSettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 py-4 font-sans" id="admin-settings-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Settings className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Cài đặt hệ thống</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Thiết lập cấu hình chung, thông tin trường, và liên hệ mạng xã hội.</p>
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
        <div className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto shadow-sm border border-slate-100 dark:border-slate-800">
          <Settings className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">Tính năng đang được phát triển</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Thông tin trường, cấu hình website, tích hợp sẽ được bổ sung sau. Hãy quay lại sau khi tính năng này được cập nhật đầy đủ.
          </p>
        </div>

        <div className="flex gap-3 p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl text-left max-w-md mx-auto">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed font-semibold">
            Giao diện này hiện tại đóng vai trò là khung phân hướng và đã được bảo mật phân quyền hoàn tất.
          </p>
        </div>
      </div>
    </div>
  );
}
