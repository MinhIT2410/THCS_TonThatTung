/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { aboutContentService } from '../services/aboutContentService';
import { AboutItem, AboutItemType } from '../types/about';
import { ROUTES } from '../config/routes';

const DynamicIcon = ({ name, className }: { name?: string | null; className?: string }) => {
  if (!name) return <Icons.Shield className={className} />;
  const IconComponent = (Icons as any)[name] || Icons.Shield;
  return <IconComponent className={className} />;
};

const itemTypeLabels: Record<AboutItemType, string> = {
  ORGANIZATION: 'Tổ chức cấp trên',
  SCHOOL_UNIT: 'Đơn vị nhà trường',
  TEAM: 'Đội tự quản & Ban chỉ huy',
  CLUB: 'Câu lạc bộ tài năng',
  OTHER: 'Khác',
};

const itemTypeColors: Record<AboutItemType, string> = {
  ORGANIZATION: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-200/40 dark:border-red-900/30',
  SCHOOL_UNIT: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/40 dark:border-blue-900/30',
  TEAM: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-900/30',
  CLUB: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200/40 dark:border-purple-900/30',
  OTHER: 'bg-slate-50 text-slate-600 dark:bg-slate-950/40 dark:text-slate-400 border-slate-200/40 dark:border-slate-900/30',
};

export default function AboutPage() {
  const [items, setItems] = useState<AboutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<AboutItemType | 'ALL'>('ALL');

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      setError(null);
      try {
        const data = await aboutContentService.getPublishedItems();
        setItems(data);
      } catch (err) {
        console.error('Failed to load about items:', err);
        setError('Không thể tải nội dung giới thiệu.');
      } finally {
        setLoading(false);
      }
    }
    loadItems();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Filter logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.summary && item.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (item.short_title && item.short_title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'ALL' || item.item_type === selectedType;
    return matchesSearch && matchesType;
  });

  // Featured and regular
  const featuredItems = filteredItems.filter(item => item.is_featured);
  const regularItems = filteredItems.filter(item => !item.is_featured);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16 pb-24 font-sans">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-extrabold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/40 px-3.5 py-1.5 rounded-full inline-block border border-red-200/30">
          Sơ đồ tổ chức & các đơn vị trực thuộc
        </span>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Đơn Vị & Đội Nhóm Liên Đội
        </h1>
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
          Tra cứu thông tin, lịch sử và hoạt động của Ban chỉ huy Liên đội, các Đội chuyên trách và Câu lạc bộ măng non.
        </p>
      </div>



      {/* Main Grid display area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-slate-100 dark:bg-slate-900 rounded-[2rem]" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20 border border-dashed border-red-300 dark:border-red-900 rounded-[2.5rem] max-w-xl mx-auto space-y-4 bg-red-50/10">
          <Icons.AlertCircle className="h-12 w-12 mx-auto text-red-500 opacity-80" />
          <h3 className="font-display text-lg font-bold text-red-800 dark:text-red-400">{error}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Có lỗi xảy ra trong quá trình kết nối với cơ sở dữ liệu. Vui lòng tải lại trang hoặc quay lại sau!
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-300 dark:border-slate-800 rounded-[2.5rem] max-w-xl mx-auto space-y-4">
          <Icons.Layers className="h-12 w-12 mx-auto text-slate-400 opacity-50" />
          <h3 className="font-display text-lg font-bold text-slate-800 dark:text-white">Nội dung giới thiệu đang được cập nhật.</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hệ thống dữ liệu đang cập nhật chi tiết các tổ chức. Thầy cô và các em quay lại sau nhé!
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* A. Featured Items Row (Wider display) */}
          {featuredItems.length > 0 && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-extrabold text-slate-950 dark:text-white flex items-center space-x-2">
                <Icons.Sparkles className="h-5 w-5 text-amber-500" />
                <span>Đơn vị tổ chức nòng cốt</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featuredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    id={`about-card-featured-${item.id}`}
                    whileHover={{ y: -6 }}
                    className="group relative overflow-hidden rounded-[2rem] border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <Link to={`${ROUTES.ABOUT}/${item.slug}`} className="block h-full">
                      {/* Optional top-strip accent */}
                      <div className="h-2" style={{ backgroundColor: item.accent_color || '#ef4444' }} />
                      
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            <div
                              className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
                              style={{ backgroundColor: item.accent_color || '#ef4444' }}
                            >
                              <DynamicIcon name={item.icon_name} className="h-6 w-6" />
                            </div>
                            <div>
                              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${itemTypeColors[item.item_type]}`}>
                                {itemTypeLabels[item.item_type]}
                              </span>
                              <h3 className="font-display font-extrabold text-base text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-1">
                                {item.title}
                              </h3>
                            </div>
                          </div>
                          
                          <div className="text-slate-400 dark:text-slate-600 group-hover:translate-x-0.5 transition-transform">
                            <Icons.ArrowRight className="h-5 w-5" />
                          </div>
                        </div>

                        {item.summary && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {item.summary}
                          </p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* B. Regular Items Directory */}
          {regularItems.length > 0 && (
            <div className="space-y-6">
              <h2 className="font-display text-lg font-extrabold text-slate-950 dark:text-white flex items-center space-x-2">
                <Icons.Layers className="h-5 w-5 text-blue-500" />
                <span>Danh sách phân đội trực thuộc</span>
              </h2>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {regularItems.map((item) => (
                  <motion.div
                    key={item.id}
                    id={`about-card-regular-${item.id}`}
                    variants={itemVariants}
                    whileHover={{ y: -4 }}
                    className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-xs hover:shadow-md transition-all duration-300"
                  >
                    <Link to={`${ROUTES.ABOUT}/${item.slug}`} className="flex flex-col justify-between h-full space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: item.accent_color || '#3b82f6' }}
                          >
                            <DynamicIcon name={item.icon_name} className="h-5 w-5" />
                          </div>
                          <div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${itemTypeColors[item.item_type]}`}>
                              {itemTypeLabels[item.item_type]}
                            </span>
                            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-0.5">
                              {item.title}
                            </h3>
                          </div>
                        </div>

                        {item.summary && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                            {item.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center text-[11px] font-bold text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Chi tiết hoạt động</span>
                        <Icons.ChevronRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
