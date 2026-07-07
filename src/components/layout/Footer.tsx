/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Award, Mail, Phone, MapPin, Send, Facebook, Youtube, ExternalLink, ShieldCheck } from 'lucide-react';
import { aboutService } from '../../services/aboutService';
import { ContactSubmission } from '../../types';

interface FooterProps {
  onNavigate: (viewId: string) => void;
  onSubmitSuggestion: (submission: Omit<ContactSubmission, 'id' | 'date' | 'status'>) => void;
}

export default function Footer({ onNavigate, onSubmitSuggestion }: FooterProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;

    onSubmitSuggestion({
      fullName: "Góp ý nhanh ẩn danh",
      email: email,
      phone: "N/A",
      subject: "Góp ý nhanh từ chân trang",
      message: message
    });

    setEmail('');
    setMessage('');
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 dark:bg-slate-950 transition-colors duration-300" id="main-footer">
      
      {/* Top Banner Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-blue-500 to-red-600" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Column 1: School Identity */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('home')}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-red-600 shadow-lg">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="block font-display text-base font-bold tracking-tight text-white uppercase leading-none">
                  Liên Đội THCS
                </span>
                <span className="block font-sans text-xs font-semibold text-red-500 mt-1">
                  Tôn Thất Tùng
                </span>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 italic font-medium leading-relaxed">
              "{aboutService.getSchoolSlogan()}"
            </p>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex items-start space-x-2.5">
                <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span>số 3 đường D2, phường Tân Sơn Nhì, thành phố Hồ Chí Minh</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Phone className="h-4 w-4 text-blue-400 shrink-0" />
                <span>028.3845.2410 - 098.334.2410</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                <span>liendoitonthattung.hcm@gmail.com</span>
              </div>
            </div>

            {/* Social icons */}
            <div className="flex items-center space-x-3 pt-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noreferrer" 
                className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all text-slate-400 shadow-md"
                title="Facebook Liên đội"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noreferrer" 
                className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all text-slate-400 shadow-md"
                title="Kênh phát thanh Măng non Youtube"
              >
                <Youtube className="h-4 w-4" />
              </a>
              <a 
                href="https://thieunhi.vietnam.vn" 
                target="_blank" 
                rel="noreferrer" 
                className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all text-slate-400 shadow-md"
                title="Trang Thiếu nhi Việt Nam"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Navigation */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-display text-sm font-bold tracking-wider text-slate-200 uppercase">
              Danh mục chính
            </h3>
            <ul className="space-y-2 text-xs">
              {[
                { id: 'about', label: 'Giới thiệu Liên đội' },
                { id: 'news', label: 'Tin tức & Hoạt động' },
                { id: 'gallery', label: 'Thư viện ảnh Đội' },
                { id: 'documents', label: 'Văn bản - Hướng dẫn' },
                { id: 'contact', label: 'Liên hệ - Hỏi đáp' }
              ].map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => onNavigate(link.id)}
                    className="hover:text-blue-400 hover:translate-x-1.5 transition-all duration-200 text-left block"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Suggestion / Feedback Form */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="font-display text-sm font-bold tracking-wider text-slate-200 uppercase">
              Hòm thư góp ý Liên đội
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mọi ý kiến đóng góp, hiến kế hoạt động Đội hoặc chia sẻ tâm tư, em hãy gửi trực tiếp về Ban chỉ huy Liên đội:
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative rounded-xl">
                <input
                  type="email"
                  placeholder="Email của em..."
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="relative rounded-xl">
                <textarea
                  placeholder="Nội dung góp ý, hiến kế..."
                  required
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-red-600 py-3 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-red-700 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Gửi ý kiến đóng góp</span>
              </button>

              {isSubmitted && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-1.5 text-emerald-500 text-[11px] font-semibold pt-1"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Cảm ơn em! Ý kiến đã được gửi ẩn danh thành công.</span>
                </motion.div>
              )}
            </form>
          </div>

        </div>

        {/* Bottom copyright info */}
        <div className="mt-12 border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 font-medium">
          <p>© 2026 {aboutService.getSchoolName()}. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center space-x-4 mt-3 md:mt-0">
            <span className="hover:text-slate-300 transition-colors">Điều khoản</span>
            <span>•</span>
            <span className="hover:text-slate-300 transition-colors">Bảo mật</span>
            <span>•</span>
            <button 
              onClick={() => onNavigate('cms')} 
              className="text-red-500 hover:text-red-400 transition-colors font-bold cursor-pointer"
            >
              Trang Quản Trị CMS
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
