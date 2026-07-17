/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Calendar, Plus, Edit2, Trash2, CheckCircle2, Loader2, AlertCircle, Search, Filter } from 'lucide-react';

interface TeacherAssignment {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  academic_year_id: string;
  academic_term_id: string;
  lessons_per_week: number | null;
  is_active: boolean;
  notes: string | null;
  classes?: { name: string } | null;
  subjects?: { name: string } | null;
  profiles?: { full_name: string } | null;
  academic_years?: { name: string } | null;
  academic_terms?: { name: string } | null;
}

interface DropdownItem {
  id: string;
  name: string;
}

export default function TeacherAssignmentsTab() {
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [classes, setClasses] = useState<DropdownItem[]>([]);
  const [subjects, setSubjects] = useState<DropdownItem[]>([]);
  const [teachers, setTeachers] = useState<DropdownItem[]>([]);
  const [years, setYears] = useState<DropdownItem[]>([]);
  const [terms, setTerms] = useState<DropdownItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('all');
  const [selectedTermFilter, setSelectedTermFilter] = useState('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState('all');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<TeacherAssignment | null>(null);
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    teacher_id: '',
    academic_year_id: '',
    academic_term_id: '',
    lessons_per_week: '2',
    is_active: true,
    notes: '',
  });

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
      // Fetch dropdowns
      const { data: clsData } = await supabase.from('classes').select('id, name').eq('is_active', true);
      const { data: subData } = await supabase.from('subjects').select('id, name').eq('is_active', true);
      const { data: tchrData } = await supabase.from('profiles').select('id, name:full_name').order('full_name');
      const { data: yrData } = await supabase.from('academic_years').select('id, name').eq('is_active', true);
      const { data: trmData } = await supabase.from('academic_terms').select('id, name').eq('is_active', true);

      setClasses(clsData || []);
      setSubjects(subData || []);
      setTeachers(tchrData || []);
      setYears(yrData || []);
      setTerms(trmData || []);

      // Fetch teacher assignments
      const { data: assignmentsData, error: fetchError } = await supabase
        .from('teacher_assignments')
        .select(`
          *,
          classes:class_id(name),
          subjects:subject_id(name),
          profiles:teacher_id(full_name),
          academic_years:academic_year_id(name),
          academic_terms:academic_term_id(name)
        `)
        .order('is_active', { ascending: false });

      if (fetchError) throw fetchError;
      setAssignments(assignmentsData || []);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi tải dữ liệu phân công giảng dạy: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingAssignment(null);
    setFormData({
      class_id: classes[0]?.id || '',
      subject_id: subjects[0]?.id || '',
      teacher_id: teachers[0]?.id || '',
      academic_year_id: years[0]?.id || '',
      academic_term_id: terms[0]?.id || '',
      lessons_per_week: '2',
      is_active: true,
      notes: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (as: TeacherAssignment) => {
    setEditingAssignment(as);
    setFormData({
      class_id: as.class_id,
      subject_id: as.subject_id,
      teacher_id: as.teacher_id,
      academic_year_id: as.academic_year_id,
      academic_term_id: as.academic_term_id,
      lessons_per_week: as.lessons_per_week !== null ? String(as.lessons_per_week) : '2',
      is_active: as.is_active,
      notes: as.notes || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.class_id || !formData.subject_id || !formData.teacher_id || !formData.academic_year_id || !formData.academic_term_id) {
      setModalError('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const payload = {
        class_id: formData.class_id,
        subject_id: formData.subject_id,
        teacher_id: formData.teacher_id,
        academic_year_id: formData.academic_year_id,
        academic_term_id: formData.academic_term_id,
        lessons_per_week: formData.lessons_per_week ? parseInt(formData.lessons_per_week) : null,
        is_active: formData.is_active,
        notes: formData.notes.trim() || null,
      };

      if (editingAssignment) {
        const { error: updateError } = await supabase
          .from('teacher_assignments')
          .update(payload)
          .eq('id', editingAssignment.id);

        if (updateError) throw updateError;
        setSuccess('Cập nhật phân công giảng dạy thành công!');
      } else {
        const { error: insertError } = await supabase
          .from('teacher_assignments')
          .insert([payload]);

        if (insertError) throw insertError;
        setSuccess('Thêm phân công giảng dạy mới thành công!');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Lỗi lưu thông tin phân công giảng dạy.');
    } finally {
      setModalLoading(false);
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
      const { error: deleteError } = await supabase
        .from('teacher_assignments')
        .delete()
        .eq('id', deletingId);

      if (deleteError) throw deleteError;

      setSuccess('Xóa phân công giảng dạy thành công!');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi hệ thống khi xóa.');
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
      setDeletingName(null);
    }
  };

  const filteredAssignments = assignments.filter(as => {
    const matchesSearch = 
      (as.profiles?.full_name && as.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (as.subjects?.name && as.subjects.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (as.classes?.name && as.classes.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesYear = selectedYearFilter === 'all' || as.academic_year_id === selectedYearFilter;
    const matchesTerm = selectedTermFilter === 'all' || as.academic_term_id === selectedTermFilter;
    const matchesClass = selectedClassFilter === 'all' || as.class_id === selectedClassFilter;

    return matchesSearch && matchesYear && matchesTerm && matchesClass;
  });

  return (
    <div className="space-y-6" id="teacher-assignments-tab">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-slate-500" />
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-white">Phân công giảng dạy</h2>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm phân công</span>
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

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm giáo viên, môn, lớp..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedClassFilter}
            onChange={e => setSelectedClassFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="all">Tất cả lớp học</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedYearFilter}
            onChange={e => setSelectedYearFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="all">Tất cả năm học</option>
            {years.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedTermFilter}
            onChange={e => setSelectedTermFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="all">Tất cả học kỳ</option>
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Data */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="text-xs text-slate-500 font-medium">Đang tải phân công...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500">Không tìm thấy phân công giảng dạy nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 font-bold text-slate-500">Giáo viên giảng dạy</th>
                <th className="p-4 font-bold text-slate-500">Môn học</th>
                <th className="p-4 font-bold text-slate-500">Lớp học</th>
                <th className="p-4 font-bold text-slate-500">Năm học</th>
                <th className="p-4 font-bold text-slate-500">Học kỳ</th>
                <th className="p-4 font-bold text-slate-500 text-center">Số tiết / tuần</th>
                <th className="p-4 font-bold text-slate-500 text-center">Trạng thái</th>
                <th className="p-4 font-bold text-slate-500 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssignments.map(as => (
                <tr key={as.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{as.profiles?.full_name || 'Không rõ'}</td>
                  <td className="p-4 font-bold text-blue-600">{as.subjects?.name || 'Môn học đã xóa'}</td>
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{as.classes?.name || 'Lớp đã xóa'}</td>
                  <td className="p-4 text-slate-500">{as.academic_years?.name || 'Không rõ'}</td>
                  <td className="p-4 text-slate-500 font-medium">{as.academic_terms?.name || 'Không rõ'}</td>
                  <td className="p-4 text-center font-bold text-slate-600 dark:text-slate-400">{as.lessons_per_week ?? '-'} tiết</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      as.is_active 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                      {as.is_active ? 'Đang giảng dạy' : 'Kết thúc'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(as)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      title="Sửa phân công"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(as.id, `${as.profiles?.full_name} dạy môn ${as.subjects?.name} ở lớp ${as.classes?.name}`)}
                      className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      title="Xóa phân công"
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
              {editingAssignment ? 'Sửa phân công giảng dạy' : 'Thêm phân công giảng dạy mới'}
            </h3>

            {modalError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50/50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="text-xs font-semibold">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Giáo viên giảng dạy *</label>
                <select
                  value={formData.teacher_id}
                  onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                >
                  <option value="" disabled>Chọn giáo viên...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Môn học *</label>
                  <select
                    value={formData.subject_id}
                    onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    required
                  >
                    <option value="" disabled>Chọn môn học...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Lớp học *</label>
                  <select
                    value={formData.class_id}
                    onChange={e => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    required
                  >
                    <option value="" disabled>Chọn lớp học...</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Năm học *</label>
                  <select
                    value={formData.academic_year_id}
                    onChange={e => setFormData({ ...formData, academic_year_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    required
                  >
                    <option value="" disabled>Chọn năm học...</option>
                    {years.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Học kỳ *</label>
                  <select
                    value={formData.academic_term_id}
                    onChange={e => setFormData({ ...formData, academic_term_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    required
                  >
                    <option value="" disabled>Chọn học kỳ...</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Số tiết dạy / tuần</label>
                  <input
                    type="number"
                    value={formData.lessons_per_week}
                    onChange={e => setFormData({ ...formData, lessons_per_week: e.target.value })}
                    min="1"
                    placeholder="2"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-5">
                  <input
                    type="checkbox"
                    id="assign-is-active"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="assign-is-active" className="font-semibold text-slate-700 dark:text-slate-300">
                    Đang phụ trách
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú phân công..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white min-h-[60px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center space-x-1.5 px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  {modalLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Lưu phân công</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Xác nhận xóa phân công</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa phân công: <span className="font-semibold text-slate-800 dark:text-white">"{deletingName}"</span>? 
              Hành động này sẽ xóa dữ liệu phân công giảng dạy tương ứng.
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
                <span>Xóa phân công</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
