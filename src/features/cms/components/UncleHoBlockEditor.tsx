/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, AlertCircle, RefreshCw, Save, Landmark } from 'lucide-react';

interface UncleHoBlockEditorProps {
  title: string;
  pageKey: string;
  blockKey: string;
  defaultData: any;
  overrideData: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function UncleHoBlockEditor({
  title,
  defaultData,
  overrideData,
  onClose,
  onSave,
}: UncleHoBlockEditorProps) {
  const [formData, setFormData] = useState({
    eyebrow: overrideData?.eyebrow ?? defaultData?.eyebrow ?? 'Phòng truyền thống',
    title: overrideData?.title ?? defaultData?.title ?? 'Bác Hồ Với Thiếu Niên Nhi Đồng',
    description: overrideData?.description ?? defaultData?.description ?? '',
    rule1: overrideData?.rule1 ?? defaultData?.rule1 ?? '',
    rule2: overrideData?.rule2 ?? defaultData?.rule2 ?? '',
    rule3: overrideData?.rule3 ?? defaultData?.rule3 ?? '',
    rule4: overrideData?.rule4 ?? defaultData?.rule4 ?? '',
    rule5: overrideData?.rule5 ?? defaultData?.rule5 ?? '',
    imageUrl: overrideData?.imageUrl ?? defaultData?.imageUrl ?? '',
    imageCaption: overrideData?.imageCaption ?? defaultData?.imageCaption ?? '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Build precise delta (only changed fields)
    const delta: any = {};
    const fields: (keyof typeof formData)[] = [
      'eyebrow', 'title', 'description', 
      'rule1', 'rule2', 'rule3', 'rule4', 'rule5',
      'imageUrl', 'imageCaption'
    ];

    fields.forEach(field => {
      if (formData[field] !== defaultData?.[field]) {
        delta[field] = formData[field];
      }
    });

    try {
      await onSave(delta);
      onClose();
    } catch (err: any) {
      console.error('Failed to save Uncle Ho block config:', err);
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
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 px-6 py-4 shrink-0">
          <div className="flex items-center space-x-2">
            <Landmark className="h-5 w-5 text-red-600 dark:text-red-400" />
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

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start space-x-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm leading-relaxed">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  placeholder="Ví dụ: Phòng truyền thống"
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
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  placeholder="Ví dụ: Bác Hồ Với Thiếu Niên Nhi Đồng"
                  required
                />
              </div>
            </div>

            {/* Description field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Nội dung mô tả (Mục giới thiệu chính)
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                placeholder="Nhập nội dung mô tả chi tiết..."
                required
              />
            </div>

            {/* 5 Rules Section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Nội dung 5 điều Bác Hồ dạy
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {[1, 2, 3, 4, 5].map(num => {
                  const key = `rule${num}` as 'rule1' | 'rule2' | 'rule3' | 'rule4' | 'rule5';
                  return (
                    <div key={num} className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0 w-6">
                        #{num}
                      </span>
                      <input
                        type="text"
                        value={formData[key]}
                        onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        placeholder={`Điều ${num}...`}
                        required
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Image section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Ảnh minh họa bên phải
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Đường dẫn ảnh (URL)
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={e => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="https://images.unsplash.com/..."
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Chú thích ảnh
                  </label>
                  <input
                    type="text"
                    value={formData.imageCaption}
                    onChange={e => setFormData(prev => ({ ...prev, imageCaption: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    placeholder="Bác Hồ phát kẹo cho các cháu..."
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-850 shrink-0">
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
              className="flex items-center space-x-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-800 px-5 py-2.5 text-xs font-bold text-white shadow-lg active:scale-[0.98] transition-all cursor-pointer"
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
