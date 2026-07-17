/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Shield, Plus, Trash2, CheckCircle2, Loader2, AlertCircle, Search, Filter } from 'lucide-react';

interface HomeroomAssignment {
  id: string;
  class_id: string;
  teacher_id: string;
  academic_year_id: string;
  is_active: boolean;
  notes: string | null;
  classes?: { name: string } | null;
  profiles?: { full_name: string } | null;
  academic_years?: { name: string } | null;
}

interface DropdownItem {
  id: string;
  name: string;
}

export default function HomeroomTeachersTab() {
  const [assignments, setAssignments] = useState<HomeroomAssignment[]>([]);
  const [classes, setClasses] = useState<DropdownItem[]>([]);
  const [teachers, setTeachers] = useState<DropdownItem[]>([]);
  const [years, setYears] = useState<DropdownItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('all');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    class_id: '',
    teacher_id: '',
    academic_year_id: '',
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
      // Dropdown items
      const { data: classData } = await supabase.from('classes').select('id, name').eq('is_active', true);
      const { data: teacherData } = await supabase.from('profiles').select('id, name:full_name').order('full_name');
      const { data: yearData } = await supabase.from('academic_years').select('id, name').eq('is_active', true);

      setClasses(classData || []);
      setTeachers(teacherData || []);
      setYears(yearData || []);

      // Fetch active assignments
      const { data: assignData, error: assignError } = await supabase
        .from('homeroom_assignments')
        .select(`
          *,
          classes:class_id(name),
          profiles:teacher_id(full_name),
          academic_years:academic_year_id(name)
        `)
        .order('is_active', { ascending: false });

      if (assignError) throw assignError;
      setAssignments(assignData || []);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi tải danh sách giáo viên chủ nhiệm: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      class_id: classes[0]?.id || '',
      teacher_id: teachers[0]?.id || '',
      academic_year_id: years[0]?.id || '',
      notes: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.class_id || !formData.teacher_id || !formData.academic_year_id) {
      setModalError('Vui lòng chọn đầy đủ các trường bắt buộc.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      // Call transaction-safe RPC that ensures no multi-homeroom for same class, and no multi-class for same teacher
      const { data, error: rpcError } = await supabase.rpc('assign_homeroom_teacher', {
        p_class_id: formData.class_id,
        p_teacher_id: formData.teacher_id,
        p_academic_year_id: formData.academic_year_id,
        p_notes: formData.notes.trim() || null,
      });

      if (rpcError) throw rpcError;

      if (data && data.success === false) {
        setModalError(data.message || 'Không thể phân công chủ nhiệm do xung đột dữ liệu.');
      } else {
        setSuccess('Phân công giáo viên chủ nhiệm thành công!');
        setIsModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Lỗi hệ thống khi phân công chủ nhiệm.');
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
      // Safe delete through RPC, or delete record directly
      const { error: deleteError } = await supabase
        .from('homeroom_assignments')
        .delete()
        .eq('id', deletingId);

      if (deleteError) throw deleteError;

      setSuccess('Đã hủy phân công giáo viên chủ nhiệm thành công!');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi hệ thống khi hủy phân công.');
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
      setDeletingName(null);
    }
  };

  const filteredAssignments = assignments.filter(as => {
    const teacherName = as.profiles?.full_name || '';
    const className = as.classes?.name || '';
    const matchesSearch = 
      teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      className.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = selectedYearFilter === 'all' || as.academic_year_id === selectedYearFilter;
    
    return matchesSearch && matchesYear;
  });

  return (
    <div className="space-y-6" id="homeroom-teachers-tab">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-slate-500" />
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-white">Giáo viên chủ nhiệm</h2>
        </div>
        <button
          onClick={handleOpenAddModal}
          disabled={classes.length === 0 || teachers.length === 0 || years.length === 0}
          className="flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Phân công chủ nhiệm</span>
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

      {/* Filter Options */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên giáo viên hoặc lớp học..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedYearFilter}
            onChange={e => setSelectedYearFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="all">Tất cả Năm học</option>
            {years.map(y => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Data */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="text-xs text-slate-500 font-medium">Đang tải phân công chủ nhiệm...</p>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500">Không có giáo viên chủ nhiệm nào được gán.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 font-bold text-slate-500">Lớp học</th>
                <th className="p-4 font-bold text-slate-500">Giáo viên chủ nhiệm</th>
                <th className="p-4 font-bold text-slate-500">Năm học</th>
                <th className="p-4 font-bold text-slate-500">Ghi chú</th>
                <th className="p-4 font-bold text-slate-500 text-center">Trạng thái</th>
                <th className="p-4 font-bold text-slate-500 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssignments.map(as => (
                <tr key={as.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{as.classes?.name || 'Lớp đã xóa'}</td>
                  <td className="p-4 font-semibold text-blue-600">{as.profiles?.full_name || 'Không rõ'}</td>
                  <td className="p-4 text-slate-500">{as.academic_years?.name || 'Không rõ'}</td>
                  <td className="p-4 text-slate-500 italic max-w-xs truncate">{as.notes || '-'}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      as.is_active 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                      {as.is_active ? 'Đang phụ trách' : 'Hoàn thành'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleConfirmDelete(as.id, `${as.profiles?.full_name} - ${as.classes?.name}`)}
                      className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      title="Hủy phân công chủ nhiệm"
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
              Phân công giáo viên chủ nhiệm mới
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Mỗi giáo viên chỉ chủ nhiệm tối đa một lớp học trong cùng một năm học, và lớp học chỉ có một giáo viên chủ nhiệm hoạt động.
            </p>

            {modalError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50/50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="text-xs font-semibold">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
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

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Giáo viên chủ nhiệm *</label>
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
                <label className="font-bold text-slate-500">Ghi chú quyết định</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ví dụ: Phân công theo quyết định số..."
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
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Xác nhận hủy phân công</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn hủy phân công giáo viên chủ nhiệm cho <span className="font-semibold text-slate-800 dark:text-white">"{deletingName}"</span>? 
              Hành động này sẽ giải phóng trạng thái chủ nhiệm hiện tại của giáo viên và lớp học này.
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
                <span>Hủy phân công</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
