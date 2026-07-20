/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Newspaper, ArrowLeft, Plus, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NewsItem, CreateNewsInput } from '../../features/news/newsTypes';
import { newsApi } from '../../features/news/newsApi';
import { AdminNewsTable } from '../../features/news/components/AdminNewsTable';
import { AdminNewsForm } from '../../features/news/components/AdminNewsForm';
import { NEWS_CATEGORY_CONFIG } from '../../features/news/newsCategories';

export default function AdminNewsPage() {
  const navigate = useNavigate();

  // Core state
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchNews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await newsApi.getAllNewsForAdmin();
      setNewsList(data);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tải danh sách tin tức. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleCreate = () => {
    setEditingItem(null);
    setView('create');
  };

  const handleEdit = (item: NewsItem) => {
    setEditingItem(item);
    setView('edit');
  };

  const handleCancel = () => {
    setView('list');
    setEditingItem(null);
  };

  const handleSave = async (input: CreateNewsInput) => {
    setIsSaving(true);
    setError(null);
    try {
      if (view === 'edit' && editingItem) {
        // Edit news
        await newsApi.updateNews(editingItem.id, input);
      } else {
        // Create news
        await newsApi.createNews(input);
      }
      // Reload and return to list
      await fetchNews();
      setView('list');
      setEditingItem(null);
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || 'Không thể lưu tin tức. Có lỗi xảy ra.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await newsApi.deleteNews(id);
      setNewsList(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      console.error(err);
      alert('Không thể xóa tin tức. Có lỗi xảy ra.');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const updated = await newsApi.publishNews(id);
      setNewsList(prev => prev.map(item => item.id === id ? updated : item));
    } catch (err: any) {
      console.error(err);
      alert('Không thể xuất bản tin tức. Có lỗi xảy ra.');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const updated = await newsApi.archiveNews(id);
      setNewsList(prev => prev.map(item => item.id === id ? updated : item));
    } catch (err: any) {
      console.error(err);
      alert('Không thể lưu trữ tin tức. Có lỗi xảy ra.');
    }
  };

  // Filter and search logic
  const filteredNews = newsList.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.slug.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    const matchesCategory = categoryFilter === 'all'
      ? true
      : categoryFilter === 'unclassified'
        ? !item.category_code
        : item.category_code === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const unclassifiedCount = newsList.filter(item => !item.category_code).length;

  return (
    <div className="space-y-6 py-4 font-sans" id="admin-news-management-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Newspaper className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {view === 'list' && 'Quản lý tin tức'}
              {view === 'create' && 'Tạo tin tức mới'}
              {view === 'edit' && 'Chỉnh sửa tin tức'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {view === 'list' && 'Danh sách, tạo mới, sửa và xuất bản các bài đăng, tin hoạt động nhà trường.'}
            {view === 'create' && 'Điền đầy đủ thông tin bên dưới để đăng bài viết mới lên trang chủ.'}
            {view === 'edit' && 'Cập nhật nội dung bài viết và nhấn lưu thay đổi.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {view === 'list' ? (
            <>
              <button
                onClick={fetchNews}
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
                <span>Tạo tin mới</span>
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

      {unclassifiedCount > 0 && view === 'list' && (
        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl shadow-sm">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">
              Có {unclassifiedCount} bài viết chưa được phân loại chuyên mục!
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-medium leading-relaxed">
              Vui lòng bấm vào nút chỉnh sửa trên từng bài viết để gán chuyên mục thích hợp (Học tập, Rèn luyện, Sự kiện, Gương sáng).
            </p>
          </div>
        </div>
      )}

      {/* Main Area */}
      {view === 'list' ? (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tiêu đề hoặc slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-white"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 w-full sm:w-auto shrink-0 justify-end">
              {/* Category Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Chuyên mục:
                </span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent outline-none text-slate-800 dark:text-white min-w-[140px] cursor-pointer"
                >
                  <option value="all">Tất cả chuyên mục</option>
                  {Object.values(NEWS_CATEGORY_CONFIG).map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.label}
                    </option>
                  ))}
                  <option value="unclassified">Chưa phân loại</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Trạng thái:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent outline-none text-slate-800 dark:text-white min-w-[120px] cursor-pointer"
                >
                  <option value="all">Tất cả</option>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="archived">Đã lưu trữ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table or Loading */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Đang tải danh sách tin tức...</p>
            </div>
          ) : (
            <AdminNewsTable
              newsList={filteredNews}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPublish={handlePublish}
              onArchive={handleArchive}
            />
          )}
        </div>
      ) : (
        <AdminNewsForm
          initialData={editingItem}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
