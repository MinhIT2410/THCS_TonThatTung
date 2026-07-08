/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { storageService } from '../../services/storageService';
import { galleryService } from '../../services/galleryService';

interface MultiImageUploadFieldProps {
  albumId: number;
  onUploaded: () => void;
  disabled?: boolean;
}

export const MultiImageUploadField: React.FC<MultiImageUploadFieldProps> = ({
  albumId,
  onUploaded,
  disabled = false,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedCount, setSelectedCount] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number>(0);

  const handleButtonClick = () => {
    if (disabled || isUploading) return;
    if (!albumId) {
      alert('Vui lòng chọn album trước khi tải ảnh.');
      return;
    }
    if (!user) {
      alert('Bạn cần đăng nhập để tải ảnh.');
      return;
    }
    fileInputRef.current?.click();
  };

  const cleanTitleFromFilename = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf('.');
    let name = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
    // Replace hyphens and underscores with spaces, capitalize words roughly
    name = name.replace(/[-_]/g, ' ');
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!user) {
      setErrors(['Bạn cần đăng nhập để thực hiện tác vụ này.']);
      return;
    }

    const fileList = Array.from(files) as File[];
    setSelectedCount(fileList.length);
    setIsUploading(true);
    setErrors([]);
    setSuccessCount(0);
    setProgressText(`Đầu tiên kiểm tra các file ảnh...`);

    let loadedCount = 0;
    let localErrors: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setProgressText(`Đang tải lên ${i + 1}/${fileList.length} ảnh: ${file.name}`);

      // Validate individual file
      const validationError = storageService.validateImageFile(file);
      if (validationError) {
        localErrors.push(`File "${file.name}": ${validationError}`);
        continue;
      }

      try {
        // 1. Upload to Supabase Storage
        const publicUrl = await storageService.uploadImage(file, 'gallery/images');

        // 2. Create entry in school.gallery_images
        const cleanTitle = cleanTitleFromFilename(file.name);
        const { error: dbError } = await galleryService.createImage({
          album_id: albumId,
          image_url: publicUrl,
          title: cleanTitle,
          description: '',
          alt_text: file.name,
          sort_order: i + 1, // Order based on selected order
          is_featured: false,
        }, user.id);

        if (dbError) {
          throw new Error(`Không thể lưu thông tin ảnh vào database: ${dbError.message}`);
        }

        loadedCount++;
        setSuccessCount(loadedCount);
      } catch (err: any) {
        console.error(`Error uploading file ${file.name}:`, err);
        localErrors.push(`File "${file.name}": ${err.message || 'Lỗi không định danh'}`);
      }
    }

    setIsUploading(false);
    setErrors(localErrors);
    
    if (loadedCount > 0) {
      onUploaded();
    }

    // Reset input file to allow re-uploading same files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl space-y-3 text-xs font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h4 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <ImageIcon className="h-4 w-4 text-blue-500" />
            <span>Tải nhiều ảnh lên cùng lúc</span>
          </h4>
          <p className="text-[10px] text-slate-500">
            Chọn nhiều tệp ảnh (JPEG, PNG, WEBP, GIF, tối đa 10MB/ảnh) từ thiết bị của bạn để đăng nhanh.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={handleButtonClick}
          className="flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors whitespace-nowrap text-xs self-start sm:self-center disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Chọn nhiều ảnh</span>
            </>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />
      </div>

      {/* Progress / Status display */}
      {isUploading && (
        <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 p-3 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-blue-700 dark:text-blue-400">
            <span className="flex items-center space-x-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{progressText}</span>
            </span>
            <span>
              {successCount} / {selectedCount} thành công
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${(successCount / selectedCount) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Success summary */}
      {!isUploading && successCount > 0 && (
        <div className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/15 p-2 rounded-xl">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Đã đăng thành công {successCount} hình ảnh vào album!</span>
        </div>
      )}

      {/* Failures / Errors summary */}
      {!isUploading && errors.length > 0 && (
        <div className="space-y-1.5 bg-red-50 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 p-3 rounded-xl">
          <div className="flex items-center space-x-1.5 text-red-700 dark:text-red-400 font-bold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Có {errors.length} lỗi xảy ra trong quá trình tải lên:</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-red-600 dark:text-red-400 text-[10px] max-h-24 overflow-y-auto">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
