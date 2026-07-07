/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, FileText, Calendar, FileCode, ArrowRight, AlertCircle 
} from 'lucide-react';

import Layout from './pages/Layout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import NewsPage from './pages/NewsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import GalleryPage from './pages/GalleryPage';
import DocumentsPage from './pages/DocumentsPage';
import ContactPage from './pages/ContactPage';
import AdminPage from './pages/AdminPage';

import { newsService } from './services/newsService';
import { activityService } from './services/activityService';
import { documentService } from './services/documentService';
import { galleryService } from './services/galleryService';
import { aboutService } from './services/aboutService';
import { storage } from './services/storage/localStorage';
import { NewsItem, ActivityItem, PhotoItem, DocumentItem, ContactSubmission, LeaderProfile } from './types';

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- View state derived from Route Path ---
  const getActiveView = (pathname: string): string => {
    if (pathname === '/') return 'home';
    if (pathname === '/gioi-thieu') return 'about';
    if (pathname === '/tin-tuc') return 'news';
    if (pathname === '/hoat-dong') return 'activities';
    if (pathname === '/thu-vien') return 'gallery';
    if (pathname === '/van-ban') return 'documents';
    if (pathname === '/lien-he') return 'contact';
    if (pathname === '/quan-tri') return 'cms';
    return 'home';
  };
  const currentView = getActiveView(location.pathname);

  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  // --- Dark Mode State ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = storage.get<string>('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // --- Core Persistent State ---
  const [schoolName, setSchoolName] = useState<string>(() => {
    const saved = storage.get<string>('schoolName');
    return (!saved || saved === "Liên đội THCS Chu Văn An") ? aboutService.getSchoolName() : saved;
  });
  
  const [schoolSlogan, setSchoolSlogan] = useState<string>(() => {
    const saved = storage.get<string>('schoolSlogan');
    return (!saved || saved === "Thiếu nhi Chu Văn An - Chăm ngoan, học tốt, tiếp bước cha anh") ? aboutService.getSchoolSlogan() : saved;
  });

  const [leaders, setLeaders] = useState<LeaderProfile[]>(() => {
    const saved = storage.get<LeaderProfile[]>('leaders');
    return saved !== null ? saved : aboutService.getAll();
  });

  const [news, setNews] = useState<NewsItem[]>(() => {
    const saved = storage.get<NewsItem[]>('news');
    return saved !== null ? saved : newsService.getAll();
  });

  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    const saved = storage.get<ActivityItem[]>('activities');
    return saved !== null ? saved : activityService.getAll();
  });

  const [photos, setPhotos] = useState<PhotoItem[]>(() => {
    const saved = storage.get<PhotoItem[]>('photos');
    return saved !== null ? saved : galleryService.getAll();
  });

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = storage.get<DocumentItem[]>('documents');
    return saved !== null ? saved : documentService.getAll();
  });

  const [contacts, setContacts] = useState<ContactSubmission[]>(() => {
    const saved = storage.get<ContactSubmission[]>('contacts');
    return saved !== null ? saved : [];
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('isAdmin') === 'true';
  });

  // --- Search Overlay States ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // --- Scroll to Top Helper on Route Change ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  // --- Dark Mode Sync with Class ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      storage.set<string>('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      storage.set<string>('theme', 'light');
    }
  }, [isDarkMode]);

  // --- Persist Core Data changes to Local Storage ---
  useEffect(() => {
    storage.set<string>('schoolName', schoolName);
  }, [schoolName]);

  useEffect(() => {
    storage.set<string>('schoolSlogan', schoolSlogan);
  }, [schoolSlogan]);

  useEffect(() => {
    storage.set<LeaderProfile[]>('leaders', leaders);
  }, [leaders]);

  useEffect(() => {
    storage.set<NewsItem[]>('news', news);
  }, [news]);

  useEffect(() => {
    storage.set<ActivityItem[]>('activities', activities);
  }, [activities]);

  useEffect(() => {
    storage.set<PhotoItem[]>('photos', photos);
  }, [photos]);

  useEffect(() => {
    storage.set<DocumentItem[]>('documents', documents);
  }, [documents]);

  useEffect(() => {
    storage.set<ContactSubmission[]>('contacts', contacts);
  }, [contacts]);

  useEffect(() => {
    sessionStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
  }, [isAdmin]);

  // --- Reset database to default seed data ---
  const handleResetDefaults = () => {
    setSchoolName(aboutService.getSchoolName());
    setSchoolSlogan(aboutService.getSchoolSlogan());
    setLeaders(aboutService.getAll());
    setNews(newsService.getAll());
    setActivities(activityService.getAll());
    setPhotos(galleryService.getAll());
    setDocuments(documentService.getAll());
    setContacts([]);
  };

  // --- Interactivity handlers ---
  const handleIncrementNewsViews = (id: string) => {
    setNews(prev => prev.map(item => item.id === id ? { ...item, views: item.views + 1 } : item));
  };

  const handleRegisterActivityParticipation = (id: string) => {
    setActivities(prev => prev.map(item => item.id === id ? { ...item, participantsCount: item.participantsCount + 1 } : item));
  };

  const handleSubmitContactForm = (submission: Omit<ContactSubmission, 'id' | 'date' | 'status'>) => {
    const newSubmission: ContactSubmission = {
      ...submission,
      id: `sub-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      status: 'unread'
    };
    setContacts(prev => [newSubmission, ...prev]);
  };

  // --- Navigation routers mapping ---
  const handleNavigate = (viewId: string) => {
    if (viewId === 'home') navigate('/');
    else if (viewId === 'about') navigate('/gioi-thieu');
    else if (viewId === 'news') navigate('/tin-tuc');
    else if (viewId === 'activities') navigate('/hoat-dong');
    else if (viewId === 'gallery') navigate('/thu-vien');
    else if (viewId === 'documents') navigate('/van-ban');
    else if (viewId === 'contact') navigate('/lien-he');
    else if (viewId === 'cms') navigate('/quan-tri');
  };

  const handleSelectNewsItem = (item: NewsItem) => {
    setSelectedNews(item);
    navigate('/tin-tuc');
  };

  const handleSelectActivityItem = (item: ActivityItem) => {
    setSelectedActivity(item);
    navigate('/hoat-dong');
  };

  // --- Global search engine matches ---
  const searchResults = React.useMemo(() => {
    if (!globalSearchTerm.trim()) return { news: [], activities: [], docs: [] };
    const term = globalSearchTerm.toLowerCase();

    const matchedNews = news.filter(n => n.title.toLowerCase().includes(term) || n.summary.toLowerCase().includes(term));
    const matchedActs = activities.filter(a => a.title.toLowerCase().includes(term) || a.description.toLowerCase().includes(term));
    const matchedDocs = documents.filter(d => d.title.toLowerCase().includes(term) || d.code.toLowerCase().includes(term));

    return { news: matchedNews, activities: matchedActs, docs: matchedDocs };
  }, [globalSearchTerm, news, activities, documents]);

  const handleJumpToSearchResult = (view: string, item: any) => {
    setIsSearchOpen(false);
    setGlobalSearchTerm('');
    if (view === 'news') {
      setSelectedNews(item);
      navigate('/tin-tuc');
    } else if (view === 'activities') {
      setSelectedActivity(item);
      navigate('/hoat-dong');
    } else {
      handleNavigate(view);
    }
  };

  const contextValue = {
    news,
    activities,
    photos,
    documents,
    contacts,
    leaders,
    schoolName,
    setSchoolName,
    schoolSlogan,
    setSchoolSlogan,
    isAdmin,
    setIsAdmin,
    selectedNews,
    setSelectedNews,
    selectedActivity,
    setSelectedActivity,
    handleIncrementNewsViews,
    handleRegisterActivityParticipation,
    handleSubmitContactForm,
    handleResetDefaults,
    handleNavigate,
    handleSelectNewsItem,
    handleSelectActivityItem,
    achievements: aboutService.getAchievements()
  };

  return (
    <>
      <Routes>
        <Route element={
          <Layout
            currentView={currentView}
            onNavigate={handleNavigate}
            isDarkMode={isDarkMode}
            toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            isAdmin={isAdmin}
            setIsAdmin={setIsAdmin}
            onOpenSearch={() => setIsSearchOpen(true)}
            schoolName={schoolName}
            onSubmitContactForm={handleSubmitContactForm}
            contextValue={contextValue}
          />
        }>
          <Route path="/" element={<HomePage />} />
          <Route path="/gioi-thieu" element={<AboutPage />} />
          <Route path="/tin-tuc" element={<NewsPage />} />
          <Route path="/hoat-dong" element={<ActivitiesPage />} />
          <Route path="/thu-vien" element={<GalleryPage />} />
          <Route path="/van-ban" element={<DocumentsPage />} />
          <Route path="/lien-he" element={<ContactPage />} />
          <Route path="/quan-tri" element={<AdminPage />} />
        </Route>
      </Routes>

      {/* Global Search Overlay Popup Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="global-search-modal">
            {/* Background blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />

            <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:p-12 sm:pt-24">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6"
              >
                {/* Search header input */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center space-x-2 flex-1 mr-4">
                    <Search className="h-5 w-5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm nhanh mọi thông tin trên trang..."
                      autoFocus
                      value={globalSearchTerm}
                      onChange={(e) => setGlobalSearchTerm(e.target.value)}
                      className="w-full bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => { setIsSearchOpen(false); setGlobalSearchTerm(''); }}
                    className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Display matches list */}
                <div className="max-h-[50vh] overflow-y-auto space-y-5 pr-2">
                  {!globalSearchTerm.trim() ? (
                    <div className="text-center py-12 text-slate-400 font-sans text-xs space-y-2">
                      <Search className="h-8 w-8 mx-auto opacity-40 text-blue-500 animate-pulse" />
                      <p>Hãy nhập từ khóa tìm kiếm để tra cứu thông tin hoạt động, tin măng non, hay quyết định.</p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
                        {['Đại hội', 'Heo đất', 'Văn nghệ', 'Bằng khen'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setGlobalSearchTerm(tag)}
                            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 text-[10px] font-bold px-3 py-1.5 rounded-full"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (searchResults.news.length === 0 && searchResults.activities.length === 0 && searchResults.docs.length === 0) ? (
                    <div className="text-center py-12 text-slate-400 font-sans text-xs space-y-1">
                      <AlertCircle className="h-8 w-8 mx-auto opacity-40 text-red-500" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 pt-1">Không tìm thấy kết quả phù hợp</h4>
                      <p>Em thử viết lại đúng tên viết tắt hoặc chuyển đổi từ khóa khác nhé.</p>
                    </div>
                  ) : (
                    <div className="space-y-6 font-sans text-xs">
                      {/* Section matches: News */}
                      {searchResults.news.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 dark:border-slate-800">Tin tức măng non ({searchResults.news.length})</h4>
                          <div className="space-y-1">
                            {searchResults.news.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleJumpToSearchResult('news', item)}
                                className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                  <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title}</span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section matches: Activities */}
                      {searchResults.activities.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 dark:border-slate-800">Kế hoạch phong trào ({searchResults.activities.length})</h4>
                          <div className="space-y-1">
                            {searchResults.activities.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleJumpToSearchResult('activities', item)}
                                className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <Calendar className="h-4 w-4 text-red-500" />
                                  <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title}</span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section matches: Docs */}
                      {searchResults.docs.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5 dark:border-slate-800">Kho văn bản chỉ đạo ({searchResults.docs.length})</h4>
                          <div className="space-y-1">
                            {searchResults.docs.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleJumpToSearchResult('documents', item)}
                                className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <FileCode className="h-4 w-4 text-emerald-500" />
                                  <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title} <strong className="text-red-500 font-mono">[{item.code}]</strong></span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
