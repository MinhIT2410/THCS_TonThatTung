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
   * Fetch list of students with enrollment info for specified academic year
   */
  async getStudentsWithEnrollment(params: FetchStudentsParams) {
    const {
      academicYearId,
      classId = 'all',
      search,
      isActive = null,
      page = 1,
      pageSize = 20,
    } = params;

    // 1. Get student user_ids from user_roles
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_code', 'STUDENT');

    if (rolesError) {
      console.error('Error fetching student roles:', rolesError);
      throw rolesError;
    }

    const studentIds = (userRoles || []).map((ur: any) => ur.user_id);
    if (studentIds.length === 0) {
      return { data: [], total: 0, page, totalPages: 0 };
    }

    // 2. Fetch profiles
    let profileQuery = supabase
      .from('profiles')
      .select('id, full_name, student_code, is_active, created_at')
      .in('id', studentIds)
      .order('full_name', { ascending: true });

    if (isActive !== null) {
      profileQuery = profileQuery.eq('is_active', isActive);
    }

    if (search && search.trim()) {
      const term = search.trim();
      profileQuery = profileQuery.or(`full_name.ilike.%${term}%,student_code.ilike.%${term}%`);
    }

    const { data: profiles, error: profileError } = await profileQuery;
    if (profileError) {
      console.error('Error fetching student profiles:', profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      return { data: [], total: 0, page, totalPages: 0 };
    }

    // 3. Fetch enrollments for filtered student profiles
    const profileIds = profiles.map(p => p.id);
    let enrollmentQuery = supabase
      .from('student_enrollments')
      .select('id, student_id, class_id, academic_year_id, classes(id, name, code), academic_years(id, name)')
      .in('student_id', profileIds);

    if (academicYearId) {
      enrollmentQuery = enrollmentQuery.eq('academic_year_id', academicYearId);
    }

    const { data: enrollments, error: enrollError } = await enrollmentQuery;
    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      throw enrollError;
    }

    // Map enrollments by student_id
    const enrollmentMap = new Map<string, any>();
    (enrollments || []).forEach((e: any) => {
      enrollmentMap.set(e.student_id, {
        id: e.id,
        class_id: e.class_id,
        class_name: e.classes?.name || '---',
        class_code: e.classes?.code || null,
        academic_year_id: e.academic_year_id,
        academic_year_name: e.academic_years?.name || '---',
      });
    });

    // 4. Combine profile and enrollment
    let combined: StudentEnrollmentItem[] = profiles.map((p: any) => ({
      id: p.id,
      full_name: p.full_name || 'Chưa đặt tên',
      student_code: p.student_code || null,
      is_active: p.is_active ?? true,
      created_at: p.created_at,
      enrollment: enrollmentMap.get(p.id) || null,
    }));

    // 5. Filter by classId
    if (classId === 'unassigned') {
      combined = combined.filter(s => s.enrollment === null);
    } else if (classId && classId !== 'all') {
      combined = combined.filter(s => s.enrollment?.class_id === classId);
    }

    // 6. Paginate results
    const total = combined.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginated = combined.slice(startIndex, startIndex + pageSize);

    return {
      data: paginated,
      total,
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
