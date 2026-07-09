/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Album } from '../albumTypes';
import { AlbumStatusBadge } from './AlbumStatusBadge';
import { formatDate } from '../../../utils/formatDate';
import { Edit2, Trash2, Globe, Archive, ExternalLink, RefreshCw, Image, FolderOpen } from 'lucide-react';

interface AdminAlbumsTableProps {
  albums: Album[];
  onEdit: (item: Album) => void;
  onDelete: (id: string) => Promise<void>;
  onPublish: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onManageImages: (item: Album) => void;
}

export const AdminAlbumsTable: React.FC<AdminAlbumsTableProps> = ({
  albums,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
  onManageImages,
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
    const ok = window.confirm('Bạn có chắc muốn xóa album này không? Các ảnh trong album cũng sẽ bị xóa khỏi danh sách.');
    if (ok) {
      await handleAction(id, onDelete);
    }
  };

  if (albums.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        <FolderOpen className="h-8 w-8 text-slate-400 mx-auto mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Không tìm thấy album nào. Nhấp vào "Thêm album" để tạo album mới.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 shadow-sm font-sans">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left">
        <thead className="bg-slate-50/70 dark:bg-slate-900/40">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">Ảnh bìa</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tiêu đề / Mô tả</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trạng thái</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Ngày đăng</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-transparent text-slate-700 dark:text-slate-300">
          {albums.map((album) => {
            const isProcessing = processingId === album.id;
            return (
              <tr key={album.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors">
                {/* Cover Image Preview */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {album.cover_image_url ? (
                    <img
                      src={album.cover_image_url}
                      alt={album.title}
                      referrerPolicy="no-referrer"
                      className="h-12 w-16 object-cover rounded-lg border border-slate-150 dark:border-slate-800 bg-slate-100"
                    />
                  ) : (
                    <div className="h-12 w-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">
                      <Image className="h-5 w-5" />
                    </div>
                  )}
                </td>

                {/* Title & Description */}
                <td className="px-6 py-4">
                  <div className="space-y-0.5 max-w-sm sm:max-w-md lg:max-w-lg">
                    <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1" title={album.title}>
                      {album.title}
                    </p>
                    {album.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1" title={album.description}>
                        {album.description}
                      </p>
                    )}
                  </div>
                </td>

                {/* Status Badge */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <AlbumStatusBadge status={album.status} />
                </td>

                {/* Date */}
                <td className="px-6 py-4 hidden md:table-cell text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatDate(album.published_at || album.created_at)}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-1">
                    {/* View Public Button */}
                    {album.status === 'published' && (
                      <a
                        href={`/thu-vien/${album.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        title="Xem trang công khai"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    {/* Manage Images Button */}
                    <button
                      onClick={() => onManageImages(album)}
                      disabled={isProcessing}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                      title="Quản lý hình ảnh trong album"
                    >
                      <Image className="h-4 w-4" />
                    </button>

                    {/* Publish Button (only if not published) */}
                    {album.status !== 'published' && (
                      <button
                        onClick={() => handleAction(album.id, onPublish)}
                        disabled={isProcessing}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                        title="Xuất bản album"
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Globe className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {/* Archive Button (only if not archived) */}
                    {album.status !== 'archived' && (
                      <button
                        onClick={() => handleAction(album.id, onArchive)}
                        disabled={isProcessing}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                        title="Lưu trữ album"
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
                      onClick={() => onEdit(album)}
                      disabled={isProcessing}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
                      title="Sửa thông tin album"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => confirmDelete(album.id)}
                      disabled={isProcessing}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400"
                      title="Xóa album"
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
