/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Info, FileText, Newspaper, Image as ImageIcon, LogOut } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-10 pb-24 font-sans" id="admin-page">
      {/* Title block */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl text-blue-600 dark:text-blue-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Trang Quản Trị Hệ Thống</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Xin chào, <strong className="text-slate-700 dark:text-slate-300">{profile?.full_name || 'Quản trị viên'}</strong> (Vai trò: <span className="uppercase text-blue-600 dark:text-blue-400 font-bold">{profile?.role}</span>)
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 rounded-xl text-xs font-bold transition-all shrink-0"
        >
          <LogOut className="h-4 w-4" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Placeholder main card */}
      <div className="bg-slate-50 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto text-blue-500 shadow-sm border border-slate-100 dark:border-slate-800">
          <Info className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">Khu Vực Quản Trị Đang Phát Triển</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Các tính năng quản lý bài viết Tin tức, kho văn bản Tài liệu, và album ảnh Thư viện sẽ được tích hợp đầy đủ trong các bước tiếp theo của dự án.
          </p>
        </div>

        {/* Modules info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-2">
            <Newspaper className="h-5 w-5 text-slate-400" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Quản lý Tin tức</h4>
            <p className="text-[10px] text-slate-400 font-medium">Đăng bài viết mới, chỉnh sửa và phân loại danh mục tin bài.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-2">
            <FileText className="h-5 w-5 text-slate-400" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Kho Tài liệu</h4>
            <p className="text-[10px] text-slate-400 font-medium">Tải lên kế hoạch, công văn, biểu mẫu và văn bản chỉ đạo.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80 space-y-2">
            <ImageIcon className="h-5 w-5 text-slate-400" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Album Ảnh</h4>
            <p className="text-[10px] text-slate-400 font-medium">Lưu trữ hình ảnh các hoạt động phong trào, ngày hội thiếu nhi.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
