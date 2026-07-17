/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, X, AlertTriangle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

type EntityType = 'class' | 'subject' | 'classroom';

interface ParsedRow {
  index: number;
  rowNumber: number;
  name: string;
  code: string;
  details: string;
  isValid: boolean;
  errors: string[];
  payload: any;
}

export default function SchoolExcelImportModal({ isOpen, onClose, onImportSuccess }: ImportModalProps) {
  const [selectedType, setSelectedType] = useState<EntityType>('class');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

  if (!isOpen) return null;

  const handleTypeChange = (type: EntityType) => {
    setSelectedType(type);
    setFile(null);
    setError(null);
    setSuccess(null);
    setParsedRows([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
      setParsedRows([]);
      parseAndValidateFile(selectedFile, selectedType);
    }
  };

  const parseAndValidateFile = async (selectedFile: File, type: EntityType) => {
    setParsing(true);
    setError(null);
    setSuccess(null);
    setProgress('Đang đọc và phân tích dữ liệu tệp Excel...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) throw new Error('Không thể đọc nội dung file.');

          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

          if (rawRows.length === 0) {
            throw new Error('Tệp Excel rỗng hoặc không đúng định dạng.');
          }

          if (rawRows.length > 100) {
            throw new Error('Số lượng dòng vượt quá giới hạn cho phép (tối đa 100 dòng mỗi lần import).');
          }

          setProgress('Đang đối chiếu dữ liệu hệ thống để kiểm tra lỗi...');

          const validated: ParsedRow[] = [];

          if (type === 'class') {
            // Fetch system mappings
            const { data: grades } = await supabase.from('grade_levels').select('id, name');
            const { data: years } = await supabase.from('academic_years').select('id, name');
            const { data: rooms } = await supabase.from('classrooms').select('id, code');
            const { data: existingClasses } = await supabase.from('classes').select('name, academic_year_id');

            // Set to keep track of class name duplicates in Excel itself
            const processedExcelNames = new Set<string>();

            rawRows.forEach((r, idx) => {
              const rowNumber = idx + 2;
              const errors: string[] = [];
              const name = r.name ? String(r.name).trim() : '';
              const code = r.code ? String(r.code).trim().toUpperCase() : '';
              const gradeName = r.grade_level_name ? String(r.grade_level_name).trim() : '';
              const yearName = r.academic_year_name ? String(r.academic_year_name).trim() : '';
              const classroomCode = r.primary_classroom_code ? String(r.primary_classroom_code).trim().toUpperCase() : '';

              if (!name) {
                errors.push('Tên lớp không được bỏ trống.');
              }

              const matchedGrade = grades?.find(g => g.name.toLowerCase() === gradeName.toLowerCase());
              if (!gradeName) {
                errors.push('Tên khối lớp không được bỏ trống.');
              } else if (!matchedGrade) {
                errors.push(`Khối lớp "${gradeName}" không tồn tại trên hệ thống.`);
              }

              const matchedYear = years?.find(y => y.name.toLowerCase() === yearName.toLowerCase());
              if (!yearName) {
                errors.push('Tên năm học không được bỏ trống.');
              } else if (!matchedYear) {
                errors.push(`Năm học "${yearName}" không tồn tại trên hệ thống.`);
              }

              let primary_classroom_id = null;
              if (classroomCode) {
                const matchedRoom = rooms?.find(rm => rm.code.toLowerCase() === classroomCode.toLowerCase());
                if (!matchedRoom) {
                  errors.push(`Mã phòng học "${classroomCode}" không tồn tại.`);
                } else {
                  primary_classroom_id = matchedRoom.id;
                }
              }

              // Check duplicates in Excel
              const excelKey = `${name.toLowerCase()}||${matchedYear?.id}`;
              if (matchedYear && name) {
                if (processedExcelNames.has(excelKey)) {
                  errors.push(`Tên lớp bị trùng lặp trong tệp Excel cho cùng năm học.`);
                } else {
                  processedExcelNames.add(excelKey);
                }

                // Check duplicates in system database
                const existsInDb = existingClasses?.some(
                  c => c.name.toLowerCase() === name.toLowerCase() && c.academic_year_id === matchedYear.id
                );
                if (existsInDb) {
                  errors.push(`Lớp "${name}" đã tồn tại trong năm học này trên hệ thống.`);
                }
              }

              let parsedGradeNumber = 6;
              if (gradeName) {
                const numMatch = gradeName.match(/\d+/);
                if (numMatch) parsedGradeNumber = parseInt(numMatch[0]);
              }

              validated.push({
                index: idx,
                rowNumber,
                name,
                code,
                details: `Năm: ${yearName || 'Trống'} | Khối: ${gradeName || 'Trống'} ${classroomCode ? `| Phòng: ${classroomCode}` : ''}`,
                isValid: errors.length === 0,
                errors,
                payload: {
                  name,
                  code: code || null,
                  grade_level_id: matchedGrade?.id || null,
                  academic_year_id: matchedYear?.id || null,
                  expected_capacity: r.expected_capacity ? parseInt(r.expected_capacity) : 40,
                  primary_classroom_id,
                  grade_level: parsedGradeNumber,
                  is_active: true,
                },
              });
            });

          } else if (type === 'subject') {
            const { data: depts } = await supabase.from('departments').select('id, code');
            const { data: existingSubjects } = await supabase.from('subjects').select('code');

            const processedExcelCodes = new Set<string>();

            rawRows.forEach((r, idx) => {
              const rowNumber = idx + 2;
              const errors: string[] = [];
              const name = r.name ? String(r.name).trim() : '';
              const code = r.code ? String(r.code).trim().toUpperCase() : '';
              const deptCode = r.department_code ? String(r.department_code).trim().toLowerCase() : '';

              if (!name) {
                errors.push('Tên môn học không được bỏ trống.');
              }
              if (!code) {
                errors.push('Mã môn học không được bỏ trống.');
              } else {
                if (processedExcelCodes.has(code)) {
                  errors.push(`Mã môn học "${code}" bị trùng lặp trong tệp Excel.`);
                } else {
                  processedExcelCodes.add(code);
                }

                const existsInDb = existingSubjects?.some(s => s.code.toUpperCase() === code);
                if (existsInDb) {
                  errors.push(`Mã môn học "${code}" đã tồn tại trên hệ thống.`);
                }
              }

              let department_id = null;
              if (deptCode) {
                const matchedDept = depts?.find(d => d.code?.toLowerCase() === deptCode);
                if (!matchedDept) {
                  errors.push(`Mã tổ chuyên môn "${deptCode}" không tồn tại.`);
                } else {
                  department_id = matchedDept.id;
                }
              }

              validated.push({
                index: idx,
                rowNumber,
                name,
                code,
                details: `Môn: ${name} | Tổ chuyên môn: ${deptCode || 'Không'}`,
                isValid: errors.length === 0,
                errors,
                payload: {
                  name,
                  code,
                  department_id,
                  description: r.description ? String(r.description).trim() : null,
                  is_active: true,
                },
              });
            });

          } else if (type === 'classroom') {
            const { data: existingClassrooms } = await supabase.from('classrooms').select('code');
            const processedExcelCodes = new Set<string>();

            rawRows.forEach((r, idx) => {
              const rowNumber = idx + 2;
              const errors: string[] = [];
              const name = r.name ? String(r.name).trim() : '';
              const code = r.code ? String(r.code).trim().toUpperCase() : '';

              if (!name) {
                errors.push('Tên phòng học không được bỏ trống.');
              }
              if (!code) {
                errors.push('Mã phòng học không được bỏ trống.');
              } else {
                if (processedExcelCodes.has(code)) {
                  errors.push(`Mã phòng học "${code}" bị trùng lặp trong tệp Excel.`);
                } else {
                  processedExcelCodes.add(code);
                }

                const existsInDb = existingClassrooms?.some(c => c.code.toUpperCase() === code);
                if (existsInDb) {
                  errors.push(`Mã phòng học "${code}" đã tồn tại trên hệ thống.`);
                }
              }

              validated.push({
                index: idx,
                rowNumber,
                name,
                code,
                details: `Phòng: ${name} | Sức chứa: ${r.capacity || '40'} | Loại: ${r.room_type || 'THEORY'}`,
                isValid: errors.length === 0,
                errors,
                payload: {
                  name,
                  code,
                  capacity: r.capacity ? parseInt(r.capacity) : 40,
                  room_type: r.room_type || 'THEORY',
                  building: r.building ? String(r.building).trim() : null,
                  floor: r.floor ? parseInt(r.floor) : null,
                  is_active: true,
                },
              });
            });
          }

          setParsedRows(validated);
        } catch (err: any) {
          console.error(err);
          setError('Lỗi phân tích dữ liệu: ' + (err.message || err));
        } finally {
          setParsing(false);
          setProgress(null);
        }
      };

      reader.readAsBinaryString(selectedFile);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi tải tệp: ' + err.message);
      setParsing(false);
      setProgress(null);
    }
  };

  const downloadTemplate = () => {
    let headers: string[] = [];
    let sampleData: any[] = [];
    let sheetName = '';

    if (selectedType === 'class') {
      sheetName = 'Lớp_học';
      headers = ['name', 'code', 'grade_level_name', 'academic_year_name', 'expected_capacity', 'primary_classroom_code'];
      sampleData = [
        {
          name: '6A1',
          code: 'LH6A1',
          grade_level_name: 'Khối 6',
          academic_year_name: 'Năm học 2026-2027',
          expected_capacity: 40,
          primary_classroom_code: 'P101',
        },
        {
          name: '7A1',
          code: 'LH7A1',
          grade_level_name: 'Khối 7',
          academic_year_name: 'Năm học 2026-2027',
          expected_capacity: 42,
          primary_classroom_code: 'P102',
        },
      ];
    } else if (selectedType === 'subject') {
      sheetName = 'Môn_học';
      headers = ['name', 'code', 'department_code', 'description'];
      sampleData = [
        {
          name: 'Toán học',
          code: 'TOAN',
          department_code: 'to-tu-nhien',
          description: 'Môn toán đại số & hình học THCS',
        },
        {
          name: 'Ngữ văn',
          code: 'VAN',
          department_code: 'to-xa-hoi',
          description: 'Môn văn học & tiếng Việt THCS',
        },
      ];
    } else if (selectedType === 'classroom') {
      sheetName = 'Phòng_học';
      headers = ['name', 'code', 'capacity', 'room_type', 'building', 'floor'];
      sampleData = [
        {
          name: 'Phòng 101',
          code: 'P101',
          capacity: 45,
          room_type: 'THEORY',
          building: 'Nhà A',
          floor: 1,
        },
        {
          name: 'Phòng thực hành Tin',
          code: 'P_TIN',
          capacity: 35,
          room_type: 'PRACTICE',
          building: 'Nhà B',
          floor: 3,
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Template_nhap_${selectedType}.xlsx`);
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setError('Không có dòng dữ liệu hợp lệ nào để nhập.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(`Đang tải lên ${validRows.length} dòng dữ liệu hợp lệ...`);

    try {
      const table = selectedType === 'class' ? 'classes' : selectedType === 'subject' ? 'subjects' : 'classrooms';
      const payloads = validRows.map(r => r.payload);

      const { error: insertErr } = await supabase.from(table).insert(payloads);
      if (insertErr) throw insertErr;

      setSuccess(`Đã nhập dữ liệu thành công cho ${payloads.length} bản ghi hợp lệ!`);
      if (validRows.length < parsedRows.length) {
        setSuccess(`Đã nhập thành công ${payloads.length} bản ghi hợp lệ. Bỏ qua ${parsedRows.length - validRows.length} bản ghi có lỗi.`);
      }

      onImportSuccess();
      setFile(null);
      setParsedRows([]);
    } catch (err: any) {
      console.error(err);
      setError('Lỗi khi lưu dữ liệu vào hệ thống: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans" id="school-excel-import-modal">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-2.5 shrink-0">
          <FileSpreadsheet className="h-6 w-6 text-emerald-600 shrink-0" />
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Nhập dữ liệu từ tệp Excel
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Hệ thống kiểm tra trực quan, tự động map ID và hỗ trợ sửa lỗi từng dòng trước khi nhập.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50/50 border border-red-100 text-red-800 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-xl text-xs font-medium shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50/50 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 rounded-xl text-xs font-medium shrink-0">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-4 text-xs overflow-y-auto flex-1 pr-1 pb-1">
          {/* Select Import Type */}
          <div className="space-y-1.5 shrink-0">
            <label className="font-bold text-slate-500">Bước 1: Chọn bảng dữ liệu cần nhập</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'class', label: 'Lớp học' },
                { type: 'subject', label: 'Môn học' },
                { type: 'classroom', label: 'Phòng học' },
              ].map(item => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleTypeChange(item.type as EntityType)}
                  className={`py-2.5 px-4 font-bold border rounded-xl text-center transition-all ${
                    selectedType === item.type
                      ? 'border-emerald-500 bg-emerald-50/10 text-emerald-700 dark:text-emerald-400 font-extrabold'
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Download template */}
          <div className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-2xl shrink-0">
            <div className="space-y-0.5">
              <p className="font-bold text-slate-700 dark:text-slate-300">Tệp Excel mẫu chuẩn</p>
              <p className="text-[10px] text-slate-400">Tải xuống tệp mẫu cấu hình sẵn để điền thông tin.</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="px-3.5 py-1.5 font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-900/20"
            >
              Tải tệp mẫu
            </button>
          </div>

          {/* Step 3: Choose file */}
          <div className="space-y-1.5 shrink-0">
            <label className="font-bold text-slate-500">Bước 2: Chọn tệp Excel của bạn</label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors relative cursor-pointer">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={parsing || loading}
              />
              <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {file ? file.name : 'Nhấp để duyệt tệp hoặc kéo thả tệp vào đây'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Tối đa 100 dòng dữ liệu để đảm bảo hiệu năng</p>
            </div>
          </div>

          {/* Step 4: Preview Table */}
          {parsing && (
            <div className="flex items-center justify-center py-8 space-x-2 shrink-0">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              <span className="text-slate-500 font-medium">Đang xử lý phân tích và validate dữ liệu...</span>
            </div>
          )}

          {!parsing && parsedRows.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-850">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500">Bước 3: Xem trước dữ liệu và sửa lỗi</span>
                <div className="flex items-center space-x-2.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-55 bg-emerald-100 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400">
                    Hợp lệ: {validCount}
                  </span>
                  {errorCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/25 text-red-700 dark:text-red-400">
                      Lỗi: {errorCount}
                    </span>
                  )}
                </div>
              </div>

              {errorCount > 0 && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400 rounded-xl text-[10px] flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                  <p className="leading-relaxed">
                    Có {errorCount} dòng dữ liệu không hợp lệ (màu đỏ). Những dòng này sẽ <strong>tự động bị loại bỏ</strong> khi bạn thực hiện lưu. Bạn có thể sửa tệp Excel rồi tải lại.
                  </p>
                </div>
              )}

              {/* Scrollable list of rows */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-slate-500 w-16">Dòng Excel</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-500">Chi tiết dữ liệu</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-500 w-24">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.map((pRow) => (
                      <tr key={pRow.index} className={pRow.isValid ? 'hover:bg-slate-50/50 dark:hover:bg-slate-900/50' : 'bg-red-50/10 dark:bg-red-950/10'}>
                        <td className="px-3 py-2 font-mono font-bold text-slate-400 text-center">#{pRow.rowNumber}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{pRow.name || <em className="text-slate-400">Trống</em>} {pRow.code && `(${pRow.code})`}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{pRow.details}</div>
                          {!pRow.isValid && (
                            <div className="text-red-500 dark:text-red-400 font-bold mt-1 space-y-0.5">
                              {pRow.errors.map((err, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {pRow.isValid ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Hợp lệ</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-red-600 dark:text-red-400 font-bold">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span>Lỗi</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Action controls */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
            disabled={loading || parsing}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || parsing || parsedRows.length === 0 || validCount === 0}
            className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:dark:bg-slate-900 disabled:text-slate-400 rounded-xl transition-all shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{progress || 'Đang lưu dữ liệu...'}</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Lưu {validCount} dòng hợp lệ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
