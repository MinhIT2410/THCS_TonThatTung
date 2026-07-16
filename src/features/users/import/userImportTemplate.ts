/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';

export const downloadImportTemplate = (classes: any[], academicYears: any[]) => {
  // We can include a few rows of realistic examples
  const activeYear = academicYears.find(y => y.is_active) || academicYears[0];
  const sampleClass = classes[0];

  const classIdExample = sampleClass ? sampleClass.id : '00000000-0000-0000-0000-000000000000';
  const yearIdExample = activeYear ? activeYear.id : '00000000-0000-0000-0000-000000000000';

  const templateRows = [
    {
      'Họ và tên (Bắt buộc)': 'Nguyễn Văn A',
      'Mã học sinh (Chỉ cho STUDENT)': 'HS000001',
      'Email (Bắt buộc)': 'nguyenvana@school.edu.vn',
      'Vai trò (STUDENT, TEACHER, STAFF,...)': 'STUDENT',
      'Mã lớp học (UUID - Chỉ cho STUDENT)': classIdExample,
      'Mã năm học (UUID - Chỉ cho STUDENT)': yearIdExample
    },
    {
      'Họ và tên (Bắt buộc)': 'Lê Văn C (Học sinh không email)',
      'Mã học sinh (Chỉ cho STUDENT)': 'HS000002',
      'Email (Bắt buộc)': '',
      'Vai trò (STUDENT, TEACHER, STAFF,...)': 'STUDENT',
      'Mã lớp học (UUID - Chỉ cho STUDENT)': classIdExample,
      'Mã năm học (UUID - Chỉ cho STUDENT)': yearIdExample
    },
    {
      'Họ và tên (Bắt buộc)': 'Trần Thị B',
      'Mã học sinh (Chỉ cho STUDENT)': '',
      'Email (Bắt buộc)': 'tranthib@school.edu.vn',
      'Vai trò (STUDENT, TEACHER, STAFF,...)': 'TEACHER',
      'Mã lớp học (UUID - Chỉ cho STUDENT)': '',
      'Mã năm học (UUID - Chỉ cho STUDENT)': ''
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Tao_Tai_Khoan');

  // Add a sheet with classes and academic years for convenient copy-paste of UUIDs
  if (classes.length > 0) {
    const classRows = classes.map(c => ({
      'ID Lớp học (Copy cột này)': c.id,
      'Tên lớp': `Lớp ${c.name}`,
      'Khối': c.grade_level
    }));
    const classSheet = XLSX.utils.json_to_sheet(classRows);
    XLSX.utils.book_append_sheet(workbook, classSheet, 'Danh_Sach_Lop');
  }

  if (academicYears.length > 0) {
    const yearRows = academicYears.map(y => ({
      'ID Năm học (Copy cột này)': y.id,
      'Tên năm học': y.name,
      'Trạng thái': y.is_active ? 'Đang hoạt động' : 'Không hoạt động'
    }));
    const yearSheet = XLSX.utils.json_to_sheet(yearRows);
    XLSX.utils.book_append_sheet(workbook, yearSheet, 'Danh_Sach_Nam_Hoc');
  }

  XLSX.writeFile(workbook, 'mau_tao_tai_khoan_hoc_sinh.xlsx');
};
