/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Calendar, Users, CheckCircle, ArrowRight, X, User, BookOpen, Clock, Heart, Award } from 'lucide-react';
import { ActivityItem } from '../../types';

interface ActivitiesProps {
  activities: ActivityItem[];
  selectedItem: ActivityItem | null;
  onSelectItem: (item: ActivityItem | null) => void;
  onRegisterParticipation: (id: string) => void;
}

type TabFilter = 'all' | 'ongoing' | 'upcoming' | 'completed';

export default function Activities({
  activities,
  selectedItem,
  onSelectItem,
  onRegisterParticipation
}: ActivitiesProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [registeringItem, setRegisteringItem] = useState<ActivityItem | null>(null);
  
  // Registration form states
  const [fullName, setFullName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState(false);
  const [myRegisteredIds, setMyRegisteredIds] = useState<string[]>([]);

  const filteredActivities = activities.filter((act) => {
    if (activeTab === 'all') return true;
    return act.status === activeTab;
  });

  const handleOpenRegister = (item: ActivityItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setRegisteringItem(item);
    setIsRegisteredSuccess(false);
  };

  const handleCloseRegister = () => {
    setRegisteringItem(null);
    setFullName('');
    setStudentClass('');
  };

  const submitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !studentClass || !registeringItem) return;

    // Trigger participant count increment in parent state
    onRegisterParticipation(registeringItem.id);
    
    // Save locally to display checkmark
    setMyRegisteredIds(prev => [...prev, registeringItem.id]);
    setIsRegisteredSuccess(true);

    setTimeout(() => {
      handleCloseRegister();
    }, 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-10 pb-24">
      
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full inline-block">
          Học tập chủ động - Rèn luyện tích cực
        </span>
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight sm:text-4xl">
          Phong Trào & Hoạt Động
        </h1>
        <p className="font-sans text-sm text-slate-500 dark:text-slate-400">
          Nơi cập nhật các kế hoạch, phong trào thi đua măng non đang diễn ra hoặc sắp tổ chức của nhà trường.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex items-center justify-center space-x-1.5 border-b border-slate-100 pb-4 dark:border-slate-800">
        {[
          { id: 'all', label: 'Tất cả phong trào' },
          { id: 'ongoing', label: 'Đang diễn ra' },
          { id: 'upcoming', label: 'Sắp khởi động' },
          { id: 'completed', label: 'Đã hoàn thành' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabFilter)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-red-600 text-white shadow-sm shadow-red-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredActivities.map((act) => {
          const isJoined = myRegisteredIds.includes(act.id);
          return (
            <motion.div
              key={act.id}
              id={`activity-card-${act.id}`}
              layout
              whileHover={{ y: -4 }}
              onClick={() => onSelectItem(act)}
              className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 flex flex-col sm:flex-row gap-6 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Cover Photo */}
              <div className="w-full sm:w-48 h-48 shrink-0 rounded-xl overflow-hidden bg-slate-100 relative shadow-inner">
                <img 
                  src={act.image} 
                  alt={act.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  referrerPolicy="no-referrer"
                />
                
                {/* Status indicator on image */}
                <span className={`absolute top-2.5 left-2.5 uppercase text-[9px] font-extrabold px-2.5 py-1 rounded-full shadow-md text-white ${
                  act.status === 'ongoing' ? 'bg-emerald-600' :
                  act.status === 'upcoming' ? 'bg-blue-600 animate-pulse' : 'bg-slate-500'
                }`}>
                  {act.status === 'ongoing' ? 'Đang chạy' :
                   act.status === 'upcoming' ? 'Sắp mở' : 'Hoàn thành'}
                </span>
              </div>

              {/* Text content details */}
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Hạn: {act.date}</span>
                  </span>
                  
                  <h3 className="font-display font-bold text-lg text-slate-950 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400 leading-snug line-clamp-2">
                    {act.title}
                  </h3>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-sans">
                    {act.description}
                  </p>
                </div>

                {/* Footer values with Join button */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 shrink-0">
                    <Users className="h-4 w-4" />
                    <span><strong className="text-slate-700 dark:text-slate-300 font-extrabold">{act.participantsCount}+</strong> tham gia</span>
                  </span>

                  {act.status !== 'completed' ? (
                    isJoined ? (
                      <span className="flex items-center space-x-1 rounded-lg bg-emerald-50 text-emerald-600 px-3 py-1.5 text-xs font-bold dark:bg-emerald-950/30 dark:text-emerald-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Đã đăng ký</span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleOpenRegister(act, e)}
                        className="rounded-lg bg-red-600 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-red-700 transition-all shadow-md shadow-red-500/10"
                      >
                        Đăng ký nhanh
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-slate-400 italic">Phong trào khép lại</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail Popup Modal */}
      <AnimatePresence>
        {selectedItem && !registeringItem && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="activity-detail-modal">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onSelectItem(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto"
              >
                {/* Close */}
                <button
                  onClick={() => onSelectItem(null)}
                  className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors z-10"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Banner Photo */}
                <div className="aspect-[16/9] -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 overflow-hidden bg-slate-100 relative">
                  <img src={selectedItem.image} alt={selectedItem.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
                    <div>
                      <span className={`inline-block text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full mb-2 text-white shadow ${
                        selectedItem.status === 'ongoing' ? 'bg-emerald-600' :
                        selectedItem.status === 'upcoming' ? 'bg-blue-600' : 'bg-slate-500'
                      }`}>
                        {selectedItem.status === 'ongoing' ? 'Đang diễn ra' :
                         selectedItem.status === 'upcoming' ? 'Sắp mở' : 'Hoàn thành'}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display leading-tight">
                        {selectedItem.title}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-6 font-sans">
                  <div className="flex items-center space-x-6 text-xs font-semibold text-slate-400 border-b border-slate-100 pb-4 dark:border-slate-800/80">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span>Thời gian: {selectedItem.date}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-red-500" />
                      <span>{selectedItem.participantsCount}+ bạn tham dự</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Chi tiết hoạt động</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedItem.description}
                    </p>
                  </div>

                  {selectedItem.requirements && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                        <BookOpen className="h-4 w-4 text-blue-500" />
                        <span>Yêu cầu tham dự</span>
                      </h4>
                      <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                        {selectedItem.requirements}
                      </p>
                    </div>
                  )}

                  {selectedItem.benefits && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <span>Quyền lợi / Thành tích ghi nhận</span>
                      </h4>
                      <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                        {selectedItem.benefits}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => onSelectItem(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Quay lại
                    </button>

                    {selectedItem.status !== 'completed' && (
                      myRegisteredIds.includes(selectedItem.id) ? (
                        <span className="flex items-center space-x-1 rounded-xl bg-emerald-50 text-emerald-600 px-4 py-2.5 text-xs font-bold dark:bg-emerald-950/30 dark:text-emerald-400">
                          <CheckCircle className="h-4 w-4" />
                          <span>Em đã đăng ký tham gia</span>
                        </span>
                      ) : (
                        <button
                          onClick={(e) => handleOpenRegister(selectedItem, e)}
                          className="rounded-xl bg-red-600 text-white px-5 py-2.5 text-xs font-bold hover:bg-red-700 shadow-md transition-colors"
                        >
                          Đăng ký tham gia ngay
                        </button>
                      )
                    )}
                  </div>
                </div>

              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Form Dialog Overlay */}
      <AnimatePresence>
        {registeringItem && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="registration-dialog">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseRegister}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Sparkles className="h-5 w-5 text-red-600 dark:text-red-400 animate-pulse" />
                    <span>Đăng ký phong trào</span>
                  </h3>
                  <button onClick={handleCloseRegister} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {!isRegisteredSuccess ? (
                  <form onSubmit={submitRegistration} className="space-y-4 font-sans text-xs">
                    <div>
                      <p className="text-slate-500 mb-4 text-xs font-medium leading-relaxed">
                        Hãy điền thông tin đăng ký cho hoạt động: <br />
                        <strong className="text-blue-600 dark:text-blue-400">{registeringItem.title}</strong>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        Họ và tên của em:
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: Nguyễn Văn A"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        Lớp học (Chi đội):
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 9A1"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="flex w-full items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-red-600 py-3 text-xs font-extrabold text-white hover:from-blue-700 hover:to-red-700 transition-all shadow-md shadow-blue-500/10"
                    >
                      <CheckCircle className="h-4.5 w-4.5" />
                      <span>Xác nhận đăng ký tham dự</span>
                    </button>
                  </form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8 space-y-4 font-sans text-xs"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Đăng ký thành công!</h4>
                      <p className="text-slate-500 dark:text-slate-400">
                        Cảm ơn em <strong>{fullName} ({studentClass})</strong>. Liên đội đã nhận được đăng ký của em, hãy tích cực chuẩn bị tham gia nhé!
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
