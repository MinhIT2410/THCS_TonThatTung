/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Calendar, Plus, Edit2, Trash2, CheckCircle2, Star, Loader2, AlertCircle, Search } from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
  notes: string | null;
}

export default function AcademicYearsTab() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_date: '',
    end_date: '',
    is_active: true,
    notes: '',
  });

  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_date', { ascending: false });

      if (fetchError) throw fetchError;
      setYears(data || []);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi tải danh sách năm học: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingYear(null);
    setFormData({
      name: '',
      code: '',
      start_date: '',
      end_date: '',
      is_active: true,
      notes: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      code: year.code || '',
      start_date: year.start_date,
      end_date: year.end_date,
      is_active: year.is_active,
      notes: year.notes || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim() || !formData.start_date || !formData.end_date) {
      setModalError('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setModalError('Ngày bắt đầu phải trước ngày kết thúc.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
        notes: formData.notes.trim() || null,
      };

      if (editingYear) {
        const { error: updateError } = await supabase
          .from('academic_years')
          .update(payload)
          .eq('id', editingYear.id);

        if (updateError) throw updateError;
        setSuccess('Cập nhật năm học thành công!');
      } else {
        const { error: insertError } = await supabase
          .from('academic_years')
          .insert([payload]);

        if (insertError) throw insertError;
        setSuccess('Thêm năm học mới thành công!');
      }

      setIsModalOpen(false);
      fetchYears();
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Lỗi lưu thông tin năm học.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSetCurrent = async (yearId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('set_current_academic_year', {
        target_year_id: yearId,
      });

      if (rpcError) throw rpcError;
      setSuccess('Đã đặt năm học hiện hành thành công!');
      fetchYears();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể thiết lập năm học hiện hành.');
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
        p_entity_type: 'academic_year',
        p_entity_id: deletingId,
      });

      if (rpcError) throw rpcError;

      if (data && data.success === false) {
        setError(data.message || 'Không thể xóa thực thể.');
      } else {
        setSuccess('Xóa năm học thành công!');
        fetchYears();
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

  const filteredYears = years.filter(
    year =>
      year.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (year.code && year.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6" id="academic-years-tab">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-slate-500" />
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-white">Năm học</h2>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm năm học</span>
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
          placeholder="Tìm kiếm theo tên năm học hoặc mã năm..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Table Data */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="text-xs text-slate-500 font-medium">Đang tải năm học...</p>
        </div>
      ) : filteredYears.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500">Không tìm thấy dữ liệu năm học nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 font-bold text-slate-500">Tên năm học</th>
                <th className="p-4 font-bold text-slate-500">Mã</th>
                <th className="p-4 font-bold text-slate-500">Bắt đầu</th>
                <th className="p-4 font-bold text-slate-500">Kết thúc</th>
                <th className="p-4 font-bold text-slate-500 text-center">Hiện hành</th>
                <th className="p-4 font-bold text-slate-500 text-center">Trạng thái</th>
                <th className="p-4 font-bold text-slate-500 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredYears.map(year => (
                <tr key={year.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{year.name}</td>
                  <td className="p-4 text-slate-500 font-mono">{year.code || '-'}</td>
                  <td className="p-4 text-slate-500">{year.start_date}</td>
                  <td className="p-4 text-slate-500">{year.end_date}</td>
                  <td className="p-4 text-center">
                    {year.is_current ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>Hiện hành</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetCurrent(year.id)}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Đặt hiện hành
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      year.is_active 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                      {year.is_active ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(year)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      title="Sửa"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(year.id, year.name)}
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
              {editingYear ? 'Sửa thông tin năm học' : 'Thêm năm học mới'}
            </h3>

            {modalError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50/50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="text-xs font-semibold">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Tên năm học *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Năm học 2026-2027"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Mã năm học *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ví dụ: NH26-27"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Ngày kết thúc *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="year-is-active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="year-is-active" className="font-semibold text-slate-700 dark:text-slate-300">
                  Trạng thái hoạt động
                </label>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[60px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center space-x-1.5 px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors shadow-sm"
                >
                  {modalLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Lưu</span>
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
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Xác nhận xóa</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa năm học <span className="font-semibold text-slate-800 dark:text-white">"{deletingName}"</span>? 
              Hệ thống sẽ không cho phép xóa nếu năm học đang chứa lớp hoặc dữ liệu liên kết khác.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={deleteLoading}
                onClick={() => { setDeletingId(null); setDeletingName(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                disabled={deleteLoading}
                onClick={handleDelete}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl transition-colors shadow-sm"
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
