/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { ShieldAlert, Plus, Edit2, Trash2, CheckCircle2, Loader2, AlertCircle, Search, Users, UserPlus, UserMinus, ShieldCheck } from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code: string | null;
  department_type: string | null;
  display_order: number;
  is_active: boolean;
  notes: string | null;
}

interface Member {
  id: string;
  department_id: string;
  teacher_id: string;
  academic_year_id: string;
  is_head: boolean;
  is_deputy: boolean;
  profiles?: {
    full_name: string;
    email: string | null;
  } | null;
  academic_years?: {
    name: string;
  } | null;
}

interface TeacherProfile {
  id: string;
  full_name: string;
}

interface AcademicYear {
  id: string;
  name: string;
}

export default function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptModalLoading, setDeptModalLoading] = useState(false);
  const [deptModalError, setDeptModalError] = useState<string | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    department_type: '',
    display_order: '0',
    is_active: true,
    notes: '',
  });

  // Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberModalLoading, setMemberModalLoading] = useState(false);
  const [memberModalError, setMemberModalError] = useState<string | null>(null);
  const [memberFormData, setMemberFormData] = useState({
    teacher_id: '',
    academic_year_id: '',
    role_type: 'member', // 'head', 'deputy', 'member'
  });

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<'dept' | 'member'>('dept');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDept) {
      fetchMembers(selectedDept.id);
    } else {
      setMembers([]);
    }
  }, [selectedDept]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('display_order', { ascending: true });

      if (deptError) throw deptError;
      setDepartments(deptData || []);
      if (deptData && deptData.length > 0) {
        setSelectedDept(deptData[0]);
      }

      // Fetch teachers
      const { data: teachersData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      setTeachers(teachersData || []);

      // Fetch academic years
      const { data: yearsData } = await supabase
        .from('academic_years')
        .select('id, name')
        .order('start_date', { ascending: false });

      setYears(yearsData || []);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi tải dữ liệu tổ chuyên môn: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (deptId: string) => {
    setMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from('department_memberships')
        .select(`
          *,
          profiles:teacher_id(full_name),
          academic_years:academic_year_id(name)
        `)
        .eq('department_id', deptId);

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleOpenAddDeptModal = () => {
    setEditingDept(null);
    setDeptFormData({
      name: '',
      code: '',
      department_type: 'TEACHING',
      display_order: '0',
      is_active: true,
      notes: '',
    });
    setDeptModalError(null);
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDeptModal = (dept: Department) => {
    setEditingDept(dept);
    setDeptFormData({
      name: dept.name,
      code: dept.code || '',
      department_type: dept.department_type || 'TEACHING',
      display_order: String(dept.display_order),
      is_active: dept.is_active,
      notes: dept.notes || '',
    });
    setDeptModalError(null);
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormData.name.trim() || !deptFormData.code.trim()) {
      setDeptModalError('Tên tổ và mã tổ là bắt buộc.');
      return;
    }

    setDeptModalLoading(true);
    setDeptModalError(null);

    try {
      const payload = {
        name: deptFormData.name.trim(),
        code: deptFormData.code.trim().toLowerCase(),
        department_type: deptFormData.department_type,
        display_order: parseInt(deptFormData.display_order) || 0,
        is_active: deptFormData.is_active,
        notes: deptFormData.notes.trim() || null,
      };

      if (editingDept) {
        const { error: updateError } = await supabase
          .from('departments')
          .update(payload)
          .eq('id', editingDept.id);

        if (updateError) throw updateError;
        setSuccess('Cập nhật tổ chuyên môn thành công!');
      } else {
        const { error: insertError } = await supabase
          .from('departments')
          .insert([payload]);

        if (insertError) throw insertError;
        setSuccess('Thêm tổ chuyên môn mới thành công!');
      }

      setIsDeptModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setDeptModalError(err.message || 'Lỗi lưu tổ chuyên môn.');
    } finally {
      setDeptModalLoading(false);
    }
  };

  const handleOpenAddMemberModal = () => {
    if (!selectedDept) return;
    setMemberFormData({
      teacher_id: teachers[0]?.id || '',
      academic_year_id: years[0]?.id || '',
      role_type: 'member',
    });
    setMemberModalError(null);
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !memberFormData.teacher_id || !memberFormData.academic_year_id) {
      setMemberModalError('Vui lòng điền đầy đủ các thông tin.');
      return;
    }

    setMemberModalLoading(true);
    setMemberModalError(null);

    try {
      const is_head = memberFormData.role_type === 'head';
      const is_deputy = memberFormData.role_type === 'deputy';

      const payload = {
        department_id: selectedDept.id,
        teacher_id: memberFormData.teacher_id,
        academic_year_id: memberFormData.academic_year_id,
        is_head,
        is_deputy,
      };

      const { error: insertError } = await supabase
        .from('department_memberships')
        .insert([payload]);

      if (insertError) throw insertError;

      setSuccess('Thêm thành viên tổ chuyên môn thành công!');
      setIsMemberModalOpen(false);
      fetchMembers(selectedDept.id);
    } catch (err: any) {
      console.error(err);
      setMemberModalError(err.message || 'Lỗi thêm thành viên (Có thể thành viên đã được thêm trước đó).');
    } finally {
      setMemberModalLoading(false);
    }
  };

  const handleConfirmDeleteDept = (id: string, name: string) => {
    setDeletingId(id);
    setDeletingName(name);
    setDeletingType('dept');
  };

  const handleConfirmDeleteMember = (id: string, name: string) => {
    setDeletingId(id);
    setDeletingName(name);
    setDeletingType('member');
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (deletingType === 'dept') {
        const { data, error: rpcError } = await supabase.rpc('safe_delete_school_entity', {
          p_entity_type: 'department',
          p_entity_id: deletingId,
        });

        if (rpcError) throw rpcError;

        if (data && data.success === false) {
          setError(data.message || 'Không thể xóa tổ.');
        } else {
          setSuccess('Xóa tổ chuyên môn thành công!');
          fetchData();
        }
      } else {
        const { error: deleteError } = await supabase
          .from('department_memberships')
          .delete()
          .eq('id', deletingId);

        if (deleteError) throw deleteError;
        setSuccess('Đã xóa thành viên khỏi tổ chuyên môn!');
        if (selectedDept) fetchMembers(selectedDept.id);
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

  const filteredDepts = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.code && d.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6" id="departments-tab">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-slate-500" />
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-white">Tổ chuyên môn & Thành viên</h2>
        </div>
        <button
          onClick={handleOpenAddDeptModal}
          className="flex items-center space-x-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm tổ chuyên môn</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Departments list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tổ..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-2 bg-white dark:bg-slate-950 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-wider mb-2">Danh sách tổ</p>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
            ) : filteredDepts.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-400">Không có tổ nào</p>
            ) : (
              filteredDepts.map(dept => (
                <div
                  key={dept.id}
                  onClick={() => setSelectedDept(dept)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedDept?.id === dept.id
                      ? 'bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-bold border-l-4 border-blue-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5 truncate">
                    <p className="text-xs truncate">{dept.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate uppercase">{dept.code || '-'}</p>
                  </div>
                  <div className="flex space-x-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenEditDeptModal(dept)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleConfirmDeleteDept(dept.id, dept.name)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Members of selected department */}
        <div className="lg:col-span-2 space-y-4">
          {selectedDept ? (
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-slate-800 dark:text-white">
                    Tổ viên: {selectedDept.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Quản lý danh sách thành viên thuộc tổ chuyên môn này.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddMemberModal}
                  disabled={teachers.length === 0 || years.length === 0}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-xl transition-all"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Thêm tổ viên</span>
                </button>
              </div>

              {membersLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  <p className="text-xs text-slate-400">Đang tải tổ viên...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/20">
                  <p className="text-xs text-slate-400">Chưa có thành viên nào được gán vào tổ này.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                        <th className="pb-2">Họ & Tên</th>
                        <th className="pb-2">Năm học</th>
                        <th className="pb-2 text-center">Chức danh</th>
                        <th className="pb-2 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {members.map(member => (
                        <tr key={member.id} className="hover:bg-slate-50/20 transition-colors">
                          <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                            {member.profiles?.full_name || 'Không rõ'}
                          </td>
                          <td className="py-3 text-slate-500">
                            {member.academic_years?.name || 'Không rõ'}
                          </td>
                          <td className="py-3 text-center">
                            {member.is_head ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20">
                                <ShieldCheck className="h-3 w-3" />
                                <span>Tổ trưởng</span>
                              </span>
                            ) : member.is_deputy ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">
                                <span>Tổ phó</span>
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-100 dark:border-slate-800/60">
                                Thành viên
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleConfirmDeleteMember(member.id, member.profiles?.full_name || '')}
                              className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                              title="Xóa thành viên khỏi tổ"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Users className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-500">Chọn một tổ chuyên môn để quản lý thành viên.</p>
            </div>
          )}
        </div>
      </div>

      {/* Department Add/Edit Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              {editingDept ? 'Sửa tổ chuyên môn' : 'Thêm tổ chuyên môn mới'}
            </h3>

            {deptModalError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50/50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="text-xs font-semibold">{deptModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDept} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Tên tổ chuyên môn *</label>
                <input
                  type="text"
                  value={deptFormData.name}
                  onChange={e => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  placeholder="Ví dụ: Tổ Tự Nhiên 1"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Mã tổ *</label>
                  <input
                    type="text"
                    value={deptFormData.code}
                    onChange={e => setDeptFormData({ ...deptFormData, code: e.target.value })}
                    placeholder="Ví dụ: to-tu-nhien"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white uppercase"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Loại tổ</label>
                  <select
                    value={deptFormData.department_type}
                    onChange={e => setDeptFormData({ ...deptFormData, department_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value="TEACHING">Giảng dạy (Chuyên môn)</option>
                    <option value="ADMINISTRATIVE">Hành chính (Văn phòng)</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={deptFormData.display_order}
                    onChange={e => setDeptFormData({ ...deptFormData, display_order: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-5">
                  <input
                    type="checkbox"
                    id="dept-is-active"
                    checked={deptFormData.is_active}
                    onChange={e => setDeptFormData({ ...deptFormData, is_active: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="dept-is-active" className="font-semibold text-slate-700 dark:text-slate-300">
                    Kích hoạt hoạt động
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Ghi chú</label>
                <textarea
                  value={deptFormData.notes}
                  onChange={e => setDeptFormData({ ...deptFormData, notes: e.target.value })}
                  placeholder="Mô tả hoặc ghi chú..."
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white min-h-[60px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={deptModalLoading}
                  className="flex items-center space-x-1.5 px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  {deptModalLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Lưu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Add Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Gán tổ viên vào tổ {selectedDept?.name}
            </h3>

            {memberModalError && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50/50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-xl animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="text-xs font-semibold">{memberModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500">Giáo viên (Thành viên) *</label>
                <select
                  value={memberFormData.teacher_id}
                  onChange={e => setMemberFormData({ ...memberFormData, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                >
                  <option value="" disabled>Chọn giáo viên...</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500">Năm học *</label>
                <select
                  value={memberFormData.academic_year_id}
                  onChange={e => setMemberFormData({ ...memberFormData, academic_year_id: e.target.value })}
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
                <label className="font-bold text-slate-500">Vai trò trong tổ *</label>
                <select
                  value={memberFormData.role_type}
                  onChange={e => setMemberFormData({ ...memberFormData, role_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  required
                >
                  <option value="member">Tổ viên (Thông thường)</option>
                  <option value="head">Tổ trưởng (Trưởng bộ môn)</option>
                  <option value="deputy">Tổ phó</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={memberModalLoading}
                  className="flex items-center space-x-1.5 px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                >
                  {memberModalLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Thêm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Xác nhận xóa</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa {deletingType === 'dept' ? 'tổ chuyên môn' : 'thành viên'} <span className="font-bold text-slate-800 dark:text-white">"{deletingName}"</span>? 
              {deletingType === 'dept' && ' Thao tác này sẽ không thể thực hiện nếu đang có môn học hoặc thành viên gán vào tổ.'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={deleteLoading}
                onClick={() => { setDeletingId(null); setDeletingName(null); }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                disabled={deleteLoading}
                onClick={handleDelete}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl transition-colors shadow-sm"
              >
                {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Xác nhận</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
