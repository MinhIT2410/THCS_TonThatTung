/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sun, Moon, ShieldAlert, Award, FileText, Settings, Search } from 'lucide-react';
import { NAV_MENU } from '../../config/menu';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onOpenSearch: () => void;
  schoolName: string;
}

export default function Header({
  currentView,
  setCurrentView,
  isDarkMode,
  toggleDarkMode,
  onOpenSearch,
  schoolName
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isAdminUser } = useAuth();

  const navItems = NAV_MENU.filter(item => item.showInNavbar).map(item => ({
    id: item.id,
    label: item.title
  }));

  const handleNavClick = (viewId: string) => {
    setCurrentView(viewId);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/95 transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Brand Title */}
        <div 
          className="flex cursor-pointer items-center space-x-3" 
          onClick={() => handleNavClick('home')}
          id="header-brand"
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-red-600 shadow-md shadow-red-500/20">
            <span className="-mt-1 text-yellow-300 font-extrabold text-xl select-none">★</span>
            <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-blue-800 dark:text-blue-400 leading-none tracking-tight uppercase text-sm sm:text-base">
              {schoolName}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest leading-none mt-1">
              {schoolName.toLowerCase().startsWith('liên đội') ? schoolName.replace(/liên đội/i, 'Trường') : `Trường ${schoolName}`}
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'text-blue-700 dark:text-blue-400' 
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-slate-800/50'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions Toolbar */}
        <div className="flex items-center space-x-2">
          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            id="search-btn"
            title="Tìm kiếm"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleDarkMode}
            id="dark-mode-toggle"
            title={isDarkMode ? "Chuyển sang Chế độ sáng" : "Chuyển sang Chế độ tối"}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* CMS Admin Button */}
          <button
            onClick={() => handleNavClick('cms')}
            id="cms-toggle-btn"
            title="Quản lý CMS"
            className={`flex items-center space-x-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-300 ${
              currentView === 'cms'
                ? 'bg-red-500 text-white shadow-sm shadow-red-500/20'
                : isAuthenticated
                  ? 'bg-blue-50/80 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900'
                  : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Settings className={`h-4 w-4 ${currentView === 'cms' ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">
              {isAuthenticated ? (isAdminUser ? 'Quản trị' : 'Tài khoản') : 'Quản lý'}
            </span>
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            id="mobile-menu-toggle"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:hidden transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-menu-drawer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden shadow-lg"
          >
            <div className="space-y-1 pb-3 pt-2">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`mobile-nav-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`block w-full text-left rounded-lg px-4 py-2.5 text-base font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  onClick={() => handleNavClick('cms')}
                  id="mobile-nav-cms"
                  className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-base font-semibold ${
                    currentView === 'cms'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Settings className="h-5 w-5" />
                  <span>
                    {isAuthenticated ? (isAdminUser ? 'Mở trang quản trị' : 'Mở trang tài khoản') : 'Vào Chế độ quản trị'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
