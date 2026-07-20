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
import { fetchAndCacheHomeOverrides, preloadImage } from '../../features/cms/cache/homeDataCache';
import { HOME_HERO_DEFAULT } from '../../config/defaults/home.defaults';
import { deepMerge } from '../../utils/deepMerge';

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

  const prefetchHomeData = async () => {
    try {
      const fetched = await fetchAndCacheHomeOverrides();
      const heroOverride = fetched['hero'];
      const finalHero = deepMerge(HOME_HERO_DEFAULT, heroOverride?.data);
      if (finalHero?.backgroundImage) {
        preloadImage(finalHero.backgroundImage);
      }
    } catch (e) {
      // ignore
    }
  };

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
        {/* Logo and Brand Title (Unified Brand Component, Modern, Elevated) */}
        <div 
          className="group relative inline-flex shrink-0 items-center justify-start rounded-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 select-none md:w-[170px] xl:w-[310px]" 
          onClick={() => handleNavClick('home')}
          onMouseEnter={prefetchHomeData}
          id="header-brand"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleNavClick('home');
            }
          }}
          aria-label="Về trang chủ"
        >
          <span
            className="
              relative flex items-center justify-center
              h-[42px] w-[42px] sm:h-[48px] sm:w-[48px] md:h-[50px] md:w-[50px]
              overflow-visible rounded-xl sm:rounded-2xl
              border border-blue-500/15
              bg-white/85
              shadow-[0_8px_24px_rgba(15,23,42,0.10),0_2px_8px_rgba(37,99,235,0.08)]
              backdrop-blur-sm
              transition-all duration-300 ease-out
              group-hover:-translate-y-0.5
              group-hover:scale-105
              group-hover:border-blue-500/30
              group-hover:shadow-[0_12px_30px_rgba(15,23,42,0.14),0_4px_14px_rgba(37,99,235,0.16)]
              dark:border-slate-300/20
              dark:bg-slate-900/75
              dark:shadow-[0_8px_24px_rgba(0,0,0,0.30)]
            "
          >
            {/* Glow Background effect */}
            <span
              aria-hidden="true"
              className="
                pointer-events-none absolute inset-1
                -z-10 rounded-xl sm:rounded-2xl
                bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_70%)]
                opacity-50 blur-xl
                transition-opacity duration-300
                group-hover:opacity-80
              "
            />

            {siteSettings.logo_url ? (
              <img 
                src={siteSettings.logo_url} 
                alt="" 
                className="
                  h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] md:h-[38px] md:w-[38px]
                  object-contain
                  transition-transform duration-300 ease-out
                  [filter:drop-shadow(0_2px_2px_rgba(255,255,255,0.85))_drop-shadow(0_4px_8px_rgba(15,23,42,0.18))]
                  group-hover:scale-[1.03]
                "
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="relative flex h-[30px] w-[30px] sm:h-[34px] sm:w-[34px] md:h-[38px] md:w-[38px] items-center justify-center rounded-lg bg-red-600 shadow-md shadow-red-500/20">
                <span className="-mt-1 text-yellow-300 font-extrabold text-base sm:text-lg md:text-xl select-none">★</span>
              </div>
            )}
          </span>
          
          {/* Brand Titles: 2-line layout on 'lg', 1-line on 'xl', hidden below 'lg' */}
          <span className="hidden lg:flex flex-col text-left font-sans font-bold tracking-tight ml-2.5 xl:hidden select-none">
            <span className="text-[11px] leading-[1.15] uppercase font-bold bg-gradient-to-r from-red-600 via-purple-700 to-blue-700 bg-clip-text text-transparent group-hover:from-red-500 group-hover:via-purple-600 group-hover:to-blue-600 transition-all duration-300">
              LIÊN ĐỘI THCS
            </span>
            <span className="text-[11px] leading-[1.15] uppercase font-bold bg-gradient-to-r from-red-600 via-purple-700 to-blue-700 bg-clip-text text-transparent group-hover:from-red-500 group-hover:via-purple-600 group-hover:to-blue-600 transition-all duration-300">
              TÔN THẤT TÙNG
            </span>
          </span>
          <span className="hidden xl:block text-left font-sans font-bold tracking-[-0.010em] ml-3 whitespace-nowrap select-none">
            <span className="text-[13px] leading-none uppercase font-bold bg-gradient-to-r from-red-600 via-purple-700 to-blue-700 bg-clip-text text-transparent group-hover:from-red-500 group-hover:via-purple-600 group-hover:to-blue-600 transition-all duration-300">
              LIÊN ĐỘI THCS TÔN THẤT TÙNG
            </span>
          </span>

          <span className="sr-only">
            {siteSettings.site_name || schoolName || "Liên đội THCS Tôn Thất Tùng"}
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-1 items-center justify-center md:space-x-0.5 lg:space-x-2">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                onMouseEnter={item.id === 'home' ? prefetchHomeData : undefined}
                onFocus={item.id === 'home' ? prefetchHomeData : undefined}
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
        <div className="flex items-center justify-end md:w-[170px] xl:w-[310px] shrink-0 space-x-3">
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
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isDarkMode ? "dark" : "light"}
                  initial={{ y: -12, opacity: 0, scale: 0.6, rotate: -45 }}
                  animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ y: 12, opacity: 0, scale: 0.6, rotate: 45 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="flex items-center justify-center"
                >
                  {isDarkMode ? (
                    <Sun className="h-4.5 w-4.5 text-yellow-500" />
                  ) : (
                    <Moon className="h-4.5 w-4.5 text-slate-600 dark:text-slate-300" />
                  )}
                </motion.div>
              </AnimatePresence>
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
                    onMouseEnter={item.id === 'home' ? prefetchHomeData : undefined}
                    onFocus={item.id === 'home' ? prefetchHomeData : undefined}
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
