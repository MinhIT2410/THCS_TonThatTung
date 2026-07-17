/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { Home, Plus, Edit2, Trash2, CheckCircle2, Loader2, AlertCircle, Search } from 'lucide-react';

interface Classroom {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
  room_type: string | null;
  building: string | null;
  floor: number | null;
  is_active: boolean;
  notes: string | null;
}

export default function ClassroomsTab() {
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    capacity: '',
    room_type: 'THEORY', // THEORY, PRACTICE, LAB, GYM, OTHER
    building: '',
    floor: '',
    is_active: true,
    notes: '',
  });

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('classrooms')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setRooms(data || []);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi tải danh sách phòng học: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      code: '',
      capacity: '40',
      room_type: 'THEORY',
      building: '',
      floor: '',
      is_active: true,
      notes: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (room: Classroom) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      code: room.code,
      capacity: room.capacity !== null ? String(room.capacity) : '',
      room_type: room.room_type || 'THEORY',
      building: room.building || '',
      floor: room.floor !== null ? String(room.floor) : '',
      is_active: room.is_active,
      notes: room.notes || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setModalError('Tên phòng học và mã phòng là bắt buộc.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        room_type: formData.room_type,
        building: formData.building.trim() || null,
        floor: formData.floor ? parseInt(formData.floor) : null,
        is_active: formData.is_active,
        notes: formData.notes.trim() || null,
      };

      if (editingRoom) {
        const { error: updateError } = await supabase
          .from('classrooms')
          .update(payload)
          .eq('id', editingRoom.id);

        if (updateError) throw updateError;
        setSuccess('Cập nhật phòng học thành công!');
      } else {
        const { error: insertError } = await supabase
          .from('classrooms')
          .insert([payload]);

        if (insertError) throw insertError;
        setSuccess('Thêm phòng học mới thành công!');
      }

      setIsModalOpen(false);
      fetchRooms();
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Lỗi lưu thông tin phòng học.');
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
      // Direct safety check: is it linked to any class primary_classroom_id?
      const { data: linkedClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('primary_classroom_id', deletingId)
        .limit(1);

      if (linkedClasses && linkedClasses.length > 0) {
        setError('Không thể xóa phòng học này vì đang được chỉ định làm phòng học chính của một lớp.');
        setDeletingId(null);
        setDeletingName(null);
        return;
      }

      const { error: deleteError } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', deletingId);

      if (deleteError) throw deleteError;

      setSuccess('Xóa phòng học thành công!');
      fetchRooms();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Lỗi hệ thống khi xóa.');
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
      setDeletingName(null);
    }
  };

  const filteredRooms = rooms.filter(
    room =>
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (room.building && room.building.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6" id="classrooms-tab">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Home className="h-5 w-5 text-slate-500" />
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-white">Phòng học / Phòng chức năng</h2>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm phòng học</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50/50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-xl animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <span className="text-xs font-semibold">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold">{success}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm phòng học theo tên, mã phòng, dãy nhà..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
        />
      </div>

      {/* Grid Data */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          <p className="text-xs text-slate-500 font-medium">Đang tải phòng học...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-xs text-slate-500">Không tìm thấy dữ liệu phòng học nào.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 font-bold text-slate-500">Mã phòng</th>
                <th className="p-4 font-bold text-slate-500">Tên phòng</th>
                <th className="p-4 font-bold text-slate-500">Dãy nhà</th>
                <th className="p-4 font-bold text-slate-500 text-center">Tầng</th>
                <th className="p-4 font-bold text-slate-500 text-center">Sức chứa</th>
                <th className="p-4 font-bold text-slate-500">Loại phòng</th>
                <th className="p-4 font-bold text-slate-500 text-center">Trạng thái</th>
                <th className="p-4 font-bold text-slate-500 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRooms.map(room => (
                <tr key={room.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-400">{room.code}</td>
                  <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">{room.name}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{room.building || '-'}</td>
                  <td className="p-4 text-center text-slate-600 dark:text-slate-400">{room.floor !== null ? `Tầng ${room.floor}` : '-'}</td>
                  <td className="p-4 text-center text-slate-850 font-bold">{room.capacity ?? '-'} chỗ</td>
                  <td className="p-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-150">
                      {room.room_type === 'THEORY' ? 'Lý thuyết' :
                       room.room_type === 'PRACTICE' ? 'Thực hành' :
                       room.room_type === 'LAB' ? 'Thí nghiệm' :
                       room.room_type === 'GYM' ? 'Nhà đa năng' : 'Khác'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      room.is_active 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50' 
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                      {room.is_active ? 'Khả dụng' : 'Khóa'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEditModal(room)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                      title="Sửa"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(room.id, room.name)}
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
              {editingRoom ? 'Sửa phòng học' : 'Thêm phòng học mới'}
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
                  <label className="font-bold text-slate-500">Mã phòng học *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ví dụ: P201"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none uppercase"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Tên phòng *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Phòng 201"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Dãy nhà / Khu nhà</label>
                  <input
                    type="text"
                    value={formData.building}
                    onChange={e => setFormData({ ...formData, building: e.target.value })}
                    placeholder="Ví dụ: Nhà A"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Tầng số (số nguyên)</label>
                  <input
                    type="number"
                    value={formData.floor}
                    onChange={e => setFormData({ ...formData, floor: e.target.value })}
                    placeholder="2"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Sức chứa tối đa (chỗ)</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="40"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Loại phòng</label>
                  <select
                    value={formData.room_type}
                    onChange={e => setFormData({ ...formData, room_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="THEORY">Lý thuyết</option>
                    <option value="PRACTICE">Thực hành</option>
                    <option value="LAB">Thí nghiệm</option>
                    <option value="GYM">Nhà thể chất</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="room-is-active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="room-is-active" className="font-semibold text-slate-700 dark:text-slate-300">
                  Phòng khả dụng (Kích hoạt xếp lớp)
                </label>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ghi chú</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú thêm về phòng học..."
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
                  className="flex items-center space-x-1.5 px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
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
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Xác nhận xóa phòng học</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa phòng học <span className="font-semibold text-slate-800 dark:text-white">"{deletingName}"</span>? 
              Hệ thống không cho phép xóa phòng học đang được liên kết hoặc sử dụng bởi một lớp học khác.
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
