/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, X, FileText, Calendar, FileCode, ArrowRight, Award, HelpCircle, AlertCircle, Heart 
} from 'lucide-react';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './components/home/Home';
import About from './components/home/About';
import News from './components/news/News';
import Activities from './components/activity/Activities';
import Gallery from './components/gallery/Gallery';
import Documents from './components/documents/Documents';
import Contact from './components/contact/Contact';
import CMS from './components/admin/CMS';

import { 
  defaultLeaders, defaultNews, defaultActivities, defaultDocuments, defaultPhotos, defaultAchievements 
} from './data';
import { NewsItem, ActivityItem, PhotoItem, DocumentItem, ContactSubmission, LeaderProfile } from './types';

export default function App() {
  // --- View state ---
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  // --- Dark Mode State ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // --- Core Persistent State ---
  const [schoolName, setSchoolName] = useState<string>(() => {
    const saved = localStorage.getItem('schoolName');
    return (!saved || saved === "Liên đội THCS Chu Văn An") ? "Liên Đội THCS Tôn Thất Tùng" : saved;
  });
  
  const [schoolSlogan, setSchoolSlogan] = useState<string>(() => {
    const saved = localStorage.getItem('schoolSlogan');
    return (!saved || saved === "Thiếu nhi Chu Văn An - Chăm ngoan, học tốt, tiếp bước cha anh") ? "Thiếu nhi Tôn Thất Tùng - Chăm ngoan, học tốt, tiếp bước cha anh" : saved;
  });

  const [leaders, setLeaders] = useState<LeaderProfile[]>(() => {
    const saved = localStorage.getItem('leaders');
    return saved ? JSON.parse(saved) : defaultLeaders;
  });

  const [news, setNews] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('news');
    return saved ? JSON.parse(saved) : defaultNews;
  });

  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    const saved = localStorage.getItem('activities');
    return saved ? JSON.parse(saved) : defaultActivities;
  });

  const [photos, setPhotos] = useState<PhotoItem[]>(() => {
    const saved = localStorage.getItem('photos');
    return saved ? JSON.parse(saved) : defaultPhotos;
  });

  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem('documents');
    return saved ? JSON.parse(saved) : defaultDocuments;
  });

  const [contacts, setContacts] = useState<ContactSubmission[]>(() => {
    const saved = localStorage.getItem('contacts');
    return saved ? JSON.parse(saved) : [];
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('isAdmin') === 'true';
  });

  // --- Search Overlay States ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  // --- Scroll to Top Helper ---
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // --- Dark Mode Sync with Class ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // --- Persist Core Data changes to Local Storage ---
  useEffect(() => {
    localStorage.setItem('schoolName', schoolName);
  }, [schoolName]);

  useEffect(() => {
    localStorage.setItem('schoolSlogan', schoolSlogan);
  }, [schoolSlogan]);

  useEffect(() => {
    localStorage.setItem('leaders', JSON.stringify(leaders));
  }, [leaders]);

  useEffect(() => {
    localStorage.setItem('news', JSON.stringify(news));
  }, [news]);

  useEffect(() => {
    localStorage.setItem('activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('photos', JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    localStorage.setItem('documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    sessionStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
  }, [isAdmin]);

  // --- Reset database to default seed data ---
  const handleResetDefaults = () => {
    setSchoolName("Liên Đội THCS Tôn Thất Tùng");
    setSchoolSlogan("Thiếu nhi Tôn Thất Tùng - Chăm ngoan, học tốt, tiếp bước cha anh");
    setLeaders(defaultLeaders);
    setNews(defaultNews);
    setActivities(defaultActivities);
    setPhotos(defaultPhotos);
    setDocuments(defaultDocuments);
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

  // --- Navigation routers ---
  const handleSelectNewsItem = (item: NewsItem) => {
    setSelectedNews(item);
    setCurrentView('news');
  };

  const handleSelectActivityItem = (item: ActivityItem) => {
    setSelectedActivity(item);
    setCurrentView('activities');
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
    } else if (view === 'activities') {
      setSelectedActivity(item);
    }
    setCurrentView(view);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative">
      
      {/* 1. Header Navigation Bar */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        onOpenSearch={() => setIsSearchOpen(true)}
        schoolName={schoolName}
      />

      {/* 2. Main Page Render Stage with Page Transition Animations */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {currentView === 'home' && (
              <Home
                news={news}
                activities={activities}
                photos={photos}
                onNavigate={setCurrentView}
                onSelectNews={handleSelectNewsItem}
                onSelectActivity={handleSelectActivityItem}
              />
            )}

            {currentView === 'about' && (
              <About 
                leaders={leaders}
                achievements={defaultAchievements}
              />
            )}

            {currentView === 'news' && (
              <News
                news={news}
                selectedItem={selectedNews}
                onSelectItem={setSelectedNews}
                onIncrementViews={handleIncrementNewsViews}
              />
            )}

            {currentView === 'activities' && (
              <Activities
                activities={activities}
                selectedItem={selectedActivity}
                onSelectItem={setSelectedActivity}
                onRegisterParticipation={handleRegisterActivityParticipation}
              />
            )}

            {currentView === 'gallery' && (
              <Gallery photos={photos} />
            )}

            {currentView === 'documents' && (
              <Documents documents={documents} />
            )}

            {currentView === 'contact' && (
              <Contact onSubmitContact={handleSubmitContactForm} />
            )}

            {currentView === 'cms' && (
              <CMS
                isAdmin={isAdmin}
                setIsAdmin={setIsAdmin}
                schoolName={schoolName}
                setSchoolName={setSchoolName}
                schoolSlogan={schoolSlogan}
                setSchoolSlogan={setSchoolSlogan}
                news={news}
                setNews={setNews}
                activities={activities}
                setActivities={setActivities}
                photos={photos}
                setPhotos={setPhotos}
                documents={documents}
                setDocuments={setDocuments}
                contacts={contacts}
                setContacts={setContacts}
                onResetDefaults={handleResetDefaults}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Footer Section */}
      <Footer
        onNavigate={setCurrentView}
        onSubmitSuggestion={handleSubmitContactForm}
      />

      {/* 4. Global Search Overlay Popup Modal */}
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

    </div>
  );
}
