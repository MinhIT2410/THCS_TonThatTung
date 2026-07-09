/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { AppDataContext } from '../App';
import { ROUTES } from '../config/routes';

export default function Layout() {
  const location = useLocation();
  const context = useContext(AppDataContext);

  if (!context) {
    return <Outlet />;
  }

  const {
    schoolName,
    isDarkMode,
    setIsDarkMode,
    handleNavigate,
    handleSubmitContactForm,
    setIsSearchOpen,
  } = context;

  // Derive currentView from pathname
  const getActiveView = (pathname: string): string => {
    if (pathname === ROUTES.HOME) return 'home';
    if (pathname === ROUTES.ABOUT) return 'about';
    if (pathname === ROUTES.NEWS) return 'news';
    if (pathname === ROUTES.ACTIVITIES) return 'activities';
    if (pathname === ROUTES.GALLERY) return 'gallery';
    if (pathname === ROUTES.DOCUMENTS) return 'documents';
    if (pathname === ROUTES.CONTACT) return 'contact';
    if (pathname === ROUTES.ADMIN) return 'cms';
    return 'home';
  };
  const currentView = getActiveView(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative">
      {/* Header Navigation Bar */}
      <Header
        currentView={currentView}
        setCurrentView={handleNavigate}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenSearch={() => setIsSearchOpen(true)}
        schoolName={schoolName}
      />

      {/* Main content area with smooth page transition animations */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet context={context} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Section */}
      <Footer
        onNavigate={handleNavigate}
        onSubmitSuggestion={handleSubmitContactForm}
      />
    </div>
  );
}
