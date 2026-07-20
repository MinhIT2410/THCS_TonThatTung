/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Upload, AlertCircle, RefreshCw, Save } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase/client';

interface EditModalProps {
  title: string;
  pageKey: string;
  blockKey: string;
  defaultData: any;
  overrideData: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function EditModal({
  title,
  pageKey,
  blockKey,
  defaultData,
  overrideData,
  onClose,
  onSave,
}: EditModalProps) {
  // Merge default fields and overridden fields to pre-populate form
  const initialData = {
    title: overrideData?.title ?? defaultData?.title ?? '',
    subtitle: overrideData?.subtitle ?? defaultData?.subtitle ?? '',
    description: overrideData?.description ?? defaultData?.description ?? '',
    backgroundImage: overrideData?.backgroundImage ?? defaultData?.backgroundImage ?? '',
    primaryButton: {
      label: overrideData?.primaryButton?.label ?? defaultData?.primaryButton?.label ?? '',
      href: overrideData?.primaryButton?.href ?? defaultData?.primaryButton?.href ?? '',
    },
    secondaryButton: {
      label: overrideData?.secondaryButton?.label ?? defaultData?.secondaryButton?.label ?? '',
      href: overrideData?.secondaryButton?.href ?? defaultData?.secondaryButton?.href ?? '',
    },
    badge1: {
      title: overrideData?.badge1?.title ?? defaultData?.badge1?.title ?? '',
      description: overrideData?.badge1?.description ?? defaultData?.badge1?.description ?? '',
    },
    badge2: {
      title: overrideData?.badge2?.title ?? defaultData?.badge2?.title ?? '',
      description: overrideData?.badge2?.description ?? defaultData?.badge2?.description ?? '',
    },
    decorImage: {
      url: overrideData?.decorImage?.url ?? defaultData?.decorImage?.url ?? '',
      alt: overrideData?.decorImage?.alt ?? defaultData?.decorImage?.alt ?? '',
      tag: overrideData?.decorImage?.tag ?? defaultData?.decorImage?.tag ?? '',
      title: overrideData?.decorImage?.title ?? defaultData?.decorImage?.title ?? '',
    },
    stat1: {
      value: overrideData?.stat1?.value ?? defaultData?.stat1?.value ?? '',
      label: overrideData?.stat1?.label ?? defaultData?.stat1?.label ?? '',
    },
    stat2: {
      value: overrideData?.stat2?.value ?? defaultData?.stat2?.value ?? '',
      label: overrideData?.stat2?.label ?? defaultData?.stat2?.label ?? '',
    },
    stat3: {
      value: overrideData?.stat3?.value ?? defaultData?.stat3?.value ?? '',
      label: overrideData?.stat3?.label ?? defaultData?.stat3?.label ?? '',
    },
    stat4: {
      value: overrideData?.stat4?.value ?? defaultData?.stat4?.value ?? '',
      label: overrideData?.stat4?.label ?? defaultData?.stat4?.label ?? '',
    },
  };

  const [formData, setFormData] = useState(initialData);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNestedChange = (parent: 'primaryButton' | 'secondaryButton', field: 'label' | 'href', value: string) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  const handleNestedBadgeChange = (badge: 'badge1' | 'badge2', field: 'title' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      [badge]: {
        ...prev[badge],
        [field]: value,
      },
    }));
  };

  const handleNestedStatChange = (statKey: 'stat1' | 'stat2' | 'stat3' | 'stat4', field: 'value' | 'label', value: string) => {
    setFormData(prev => ({
      ...prev,
      [statKey]: {
        ...prev[statKey],
        [field]: value,
      },
    }));
  };

  const handleNestedDecorImageChange = (field: 'url' | 'alt' | 'tag' | 'title', value: string) => {
    setFormData(prev => ({
      ...prev,
      decorImage: {
        ...prev.decorImage,
        [field]: value,
      },
    }));
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'backgroundImage' | 'decorImage' = 'backgroundImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Quick size validation: limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh không được vượt quá 5MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      if (isSupabaseConfigured) {
        const { uploadImage } = await import('../../services/storageService');
        const url = await uploadImage(file, 'cms/hero');
        if (targetField === 'backgroundImage') {
          handleInputChange('backgroundImage', url);
        } else {
          handleNestedDecorImageChange('url', url);
        }
      } else {
        // Fallback for local development and mock environments: convert to Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            if (targetField === 'backgroundImage') {
              handleInputChange('backgroundImage', reader.result as string);
            } else {
              handleNestedDecorImageChange('url', reader.result as string);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setError(err?.message || 'Có lỗi xảy ra khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // Prepare delta: calculate only the differences to fulfill the constraint:
    // "upsertOverride chỉ lưu phần thay đổi, không lưu toàn bộ default."
    const delta: any = {};

    if (formData.title !== defaultData?.title) delta.title = formData.title;
    if (formData.subtitle !== defaultData?.subtitle) delta.subtitle = formData.subtitle;
    if (formData.description !== defaultData?.description) delta.description = formData.description;
    if (formData.backgroundImage !== defaultData?.backgroundImage) delta.backgroundImage = formData.backgroundImage;

    // Check primary button changes
    const primaryButtonDelta: any = {};
    if (formData.primaryButton.label !== defaultData?.primaryButton?.label) {
      primaryButtonDelta.label = formData.primaryButton.label;
    }
    if (formData.primaryButton.href !== defaultData?.primaryButton?.href) {
      primaryButtonDelta.href = formData.primaryButton.href;
    }
    if (Object.keys(primaryButtonDelta).length > 0) {
      delta.primaryButton = {
        ...defaultData?.primaryButton,
        ...primaryButtonDelta,
      };
    }

    // Check secondary button changes
    const secondaryButtonDelta: any = {};
    if (formData.secondaryButton.label !== defaultData?.secondaryButton?.label) {
      secondaryButtonDelta.label = formData.secondaryButton.label;
    }
    if (formData.secondaryButton.href !== defaultData?.secondaryButton?.href) {
      secondaryButtonDelta.href = formData.secondaryButton.href;
    }
    if (Object.keys(secondaryButtonDelta).length > 0) {
      delta.secondaryButton = {
        ...defaultData?.secondaryButton,
        ...secondaryButtonDelta,
      };
    }

    // Check badge1 changes
    const badge1Delta: any = {};
    if (formData.badge1.title !== defaultData?.badge1?.title) {
      badge1Delta.title = formData.badge1.title;
    }
    if (formData.badge1.description !== defaultData?.badge1?.description) {
      badge1Delta.description = formData.badge1.description;
    }
    if (Object.keys(badge1Delta).length > 0) {
      delta.badge1 = {
        ...defaultData?.badge1,
        ...badge1Delta,
      };
    }

    // Check badge2 changes
    const badge2Delta: any = {};
    if (formData.badge2.title !== defaultData?.badge2?.title) {
      badge2Delta.title = formData.badge2.title;
    }
    if (formData.badge2.description !== defaultData?.badge2?.description) {
      badge2Delta.description = formData.badge2.description;
    }
    if (Object.keys(badge2Delta).length > 0) {
      delta.badge2 = {
        ...defaultData?.badge2,
        ...badge2Delta,
      };
    }

    // Check decorImage changes
    const decorImageDelta: any = {};
    if (formData.decorImage.url !== defaultData?.decorImage?.url) {
      decorImageDelta.url = formData.decorImage.url;
    }
    if (formData.decorImage.alt !== defaultData?.decorImage?.alt) {
      decorImageDelta.alt = formData.decorImage.alt;
    }
    if (formData.decorImage.tag !== defaultData?.decorImage?.tag) {
      decorImageDelta.tag = formData.decorImage.tag;
    }
    if (formData.decorImage.title !== defaultData?.decorImage?.title) {
      decorImageDelta.title = formData.decorImage.title;
    }
    if (Object.keys(decorImageDelta).length > 0) {
      delta.decorImage = {
        ...defaultData?.decorImage,
        ...decorImageDelta,
      };
    }

    // Check stat1 changes
    const stat1Delta: any = {};
    if (formData.stat1.value !== defaultData?.stat1?.value) {
      stat1Delta.value = formData.stat1.value;
    }
    if (formData.stat1.label !== defaultData?.stat1?.label) {
      stat1Delta.label = formData.stat1.label;
    }
    if (Object.keys(stat1Delta).length > 0) {
      delta.stat1 = {
        ...defaultData?.stat1,
        ...stat1Delta,
      };
    }

    // Check stat2 changes
    const stat2Delta: any = {};
    if (formData.stat2.value !== defaultData?.stat2?.value) {
      stat2Delta.value = formData.stat2.value;
    }
    if (formData.stat2.label !== defaultData?.stat2?.label) {
      stat2Delta.label = formData.stat2.label;
    }
    if (Object.keys(stat2Delta).length > 0) {
      delta.stat2 = {
        ...defaultData?.stat2,
        ...stat2Delta,
      };
    }

    // Check stat3 changes
    const stat3Delta: any = {};
    if (formData.stat3.value !== defaultData?.stat3?.value) {
      stat3Delta.value = formData.stat3.value;
    }
    if (formData.stat3.label !== defaultData?.stat3?.label) {
      stat3Delta.label = formData.stat3.label;
    }
    if (Object.keys(stat3Delta).length > 0) {
      delta.stat3 = {
        ...defaultData?.stat3,
        ...stat3Delta,
      };
    }

    // Check stat4 changes
    const stat4Delta: any = {};
    if (formData.stat4.value !== defaultData?.stat4?.value) {
      stat4Delta.value = formData.stat4.value;
    }
    if (formData.stat4.label !== defaultData?.stat4?.label) {
      stat4Delta.label = formData.stat4.label;
    }
    if (Object.keys(stat4Delta).length > 0) {
      delta.stat4 = {
        ...defaultData?.stat4,
        ...stat4Delta,
      };
    }

    try {
      // If nothing has changed, we can either save empty delta or save the complete fields.
      await onSave(delta);
    } catch (err: any) {
      console.error('Failed to save CMS overrides:', err);
      setError(err?.message || 'Có lỗi xảy ra khi lưu thay đổi.');
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
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start space-x-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm leading-relaxed">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Fields: customized specifically for the Hero component */}
          <div className="space-y-4">
            {/* Title field */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tiêu đề chính (Title)
              </label>
              <textarea
                value={formData.title}
                onChange={e => handleInputChange('title', e.target.value)}
                rows={2}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                placeholder="Nhập tiêu đề chào mừng..."
                required
              />
            </div>

            {/* Subtitle field */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tiêu đề phụ (Subtitle)
              </label>
              <textarea
                value={formData.subtitle}
                onChange={e => handleInputChange('subtitle', e.target.value)}
                rows={2}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                placeholder="Nhập câu khẩu hiệu hoặc tiêu đề phụ..."
              />
            </div>

            {/* Description field */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mô tả chi tiết (Description)
              </label>
              <textarea
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                placeholder="Mô tả chi tiết về Liên đội..."
              />
            </div>

            {/* Background Image Upload & Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Ảnh nền Hero (Background Image)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-9">
                  <input
                    type="text"
                    value={formData.backgroundImage}
                    onChange={e => handleInputChange('backgroundImage', e.target.value)}
                    className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    placeholder="URL hình ảnh hoặc upload ảnh bên cạnh..."
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="flex items-center justify-center space-x-2 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl p-3 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">
                    {isUploading ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                    ) : (
                      <Upload className="h-4 w-4 text-slate-400" />
                    )}
                    <span>{isUploading ? 'Đang tải...' : 'Tải ảnh'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                {isSupabaseConfigured 
                  ? 'Ảnh sẽ được upload thật lên Supabase Storage.' 
                  : 'Sử dụng chế độ fallback: Ảnh sẽ được lưu dưới dạng Base64.'}
              </p>
              {formData.backgroundImage && (
                <div className="mt-2 relative rounded-xl overflow-hidden aspect-[3/1] border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                  <img
                    src={formData.backgroundImage}
                    alt="Preview background"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Buttons Customization Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Primary Button */}
              <div className="border border-slate-100 dark:border-slate-850 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Nút bấm chính (Primary Button)
                </h4>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Tên nhãn</span>
                    <input
                      type="text"
                      value={formData.primaryButton.label}
                      onChange={e => handleNestedChange('primaryButton', 'label', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Đường dẫn</span>
                    <input
                      type="text"
                      value={formData.primaryButton.href}
                      onChange={e => handleNestedChange('primaryButton', 'href', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Button */}
              <div className="border border-slate-100 dark:border-slate-850 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nút bấm phụ (Secondary Button)
                </h4>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Tên nhãn</span>
                    <input
                      type="text"
                      value={formData.secondaryButton.label}
                      onChange={e => handleNestedChange('secondaryButton', 'label', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Đường dẫn</span>
                    <input
                      type="text"
                      value={formData.secondaryButton.href}
                      onChange={e => handleNestedChange('secondaryButton', 'href', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Image Customization */}
            <div className="border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Ảnh minh họa bên phải (Main Decorative Image)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-9 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Đường dẫn ảnh</span>
                  <input
                    type="text"
                    value={formData.decorImage.url}
                    onChange={e => handleNestedDecorImageChange('url', e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                    placeholder="URL hình ảnh..."
                  />
                </div>
                <div className="md:col-span-3 pt-4">
                  <label className="flex items-center justify-center space-x-2 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg p-2 cursor-pointer text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-colors">
                    {isUploading ? (
                      <RefreshCw className="h-3 w-3 animate-spin text-indigo-500" />
                    ) : (
                      <Upload className="h-3 w-3 text-slate-400" />
                    )}
                    <span>{isUploading ? 'Tải...' : 'Tải ảnh'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleImageFileChange(e, 'decorImage')}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                </div>
              </div>
              
              {formData.decorImage.url && (
                <div className="relative rounded-lg overflow-hidden aspect-[4/3] max-w-[150px] border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                  <img
                    src={formData.decorImage.url}
                    alt="Preview decor"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Nhãn thẻ (Tag)</span>
                  <input
                    type="text"
                    value={formData.decorImage.tag}
                    onChange={e => handleNestedDecorImageChange('tag', e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Tiêu đề ảnh (Overlay Title)</span>
                  <input
                    type="text"
                    value={formData.decorImage.title}
                    onChange={e => handleNestedDecorImageChange('title', e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Floating Badges Customization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Badge 1 */}
              <div className="border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">
                  Huy hiệu 1 (Floating Badge 1)
                </h4>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Tiêu đề</span>
                    <input
                      type="text"
                      value={formData.badge1.title}
                      onChange={e => handleNestedBadgeChange('badge1', 'title', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Mô tả</span>
                    <input
                      type="text"
                      value={formData.badge1.description}
                      onChange={e => handleNestedBadgeChange('badge1', 'description', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Badge 2 */}
              <div className="border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">
                  Huy hiệu 2 (Floating Badge 2)
                </h4>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Tiêu đề</span>
                    <input
                      type="text"
                      value={formData.badge2.title}
                      onChange={e => handleNestedBadgeChange('badge2', 'title', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Mô tả</span>
                    <input
                      type="text"
                      value={formData.badge2.description}
                      onChange={e => handleNestedBadgeChange('badge2', 'description', e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Customization */}
            <div className="border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-4 pt-4">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Chỉ số thống kê (Stats Counters)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stat 1 */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Thống kê 1</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Giá trị</span>
                      <input
                        type="text"
                        value={formData.stat1.value}
                        onChange={e => handleNestedStatChange('stat1', 'value', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Nhãn</span>
                      <input
                        type="text"
                        value={formData.stat1.label}
                        onChange={e => handleNestedStatChange('stat1', 'label', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Thống kê 2</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Giá trị</span>
                      <input
                        type="text"
                        value={formData.stat2.value}
                        onChange={e => handleNestedStatChange('stat2', 'value', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Nhãn</span>
                      <input
                        type="text"
                        value={formData.stat2.label}
                        onChange={e => handleNestedStatChange('stat2', 'label', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Thống kê 3</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Giá trị</span>
                      <input
                        type="text"
                        value={formData.stat3.value}
                        onChange={e => handleNestedStatChange('stat3', 'value', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Nhãn</span>
                      <input
                        type="text"
                        value={formData.stat3.label}
                        onChange={e => handleNestedStatChange('stat3', 'label', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl space-y-2 border border-slate-100 dark:border-slate-850">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Thống kê 4</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Giá trị</span>
                      <input
                        type="text"
                        value={formData.stat4.value}
                        onChange={e => handleNestedStatChange('stat4', 'value', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 uppercase font-semibold">Nhãn</span>
                      <input
                        type="text"
                        value={formData.stat4.label}
                        onChange={e => handleNestedStatChange('stat4', 'label', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer action buttons */}
          <div className="flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-850 pt-5 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg active:scale-[0.98] transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
