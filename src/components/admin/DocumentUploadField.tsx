/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, FileText, Link, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { storageService } from '../../services/storageService';

interface DocumentUploadData {
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

interface DocumentUploadFieldProps {
  value?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  onChange: (data: DocumentUploadData) => void;
  label?: string;
  disabled?: boolean;
}

export const DocumentUploadField: React.FC<DocumentUploadFieldProps> = ({
  value = '',
  fileName = '',
  fileType = '',
  fileSize = 0,
  onChange,
  label,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleButtonClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtensionLabel = (type: string, name: string): string => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('msword')) return 'Word';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'Excel';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'PowerPoint';
    
    // Fallback based on filename
    const ext = name.split('.').pop()?.toUpperCase();
    return ext ? `${ext}` : 'Tài liệu';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsUploading(true);

    try {
      const uploadResult = await storageService.uploadDocument(file, 'documents');
      onChange({
        file_url: uploadResult.url,
        file_name: uploadResult.fileName,
        file_type: uploadResult.fileType,
        file_size: uploadResult.fileSize,
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      setErrorMsg(err.message || 'Có lỗi xảy ra khi tải tệp lên.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlChange = (url: string) => {
    setErrorMsg(null);
    
    // Guess file name from URL if possible
    let name = 'Tai-lieu-nhap-tay';
    try {
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        name = decodeURIComponent(lastPart);
      }
    } catch (e) {}

    // Guess file type based on extension
    let type = 'application/octet-stream';
    if (url.endsWith('.pdf')) type = 'application/pdf';
    else if (url.endsWith('.doc')) type = 'application/msword';
    else if (url.endsWith('.docx')) type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (url.endsWith('.xls')) type = 'application/vnd.ms-excel';
    else if (url.endsWith('.xlsx')) type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (url.endsWith('.ppt')) type = 'application/vnd.ms-powerpoint';
    else if (url.endsWith('.pptx')) type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    onChange({
      file_url: url,
      file_name: name,
      file_type: type,
      file_size: 0, // Unknown
    });
  };

  return (
    <div className="space-y-2 text-xs font-sans">
      {label && (
        <label className="block font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Link className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={value}
            disabled={disabled || isUploading}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Đường dẫn tệp tin (URL)..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 pl-9 pr-3 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-900 transition-all"
          />
        </div>

        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={handleButtonClick}
          className="flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-bold transition-all whitespace-nowrap min-w-[120px] disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Đang tải...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Chọn file</span>
            </>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />
      </div>

      {errorMsg && (
        <div className="flex items-center space-x-1.5 text-red-600 dark:text-red-400 text-[11px] font-medium bg-red-50 dark:bg-red-950/10 p-2 rounded-lg">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* File details container */}
      {value && !errorMsg && (
        <div className="flex items-start space-x-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-3 rounded-xl shadow-xs">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate" title={fileName}>
              {fileName || 'Tài liệu đã liên kết'}
            </p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-500 font-medium">
              <span className="bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-sm uppercase font-bold text-[9px]">
                {getFileExtensionLabel(fileType, fileName)}
              </span>
              {fileSize > 0 && (
                <span>Dung lượng: {formatFileSize(fileSize)}</span>
              )}
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-0.5">
                <CheckCircle className="h-3 w-3 inline" />
                <span>Đã liên kết</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
