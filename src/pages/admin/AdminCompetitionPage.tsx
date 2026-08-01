/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { 
  Award, 
  PlusCircle, 
  Clock, 
  History, 
  FileCheck, 
  Layers,
  Users,
  Gift,
  PackageCheck,
  HelpCircle
} from 'lucide-react';
import ProgramsAndRulesTab from '../../components/admin/competition/ProgramsAndRulesTab';
import ProgramAndWeeksTab from '../../components/admin/competition/ProgramAndWeeksTab';
import RecordIncidentTab from '../../components/admin/competition/RecordIncidentTab';
import PendingIncidentsTab from '../../components/admin/competition/PendingIncidentsTab';
import IncidentsHistoryTab from '../../components/admin/competition/IncidentsHistoryTab';
import { RedemptionsTab } from '../../components/admin/competition/RedemptionsTab';
import { RewardsTab } from '../../components/admin/competition/RewardsTab';
import { ReviewRequestsTab } from '../../components/admin/competition/ReviewRequestsTab';
import ActorAssignmentsTab from '../../components/admin/competition/ActorAssignmentsTab';

type AdminCompetitionSubTab =
  | 'programs_rules'
  | 'units'
  | 'record'
  | 'pending'
  | 'history'
  | 'rewards'
  | 'reviews'
  | 'rules'
  | 'programs'
  | 'assignments';

type RewardSubSection = 'catalog' | 'redemptions';

export default function AdminCompetitionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const getInitialTabState = (): { mainTab: AdminCompetitionSubTab; subTab: RewardSubSection } => {
    const tabParam = searchParams.get('tab');
    const sectionParam = searchParams.get('section');
    const path = location.pathname;

    if (path.endsWith('/cua-hang')) {
      return { mainTab: 'rewards', subTab: 'catalog' };
    }
    if (path.endsWith('/doi-qua')) {
      return { mainTab: 'rewards', subTab: 'redemptions' };
    }
    if (path.endsWith('/chi-doi')) {
      return { mainTab: 'programs', subTab: 'catalog' };
    }
    if (path.endsWith('/xem-lai')) {
      return { mainTab: 'reviews', subTab: 'catalog' };
    }

    if (tabParam === 'redemptions') {
      return { mainTab: 'rewards', subTab: 'redemptions' };
    }
    if (tabParam === 'rewards') {
      return {
        mainTab: 'rewards',
        subTab: sectionParam === 'redemptions' ? 'redemptions' : 'catalog',
      };
    }
    if (
      tabParam &&
      ['programs', 'rules', 'units', 'record', 'pending', 'history', 'reviews', 'assignments', 'programs_rules'].includes(tabParam)
    ) {
      return { mainTab: (tabParam === 'units' ? 'programs' : tabParam) as AdminCompetitionSubTab, subTab: 'catalog' };
    }

    return { mainTab: 'programs', subTab: 'catalog' };
  };

  const initialState = getInitialTabState();
  const [activeTab, setActiveTab] = useState<AdminCompetitionSubTab>(initialState.mainTab);
  const [rewardSubTab, setRewardSubTab] = useState<RewardSubSection>(initialState.subTab);

  useEffect(() => {
    const { mainTab, subTab } = getInitialTabState();
    setActiveTab(mainTab);
    setRewardSubTab(subTab);
  }, [searchParams, location.pathname]);

  const handleMainTabChange = (tab: AdminCompetitionSubTab) => {
    setActiveTab(tab);
    if (tab === 'rewards') {
      setSearchParams({ tab: 'rewards', section: rewardSubTab });
    } else {
      setSearchParams({ tab });
    }
  };

  const handleRewardSubTabChange = (section: RewardSubSection) => {
    setRewardSubTab(section);
    setSearchParams({ tab: 'rewards', section });
  };

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <Award className="w-6 h-6" />
            </div>
            Quản lý thi đua và khen thưởng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ghi nhận sự việc, quản lý điểm thi đua và theo dõi hoạt động khen thưởng của Liên đội.
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="relative">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto flex-nowrap pb-2 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => handleMainTabChange('programs')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'programs' || activeTab === 'programs_rules' || activeTab === 'units'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-transparent'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Chương trình thi đua</span>
          </button>

          <button
            onClick={() => handleMainTabChange('rules')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-transparent'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Quy tắc</span>
          </button>

          <button
            onClick={() => handleMainTabChange('record')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'record'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-transparent'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Ghi nhận</span>
          </button>

          <button
            onClick={() => handleMainTabChange('pending')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-transparent'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Chờ duyệt</span>
          </button>

          <button
            onClick={() => handleMainTabChange('history')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-transparent'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Nhật ký</span>
          </button>

          <button
            onClick={() => handleMainTabChange('rewards')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'rewards'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-transparent'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Phần thưởng & Đổi quà</span>
          </button>

          <button
            onClick={() => handleMainTabChange('reviews')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-transparent'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Đề nghị</span>
          </button>

          <button
            onClick={() => handleMainTabChange('assignments')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
              activeTab === 'assignments'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Phân công</span>
          </button>
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white dark:from-slate-950 to-transparent" />
      </div>

      {/* Tab Content */}
      <div>
        {(activeTab === 'programs' || activeTab === 'programs_rules' || activeTab === 'units') && <ProgramAndWeeksTab />}
        {activeTab === 'record' && <RecordIncidentTab onNavigateToPrograms={() => handleMainTabChange('programs')} />}
        {activeTab === 'pending' && <PendingIncidentsTab />}
        {activeTab === 'history' && <IncidentsHistoryTab />}
        {activeTab === 'rewards' && (
          <div className="space-y-6">
            {/* Sub-tabs bar */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => handleRewardSubTabChange('catalog')}
                className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
                  rewardSubTab === 'catalog'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Danh mục phần thưởng</span>
              </button>

              <button
                type="button"
                onClick={() => handleRewardSubTabChange('redemptions')}
                className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
                  rewardSubTab === 'redemptions'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Duyệt và trao quà</span>
              </button>
            </div>

            {/* Sub-tab Content */}
            {rewardSubTab === 'catalog' ? <RewardsTab /> : <RedemptionsTab />}
          </div>
        )}
        {activeTab === 'reviews' && <ReviewRequestsTab />}
        {activeTab === 'assignments' && <ActorAssignmentsTab />}
        {activeTab === 'rules' && <ProgramsAndRulesTab initialSubTab="rules" />}
      </div>
    </div>
  );
}
