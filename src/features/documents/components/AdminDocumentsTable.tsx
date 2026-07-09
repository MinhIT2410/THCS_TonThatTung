/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SchoolDocument } from '../documentTypes';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentCategoryBadge } from './DocumentCategoryBadge';
import { formatDate } from '../../../utils/formatDate';
import { formatFileSize } from '../../../utils/formatFileSize';
import { Edit2, Trash2, Globe, Archive, ExternalLink, RefreshCw, FileText } from 'lucide-react';

interface AdminDocumentsTableProps {
  documents: SchoolDocument[];
  onEdit: (item: SchoolDocument) => void;
  onDelete: (id: string) => Promise<void>;
  onPublish: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}

export const AdminDocumentsTable: React.FC<AdminDocumentsTableProps> = ({
  documents,
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
    const ok = window.confirm('Bạn có chắc muốn xóa tài liệu này không? Hành động này không thể hoàn tác.');
    if (ok) {
      await handleAction(id, onDelete);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">Không tìm thấy tài liệu nào. Nhấp vào "Thêm tài liệu" để đăng tệp mới.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 shadow-sm font-sans">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left">
        <thead className="bg-slate-50/70 dark:bg-slate-900/40">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tiêu đề / Tên File</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Danh mục</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trạng thái</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Dung lượng</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Ngày đăng</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-transparent text-slate-700 dark:text-slate-300">
          {documents.map((doc) => {
            const isProcessing = processingId === doc.id;
            return (
              <tr key={doc.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors">
                {/* Title & Filename */}
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5 max-w-sm sm:max-w-md lg:max-w-lg">
                      <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1" title={doc.title}>
                        {doc.title}
                      </p>
                      {doc.file_name && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Category Badge */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <DocumentCategoryBadge category={doc.category} />
                </td>

                {/* Status Badge */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <DocumentStatusBadge status={doc.status} />
                </td>

                {/* File size */}
                <td className="px-6 py-4 hidden lg:table-cell text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {formatFileSize(doc.file_size)}
                </td>

                {/* Date */}
                <td className="px-6 py-4 hidden md:table-cell text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {formatDate(doc.published_at || doc.created_at)}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    {/* View File Button */}
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        title="Tải tệp / Xem tệp đính kèm"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    {/* Publish Button (only if not published) */}
                    {doc.status !== 'published' && (
                      <button
                        onClick={() => handleAction(doc.id, onPublish)}
                        disabled={isProcessing}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                        title="Xuất bản tài liệu"
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Globe className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {/* Archive Button (only if not archived) */}
                    {doc.status !== 'archived' && (
                      <button
                        onClick={() => handleAction(doc.id, onArchive)}
                        disabled={isProcessing}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                        title="Lưu trữ tài liệu"
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
                      onClick={() => onEdit(doc)}
                      disabled={isProcessing}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                      title="Sửa thông tin"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => confirmDelete(doc.id)}
                      disabled={isProcessing}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400"
                      title="Xóa tài liệu"
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
