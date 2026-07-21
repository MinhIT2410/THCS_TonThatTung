/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { aboutContentService } from '../services/aboutContentService';
import { AboutItem, AboutItemImage } from '../types/about';
import { ROUTES } from '../config/routes';

const DynamicIcon = ({ name, className }: { name?: string | null; className?: string }) => {
  if (!name) return <Icons.Shield className={className} />;
  const IconComponent = (Icons as any)[name] || Icons.Shield;
  return <IconComponent className={className} />;
};

const itemTypeLabels: Record<string, string> = {
  ORGANIZATION: 'Tổ chức',
  SCHOOL_UNIT: 'Đơn vị trường',
  TEAM: 'Đội nhóm',
  CLUB: 'Câu lạc bộ',
  OTHER: 'Khác',
};

const itemTypeColors: Record<string, string> = {
  ORGANIZATION: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-200/50 dark:border-red-800/30',
  SCHOOL_UNIT: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/30',
  TEAM: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/30',
  CLUB: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/30',
  OTHER: 'bg-slate-50 text-slate-600 dark:bg-slate-950/40 dark:text-slate-400 border-slate-250/50 dark:border-slate-800/30',
};

export default function AboutDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<AboutItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadItem() {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const data = await aboutContentService.getPublishedItemBySlug(slug);
        setItem(data);
      } catch (err) {
        console.error('Error loading about item detail:', err);
        setError('Không thể tải nội dung giới thiệu.');
      } finally {
        setLoading(false);
      }
    }
    loadItem();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
        <div className="space-y-3">
          <div className="h-8 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-6">
        <Icons.AlertCircle className="h-16 w-16 mx-auto text-red-500 opacity-65" />
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Lỗi tải dữ liệu</h2>
        <p className="font-sans text-slate-500 dark:text-slate-400">
          {error}
        </p>
        <button
          onClick={() => navigate(ROUTES.ABOUT)}
          className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 font-bold px-5 py-2.5 rounded-full transition-colors font-sans text-xs"
        >
          <Icons.ArrowLeft className="h-4 w-4" />
          <span>Quay lại trang Giới thiệu</span>
        </button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-6">
        <Icons.AlertCircle className="h-16 w-16 mx-auto text-red-500 opacity-60" />
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Không tìm thấy nội dung</h2>
        <p className="font-sans text-slate-500 dark:text-slate-400">
          Mục giới thiệu này không tồn tại hoặc đã bị gỡ bỏ khỏi hệ thống.
        </p>
        <button
          onClick={() => navigate(ROUTES.ABOUT)}
          className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 font-bold px-5 py-2.5 rounded-full transition-colors font-sans text-xs"
        >
          <Icons.ArrowLeft className="h-4 w-4" />
          <span>Quay lại trang Giới thiệu</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-10 pb-24 font-sans">
      {/* Back link */}
      <Link
        to={ROUTES.ABOUT}
        className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-bold text-xs transition-colors"
      >
        <Icons.ArrowLeft className="h-4 w-4" />
        <span>Tất cả đơn vị & đội nhóm</span>
      </Link>

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl"
      >
        {/* Cover image or stylish abstract background */}
        <div className="h-48 sm:h-64 relative overflow-hidden bg-slate-100 dark:bg-slate-950">
          {item.cover_image_url ? (
            <img
              src={item.cover_image_url}
              alt={item.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-full h-full opacity-70"
              style={{
                background: `linear-gradient(135deg, ${item.accent_color || '#ef4444'} 0%, #1e293b 100%)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        </div>

        {/* Header content overlay / bottom part */}
        <div className="p-6 sm:p-8 pt-0 relative flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-12 sm:-mt-16">
          {/* Logo / Avatar */}
          <div className="relative shrink-0 h-24 w-24 sm:h-32 sm:w-32 rounded-3xl bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-900 shadow-lg overflow-hidden flex items-center justify-center p-3">
            {item.logo_url ? (
              <img
                src={item.logo_url}
                alt={item.title}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="w-full h-full rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundColor: item.accent_color || '#ef4444' }}
              >
                <DynamicIcon name={item.icon_name} className="h-10 w-10 sm:h-12 sm:w-12" />
              </div>
            )}
          </div>

          {/* Title & metadata */}
          <div className="mt-4 sm:mt-0 flex-1 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${itemTypeColors[item.item_type]}`}>
                {itemTypeLabels[item.item_type]}
              </span>
              {item.is_featured && (
                <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center">
                  <Icons.Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
                  Nổi bật
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {item.title}
            </h1>
            {item.short_title && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono">
                Tên ngắn: {item.short_title}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary and rich content */}
        <div className="lg:col-span-2 space-y-8">
          {item.summary && (
            <div className="bg-slate-55/60 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed italic">
              {item.summary}
            </div>
          )}

          {/* Detailed Content */}
          {item.content ? (
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed space-y-4">
              {item.content.split('\n\n').map((paragraph, index) => {
                if (paragraph.trim().startsWith('-') || paragraph.trim().startsWith('*')) {
                  // Bullet lists
                  const listItems = paragraph.split('\n').map(li => li.replace(/^[-*]\s*/, '').trim());
                  return (
                    <ul key={index} className="list-disc pl-5 space-y-1.5">
                      {listItems.map((li, liIdx) => (
                        <li key={liIdx}>{li}</li>
                      ))}
                    </ul>
                  );
                }
                return <p key={index}>{paragraph}</p>;
              })}
            </div>
          ) : (
            <div className="text-slate-400 dark:text-slate-500 text-sm italic py-6">
              Mục này đang tiếp tục được bổ sung chi tiết hoạt động.
            </div>
          )}

          {/* Activity Gallery */}
          {item.images && item.images.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Icons.Image className="h-5 w-5 text-indigo-500" />
                <span>Thư viện ảnh hoạt động</span>
              </h3>
              
              {/* Masonry or Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {item.images.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => setActiveImageIndex(idx)}
                    className="group relative aspect-video sm:aspect-square overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 cursor-pointer shadow-sm hover:shadow-md transition-all"
                  >
                    <img
                      src={img.image_url}
                      alt={img.caption || img.alt_text || 'Ảnh hoạt động'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    {img.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="line-clamp-2">{img.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Parent-Child Structure, Contacts / Metadata */}
        <div className="space-y-6">
          {/* Parent unit info if nested */}
          {item.parent_id && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Đơn vị cấp quản lý
              </span>
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                  <Icons.ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.parent_title || 'Tổ chức cấp trên'}
                  </h4>
                  <p className="text-[10px] text-slate-400">Đơn vị thành viên trực thuộc</p>
                </div>
              </div>
            </div>
          )}

          {/* Child units / Affiliated Teams */}
          {item.children && item.children.length > 0 && (
            <div className="rounded-3xl border border-slate-250 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-5 shadow-sm space-y-4">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <Icons.Layers className="h-4 w-4 text-blue-500" />
                <span>Các phân đội trực thuộc ({item.children.length})</span>
              </h3>
              
              <div className="space-y-2.5">
                {item.children.map(child => (
                  <Link
                    key={child.id}
                    to={`${ROUTES.ABOUT}/${child.slug}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/60 hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-xs transition-all group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: child.accent_color || '#3b82f6' }}
                      >
                        <DynamicIcon name={child.icon_name} className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                        {child.title}
                      </span>
                    </div>
                    <Icons.ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {activeImageIndex !== null && item.images && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-center items-center p-4">
          <button
            onClick={() => setActiveImageIndex(null)}
            className="absolute top-4 right-4 p-2 bg-slate-800/80 text-white rounded-full hover:bg-slate-700"
          >
            <Icons.X className="h-6 w-6" />
          </button>

          <div className="relative max-w-4xl max-h-[75vh] flex items-center justify-center">
            {activeImageIndex > 0 && (
              <button
                onClick={() => setActiveImageIndex(activeImageIndex - 1)}
                className="absolute left-2 sm:-left-12 p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full"
              >
                <Icons.ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <img
              src={item.images[activeImageIndex].image_url}
              alt="Ảnh phóng to"
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />

            {activeImageIndex < item.images.length - 1 && (
              <button
                onClick={() => setActiveImageIndex(activeImageIndex + 1)}
                className="absolute right-2 sm:-right-12 p-3 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full"
              >
                <Icons.ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {item.images[activeImageIndex].caption && (
            <p className="text-slate-300 text-sm max-w-2xl text-center mt-6">
              {item.images[activeImageIndex].caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
