/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CreateNewsInput, NewsItem, NewsStatus } from '../newsTypes';
import { slugify } from '../../../utils/slugify';
import { uploadImage } from '../../../services/storageService';
import { isSupabaseConfigured } from '../../../services/supabaseClient';
import { Image as ImageIcon, Link as LinkIcon, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { NewsCategoryCode, NEWS_CATEGORY_CONFIG } from '../newsCategories';

interface AdminNewsFormProps {
  initialData?: NewsItem | null;
  onSave: (data: CreateNewsInput) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const AdminNewsForm: React.FC<AdminNewsFormProps> = ({
  initialData,
  onSave,
  onCancel,
  isSaving,
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [status, setStatus] = useState<NewsStatus>('draft');
  const [categoryCode, setCategoryCode] = useState<NewsCategoryCode | ''>('');

  const [isSlugManual, setIsSlugManual] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setSlug(initialData.slug || '');
      setSummary(initialData.summary || '');
      setContent(initialData.content || '');
      setThumbnailUrl(initialData.thumbnail_url || '');
      setStatus(initialData.status || 'draft');
      setCategoryCode(initialData.category_code || '');
      setIsSlugManual(true);
    } else {
      setTitle('');
      setSlug('');
      setSummary('');
      setContent('');
      setThumbnailUrl('');
      setStatus('draft');
      setCategoryCode('');
      setIsSlugManual(false);
    }
  }, [initialData]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isSlugManual) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(slugify(e.target.value));
    setIsSlugManual(true);
  };

  const handleRegenerateSlug = () => {
    setSlug(slugify(title));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setImageUploading(true);
    setFormError(null);

    try {
      if (!isSupabaseConfigured) {
        // Mock image upload in development if Supabase not configured
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const mockUrl = URL.createObjectURL(file);
        setThumbnailUrl(mockUrl);
        return;
      }
      const publicUrl = await uploadImage(file, 'news');
      setThumbnailUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Không thể upload ảnh. Vui lòng kiểm tra quyền Storage.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Tiêu đề không được để trống.');
      return;
    }

    if (!slug.trim()) {
      setFormError('Slug không được để trống.');
      return;
    }

    if (!categoryCode) {
      setFormError('Vui lòng chọn chuyên mục bài viết.');
      return;
    }

    const payload: CreateNewsInput = {
      title: title.trim(),
      slug: slug.trim(),
      summary: summary.trim() || null,
      content: content.trim() || null,
      thumbnail_url: thumbnailUrl.trim() || null,
      status,
      category_code: categoryCode,
    };

    try {
      await onSave(payload);
    } catch (err: any) {
      setFormError(err.message || 'Không thể lưu tin tức. Vui lòng kiểm tra lại.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 font-sans">
      {formError && (
        <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed font-semibold">
            {formError}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main fields (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Tiêu đề bài viết <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={handleTitleChange}
              placeholder="Nhập tiêu đề bài viết..."
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Đường dẫn tĩnh (Slug) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleRegenerateSlug}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="h-3 w-3" />
                Tự động tạo
              </button>
            </div>
            <input
              type="text"
              required
              value={slug}
              onChange={handleSlugChange}
              placeholder="vd: dai-hoi-lien-doi-thanh-cong-ruc-ro"
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white font-mono"
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Tóm tắt bài viết
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Mô tả ngắn gọn nội dung bài viết..."
              rows={3}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white resize-y"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Nội dung chi tiết
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung bài viết (hỗ trợ nhập văn bản hoặc HTML)..."
              rows={12}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white resize-y font-sans leading-relaxed"
            />
          </div>
        </div>

        {/* Sidebar settings (Right 1 column) */}
        <div className="space-y-6">
          {/* Status & Actions Box */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-900">
              Trạng thái & Lưu
            </h3>

            {/* Category Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Chuyên mục bài viết <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={categoryCode}
                onChange={(e) => setCategoryCode(e.target.value as NewsCategoryCode | '')}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white font-medium cursor-pointer"
              >
                <option value="">-- Chọn chuyên mục --</option>
                {Object.values(NEWS_CATEGORY_CONFIG).map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {initialData && !initialData.category_code && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl mt-1.5">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                    Bài viết này chưa được phân loại. Vui lòng chọn chuyên mục trước khi lưu.
                  </p>
                </div>
              )}
            </div>

            {/* Status Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Trạng thái xuất bản
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as NewsStatus)}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white"
              >
                <option value="draft">Bản nháp (Draft)</option>
                <option value="published">Xuất bản (Published)</option>
                <option value="archived">Lưu trữ (Archived)</option>
              </select>
            </div>

            {/* Save Buttons */}
            <div className="flex flex-col gap-2 pt-4">
              <button
                type="submit"
                disabled={isSaving || imageUploading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {isSaving ? 'Đang lưu bài viết...' : 'Lưu thay đổi'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-bold text-xs px-4 py-3 rounded-xl transition-colors border border-slate-200 dark:border-slate-800"
              >
                Hủy bỏ
              </button>
            </div>
          </div>

          {/* Thumbnail Settings Box */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-900">
              Ảnh đại diện (Thumbnail)
            </h3>

            {/* Thumbnail Preview */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center space-y-1 p-4 text-center">
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                  <p className="text-[10px] font-medium text-slate-400">Chưa có ảnh đại diện</p>
                </div>
              )}
            </div>

            {/* Option 1: URL input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <LinkIcon className="h-3 w-3 text-slate-400" />
                Dán URL ảnh
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-mono"
              />
            </div>

            {/* Option 2: Upload file */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Upload className="h-3 w-3 text-slate-400" />
                Hoặc tải lên từ máy tính
              </label>
              <div className="relative flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-4 transition-all bg-slate-50/50 dark:bg-slate-900/30">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={imageUploading || isSaving}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="text-center space-y-1">
                  <Upload className="h-4 w-4 text-slate-400 mx-auto" />
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    {imageUploading ? 'Đang tải lên...' : 'Chọn file ảnh'}
                  </p>
                  <p className="text-[9px] text-slate-400">JPG, PNG, WEBP (Tối đa 10MB)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
