/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { BookOpen, Plus, Edit2, Trash2, CheckCircle2, Loader2, AlertCircle, Search, Settings } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
  department_id: string | null;
  description: string | null;
  is_active: boolean;
  notes: string | null;
  departments?: { name: string } | null;
}

interface GradeLevel {
  id: string;
  name: string;
}

interface SubjectGradeLevel {
  grade_level_id: string;
  periods_per_week: number;
}

interface Department {
  id: string;
  name: string;
}

export default function SubjectsTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department_id: '',
    description: '',
    is_active: true,
    notes: '',
  });

  // Subject-grade-levels management state
  const [selectedSubjectForGrades, setSelectedSubjectForGrades] = useState<Subject | null>(null);
  const [subjectGrades, setSubjectGrades] = useState<SubjectGradeLevel[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [isGradesModalOpen, setIsGradesModalOpen] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch departments
      const { data: deptData } = await supabase.from('departments').select('id, name').eq('is_active', true);
      setDepartments(deptData || []);

      // Fetch grade levels
      const { data: gradesData } = await supabase.from('grade_levels').select('id, name').eq('is_active', true);
      setGradeLevels(gradesData || []);

      // Fetch subjects
      const { data: subjectsData, error: subError } = await supabase
        .from('subjects')
        .select(`
          *,
          departments:department_id(name)
        `)
        .order('name', { ascending: true });

      if (subError) throw subError;
      setSubjects(subjectsData || []);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi tải dữ liệu môn học: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      department_id: departments[0]?.id || '',
      description: '',
      is_active: true,
      notes: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setFormData({
      name: sub.name,
      code: sub.code,
      department_id: sub.department_id || '',
      description: sub.description || '',
      is_active: sub.is_active,
      notes: sub.notes || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setModalError('Tên môn học và mã môn học là bắt buộc.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        department_id: formData.department_id || null,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
        notes: formData.notes.trim() || null,
      };

      if (editingSubject) {
        const { error: updateError } = await supabase
          .from('subjects')
          .update(payload)
          .eq('id', editingSubject.id);

        if (updateError) throw updateError;
        setSuccess('Cập nhật môn học thành công!');
      } else {
        const { error: insertError } = await supabase
          .from('subjects')
          .insert([payload]);

        if (insertError) throw insertError;
        setSuccess('Thêm môn học mới thành công!');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Lỗi lưu môn học.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenGradesModal = async (sub: Subject) => {
    setSelectedSubjectForGrades(sub);
    setGradesLoading(true);
    setIsGradesModalOpen(true);

    try {
      const { data, error: fetchErr } = await supabase
        .from('subject_grade_levels')
        .select('grade_level_id, periods_per_week')
        .eq('subject_id', sub.id);

      if (fetchErr) throw fetchErr;

      // Map to full grade levels list
      const mapped = gradeLevels.map(gl => {
        const match = data?.find(d => d.grade_level_id === gl.id);
        return {
          grade_level_id: gl.id,
          periods_per_week: match ? match.periods_per_week : 0,
        };
      });

      setSubjectGrades(mapped);
    } catch (err) {
      console.error('Error fetching subject grade levels:', err);
    } finally {
      setGradesLoading(false);
    }
  };

  const handleSaveGrades = async () => {
    if (!selectedSubjectForGrades) return;
    setGradesLoading(true);

    try {
      // First, delete old configurations for this subject
      await supabase
        .from('subject_grade_levels')
        .delete()
        .eq('subject_id', selectedSubjectForGrades.id);

      // Filter configured grade levels (periods > 0)
      const toInsert = subjectGrades
        .filter(sg => sg.periods_per_week > 0)
        .map(sg => ({
          subject_id: selectedSubjectForGrades.id,
          grade_level_id: sg.grade_level_id,
          periods_per_week: sg.periods_per_week,
        }));

      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase
          .from('subject_grade_levels')
          .insert(toInsert);

        if (insertErr) throw insertErr;
      }

      setSuccess(`Cấu hình số tiết dạy môn "${selectedSubjectForGrades.name}" thành công!`);
      setIsGradesModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi cấu hình số tiết học: ' + (err.message || err));
    } finally {
      setGradesLoading(false);
    }
  };

  const handleConfirmDelete = (id: string, name: string) => {
    setDeletingId(id);
    setDeletingName(name);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('safe_delete_school_entity', {
        p_entity_type: 'subject',
        p_entity_id: deletingId,
      });

      if (rpcError) throw rpcError;

      if (data && data.success === false) {
        setError(data.message || 'Không thể xóa thực thể.');
      } else {
        setSuccess('Xóa môn học thành công!');
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi hệ thống khi xóa.');
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
      setDeletingName(null);
    }
  };

  const filteredSubjects = subjects.filter(
    sub =>
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" id="subjects-tab">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5 text-slate-500" />
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-white">Môn học</h2>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm môn học</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50/50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-xl">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold">{success}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm môn học theo tên hoặc mã môn..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Table Data */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách môn học...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500">Không tìm thấy môn học nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 font-bold text-slate-500">Mã môn</th>
                <th className="p-4 font-bold text-slate-500">Tên môn học</th>
                <th className="p-4 font-bold text-slate-500">Tổ bộ môn quản lý</th>
                <th className="p-4 font-bold text-slate-500">Mô tả</th>
                <th className="p-4 font-bold text-slate-500 text-center">Định mức tiết</th>
                <th className="p-4 font-bold text-slate-500 text-center">Trạng thái</th>
                <th className="p-4 font-bold text-slate-500 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubjects.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-400">{sub.code}</td>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{sub.name}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{sub.departments?.name || <span className="italic text-slate-400">Chưa thuộc tổ</span>}</td>
                  <td className="p-4 text-slate-500 max-w-xs truncate">{sub.description || '-'}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleOpenGradesModal(sub)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/40 text-blue-600 border border-slate-200 dark:border-slate-800 transition-colors"
                    >
                      <Settings className="h-3 w-3" />
                      <span className="font-bold text-[10px]">Cấu hình</span>
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sub.is_active 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                      {sub.is_active ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEditModal(sub)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      title="Sửa"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(sub.id, sub.name)}
                      className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              {editingSubject ? 'Sửa môn học' : 'Thêm môn học mới'}
            </h3>

            {modalError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50/50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="text-xs font-semibold">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Mã môn học *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ví dụ: TOAN"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 uppercase"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Tên môn học *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Toán học"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Tổ chuyên môn quản lý</label>
                <select
                  value={formData.department_id}
                  onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">Không có tổ</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Mô tả chi tiết</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả tóm tắt..."
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="sub-is-active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="sub-is-active" className="font-semibold text-slate-700 dark:text-slate-300">
                  Trạng thái hoạt động (Kích hoạt dạy)
                </label>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white min-h-[60px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center space-x-1.5 px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  {modalLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Lưu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade levels / periods configuration Modal */}
      {isGradesModalOpen && selectedSubjectForGrades && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Cấu hình số tiết dạy môn: {selectedSubjectForGrades.name}
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Nhập số tiết học định mức mỗi tuần cho từng khối lớp. Đặt về 0 (hoặc bỏ trống) nếu khối lớp không học môn này.
            </p>

            {gradesLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : (
              <div className="space-y-3 py-2 max-h-[300px] overflow-y-auto">
                {gradeLevels.map((gl, idx) => {
                  const targetConfig = subjectGrades.find(sg => sg.grade_level_id === gl.id);
                  return (
                    <div key={gl.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{gl.name}</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={targetConfig ? (targetConfig.periods_per_week || '') : ''}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            const updated = [...subjectGrades];
                            const idx = updated.findIndex(u => u.grade_level_id === gl.id);
                            if (idx >= 0) {
                              updated[idx].periods_per_week = val;
                            } else {
                              updated.push({ grade_level_id: gl.id, periods_per_week: val });
                            }
                            setSubjectGrades(updated);
                          }}
                          placeholder="0"
                          min="0"
                          className="w-16 px-2.5 py-1 text-center border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none"
                        />
                        <span className="text-[11px] text-slate-400 font-bold">tiết/tuần</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsGradesModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveGrades}
                disabled={gradesLoading}
                className="flex items-center space-x-1 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                {gradesLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Lưu cấu hình</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Xác nhận xóa môn học</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa môn học <span className="font-semibold text-slate-800 dark:text-white">"{deletingName}"</span>? 
              Hệ thống sẽ không cho phép xóa nếu môn học này đang có phân công giảng dạy cho giáo viên.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={deleteLoading}
                onClick={() => { setDeletingId(null); setDeletingName(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl"
              >
                Hủy
              </button>
              <button
                disabled={deleteLoading}
                onClick={handleDelete}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm"
              >
                {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
