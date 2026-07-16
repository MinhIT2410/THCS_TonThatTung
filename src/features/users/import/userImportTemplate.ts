/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';

export const downloadImportTemplate = (classes: any[], academicYears: any[]) => {
  // 1. Tai_khoan sheet data
  const accountRows = [
    {
      full_name: 'Nguyễn Văn An',
      student_code: 'HS000001',
      email: '',
      roles: 'STUDENT',
      class_name: '6A1',
      academic_year_name: '2026-2027'
    },
    {
      full_name: 'Trần Thị Bé',
      student_code: 'HS000002',
      email: '',
      roles: 'STUDENT',
      class_name: '6A1',
      academic_year_name: '2026-2027'
    },
    {
      full_name: 'Lê Văn C',
      student_code: '',
      email: 'gv1@gmail.com',
      roles: 'TEACHER',
      class_name: '',
      academic_year_name: ''
    }
  ];

  // 2. Danh_sach_lop sheet data
  let classRows: any[] = [];
  if (classes && classes.length > 0) {
    classRows = classes.map(c => ({
      class_name: c.name,
      grade_level: c.grade_level || ''
    }));
  } else {
    classRows = [
      {
        class_name: 'Không tải được danh sách lớp. Vui lòng kiểm tra cấu hình hệ thống.',
        grade_level: ''
      }
    ];
  }

  // 3. Nam_hoc sheet data
  let yearRows: any[] = [];
  if (academicYears && academicYears.length > 0) {
    yearRows = academicYears.map(y => ({
      academic_year_name: y.name,
      start_date: y.start_date || '',
      end_date: y.end_date || '',
      is_current: y.is_active ? 'TRUE' : 'FALSE'
    }));
  } else {
    yearRows = [
      {
        academic_year_name: 'Không tải được danh sách năm học. Vui lòng kiểm tra cấu hình hệ thống.',
        start_date: '',
        end_date: '',
        is_current: ''
      }
    ];
  }

  // 4. Huong_dan sheet data
  const instructionRows = [
    { 'Quy tắc chuẩn bị dữ liệu': 'Họ tên (full_name)', 'Mô tả chi tiết': 'Bắt buộc nhập.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Vai trò (roles)', 'Mô tả chi tiết': 'Bắt buộc nhập. Các vai trò hợp lệ: SUPER_ADMIN, PRINCIPAL, VICE_PRINCIPAL, CONTENT_EDITOR, STAFF, TEACHER, STUDENT.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Mã học sinh (student_code)', 'Mô tả chi tiết': 'Bắt buộc nhập đối với vai trò STUDENT.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Tên lớp học (class_name)', 'Mô tả chi tiết': 'Bắt buộc nhập đối với vai trò STUDENT. Vui lòng copy chính xác tên lớp học ở sheet Danh_sach_lop.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Tên năm học (academic_year_name)', 'Mô tả chi tiết': 'Bắt buộc nhập đối với vai trò STUDENT. Vui lòng copy chính xác tên năm học ở sheet Nam_hoc.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Email', 'Mô tả chi tiết': 'Bắt buộc nhập đối với các vai trò không phải STUDENT.' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Phân cách vai trò', 'Mô tả chi tiết': 'Nhiều vai trò có thể được khai báo phân cách bằng dấu phẩy (ví dụ: TEACHER,STAFF).' },
    { 'Quy tắc chuẩn bị dữ liệu': 'Giới hạn số lượng', 'Mô tả chi tiết': 'Tối đa 100 tài khoản mỗi lần nhập để đảm bảo hiệu năng tối ưu.' }
  ];

  const workbook = XLSX.utils.book_new();

  // Create sheets and append
  const worksheetAccounts = XLSX.utils.json_to_sheet(accountRows);
  XLSX.utils.book_append_sheet(workbook, worksheetAccounts, 'Tai_khoan');

  const worksheetClasses = XLSX.utils.json_to_sheet(classRows);
  XLSX.utils.book_append_sheet(workbook, worksheetClasses, 'Danh_sach_lop');

  const worksheetYears = XLSX.utils.json_to_sheet(yearRows);
  XLSX.utils.book_append_sheet(workbook, worksheetYears, 'Nam_hoc');

  const worksheetInstructions = XLSX.utils.json_to_sheet(instructionRows);
  XLSX.utils.book_append_sheet(workbook, worksheetInstructions, 'Huong_dan');

  // Trigger download
  XLSX.writeFile(workbook, 'mau_tao_tai_khoan.xlsx');
};
