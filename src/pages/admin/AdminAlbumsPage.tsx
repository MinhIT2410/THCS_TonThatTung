/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, ArrowLeft, Plus, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Album, CreateAlbumInput } from '../../features/albums/albumTypes';
import { albumApi } from '../../features/albums/albumApi';
import { AdminAlbumsTable } from '../../features/albums/components/AdminAlbumsTable';
import { AdminAlbumsForm } from '../../features/albums/components/AdminAlbumsForm';
import { AdminAlbumImagesPanel } from '../../features/albums/components/AdminAlbumImagesPanel';

export default function AdminAlbumsPage() {
  const navigate = useNavigate();

  // Core state
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state: 'list' | 'create' | 'edit' | 'manage-images'
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'manage-images'>('list');
  const [editingItem, setEditingItem] = useState<Album | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchAlbums = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await albumApi.getAllAlbumsForAdmin();
      setAlbums(data);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tải danh sách album ảnh. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleCreate = () => {
    setEditingItem(null);
    setView('create');
  };

  const handleEdit = (item: Album) => {
    setEditingItem(item);
    setView('edit');
  };

  const handleManageImages = (item: Album) => {
    setSelectedAlbum(item);
    setView('manage-images');
  };

  const handleCancel = () => {
    setView('list');
    setEditingItem(null);
    setSelectedAlbum(null);
  };

  const handleSave = async (input: CreateAlbumInput) => {
    setIsSaving(true);
    setError(null);
    try {
      if (view === 'edit' && editingItem) {
        // Edit album
        await albumApi.updateAlbum(editingItem.id, input);
      } else {
        // Create album
        await albumApi.createAlbum(input);
      }
      // Reload and return to list
      await fetchAlbums();
      setView('list');
      setEditingItem(null);
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || 'Không thể lưu album. Có lỗi xảy ra.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await albumApi.deleteAlbum(id);
      setAlbums(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      console.error(err);
      alert('Không thể xóa album. Có lỗi xảy ra.');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const updated = await albumApi.publishAlbum(id);
      setAlbums(prev => prev.map(item => item.id === id ? updated : item));
    } catch (err: any) {
      console.error(err);
      alert('Không thể xuất bản album. Có lỗi xảy ra.');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const updated = await albumApi.archiveAlbum(id);
      setAlbums(prev => prev.map(item => item.id === id ? updated : item));
    } catch (err: any) {
      console.error(err);
      alert('Không thể lưu trữ album. Có lỗi xảy ra.');
    }
  };

  const handleUpdateAlbumCover = (coverUrl: string) => {
    if (selectedAlbum) {
      const updated = { ...selectedAlbum, cover_image_url: coverUrl };
      setSelectedAlbum(updated);
      setAlbums(prev => prev.map(item => item.id === selectedAlbum.id ? updated : item));
    }
  };

  // Filter and search logic
  const filteredAlbums = albums.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 py-4 font-sans" id="admin-albums-management-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <ImageIcon className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {view === 'list' && 'Quản lý album ảnh'}
              {view === 'create' && 'Thêm album mới'}
              {view === 'edit' && 'Chỉnh sửa album'}
              {view === 'manage-images' && 'Quản lý hình ảnh'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {view === 'list' && 'Tạo mới, quản lý, xuất bản album và hình ảnh thư viện hoạt động của nhà trường.'}
            {view === 'create' && 'Nhập thông tin tiêu đề, mô tả và thiết lập ảnh bìa cho album ảnh mới.'}
            {view === 'edit' && 'Cập nhật lại tiêu đề, mô tả, ảnh bìa hoặc thay đổi trạng thái của album.'}
            {view === 'manage-images' && 'Tải hình ảnh lên album, sắp xếp, đặt chú thích và chọn ảnh đại diện.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {view === 'list' ? (
            <>
              <button
                onClick={fetchAlbums}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 transition-colors"
                title="Tải lại danh sách"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm album</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleCancel}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all w-fit"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại danh sách</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed font-semibold">
            {error}
          </p>
        </div>
      )}

      {/* Main Area */}
      {view === 'list' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tiêu đề album..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1.5 w-full sm:w-auto shrink-0 justify-end">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                Trạng thái:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent outline-none text-slate-800 dark:text-white min-w-[120px]"
              >
                <option value="all">Tất cả</option>
                <option value="draft">Bản nháp</option>
                <option value="published">Đã xuất bản</option>
                <option value="archived">Đã lưu trữ</option>
              </select>
            </div>
          </div>

          {/* Table or Loading */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <RefreshCw className="h-8 w-8 text-rose-500 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Đang tải danh sách album...</p>
            </div>
          ) : (
            <AdminAlbumsTable
              albums={filteredAlbums}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPublish={handlePublish}
              onArchive={handleArchive}
              onManageImages={handleManageImages}
            />
          )}
        </div>
      )}

      {(view === 'create' || view === 'edit') && (
        <AdminAlbumsForm
          initialData={editingItem}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}

      {view === 'manage-images' && selectedAlbum && (
        <AdminAlbumImagesPanel
          album={selectedAlbum}
          onBack={handleCancel}
          onUpdateAlbumCover={handleUpdateAlbumCover}
        />
      )}
    </div>
  );
}
