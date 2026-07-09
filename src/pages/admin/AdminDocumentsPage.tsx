/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileText, ArrowLeft, Plus, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SchoolDocument, CreateDocumentInput } from '../../features/documents/documentTypes';
import { documentApi } from '../../features/documents/documentApi';
import { AdminDocumentsTable } from '../../features/documents/components/AdminDocumentsTable';
import { AdminDocumentsForm } from '../../features/documents/components/AdminDocumentsForm';

export default function AdminDocumentsPage() {
  const navigate = useNavigate();

  // Core state
  const [documents, setDocuments] = useState<SchoolDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingItem, setEditingItem] = useState<SchoolDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await documentApi.getAllDocumentsForAdmin();
      setDocuments(data);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tải danh sách tài liệu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreate = () => {
    setEditingItem(null);
    setView('create');
  };

  const handleEdit = (item: SchoolDocument) => {
    setEditingItem(item);
    setView('edit');
  };

  const handleCancel = () => {
    setView('list');
    setEditingItem(null);
  };

  const handleSave = async (input: CreateDocumentInput) => {
    setIsSaving(true);
    setError(null);
    try {
      if (view === 'edit' && editingItem) {
        // Edit document
        await documentApi.updateDocument(editingItem.id, input);
      } else {
        // Create document
        await documentApi.createDocument(input);
      }
      // Reload and return to list
      await fetchDocuments();
      setView('list');
      setEditingItem(null);
    } catch (err: any) {
      console.error(err);
      throw new Error(err.message || 'Không thể lưu tài liệu. Có lỗi xảy ra.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await documentApi.deleteDocument(id);
      setDocuments(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      console.error(err);
      alert('Không thể xóa tài liệu. Có lỗi xảy ra.');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const updated = await documentApi.publishDocument(id);
      setDocuments(prev => prev.map(item => item.id === id ? updated : item));
    } catch (err: any) {
      console.error(err);
      alert('Không thể xuất bản tài liệu. Có lỗi xảy ra.');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const updated = await documentApi.archiveDocument(id);
      setDocuments(prev => prev.map(item => item.id === id ? updated : item));
    } catch (err: any) {
      console.error(err);
      alert('Không thể lưu trữ tài liệu. Có lỗi xảy ra.');
    }
  };

  // Filter and search logic
  const filteredDocuments = documents.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.file_name && item.file_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6 py-4 font-sans" id="admin-documents-management-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              {view === 'list' && 'Quản lý tài liệu'}
              {view === 'create' && 'Thêm tài liệu mới'}
              {view === 'edit' && 'Chỉnh sửa tài liệu'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {view === 'list' && 'Quản lý, lưu hành, phân loại công văn, kế hoạch, biểu mẫu chính thức của nhà trường.'}
            {view === 'create' && 'Nhập thông tin và tải lên tệp tin tài liệu mới.'}
            {view === 'edit' && 'Cập nhật tài liệu hiện tại và lưu các chỉnh sửa.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {view === 'list' ? (
            <>
              <button
                onClick={fetchDocuments}
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
                <span>Thêm tài liệu</span>
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
      {view === 'list' ? (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tiêu đề hoặc tên file..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-white"
              />
            </div>

            {/* Category & Status Filter */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Danh mục:
                </span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent outline-none text-slate-800 dark:text-white min-w-[110px]"
                >
                  <option value="all">Tất cả</option>
                  <option value="ke_hoach">Kế hoạch</option>
                  <option value="cong_van">Công văn</option>
                  <option value="bieu_mau">Biểu mẫu</option>
                  <option value="quyet_dinh">Quyết định</option>
                  <option value="khac">Khác</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  Trạng thái:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent outline-none text-slate-800 dark:text-white min-w-[100px]"
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Đang tải danh sách tài liệu...</p>
            </div>
          ) : (
            <AdminDocumentsTable
              documents={filteredDocuments}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPublish={handlePublish}
              onArchive={handleArchive}
            />
          )}
        </div>
      ) : (
        <AdminDocumentsForm
          initialData={editingItem}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
