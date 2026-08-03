/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../userTypes';
import { useAuth } from '../../auth/useAuth';
import { ResetPasswordModal } from './ResetPasswordModal';
import { X, AlertTriangle, Shield, User, Mail, KeyRound, Loader2, Award, Calendar, Layers, CheckSquare, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
import { competitionService } from '../../../services/competitionService';
import { sortClassesNaturally } from '../../../utils/classSortUtils';

interface AdminUserEditModalProps {
  userProfile: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: { full_name: string; roles: string[]; is_active: boolean }) => Promise<void>;
  onResetPassword?: (userId: string, newPassword: string) => Promise<void>;
}

const AVAILABLE_ROLES = [
  { code: 'SUPER_ADMIN', name: 'Quản trị hệ thống' },
  { code: 'PRINCIPAL', name: 'Hiệu trưởng' },
  { code: 'VICE_PRINCIPAL', name: 'Hiệu phó' },
  { code: 'CONTENT_EDITOR', name: 'Biên tập nội dung' },
  { code: 'STAFF', name: 'Nhân viên' },
  { code: 'TEACHER', name: 'Giáo viên' },
  { code: 'STUDENT', name: 'Học sinh' }
];

interface OptionItem {
  id: string;
  name: string;
  academic_year_id?: string;
  grade_level_id?: string;
}

export const AdminUserEditModal: React.FC<AdminUserEditModalProps> = ({
  userProfile,
  isOpen,
  onClose,
  onSave,
  onResetPassword,
}) => {
  const { profile: currentUserProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);

  // Supervisor Assignment State
  const [hasSupervisorTask, setHasSupervisorTask] = useState(false);
  const [existingAssignmentId, setExistingAssignmentId] = useState<string | null>(null);
  const [academicYears, setAcademicYears] = useState<OptionItem[]>([]);
  const [gradeLevels, setGradeLevels] = useState<OptionItem[]>([]);
  const [classes, setClasses] = useState<OptionItem[]>([]);
  
  const [selectedYearId, setSelectedYearId] = useState('');
  const [scopeType, setScopeType] = useState<'ALL' | 'GRADE' | 'CLASS'>('ALL');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [supervisorActive, setSupervisorActive] = useState(true);
  const [canRecordIncident, setCanRecordIncident] = useState(true);
  const [canApproveRedStar, setCanApproveRedStar] = useState(false);
  const [loadingAssignment, setLoadingAssignment] = useState(false);

  const isSelf = currentUserProfile?.id === userProfile.id;
  const isEligibleForSupervisor = roles.includes('TEACHER') || roles.includes('STAFF');

  useEffect(() => {
    if (isOpen && userProfile) {
      setFullName(userProfile.full_name || '');
      setRoles(userProfile.roles || []);
      setIsActive(userProfile.is_active ?? true);
      setError(null);
      setIsResetPasswordOpen(false);

      loadInitialMetadataAndAssignment();
    }
  }, [isOpen, userProfile]);

  const loadInitialMetadataAndAssignment = async () => {
    setLoadingAssignment(true);
    try {
      // 1. Load academic years, grade levels, classes
      const [yearsRes, gradesRes, classesRes] = await Promise.all([
        supabase.from('academic_years').select('id, name').order('start_date', { ascending: false }),
        supabase.from('grade_levels').select('id, name').order('level_order', { ascending: true }),
        supabase.from('classes').select('id, name, academic_year_id, grade_level_id').eq('is_active', true).order('name')
      ]);

      const years = yearsRes.data || [];
      const grades = gradesRes.data || [];
      const rawClasses = classesRes.data || [];
      const sortedClasses = sortClassesNaturally<OptionItem>(rawClasses as OptionItem[]);

      setAcademicYears(years);
      setGradeLevels(grades);
      setClasses(sortedClasses);

      // Determine default year
      const { data: currYear } = await supabase.from('academic_years').select('id').eq('is_current', true).single();
      const defaultYearId = currYear?.id || (years[0]?.id || '');
      setSelectedYearId(defaultYearId);

      // 2. Load existing Supervisor assignment for this user
      const { data: assignments } = await supabase
        .from('competition_actor_assignments')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('assignment_type', 'SUPERVISOR')
        .order('created_at', { ascending: false });

      if (assignments && assignments.length > 0) {
        const assignment = assignments[0];
        setHasSupervisorTask(true);
        setExistingAssignmentId(assignment.id);
        setSelectedYearId(assignment.academic_year_id || defaultYearId);

        if (assignment.assigned_class_id) {
          setScopeType('CLASS');
          setSelectedClassId(assignment.assigned_class_id);
        } else if (assignment.assigned_grade_level_id) {
          setScopeType('GRADE');
          setSelectedGradeId(assignment.assigned_grade_level_id);
        } else {
          setScopeType('ALL');
        }

        setStartDate(assignment.start_date || new Date().toISOString().split('T')[0]);
        setEndDate(assignment.end_date || '');
        setSupervisorActive(assignment.is_active ?? true);
        setCanRecordIncident(assignment.can_record_incident ?? true);
        setCanApproveRedStar(assignment.can_approve_red_star ?? false);
      } else {
        setHasSupervisorTask(false);
        setExistingAssignmentId(null);
        setScopeType('ALL');
        setSelectedGradeId('');
        setSelectedClassId('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setSupervisorActive(true);
        setCanRecordIncident(true);
        setCanApproveRedStar(false);
      }
    } catch (err) {
      console.error("Lỗi tải thông tin nhiệm vụ Giám thị:", err);
    } finally {
      setLoadingAssignment(false);
    }
  };

  const filteredClasses = classes.filter(c => !selectedYearId || c.academic_year_id === selectedYearId);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Họ và tên không được để trống.');
      return;
    }

    if (hasSupervisorTask && isEligibleForSupervisor) {
      if (!selectedYearId) {
        setError('Vui lòng chọn Năm học áp dụng cho Giám thị.');
        return;
      }
      if (scopeType === 'GRADE' && !selectedGradeId) {
        setError('Vui lòng chọn Khối lớp cho Giám thị.');
        return;
      }
      if (scopeType === 'CLASS' && !selectedClassId) {
        setError('Vui lòng chọn Lớp học cho Giám thị.');
        return;
      }
      if (!startDate) {
        setError('Vui lòng chọn Ngày bắt đầu nhiệm vụ Giám thị.');
        return;
      }
      if (endDate && new Date(endDate) < new Date(startDate)) {
        setError('Ngày kết thúc phải diễn ra sau hoặc bằng ngày bắt đầu.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Save system user profile & roles
      await onSave(userProfile.id, {
        full_name: fullName.trim(),
        roles,
        is_active: isActive,
      });

      // 2. Manage Supervisor task assignment
      if (isEligibleForSupervisor) {
        if (hasSupervisorTask) {
          const payload = {
            user_id: userProfile.id,
            assignment_type: 'SUPERVISOR' as const,
            academic_year_id: selectedYearId,
            assigned_class_id: scopeType === 'CLASS' ? selectedClassId : null,
            assigned_grade_level_id: scopeType === 'GRADE' ? selectedGradeId : null,
            start_date: startDate,
            end_date: endDate || null,
            is_active: supervisorActive,
            can_record_incident: canRecordIncident,
            can_approve_red_star: canApproveRedStar
          };

          if (existingAssignmentId) {
            await competitionService.updateActorAssignment(existingAssignmentId, payload);
          } else {
            await competitionService.createActorAssignment(payload);
          }
        } else if (existingAssignmentId) {
          // Deactivate instead of hard deleting (preserve history per requirement 7)
          await competitionService.updateActorAssignment(existingAssignmentId, {
            is_active: false
          });
        }
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể cập nhật người dùng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
        <div 
          className="relative w-full max-w-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center space-x-2.5">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cập nhật thông tin thành viên
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Phân định rõ Vai trò hệ thống & Nhiệm vụ Thi đua
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
            {error && (
              <div className="flex gap-2.5 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl text-xs text-red-700 dark:text-red-400 leading-relaxed font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isSelf && (
              <div className="flex gap-2.5 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Bạn đang tự chỉnh sửa tài khoản của chính mình.</p>
                  <p className="mt-0.5 text-[11px] opacity-90">Để bảo mật và tránh vô ý khóa tài khoản, chức năng thay đổi Vai trò và Trạng thái hoạt động của chính bạn tạm thời bị khóa.</p>
                </div>
              </div>
            )}

            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-slate-400" />
                    Email đăng nhập
                  </span>
                  <span className="text-[10px] font-normal text-slate-400 lowercase">(Chỉ đọc)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={userProfile.email || 'Không thể tải email'}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium cursor-not-allowed outline-none"
                  />
                  {onResetPassword && (
                    <button
                      type="button"
                      onClick={() => setIsResetPasswordOpen(true)}
                      className="shrink-0 px-2.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/80 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                      title="Đặt lại mật khẩu"
                    >
                      <KeyRound className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span>Mật khẩu</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" />
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium"
                />
              </div>
            </div>

            {/* SECTION 1: VAI TRÒ HỆ THỐNG */}
            <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    1. Vai trò hệ thống
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">System Roles</span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Chọn Vai trò hệ thống (Có thể chọn nhiều)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_ROLES.map((r) => {
                    const checked = roles.includes(r.code);
                    return (
                      <label 
                        key={r.code} 
                        className={`flex items-center space-x-2.5 p-2 rounded-xl text-xs font-semibold cursor-pointer border select-none transition-all ${
                          checked 
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-400' 
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isSelf && r.code === 'SUPER_ADMIN'}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRoles(prev => [...prev, r.code]);
                            } else {
                              setRoles(prev => prev.filter(code => code !== r.code));
                            }
                          }}
                          className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 disabled:opacity-50 cursor-pointer"
                        />
                        <span>{r.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                  Trạng thái hoạt động tài khoản
                </label>
                <select
                  value={isActive ? 'true' : 'false'}
                  onChange={(e) => setIsActive(e.target.value === 'true')}
                  disabled={isSelf}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white disabled:opacity-50 font-medium"
                >
                  <option value="true">Đang hoạt động</option>
                  <option value="false">Tạm khóa tài khoản</option>
                </select>
              </div>
            </div>

            {/* SECTION 2: NHIỆM VỤ THI ĐỦA */}
            <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/50 dark:border-emerald-900/40 pb-2.5">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    2. Nhiệm vụ Thi đua
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Competition Actor Tasks</span>
              </div>

              {!isEligibleForSupervisor ? (
                <div className="p-3 bg-slate-100/80 dark:bg-slate-900/80 rounded-xl text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Cấu hình nhiệm vụ Giám thị chỉ áp dụng cho tài khoản có Vai trò hệ thống là <span className="font-bold text-slate-700 dark:text-slate-300">Giáo viên (TEACHER)</span> hoặc <span className="font-bold text-slate-700 dark:text-slate-300">Nhân viên (STAFF)</span>. (Giám thị vẫn giữ vai trò hệ thống TEACHER/STAFF và được gán nhiệm vụ SUPERVISOR).
                </div>
              ) : loadingAssignment ? (
                <div className="flex items-center justify-center py-4 text-xs text-slate-500 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  <span>Đang tải cấu hình nhiệm vụ thi đua...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Supervisor Task Toggle */}
                  <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-900/40 rounded-xl cursor-pointer">
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={hasSupervisorTask}
                        onChange={(e) => setHasSupervisorTask(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Phân công nhiệm vụ Giám thị (SUPERVISOR)
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Cho phép theo dõi, ghi nhận sự việc thi đua toàn trường, khối hoặc lớp được giao
                        </span>
                      </div>
                    </div>
                  </label>

                  {hasSupervisorTask && (
                    <div className="p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 animate-fade-in">
                      {/* Academic Year */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          Năm học áp dụng <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={selectedYearId}
                          onChange={(e) => setSelectedYearId(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                        >
                          <option value="">-- Chọn năm học --</option>
                          {academicYears.map(y => (
                            <option key={y.id} value={y.id}>{y.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Scope Selection */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          <Layers className="h-3 w-3 text-slate-400" />
                          Phạm vi theo dõi
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setScopeType('ALL')}
                            className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                              scopeType === 'ALL'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Toàn trường
                          </button>
                          <button
                            type="button"
                            onClick={() => setScopeType('GRADE')}
                            className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                              scopeType === 'GRADE'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Theo Khối
                          </button>
                          <button
                            type="button"
                            onClick={() => setScopeType('CLASS')}
                            className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                              scopeType === 'CLASS'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Theo Lớp
                          </button>
                        </div>

                        {scopeType === 'GRADE' && (
                          <select
                            value={selectedGradeId}
                            onChange={(e) => setSelectedGradeId(e.target.value)}
                            className="w-full mt-2 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                          >
                            <option value="">-- Chọn khối lớp --</option>
                            {gradeLevels.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        )}

                        {scopeType === 'CLASS' && (
                          <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="w-full mt-2 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                          >
                            <option value="">-- Chọn lớp học --</option>
                            {filteredClasses.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            Ngày bắt đầu <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Ngày kết thúc (Để trống nếu vô thời hạn)
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                          />
                        </div>
                      </div>

                      {/* Task Status */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                          Trạng thái nhiệm vụ Giám thị
                        </label>
                        <select
                          value={supervisorActive ? 'true' : 'false'}
                          onChange={(e) => setSupervisorActive(e.target.value === 'true')}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                        >
                          <option value="true">Đang hoạt động (Active)</option>
                          <option value="false">Tạm ngưng nhiệm vụ (Inactive)</option>
                        </select>
                      </div>

                      {/* Permissions */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                          Quyền hạn nhiệm vụ Giám thị
                        </span>

                        <label className="flex items-center space-x-2.5 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={canRecordIncident}
                            onChange={(e) => setCanRecordIncident(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-white block">
                              Quyền ghi nhận sự việc thi đua
                            </span>
                            <span className="text-[11px] text-slate-500">Cho phép tự tạo ghi nhận cá nhân / tập thể trong phạm vi được giao</span>
                          </div>
                        </label>

                        <label className="flex items-center space-x-2.5 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={canApproveRedStar}
                            onChange={(e) => setCanApproveRedStar(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-white block">
                              Tùy chọn quyền duyệt ghi nhận của Sao đỏ
                            </span>
                            <span className="text-[11px] text-slate-500">Cấp quyền riêng cho Giám thị được duyệt các sự việc do học sinh Sao đỏ thuộc phạm vi ghi nhận</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-900">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 min-w-[90px] cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Lưu thay đổi</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Reset Password Modal */}
      {onResetPassword && (
        <ResetPasswordModal
          userProfile={userProfile}
          isOpen={isResetPasswordOpen}
          onClose={() => setIsResetPasswordOpen(false)}
          onResetPassword={onResetPassword}
        />
      )}
    </>
  );
};
