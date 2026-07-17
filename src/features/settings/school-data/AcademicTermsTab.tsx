/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Calendar, Plus, Edit2, Trash2, CheckCircle2, Star, Loader2, AlertCircle, Search, Filter } from 'lucide-react';

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface AcademicTerm {
  id: string;
  academic_year_id: string;
  code: string;
  name: string;
  term_order: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
  notes: string | null;
  academic_years?: {
    name: string;
  };
}

export default function AcademicTermsTab() {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [formData, setFormData] = useState({
    academic_year_id: '',
    name: '',
    code: '',
    term_order: 1,
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
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch years
      const { data: yearsData, error: yearsError } = await supabase
        .from('academic_years')
        .select('id, name, start_date, end_date')
        .order('start_date', { ascending: false });

      if (yearsError) throw yearsError;
      setYears(yearsData || []);

      // Fetch terms
      const { data: termsData, error: termsError } = await supabase
        .from('academic_terms')
        .select('*, academic_years:academic_year_id(name)');

      if (termsError) throw termsError;
      setTerms(termsData || []);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi tải dữ liệu: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTerm(null);
    setFormData({
      academic_year_id: years[0]?.id || '',
      name: '',
      code: '',
      term_order: 1,
      start_date: '',
      end_date: '',
      is_active: true,
      notes: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (term: AcademicTerm) => {
    setEditingTerm(term);
    setFormData({
      academic_year_id: term.academic_year_id,
      name: term.name,
      code: term.code,
      term_order: term.term_order,
      start_date: term.start_date,
      end_date: term.end_date,
      is_active: term.is_active,
      notes: term.notes || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.academic_year_id || !formData.name.trim() || !formData.code.trim() || !formData.start_date || !formData.end_date) {
      setModalError('Vui lòng nhập đầy đủ các trường bắt buộc.');
      return;
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setModalError('Ngày bắt đầu học kỳ phải trước ngày kết thúc.');
      return;
    }

    // Date check relative to the academic year
    const selectedYear = years.find(y => y.id === formData.academic_year_id);
    if (selectedYear) {
      const termStart = new Date(formData.start_date);
      const termEnd = new Date(formData.end_date);
      const yearStart = new Date(selectedYear.start_date);
      const yearEnd = new Date(selectedYear.end_date);

      if (termStart < yearStart || termEnd > yearEnd) {
        setModalError(`Thời gian học kỳ phải nằm trong phạm vi năm học: ${selectedYear.start_date} đến ${selectedYear.end_date}.`);
        return;
      }
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const payload = {
        academic_year_id: formData.academic_year_id,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        term_order: parseInt(String(formData.term_order)),
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
        notes: formData.notes.trim() || null,
      };

      if (editingTerm) {
        const { error: updateError } = await supabase
          .from('academic_terms')
          .update(payload)
          .eq('id', editingTerm.id);

        if (updateError) throw updateError;
        setSuccess('Cập nhật học kỳ thành công!');
      } else {
        const { error: insertError } = await supabase
          .from('academic_terms')
          .insert([payload]);

        if (insertError) throw insertError;
        setSuccess('Thêm học kỳ mới thành công!');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Lỗi lưu thông tin học kỳ.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSetCurrent = async (termId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('set_current_academic_term', {
        target_term_id: termId,
      });

      if (rpcError) throw rpcError;
      setSuccess('Đã đặt học kỳ hiện hành của năm học này thành công!');
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể thiết lập học kỳ hiện hành.');
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
        p_entity_type: 'academic_term',
        p_entity_id: deletingId,
      });

      if (rpcError) throw rpcError;

      if (data && data.success === false) {
        setError(data.message || 'Không thể xóa thực thể.');
      } else {
        setSuccess('Xóa học kỳ thành công!');
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

  const filteredTerms = terms.filter(term => {
    const matchesSearch = 
      term.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYearFilter === 'all' || term.academic_year_id === selectedYearFilter;
    return matchesSearch && matchesYear;
  });

  return (
    <div className="space-y-6" id="academic-terms-tab">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-slate-500" />
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-white">Học kỳ</h2>
        </div>
        <button
          onClick={handleOpenAddModal}
          disabled={years.length === 0}
          className="flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm học kỳ</span>
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

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên học kỳ hoặc mã..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Year Filter Dropdown */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={selectedYearFilter}
            onChange={e => setSelectedYearFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Tất cả năm học</option>
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
          <p className="text-xs text-slate-500 font-medium">Đang tải học kỳ...</p>
        </div>
      ) : filteredTerms.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500">Không tìm thấy học kỳ nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 font-bold text-slate-500">Năm học</th>
                <th className="p-4 font-bold text-slate-500">Học kỳ</th>
                <th className="p-4 font-bold text-slate-500">Mã học kỳ</th>
                <th className="p-4 font-bold text-slate-500 text-center">Thứ tự</th>
                <th className="p-4 font-bold text-slate-500">Bắt đầu</th>
                <th className="p-4 font-bold text-slate-500">Kết thúc</th>
                <th className="p-4 font-bold text-slate-500 text-center">Hiện hành</th>
                <th className="p-4 font-bold text-slate-500 text-center">Trạng thái</th>
                <th className="p-4 font-bold text-slate-500 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTerms.map(term => (
                <tr key={term.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 font-medium text-slate-500">{term.academic_years?.name || 'Không xác định'}</td>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{term.name}</td>
                  <td className="p-4 text-slate-500 font-mono">{term.code}</td>
                  <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">{term.term_order}</td>
                  <td className="p-4 text-slate-500">{term.start_date}</td>
                  <td className="p-4 text-slate-500">{term.end_date}</td>
                  <td className="p-4 text-center">
                    {term.is_current ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>Hiện hành</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetCurrent(term.id)}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Đặt hiện hành
                      </button>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      term.is_active 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                      {term.is_active ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(term)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      title="Sửa"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(term.id, term.name)}
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
              {editingTerm ? 'Sửa thông tin học kỳ' : 'Thêm học kỳ mới'}
            </h3>

            {modalError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50/50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="text-xs font-semibold">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Năm học *</label>
                <select
                  value={formData.academic_year_id}
                  onChange={e => setFormData({ ...formData, academic_year_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                >
                  {years.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Tên học kỳ *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Học kỳ 1"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Mã học kỳ *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ví dụ: HK1"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 uppercase"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Thứ tự kỳ học *</label>
                  <input
                    type="number"
                    value={formData.term_order}
                    onChange={e => setFormData({ ...formData, term_order: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
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
                  id="term-is-active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="term-is-active" className="font-semibold text-slate-700 dark:text-slate-300">
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
              Bạn có chắc chắn muốn xóa học kỳ <span className="font-semibold text-slate-800 dark:text-white">"{deletingName}"</span>? 
              Hệ thống sẽ không cho phép xóa nếu học kỳ này đã có phân công giảng dạy hoặc dữ liệu liên kết.
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
