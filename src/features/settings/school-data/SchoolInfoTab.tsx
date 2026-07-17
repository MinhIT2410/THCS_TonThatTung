/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { School, Save, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function SchoolInfoTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [hasRecord, setHasRecord] = useState(false);

  const [formData, setFormData] = useState({
    school_name: '',
    short_name: '',
    school_code: '',
    education_level: '',
    school_type: '',
    managing_authority: '',
    address: '',
    province: '',
    district: '',
    ward: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    principal_name: '',
    established_year: '',
    short_description: '',
    timezone: 'Asia/Ho_Chi_Minh',
    default_language: 'vi',
  });

  const schoolId = '00000000-0000-0000-0000-000000000000';

  useEffect(() => {
    fetchSchoolInfo();
  }, []);

  const fetchSchoolInfo = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('school_information')
        .select('*')
        .eq('id', schoolId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasRecord(true);
        setFormData({
          school_name: data.school_name || '',
          short_name: data.short_name || '',
          school_code: data.school_code || '',
          education_level: data.education_level || '',
          school_type: data.school_type || '',
          managing_authority: data.managing_authority || '',
          address: data.address || '',
          province: data.province || '',
          district: data.district || '',
          ward: data.ward || '',
          postal_code: data.postal_code || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          principal_name: data.principal_name || '',
          established_year: data.established_year ? String(data.established_year) : '',
          short_description: data.short_description || '',
          timezone: data.timezone || 'Asia/Ho_Chi_Minh',
          default_language: data.default_language || 'vi',
        });
      } else {
        setHasRecord(false);
        setMessage({
          type: 'info',
          text: 'Thông tin trường chưa được cấu hình. Vui lòng nhập và lưu thông tin chính thức.',
        });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Không thể tải thông tin trường: ' + (err.message || err) });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.school_name.trim()) {
      setMessage({ type: 'error', text: 'Tên trường học là bắt buộc.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const updatePayload = {
        ...formData,
        established_year: formData.established_year ? parseInt(formData.established_year) : null,
      };

      const { error } = await supabase
        .from('school_information')
        .upsert(
          {
            id: schoolId,
            is_singleton: true,
            ...updatePayload,
          },
          {
            onConflict: 'id',
          }
        );

      if (error) throw error;

      if (!hasRecord) {
        setMessage({ type: 'success', text: 'Đã thiết lập thông tin trường học.' });
        setHasRecord(true);
      } else {
        setMessage({ type: 'success', text: 'Cập nhật thông tin trường học thành công.' });
      }
    } catch (err: any) {
      console.error(err);
      let errorText = 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.';
      if (err) {
        const msg = String(err.message || err).toLowerCase();
        if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('permission') || msg.includes('42501')) {
          errorText = 'Bạn không có quyền thực hiện thao tác này. Chỉ SUPER_ADMIN hoặc PRINCIPAL mới có quyền quản trị cấu hình trường học.';
        } else if (msg.includes('network') || msg.includes('fetch')) {
          errorText = 'Lỗi kết nối mạng. Vui lòng kiểm tra lại kết nối Internet.';
        } else {
          errorText = 'Không thể lưu thông tin trường học do lỗi hệ thống hoặc dữ liệu không hợp lệ. Vui lòng liên hệ bộ phận hỗ trợ.';
        }
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        <p className="text-xs text-slate-500 font-medium">Đang tải cấu hình trường học...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="school-info-tab">
      <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <School className="h-5 w-5 text-slate-500" />
        <h2 className="font-display text-sm font-bold text-slate-800 dark:text-white">Thông tin trường học</h2>
      </div>

      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${
          message.type === 'success' 
            ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400' 
            : message.type === 'info'
            ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30 text-blue-800 dark:text-blue-400'
            : 'bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/30 text-red-800 dark:text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : message.type === 'info' ? (
            <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          )}
          <span className="text-xs font-semibold">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Group 1: General Identifiers */}
          <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Thông tin cơ bản</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Tên trường học *</label>
              <input
                type="text"
                name="school_name"
                value={formData.school_name}
                onChange={handleChange}
                placeholder="Ví dụ: Trường THCS Nguyễn Du"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tên viết tắt</label>
                <input
                  type="text"
                  name="short_name"
                  value={formData.short_name}
                  onChange={handleChange}
                  placeholder="Ví dụ: THCS Nguyễn Du"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Mã trường</label>
                <input
                  type="text"
                  name="school_code"
                  value={formData.school_code}
                  onChange={handleChange}
                  placeholder="Ví dụ: THCS-ND"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Cấp học</label>
                <input
                  type="text"
                  name="education_level"
                  value={formData.education_level}
                  onChange={handleChange}
                  placeholder="Ví dụ: Trung học cơ sở"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Loại hình trường</label>
                <input
                  type="text"
                  name="school_type"
                  value={formData.school_type}
                  onChange={handleChange}
                  placeholder="Ví dụ: Công lập"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Hiệu trưởng</label>
                <input
                  type="text"
                  name="principal_name"
                  value={formData.principal_name}
                  onChange={handleChange}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Năm thành lập</label>
                <input
                  type="number"
                  name="established_year"
                  value={formData.established_year}
                  onChange={handleChange}
                  placeholder="Ví dụ: 1995"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Cơ quan quản lý</label>
              <input
                type="text"
                name="managing_authority"
                value={formData.managing_authority}
                onChange={handleChange}
                placeholder="Ví dụ: Phòng Giáo dục và Đào tạo Quận 1"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Group 2: Contact & Location */}
          <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Liên hệ & Địa chỉ</h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Địa chỉ chi tiết</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Ví dụ: 123 Đường Nguyễn Du"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Phường/Xã</label>
                <input
                  type="text"
                  name="ward"
                  value={formData.ward}
                  onChange={handleChange}
                  placeholder="Phường Bến Thành"
                  className="w-full px-2.5 py-2 text-[11px] border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Quận/Huyện</label>
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  placeholder="Quận 1"
                  className="w-full px-2.5 py-2 text-[11px] border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Tỉnh/TP</label>
                <input
                  type="text"
                  name="province"
                  value={formData.province}
                  onChange={handleChange}
                  placeholder="TP. HCM"
                  className="w-full px-2.5 py-2 text-[11px] border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Số điện thoại</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="028.1234.5678"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email trường</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="info@thcsnguyendu.edu.vn"
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Website</label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="www.thcsnguyendu.edu.vn"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Múi giờ</label>
                <select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Ngôn ngữ mặc định</label>
                <select
                  name="default_language"
                  value={formData.default_language}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Short Description */}
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Mô tả ngắn về trường</label>
          <textarea
            name="short_description"
            value={formData.short_description}
            onChange={handleChange}
            placeholder="Giới thiệu khái quát về lịch sử, sứ mệnh, thành tích nổi bật của nhà trường..."
            className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[80px]"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors shadow-sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </form>
    </div>
  );
}
