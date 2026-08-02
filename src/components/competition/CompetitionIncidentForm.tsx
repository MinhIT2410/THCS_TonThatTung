/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserCheck, 
  AlertTriangle, 
  Award, 
  Clock, 
  Upload, 
  Link as LinkIcon, 
  X, 
  CheckCircle2, 
  Sparkles,
  Info,
  ShieldCheck
} from 'lucide-react';
import { competitionService } from '../../services/competitionService';
import { 
  CompetitionProgram, 
  CompetitionRule, 
  COMPETITION_CATEGORY_LABELS, 
  COMPETITION_SCOPE_LABELS 
} from '../../types/competition';

interface CompetitionIncidentFormProps {
  onNavigateToPrograms?: () => void;
}

export default function CompetitionIncidentForm({ onNavigateToPrograms }: CompetitionIncidentFormProps) {
  const [programs, setPrograms] = useState<CompetitionProgram[]>([]);
  const [rules, setRules] = useState<CompetitionRule[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [selectedRule, setSelectedRule] = useState<CompetitionRule | null>(null);

  // Student search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [unitInfo, setUnitInfo] = useState<{ has_unit: boolean; class_id?: string; class_name?: string; message?: string } | null>(null);

  // Form fields
  const [occurredAt, setOccurredAt] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  // Image uploads
  const [evidenceFiles, setEvidenceFiles] = useState<{ file: File; previewUrl: string; uploadedUrl?: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load programs on mount
  useEffect(() => {
    async function loadData() {
      try {
        const progs = await competitionService.getPrograms();
        const activeProgs = progs.filter(p => p.is_active);
        setPrograms(activeProgs);
        if (activeProgs.length > 0) {
          setSelectedProgramId(activeProgs[0].id);
        }
      } catch (err) {
        console.error('Failed to load programs:', err);
      }
    }
    loadData();
  }, []);

  // Load rules when program changes
  useEffect(() => {
    if (!selectedProgramId) {
      setRules([]);
      setSelectedRuleId('');
      setSelectedRule(null);
      return;
    }

    async function loadRules() {
      try {
        const rList = await competitionService.getRules(selectedProgramId);
        const activeRules = rList.filter(r => r.is_active);
        setRules(activeRules);
        if (activeRules.length > 0) {
          setSelectedRuleId(activeRules[0].id);
          setSelectedRule(activeRules[0]);
          setTitle(activeRules[0].name);
        } else {
          setSelectedRuleId('');
          setSelectedRule(null);
          setTitle('');
        }
      } catch (err) {
        console.error('Failed to load rules:', err);
      }
    }
    loadRules();
  }, [selectedProgramId]);

  // Handle rule change
  const handleRuleChange = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    const r = rules.find(item => item.id === ruleId) || null;
    setSelectedRule(r);
    if (r) {
      setTitle(r.name);
    }
  };

  // Student search effect
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await competitionService.searchStudents(searchTerm);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Select student
  const handleSelectStudent = async (student: any) => {
    setSelectedStudent(student);
    setSearchTerm('');
    setSearchResults([]);

    // Check unit
    if (student.unit?.class_id) {
      setUnitInfo({
        has_unit: true,
        class_id: student.unit.class_id,
        class_name: student.unit.class_name,
      });
    } else {
      const res = await competitionService.getStudentCurrentUnit(student.id);
      setUnitInfo(res);
    }
  };

  // Upload file handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newItems = files.map((file: File) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setEvidenceFiles(prev => [...prev, ...newItems]);
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage(null);

    if (!selectedProgramId) {
      setToastMessage({ type: 'error', text: 'Vui lòng chọn chương trình thi đua.' });
      return;
    }
    if (!selectedRuleId || !selectedRule) {
      setToastMessage({ type: 'error', text: 'Vui lòng chọn quy tắc hành vi.' });
      return;
    }

    // Check scope requirements
    if (
      (selectedRule.effect_scope === 'STUDENT_ONLY' || selectedRule.effect_scope === 'BOTH') &&
      !selectedStudent
    ) {
      setToastMessage({ type: 'error', text: 'Quy tắc này yêu cầu chọn Đội viên.' });
      return;
    }

    if (
      (selectedRule.effect_scope === 'UNIT_ONLY' || selectedRule.effect_scope === 'BOTH') &&
      !unitInfo?.class_id
    ) {
      setToastMessage({
        type: 'error',
        text: 'Đội viên chưa được phân vào Chi đội. Không thể áp dụng quy tắc ảnh hưởng Chi đội.',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload evidence files if any
      const evidenceItems: any[] = [];

      if (evidenceFiles.length > 0) {
        setIsUploading(true);
        for (let i = 0; i < evidenceFiles.length; i++) {
          const item = evidenceFiles[i];
          const publicUrl = await competitionService.uploadEvidenceImage(item.file);
          evidenceItems.push({
            evidence_type: 'IMAGE',
            file_url: publicUrl,
            display_order: i,
          });
        }
        setIsUploading(false);
      }

      if (externalUrl.trim()) {
        evidenceItems.push({
          evidence_type: 'EXTERNAL_LINK',
          external_url: externalUrl.trim(),
          display_order: evidenceItems.length,
        });
      }

      const res = await competitionService.createIncident({
        program_id: selectedProgramId,
        rule_id: selectedRuleId,
        student_id: selectedStudent?.id || null,
        unit_id: unitInfo?.class_id || null,
        occurred_at: new Date(occurredAt).toISOString(),
        title: title.trim() || selectedRule.name,
        description: description.trim() || null,
        evidence_note: evidenceNote.trim() || null,
        evidence_items: evidenceItems,
      });

      setToastMessage({
        type: 'success',
        text: res.message || 'Ghi nhận sự việc thi đua thành công!',
      });

      // Reset form
      setSelectedStudent(null);
      setUnitInfo(null);
      setDescription('');
      setEvidenceNote('');
      setExternalUrl('');
      setEvidenceFiles([]);
    } catch (err: any) {
      console.error('Submit error:', err);
      setToastMessage({
        type: 'error',
        text: err.message || 'Có lỗi xảy ra khi ghi nhận sự việc.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-sm font-medium ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 underline ml-4 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Program & Behavior Selection */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Award className="w-5 h-5 text-red-600" />
              1. Chọn Chương Trình & Quy Tắc Thi Đua
            </h3>

            {programs.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Chưa có chương trình thi đua đang hoạt động.</span>
                </div>
                {onNavigateToPrograms && (
                  <button
                    type="button"
                    onClick={onNavigateToPrograms}
                    className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm shrink-0 cursor-pointer"
                  >
                    Tạo chương trình
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Chương trình thi đua <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProgramId}
                    onChange={e => setSelectedProgramId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Chọn chương trình --</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Quy tắc thi đua / Hành vi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedRuleId}
                    onChange={e => handleRuleChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Chọn quy tắc --</option>
                    {rules.map(r => (
                      <option key={r.id} value={r.id}>
                        [{r.code}] {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedRule && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold">
                    {COMPETITION_CATEGORY_LABELS[selectedRule.category] || selectedRule.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium">
                    Phạm vi: {COMPETITION_SCOPE_LABELS[selectedRule.effect_scope] || selectedRule.effect_scope}
                  </span>
                  {selectedRule.requires_approval ? (
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Yêu cầu kiểm duyệt
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Duyệt tự động
                    </span>
                  )}
                </div>

                {selectedRule.description && (
                  <p className="text-slate-600 dark:text-slate-300 italic pt-1">
                    "{selectedRule.description}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Student Search & Automatic Class Resolution */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <UserCheck className="w-5 h-5 text-blue-600" />
              2. Tìm Đội Viên & Xác Định Chi Đội
            </h3>

            {/* Selected Student Card */}
            {selectedStudent ? (
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                    {selectedStudent.full_name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedStudent.full_name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Mã Đội viên: <span className="font-mono">{selectedStudent.student_code || 'Chưa cập nhật'}</span>
                    </p>
                    {unitInfo?.has_unit ? (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-semibold">
                        Chi đội / Lớp: {unitInfo.class_name}
                      </span>
                    ) : (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-semibold">
                        ⚠️ Học sinh chưa được phân vào lớp trong năm học hiện tại.
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setUnitInfo(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-500 transition-colors cursor-pointer"
                  title="Đổi đội viên"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Tra cứu học sinh / Đội viên (Nhập tên hoặc Mã số)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="VD: Nguyễn Văn A hoặc HS202401..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                  {isSearching && (
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 animate-pulse">
                      Đang tìm...
                    </span>
                  )}
                </div>

                {/* Dropdown Results */}
                {searchResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {searchResults.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectStudent(s)}
                        className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {s.full_name}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            Mã: {s.student_code || 'Chưa cập nhật'}
                          </div>
                        </div>
                        {s.unit?.class_name ? (
                          <div className="text-right">
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold block">
                              Lớp {s.unit.class_name}
                            </span>
                            {s.unit.academic_year_name && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {s.unit.academic_year_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-medium">
                            Chưa phân lớp
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Time, Description & Evidence */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Clock className="w-5 h-5 text-emerald-600" />
              3. Thời Gian & Chi Tiết Sự Việc
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Thời gian xảy ra sự việc <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={occurredAt}
                  onChange={e => setOccurredAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Tiêu đề sự việc
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Mặc định theo tên quy tắc"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Mô tả chi tiết nội dung sự việc
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ghi rõ diễn biến sự việc, địa điểm, nhân chứng (nếu có)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Evidence & Attachment */}
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Minh chứng & Đính kèm (Ảnh / Liên kết)
              </label>

              <div>
                <input
                  type="text"
                  value={evidenceNote}
                  onChange={e => setEvidenceNote(e.target.value)}
                  placeholder="Ghi chú minh chứng (VD: Biên bản số 05/BB-LĐ)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none mb-3"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Image upload box */}
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-red-500 cursor-pointer transition-colors w-full justify-center">
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span>Chọn hình ảnh minh chứng</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* External link input */}
                <div>
                  <div className="relative">
                    <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-400" />
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={e => setExternalUrl(e.target.value)}
                      placeholder="Dán liên kết minh chứng (URL)..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Uploaded File Previews */}
              {evidenceFiles.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {evidenceFiles.map((item, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={item.previewUrl} alt="Minh chứng" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Point Impact Preview & Submit Button */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 sticky top-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Xem Trước Tác Động Điểm
            </h3>

            {selectedRule ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 space-y-3">
                  {/* Merit points */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      Điểm rèn luyện Đội viên:
                    </span>
                    <span
                      className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg ${
                        selectedRule.student_merit_points > 0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : selectedRule.student_merit_points < 0
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {selectedRule.student_merit_points > 0 ? `+${selectedRule.student_merit_points}` : selectedRule.student_merit_points}
                    </span>
                  </div>

                  {/* Reward points */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      Điểm thưởng đổi quà:
                    </span>
                    <span
                      className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg ${
                        selectedRule.student_reward_points > 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : selectedRule.student_reward_points < 0
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {selectedRule.student_reward_points > 0 ? `+${selectedRule.student_reward_points}` : selectedRule.student_reward_points}
                    </span>
                  </div>

                  {/* Unit points */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700">
                    <span className="text-slate-700 dark:text-slate-200 font-bold">
                      Điểm thi đua Chi đội:
                    </span>
                    <span
                      className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg ${
                        selectedRule.unit_points > 0
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : selectedRule.unit_points < 0
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {selectedRule.unit_points > 0 ? `+${selectedRule.unit_points}` : selectedRule.unit_points}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Điểm số được tính toán tự động dựa trên quy tắc đã cấu hình. Hệ thống tuyệt đối không cho phép can thiệp gõ điểm tự do để đảm bảo tính công bằng và minh bạch.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                Vui lòng chọn quy tắc thi đua ở cột bên trái để xem trước tác động điểm.
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !selectedRuleId}
              className="w-full py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-red-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isUploading ? 'Đang tải minh chứng...' : 'Đang ghi nhận...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Xác Nhận Ghi Nhận Sự Việc</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
