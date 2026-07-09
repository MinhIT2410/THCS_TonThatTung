/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CreateAlbumInput, Album, AlbumStatus } from '../albumTypes';
import { uploadImage } from '../../../services/storageService';
import { isSupabaseConfigured } from '../../../services/supabaseClient';
import { FileText, Link as LinkIcon, Upload, AlertCircle, HardDrive, Image as ImageIcon } from 'lucide-react';

interface AdminAlbumsFormProps {
  initialData?: Album | null;
  onSave: (data: CreateAlbumInput) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const AdminAlbumsForm: React.FC<AdminAlbumsFormProps> = ({
  initialData,
  onSave,
  onCancel,
  isSaving,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [status, setStatus] = useState<AlbumStatus>('draft');

  const [uploadingCover, setUploadingCover] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setCoverImageUrl(initialData.cover_image_url || '');
      setStatus(initialData.status || 'draft');
    } else {
      setTitle('');
      setDescription('');
      setCoverImageUrl('');
      setStatus('draft');
    }
  }, [initialData]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingCover(true);
    setFormError(null);

    try {
      if (!isSupabaseConfigured) {
        // Mock in development
        await new Promise((resolve) => setTimeout(resolve, 800));
        setCoverImageUrl(URL.createObjectURL(file));
        return;
      }
      const publicUrl = await uploadImage(file, 'albums/covers');
      setCoverImageUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Không thể upload ảnh bìa. Vui lòng kiểm tra lại định dạng file (JPEG, PNG, WEBP, GIF < 10MB).');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Tiêu đề album không được để trống.');
      return;
    }

    const payload: CreateAlbumInput = {
      title: title.trim(),
      description: description.trim() || null,
      cover_image_url: coverImageUrl.trim() || null,
      status,
    };

    try {
      await onSave(payload);
    } catch (err: any) {
      setFormError(err.message || 'Không thể lưu album. Vui lòng thử lại.');
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
        {/* Main Details (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Tiêu đề Album <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="vd: Hoạt động trải nghiệm sáng tạo học sinh khối 6..."
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Mô tả chi tiết / Lời bình
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả ngắn gọn về album ảnh (nếu có)..."
              rows={5}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white resize-y"
            />
          </div>
        </div>

        {/* Media & Meta (Right 1 column) */}
        <div className="space-y-6">
          {/* Setting Status & Actions */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-900">
              Thiết lập & Lưu
            </h3>

            {/* Status Select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Trạng thái hoạt động
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AlbumStatus)}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white"
              >
                <option value="draft">Bản nháp (Draft)</option>
                <option value="published">Xuất bản (Published)</option>
                <option value="archived">Lưu trữ (Archived)</option>
              </select>
            </div>

            {/* Actions Buttons */}
            <div className="flex flex-col gap-2 pt-4">
              <button
                type="submit"
                disabled={isSaving || uploadingCover}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {isSaving ? 'Đang lưu album...' : 'Lưu thông tin'}
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

          {/* Cover image selector */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-900">
              Ảnh bìa Album
            </h3>

            {/* Cover image preview if available */}
            {coverImageUrl && (
              <div className="relative group rounded-xl overflow-hidden border border-slate-150 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-video">
                <img
                  src={coverImageUrl}
                  alt="Ảnh bìa xem trước"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-[10px] font-bold"
                >
                  Xóa ảnh
                </button>
              </div>
            )}

            {/* Drag and Drop File Upload for cover */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Upload className="h-3 w-3 text-slate-400" />
                Tải lên ảnh bìa mới
              </label>
              <div className="relative flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-5 transition-all bg-slate-50/50 dark:bg-slate-900/30">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover || isSaving}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="text-center space-y-1">
                  <HardDrive className="h-5 w-5 text-slate-400 mx-auto" />
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    {uploadingCover ? 'Đang tải lên...' : 'Chọn file ảnh bìa'}
                  </p>
                  <p className="text-[9px] text-slate-400">JPEG, PNG, WEBP, GIF (Tối đa 10MB)</p>
                </div>
              </div>
            </div>

            {/* Cover URL manual input */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-900">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <LinkIcon className="h-3 w-3 text-slate-400" />
                Hoặc nhập URL ảnh đại diện trực tiếp
              </label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/cover-image.jpg"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
