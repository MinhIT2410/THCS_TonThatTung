/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Sun, Moon, ShieldAlert, Award, FileText, Settings, Search } from 'lucide-react';
import { NAV_MENU } from '../../config/menu';
import { useAuth } from '../../contexts/AuthContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { AccountMenu } from '../header/AccountMenu';

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
  const { siteSettings } = useSiteSettings();

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
          {siteSettings.logo_url ? (
            <img 
              src={siteSettings.logo_url} 
              alt="Logo" 
              className="h-10 w-10 object-contain rounded-full bg-white p-0.5 shadow-md"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-red-600 shadow-md shadow-red-500/20">
              <span className="-mt-1 text-yellow-300 font-extrabold text-xl select-none">★</span>
              <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
              </span>
            </div>
          )}
          <div className="flex flex-col justify-center">
            <span className="font-bold text-blue-800 dark:text-blue-400 leading-none tracking-tight uppercase text-xs sm:text-sm md:text-base">
              {siteSettings.site_name || schoolName}
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center md:space-x-0.5 lg:space-x-2">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className={`relative px-3.5 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 whitespace-nowrap ${
                  isActive 
                    ? 'text-blue-700 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-950/30' 
                    : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-slate-800/40'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div 
                    layoutId="activeNavIndicator"
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions Toolbar */}
        <div className="flex items-center space-x-3">
          {/* Unified Utility Capsule (Search + Theme Switcher) */}
          <div className="flex items-center space-x-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-1">
            {/* Search Button */}
            <button
              onClick={onOpenSearch}
              id="search-btn"
              title="Tìm kiếm"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <Search className="h-4.5 w-4.5" />
            </button>

            {/* Theme Switcher */}
            <button
              onClick={toggleDarkMode}
              id="dark-mode-toggle"
              title={isDarkMode ? "Chuyển sang Chế độ sáng" : "Chuyển sang Chế độ tối"}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>

          {/* Account Menu */}
          <AccountMenu />

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
