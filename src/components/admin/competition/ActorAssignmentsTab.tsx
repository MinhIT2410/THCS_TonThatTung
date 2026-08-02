/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { sortClassesNaturally } from '../../../utils/classSortUtils';
import { competitionService } from '../../../services/competitionService';
import {
  CompetitionActorAssignment,
  CompetitionAssignmentType,
  COMPETITION_ASSIGNMENT_TYPE_LABELS,
} from '../../../types/competition';
import {
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  UserCheck,
  Building2,
  GraduationCap,
  Calendar,
} from 'lucide-react';

interface UserOption {
  id: string;
  full_name: string;
  student_code?: string;
}

interface DropdownItem {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  academic_year_id: string;
  grade_level_id?: string;
}

interface CandidateUser {
  id: string;
  full_name: string;
  student_code?: string | null;
  current_class_id?: string | null;
  current_class_name?: string | null;
}

export default function ActorAssignmentsTab() {
  const [assignments, setAssignments] = useState<CompetitionActorAssignment[]>([]);
  const [academicYears, setAcademicYears] = useState<DropdownItem[]>([]);
  const [gradeLevels, setGradeLevels] = useState<DropdownItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [assignmentType, setAssignmentType] = useState<CompetitionAssignmentType>('SUPERVISOR');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [scopeType, setScopeType] = useState<'ALL' | 'GRADE' | 'CLASS'>('ALL');
  const [selectedGradeLevelId, setSelectedGradeLevelId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  // User candidate search options with RPC pagination
  const [candidateUsers, setCandidateUsers] = useState<CandidateUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidateTotalCount, setCandidateTotalCount] = useState(0);
  const [candidateTotalPages, setCandidateTotalPages] = useState(1);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const classesForSelectedYear = sortClassesNaturally<ClassOption>(classes.filter(
    (c) => c.academic_year_id === selectedAcademicYearId
  ));

  useEffect(() => {
    if (selectedAcademicYearId && classes.length > 0) {
      const validClasses = classes.filter((c) => c.academic_year_id === selectedAcademicYearId);
      if (selectedClassId && !validClasses.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(validClasses[0]?.id || '');
      } else if (!selectedClassId && validClasses.length > 0) {
        setSelectedClassId(validClasses[0].id);
      }
    }
  }, [selectedAcademicYearId, classes]);

  useEffect(() => {
    if (!isModalOpen) return;
    const timer = setTimeout(() => {
      fetchCandidateUsers(
        assignmentType,
        userSearchTerm,
        selectedAcademicYearId,
        scopeType === 'CLASS' ? selectedClassId : null,
        candidatePage
      );
    }, 350);

    return () => clearTimeout(timer);
  }, [
    assignmentType,
    userSearchTerm,
    selectedAcademicYearId,
    scopeType,
    selectedClassId,
    candidatePage,
    isModalOpen,
  ]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Academic years
      const { data: yearsData } = await supabase
        .from('academic_years')
        .select('id, name')
        .order('start_date', { ascending: false });

      // Grade levels
      const { data: gradeData } = await supabase
        .from('grade_levels')
        .select('id, name')
        .order('level_order', { ascending: true });

      // Classes
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, academic_year_id, grade_level_id')
        .eq('is_active', true)
        .order('name');

      setAcademicYears(yearsData || []);
      setGradeLevels(gradeData || []);
      setClasses(sortClassesNaturally((classData || []) as ClassOption[]));

      // Current active year ID
      const { data: currentYearData } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .single();

      if (currentYearData) {
        setSelectedAcademicYearId(currentYearData.id);
      } else if (yearsData && yearsData.length > 0) {
        setSelectedAcademicYearId(yearsData[0].id);
      }

      await loadAssignments();
    } catch (err: any) {
      console.error(err);
      setError('Lỗi tải dữ liệu phân công: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const data = await competitionService.getActorAssignments();
      setAssignments(data as any[]);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tải danh sách phân công: ' + (err.message || err));
    }
  };

  const fetchCandidateUsers = async (
    type: CompetitionAssignmentType,
    search: string,
    yearId: string,
    classId: string | null,
    page: number
  ) => {
    setUserSearchLoading(true);
    try {
      const results = await competitionService.searchAssignmentCandidates({
        assignment_type: type,
        search: search.trim() || undefined,
        academic_year_id: yearId || undefined,
        class_id: classId || undefined,
        page: page,
        page_size: 30,
      });

      const mapped: CandidateUser[] = results.map((d) => ({
        id: d.id,
        full_name: d.full_name,
        student_code: d.student_code,
        current_class_id: d.current_class_id,
        current_class_name: d.current_class_name,
      }));

      const total = results.length > 0 ? Number(results[0].total_count) : 0;
      setCandidateUsers(mapped);
      setCandidateTotalCount(total);
      setCandidateTotalPages(Math.max(1, Math.ceil(total / 30)));

      if (mapped.length > 0) {
        if (!selectedUserId || !mapped.some((u) => u.id === selectedUserId)) {
          setSelectedUserId(mapped[0].id);
        }
      } else {
        setSelectedUserId('');
      }
    } catch (err) {
      console.error('Error searching candidate users:', err);
      setCandidateUsers([]);
      setCandidateTotalCount(0);
      setCandidateTotalPages(1);
      setSelectedUserId('');
    } finally {
      setUserSearchLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setAssignmentType('SUPERVISOR');
    setSelectedUserId('');
    setUserSearchTerm('');
    setCandidatePage(1);
    setScopeType('ALL');
    setSelectedGradeLevelId(gradeLevels[0]?.id || '');
    const validClasses = classes.filter((c) => c.academic_year_id === selectedAcademicYearId);
    setSelectedClassId(validClasses[0]?.id || '');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setModalError('Vui lòng chọn người dùng được phân công.');
      return;
    }
    if (!selectedAcademicYearId) {
      setModalError('Vui lòng chọn năm học.');
      return;
    }

    if (scopeType === 'CLASS') {
      if (!selectedClassId) {
        setModalError('Vui lòng chọn lớp phụ trách.');
        return;
      }
      const validClass = classesForSelectedYear.find((c) => c.id === selectedClassId);
      if (!validClass) {
        setModalError('Lớp được chọn không thuộc năm học đã chọn.');
        return;
      }
    }

    setModalLoading(true);
    setModalError(null);

    try {
      await competitionService.createActorAssignment({
        user_id: selectedUserId,
        assignment_type: assignmentType,
        academic_year_id: selectedAcademicYearId,
        assigned_class_id: scopeType === 'CLASS' ? selectedClassId : null,
        assigned_grade_level_id: scopeType === 'GRADE' ? selectedGradeLevelId : null,
        start_date: startDate,
        end_date: endDate || null,
      });

      setSuccess('Thêm phân công nhiệm vụ thành công!');
      setIsModalOpen(false);
      await loadAssignments();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setModalError('Lỗi thêm phân công: ' + (err.message || err));
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleActive = async (assignment: CompetitionActorAssignment) => {
    try {
      await competitionService.updateActorAssignment(assignment.id, {
        is_active: !assignment.is_active,
      });
      await loadAssignments();
    } catch (err: any) {
      alert('Không thể thay đổi trạng thái: ' + (err.message || err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phân công này?')) return;
    try {
      await competitionService.deleteActorAssignment(id);
      setSuccess('Đã xóa phân công.');
      await loadAssignments();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      alert('Không thể xóa phân công: ' + (err.message || err));
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    if (filterType !== 'ALL' && a.assignment_type !== filterType) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = a.user?.full_name?.toLowerCase() || '';
    const className = a.class?.name?.toLowerCase() || '';
    const gradeName = a.grade_level?.name?.toLowerCase() || '';
    return name.includes(term) || className.includes(term) || gradeName.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Messages */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, lớp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 w-48 sm:w-64"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2 py-1 text-xs font-semibold bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">Tất cả nhiệm vụ</option>
              <option value="SUPERVISOR">Giám thị</option>
              <option value="LIEN_DOI_COMMAND">Ban Chỉ huy Liên đội</option>
              <option value="RED_STAR">Sao đỏ</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm phân công nhiệm vụ</span>
        </button>
      </div>

      {/* List Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            Chưa có phân công nhiệm vụ thi đua nào.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Người thực hiện</th>
                  <th className="py-3.5 px-4">Nhiệm vụ</th>
                  <th className="py-3.5 px-4">Phạm vi</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {filteredAssignments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.user?.full_name || 'Đội viên / Giáo viên'}
                      </div>
                      {item.user?.student_code && (
                        <div className="text-[11px] text-slate-400">Mã: {item.user.student_code}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          item.assignment_type === 'SUPERVISOR'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : item.assignment_type === 'LIEN_DOI_COMMAND'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {COMPETITION_ASSIGNMENT_TYPE_LABELS[item.assignment_type]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.class?.name ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          Lớp {item.class.name}
                        </span>
                      ) : item.grade_level?.name ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                          Khối {item.grade_level.name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-semibold">
                          Toàn trường
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      <div>Từ: {item.start_date}</div>
                      {item.end_date ? <div>Đến: {item.end_date}</div> : <div>Không thời hạn</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                          item.is_active
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.is_active ? 'Đang hiệu lực' : 'Đã tạm dừng'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                        title="Xóa phân công"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Phân công nhiệm vụ Thi đua
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
              {/* Task Type */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Loại nhiệm vụ thi đua
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SUPERVISOR', 'LIEN_DOI_COMMAND', 'RED_STAR'] as CompetitionAssignmentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setAssignmentType(type);
                        setSelectedUserId('');
                      }}
                      className={`p-2.5 rounded-xl border font-bold text-center transition-all ${
                        assignmentType === type
                          ? 'border-red-600 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {COMPETITION_ASSIGNMENT_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* User Selector */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Người được giao nhiệm vụ ({assignmentType === 'SUPERVISOR' ? 'Giáo viên' : 'Học sinh'})
                  {candidateTotalCount > 0 && (
                    <span className="font-normal text-slate-400 ml-2">({candidateTotalCount} ứng viên)</span>
                  )}
                </label>

                {/* Filter Search */}
                <input
                  type="text"
                  placeholder={assignmentType === 'SUPERVISOR' ? "Tìm tên giáo viên..." : "Tìm tên hoặc mã học sinh..."}
                  value={userSearchTerm}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value);
                    setCandidatePage(1);
                  }}
                  className="w-full px-3 py-1.5 mb-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />

                {userSearchLoading ? (
                  <div className="p-3 text-center text-slate-400">Đang tìm ứng viên...</div>
                ) : candidateUsers.length === 0 ? (
                  <div className="p-3 text-center text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                    Không tìm thấy {assignmentType === 'SUPERVISOR' ? 'giáo viên' : 'học sinh'} phù hợp.
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      {candidateUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} {u.student_code ? `(Mã: ${u.student_code})` : ''} {u.current_class_name ? `- Lớp ${u.current_class_name}` : ''}
                        </option>
                      ))}
                    </select>

                    {candidateTotalPages > 1 && (
                      <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                        <button
                          type="button"
                          disabled={candidatePage <= 1}
                          onClick={() => setCandidatePage((p) => Math.max(1, p - 1))}
                          className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Trang trước
                        </button>
                        <span>
                          Trang {candidatePage} / {candidateTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={candidatePage >= candidateTotalPages}
                          onClick={() => setCandidatePage((p) => Math.min(candidateTotalPages, p + 1))}
                          className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Trang sau
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phạm vi phụ trách
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setScopeType('ALL')}
                    className={`py-2 rounded-xl border font-bold text-center ${
                      scopeType === 'ALL'
                        ? 'border-red-600 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Toàn trường
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeType('GRADE')}
                    className={`py-2 rounded-xl border font-bold text-center ${
                      scopeType === 'GRADE'
                        ? 'border-red-600 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Theo Khối
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeType('CLASS')}
                    className={`py-2 rounded-xl border font-bold text-center ${
                      scopeType === 'CLASS'
                        ? 'border-red-600 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Theo Lớp
                  </button>
                </div>

                {scopeType === 'GRADE' && (
                  <select
                    value={selectedGradeLevelId}
                    onChange={(e) => setSelectedGradeLevelId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    {gradeLevels.map((g) => (
                      <option key={g.id} value={g.id}>
                        Khối {g.name}
                      </option>
                    ))}
                  </select>
                )}

                {scopeType === 'CLASS' && (
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    {classesForSelectedYear.length === 0 ? (
                      <option value="">-- Không có lớp thuộc năm học đã chọn --</option>
                    ) : (
                      classesForSelectedYear.map((c) => (
                        <option key={c.id} value={c.id}>
                          Lớp {c.name}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Dates & Academic Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Năm học
                  </label>
                  <select
                    value={selectedAcademicYearId}
                    onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ngày kết thúc (Không bắt buộc)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Submit buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20 flex items-center gap-2"
                >
                  {modalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Xác nhận phân công</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
