/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Award, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Calendar,
  Layers,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  Clock,
  AlertCircle,
  Archive,
  Power,
  ChevronRight
} from 'lucide-react';
import { competitionService } from '../../../services/competitionService';
import { 
  CompetitionProgram, 
  CompetitionRule, 
  CompetitionCategory, 
  CompetitionEffectScope,
  COMPETITION_CATEGORY_LABELS, 
  COMPETITION_SCOPE_LABELS 
} from '../../../types/competition';

interface ProgramsAndRulesTabProps {
  initialSubTab?: 'programs' | 'rules';
  onProgramChange?: () => void;
}

// Utility function to convert Vietnamese text & raw strings into standard upper-case code
export function formatCode(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export default function ProgramsAndRulesTab({ initialSubTab = 'programs', onProgramChange }: ProgramsAndRulesTabProps) {
  const [subTab, setSubTab] = useState<'programs' | 'rules'>(initialSubTab);
  const [canManage, setCanManage] = useState<boolean>(false);
  const [checkingPermission, setCheckingPermission] = useState<boolean>(true);

  // Data states
  const [programs, setPrograms] = useState<CompetitionProgram[]>([]);
  const [rules, setRules] = useState<CompetitionRule[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('ALL');

  // Program Modal State
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Partial<CompetitionProgram> | null>(null);
  const [programFormError, setProgramFormError] = useState<string | null>(null);

  // Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<CompetitionRule> | null>(null);
  const [ruleFormError, setRuleFormError] = useState<string | null>(null);

  // Shared UI States
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check management permissions
  useEffect(() => {
    async function initPermissions() {
      setCheckingPermission(true);
      const isAllowed = await competitionService.canManageCompetition();
      setCanManage(isAllowed);
      setCheckingPermission(false);
    }
    initPermissions();
  }, []);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [pList, rList, yList] = await Promise.all([
        competitionService.getCompetitionPrograms(true),
        competitionService.getCompetitionRules('ALL', true),
        competitionService.getAcademicYears(),
      ]);
      setPrograms(pList);
      setRules(rList);
      setAcademicYears(yList);

      // Auto set filter to first active program if not set or invalid
      setSelectedProgramFilter(prev => {
        if (prev && prev !== 'ALL' && pList.some(p => p.id === prev)) return prev;
        if (pList.length > 0) {
          const activeProg = pList.find(p => p.is_active) || pList[0];
          return activeProg.id;
        }
        return '';
      });
    } catch (err: any) {
      console.error('Error fetching programs and rules:', err);
      setToast({ type: 'error', text: err.message || 'Lỗi khi tải dữ liệu chương trình & quy tắc.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------------------------------------------------------------------------
  // PROGRAM HANDLERS
  // ---------------------------------------------------------------------------
  const openNewProgramModal = () => {
    setProgramFormError(null);
    setEditingProgram({
      code: '',
      name: '',
      description: '',
      academic_year_id: academicYears.length > 0 ? academicYears[0].id : '',
      starts_at: new Date().toISOString().slice(0, 10),
      ends_at: '',
      is_active: true,
    });
    setIsProgramModalOpen(true);
  };

  const openEditProgramModal = (prog: CompetitionProgram) => {
    setProgramFormError(null);
    setEditingProgram({ ...prog });
    setIsProgramModalOpen(true);
  };

  const handleProgramNameChange = (name: string) => {
    if (!editingProgram) return;
    const isNew = !editingProgram.id;
    // Auto format code if user hasn't typed a custom code or when creating new
    if (isNew) {
      setEditingProgram({
        ...editingProgram,
        name,
        code: formatCode(name),
      });
    } else {
      setEditingProgram({
        ...editingProgram,
        name,
      });
    }
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;

    if (!editingProgram.name?.trim()) {
      setProgramFormError('Vui lòng nhập Tên chương trình thi đua.');
      return;
    }

    if (!editingProgram.code?.trim()) {
      setProgramFormError('Vui lòng nhập Mã chương trình thi đua.');
      return;
    }

    // Date validation
    if (editingProgram.starts_at && editingProgram.ends_at) {
      const start = new Date(editingProgram.starts_at).getTime();
      const end = new Date(editingProgram.ends_at).getTime();
      if (end < start) {
        setProgramFormError('Ngày kết thúc không được nhỏ hơn ngày bắt đầu.');
        return;
      }
    }

    try {
      setSaving(true);
      setProgramFormError(null);

      const formattedCode = formatCode(editingProgram.code);
      const payload = {
        ...editingProgram,
        code: formattedCode,
        name: editingProgram.name.trim(),
        description: editingProgram.description?.trim() || null,
      };

      if (editingProgram.id) {
        await competitionService.updateCompetitionProgram(editingProgram.id, payload);
        setToast({ type: 'success', text: `Cập nhật chương trình "${payload.name}" thành công!` });
      } else {
        await competitionService.createCompetitionProgram(payload);
        setToast({ type: 'success', text: `Tạo mới chương trình "${payload.name}" thành công!` });
      }

      setIsProgramModalOpen(false);
      setEditingProgram(null);
      await fetchData();
      if (onProgramChange) onProgramChange();
    } catch (err: any) {
      console.error('Save program error:', err);
      setProgramFormError(err.message || 'Lỗi khi lưu thông tin chương trình.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveProgram = async (prog: CompetitionProgram) => {
    if (!confirm(`Bạn có chắc chắn muốn ngừng sử dụng chương trình "${prog.name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      await competitionService.archiveCompetitionProgram(prog.id);
      setToast({ type: 'success', text: `Đã chuyển chương trình "${prog.name}" sang trạng thái Ngừng hoạt động.` });
      await fetchData();
      if (onProgramChange) onProgramChange();
    } catch (err: any) {
      console.error('Archive program error:', err);
      setToast({ type: 'error', text: err.message || 'Lỗi khi ngừng sử dụng chương trình.' });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // RULE HANDLERS
  // ---------------------------------------------------------------------------
  const openNewRuleModal = () => {
    setRuleFormError(null);
    const activeProgs = programs.filter(p => p.is_active);
    const defaultProgId = selectedProgramFilter !== 'ALL' 
      ? selectedProgramFilter 
      : (activeProgs.length > 0 ? activeProgs[0].id : (programs.length > 0 ? programs[0].id : ''));

    setEditingRule({
      program_id: defaultProgId,
      code: '',
      name: '',
      description: '',
      category: 'GOOD_DEED',
      effect_scope: 'BOTH',
      student_merit_points: 0,
      student_reward_points: 0,
      unit_points: 0,
      requires_evidence: false,
      requires_approval: false,
      daily_limit: null,
      display_order: 0,
      is_active: true,
    });
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: CompetitionRule) => {
    setRuleFormError(null);
    setEditingRule({ ...rule });
    setIsRuleModalOpen(true);
  };

  const handleRuleNameChange = (name: string) => {
    if (!editingRule) return;
    const isNew = !editingRule.id;
    if (isNew) {
      setEditingRule({
        ...editingRule,
        name,
        code: formatCode(name),
      });
    } else {
      setEditingRule({
        ...editingRule,
        name,
      });
    }
  };

  // Handle effect scope change and enforce point rules
  const handleScopeChange = (scope: CompetitionEffectScope) => {
    if (!editingRule) return;

    let studentMerit = editingRule.student_merit_points ?? 0;
    let studentReward = editingRule.student_reward_points ?? 0;
    let unitPts = editingRule.unit_points ?? 0;

    if (scope === 'STUDENT_ONLY') {
      unitPts = 0;
    } else if (scope === 'UNIT_ONLY') {
      studentMerit = 0;
      studentReward = 0;
    } else if (scope === 'RECORD_ONLY') {
      studentMerit = 0;
      studentReward = 0;
      unitPts = 0;
    }

    setEditingRule({
      ...editingRule,
      effect_scope: scope,
      student_merit_points: studentMerit,
      student_reward_points: studentReward,
      unit_points: unitPts,
    });
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    if (!editingRule.program_id) {
      setRuleFormError('Vui lòng chọn Chương trình thi đua.');
      return;
    }

    if (!editingRule.name?.trim()) {
      setRuleFormError('Vui lòng nhập Tên quy tắc.');
      return;
    }

    if (!editingRule.code?.trim()) {
      setRuleFormError('Vui lòng nhập Mã quy tắc.');
      return;
    }

    // Enforce points logic based on effect_scope
    const scope = editingRule.effect_scope || 'BOTH';
    let studentMerit = editingRule.student_merit_points ?? 0;
    let studentReward = editingRule.student_reward_points ?? 0;
    let unitPts = editingRule.unit_points ?? 0;

    if (scope === 'STUDENT_ONLY') {
      unitPts = 0;
    } else if (scope === 'UNIT_ONLY') {
      studentMerit = 0;
      studentReward = 0;
    } else if (scope === 'RECORD_ONLY') {
      studentMerit = 0;
      studentReward = 0;
      unitPts = 0;
    }

    try {
      setSaving(true);
      setRuleFormError(null);

      const formattedCode = formatCode(editingRule.code);
      const payload = {
        ...editingRule,
        code: formattedCode,
        name: editingRule.name.trim(),
        description: editingRule.description?.trim() || null,
        student_merit_points: studentMerit,
        student_reward_points: studentReward,
        unit_points: unitPts,
      };

      if (editingRule.id) {
        await competitionService.updateCompetitionRule(editingRule.id, payload);
        setToast({ type: 'success', text: `Cập nhật quy tắc "${payload.name}" thành công!` });
      } else {
        await competitionService.createCompetitionRule(payload);
        setToast({ type: 'success', text: `Tạo mới quy tắc "${payload.name}" thành công!` });
      }

      setIsRuleModalOpen(false);
      setEditingRule(null);
      await fetchData();
    } catch (err: any) {
      console.error('Save rule error:', err);
      setRuleFormError(err.message || 'Lỗi khi lưu thông tin quy tắc.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveRule = async (rule: CompetitionRule) => {
    if (!confirm(`Bạn có chắc chắn muốn ngừng sử dụng quy tắc "${rule.name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      await competitionService.archiveCompetitionRule(rule.id);
      setToast({ type: 'success', text: `Đã chuyển quy tắc "${rule.name}" sang trạng thái Ngừng hoạt động.` });
      await fetchData();
    } catch (err: any) {
      console.error('Archive rule error:', err);
      setToast({ type: 'error', text: err.message || 'Lỗi khi ngừng sử dụng quy tắc.' });
    } finally {
      setSaving(false);
    }
  };

  // Filtered lists
  const displayedPrograms = canManage ? programs : programs.filter(p => p.is_active);
  const filteredRules = rules.filter(r => {
    if (!canManage && !r.is_active) return false;
    if (selectedProgramFilter === 'ALL') return true;
    return r.program_id === selectedProgramFilter;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="underline opacity-80 hover:opacity-100">
            Đóng
          </button>
        </div>
      )}

      {/* Permission Info Bar */}
      {!checkingPermission && !canManage && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Bạn đang ở chế độ <strong>Chỉ xem</strong> (Cần quyền <code>COMPETITION_MANAGE</code> hoặc <code>SUPER_ADMIN</code> để tạo, chỉnh sửa hoặc ngừng sử dụng chương trình & quy tắc).
          </span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('programs')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              subTab === 'programs'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Chương trình thi đua</span>
          </button>

          <button
            onClick={() => setSubTab('rules')}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              subTab === 'rules'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Quy tắc tính điểm</span>
          </button>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="Tải lại dữ liệu"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: PROGRAM MANAGEMENT                                          */}
      {/* ===================================================================== */}
      {subTab === 'programs' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-600" />
                Danh sách chương trình thi đua
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quản lý các chương trình và đợt thi đua trong từng năm học.
              </p>
            </div>

            {canManage && displayedPrograms.length > 0 && (
              <button
                onClick={openNewProgramModal}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm chương trình</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse">
              Đang tải danh sách chương trình thi đua...
            </div>
          ) : displayedPrograms.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  Chưa có chương trình thi đua nào
                </p>
                <p className="text-xs text-slate-500">
                  Tạo đợt thi đua để thiết lập các quy tắc cộng/trừ điểm cho Đội viên và Chi đội.
                </p>
              </div>
              {canManage && (
                <button
                  onClick={openNewProgramModal}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo chương trình đầu tiên</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedPrograms.map(prog => {
                const programRuleCount = rules.filter(r => r.program_id === prog.id).length;
                
                // Helper status determination
                let statusBadge = (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Đang hoạt động
                  </span>
                );

                if (!prog.is_active) {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      Ngừng sử dụng
                    </span>
                  );
                } else {
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  const startTime = prog.starts_at ? new Date(prog.starts_at).getTime() : null;
                  const endTime = prog.ends_at ? new Date(prog.ends_at).getTime() : null;
                  const nowTime = now.getTime();

                  if (startTime && nowTime < startTime) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Sắp diễn ra
                      </span>
                    );
                  } else if (endTime && nowTime > endTime) {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        Đã kết thúc
                      </span>
                    );
                  }
                }

                return (
                  <div
                    key={prog.id}
                    className={`bg-white dark:bg-slate-900 border ${
                      prog.is_active 
                        ? 'border-slate-200/80 dark:border-slate-800 hover:border-red-500/50' 
                        : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-900/50'
                    } rounded-3xl p-5 shadow-xs space-y-4 transition-colors flex flex-col justify-between`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-mono font-bold text-xs">
                          {prog.code}
                        </span>
                        {statusBadge}
                      </div>

                      <div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">
                          {prog.name}
                        </h4>
                        {prog.academic_year_name && (
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                            Năm học: {prog.academic_year_name}
                          </span>
                        )}
                      </div>

                      {prog.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {prog.description}
                        </p>
                      )}

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Thời gian:</span>
                          <span className="font-medium">
                            {prog.starts_at ? new Date(prog.starts_at).toLocaleDateString('vi-VN') : '---'} – {prog.ends_at ? new Date(prog.ends_at).toLocaleDateString('vi-VN') : '---'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Số quy tắc:</span>
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {programRuleCount} quy tắc
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                        <button
                          onClick={() => openEditProgramModal(prog)}
                          className="px-3 py-1.5 rounded-xl font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Chỉnh sửa
                        </button>

                        {prog.is_active && (
                          <button
                            onClick={() => handleArchiveProgram(prog)}
                            className="px-3 py-1.5 rounded-xl font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-1.5"
                            title="Ngừng sử dụng chương trình này"
                          >
                            <Power className="w-3.5 h-3.5" />
                            Ngừng sử dụng
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: RULE MANAGEMENT                                             */}
      {/* ===================================================================== */}
      {subTab === 'rules' && (
        <div className="space-y-6">
          {/* Program Filter Bar at Top */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <label htmlFor="program-filter-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                Chương trình thi đua:
              </label>
              <select
                id="program-filter-select"
                value={selectedProgramFilter}
                onChange={e => setSelectedProgramFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="">-- Chọn chương trình thi đua --</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name} {!p.is_active ? '(Ngừng sử dụng)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {canManage && selectedProgramFilter !== '' && programs.length > 0 && (
              <button
                onClick={openNewRuleModal}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm quy tắc</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse">
              Đang tải danh mục quy tắc tính điểm...
            </div>
          ) : programs.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <FileCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                Chưa có chương trình thi đua. Hãy tạo chương trình trước khi thiết lập quy tắc.
              </p>
            </div>
          ) : selectedProgramFilter === '' ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Layers className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                Vui lòng chọn chương trình thi đua để xem và thiết lập quy tắc tính điểm.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-red-600" />
                    Danh sách quy tắc tính điểm
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Cấu hình thang điểm rèn luyện, điểm thưởng và điểm Chi đội cho các hành vi thi đua.
                  </p>
                </div>
              </div>

              {filteredRules.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="text-xs text-slate-500 font-medium">
                    Chưa có quy tắc thi đua nào thuộc chương trình được chọn. Bấm "Thêm quy tắc" để tạo mới.
                  </p>
                  {canManage && (
                    <button
                      onClick={openNewRuleModal}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm quy tắc</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRules.map(rule => (
                    <div
                      key={rule.id}
                      className={`bg-white dark:bg-slate-900 border ${
                        rule.is_active 
                          ? 'border-slate-200/80 dark:border-slate-800 hover:border-red-500/50' 
                          : 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/50 dark:bg-slate-900/50'
                      } rounded-3xl p-5 shadow-xs space-y-4 transition-colors flex flex-col justify-between`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-mono font-bold text-[10px]">
                                {rule.code}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">
                                {COMPETITION_CATEGORY_LABELS[rule.category] || rule.category}
                              </span>
                              {rule.program?.name && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium text-[10px]">
                                  {rule.program.name}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-base text-slate-900 dark:text-white">
                              {rule.name}
                            </h4>
                          </div>

                          {rule.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md shrink-0">
                              Đang hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                              Ngừng hoạt động
                            </span>
                          )}
                        </div>

                        {rule.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic">
                            "{rule.description}"
                          </p>
                        )}

                        {/* Point Values Grid */}
                        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Điểm rèn luyện</span>
                            <span className={`font-mono font-bold ${rule.student_merit_points > 0 ? 'text-emerald-600' : rule.student_merit_points < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {rule.student_merit_points > 0 ? `+${rule.student_merit_points}` : rule.student_merit_points}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Điểm thưởng</span>
                            <span className={`font-mono font-bold ${rule.student_reward_points > 0 ? 'text-amber-600' : rule.student_reward_points < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {rule.student_reward_points > 0 ? `+${rule.student_reward_points}` : rule.student_reward_points}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Điểm Chi đội</span>
                            <span className={`font-mono font-bold ${rule.unit_points > 0 ? 'text-blue-600' : rule.unit_points < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {rule.unit_points > 0 ? `+${rule.unit_points}` : rule.unit_points}
                            </span>
                          </div>
                        </div>

                        {/* Scope & Flags Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span>Phạm vi: <strong>{COMPETITION_SCOPE_LABELS[rule.effect_scope]}</strong></span>
                          <div className="flex items-center gap-2">
                            {rule.requires_approval ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> Cần duyệt
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                <ShieldCheck className="w-3 h-3" /> Tự động
                              </span>
                            )}
                            {rule.requires_evidence && (
                              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                • Cần minh chứng
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {canManage && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                          <button
                            onClick={() => openEditRuleModal(rule)}
                            className="px-3 py-1.5 rounded-xl font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Chỉnh sửa
                          </button>

                          {rule.is_active && (
                            <button
                              onClick={() => handleArchiveRule(rule)}
                              className="px-3 py-1.5 rounded-xl font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-1.5"
                              title="Ngừng sử dụng quy tắc này"
                            >
                              <Power className="w-3.5 h-3.5" />
                              Ngừng sử dụng
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* PROGRAM ADD / EDIT MODAL                                               */}
      {/* ===================================================================== */}
      {isProgramModalOpen && editingProgram && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-red-600" />
                {editingProgram.id ? 'Chỉnh Sửa Chương Trình Thi Đua' : 'Thêm Chương Trình Thi Đua Mới'}
              </h4>
              <button
                type="button"
                onClick={() => setIsProgramModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {programFormError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{programFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProgram} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên chương trình <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingProgram.name || ''}
                  onChange={e => handleProgramNameChange(e.target.value)}
                  placeholder="VD: Thi đua năm học 2026–2027"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/20"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mã chương trình <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingProgram.code || ''}
                  onChange={e => setEditingProgram({ ...editingProgram, code: formatCode(e.target.value) })}
                  placeholder="VD: THI_DUA_2026_2027"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none focus:ring-2 focus:ring-red-500/20"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tự động viết hoa, không dấu, viết liền dùng dấu gạch dưới (_).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Năm học
                  </label>
                  <select
                    value={editingProgram.academic_year_id || ''}
                    onChange={e => setEditingProgram({ ...editingProgram, academic_year_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Chọn năm học --</option>
                    {academicYears.map(yr => (
                      <option key={yr.id} value={yr.id}>
                        {yr.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái hoạt động
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProgram.is_active ?? true}
                      onChange={e => setEditingProgram({ ...editingProgram, is_active: e.target.checked })}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Đang hoạt động
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={editingProgram.starts_at || ''}
                    onChange={e => setEditingProgram({ ...editingProgram, starts_at: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={editingProgram.ends_at || ''}
                    onChange={e => setEditingProgram({ ...editingProgram, ends_at: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chương trình
                </label>
                <textarea
                  rows={3}
                  value={editingProgram.description || ''}
                  onChange={e => setEditingProgram({ ...editingProgram, description: e.target.value })}
                  placeholder="Mô tả mục tiêu, quy mô hoặc nội dung đợt thi đua..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProgramModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Chương Trình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* RULE ADD / EDIT MODAL                                                  */}
      {/* ===================================================================== */}
      {isRuleModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-red-600" />
                {editingRule.id ? 'Chỉnh Sửa Quy Tắc Thi Đua' : 'Thêm Quy Tắc Thi Đua Mới'}
              </h4>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ruleFormError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{ruleFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chương trình thi đua <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingRule.program_id || ''}
                  onChange={e => setEditingRule({ ...editingRule, program_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                >
                  <option value="">-- Chọn chương trình --</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name} {!p.is_active ? '(Đã khóa)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên quy tắc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingRule.name || ''}
                    onChange={e => handleRuleNameChange(e.target.value)}
                    placeholder="VD: Đi học trễ"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mã quy tắc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingRule.code || ''}
                    onChange={e => setEditingRule({ ...editingRule, code: formatCode(e.target.value) })}
                    placeholder="VD: DI_HOC_TRE"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nhóm hành vi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingRule.category || 'GOOD_DEED'}
                    onChange={e => setEditingRule({ ...editingRule, category: e.target.value as CompetitionCategory })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    required
                  >
                    {Object.entries(COMPETITION_CATEGORY_LABELS).map(([catKey, catLabel]) => (
                      <option key={catKey} value={catKey}>
                        {catLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phạm vi ảnh hưởng <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingRule.effect_scope || 'BOTH'}
                    onChange={e => handleScopeChange(e.target.value as CompetitionEffectScope)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    required
                  >
                    {Object.entries(COMPETITION_SCOPE_LABELS).map(([scopeKey, scopeLabel]) => (
                      <option key={scopeKey} value={scopeKey}>
                        {scopeLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Point Config Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Cấu hình điểm thi đua
                  </span>
                  <span className="text-[10px] text-slate-400">
                    (+ cộng điểm / - trừ điểm)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Điểm Đội viên
                    </label>
                    <input
                      type="number"
                      disabled={editingRule.effect_scope === 'UNIT_ONLY' || editingRule.effect_scope === 'RECORD_ONLY'}
                      value={editingRule.student_merit_points ?? 0}
                      onChange={e => setEditingRule({ ...editingRule, student_merit_points: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Điểm Thưởng
                    </label>
                    <input
                      type="number"
                      disabled={editingRule.effect_scope === 'UNIT_ONLY' || editingRule.effect_scope === 'RECORD_ONLY'}
                      value={editingRule.student_reward_points ?? 0}
                      onChange={e => setEditingRule({ ...editingRule, student_reward_points: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Điểm Chi đội
                    </label>
                    <input
                      type="number"
                      disabled={editingRule.effect_scope === 'STUDENT_ONLY' || editingRule.effect_scope === 'RECORD_ONLY'}
                      value={editingRule.unit_points ?? 0}
                      onChange={e => setEditingRule({ ...editingRule, unit_points: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                    />
                  </div>
                </div>

                {editingRule.effect_scope === 'STUDENT_ONLY' && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    * Phạm vi Chỉ đội viên: Điểm Chi đội tự động thiết lập bằng 0.
                  </p>
                )}
                {editingRule.effect_scope === 'UNIT_ONLY' && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    * Phạm vi Chỉ chi đội: Điểm rèn luyện và điểm thưởng Đội viên tự động thiết lập bằng 0.
                  </p>
                )}
                {editingRule.effect_scope === 'RECORD_ONLY' && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400">
                    * Phạm vi Chỉ ghi nhận: Tất cả điểm số tự động thiết lập bằng 0.
                  </p>
                )}
              </div>

              {/* Extra flags & limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Giới hạn ghi nhận / ngày
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingRule.daily_limit ?? ''}
                    onChange={e => setEditingRule({ ...editingRule, daily_limit: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Không giới hạn"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    value={editingRule.display_order ?? 0}
                    onChange={e => setEditingRule({ ...editingRule, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.requires_approval ?? false}
                    onChange={e => setEditingRule({ ...editingRule, requires_approval: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Yêu cầu duyệt bởi Tổng phụ trách trước khi tính điểm
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.requires_evidence ?? false}
                    onChange={e => setEditingRule({ ...editingRule, requires_evidence: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Bắt buộc đính kèm hình ảnh/minh chứng khi ghi nhận
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.is_active ?? true}
                    onChange={e => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Đang hoạt động (Kích hoạt quy tắc)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu Quy Tắc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
