/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, Lock, Key, CheckCircle, Trash2, Edit, Plus, FolderSync, 
  MessageSquare, FileText, Calendar, Image as ImageIcon, FileCode, Check, Eye, X, RefreshCw
} from 'lucide-react';
import { NewsItem, ActivityItem, PhotoItem, DocumentItem, ContactSubmission } from '../../types';
import { LogoutButton } from '../auth/LogoutButton';
import { useAuth } from '../../contexts/AuthContext';

interface CMSProps {
  schoolName: string;
  setSchoolName: (name: string) => void;
  schoolSlogan: string;
  setSchoolSlogan: (slogan: string) => void;
  
  news: NewsItem[];
  setNews: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  activities: ActivityItem[];
  setActivities: React.Dispatch<React.SetStateAction<ActivityItem[]>>;
  photos: PhotoItem[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoItem[]>>;
  documents: DocumentItem[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentItem[]>>;
  contacts: ContactSubmission[];
  setContacts: React.Dispatch<React.SetStateAction<ContactSubmission[]>>;

  onResetDefaults: () => void;
}

type CMSTab = 'dashboard' | 'news' | 'activities' | 'photos' | 'documents' | 'contacts' | 'settings';

export default function CMS({
  schoolName,
  setSchoolName,
  schoolSlogan,
  setSchoolSlogan,
  news,
  setNews,
  activities,
  setActivities,
  photos,
  setPhotos,
  documents,
  setDocuments,
  contacts,
  setContacts,
  onResetDefaults
}: CMSProps) {
  const { profile, primaryRole } = useAuth();

  // CMS state values
  const [activeTab, setActiveTab] = useState<CMSTab>('dashboard');

  // Editor states (Modals or quick forms)
  const [editingNews, setEditingNews] = useState<Partial<NewsItem> | null>(null);
  const [editingActivity, setEditingActivity] = useState<Partial<ActivityItem> | null>(null);
  const [editingDoc, setEditingDoc] = useState<Partial<DocumentItem> | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Partial<PhotoItem> | null>(null);

  // Simulated notifications
  const [cmsAlert, setCmsAlert] = useState('');

  const triggerAlert = (msg: string) => {
    setCmsAlert(msg);
    setTimeout(() => setCmsAlert(''), 3000);
  };

  // 2. School Info Configuration Form
  const saveSchoolSettings = (e: React.FormEvent) => {
    e.preventDefault();
    triggerAlert('Đã cập nhật cấu hình thông tin Liên đội thành công!');
  };

  // 3. News CRUD handlers
  const handleSaveNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews?.title || !editingNews?.content) return;

    if (editingNews.id) {
      // Edit mode
      setNews(prev => prev.map(n => n.id === editingNews.id ? { ...n, ...editingNews as NewsItem } : n));
      triggerAlert('Đã cập nhật bài viết thành công!');
    } else {
      // Create mode
      const newItem: NewsItem = {
        id: `news-${Date.now()}`,
        title: editingNews.title,
        category: editingNews.category || 'Sự kiện',
        date: new Date().toISOString().split('T')[0],
        summary: editingNews.summary || '',
        content: editingNews.content,
        image: editingNews.image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80',
        views: 0,
        featured: editingNews.featured || false
      };
      setNews(prev => [newItem, ...prev]);
      triggerAlert('Đã tạo bài viết mới thành công!');
    }
    setEditingNews(null);
  };

  const handleDeleteNews = (id: string) => {
    if (confirm('Em có chắc chắn muốn xóa bài viết này không?')) {
      setNews(prev => prev.filter(n => n.id !== id));
      triggerAlert('Đã xóa bài viết khỏi cơ sở dữ liệu!');
    }
  };

  // 4. Activities CRUD handlers
  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity?.title || !editingActivity?.description) return;

    if (editingActivity.id) {
      setActivities(prev => prev.map(a => a.id === editingActivity.id ? { ...a, ...editingActivity as ActivityItem } : a));
      triggerAlert('Đã cập nhật phong trào thành công!');
    } else {
      const newItem: ActivityItem = {
        id: `act-${Date.now()}`,
        title: editingActivity.title,
        status: editingActivity.status || 'ongoing',
        date: editingActivity.date || '2026-11-01',
        description: editingActivity.description,
        requirements: editingActivity.requirements || '',
        benefits: editingActivity.benefits || '',
        image: editingActivity.image || 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80',
        participantsCount: 0
      };
      setActivities(prev => [newItem, ...prev]);
      triggerAlert('Đã khởi động phong trào mới!');
    }
    setEditingActivity(null);
  };

  const handleDeleteActivity = (id: string) => {
    if (confirm('Xóa phong trào thi đua này?')) {
      setActivities(prev => prev.filter(a => a.id !== id));
      triggerAlert('Đã hủy phong trào thành công!');
    }
  };

  // 5. Photos CRUD handlers
  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto?.title || !editingPhoto?.imageUrl) return;

    if (editingPhoto.id) {
      setPhotos(prev => prev.map(p => p.id === editingPhoto.id ? { ...p, ...editingPhoto as PhotoItem } : p));
      triggerAlert('Đã sửa ảnh thành công!');
    } else {
      const newItem: PhotoItem = {
        id: `photo-${Date.now()}`,
        title: editingPhoto.title,
        category: editingPhoto.category || 'Hoạt động',
        imageUrl: editingPhoto.imageUrl,
        date: new Date().toISOString().split('T')[0],
        description: editingPhoto.description || ''
      };
      setPhotos(prev => [newItem, ...prev]);
      triggerAlert('Đã tải lên ảnh mới vào thư viện!');
    }
    setEditingPhoto(null);
  };

  const handleDeletePhoto = (id: string) => {
    if (confirm('Xóa ảnh này khỏi thư viện?')) {
      setPhotos(prev => prev.filter(p => p.id !== id));
      triggerAlert('Đã xóa ảnh thành công!');
    }
  };

  // 6. Documents CRUD handlers
  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc?.title || !editingDoc?.code) return;

    if (editingDoc.id) {
      setDocuments(prev => prev.map(d => d.id === editingDoc.id ? { ...d, ...editingDoc as DocumentItem } : d));
      triggerAlert('Đã cập nhật văn bản hướng dẫn!');
    } else {
      const newItem: DocumentItem = {
        id: `doc-${Date.now()}`,
        title: editingDoc.title,
        code: editingDoc.code,
        category: editingDoc.category || 'Kế hoạch',
        date: new Date().toISOString().split('T')[0],
        issuingBody: editingDoc.issuingBody || 'Ban chỉ huy Liên đội',
        fileUrl: '#',
        fileSize: editingDoc.fileSize || '1.2 MB'
      };
      setDocuments(prev => [newItem, ...prev]);
      triggerAlert('Đã xuất bản văn bản mới lên cổng thông tin!');
    }
    setEditingDoc(null);
  };

  const handleDeleteDoc = (id: string) => {
    if (confirm('Hủy bỏ tài liệu hướng dẫn này?')) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      triggerAlert('Đã xóa văn bản lưu trữ!');
    }
  };

  // 7. Feedback/Contact logs handlers
  const handleToggleContactRead = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'unread' ? 'read' : 'unread' } : c));
    triggerAlert('Đã chuyển đổi trạng thái đọc phản hồi!');
  };

  const handleDeleteContact = (id: string) => {
    if (confirm('Em có chắc muốn xóa phản hồi góp ý này không?')) {
      setContacts(prev => prev.filter(c => c.id !== id));
      triggerAlert('Đã dọn dẹp hòm thư!');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-24 font-sans text-xs">
      
      {/* Alert Overlay Banner */}
      <AnimatePresence>
        {cmsAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 px-5 py-3 shadow-2xl flex items-center space-x-2 font-bold"
          >
            <Check className="h-5 w-5 bg-emerald-500/10 rounded-full p-0.5" />
            <span>{cmsAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section with logout and defaults reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
            <Settings className="h-6 w-6 animate-spin" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white leading-tight">Hệ Thống CMS Quản Trị</h1>
            <div className="mt-1 text-slate-500 dark:text-slate-400 font-semibold space-y-0.5">
              <p>Xin chào, <span className="text-blue-600 dark:text-blue-400 font-bold">{profile?.full_name || 'Quản trị viên'}</span></p>
              <p>Vai trò: <span className="text-red-500 dark:text-red-400 font-bold">{primaryRole?.name || primaryRole?.code || 'Quản trị hệ thống'}</span></p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Reset database */}
          <button
            onClick={() => { if(confirm('Sẽ xóa sạch mọi chỉnh sửa để khôi phục dữ liệu Liên đội mặc định ban đầu?')) { onResetDefaults(); triggerAlert('Đã khôi phục dữ liệu Liên đội mặc định!'); } }}
            className="flex items-center space-x-1 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-bold text-slate-600 dark:text-slate-300 transition-colors"
            title="Khôi phục gốc"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Khôi phục gốc</span>
          </button>

          {/* Logout */}
          <LogoutButton />
        </div>
      </div>

      {/* Grid Menu & Tabs Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side menu list */}
        <div className="lg:col-span-3 flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-none border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800/80 lg:pr-4">
          {[
            { id: 'dashboard', label: 'Bảng điều khiển', icon: FolderSync },
            { id: 'contacts', label: 'Ý kiến góp ý', icon: MessageSquare, badge: contacts.filter(c => c.status === 'unread').length },
            { id: 'news', label: 'Sửa Tin tức', icon: FileText },
            { id: 'activities', label: 'Sửa Hoạt động', icon: Calendar },
            { id: 'photos', label: 'Sửa Ảnh đội', icon: ImageIcon },
            { id: 'documents', label: 'Sửa Văn bản', icon: FileCode },
            { id: 'settings', label: 'Thông tin chung', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CMSTab)}
                className={`flex items-center justify-between w-full rounded-xl px-4 py-3.5 text-xs font-bold whitespace-nowrap lg:whitespace-normal transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <Icon className="h-4.5 w-4.5" />
                  <span>{tab.label}</span>
                </span>
                {!!tab.badge && tab.badge > 0 && (
                  <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[9px] font-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Side Content Pane */}
        <div className="lg:col-span-9">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <span className="block text-slate-400 font-bold">Thư góp ý mới</span>
                  <span className="block text-3xl font-black text-slate-900 dark:text-white mt-1">
                    {contacts.filter(c => c.status === 'unread').length} / {contacts.length}
                  </span>
                </div>
                <div className="p-5 border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <span className="block text-slate-400 font-bold">Tổng tin bài</span>
                  <span className="block text-3xl font-black text-slate-900 dark:text-white mt-1">{news.length}</span>
                </div>
                <div className="p-5 border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <span className="block text-slate-400 font-bold">Tổng phong trào</span>
                  <span className="block text-3xl font-black text-slate-900 dark:text-white mt-1">{activities.length}</span>
                </div>
                <div className="p-5 border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                  <span className="block text-slate-400 font-bold">Thư viện ảnh</span>
                  <span className="block text-3xl font-black text-slate-900 dark:text-white mt-1">{photos.length} ảnh</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">Kiểm duyệt Góp ý/Hiến kế Mới nhận</h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {contacts.slice(0, 3).map((item) => (
                    <div key={item.id} className="py-3.5 flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 dark:text-white">{item.fullName}</span>
                          <span className="text-[10px] text-slate-400">{item.date}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            item.status === 'unread' ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.status === 'unread' ? 'Chưa đọc' : 'Đã duyệt'}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium italic">"{item.message}"</p>
                      </div>

                      <button 
                        onClick={() => handleToggleContactRead(item.id)}
                        className="text-blue-500 font-bold hover:underline"
                      >
                        {item.status === 'unread' ? 'Duyệt đọc' : 'Đánh dấu chưa đọc'}
                      </button>
                    </div>
                  ))}
                  {contacts.length === 0 && (
                    <p className="text-slate-400 italic text-center py-4">Hiện không có bức thư góp ý nào.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUGGESTIONS LOG LIST */}
          {activeTab === 'contacts' && (
            <div className="space-y-6 fade-in">
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Danh sách hòm thư góp ý Liên đội ({contacts.length})</h2>
              
              <div className="space-y-4">
                {contacts.map((c) => (
                  <div key={c.id} className={`p-4 border rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4 transition-colors ${
                    c.status === 'unread' ? 'border-l-4 border-l-red-500' : ''
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{c.fullName}</span>
                          <span className="text-[10px] text-slate-400">{c.date}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          <span>SĐT: {c.phone}</span>
                          <span>Email: {c.email}</span>
                          <strong className="text-blue-600 dark:text-blue-400">Chủ đề: {c.subject}</strong>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleContactRead(c.id)}
                          className={`p-1.5 rounded-lg border text-[11px] font-bold ${
                            c.status === 'unread' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {c.status === 'unread' ? 'Duyệt đọc' : 'Chưa đọc'}
                        </button>
                        <button
                          onClick={() => handleDeleteContact(c.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>

                    <p className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl italic font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                      "{c.message}"
                    </p>
                  </div>
                ))}

                {contacts.length === 0 && (
                  <p className="text-slate-400 italic text-center py-12">Hiện không có hòm thư góp ý nào cần duyệt.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NEWS CONTENT CMS */}
          {activeTab === 'news' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Danh sách tin tức măng non</h2>
                <button
                  onClick={() => setEditingNews({})}
                  className="flex items-center space-x-1.5 bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Viết tin bài mới</span>
                </button>
              </div>

              {/* News items list table */}
              <div className="border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {news.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                      <div className="flex items-center space-x-3.5">
                        <img src={item.image} className="h-10 w-16 object-cover rounded-md" referrerPolicy="no-referrer" />
                        <div>
                          <span className="block font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</span>
                          <span className="text-[10px] text-slate-400">{item.date} • {item.category} • {item.views} lượt xem</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingNews(item)}
                          className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNews(item.id)}
                          className="p-2 border border-slate-200 text-red-500 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVITIES PLAN CMS */}
          {activeTab === 'activities' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Sửa đổi kế hoạch thi đua</h2>
                <button
                  onClick={() => setEditingActivity({})}
                  className="flex items-center space-x-1.5 bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Phát động phong trào</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activities.map((act) => (
                    <div key={act.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                      <div className="flex items-center space-x-3.5">
                        <img src={act.image} className="h-10 w-16 object-cover rounded-md" referrerPolicy="no-referrer" />
                        <div>
                          <span className="block font-bold text-slate-900 dark:text-white line-clamp-1">{act.title}</span>
                          <span className="text-[10px] text-slate-400">{act.date} • Trạng thái: {act.status}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingActivity(act)}
                          className="p-2 border border-slate-200 text-slate-600 rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteActivity(act.id)}
                          className="p-2 border border-slate-200 text-red-500 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GALLERY CONTENT CMS */}
          {activeTab === 'photos' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Sửa thư viện ảnh Đội</h2>
                <button
                  onClick={() => setEditingPhoto({})}
                  className="flex items-center space-x-1.5 bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Đăng ảnh mới</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photos.map((item) => (
                  <div key={item.id} className="border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden p-3 relative group">
                    <img src={item.imageUrl} className="w-full aspect-square object-cover rounded-xl" referrerPolicy="no-referrer" />
                    <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1 mt-2 text-[11px]">{item.title}</h4>
                    <span className="text-[10px] text-slate-400">{item.category}</span>
                    
                    <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingPhoto(item)}
                        className="bg-white text-slate-800 p-1.5 rounded-lg shadow-md"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(item.id)}
                        className="bg-red-600 text-white p-1.5 rounded-lg shadow-md"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS PLAN CMS */}
          {activeTab === 'documents' && (
            <div className="space-y-6 fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Quản lý kho văn bản chỉ đạo</h2>
                <button
                  onClick={() => setEditingDoc({})}
                  className="flex items-center space-x-1.5 bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Đăng tải văn bản</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-red-600 text-xs">{doc.code}</span>
                        <h4 className="font-bold text-slate-900 dark:text-white mt-0.5">{doc.title}</h4>
                        <span className="text-[10px] text-slate-400">{doc.category} • Nơi ban hành: {doc.issuingBody}</span>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingDoc(doc)}
                          className="p-2 border border-slate-200 text-slate-600 rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-2 border border-slate-200 text-red-500 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: GENERAL SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 fade-in">
              <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Cấu hình chung thông tin trường</h2>
              
              <form onSubmit={saveSchoolSettings} className="space-y-4 rounded-2xl border border-slate-200 p-6 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Tên Liên Đội:</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white font-extrabold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Slogan hành động chính thức:</label>
                  <input
                    type="text"
                    value={schoolSlogan}
                    onChange={(e) => setSchoolSlogan(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white italic"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow-md"
                >
                  Xác nhận lưu thay đổi
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

      {/* MODAL EDIT NEWS */}
      {editingNews !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setEditingNews(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSaveNews}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-2xl space-y-4"
            >
              <h3 className="font-display font-bold text-base border-b border-slate-100 pb-2 dark:border-slate-800 text-slate-900 dark:text-white">
                {editingNews.id ? 'Cập nhật tin bài viết' : 'Đăng bài viết mới'}
              </h3>

              <div className="space-y-3 font-sans">
                <div className="space-y-1">
                  <label className="font-bold">Tiêu đề bài viết:</label>
                  <input
                    type="text"
                    required
                    value={editingNews.title || ''}
                    onChange={(e) => setEditingNews({ ...editingNews, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Chuyên mục:</label>
                    <select
                      value={editingNews.category || 'Sự kiện'}
                      onChange={(e) => setEditingNews({ ...editingNews, category: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Sự kiện">Sự kiện</option>
                      <option value="Học tập">Học tập</option>
                      <option value="Rèn luyện">Rèn luyện</option>
                      <option value="Gương sáng">Gương sáng</option>
                    </select>
                  </div>

                  <div className="space-y-1 flex items-center pt-6">
                    <label className="flex items-center space-x-2 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingNews.featured || false}
                        onChange={(e) => setEditingNews({ ...editingNews, featured: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <span>Đặt làm Tin nổi bật</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Đường dẫn ảnh bìa (URL):</label>
                  <input
                    type="text"
                    value={editingNews.image || ''}
                    onChange={(e) => setEditingNews({ ...editingNews, image: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Tóm tắt ngắn bài viết:</label>
                  <textarea
                    rows={2}
                    value={editingNews.summary || ''}
                    onChange={(e) => setEditingNews({ ...editingNews, summary: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Nội dung chi tiết bài viết:</label>
                  <textarea
                    required
                    rows={5}
                    value={editingNews.content || ''}
                    onChange={(e) => setEditingNews({ ...editingNews, content: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingNews(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl shadow-md"
                >
                  Lưu bài viết
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      )}

      {/* MODAL EDIT ACTIVITY */}
      {editingActivity !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setEditingActivity(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSaveActivity}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-2xl space-y-4"
            >
              <h3 className="font-display font-bold text-base border-b border-slate-100 pb-2 dark:border-slate-800 text-slate-900 dark:text-white">
                {editingActivity.id ? 'Sửa phong trào thi đua' : 'Phát động phong trào Đội mới'}
              </h3>

              <div className="space-y-3 font-sans">
                <div className="space-y-1">
                  <label className="font-bold">Tên phong trào hoạt động:</label>
                  <input
                    type="text"
                    required
                    value={editingActivity.title || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Trạng thái:</label>
                    <select
                      value={editingActivity.status || 'ongoing'}
                      onChange={(e) => setEditingActivity({ ...editingActivity, status: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                    >
                      <option value="ongoing">Đang diễn ra</option>
                      <option value="upcoming">Sắp mở đăng ký</option>
                      <option value="completed">Đã hoàn thành</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">Hạn tham gia / Thời gian:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 10/11 - 25/12"
                      value={editingActivity.date || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, date: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Đường dẫn ảnh bìa (URL):</label>
                  <input
                    type="text"
                    value={editingActivity.image || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, image: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Mô tả khái quát kế hoạch:</label>
                  <textarea
                    required
                    rows={3}
                    value={editingActivity.description || ''}
                    onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white dark:bg-slate-950 text-xs focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Yêu cầu tham dự:</label>
                    <textarea
                      rows={2}
                      value={editingActivity.requirements || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, requirements: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white dark:bg-slate-950 text-xs focus:outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">Quyền lợi / Ghi nhận Đội:</label>
                    <textarea
                      rows={2}
                      value={editingActivity.benefits || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, benefits: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white dark:bg-slate-950 text-xs focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl shadow-md"
                >
                  Lưu kế hoạch
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      )}

      {/* MODAL EDIT PHOTO */}
      {editingPhoto !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setEditingPhoto(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSavePhoto}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-2xl space-y-4"
            >
              <h3 className="font-display font-bold text-base border-b border-slate-100 pb-2 dark:border-slate-800 text-slate-900 dark:text-white">
                {editingPhoto.id ? 'Sửa thông tin ảnh' : 'Tải lên hình ảnh Đội mới'}
              </h3>

              <div className="space-y-3 font-sans">
                <div className="space-y-1">
                  <label className="font-bold">Tiêu đề ảnh / Tên khoảnh khắc:</label>
                  <input
                    type="text"
                    required
                    value={editingPhoto.title || ''}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Chuyên mục ảnh:</label>
                  <select
                    value={editingPhoto.category || 'Hoạt động'}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, category: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Đại hội">Đại hội</option>
                    <option value="Thể thao">Thể thao</option>
                    <option value="Văn nghệ">Văn nghệ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Đường dẫn ảnh (URL):</label>
                  <input
                    type="text"
                    required
                    value={editingPhoto.imageUrl || ''}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, imageUrl: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Mô tả ảnh cụ thể:</label>
                  <textarea
                    rows={3}
                    value={editingPhoto.description || ''}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white dark:bg-slate-950 text-xs focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPhoto(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl shadow-md"
                >
                  Đăng ảnh
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      )}

      {/* MODAL EDIT DOCUMENT */}
      {editingDoc !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setEditingDoc(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSaveDoc}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-2xl space-y-4"
            >
              <h3 className="font-display font-bold text-base border-b border-slate-100 pb-2 dark:border-slate-800 text-slate-900 dark:text-white">
                {editingDoc.id ? 'Sửa văn bản chỉ đạo' : 'Xuất bản văn bản mới'}
              </h3>

              <div className="space-y-3 font-sans">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Số hiệu văn bản:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 05/QĐ-LĐ"
                      value={editingDoc.code || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, code: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">Thể loại văn bản:</label>
                    <select
                      value={editingDoc.category || 'Kế hoạch'}
                      onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                    >
                      <option value="Nghị quyết">Nghị quyết</option>
                      <option value="Kế hoạch">Kế hoạch</option>
                      <option value="Điều lệ">Điều lệ</option>
                      <option value="Hướng dẫn">Hướng dẫn</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold">Tên văn bản cụ thể:</label>
                  <input
                    type="text"
                    required
                    value={editingDoc.title || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold">Nơi ban hành:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Ban Chỉ huy Liên đội"
                      value={editingDoc.issuingBody || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, issuingBody: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold">Dung lượng tệp tải lên:</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 1.2 MB"
                      value={editingDoc.fileSize || ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, fileSize: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white dark:bg-slate-950 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white font-bold px-5 py-2 rounded-xl shadow-md"
                >
                  Xuất bản
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      )}

    </div>
  );
}
