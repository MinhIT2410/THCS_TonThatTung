import React, { useRef, useState } from 'react';
import { Upload, Image, Link, Loader2, AlertCircle } from 'lucide-react';
import { storageService } from '../../services/storageService';

interface ImageUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value = '',
  onChange,
  folder = 'uploads',
  label,
  placeholder = 'Đường dẫn hình ảnh (URL)...',
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleButtonClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsUploading(true);

    try {
      const publicUrl = await storageService.uploadImage(file, folder);
      onChange(publicUrl);
    } catch (err: any) {
      console.error('File upload error:', err);
      setErrorMsg(err.message || 'Có lỗi xảy ra khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
      // Reset file input value to allow uploading same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
            onChange={(e) => {
              onChange(e.target.value);
              setErrorMsg(null);
            }}
            placeholder={placeholder}
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
              <span>Chọn ảnh</span>
            </>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp,image/gif"
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

      {/* Preview Section */}
      {value && !errorMsg && (
        <div className="relative group w-32 aspect-video sm:w-40 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => {
              // Ignore preview if URL is invalid, but don't clear the field
            }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] text-white font-semibold bg-black/60 px-1.5 py-0.5 rounded-sm">Xem trước</span>
          </div>
        </div>
      )}
    </div>
  );
};
