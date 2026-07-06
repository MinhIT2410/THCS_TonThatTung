/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Search, Download, Calendar, FolderOpen, ArrowRight, CheckCircle, Sparkles, Building, AlertCircle } from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentsProps {
  documents: DocumentItem[];
}

type DocCategory = 'Tất cả' | 'Nghị quyết' | 'Kế hoạch' | 'Điều lệ' | 'Hướng dẫn';

export default function Documents({ documents }: DocumentsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<DocCategory>('Tất cả');
  
  // Simulation of document download
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = activeCategory === 'Tất cả' || doc.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [documents, searchTerm, activeCategory]);

  const handleDownload = (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(doc.id);

    setTimeout(() => {
      setDownloadingId(null);
      setDownloadedIds(prev => [...prev, doc.id]);
      
      // Open in a new tab simulation
      alert(`Đang tiến hành tải tệp tin văn bản: "${doc.title}" (${doc.fileSize}) thành công.`);
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 pb-24">
      
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full inline-block">
          Công khai - Minh bạch - Kịp thời
        </span>
        <h1 className="font-display text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-5xl">
          Văn Bản - Hướng Dẫn
        </h1>
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
          Tra cứu, khai thác hệ thống văn bản chỉ đạo của Hội đồng Đội, kế hoạch Liên đội và tài liệu rèn luyện Đội viên.
        </p>
      </div>

      {/* Filters and Search box */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 dark:border-slate-800">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {['Tất cả', 'Nghị quyết', 'Kế hoạch', 'Điều lệ', 'Hướng dẫn'].map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as DocCategory)}
                className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Tìm theo tiêu đề hoặc ký hiệu số..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
          />
          <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
        </div>
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 space-y-3 max-w-sm mx-auto">
          <AlertCircle className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-200">Không tìm thấy tài liệu nào</h3>
          <p className="text-xs text-slate-500">Em hãy thử nhập mã số hiệu hoặc xem kỹ lại bộ lọc loại văn bản nhé.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          
          {/* Table wrapper for desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-4 px-6">Số ký hiệu</th>
                  <th className="py-4 px-6">Tên văn bản / Quy định</th>
                  <th className="py-4 px-6">Đơn vị ban hành</th>
                  <th className="py-4 px-6">Ngày ban hành</th>
                  <th className="py-4 px-6 text-center">Tải xuống</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocs.map((doc, idx) => {
                  const isDownloading = downloadingId === doc.id;
                  const isDownloaded = downloadedIds.includes(doc.id);
                  return (
                    <tr 
                      key={doc.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors font-medium text-slate-600 dark:text-slate-300"
                    >
                      {/* Code */}
                      <td className="py-4.5 px-6 font-mono font-bold text-red-600 dark:text-red-400">
                        {doc.code}
                      </td>

                      {/* Title & Badge */}
                      <td className="py-4.5 px-6 max-w-md">
                        <div className="flex items-start space-x-2">
                          <FileText className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-bold text-slate-900 dark:text-white leading-normal">
                              {doc.title}
                            </span>
                            <span className="inline-block text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 mt-1">
                              {doc.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Issuing Body */}
                      <td className="py-4.5 px-6 font-semibold flex items-center space-x-1 mt-2">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        <span>{doc.issuingBody}</span>
                      </td>

                      {/* Date */}
                      <td className="py-4.5 px-6">
                        {doc.date}
                      </td>

                      {/* Download */}
                      <td className="py-4.5 px-6 text-center">
                        {isDownloading ? (
                          <div className="flex items-center justify-center space-x-1 text-blue-600">
                            <Sparkles className="h-4 w-4 animate-spin" />
                            <span className="text-[10px]">Tải...</span>
                          </div>
                        ) : isDownloaded ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-500 font-bold text-[10px]">
                            <CheckCircle className="h-4 w-4" />
                            <span>Đã tải</span>
                          </span>
                        ) : (
                          <button
                            onClick={(e) => handleDownload(doc, e)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-all"
                            title={`Tải về (${doc.fileSize})`}
                          >
                            <Download className="h-4.5 w-4.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Card list layout for mobile viewport */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredDocs.map((doc) => {
              const isDownloading = downloadingId === doc.id;
              const isDownloaded = downloadedIds.includes(doc.id);
              return (
                <div key={doc.id} className="p-4 space-y-3 font-sans text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-red-600 dark:text-red-400 text-[11px]">
                      {doc.code}
                    </span>
                    <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold">
                      {doc.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white leading-normal">
                    {doc.title}
                  </h3>

                  <div className="space-y-1.5 text-slate-500 dark:text-slate-400 font-medium">
                    <div className="flex items-center space-x-1.5">
                      <Building className="h-3.5 w-3.5" />
                      <span>Nơi ban hành: {doc.issuingBody}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Ngày ký: {doc.date}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold">Cỡ tệp: {doc.fileSize}</span>
                    
                    {isDownloading ? (
                      <span className="text-blue-600 font-semibold flex items-center space-x-1">
                        <Sparkles className="h-3.5 w-3.5 animate-spin" />
                        <span>Đang tải...</span>
                      </span>
                    ) : isDownloaded ? (
                      <span className="text-emerald-500 font-bold flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>Đã tải thành công</span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleDownload(doc, e)}
                        className="flex items-center space-x-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 px-3.5 py-1.5 font-bold"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Tải tệp tin</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
