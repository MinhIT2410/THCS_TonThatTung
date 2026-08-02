/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Award, 
  Calendar, 
  PlusCircle, 
  Edit3, 
  Power, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Send, 
  RefreshCw, 
  X, 
  Plus, 
  Minus, 
  FileText, 
  ChevronRight,
  ShieldCheck,
  Users
} from 'lucide-react';
import { competitionService } from '../../../services/competitionService';
import { 
  CompetitionProgram, 
  CompetitionWeek, 
  CompetitionWeekUnit, 
  WEEK_STATUS_LABELS 
} from '../../../types/competition';
import { formatCode } from './ProgramsAndRulesTab';

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

export default function ProgramAndWeeksTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Reference lists
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; is_current?: boolean; is_active?: boolean }[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  
  // Program state for selected year
  const [currentProgram, setCurrentProgram] = useState<CompetitionProgram | null>(null);
  const [programRulesCount, setProgramRulesCount] = useState<number>(0);
  const [loadingProgram, setLoadingProgram] = useState<boolean>(true);

  // Weeks state for selected program
  const [weeks, setWeeks] = useState<CompetitionWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [currentWeek, setCurrentWeek] = useState<CompetitionWeek | null>(null);
  const [units, setUnits] = useState<CompetitionWeekUnit[]>([]);
  const [pendingIncidentsCount, setPendingIncidentsCount] = useState<number>(0);
  const [totalIncidentsCount, setTotalIncidentsCount] = useState<number>(0);

  // Loading & Message states
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Open Week Modal State
  const [isOpenWeekModalOpen, setIsOpenWeekModalOpen] = useState(false);
  const [openWeekForm, setOpenWeekForm] = useState({
    program_id: '',
    academic_year_id: '',
    week_number: 1,
    name: 'Tuần 1',
    starts_on: new Date().toISOString().split('T')[0],
    ends_on: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    default_starting_points: 100,
  });

  // Adjustment Modal State
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [selectedUnitForAdj, setSelectedUnitForAdj] = useState<CompetitionWeekUnit | null>(null);
  const [adjForm, setAdjForm] = useState({
    points: 5,
    reason: '',
    evidence_url: '',
  });

  // Unit Detail Drawer State
  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState<CompetitionWeekUnit | null>(null);
  const [unitDetails, setUnitDetails] = useState<any[]>([]);
  const [loadingUnitDetails, setLoadingUnitDetails] = useState(false);
  const [unitCommentInput, setUnitCommentInput] = useState('');

  // Grade Filter
  const selectedGrade = searchParams.get('grade') || 'ALL';

  const handleGradeChange = (grade: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'programs');
    if (selectedYearId) newParams.set('year', selectedYearId);
    if (selectedWeekId) newParams.set('week', selectedWeekId);
    if (grade && grade !== 'ALL') {
      newParams.set('grade', grade);
    } else {
      newParams.delete('grade');
    }
    setSearchParams(newParams);
  };

  // 1. Initial Load: Academic Years
  useEffect(() => {
    async function initYears() {
      try {
        setLoadingData(true);
        const years = await competitionService.getAcademicYears();
        setAcademicYears(years);

        // Check if year parameter exists in URL
        const yearParam = searchParams.get('year');
        if (yearParam && years.some(y => y.id === yearParam)) {
          setSelectedYearId(yearParam);
        } else {
          const defaultYear = years.find((y: any) => y.is_current || y.is_active) || years[0];
          if (defaultYear) {
            setSelectedYearId(defaultYear.id);
          }
        }
      } catch (err: any) {
        console.error('Error fetching academic years:', err);
        setMessage({ type: 'error', text: 'Không thể tải danh sách năm học.' });
      } finally {
        setLoadingData(false);
      }
    }
    initYears();
  }, []);

  // Sync Year selection to URL query params
  const handleYearChange = (yearId: string) => {
    setSelectedYearId(yearId);
    setSelectedWeekId('');
    setCurrentWeek(null);
    setUnits([]);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'programs');
    newParams.set('year', yearId);
    newParams.delete('week');
    const currentGrade = searchParams.get('grade');
    if (currentGrade && currentGrade !== 'ALL') {
      newParams.set('grade', currentGrade);
    } else {
      newParams.delete('grade');
    }
    setSearchParams(newParams);
  };

  // 2. Fetch Program & Weeks when selectedYearId changes
  useEffect(() => {
    if (!selectedYearId) return;

    async function loadProgramAndWeeks() {
      try {
        setLoadingProgram(true);
        setMessage(null);

        // Get all programs
        const allPrograms = await competitionService.getCompetitionPrograms(true);
        // Find program matching selected year
        const matchProgram = allPrograms.find(p => p.academic_year_id === selectedYearId && p.is_active) ||
                             allPrograms.find(p => p.academic_year_id === selectedYearId) || null;

        setCurrentProgram(matchProgram);

        if (matchProgram) {
          // Fetch rules count for this program
          const rules = await competitionService.getCompetitionRules(matchProgram.id, true);
          setProgramRulesCount(rules.filter(r => r.is_active).length);

          // Fetch weeks for this program & year
          const weekList = await competitionService.getWeeks({
            programId: matchProgram.id,
            academicYearId: selectedYearId,
          });
          setWeeks(weekList);

          // Check week query parameter
          const weekParam = searchParams.get('week');
          if (weekParam && weekList.some(w => w.id === weekParam)) {
            setSelectedWeekId(weekParam);
          } else if (weekList.length > 0) {
            setSelectedWeekId(weekList[0].id);
          } else {
            setSelectedWeekId('');
            setCurrentWeek(null);
            setUnits([]);
          }
        } else {
          setProgramRulesCount(0);
          setWeeks([]);
          setSelectedWeekId('');
          setCurrentWeek(null);
          setUnits([]);
        }
      } catch (err: any) {
        console.error('Error loading program and weeks:', err);
        setMessage({ type: 'error', text: 'Lỗi khi tải dữ liệu chương trình thi đua.' });
      } finally {
        setLoadingProgram(false);
      }
    }

    loadProgramAndWeeks();
  }, [selectedYearId]);

  // 3. Load Week summary when selectedWeekId changes
  useEffect(() => {
    if (!selectedWeekId) {
      setCurrentWeek(null);
      setUnits([]);
      return;
    }

    async function loadWeekSummary(weekId: string) {
      try {
        const summary = await competitionService.getWeekSummary(weekId);
        setCurrentWeek(summary.week);
        setUnits(summary.units);
        setPendingIncidentsCount(summary.pendingIncidentsCount);
        setTotalIncidentsCount(summary.totalIncidentsCount);
      } catch (err: any) {
        console.error('Error loading week summary:', err);
      }
    }

    loadWeekSummary(selectedWeekId);
  }, [selectedWeekId]);

  const handleSelectWeek = (weekId: string) => {
    setSelectedWeekId(weekId);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'programs');
    if (selectedYearId) newParams.set('year', selectedYearId);
    if (weekId) {
      newParams.set('week', weekId);
    } else {
      newParams.delete('week');
    }
    const currentGrade = searchParams.get('grade');
    if (currentGrade && currentGrade !== 'ALL') {
      newParams.set('grade', currentGrade);
    } else {
      newParams.delete('grade');
    }
    setSearchParams(newParams);
  };

  const filteredUnits = units.filter(u => {
    if (selectedGrade === 'ALL') return true;
    const gradeStr = selectedGrade;
    if ((u as any).grade_level && String((u as any).grade_level) === gradeStr) return true;
    if ((u as any).grade_level_id && String((u as any).grade_level_id) === gradeStr) return true;
    if ((u as any).grade_name && String((u as any).grade_name).includes(gradeStr)) return true;

    if (u.unit_name) {
      const match = u.unit_name.trim().match(/(?:Lớp\s*|Chi đội\s*|Khối\s*)?([6789])/i);
      if (match && match[1] === gradeStr) return true;
    }
    return false;
  });

  // ---------------------------------------------------------------------------
  // AUTO INIT PROGRAM HANDLER
  // ---------------------------------------------------------------------------
  const handleAutoInitProgram = async () => {
    if (!selectedYearId) return;
    const yearObj = academicYears.find(y => y.id === selectedYearId);
    const yearName = yearObj?.name || '';
    const progName = yearName ? `Thi đua năm học ${yearName}` : 'Thi đua năm học';

    try {
      setActionLoading(true);
      setMessage(null);

      await competitionService.saveProgram({
        code: formatCode(progName),
        name: progName,
        academic_year_id: selectedYearId,
        starts_at: new Date().toISOString().slice(0, 10),
        is_active: true,
      });

      setMessage({ type: 'success', text: `Đã khởi tạo ${progName} thành công!` });

      // Refresh program & weeks data
      const allPrograms = await competitionService.getCompetitionPrograms(true);
      const matchProgram = allPrograms.find(p => p.academic_year_id === selectedYearId && p.is_active) ||
                           allPrograms.find(p => p.academic_year_id === selectedYearId) || null;
      setCurrentProgram(matchProgram);

      if (matchProgram) {
        const rules = await competitionService.getCompetitionRules(matchProgram.id, true);
        setProgramRulesCount(rules.filter(r => r.is_active).length);

        const weekList = await competitionService.getWeeks({
          programId: matchProgram.id,
          academicYearId: selectedYearId,
        });
        setWeeks(weekList);
        if (weekList.length > 0) {
          setSelectedWeekId(weekList[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error auto-initializing program:', err);
      setMessage({ type: 'error', text: err.message || 'Không thể khởi tạo thi đua năm học.' });
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // WEEK HANDLERS
  // ---------------------------------------------------------------------------
  const openNewWeekModal = () => {
    if (!currentProgram) return;
    const nextNum = weeks.length + 1;
    setOpenWeekForm({
      program_id: currentProgram.id,
      academic_year_id: selectedYearId,
      week_number: nextNum,
      name: `Tuần ${nextNum}`,
      starts_on: new Date().toISOString().split('T')[0],
      ends_on: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
      default_starting_points: 100,
    });
    setIsOpenWeekModalOpen(true);
  };

  const handleOpenWeekSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setMessage(null);

      const res = await competitionService.openWeek(openWeekForm);
      setMessage({ type: 'success', text: res.message || 'Đã mở tuần thi đua mới thành công!' });
      setIsOpenWeekModalOpen(false);

      // Refresh weeks
      if (currentProgram) {
        const weekList = await competitionService.getWeeks({
          programId: currentProgram.id,
          academicYearId: selectedYearId,
        });
        setWeeks(weekList);
        if (weekList.length > 0) {
          handleSelectWeek(weekList[0].id);
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể mở tuần thi đua.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockWeek = async () => {
    if (!currentWeek) return;
    if (!window.confirm(`Khóa ${currentWeek.name}? Khi bị khóa, không thể ghi nhận thêm vi phạm trong tuần này.`)) return;

    try {
      setActionLoading(true);
      const res = await competitionService.lockWeek(currentWeek.id);
      setMessage({ type: 'success', text: res.message });
      
      // Reload week data
      const summary = await competitionService.getWeekSummary(currentWeek.id);
      setCurrentWeek(summary.week);
      
      // Refresh week list
      if (currentProgram) {
        const weekList = await competitionService.getWeeks({
          programId: currentProgram.id,
          academicYearId: selectedYearId,
        });
        setWeeks(weekList);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khóa tuần thi đua.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockWeek = async () => {
    if (!currentWeek) return;
    const reason = window.prompt(`Mở lại ${currentWeek.name}. Nhập lý do mở lại:`);
    if (reason === null) return;

    try {
      setActionLoading(true);
      const res = await competitionService.unlockWeek(currentWeek.id, reason);
      setMessage({ type: 'success', text: res.message });
      
      const summary = await competitionService.getWeekSummary(currentWeek.id);
      setCurrentWeek(summary.week);

      if (currentProgram) {
        const weekList = await competitionService.getWeeks({
          programId: currentProgram.id,
          academicYearId: selectedYearId,
        });
        setWeeks(weekList);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi mở lại tuần thi đua.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeWeek = async () => {
    if (!currentWeek) return;
    if (pendingIncidentsCount > 0) {
      alert(`Không thể chốt tuần! Vẫn còn ${pendingIncidentsCount} sự việc đang CHỜ DUYỆT trong khoảng thời gian của tuần này.`);
      return;
    }

    if (!window.confirm(`XÁC NHẬN CHỐT VÀ CÔNG BỐ ${currentWeek.name}?\n\n- Hệ thống sẽ tính tổng điểm chính thức cho toàn bộ chi đội.\n- Công bố kết quả công khai trên Cổng Thi Đua Chi Đội.`)) return;

    try {
      setActionLoading(true);
      const res = await competitionService.finalizeWeek(currentWeek.id);
      setMessage({ type: 'success', text: res.message });

      const summary = await competitionService.getWeekSummary(currentWeek.id);
      setCurrentWeek(summary.week);

      if (currentProgram) {
        const weekList = await competitionService.getWeeks({
          programId: currentProgram.id,
          academicYearId: selectedYearId,
        });
        setWeeks(weekList);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi chốt tuần thi đua.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWeek || !selectedUnitForAdj) return;

    try {
      setActionLoading(true);
      const res = await competitionService.createAdjustment({
        week_id: currentWeek.id,
        unit_id: selectedUnitForAdj.unit_id,
        points: Number(adjForm.points),
        reason: adjForm.reason,
        evidence_url: adjForm.evidence_url,
      });

      setMessage({ type: 'success', text: res.message });
      setIsAdjModalOpen(false);
      setAdjForm({ points: 5, reason: '', evidence_url: '' });

      const summary = await competitionService.getWeekSummary(currentWeek.id);
      setUnits(summary.units);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể tạo điều chỉnh điểm.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenUnitDetail = async (unit: CompetitionWeekUnit) => {
    if (!currentWeek) return;
    setSelectedUnitForDetail(unit);
    setUnitCommentInput(unit.comment || '');
    setLoadingUnitDetails(true);

    try {
      const details = await competitionService.getUnitWeekDetails(currentWeek.id, unit.unit_id);
      setUnitDetails(details);
    } catch (err: any) {
      console.error('Error fetching unit week details:', err);
    } finally {
      setLoadingUnitDetails(false);
    }
  };

  const handleSaveComment = async () => {
    if (!selectedUnitForDetail || !currentWeek) return;
    try {
      setActionLoading(true);
      await competitionService.updateUnitWeekComment(selectedUnitForDetail.id, unitCommentInput);
      setMessage({ type: 'success', text: 'Đã cập nhật nhận xét cho chi đội.' });

      const summary = await competitionService.getWeekSummary(currentWeek.id);
      setUnits(summary.units);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể lưu nhận xét.' });
    } finally {
      setActionLoading(false);
    }
  };

  const currentYearObj = academicYears.find(y => y.id === selectedYearId);

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Alert */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-medium transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Academic Year Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Tuần thi đua
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quản lý các tuần thi đua theo từng năm học
            </p>
          </div>
        </div>

        {/* Academic Year Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="academic-year-select" className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Năm học:
          </label>
          <select
            id="academic-year-select"
            value={selectedYearId}
            onChange={e => handleYearChange(e.target.value)}
            disabled={loadingData}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[180px]"
          >
            {academicYears.map(y => (
              <option key={y.id} value={y.id}>
                {y.name} {y.is_current ? '(Hiện tại)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* COMPETITION WEEKS CONTENT */}
      {loadingProgram ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs font-medium">
          Đang tải dữ liệu tuần thi đua...
        </div>
      ) : !currentProgram ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Năm học này chưa được khởi tạo thi đua.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Bấm bên dưới để hệ thống tự động khởi tạo chương trình thi đua cho năm học {currentYearObj?.name || ''}.
            </p>
          </div>
          <button
            onClick={handleAutoInitProgram}
            disabled={actionLoading}
            className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{actionLoading ? 'Đang khởi tạo...' : 'Khởi tạo thi đua năm học'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Unified Control Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Dropdowns group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              {/* 1. Week Selector Dropdown */}
              <div className="flex-1 min-w-[240px]">
                <select
                  id="week-select-dropdown"
                  value={selectedWeekId}
                  onChange={e => handleSelectWeek(e.target.value)}
                  disabled={weeks.length === 0}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 truncate cursor-pointer"
                >
                  {weeks.length === 0 ? (
                    <option value="">Chưa có tuần thi đua</option>
                  ) : (
                    weeks.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} — {formatDateDisplay(w.starts_on)} đến {formatDateDisplay(w.ends_on)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* 2. Grade Selector Dropdown */}
              <div className="w-full sm:w-auto min-w-[130px]">
                <select
                  id="grade-select-dropdown"
                  value={selectedGrade}
                  onChange={e => handleGradeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả khối</option>
                  <option value="6">Khối 6</option>
                  <option value="7">Khối 7</option>
                  <option value="8">Khối 8</option>
                  <option value="9">Khối 9</option>
                </select>
              </div>
            </div>

            {/* Action buttons group */}
            <div className="flex items-center gap-2 self-end md:self-auto w-full md:w-auto justify-end">
              {/* 3. Lock Week Button */}
              {currentWeek && (
                currentWeek.status === 'OPEN' ? (
                  <button
                    onClick={handleLockWeek}
                    disabled={actionLoading}
                    className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Khóa tuần</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed whitespace-nowrap"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Đã khóa</span>
                  </button>
                )
              )}

              {/* 4. Open New Week Button */}
              <button
                onClick={openNewWeekModal}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 shrink-0 whitespace-nowrap cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Mở tuần mới</span>
              </button>
            </div>
          </div>

          {/* Selected Week Scoreboard */}
          {weeks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Chưa có tuần thi đua.
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Bắt đầu mở tuần thi đua đầu tiên để ghi nhận nếp sống, điểm số và xếp hạng các chi đội.
                </p>
              </div>
              <button
                onClick={openNewWeekModal}
                className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Mở tuần đầu tiên</span>
              </button>
            </div>
          ) : currentWeek && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
              {/* Scoreboard Header (Only shown if pending incidents or locked status buttons present) */}
              {(pendingIncidentsCount > 0 || currentWeek.status === 'LOCKED') && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    {pendingIncidentsCount > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        ⚠️ Vẫn còn {pendingIncidentsCount} sự việc đang chờ duyệt trong tuần này.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {currentWeek.status === 'LOCKED' && (
                      <>
                        <button
                          onClick={handleUnlockWeek}
                          disabled={actionLoading}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Mở lại</span>
                        </button>

                        <button
                          onClick={handleFinalizeWeek}
                          disabled={actionLoading}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Chốt & Công bố</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Units Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Thứ hạng</th>
                      <th className="py-3 px-4">Chi đội</th>
                      <th className="py-3 px-4 text-center">Ban đầu</th>
                      <th className="py-3 px-4 text-center">Trừ điểm</th>
                      <th className="py-3 px-4 text-center">Cộng điểm</th>
                      <th className="py-3 px-4 text-center">Tổng điểm</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredUnits.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          Chưa có dữ liệu chi đội cho {selectedGrade === 'ALL' ? 'tuần này' : `Khối ${selectedGrade}`}.
                        </td>
                      </tr>
                    ) : (
                      filteredUnits.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-extrabold text-xs ${
                              u.rank === 1
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : u.rank === 2
                                ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                : u.rank === 3
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}>
                              {u.rank || '-'}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {u.unit_name}
                          </td>

                          <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">
                            {u.starting_points}
                          </td>

                          <td className="py-3 px-4 text-center text-rose-600 font-bold">
                            -{u.deduction_points}
                          </td>

                          <td className="py-3 px-4 text-center text-emerald-600 font-bold">
                            +{u.bonus_points}
                          </td>

                          <td className="py-3 px-4 text-center font-extrabold text-slate-900 dark:text-white text-sm">
                            {u.final_score}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedUnitForAdj(u);
                                  setIsAdjModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                                title="Điều chỉnh điểm"
                              >
                                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                                <span>ĐIỀU CHỈNH</span>
                              </button>

                              <button
                                onClick={() => handleOpenUnitDetail(u)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>CHI TIẾT</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: OPEN WEEK */}
      {isOpenWeekModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" />
                <span>Mở tuần thi đua mới</span>
              </h3>
              <button
                onClick={() => setIsOpenWeekModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenWeekSubmit} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Số tuần <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={openWeekForm.week_number}
                    onChange={e => {
                      const num = Number(e.target.value);
                      setOpenWeekForm({
                        ...openWeekForm,
                        week_number: num,
                        name: `Tuần ${num}`,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Tên hiển thị <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={openWeekForm.name}
                    onChange={e => setOpenWeekForm({ ...openWeekForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Từ ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={openWeekForm.starts_on}
                    onChange={e => setOpenWeekForm({ ...openWeekForm, starts_on: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                    Đến ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={openWeekForm.ends_on}
                    onChange={e => setOpenWeekForm({ ...openWeekForm, ends_on: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Điểm khởi đầu mặc định
                </label>
                <input
                  type="number"
                  value={openWeekForm.default_starting_points}
                  onChange={e => setOpenWeekForm({ ...openWeekForm, default_starting_points: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenWeekModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20"
                >
                  {actionLoading ? 'Đang khởi tạo...' : 'Mở tuần'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: POINT ADJUSTMENT */}
      {isAdjModalOpen && selectedUnitForAdj && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Điều chỉnh điểm: {selectedUnitForAdj.unit_name}
              </h3>
              <button
                onClick={() => setIsAdjModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdjustmentSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Số điểm điều chỉnh (nhập số âm nếu trừ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={adjForm.points}
                  onChange={e => setAdjForm({ ...adjForm, points: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Lý do điều chỉnh <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={adjForm.reason}
                  onChange={e => setAdjForm({ ...adjForm, reason: e.target.value })}
                  placeholder="ví dụ: Cộng điểm phong trào văn nghệ hoặc trừ điểm vi phạm đặc biệt..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20"
                >
                  {actionLoading ? 'Đang lưu...' : 'Xác nhận điều chỉnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: UNIT WEEK DETAILS */}
      {selectedUnitForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg h-full overflow-y-auto p-6 shadow-2xl space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Chi tiết vi phạm & điểm số: {selectedUnitForDetail.unit_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentWeek?.name} ({currentWeek?.starts_on} - {currentWeek?.ends_on})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUnitForDetail(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-slate-500 block text-[10px] uppercase">Khởi đầu</span>
                  <span className="text-slate-900 dark:text-white text-base">{selectedUnitForDetail.starting_points}</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900 text-rose-600">
                  <span className="block text-[10px] uppercase">Trừ điểm</span>
                  <span className="text-base">-{selectedUnitForDetail.deduction_points}</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900 text-emerald-600">
                  <span className="block text-[10px] uppercase">Tổng điểm</span>
                  <span className="text-base">{selectedUnitForDetail.final_score}</span>
                </div>
              </div>

              {/* Incidents List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Lịch sử ghi nhận trong tuần
                </h4>

                {loadingUnitDetails ? (
                  <div className="text-xs text-slate-500 text-center py-6">Đang tải lịch sử...</div>
                ) : unitDetails.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    Chi đội không có vi phạm nào ghi nhận trong tuần này.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unitDetails.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span>{item.rule_name || item.title || 'Ghi nhận thi đua'}</span>
                          <span className={item.points < 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>
                            {item.points > 0 ? `+${item.points}` : item.points} điểm
                          </span>
                        </div>
                        {item.student_name && (
                          <div className="text-[11px] text-slate-500">
                            Học sinh: {item.student_name} ({item.student_code})
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400">
                          Thời gian: {item.occurred_at ? new Date(item.occurred_at).toLocaleString('vi-VN') : '---'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  Nhận xét tuần cho chi đội:
                </label>
                <textarea
                  rows={3}
                  value={unitCommentInput}
                  onChange={e => setUnitCommentInput(e.target.value)}
                  placeholder="Nhập tuyên dương hoặc nhắc nhở chi đội trong tuần này..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={handleSaveComment}
                  disabled={actionLoading}
                  className="w-full py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-sm hover:opacity-90"
                >
                  Lưu nhận xét
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedUnitForDetail(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs mt-4"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
