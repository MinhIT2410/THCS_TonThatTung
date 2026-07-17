/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, FileSpreadsheet } from 'lucide-react';

// Import all sub-tabs
import SchoolInfoTab from '../../features/settings/school-data/SchoolInfoTab';
import AcademicYearsTab from '../../features/settings/school-data/AcademicYearsTab';
import AcademicTermsTab from '../../features/settings/school-data/AcademicTermsTab';
import GradeLevelsTab from '../../features/settings/school-data/GradeLevelsTab';
import ClassesTab from '../../features/settings/school-data/ClassesTab';
import DepartmentsTab from '../../features/settings/school-data/DepartmentsTab';
import SubjectsTab from '../../features/settings/school-data/SubjectsTab';
import ClassroomsTab from '../../features/settings/school-data/ClassroomsTab';
import HomeroomTeachersTab from '../../features/settings/school-data/HomeroomTeachersTab';
import TeacherAssignmentsTab from '../../features/settings/school-data/TeacherAssignmentsTab';

// Excel import modal
import SchoolExcelImportModal from '../../features/settings/school-data/SchoolExcelImportModal';

type TabType = 
  | 'school_info'
  | 'academic_years'
  | 'academic_terms'
  | 'grade_levels'
  | 'classes'
  | 'departments'
  | 'subjects'
  | 'classrooms'
  | 'homeroom'
  | 'assignments';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('school_info');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const tabsConfig = [
    { id: 'school_info', label: 'Thông tin trường' },
    { id: 'academic_years', label: 'Năm học' },
    { id: 'academic_terms', label: 'Học kỳ' },
    { id: 'grade_levels', label: 'Khối lớp' },
    { id: 'classes', label: 'Lớp học' },
    { id: 'departments', label: 'Tổ chuyên môn' },
    { id: 'subjects', label: 'Môn học' },
    { id: 'classrooms', label: 'Phòng học' },
    { id: 'homeroom', label: 'GV Chủ nhiệm' },
    { id: 'assignments', label: 'Phân công giảng dạy' },
  ];

  const handleImportSuccess = () => {
    // Reload active tab to see newly imported data
    const currentTab = activeTab;
    setActiveTab('school_info');
    setTimeout(() => {
      setActiveTab(currentTab);
    }, 100);
  };

  return (
    <div className="space-y-6 py-4 font-sans" id="admin-settings-page">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <Settings className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">Dữ liệu & Cấu hình trường học</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Thiết lập niên khóa, lớp học, cơ cấu tổ chuyên môn, và phân công trách nhiệm sư phạm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-900/30 rounded-xl transition-all"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Nhập Excel</span>
          </button>
        </div>
      </div>

      {/* Tabs list with horizontal scrolling on mobile */}
      <div className="border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-none">
        <div className="flex space-x-1 min-w-max pb-0.5">
          {tabsConfig.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 bg-blue-50/20 text-blue-700 dark:text-blue-400 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Render selected active tab */}
      <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 min-h-[500px]">
        {activeTab === 'school_info' && <SchoolInfoTab />}
        {activeTab === 'academic_years' && <AcademicYearsTab />}
        {activeTab === 'academic_terms' && <AcademicTermsTab />}
        {activeTab === 'grade_levels' && <GradeLevelsTab />}
        {activeTab === 'classes' && <ClassesTab />}
        {activeTab === 'departments' && <DepartmentsTab />}
        {activeTab === 'subjects' && <SubjectsTab />}
        {activeTab === 'classrooms' && <ClassroomsTab />}
        {activeTab === 'homeroom' && <HomeroomTeachersTab />}
        {activeTab === 'assignments' && <TeacherAssignmentsTab />}
      </div>

      {/* Global Excel Import Modal */}
      <SchoolExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
