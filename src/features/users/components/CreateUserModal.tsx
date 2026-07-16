/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { userCreationApi } from '../userCreationApi';
import { X, AlertTriangle, Shield, User, Mail, Loader2, Check, GraduationCap, Calendar, BookOpen } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { hasRole } = useAuth();
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [hasEmail, setHasEmail] = useState(true);
  const [studentCode, setStudentCode] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{
    studentCode: string;
    loginIdentifier: string;
    temporaryPassword: string;
    fullName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const textToCopy = `Họ tên: ${createdCredentials.fullName}\nMã học sinh: ${createdCredentials.studentCode}\nTên đăng nhập: ${createdCredentials.loginIdentifier}\nMật khẩu tạm: ${createdCredentials.temporaryPassword}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Config & Loading states
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter roles based on current logged in user permissions
  const getAllowedRoles = () => {
    if (hasRole('SUPER_ADMIN')) {
      return AVAILABLE_ROLES;
    }
    if (hasRole('PRINCIPAL')) {
      return AVAILABLE_ROLES.filter(r => r.code !== 'SUPER_ADMIN' && r.code !== 'PRINCIPAL');
    }
    if (hasRole('VICE_PRINCIPAL') || hasRole('STAFF')) {
      return AVAILABLE_ROLES.filter(r => r.code !== 'SUPER_ADMIN' && r.code !== 'PRINCIPAL');
    }
    if (hasRole('TEACHER')) {
      return AVAILABLE_ROLES.filter(r => r.code === 'STUDENT');
    }
    return [];
  };

  const allowedRoles = getAllowedRoles();
  const isStudentSelected = selectedRoles.includes('STUDENT');

  // Load classes and academic years
  useEffect(() => {
    if (isOpen) {
      // Reset form states
      setFullName('');
      setEmail('');
      setHasEmail(true);
      setStudentCode('');
      setSelectedRoles([]);
      setSelectedClassId('');
      setSelectedAcademicYearId('');
      setCreatedCredentials(null);
      setError(null);

      const loadData = async () => {
        setLoadingConfig(true);
        try {
          const [years, classList] = await Promise.all([
            userCreationApi.getAcademicYears(),
            userCreationApi.getClasses()
          ]);
          setAcademicYears(years);
          setClasses(classList);

          // Auto-select active academic year
          const activeYear = years.find((y: any) => y.is_active);
          if (activeYear) {
            setSelectedAcademicYearId(activeYear.id);
          } else if (years.length > 0) {
            setSelectedAcademicYearId(years[0].id);
          }

          if (classList.length > 0) {
            setSelectedClassId(classList[0].id);
          }
        } catch (err) {
          console.error("Không thể tải danh mục năm học/lớp học:", err);
        } finally {
          setLoadingConfig(false);
        }
      };
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleToggle = (code: string) => {
    setSelectedRoles(prev => {
      let nextRoles = [];
      if (prev.includes(code)) {
        nextRoles = prev.filter(r => r !== code);
      } else {
        nextRoles = [...prev, code];
      }
      
      // If STUDENT is no longer selected, force hasEmail to true
      if (!nextRoles.includes('STUDENT')) {
        setHasEmail(true);
        setStudentCode('');
      }
      return nextRoles;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validation
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedStudentCode = studentCode.trim().toUpperCase();

    if (!trimmedName) {
      setError('Họ và tên không được để trống.');
      return;
    }

    if (selectedRoles.length === 0) {
      setError('Vui lòng chọn ít nhất một vai trò.');
      return;
    }

    if (isStudentSelected && !hasEmail) {
      if (!trimmedStudentCode) {
        setError('Mã học sinh là bắt buộc khi không có email.');
        return;
      }
      if (!/^[A-Z0-9-]+$/.test(trimmedStudentCode)) {
        setError('Mã học sinh chỉ được chứa chữ cái, số và dấu gạch ngang.');
        return;
      }
    } else {
      if (!trimmedEmail) {
        setError('Email không được để trống.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setError('Định dạng email không hợp lệ.');
        return;
      }
    }

    if (isStudentSelected) {
      if (!selectedClassId) {
        setError('Học sinh bắt buộc phải được chọn lớp học.');
        return;
      }
      if (!selectedAcademicYearId) {
        setError('Học sinh bắt buộc phải được chọn năm học.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const result = await userCreationApi.createUser({
        full_name: trimmedName,
        email: (isStudentSelected && !hasEmail) ? undefined : trimmedEmail,
        student_code: (isStudentSelected && !hasEmail) ? trimmedStudentCode : null,
        roles: selectedRoles,
        class_id: isStudentSelected ? selectedClassId : null,
        academic_year_id: isStudentSelected ? selectedAcademicYearId : null
      });

      if (result && result.success === false) {
        const errCode = result.error_code || 'UNKNOWN';
        setError(getFriendlyErrorMessage(errCode, result.message || 'Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại sau.'));
      } else {
        const data = result?.data || {};
        if (data.temporary_password) {
          setCreatedCredentials({
            fullName: trimmedName,
            studentCode: (data.student_code || trimmedStudentCode).toUpperCase(),
            loginIdentifier: (data.student_code || trimmedStudentCode).toUpperCase(),
            temporaryPassword: data.temporary_password
          });
          onSuccess();
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      console.error("Lỗi khi gọi API tạo tài khoản:", err);
      
      let errorCode = 'UNKNOWN';
      let rawMsg = err.message || '';

      // Safe parse if it has a context JSON response from Supabase Function
      if (err.context && typeof err.context.json === 'function') {
        try {
          const body = await err.context.json();
          if (body && body.error_code) {
            errorCode = body.error_code;
            rawMsg = body.message || rawMsg;
          }
        } catch (_) {}
      } else {
        // Fallback checks on stringified errors
        if (rawMsg.includes('UNAUTHORIZED') || rawMsg.includes('401')) {
          errorCode = 'UNAUTHORIZED';
        } else if (rawMsg.includes('FORBIDDEN') || rawMsg.includes('403')) {
          errorCode = 'FORBIDDEN';
        } else if (rawMsg.includes('EMAIL_EXISTS')) {
          errorCode = 'EMAIL_EXISTS';
        } else if (rawMsg.includes('STUDENT_CODE_EXISTS')) {
          errorCode = 'STUDENT_CODE_EXISTS';
        } else if (rawMsg.includes('STUDENT_CODE_INVALID')) {
          errorCode = 'STUDENT_CODE_INVALID';
        } else if (rawMsg.includes('STUDENT_CODE_REQUIRED')) {
          errorCode = 'STUDENT_CODE_REQUIRED';
        }
      }

      setError(getFriendlyErrorMessage(errorCode, rawMsg || 'Có lỗi máy chủ xảy ra. Vui lòng thử lại sau.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFriendlyErrorMessage = (errorCode: string, defaultMsg: string): string => {
    const mapping: Record<string, string> = {
      UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      FORBIDDEN: 'Bạn không có quyền tạo loại tài khoản này.',
      VALIDATION_ERROR: 'Dữ liệu tài khoản chưa hợp lệ.',
      EMAIL_REQUIRED: 'Vui lòng nhập email.',
      EMAIL_EXISTS: 'Email này đã có tài khoản trong hệ thống.',
      INVITE_FAILED: 'Không thể gửi email mời. Vui lòng thử lại.',
      STUDENT_CODE_REQUIRED: 'Mã học sinh là bắt buộc khi không có email.',
      STUDENT_CODE_INVALID: 'Mã học sinh không hợp lệ. Chỉ cho phép chữ cái (A-Z), số (0-9) và dấu gạch ngang (-).',
      STUDENT_CODE_EXISTS: 'Mã học sinh này đã tồn tại trên hệ thống.',
      TEMPORARY_ACCOUNT_CREATION_FAILED: 'Không thể tạo tài khoản học sinh tạm thời trên Auth.',
      DATABASE_FINALIZATION_FAILED: 'Không thể hoàn tất dữ liệu tài khoản. Hệ thống đã hủy tài khoản vừa tạo.',
      COMPENSATION_FAILED: 'Tài khoản chưa được hoàn tất và cần quản trị viên kiểm tra.',
      INTERNAL_SERVER_ERROR: 'Đã có lỗi hệ thống. Vui lòng thử lại sau.'
    };
    return mapping[errorCode] || defaultMsg || 'Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại sau.';
  };

  const isConfigEmpty = academicYears.length === 0 || classes.length === 0;

  if (createdCredentials) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans" id="create-user-modal">
        <div 
          className="relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-scale-up p-6 text-center space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
            <Check className="h-6 w-6" />
          </div>
          
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tạo tài khoản học sinh thành công</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Học sinh: <strong className="text-slate-800 dark:text-slate-200">{createdCredentials.fullName}</strong>
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl text-left space-y-3 border border-slate-100 dark:border-slate-900 font-medium text-slate-700 dark:text-slate-300">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Họ tên:</span>
              <strong className="text-slate-800 dark:text-slate-100">{createdCredentials.fullName}</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Mã học sinh:</span>
              <strong className="font-mono text-slate-800 dark:text-slate-100">{createdCredentials.studentCode}</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Tên đăng nhập:</span>
              <strong className="font-mono text-slate-800 dark:text-slate-100 select-all">{createdCredentials.loginIdentifier}</strong>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-200/50 dark:border-slate-800/50 pt-2.5">
              <span className="text-slate-400 font-medium">Mật khẩu tạm:</span>
              <strong className="font-mono text-blue-600 dark:text-blue-400 select-all font-bold tracking-wider">{createdCredentials.temporaryPassword}</strong>
            </div>
          </div>

          <div className="flex justify-end px-1">
            <button
              onClick={handleCopyCredentials}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border border-blue-200/40 dark:border-blue-900/40 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Sao chép thông tin</span>
                </>
              )}
            </button>
          </div>

          <div className="flex gap-2 p-3.5 bg-amber-50 dark:bg-amber-950/25 border border-amber-100 dark:border-amber-900/50 rounded-2xl text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-semibold text-left">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Mật khẩu này chỉ hiển thị một lần. Vui lòng lưu lại và bàn giao an toàn cho học sinh.</span>
          </div>

          <button
            onClick={() => {
              setCreatedCredentials(null);
              onClose();
            }}
            className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-500/10"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans" id="create-user-modal">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Tạo tài khoản mới
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-6 flex-1 space-y-5">
          {error && (
            <div className="flex gap-2.5 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl text-xs text-red-700 dark:text-red-400 leading-relaxed font-semibold animate-shake">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên..."
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium transition-all"
              />
            </div>

            {/* Student Account Type (Only if STUDENT is selected) */}
            {isStudentSelected && (
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl animate-fade-in">
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Hình thức tài khoản học sinh
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setHasEmail(true);
                      setStudentCode('');
                    }}
                    className={`flex items-center justify-center p-2.5 rounded-xl text-xs font-semibold border select-none transition-all ${
                      hasEmail
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 font-bold'
                        : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 font-medium'
                    }`}
                  >
                    Có địa chỉ Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasEmail(false)}
                    className={`flex items-center justify-center p-2.5 rounded-xl text-xs font-semibold border select-none transition-all ${
                      !hasEmail
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 font-bold'
                        : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 font-medium'
                    }`}
                  >
                    Chưa có địa chỉ Email
                  </button>
                </div>
              </div>
            )}

            {/* Conditional input fields */}
            {(!isStudentSelected || hasEmail) ? (
              /* Email */
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@school.edu.vn"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium transition-all"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                  Mật khẩu sẽ không cần thiết lập thủ công. Hệ thống sẽ gửi một email mời kích hoạt tài khoản để người dùng tự khởi tạo mật khẩu riêng.
                </p>
              </div>
            ) : (
              /* Student Code (No Email) */
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                  Mã học sinh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="Ví dụ: HS000123"
                  className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-mono font-bold tracking-wider transition-all"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                  Hệ thống sẽ tạo tên đăng nhập bằng mã học sinh và một mật khẩu tạm riêng.
                </p>
              </div>
            )}

            {/* Roles Selection */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Vai trò (Có thể chọn nhiều) <span className="text-red-500">*</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-slate-50/50 dark:bg-slate-900/45 border border-slate-150 dark:border-slate-850 rounded-2xl">
                {allowedRoles.map((r) => {
                  const checked = selectedRoles.includes(r.code);
                  const isStudentRole = r.code === 'STUDENT';
                  const disabledCheckbox = isStudentRole && isConfigEmpty && !loadingConfig;

                  return (
                    <label 
                      key={r.code} 
                      className={`flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-semibold cursor-pointer border select-none transition-all ${
                        checked 
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400' 
                          : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      } ${disabledCheckbox ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isSubmitting || disabledCheckbox}
                        onChange={() => handleRoleToggle(r.code)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 disabled:opacity-50"
                      />
                      <span>{r.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Student Specific Fields */}
            {isStudentSelected && (
              <div className="space-y-4 p-4 bg-blue-50/25 dark:bg-blue-950/10 border border-blue-100/60 dark:border-blue-900/30 rounded-2xl animate-fade-in">
                <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400">
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Thông tin học sinh bắt buộc</span>
                </div>

                {loadingConfig ? (
                  <div className="flex items-center justify-center py-4 space-x-2">
                     <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                     <span className="text-xs text-slate-500">Đang tải năm học & lớp...</span>
                  </div>
                ) : isConfigEmpty ? (
                  <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/25 border border-amber-100 dark:border-amber-900/50 rounded-xl text-xs text-amber-700 dark:text-amber-400 font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Vui lòng tạo năm học và lớp học trước khi tạo tài khoản học sinh.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Academic Year Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        Năm học <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        disabled={isSubmitting}
                        value={selectedAcademicYearId}
                        onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium"
                      >
                        <option value="" disabled>-- Chọn năm học --</option>
                        {academicYears.map((year) => (
                          <option key={year.id} value={year.id}>
                            {year.name} {year.is_active ? '(Đang hoạt động)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Class Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-slate-400" />
                        Lớp học <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        disabled={isSubmitting}
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 dark:text-white font-medium"
                      >
                        <option value="" disabled>-- Chọn lớp học --</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            Lớp {c.name} (Khối {c.grade_level})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-900 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <span>Tạo tài khoản</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
