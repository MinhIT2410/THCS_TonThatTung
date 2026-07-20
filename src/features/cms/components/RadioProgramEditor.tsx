/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Upload, 
  AlertCircle, 
  RefreshCw, 
  Save, 
  Play, 
  Pause, 
  Trash2, 
  Link2, 
  Volume2, 
  Image as ImageIcon,
  Clock,
  Calendar,
  FileAudio
} from 'lucide-react';
import { isSupabaseConfigured } from '../../../lib/supabase/client';
import { radioAudioService, MAX_AUDIO_SIZE_MB } from '../services/radioAudioService';
import { uploadImage } from '../../../services/storageService';

interface RadioProgramEditorProps {
  title: string;
  pageKey: string;
  blockKey: string;
  defaultData: any;
  overrideData: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function RadioProgramEditor({
  title,
  defaultData,
  overrideData,
  onClose,
  onSave,
}: RadioProgramEditorProps) {
  const [formData, setFormData] = useState({
    enabled: overrideData?.enabled ?? defaultData?.enabled ?? true,
    eyebrow: overrideData?.eyebrow ?? defaultData?.eyebrow ?? 'PHÁT THANH MĂNG NON',
    title: overrideData?.title ?? defaultData?.title ?? '',
    buttonLabel: overrideData?.buttonLabel ?? defaultData?.buttonLabel ?? 'Nghe chương trình',
    audioUrl: overrideData?.audioUrl ?? defaultData?.audioUrl ?? '',
    coverImageUrl: overrideData?.coverImageUrl ?? defaultData?.coverImageUrl ?? '',
    description: overrideData?.description ?? defaultData?.description ?? '',
    durationLabel: overrideData?.durationLabel ?? defaultData?.durationLabel ?? '',
    publishedAt: overrideData?.publishedAt ?? defaultData?.publishedAt ?? '',
    openMode: overrideData?.openMode ?? defaultData?.openMode ?? 'PLAYER',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Audio upload state
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [audioUploadProgress, setAudioUploadProgress] = useState<number | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [audioFileSize, setAudioFileSize] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Image upload state
  const [isImageUploading, setIsImageUploading] = useState(false);

  // Audio playtest state
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Track old audio url for post-save deletion
  const [oldAudioUrlToDelete, setOldAudioUrlToDelete] = useState<string | null>(null);

  // Cleanup audio player when unmounting
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Update audio instance when audioUrl changes
  useEffect(() => {
    if (isPlaying) {
      togglePlaytest(false);
    }
    
    if (formData.audioUrl) {
      if (audioRef.current) {
        audioRef.current.src = formData.audioUrl;
        audioRef.current.load();
      } else {
        const audio = new Audio(formData.audioUrl);
        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime);
        });
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
          // Auto-generate duration label if empty (e.g. "05:30")
          if (!formData.durationLabel) {
            const minutes = Math.floor(audio.duration / 60);
            const seconds = Math.floor(audio.duration % 60);
            const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            setFormData(prev => ({ ...prev, durationLabel: formatted }));
          }
        });
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentTime(0);
        });
        audioRef.current = audio;
      }
    } else {
      audioRef.current = null;
    }
  }, [formData.audioUrl]);

  const togglePlaytest = (shouldPlay?: boolean) => {
    if (!audioRef.current) return;
    const playState = shouldPlay !== undefined ? shouldPlay : !isPlaying;
    
    if (playState) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Playtest error:', err);
          setError('Không thể phát tệp âm thanh này. Định dạng hoặc đường dẫn không hợp lệ.');
          setIsPlaying(false);
        });
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = clickPercent * duration;
    setCurrentTime(clickPercent * duration);
  };

  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleAudioFileUpload(file);
    }
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleAudioFileUpload(file);
    }
  };

  const handleAudioFileUpload = async (file: File) => {
    if (!isSupabaseConfigured) {
      setError('Chưa cấu hình Supabase. Vui lòng nhập URL âm thanh thủ công.');
      return;
    }

    setError(null);
    setIsAudioUploading(true);
    setAudioUploadProgress(15); // Starting state

    try {
      // Validate file before upload
      const validationError = radioAudioService.validateAudioFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      setAudioUploadProgress(40);
      setAudioFileName(file.name);
      
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setAudioFileSize(`${sizeMB} MB`);

      // Upload file
      const publicUrl = await radioAudioService.uploadAudio(file);
      setAudioUploadProgress(90);

      // Save old audio url to delete after successful submit
      if (formData.audioUrl && formData.audioUrl.includes('radio/')) {
        setOldAudioUrlToDelete(formData.audioUrl);
      }

      setFormData(prev => ({
        ...prev,
        audioUrl: publicUrl
      }));
      setAudioUploadProgress(100);
      setSuccess('Tải tệp âm thanh lên thành công!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Audio upload error:', err);
      setError(err.message || 'Không thể tải tệp âm thanh lên.');
      setAudioFileName('');
      setAudioFileSize('');
    } finally {
      setIsAudioUploading(false);
      setAudioUploadProgress(null);
    }
  };

  const handleDeleteAudio = async () => {
    if (formData.audioUrl && formData.audioUrl.includes('radio/')) {
      // Don't delete immediately from storage, delete after saving, or delete now if confirmed
      if (window.confirm('Bạn có chắc chắn muốn xóa tệp âm thanh này khỏi hệ thống?')) {
        setOldAudioUrlToDelete(formData.audioUrl);
        setFormData(prev => ({ ...prev, audioUrl: '', durationLabel: '' }));
        setAudioFileName('');
        setAudioFileSize('');
        togglePlaytest(false);
      }
    } else {
      setFormData(prev => ({ ...prev, audioUrl: '', durationLabel: '' }));
      togglePlaytest(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupabaseConfigured) {
      setError('Chưa cấu hình Supabase. Không thể tải ảnh lên.');
      return;
    }

    setError(null);
    setIsImageUploading(true);

    try {
      const publicUrl = await uploadImage(file, 'radio-covers');
      setFormData(prev => ({ ...prev, coverImageUrl: publicUrl }));
      setSuccess('Tải ảnh đại diện lên thành công!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Image upload error:', err);
      setError(err.message || 'Không thể tải ảnh đại diện lên.');
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAudioUploading || isImageUploading) {
      setError('Vui lòng đợi quá trình tải lên hoàn tất.');
      return;
    }

    setIsSaving(true);
    setError(null);

    // Build precise delta (only changed fields)
    const delta: any = {};
    const fields: (keyof typeof formData)[] = [
      'enabled', 'eyebrow', 'title', 'buttonLabel', 'audioUrl', 
      'coverImageUrl', 'description', 'durationLabel', 'publishedAt', 'openMode'
    ];

    fields.forEach(field => {
      if (formData[field] !== defaultData?.[field]) {
        delta[field] = formData[field];
      }
    });

    try {
      // Pause playtest if playing
      togglePlaytest(false);

      // Save configuration
      await onSave(delta);

      // Clean up old audio file only after successful save
      if (oldAudioUrlToDelete) {
        await radioAudioService.deleteAudioByUrl(oldAudioUrlToDelete);
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to save radio program config:', err);
      setError(err?.message || 'Không thể lưu cấu hình chương trình.');
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
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 px-6 py-4">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
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
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start space-x-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm leading-relaxed">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start space-x-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-sm leading-relaxed">
              <Volume2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500 animate-pulse" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Enabled / Status toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850">
              <div className="space-y-1">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  Hiển thị banner trên trang chủ
                </span>
                <span className="block text-[11px] text-slate-400">
                  Bật/tắt dải tin Phát thanh măng non ở phần đầu trang chủ.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.enabled ? 'bg-emerald-600' : 'bg-slate-250 dark:bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Eyebrow & Button Label Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Nhãn nhỏ (Max 50 ký tự)
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={formData.eyebrow}
                  onChange={e => setFormData(prev => ({ ...prev, eyebrow: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Ví dụ: PHÁT THANH MĂNG NON"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Chữ trên nút nghe (Max 40 ký tự)
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={formData.buttonLabel}
                  onChange={e => setFormData(prev => ({ ...prev, buttonLabel: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Ví dụ: Nghe chương trình"
                  required
                />
              </div>
            </div>

            {/* Title field */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Tiêu đề chương trình phát thanh (Max 180 ký tự)
              </label>
              <textarea
                maxLength={180}
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                rows={2}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Nhập tiêu đề chương trình..."
                required
              />
            </div>

            {/* Audio Source Customization */}
            <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                <FileAudio className="h-4 w-4" />
                <span>Nguồn âm thanh (Audio Source)</span>
              </h4>

              {/* Drag and Drop Audio Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 transition-colors text-center cursor-pointer relative ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-50/10' 
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/30 hover:bg-slate-100/40 dark:hover:bg-slate-900/40'
                }`}
              >
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                  id="radio-audio-upload"
                  disabled={isAudioUploading}
                />
                <label htmlFor="radio-audio-upload" className="cursor-pointer block space-y-2">
                  <div className="flex justify-center">
                    {isAudioUploading ? (
                      <RefreshCw className="h-7 w-7 text-emerald-500 animate-spin" />
                    ) : (
                      <Upload className="h-7 w-7 text-slate-400" />
                    )}
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-300 hover:underline">
                      Tải lên tệp âm thanh
                    </span>{' '}
                    hoặc kéo thả tệp vào đây
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Hỗ trợ: MP3, M4A, WAV, OGG (Tối đa {MAX_AUDIO_SIZE_MB}MB)
                  </p>
                </label>

                {isAudioUploading && audioUploadProgress !== null && (
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-white/90 dark:bg-slate-900/90 rounded-b-xl flex items-center justify-between text-[10px] px-4 font-semibold text-slate-500 border-t border-slate-100 dark:border-slate-800">
                    <span>Đang tải lên... {audioFileName} ({audioFileSize})</span>
                    <span className="text-emerald-500">{audioUploadProgress}%</span>
                  </div>
                )}
              </div>

              {/* URL Manual Input field */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  Đường dẫn tệp âm thanh (URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.audioUrl}
                    onChange={e => setFormData(prev => ({ ...prev, audioUrl: e.target.value }))}
                    className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                    placeholder="Nhập liên kết âm thanh trực tiếp hoặc upload ở trên..."
                  />
                  {formData.audioUrl && (
                    <button
                      type="button"
                      onClick={handleDeleteAudio}
                      className="rounded-xl border border-red-200 hover:bg-red-50 text-red-500 px-3 transition-colors shrink-0"
                      title="Xóa tệp"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Playtest Player UI */}
              {formData.audioUrl && (
                <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => togglePlaytest()}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-600/20"
                      title={isPlaying ? "Tạm dừng" : "Phát thử"}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current pl-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        <span className="truncate max-w-[150px] md:max-w-[280px]">
                          {audioFileName || 'Tệp liên kết ngoài'}
                        </span>
                        <span className="font-mono">
                          {formatTime(currentTime)} / {formatTime(duration || 0)}
                        </span>
                      </div>
                      <div 
                        ref={progressBarRef}
                        onClick={handleProgressBarClick}
                        className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full cursor-pointer relative overflow-hidden"
                      >
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-100" 
                          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description, PublishedAt, and DurationLabel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>Thời lượng (Duration)</span>
                </label>
                <input
                  type="text"
                  value={formData.durationLabel}
                  onChange={e => setFormData(prev => ({ ...prev, durationLabel: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                  placeholder="Ví dụ: 05:30"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <span>Ngày phát (Published At)</span>
                </label>
                <input
                  type="date"
                  value={formData.publishedAt}
                  onChange={e => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Kiểu mở (Action Mode)
                </label>
                <select
                  value={formData.openMode}
                  onChange={e => setFormData(prev => ({ ...prev, openMode: e.target.value as any }))}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  <option value="PLAYER">Phát trên website (Player)</option>
                  <option value="NEW_TAB">Mở liên kết ngoài (Tab mới)</option>
                  <option value="DOWNLOAD">Tải tệp âm thanh (Download)</option>
                </select>
              </div>
            </div>

            {/* Description textarea */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Mô tả ngắn (Max 300 ký tự - Tùy chọn)
              </label>
              <textarea
                maxLength={300}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Nhập mô tả chương trình để hiển thị trong Player..."
              />
            </div>

            {/* Cover Image Customization */}
            <div className="border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <ImageIcon className="h-4 w-4" />
                <span>Ảnh đại diện chương trình (Cover Image - Tùy chọn)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-9">
                  <input
                    type="text"
                    value={formData.coverImageUrl}
                    onChange={e => setFormData(prev => ({ ...prev, coverImageUrl: e.target.value }))}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                    placeholder="URL ảnh hoặc tải ảnh bên cạnh..."
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="flex items-center justify-center space-x-1 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl p-2.5 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">
                    {isImageUploading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <span>{isImageUploading ? 'Tải...' : 'Tải ảnh'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isImageUploading}
                    />
                  </label>
                </div>
              </div>
              {formData.coverImageUrl && (
                <div className="mt-1 relative rounded-xl overflow-hidden aspect-video max-w-[160px] border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                  <img
                    src={formData.coverImageUrl}
                    alt="Preview cover"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
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
              disabled={isSaving || isAudioUploading || isImageUploading}
              className="flex items-center space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
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
