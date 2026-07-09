/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Album, AlbumImage } from '../albumTypes';
import { albumApi } from '../albumApi';
import { uploadAlbumImage } from '../../../services/storageService';
import { isSupabaseConfigured } from '../../../services/supabaseClient';
import { Upload, ArrowLeft, Trash2, Check, RefreshCw, AlertCircle, Eye, Star } from 'lucide-react';

interface AdminAlbumImagesPanelProps {
  album: Album;
  onBack: () => void;
  onUpdateAlbumCover: (coverUrl: string) => void;
}

export const AdminAlbumImagesPanel: React.FC<AdminAlbumImagesPanelProps> = ({
  album,
  onBack,
  onUpdateAlbumCover,
}) => {
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Caption edit state
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editCaptionValue, setEditCaptionValue] = useState<string>('');
  const [isSavingCaptionId, setIsSavingCaptionId] = useState<string | null>(null);

  const fetchImages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await albumApi.getAlbumImagesForAdmin(album.id);
      setImages(data);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tải danh sách hình ảnh của album.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [album.id]);

  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    const fileList = Array.from(files) as File[];
    let successCount = 0;

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress(`Đang tải lên ảnh ${i + 1}/${fileList.length}: ${file.name}...`);

        let publicUrl = '';
        if (!isSupabaseConfigured) {
          // Mock upload delay
          await new Promise((resolve) => setTimeout(resolve, 800));
          publicUrl = URL.createObjectURL(file);
        } else {
          const uploadRes = await uploadAlbumImage(file, album.id);
          publicUrl = uploadRes.url;
        }

        // Generate simple caption from filename
        const extIndex = file.name.lastIndexOf('.');
        const cleanName = extIndex !== -1 ? file.name.slice(0, extIndex) : file.name;
        const caption = cleanName.replace(/[-_]/g, ' ');

        // Add to database
        const order = (images.length + successCount + 1) * 10;
        const newImage = await albumApi.addAlbumImage(album.id, {
          image_url: publicUrl,
          caption,
          sort_order: order,
        });

        // If album doesn't have a cover image yet, auto-set this first image as cover
        if (!album.cover_image_url && successCount === 0 && i === 0) {
          try {
            await albumApi.updateAlbum(album.id, { cover_image_url: publicUrl });
            onUpdateAlbumCover(publicUrl);
          } catch (coverErr) {
            console.error('Không thể cập nhật ảnh bìa tự động:', coverErr);
          }
        }

        setImages((prev) => [...prev, newImage]);
        successCount++;
      }
      setUploadProgress('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Có lỗi xảy ra trong quá trình tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    const ok = window.confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi album?');
    if (!ok) return;

    try {
      await albumApi.deleteAlbumImage(imageId);
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err: any) {
      console.error(err);
      alert('Không thể xóa ảnh. Có lỗi xảy ra.');
    }
  };

  const handleSetCover = async (imageUrl: string) => {
    try {
      await albumApi.updateAlbum(album.id, { cover_image_url: imageUrl });
      onUpdateAlbumCover(imageUrl);
      alert('Đã cập nhật ảnh bìa cho album thành công!');
    } catch (err: any) {
      console.error(err);
      alert('Không thể cập nhật ảnh bìa. Vui lòng thử lại.');
    }
  };

  const startEditCaption = (img: AlbumImage) => {
    setEditingImageId(img.id);
    setEditCaptionValue(img.caption || '');
  };

  const handleSaveCaption = async (imgId: string) => {
    setIsSavingCaptionId(imgId);
    try {
      const updated = await albumApi.updateAlbumImage(imgId, {
        caption: editCaptionValue.trim() || null,
      });
      setImages((prev) => prev.map((img) => (img.id === imgId ? updated : img)));
      setEditingImageId(null);
    } catch (err) {
      console.error(err);
      alert('Không thể lưu lời bình của ảnh.');
    } finally {
      setIsSavingCaptionId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              Tên Album hiện tại
            </h2>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1" title={album.title}>
              {album.title}
            </h1>
          </div>
        </div>

        {/* Upload Multiple input */}
        <div className="relative shrink-0">
          <button
            disabled={isUploading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" />
            <span>Tải lên hình ảnh</span>
          </button>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleMultipleFilesUpload}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Progress / Status / Error alerts */}
      {isUploading && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl animate-pulse">
          <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
          <p className="text-xs text-blue-800 dark:text-blue-400 font-semibold">
            {uploadProgress}
          </p>
        </div>
      )}

      {error && (
        <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed font-semibold">
            {error}
          </p>
        </div>
      )}

      {/* Main Grid Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Đang tải danh sách ảnh trong album...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-2">
          <Upload className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Album này chưa có hình ảnh nào.</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Nhấp nút "Tải lên hình ảnh" ở góc trên bên phải để chọn một hoặc nhiều ảnh từ máy tính để thêm vào album.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((img) => {
            const isCover = album.cover_image_url === img.image_url;
            const isEditing = editingImageId === img.id;
            const isSavingCaption = isSavingCaptionId === img.id;

            return (
              <div
                key={img.id}
                className={`group bg-white dark:bg-slate-950 border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  isCover
                    ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Image Wrap */}
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900 overflow-hidden">
                  <img
                    src={img.image_url}
                    alt={img.caption || 'Ảnh album'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badges on overlay */}
                  {isCover && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-[9px] font-bold rounded-lg shadow-sm">
                      <Star className="h-3 w-3 fill-white" />
                      <span>Ảnh bìa</span>
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Make Cover action if not already cover */}
                    {!isCover && (
                      <button
                        onClick={() => handleSetCover(img.image_url)}
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 rounded-lg shadow-sm"
                        title="Đặt làm ảnh bìa album"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* View full URL */}
                    <a
                      href={img.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 rounded-lg shadow-sm"
                      title="Xem ảnh cỡ lớn"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </a>

                    {/* Delete Image */}
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm"
                      title="Xóa hình ảnh"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Info & Caption Edit Wrap */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-900 flex-1 flex flex-col justify-between gap-2.5">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={editCaptionValue}
                        onChange={(e) => setEditCaptionValue(e.target.value)}
                        placeholder="Lời bình của ảnh..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCaption(img.id);
                          if (e.key === 'Escape') setEditingImageId(null);
                        }}
                      />
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setEditingImageId(null)}
                          className="px-2 py-0.5 text-[9px] text-slate-500 hover:text-slate-800 dark:text-slate-400 rounded"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleSaveCaption(img.id)}
                          disabled={isSavingCaption}
                          className="px-2 py-0.5 bg-blue-600 text-white text-[9px] rounded font-bold hover:bg-blue-700 flex items-center gap-1"
                        >
                          {isSavingCaption ? (
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <Check className="h-2.5 w-2.5" />
                          )}
                          <span>Lưu</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p
                        onClick={() => startEditCaption(img)}
                        className="text-[11px] font-bold text-slate-800 dark:text-slate-300 leading-tight line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                        title="Click để sửa lời bình"
                      >
                        {img.caption || <span className="italic text-slate-400 font-normal">Chưa có lời bình (click để viết)</span>}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono">
                        Thứ tự: {img.sort_order}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
