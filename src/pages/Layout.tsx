/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { ContactSubmission } from '../types';

interface LayoutProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  onOpenSearch: () => void;
  schoolName: string;
  onSubmitContactForm: (submission: Omit<ContactSubmission, 'id' | 'date' | 'status'>) => void;
  contextValue: any;
}

export default function Layout({
  currentView,
  onNavigate,
  isDarkMode,
  toggleDarkMode,
  isAdmin,
  setIsAdmin,
  onOpenSearch,
  schoolName,
  onSubmitContactForm,
  contextValue
}: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative">
      {/* Header Navigation Bar */}
      <Header
        currentView={currentView}
        setCurrentView={onNavigate}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        onOpenSearch={onOpenSearch}
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
            <Outlet context={contextValue} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Section */}
      <Footer
        onNavigate={onNavigate}
        onSubmitSuggestion={onSubmitContactForm}
      />
    </div>
  );
}
