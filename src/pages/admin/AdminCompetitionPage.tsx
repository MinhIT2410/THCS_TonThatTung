/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import RecordIncidentTab from '../../components/admin/competition/RecordIncidentTab';
import PendingIncidentsTab from '../../components/admin/competition/PendingIncidentsTab';
import IncidentsHistoryTab from '../../components/admin/competition/IncidentsHistoryTab';
import RulesTab from '../../components/admin/competition/RulesTab';
import ProgramsTab from '../../components/admin/competition/ProgramsTab';
import WeeklyUnitsTab from '../../components/admin/competition/WeeklyUnitsTab';
import { RewardsTab } from '../../components/admin/competition/RewardsTab';
import { RedemptionsTab } from '../../components/admin/competition/RedemptionsTab';
import { ReviewRequestsTab } from '../../components/admin/competition/ReviewRequestsTab';

type AdminCompetitionSubTab =
  | 'units'
  | 'record'
  | 'pending'
  | 'history'
  | 'rewards'
  | 'redemptions'
  | 'reviews'
  | 'rules'
  | 'programs';

export default function AdminCompetitionPage() {
  const [activeTab, setActiveTab] = useState<AdminCompetitionSubTab>('units');

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600 text-white shadow-md shadow-red-600/20">
              <Award className="w-6 h-6" />
            </div>
            Quản Lý Thi Đua & Khen Thưởng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hệ thống ghi nhận sự việc, kiểm duyệt và điều hành sổ điểm thi đua Liên đội
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('units')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'units'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Thi Đua Chi Đội (Tuần)</span>
        </button>

        <button
          onClick={() => setActiveTab('record')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'record'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ghi Nhận Sự Việc</span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Chờ Duyệt Sự Việc</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Nhật Ký & Đảo Điểm</span>
        </button>

        <button
          onClick={() => setActiveTab('redemptions')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'redemptions'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Duyệt & Trao Quà</span>
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'rewards'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Kho Phần Thưởng</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'reviews'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Đề Nghị Xem Lại</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Quy Tắc Tính Điểm</span>
        </button>

        <button
          onClick={() => setActiveTab('programs')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'programs'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Chương Trình Thi Đua</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'units' && <WeeklyUnitsTab />}
        {activeTab === 'record' && <RecordIncidentTab />}
        {activeTab === 'pending' && <PendingIncidentsTab />}
        {activeTab === 'history' && <IncidentsHistoryTab />}
        {activeTab === 'redemptions' && <RedemptionsTab />}
        {activeTab === 'rewards' && <RewardsTab />}
        {activeTab === 'reviews' && <ReviewRequestsTab />}
        {activeTab === 'rules' && <RulesTab />}
        {activeTab === 'programs' && <ProgramsTab />}
      </div>
    </div>
  );
}
