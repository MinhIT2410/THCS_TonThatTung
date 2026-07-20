/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, AlertCircle, RefreshCw, Save, FolderOpen } from 'lucide-react';

interface DocumentsBlockEditorProps {
  title: string;
  pageKey: string;
  blockKey: string;
  defaultData: any;
  overrideData: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function DocumentsBlockEditor({
  title,
  defaultData,
  overrideData,
  onClose,
  onSave,
}: DocumentsBlockEditorProps) {
  const [formData, setFormData] = useState({
    eyebrow: overrideData?.eyebrow ?? defaultData?.eyebrow ?? 'Học tập & Nghiệp vụ',
    title: overrideData?.title ?? defaultData?.title ?? 'Văn bản - Tài liệu nổi bật',
    description: overrideData?.description ?? defaultData?.description ?? 'Học sinh và phụ huynh có thể tra cứu nhanh các văn bản, kế hoạch thi đua mới của Liên đội.',
    buttonLabel: overrideData?.buttonLabel ?? defaultData?.buttonLabel ?? 'Xem tất cả văn bản',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Build precise delta (only changed fields)
    const delta: any = {};
    const fields: (keyof typeof formData)[] = ['eyebrow', 'title', 'description', 'buttonLabel'];

    fields.forEach(field => {
      if (formData[field] !== defaultData?.[field]) {
        delta[field] = formData[field];
      }
    });

    try {
      await onSave(delta);
      onClose();
    } catch (err: any) {
      console.error('Failed to save documents block config:', err);
      setError(err?.message || 'Không thể lưu cấu hình khối.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 px-6 py-4">
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
              Cấu hình: {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start space-x-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm leading-relaxed">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Eyebrow field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Nhãn nhỏ (Eyebrow - Max 50 ký tự)
              </label>
              <input
                type="text"
                maxLength={50}
                value={formData.eyebrow}
                onChange={e => setFormData(prev => ({ ...prev, eyebrow: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Ví dụ: Học tập & Nghiệp vụ"
                required
              />
            </div>

            {/* Title field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tiêu đề khối (Title - Max 100 ký tự)
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Ví dụ: Văn bản - Tài liệu nổi bật"
                required
              />
            </div>

            {/* Description field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Mô tả ngắn (Description - Max 250 ký tự)
              </label>
              <textarea
                maxLength={250}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Nhập mô tả ngắn..."
                required
              />
            </div>

            {/* Button Label field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Chữ trên nút bấm (Button Label - Max 40 ký tự)
              </label>
              <input
                type="text"
                maxLength={40}
                value={formData.buttonLabel}
                onChange={e => setFormData(prev => ({ ...prev, buttonLabel: e.target.value }))}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Ví dụ: Xem tất cả văn bản"
                required
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-950 rounded-xl transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-5 py-2.5 text-xs font-bold text-white shadow-lg active:scale-[0.98] transition-all cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
