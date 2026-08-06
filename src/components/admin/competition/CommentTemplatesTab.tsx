/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Check,
  MessageSquare,
  Filter,
} from 'lucide-react';
import { competitionService } from '../../../services/competitionService';
import {
  CompetitionCommentTemplate,
  CommentType,
  COMMENT_TYPE_LABELS,
} from '../../../types/competition';

export default function CommentTemplatesTab() {
  const [canManage, setCanManage] = useState<boolean>(false);
  const [checkingPermission, setCheckingPermission] = useState<boolean>(true);

  // Data state
  const [templates, setTemplates] = useState<CompetitionCommentTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<CompetitionCommentTemplate> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deletingTemplate, setDeletingTemplate] = useState<CompetitionCommentTemplate | null>(null);

  // Shared UI States
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check management permissions
  useEffect(() => {
    async function initPermissions() {
      setCheckingPermission(true);
      try {
        const isAllowed = await competitionService.canManageCompetition();
        setCanManage(isAllowed);
      } catch (err) {
        console.error('Error checking competition permissions:', err);
        setCanManage(false);
      } finally {
        setCheckingPermission(false);
      }
    }
    initPermissions();
  }, []);

  // Fetch templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await competitionService.getCommentTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error('Error loading comment templates:', err);
      showToast('error', err.message || 'Lỗi khi tải danh sách mẫu nhận xét');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Format code helper: transforms raw user string to uppercase alphanumeric with underscore
  const formatCodeInput = (val: string): string => {
    return val
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .replace(/_+/g, '_');
  };

  // Filtered & Sorted list
  const filteredTemplates = useMemo(() => {
    return templates
      .filter((item) => {
        const matchesType = typeFilter === 'ALL' || item.comment_type === typeFilter;
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          item.code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q);
        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (a.display_order !== b.display_order) {
          return a.display_order - b.display_order;
        }
        return a.title.localeCompare(b.title, 'vi');
      });
  }, [templates, typeFilter, searchQuery]);

  // Open modal for new item
  const openModalForCreate = () => {
    const nextOrder = templates.length > 0 ? Math.max(...templates.map((t) => t.display_order || 0)) + 10 : 10;
    setEditingTemplate({
      code: '',
      title: '',
      content: '',
      comment_type: 'PRAISE',
      display_order: nextOrder,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const openModalForEdit = (template: CompetitionCommentTemplate) => {
    setEditingTemplate({ ...template });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormError(null);
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setFormError(null);

    const code = (editingTemplate.code || '').trim().toUpperCase();
    const title = (editingTemplate.title || '').trim();
    const content = (editingTemplate.content || '').trim();
    const commentType = editingTemplate.comment_type;
    const displayOrder = Number(editingTemplate.display_order);

    // Validation checks
    if (!code) {
      setFormError('Mã nhận xét là bắt buộc.');
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(code)) {
      setFormError('Mã nhận xét chỉ được chứa các ký tự in hoa (A-Z), số (0-9) và dấu gạch dưới (_).');
      return;
    }
    if (!title) {
      setFormError('Tiêu đề nhận xét là bắt buộc.');
      return;
    }
    if (!content) {
      setFormError('Nội dung nhận xét là bắt buộc.');
      return;
    }
    if (!commentType || !['PRAISE', 'VIOLATION', 'NEUTRAL'].includes(commentType)) {
      setFormError('Vui lòng chọn loại nhận xét hợp lệ.');
      return;
    }
    if (isNaN(displayOrder) || displayOrder < 0) {
      setFormError('Thứ tự hiển thị phải là số nguyên không âm.');
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate.id) {
        // Update
        await competitionService.updateCommentTemplate(editingTemplate.id, {
          code,
          title,
          content,
          comment_type: commentType,
          display_order: Math.floor(displayOrder),
        });
        showToast('success', 'Cập nhật mẫu nhận xét thành công.');
      } else {
        // Create
        await competitionService.createCommentTemplate({
          code,
          title,
          content,
          comment_type: commentType,
          display_order: Math.floor(displayOrder),
        });
        showToast('success', 'Thêm mới mẫu nhận xét thành công.');
      }
      closeModal();
      await fetchTemplates();
    } catch (err: any) {
      console.error('Error saving comment template:', err);
      setFormError(err.message || 'Không thể lưu mẫu nhận xét. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deletingTemplate) return;

    setSaving(true);
    try {
      await competitionService.deleteCommentTemplate(deletingTemplate.id);
      showToast('success', `Đã xóa mẫu nhận xét "${deletingTemplate.title}".`);
      setDeletingTemplate(null);
      await fetchTemplates();
    } catch (err: any) {
      console.error('Error deleting comment template:', err);
      showToast('error', err.message || 'Không thể xóa mẫu nhận xét.');
    } finally {
      setSaving(false);
    }
  };

  const getBadgeStyle = (type: CommentType) => {
    switch (type) {
      case 'PRAISE':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'VIOLATION':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'NEUTRAL':
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <Check className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <p className="text-xs font-semibold">{toast.text}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Controls Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Quản lý mẫu nhận xét
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Danh sách mẫu nhận xét dùng cho đánh giá thi đua chi đội.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchTemplates}
              disabled={loading}
              className="p-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {canManage && (
              <button
                type="button"
                onClick={openModalForCreate}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-md shadow-red-600/20 flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm nhận xét</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo mã, tiêu đề, nội dung..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-500 dark:focus:border-red-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                typeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('PRAISE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                typeFilter === 'PRAISE'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tuyên dương
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('VIOLATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                typeFilter === 'VIOLATION'
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Vi phạm
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('NEUTRAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                typeFilter === 'NEUTRAL'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Trung tính
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-red-600 dark:text-red-400" />
            <p className="text-xs font-medium">Đang tải danh sách mẫu nhận xét...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Không tìm thấy mẫu nhận xét nào
            </p>
            <p className="text-xs max-w-sm mx-auto">
              {searchQuery || typeFilter !== 'ALL'
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                : 'Nhấn nút "Thêm nhận xét" để tạo mẫu nhận xét mới.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4 w-20 text-center">Thứ tự</th>
                  <th className="py-3.5 px-4 w-44">Mã</th>
                  <th className="py-3.5 px-4 w-52">Tiêu đề</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Nội dung</th>
                  <th className="py-3.5 px-4 w-36">Loại</th>
                  <th className="py-3.5 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Display Order */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-600 dark:text-slate-400">
                      {template.display_order}
                    </td>

                    {/* Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {template.code}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {template.title}
                    </td>

                    {/* Content */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                      {template.content}
                    </td>

                    {/* Comment Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getBadgeStyle(
                          template.comment_type
                        )}`}
                      >
                        {COMMENT_TYPE_LABELS[template.comment_type] || template.comment_type}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {canManage ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openModalForEdit(template)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                            title="Sửa mẫu nhận xét"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingTemplate(template)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                            title="Xóa mẫu nhận xét"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Chỉ xem</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {editingTemplate.id ? 'Chỉnh sửa mẫu nhận xét' : 'Thêm mẫu nhận xét mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Code */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mã nhận xét <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingTemplate.code || ''}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      code: formatCodeInput(e.target.value),
                    })
                  }
                  placeholder="Ví dụ: PRAISE_GOOD_DISCIPLINE"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 dark:focus:border-red-400 transition-colors uppercase"
                  required
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  In hoa (A-Z), số (0-9) và dấu gạch dưới (_). Tự động chuẩn hóa.
                </p>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tiêu đề <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingTemplate.title || ''}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      title: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: Nề nếp tốt"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 dark:focus:border-red-400 transition-colors font-medium"
                  required
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nội dung nhận xét <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editingTemplate.content || ''}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      content: e.target.value,
                    })
                  }
                  placeholder="Ví dụ: Chi đội thực hiện tốt nề nếp và nội quy trong tuần."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 dark:focus:border-red-400 transition-colors"
                  required
                />
              </div>

              {/* Comment Type & Display Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Loại nhận xét <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingTemplate.comment_type || 'PRAISE'}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        comment_type: e.target.value as CommentType,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 dark:focus:border-red-400 transition-colors"
                  >
                    <option value="PRAISE">Tuyên dương</option>
                    <option value="VIOLATION">Vi phạm</option>
                    <option value="NEUTRAL">Trung tính</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={editingTemplate.display_order ?? 0}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        display_order: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-red-500 dark:focus:border-red-400 transition-colors"
                  />
                </div>
              </div>

              {/* Submit / Cancel Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-md shadow-red-600/20 flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTemplate.id ? 'Lưu thay đổi' : 'Thêm mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Xác nhận xóa mẫu nhận xét
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Bạn có chắc chắn muốn xóa mẫu nhận xét{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    "{deletingTemplate.code} - {deletingTemplate.title}"
                  </span>
                  ? Thao tác này sẽ xóa hoàn toàn và không thể hoàn tác.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingTemplate(null)}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 transition-colors"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-md shadow-rose-600/20 flex items-center gap-2"
              >
                {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xóa mẫu nhận xét</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
