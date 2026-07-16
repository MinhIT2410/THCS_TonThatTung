/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { userCreationApi } from '../userCreationApi';
import { parseExcelFile, validateImportRows } from './userImportParser';
import { downloadImportTemplate } from './userImportTemplate';
import { RawImportRow, ValidatedImportRow, ImportResult } from './userImportTypes';
import * as XLSX from 'xlsx';
import { 
  X, Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle, 
  RefreshCw, ChevronRight, Play, FileDown, ArrowLeft, Info
} from 'lucide-react';

interface UserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UserImportModal: React.FC<UserImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Steps: 'upload' | 'preview' | 'result'
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  
  // Data states
  const [fileName, setFileName] = useState('');
  const [validatedRows, setValidatedRows] = useState<ValidatedImportRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  
  // Configuration states (classes/academic years)
  const [classes, setClasses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  
  // Loading & error states
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Load classes and academic years
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setFileName('');
      setValidatedRows([]);
      setImportResults([]);
      setGeneralError(null);
      setConfigError(null);

      const loadConfig = async () => {
        setLoadingConfig(true);
        try {
          const [years, classList] = await Promise.all([
            userCreationApi.getAcademicYears(),
            userCreationApi.getClasses()
          ]);
          setAcademicYears(years);
          setClasses(classList);
          setConfigError(null);
        } catch (err) {
          console.error("Không thể tải danh mục năm học/lớp học:", err);
          setConfigError("Không thể tải danh mục lớp học và năm học. Bạn vẫn có thể tải file mẫu cơ bản, nhưng cần bổ sung đúng ID lớp và ID năm học trước khi nhập.");
        } finally {
          setLoadingConfig(false);
        }
      };
      loadConfig();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = async (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      setGeneralError("Vui lòng chọn file định dạng Excel (.xlsx, .xls) hoặc CSV (.csv).");
      return;
    }

    setFileName(file.name);
    setIsProcessingFile(true);
    setGeneralError(null);

    try {
      const rawRows = await parseExcelFile(file);
      
      if (rawRows.length === 0) {
        setGeneralError("File rỗng hoặc không có dữ liệu hợp lệ.");
        setIsProcessingFile(false);
        return;
      }

      if (rawRows.length > 100) {
        setGeneralError("Vui lòng giới hạn tối đa 100 dòng mỗi lần nhập để đảm bảo hiệu năng.");
        setIsProcessingFile(false);
        return;
      }

      const validated = validateImportRows(rawRows, classes, academicYears);
      setValidatedRows(validated);
      setStep('preview');
    } catch (err: any) {
      console.error("Error reading file:", err);
      setGeneralError("Đã xảy ra lỗi khi đọc và phân tích file.");
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadImportTemplate(classes, academicYears);
  };

  const handleConfirmImport = async () => {
    const validRowsToSubmit = validatedRows.filter(r => r.isValid);

    if (validRowsToSubmit.length === 0) {
      setGeneralError("Không có dòng dữ liệu hợp lệ để nhập vào hệ thống.");
      return;
    }

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const result = await userCreationApi.createManyUsers(validRowsToSubmit);
      
      if (result && result.success === false) {
        setGeneralError(result.message || "Có lỗi xảy ra trong quá trình xử lý.");
      } else {
        // Safe mapping of results
        const resultsList: ImportResult[] = (result?.data || []).map((r: any) => ({
          row_number: r.row_number,
          full_name: validRowsToSubmit.find(v => v.row_number === r.row_number)?.full_name || 'Không rõ',
          email: r.email || validRowsToSubmit.find(v => v.row_number === r.row_number)?.email || '',
          student_code: r.student_code || validRowsToSubmit.find(v => v.row_number === r.row_number)?.student_code || '',
          success: r.success,
          message: r.error || (r.success ? 'Tạo thành công' : 'Thất bại'),
          user_id: r.user_id,
          login_identifier: r.login_identifier || '',
          temporary_password: r.temporary_password || ''
        }));

        setImportResults(resultsList);
        setStep('result');
        onSuccess();
      }
    } catch (err: any) {
      console.error("Lỗi khi import danh sách:", err);
      setGeneralError("Lỗi kết nối hoặc lỗi hệ thống khi xử lý yêu cầu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadResults = () => {
    const exportData = importResults.map(r => ({
      'Dòng trong file': r.row_number,
      'Họ và tên': r.full_name,
      'Email': r.email || '',
      'Mã học sinh': r.student_code || '',
      'Tên đăng nhập': r.login_identifier || '',
      'Mật khẩu tạm': r.temporary_password || '',
      'student_code': r.student_code || '',
      'login_identifier': r.login_identifier || '',
      'temporary_password': r.temporary_password || '',
      'Trạng thái': r.success ? 'Thành công' : 'Thất bại',
      'Chi tiết': r.message || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ket_Qua_Import');
    XLSX.writeFile(workbook, 'ket_qua_nhap_tai_khoan.xlsx');
  };

  const totalRows = validatedRows.length;
  const validRowsCount = validatedRows.filter(r => r.isValid).length;
  const invalidRowsCount = totalRows - validRowsCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans" id="user-import-modal">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-scale-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Nhập tài khoản từ file Excel
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            id="btn-close-import-modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
          <span className={step === 'upload' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}>1. Tải lên file</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className={step === 'preview' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}>2. Xem trước và kiểm tra lỗi</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <span className={step === 'result' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}>3. Kết quả hoàn tất</span>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 flex-1 space-y-4">
          {generalError && (
            <div className="flex gap-2.5 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl text-xs text-red-700 dark:text-red-400 leading-relaxed font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD FILE */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Info guidelines */}
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex gap-3 text-xs leading-relaxed">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
                  <h4 className="font-bold text-slate-900 dark:text-white">Quy tắc chuẩn bị dữ liệu:</h4>
                  <ul className="list-disc list-inside space-y-1 font-medium">
                    <li>Họ tên và Vai trò là thông tin bắt buộc.</li>
                    <li>Mỗi lượt import tối đa là 100 tài khoản.</li>
                    <li>Cán bộ, giáo viên và học sinh có Email sẽ nhận email mời kích hoạt tài khoản để tự thiết lập mật khẩu đăng nhập riêng.</li>
                    <li>Học sinh chưa có email bắt buộc phải khai báo <strong className="text-blue-600 dark:text-blue-400">Mã học sinh (student_code)</strong>. Hệ thống sẽ tự tạo tài khoản kỹ thuật và cấp mật khẩu tạm thời hiển thị tại bước cuối cùng.</li>
                    <li>Đối với học sinh, ID lớp học và ID năm học bắt buộc phải đúng chuẩn UUID (lấy trong danh sách ở sheet đính kèm file mẫu).</li>
                  </ul>
                </div>
              </div>

              {configError && (
                <div className="flex gap-2.5 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-2xl text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>{configError}</span>
                </div>
              )}

              {/* Template download action */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Chưa có file dữ liệu mẫu?</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Tải file excel mẫu đầy đủ cấu trúc các trường học tập và chỉ dẫn UUID</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center space-x-1.5 px-3.5 py-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-900/35 transition-all cursor-pointer"
                  id="btn-download-import-template"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải file Excel mẫu</span>
                </button>
              </div>

              {/* Upload drag drop zone */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
                }`}
                id="excel-drag-drop-zone"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileInputChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden" 
                />
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                  {isProcessingFile ? (
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                  ) : (
                    <Upload className="h-8 w-8" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    {isProcessingFile ? "Đang đọc file..." : "Kéo thả file Excel vào đây hoặc bấm để chọn file"}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                    Hỗ trợ định dạng .xlsx, .xls, .csv tối đa 100 dòng dữ liệu
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW AND VALIDATE */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* File Info & Stats Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shrink-0">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md">
                    File: {fileName}
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                    Xem trước danh sách dữ liệu trước khi thực hiện ghi vào hệ thống
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl text-[10px] font-bold text-blue-700 dark:text-blue-400">
                    Tổng: {totalRows}
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    Hợp lệ: {validRowsCount}
                  </div>
                  <div className="px-3 py-1.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl text-[10px] font-bold text-red-700 dark:text-red-400">
                    Bị lỗi: {invalidRowsCount}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-150 dark:border-slate-850 z-10">
                      <tr>
                        <th className="px-4 py-3 text-center">Dòng</th>
                        <th className="px-4 py-3">Họ và tên</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Vai trò</th>
                        <th className="px-4 py-3">Mã lớp / Năm học (UUID)</th>
                        <th className="px-4 py-3 text-center">Trạng thái</th>
                        <th className="px-4 py-3">Chi tiết lỗi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs text-slate-700 dark:text-slate-300">
                      {validatedRows.map((row) => (
                        <tr 
                          key={row.row_number} 
                          className={row.isValid ? 'hover:bg-slate-50/40 dark:hover:bg-slate-900/10' : 'bg-red-50/15 dark:bg-red-950/5 hover:bg-red-50/20 dark:hover:bg-red-950/10'}
                        >
                          <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-400">{row.row_number}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{row.full_name}</td>
                          <td className="px-4 py-3.5 font-medium truncate max-w-[180px]">{row.email || <span className="text-slate-400 italic">Trống</span>}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-500">{row.roles.join(', ')}</td>
                          <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400 leading-tight">
                            {row.class_id ? `Lớp: ${row.class_id.substring(0,8)}...` : ''}
                            {row.academic_year_id ? ` | Năm: ${row.academic_year_id.substring(0,8)}...` : ''}
                            {!row.class_id && !row.academic_year_id && <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                                Sẵn sàng
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400">
                                Bị lỗi
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-red-600 dark:text-red-450 font-bold leading-relaxed max-w-[220px] truncate" title={row.errors.join(' ')}>
                            {row.errors.length > 0 ? row.errors[0] : <span className="text-emerald-500">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action warnings */}
              {invalidRowsCount > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/40 rounded-2xl flex gap-2 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Hệ thống chỉ gửi các dòng Hợp lệ lên server. Các dòng Bị lỗi sẽ tự động bị bỏ qua.</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: RESULTS DISPLAY */}
          {step === 'result' && (
            <div className="space-y-4">
              {/* Success Banner */}
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl flex flex-col items-center justify-center text-center space-y-2 shrink-0">
                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-450" />
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">Hoàn tất xử lý yêu cầu!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-lg leading-relaxed">
                  Đã hoàn tất tiến trình khởi tạo. Các tài khoản có email sẽ nhận được thư điện tử mời kích hoạt. Với học sinh không email, vui lòng lưu lại Mã học sinh, Tên đăng nhập và Mật khẩu tạm thời hiển thị bên dưới.
                </p>
              </div>

              {/* Result Summary */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shrink-0">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Kết quả phân tích chi tiết</span>
                <button
                  onClick={handleDownloadResults}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-450 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 rounded-xl transition-all border border-blue-100 dark:border-blue-900/40 cursor-pointer"
                  id="btn-download-import-results"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Xuất file kết quả</span>
                </button>
              </div>

              {/* Results Table */}
              <div className="border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
                <div className="overflow-x-auto max-h-[250px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-150 dark:border-slate-850 z-10">
                      <tr>
                        <th className="px-4 py-3 text-center">Dòng</th>
                        <th className="px-4 py-3">Họ và tên</th>
                        <th className="px-4 py-3">Định danh / Email</th>
                        <th className="px-4 py-3">Mã học sinh</th>
                        <th className="px-4 py-3">Mật khẩu tạm</th>
                        <th className="px-4 py-3 text-center">Trạng thái</th>
                        <th className="px-4 py-3">Chi tiết / Lý do lỗi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-xs text-slate-700 dark:text-slate-300">
                      {importResults.map((row) => (
                        <tr key={row.row_number} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                          <td className="px-4 py-3 text-center font-mono font-bold text-slate-400">{row.row_number}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{row.full_name}</td>
                          <td className="px-4 py-3 font-medium truncate max-w-[200px]">
                            {row.login_identifier || row.email || <span className="text-slate-400 italic">Trống</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {row.student_code || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {row.temporary_password || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.success ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                                Thành công
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400">
                                Thất bại
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3 font-bold ${row.success ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-600 dark:text-red-450'}`}>
                            {row.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          {step === 'upload' && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer"
              id="btn-cancel-upload"
            >
              Hủy
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors cursor-pointer"
                id="btn-back-to-upload"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Chọn lại file</span>
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isSubmitting || validRowsCount === 0}
                className="flex items-center justify-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 rounded-xl transition-colors min-w-[160px] cursor-pointer"
                id="btn-confirm-import"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Nhập {validRowsCount} tài khoản</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer"
              id="btn-finish-import"
            >
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
