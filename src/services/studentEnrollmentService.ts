/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabaseClient';

export interface StudentEnrollmentItem {
  id: string; // student user id
  full_name: string;
  student_code: string | null;
  is_active: boolean;
  created_at: string;
  enrollment: {
    id: string; // enrollment record id
    class_id: string;
    class_name: string;
    class_code: string | null;
    academic_year_id: string;
    academic_year_name: string;
  } | null;
}

export interface FetchStudentsParams {
  academicYearId?: string;
  classId?: string; // 'all' | 'unassigned' | specific class_id
  search?: string;
  isActive?: boolean | null;
  unassignedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export const studentEnrollmentService = {
  /**
   * Fetch all academic years
   */
  async getAcademicYears() {
    const { data, error } = await supabase
      .from('academic_years')
      .select('id, name, code, is_active, is_current')
      .order('is_current', { ascending: false })
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching academic years:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Fetch classes for a given academic year or all active classes
   */
  async getClassesByAcademicYear(academicYearId?: string) {
    let query = supabase
      .from('classes')
      .select('id, name, code, grade_level_id, academic_year_id, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }
    return data || [];
  },

  /**
   * Fetch list of students with enrollment info for specified academic year using paginated RPC
   */
  async getStudentsWithEnrollment(params: FetchStudentsParams) {
    const {
      academicYearId,
      classId = 'all',
      search,
      isActive = null,
      unassignedOnly = false,
      page = 1,
      pageSize = 50,
    } = params;

    let targetClassId: string | null = null;
    let targetUnassignedOnly = unassignedOnly;

    if (classId === 'unassigned') {
      targetUnassignedOnly = true;
      targetClassId = null;
    } else if (classId && classId !== 'all') {
      targetClassId = classId;
    }

    const { data, error } = await supabase.rpc('get_students_with_enrollment', {
      p_academic_year_id: academicYearId || null,
      p_class_id: targetClassId,
      p_search: search?.trim() || null,
      p_is_active: isActive ?? null,
      p_unassigned_only: targetUnassignedOnly,
      p_page: page,
      p_page_size: pageSize,
    });

    if (error) {
      console.error('Error fetching students via RPC:', error);
      throw error;
    }

    const students: StudentEnrollmentItem[] = (data || []).map((row: any) => ({
      id: row.student_id,
      full_name: row.full_name || 'Chưa đặt tên',
      student_code: row.student_code || null,
      is_active: row.is_active ?? true,
      created_at: new Date().toISOString(),
      enrollment: row.class_id ? {
        id: `${row.student_id}_${row.academic_year_id || 'no_year'}`,
        class_id: row.class_id,
        class_name: row.class_name || '---',
        class_code: null,
        academic_year_id: row.academic_year_id || '',
        academic_year_name: row.academic_year_name || '---',
      } : null,
    }));

    const totalCount = data && data.length > 0 ? Number(data[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      students,
      totalCount,
      data: students,
      total: totalCount,
      page,
      totalPages,
    };
  },

  /**
   * Assign or bulk-assign students to a class for a specific academic year
   */
  async assignStudentsToClass(studentIds: string[], classId: string, academicYearId: string) {
    if (!studentIds || studentIds.length === 0) return [];
    if (!classId) throw new Error('Vui lòng chọn lớp học.');
    if (!academicYearId) throw new Error('Vui lòng chọn năm học.');

    const records = studentIds.map(studentId => ({
      student_id: studentId,
      class_id: classId,
      academic_year_id: academicYearId,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('student_enrollments')
      .upsert(records, { onConflict: 'student_id,academic_year_id' })
      .select();

    if (error) {
      console.error('Error assigning students to class:', error);
      throw error;
    }

    return data;
  },

  /**
   * Transfer a single student to a new class in the given academic year
   */
  async transferStudentClass(studentId: string, newClassId: string, academicYearId: string) {
    return this.assignStudentsToClass([studentId], newClassId, academicYearId);
  },
};
