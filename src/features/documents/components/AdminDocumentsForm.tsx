/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CreateDocumentInput, SchoolDocument, DocumentCategory, DocumentStatus } from '../documentTypes';
import { uploadDocument } from '../../../services/storageService';
import { isSupabaseConfigured } from '../../../services/supabaseClient';
import { formatFileSize } from '../../../utils/formatFileSize';
import { FileText, Link as LinkIcon, Upload, AlertCircle, HardDrive, RefreshCw } from 'lucide-react';

interface AdminDocumentsFormProps {
  initialData?: SchoolDocument | null;
  onSave: (data: CreateDocumentInput) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: 'ke_hoach', label: 'Kế hoạch' },
  { value: 'cong_van', label: 'Công văn' },
  { value: 'bieu_mau', label: 'Biểu mẫu' },
  { value: 'quyet_dinh', label: 'Quyết định' },
  { value: 'khac', label: 'Khác' },
];

export const AdminDocumentsForm: React.FC<AdminDocumentsFormProps> = ({
  initialData,
  onSave,
  onCancel,
  isSaving,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('khac');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [status, setStatus] = useState<DocumentStatus>('draft');

  const [fileUploading, setFileUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setCategory(initialData.category || 'khac');
      setFileUrl(initialData.file_url || '');
      setFileName(initialData.file_name || '');
      setFileSize(initialData.file_size !== undefined ? initialData.file_size : null);
      setMimeType(initialData.mime_type || null);
      setStatus(initialData.status || 'draft');
    } else {
      setTitle('');
      setDescription('');
      setCategory('khac');
      setFileUrl('');
      setFileName('');
      setFileSize(null);
      setMimeType(null);
      setStatus('draft');
    }
  }, [initialData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileUploading(true);
    setFormError(null);

    try {
      if (!isSupabaseConfigured) {
        // Mock upload in development if Supabase not configured
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setFileUrl(URL.createObjectURL(file));
        setFileName(file.name);
        setFileSize(file.size);
        setMimeType(file.type || 'application/pdf');
        return;
      }
      const res = await uploadDocument(file, 'documents');
      setFileUrl(res.url);
      setFileName(res.fileName);
      setFileSize(res.fileSize);
      setMimeType(res.fileType);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Không thể upload file. Vui lòng kiểm tra lại cấu hình Storage.');
    } finally {
      setFileUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Tiêu đề tài liệu không được để trống.');
      return;
    }

    if (!fileUrl.trim()) {
      setFormError('Vui lòng tải lên tài liệu hoặc nhập đường dẫn file (URL).');
      return;
    }

    const payload: CreateDocumentInput = {
      title: title.trim(),
      description: description.trim() || null,
      category,
      file_url: fileUrl.trim(),
      file_name: fileName.trim() || null,
      file_size: fileSize,
      mime_type: mimeType,
      status,
    };

    try {
      await onSave(payload);
    } catch (err: any) {
      setFormError(err.message || 'Không thể lưu tài liệu. Vui lòng kiểm tra lại.');
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
        {/* Main Form Fields (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Tiêu đề tài liệu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="vd: Kế hoạch năm học 2025 - 2026..."
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Mô tả tóm tắt
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả ngắn gọn về tài liệu này (nếu có)..."
              rows={4}
              className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white resize-y"
            />
          </div>

          {/* Document File details if loaded */}
          {(fileName || fileSize) && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-150 dark:border-slate-800 flex items-center gap-3.5">
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-0.5 overflow-hidden">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate" title={fileName}>
                  {fileName || 'Tài liệu đã chọn'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {formatFileSize(fileSize)} {mimeType ? `• ${mimeType}` : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Configurations (Right 1 column) */}
        <div className="space-y-6">
          {/* Status, Category & Save actions */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-900">
              Thiết lập & Lưu
            </h3>

            {/* Category Select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Danh mục tài liệu <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 dark:text-white"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Select */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Trạng thái xuất bản
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
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
                disabled={isSaving || fileUploading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {isSaving ? 'Đang lưu tài liệu...' : 'Lưu tài liệu'}
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

          {/* File Upload / URL Source */}
          <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-900">
              Đính kèm tệp tin
            </h3>

            {/* Upload form container */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Upload className="h-3 w-3 text-slate-400" />
                Tải lên từ máy tính
              </label>
              <div className="relative flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-5 transition-all bg-slate-50/50 dark:bg-slate-900/30">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileUpload}
                  disabled={fileUploading || isSaving}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="text-center space-y-1">
                  <HardDrive className="h-5 w-5 text-slate-400 mx-auto" />
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    {fileUploading ? 'Đang tải lên...' : 'Chọn file tài liệu'}
                  </p>
                  <p className="text-[9px] text-slate-400">PDF, Word, Excel, PPT (Tối đa 20MB)</p>
                </div>
              </div>
            </div>

            {/* Manual URL input option */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-900">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <LinkIcon className="h-3 w-3 text-slate-400" />
                Hoặc nhập URL trực tiếp
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => {
                  setFileUrl(e.target.value);
                  // Extract simple file name from URL if possible
                  if (e.target.value) {
                    try {
                      const urlObj = new URL(e.target.value);
                      const pathname = urlObj.pathname;
                      const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1);
                      if (lastSegment && lastSegment.includes('.')) {
                        setFileName(decodeURIComponent(lastSegment));
                      } else {
                        setFileName('tai-lieu-lien-ket.pdf');
                      }
                    } catch (_) {
                      setFileName('tai-lieu-lien-ket.pdf');
                    }
                  }
                }}
                placeholder="https://example.com/file.pdf"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
