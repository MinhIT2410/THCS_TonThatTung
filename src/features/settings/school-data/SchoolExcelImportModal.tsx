/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { userCreationApi } from '../../users/userCreationApi';
import { env } from '../../../config/env';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2, X, AlertTriangle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  initialType?: EntityType;
}

type EntityType = 'student' | 'class' | 'subject' | 'classroom';

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

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

export default function SchoolExcelImportModal({ isOpen, onClose, onImportSuccess, initialType = 'student' }: ImportModalProps) {
  const [selectedType, setSelectedType] = useState<EntityType>(initialType);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedType(initialType);
      setFile(null);
      setError(null);
      setSuccess(null);
      setParsedRows([]);
    }
  }, [isOpen, initialType]);

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

          if (rawRows.length > 2000) {
            throw new Error('Số lượng dòng vượt quá giới hạn cho phép (tối đa 2000 dòng mỗi lần import).');
          }

          setProgress('Đang đối chiếu dữ liệu hệ thống để kiểm tra lỗi...');

          const validated: ParsedRow[] = [];

          if (type === 'student') {
            const { data: years } = await supabase.from('academic_years').select('id, name, code, is_active');
            const { data: classes } = await supabase.from('classes').select('id, name, code, academic_year_id, is_active');
            const { data: profiles } = await supabase.from('profiles').select('id, full_name, student_code');

            const internalDomain = (
              import.meta.env.VITE_STUDENT_INTERNAL_EMAIL_DOMAIN ||
              env.studentInternalEmailDomain ||
              ''
            ).trim().toLowerCase();

            if (!internalDomain) {
              throw new Error('Chưa cấu hình domain email nội bộ cho học sinh.');
            }

            const processedExcelStudentCodes = new Set<string>();
            const processedExcelUsernames = new Set<string>();
            const processedExcelEmails = new Set<string>();
            const processedClassSeqKeys = new Set<string>();

            rawRows.forEach((r, idx) => {
              const rowNumber = idx + 2;
              const errors: string[] = [];
              const warnings: string[] = [];

              const fullName = String(r.full_name || r['Họ và tên'] || r['Họ tên'] || r.name || '').trim();
              const yearInput = String(r.academic_year_code || r.academic_year_name || r['Năm học'] || r['Mã năm học'] || '').trim();
              const classInput = String(r.class_code || r['Mã lớp'] || r['Lớp'] || '').trim();
              const rawSeqInput = r.sequence_no !== undefined && r.sequence_no !== null && r.sequence_no !== ''
                ? String(r.sequence_no).trim()
                : (r['STT'] || r['Số thứ tự'] ? String(r['STT'] || r['Số thứ tự']).trim() : '');

              const excelUsername = String(r.username || r['Tên đăng nhập'] || '').trim().toLowerCase();
              const excelStudentCode = String(r.student_code || r['Mã học sinh'] || r['Mã HS'] || '').trim().toUpperCase();

              // Skip completely empty row (common in template files with pre-formatted rows)
              if (!fullName && !yearInput && !classInput && !rawSeqInput && !excelUsername && !excelStudentCode) {
                return;
              }

              // 1. Validate full_name
              if (!fullName) {
                errors.push('Họ và tên (full_name) không được bỏ trống.');
              }

              // 2. Validate academic_year_code
              let matchedYear: any = null;
              if (!yearInput) {
                errors.push('Mã năm học (academic_year_code) không được bỏ trống.');
              } else {
                matchedYear = years?.find(y =>
                  y.code?.toLowerCase() === yearInput.toLowerCase() ||
                  y.name?.toLowerCase() === yearInput.toLowerCase()
                );
                if (!matchedYear) {
                  errors.push(`Năm học "${yearInput}" không tồn tại trên hệ thống.`);
                }
              }

              // 3. Validate class_code
              let matchedClass: any = null;
              if (!classInput) {
                errors.push('Mã lớp (class_code) không được bỏ trống.');
              } else {
                const targetYearId = matchedYear?.id;
                matchedClass = classes?.find(c =>
                  (!targetYearId || c.academic_year_id === targetYearId) &&
                  c.code?.toLowerCase() === classInput.toLowerCase()
                );

                if (!matchedClass) {
                  const existsOtherYear = classes?.find(c => c.code?.toLowerCase() === classInput.toLowerCase());
                  if (existsOtherYear) {
                    errors.push(`Mã lớp "${classInput}" không thuộc năm học ${matchedYear?.name || yearInput}.`);
                  } else {
                    errors.push(`Mã lớp (class_code) "${classInput}" không tồn tại trên hệ thống.`);
                  }
                } else if (matchedClass.is_active === false) {
                  errors.push(`Lớp "${matchedClass.name}" (${matchedClass.code}) đang tạm ngưng hoạt động.`);
                }
              }

              // 4. Validate sequence_no
              let sequenceNo: number | null = null;
              if (!rawSeqInput) {
                errors.push('Số thứ tự (sequence_no) không được bỏ trống.');
              } else {
                const parsedSeq = Number(rawSeqInput);
                if (isNaN(parsedSeq) || !Number.isInteger(parsedSeq) || parsedSeq < 1 || parsedSeq > 9999) {
                  errors.push(`Số thứ tự (sequence_no) "${rawSeqInput}" phải là số nguyên từ 1 đến 9999.`);
                } else {
                  sequenceNo = parsedSeq;
                }
              }

              // 5. Sequence_no duplicate check per class & academic year
              if (matchedYear && matchedClass && sequenceNo) {
                const classSeqKey = `${matchedYear.id}_${matchedClass.id}_${sequenceNo}`;
                if (processedClassSeqKeys.has(classSeqKey)) {
                  errors.push(`Số thứ tự (sequence_no) ${sequenceNo} bị trùng lặp trong lớp "${matchedClass.code}" (${matchedYear.code}).`);
                } else {
                  processedClassSeqKeys.add(classSeqKey);
                }
              }

              // 6. Recalculate system username & student_code
              let systemUsername = '';
              let systemStudentCode = '';

              if (fullName && sequenceNo) {
                const seqStr = String(sequenceNo).padStart(3, '0');
                const cleanName = removeVietnameseTones(fullName);
                systemUsername = `${cleanName}${seqStr}`;
              }

              if (yearInput && classInput && sequenceNo) {
                const yearPrefix = yearInput.trim().slice(0, 4);
                const classCodeUpper = classInput.trim().toUpperCase();
                const seqStr = String(sequenceNo).padStart(3, '0');
                systemStudentCode = `${yearPrefix}-${classCodeUpper}-${seqStr}`;
              }

              // Check Excel values vs recalculation
              if (excelUsername && systemUsername && excelUsername !== systemUsername && excelUsername !== `${systemUsername}@${internalDomain}`) {
                warnings.push(`Username trong Excel ("${excelUsername}") khác giá trị tự sinh ("${systemUsername}"). Hệ thống sử dụng giá trị tự sinh.`);
              }
              const finalUsername = systemUsername;

              if (excelStudentCode && systemStudentCode && excelStudentCode !== systemStudentCode) {
                warnings.push(`Mã HS trong Excel ("${excelStudentCode}") khác mã tự sinh ("${systemStudentCode}"). Hệ thống sử dụng giá trị tự sinh.`);
              }
              const finalStudentCode = systemStudentCode;

              // 7. Check username duplicates
              if (finalUsername) {
                if (processedExcelUsernames.has(finalUsername)) {
                  errors.push(`Tên đăng nhập "${finalUsername}" bị trùng lặp trong tệp Excel.`);
                } else {
                  processedExcelUsernames.add(finalUsername);
                }
              }

              // 8. Check student_code format & duplicates
              if (finalStudentCode) {
                if (!/^[A-Z0-9-]+$/.test(finalStudentCode)) {
                  errors.push(`Mã học sinh "${finalStudentCode}" không đúng định dạng YYYY-CLASSCODE-NNN.`);
                }

                if (processedExcelStudentCodes.has(finalStudentCode)) {
                  errors.push(`Mã học sinh "${finalStudentCode}" bị trùng lặp trong tệp Excel.`);
                } else {
                  processedExcelStudentCodes.add(finalStudentCode);
                }

                const existsInDb = profiles?.some(p => p.student_code?.toUpperCase() === finalStudentCode.toUpperCase());
                if (existsInDb) {
                  errors.push(`Mã học sinh "${finalStudentCode}" đã tồn tại trên hệ thống.`);
                }
              }

              // 9. Email generation & duplicates
              const finalEmail = internalDomain && finalUsername ? `${finalUsername}@${internalDomain}` : finalUsername;

              if (finalEmail) {
                if (processedExcelEmails.has(finalEmail.toLowerCase())) {
                  errors.push(`Email nội bộ "${finalEmail}" bị trùng lặp trong tệp Excel.`);
                } else {
                  processedExcelEmails.add(finalEmail.toLowerCase());
                }
              }

              let detailsText = `STT: ${sequenceNo || 'Trống'} | Mã HS: ${finalStudentCode || 'Trống'} | Lớp: ${matchedClass?.code || classInput || 'Trống'} | Năm: ${matchedYear?.code || yearInput || 'Trống'} | Username: ${finalUsername || 'Trống'}`;
              if (warnings.length > 0) {
                detailsText += ` [${warnings.join('; ')}]`;
              }

              validated.push({
                index: idx,
                rowNumber,
                name: fullName || 'Học sinh',
                code: finalStudentCode,
                details: detailsText,
                isValid: errors.length === 0,
                errors,
                payload: {
                  row_number: rowNumber,
                  full_name: fullName,
                  student_code: finalStudentCode,
                  email: undefined,
                  roles: ['STUDENT'],
                  class_id: matchedClass?.id || null,
                  academic_year_id: matchedYear?.id || null,
                },
              });
            });

          } else if (type === 'class') {
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
    if (selectedType === 'student') {
      const headers = [
        'full_name',
        'academic_year_code',
        'class_code',
        'sequence_no',
        'is_active',
        'temporary_password'
      ];

      const rowsData: any[][] = [headers];

      for (let i = 2; i <= 1001; i++) {
        if (i === 2) {
          rowsData.push(['Nguyễn Văn A', '2026-2027', 'LH61', 1, 'TRUE', 'Student@2026']);
        } else if (i === 3) {
          rowsData.push(['Trần Thị B', '2026-2027', 'LH61', 2, 'TRUE', 'Student@2026']);
        } else {
          rowsData.push(['', '', '', '', 'TRUE', 'Student@2026']);
        }
      }

      const wsStudent = XLSX.utils.aoa_to_sheet(rowsData);

      // Column widths, frozen panes, autofilter
      wsStudent['!cols'] = [
        { wch: 22 }, // full_name
        { wch: 20 }, // academic_year_code
        { wch: 15 }, // class_code
        { wch: 14 }, // sequence_no
        { wch: 12 }, // is_active
        { wch: 20 }, // temporary_password
      ];
      wsStudent['!views'] = [{ state: 'frozen', ySplit: 1 }];
      wsStudent['!autofilter'] = { ref: 'A1:F1001' };
      (wsStudent as any)['!dataValidation'] = [
        {
          sqref: 'D2:D9999',
          type: 'whole',
          operator: 'between',
          formula1: 1,
          formula2: 9999,
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: 'Lỗi nhập liệu',
          error: 'Số thứ tự (sequence_no) phải là số nguyên từ 1 đến 9999.'
        }
      ];

      // Guide sheet
      const huongDanRows = [
        ['TỆP EXCEL MẪU NHẬP DỮ LIỆU HỌC SINH'],
        [''],
        ['HƯỚNG DẪN NHẬP LIỆU:'],
        ['1. Chỉ nhập dữ liệu vào các cột: full_name, academic_year_code, class_code, sequence_no, is_active, temporary_password.'],
        ['2. HỆ THỐNG TỰ ĐỘNG SINH username và student_code từ họ tên, năm học, mã lớp và số thứ tự khi upload:'],
        ['   - username = họ tên viết liền không dấu + số thứ tự (ví dụ: nguyenvana001 hoặc nguyenvana1000)'],
        ['   - student_code = YYYY-CLASSCODE-NNN (ví dụ: 2026-LH61-001 hoặc 2026-LH61-1000)'],
        ['   - email nội bộ = username@domain (ví dụ: nguyenvana001@school.edu.vn)'],
        ['3. full_name: Nhập họ và tên đầy đủ của học sinh (ví dụ: Nguyễn Văn A).'],
        ['4. academic_year_code: Nhập mã năm học hợp lệ đã có trong hệ thống (ví dụ: 2026-2027).'],
        ['5. class_code: Nhập mã lớp (class_code) thực tế trong hệ thống (ví dụ: LH61). Không dùng tên lớp (ví dụ 6/1).'],
        ['6. sequence_no: Nhập số thứ tự học sinh trong lớp (từ 1 đến 9999). Không trùng lặp trong cùng một lớp và năm học.'],
        ['7. is_active: Nhập TRUE (đang học) hoặc FALSE (ngừng học).'],
        ['8. temporary_password: Mật khẩu khởi tạo ban đầu cho tài khoản học sinh.'],
      ];
      const wsHuongDan = XLSX.utils.aoa_to_sheet(huongDanRows);
      wsHuongDan['!cols'] = [{ wch: 110 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsStudent, 'Hoc_sinh');
      XLSX.utils.book_append_sheet(wb, wsHuongDan, 'Huong_dan');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const fileName = 'Template_nhap_student.xlsx';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      return;
    }

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

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const fileName = `Template_nhap_${selectedType}.xlsx`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
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

    try {
      if (selectedType === 'student') {
        const payloads = validRows.map(r => r.payload);
        const BATCH_SIZE = 25;
        const allResults: any[] = [];
        const batchErrors: string[] = [];

        for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
          const batch = payloads.slice(i, i + BATCH_SIZE);
          const currentEnd = Math.min(i + BATCH_SIZE, payloads.length);
          setProgress(`Đang khởi tạo tài khoản học sinh (${i + 1}-${currentEnd}/${payloads.length})...`);

          try {
            const result = await userCreationApi.createManyUsers(batch);

            if (result && result.success === false) {
              throw new Error(result.message || `Lỗi xảy ra ở lô học sinh từ ${i + 1} đến ${currentEnd}.`);
            }

            if (result?.data && Array.isArray(result.data)) {
              allResults.push(...result.data);
            }
          } catch (batchErr: any) {
            console.error('Batch error:', batchErr);
            batchErrors.push(`Lô ${i + 1}-${currentEnd}: ${batchErr.message || 'Lỗi kết nối máy chủ'}`);
          }
        }

        const successResults = allResults.filter((r: any) => r.success === true);
        const failedResults = allResults.filter((r: any) => r.success === false);

        const successCount = successResults.length;
        const failCount = failedResults.length + (payloads.length - allResults.length);

        if (successCount === 0) {
          const sampleErr = failedResults[0]?.error || batchErrors[0] || 'Lỗi không xác định khi lưu vào CSDL';
          throw new Error(`Tất cả ${payloads.length} học sinh đều tạo thất bại. Chi tiết lỗi: ${sampleErr}`);
        }

        if (failCount > 0) {
          const firstFail = failedResults[0];
          const sampleErr = firstFail ? `Dòng ${firstFail.row_number || '?'}: ${firstFail.error || 'Lỗi không xác định'}` : batchErrors[0] || '';
          setSuccess(`Thành công: ${successCount}/${payloads.length} học sinh | Thất bại: ${failCount} học sinh (${sampleErr}).`);
        } else {
          setSuccess(`Tạo thành công toàn bộ ${successCount}/${payloads.length} học sinh vào hệ thống (gồm Auth, Profiles, Roles, Enrollments)!`);
        }

        onImportSuccess();
        setFile(null);
        setParsedRows([]);
        return;
      }

      const table = selectedType === 'class' ? 'classes' : selectedType === 'subject' ? 'subjects' : 'classrooms';
      const payloads = validRows.map(r => r.payload);
      const BATCH_SIZE = 100;

      for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
        const batch = payloads.slice(i, i + BATCH_SIZE);
        const currentEnd = Math.min(i + BATCH_SIZE, payloads.length);
        setProgress(`Đang lưu dữ liệu (${currentEnd}/${payloads.length})...`);

        const { error: insertErr } = await supabase.from(table).insert(batch);
        if (insertErr) throw insertErr;
      }

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
          <div className="shrink-0 mb-4">
            <label className="font-bold text-slate-500 block mb-3">Bước 1: Chọn bảng dữ liệu cần nhập</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {[
                { type: 'student', label: 'Học sinh' },
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
              type="button"
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
