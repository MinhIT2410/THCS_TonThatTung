/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Award, 
  ShieldCheck, 
  Clock, 
  FileCheck, 
  CheckCircle2, 
  X, 
  RefreshCw,
  AlertCircle
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

export default function RulesTab() {
  const [programs, setPrograms] = useState<CompetitionProgram[]>([]);
  const [rules, setRules] = useState<CompetitionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>('ALL');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<CompetitionRule> | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRulesAndPrograms = async () => {
    try {
      setLoading(true);
      const [pList, rList] = await Promise.all([
        competitionService.getPrograms(),
        competitionService.getRules(),
      ]);
      setPrograms(pList);
      setRules(rList);
    } catch (err: any) {
      console.error('Error fetching rules:', err);
      setAlert({ type: 'error', text: err.message || 'Lỗi khi tải danh mục quy tắc.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRulesAndPrograms();
  }, []);

  const openModalForNew = () => {
    setEditingRule({
      program_id: programs.length > 0 ? programs[0].id : '',
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
      is_active: true,
      display_order: 0,
    });
    setIsModalOpen(true);
  };

  const openModalForEdit = (rule: CompetitionRule) => {
    setEditingRule({ ...rule });
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !editingRule.program_id || !editingRule.code || !editingRule.name) return;

    try {
      setSaving(true);
      setAlert(null);
      await competitionService.saveRule(editingRule);
      setAlert({
        type: 'success',
        text: `Đã lưu quy tắc "${editingRule.name}" thành công!`,
      });
      setIsModalOpen(false);
      setEditingRule(null);
      await fetchRulesAndPrograms();
    } catch (err: any) {
      console.error('Save rule error:', err);
      setAlert({ type: 'error', text: err.message || 'Lỗi khi lưu quy tắc thi đua.' });
    } finally {
      setSaving(false);
    }
  };

  const filteredRules = rules.filter(r => {
    if (selectedProgramFilter === 'ALL') return true;
    return r.program_id === selectedProgramFilter;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-red-600" />
            Danh Mục Quy Tắc & Thang Điểm Thi Đua ({rules.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cấu hình các loại hành vi, tác động điểm cho Đội viên và Chi đội
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openModalForNew}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Quy Tắc Mới</span>
          </button>

          <button
            onClick={fetchRulesAndPrograms}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-medium ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <span>{alert.text}</span>
          <button onClick={() => setAlert(null)} className="underline opacity-80 hover:opacity-100">
            Đóng
          </button>
        </div>
      )}

      {/* Program Filter Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Lọc theo chương trình:</span>
        <select
          value={selectedProgramFilter}
          onChange={e => setSelectedProgramFilter(e.target.value)}
          className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
        >
          <option value="ALL">Tất cả chương trình ({rules.length})</option>
          {programs.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Rules Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse">
          Đang tải danh mục quy tắc tính điểm...
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-500">
          Chưa có quy tắc thi đua nào được tạo. Bấm "Thêm Quy Tắc Mới" để bắt đầu thiết lập.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map(rule => (
            <div
              key={rule.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 hover:border-red-500/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-mono font-bold text-[10px]">
                      {rule.code}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[10px]">
                      {COMPETITION_CATEGORY_LABELS[rule.category] || rule.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    {rule.name}
                  </h4>
                </div>

                <button
                  onClick={() => openModalForEdit(rule)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Chỉnh sửa quy tắc"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
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
                  <span className={`font-mono font-bold ${rule.student_merit_points > 0 ? 'text-emerald-600' : rule.student_merit_points < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {rule.student_merit_points > 0 ? `+${rule.student_merit_points}` : rule.student_merit_points}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Điểm thưởng</span>
                  <span className={`font-mono font-bold ${rule.student_reward_points > 0 ? 'text-amber-600' : rule.student_reward_points < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {rule.student_reward_points > 0 ? `+${rule.student_reward_points}` : rule.student_reward_points}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Điểm Chi đội</span>
                  <span className={`font-mono font-bold ${rule.unit_points > 0 ? 'text-blue-600' : rule.unit_points < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {rule.unit_points > 0 ? `+${rule.unit_points}` : rule.unit_points}
                  </span>
                </div>
              </div>

              {/* Scope & Flags Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-red-600" />
                {editingRule.id ? 'Chỉnh Sửa Quy Tắc Thi Đua' : 'Thêm Quy Tắc Thi Đua Mới'}
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Chương trình thi đua <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingRule.program_id || ''}
                  onChange={e => setEditingRule({ ...editingRule, program_id: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                >
                  <option value="">-- Chọn chương trình --</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Mã quy tắc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingRule.code || ''}
                    onChange={e => setEditingRule({ ...editingRule, code: e.target.value.toUpperCase() })}
                    placeholder="VD: KHAN_QUANG_01"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Phân loại danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingRule.category || 'GOOD_DEED'}
                    onChange={e => setEditingRule({ ...editingRule, category: e.target.value as CompetitionCategory })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    required
                  >
                    {Object.entries(COMPETITION_CATEGORY_LABELS).map(([catKey, catLabel]) => (
                      <option key={catKey} value={catKey}>
                        {catLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Tên quy tắc / Hành vi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingRule.name || ''}
                  onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="VD: Đeo khăn quàng đỏ đầy đủ / Nhặt được của rơi..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Phạm vi tác động <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingRule.effect_scope || 'BOTH'}
                  onChange={e => setEditingRule({ ...editingRule, effect_scope: e.target.value as CompetitionEffectScope })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  required
                >
                  {Object.entries(COMPETITION_SCOPE_LABELS).map(([scopeKey, scopeLabel]) => (
                    <option key={scopeKey} value={scopeKey}>
                      {scopeLabel}
                    </option>
                  ))}
                </select>
              </div>

              {/* Points Fields */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-3">
                <span className="font-bold text-slate-700 dark:text-slate-200 block">
                  Cấu hình điểm số (+ cộng điểm / - trừ điểm):
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Điểm Đội viên</label>
                    <input
                      type="number"
                      value={editingRule.student_merit_points ?? 0}
                      onChange={e => setEditingRule({ ...editingRule, student_merit_points: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Điểm Thưởng</label>
                    <input
                      type="number"
                      value={editingRule.student_reward_points ?? 0}
                      onChange={e => setEditingRule({ ...editingRule, student_reward_points: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Điểm Chi đội</label>
                    <input
                      type="number"
                      value={editingRule.unit_points ?? 0}
                      onChange={e => setEditingRule({ ...editingRule, unit_points: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.requires_approval ?? false}
                    onChange={e => setEditingRule({ ...editingRule, requires_approval: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Sự việc cần duyệt bởi Tổng phụ trách trước khi tính điểm
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.requires_evidence ?? false}
                    onChange={e => setEditingRule({ ...editingRule, requires_evidence: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Bắt buộc có hình ảnh/liên kết minh chứng khi ghi nhận
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.is_active ?? true}
                    onChange={e => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Kích hoạt quy tắc này
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
