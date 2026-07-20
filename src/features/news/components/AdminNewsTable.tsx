/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NewsItem } from '../newsTypes';
import { NewsStatusBadge } from './NewsStatusBadge';
import { formatDate } from '../../../utils/formatDate';
import { Edit2, Trash2, Globe, Archive, ExternalLink, RefreshCw } from 'lucide-react';
import { NEWS_CATEGORY_CONFIG, DEFAULT_CATEGORY_INFO } from '../newsCategories';

interface AdminNewsTableProps {
  newsList: NewsItem[];
  onEdit: (item: NewsItem) => void;
  onDelete: (id: string) => Promise<void>;
  onPublish: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}

export const AdminNewsTable: React.FC<AdminNewsTableProps> = ({
  newsList,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAction = async (id: string, actionFn: (id: string) => Promise<void>) => {
    setProcessingId(id);
    try {
      await actionFn(id);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDelete = async (id: string) => {
    const ok = window.confirm('Bạn có chắc muốn xóa tin tức này không? Hành động này không thể hoàn tác.');
    if (ok) {
      await handleAction(id, onDelete);
    }
  };

  if (newsList.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">Không có tin tức nào được tìm thấy. Nhấp vào "Tạo tin mới" để thêm.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 shadow-sm font-sans">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left">
        <thead className="bg-slate-50/70 dark:bg-slate-900/40">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tiêu đề / Ảnh</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Slug</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chuyên mục</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trạng thái</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Ngày đăng</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-transparent text-slate-700 dark:text-slate-300">
          {newsList.map((news) => {
            const isProcessing = processingId === news.id;
            return (
              <tr key={news.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors">
                {/* Title & Image */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                      {news.thumbnail_url ? (
                        <img
                          src={news.thumbnail_url}
                          alt={news.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 text-[10px]">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {news.title}
                      </p>
                      {news.summary && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-md hidden sm:block">
                          {news.summary}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Slug (Desktop) */}
                <td className="px-6 py-4 hidden md:table-cell font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="line-clamp-1 max-w-[150px]" title={news.slug}>
                    {news.slug}
                  </span>
                </td>

                {/* Category Badge */}
                <td className="px-6 py-4">
                  {news.category_code && NEWS_CATEGORY_CONFIG[news.category_code] ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${NEWS_CATEGORY_CONFIG[news.category_code].badgeClass}`}>
                      {NEWS_CATEGORY_CONFIG[news.category_code].label}
                    </span>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${DEFAULT_CATEGORY_INFO.badgeClass}`}>
                      {DEFAULT_CATEGORY_INFO.label}
                    </span>
                  )}
                </td>

                {/* Status Badge */}
                <td className="px-6 py-4">
                  <NewsStatusBadge status={news.status} />
                </td>

                {/* Date (Desktop) */}
                <td className="px-6 py-4 hidden lg:table-cell text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {formatDate(news.published_at || news.created_at)}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    {/* View Public Button (only for published status) */}
                    {news.status === 'published' && (
                      <a
                        href={`/tin-tuc/${news.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        title="Xem bài viết trên trang chính"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    {/* Publish Button (only if not published) */}
                    {news.status !== 'published' && (
                      <button
                        onClick={() => handleAction(news.id, onPublish)}
                        disabled={isProcessing}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                        title="Xuất bản ngay"
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Globe className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {/* Archive Button (only if not archived) */}
                    {news.status !== 'archived' && (
                      <button
                        onClick={() => handleAction(news.id, onArchive)}
                        disabled={isProcessing}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                        title="Lưu trữ"
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => onEdit(news)}
                      disabled={isProcessing}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                      title="Sửa bài viết"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => confirmDelete(news.id)}
                      disabled={isProcessing}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400"
                      title="Xóa bài viết"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
