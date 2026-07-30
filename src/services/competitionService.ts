/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../lib/supabase/client';
import {
  CompetitionProgram,
  CompetitionRule,
  CompetitionIncident,
  CompetitionEvidence,
  CompetitionPointTransaction,
  CompetitionWeek,
  CompetitionWeekUnit,
  CompetitionWeekAdjustment,
  IncidentStatus,
  WeekStatus,
  StudentCompetitionProfile,
  LedgerType,
  CompetitionReviewRequest,
  RewardItem,
  RewardRedemption,
} from '../types/competition';

export const competitionService = {
  // --- COMPETITION PROGRAMS ---
  async getCompetitionPrograms(includeInactive = true): Promise<CompetitionProgram[]> {
    let query = supabase
      .from('competition_programs')
      .select('*, academic_years(name)')
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching competition programs:', error);
      throw error;
    }

    return (data || []).map((p: any) => ({
      ...p,
      academic_year_name: p.academic_years?.name || null,
    })) as CompetitionProgram[];
  },

  async createCompetitionProgram(program: Partial<CompetitionProgram>): Promise<CompetitionProgram> {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from('competition_programs')
      .insert({
        code: program.code,
        name: program.name,
        description: program.description || null,
        academic_year_id: program.academic_year_id || null,
        starts_at: program.starts_at || null,
        ends_at: program.ends_at || null,
        is_active: program.is_active ?? true,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      })
      .select('*, academic_years(name)')
      .single();

    if (error) {
      console.error('Error creating competition program:', error);
      throw error;
    }

    return {
      ...data,
      academic_year_name: (data as any).academic_years?.name || null,
    } as CompetitionProgram;
  },

  async updateCompetitionProgram(id: string, program: Partial<CompetitionProgram>): Promise<CompetitionProgram> {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from('competition_programs')
      .update({
        code: program.code,
        name: program.name,
        description: program.description || null,
        academic_year_id: program.academic_year_id || null,
        starts_at: program.starts_at || null,
        ends_at: program.ends_at || null,
        is_active: program.is_active ?? true,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, academic_years(name)')
      .single();

    if (error) {
      console.error('Error updating competition program:', error);
      throw error;
    }

    return {
      ...data,
      academic_year_name: (data as any).academic_years?.name || null,
    } as CompetitionProgram;
  },

  async archiveCompetitionProgram(id: string): Promise<CompetitionProgram> {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase
      .from('competition_programs')
      .update({
        is_active: false,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, academic_years(name)')
      .single();

    if (error) {
      console.error('Error archiving competition program:', error);
      throw error;
    }

    return {
      ...data,
      academic_year_name: (data as any).academic_years?.name || null,
    } as CompetitionProgram;
  },

  // Backward compatibility aliases
  async getPrograms(includeInactive = true): Promise<CompetitionProgram[]> {
    return this.getCompetitionPrograms(includeInactive);
  },

  async saveProgram(program: Partial<CompetitionProgram>): Promise<CompetitionProgram> {
    if (program.id) {
      return this.updateCompetitionProgram(program.id, program);
    }
    return this.createCompetitionProgram(program);
  },

  // --- COMPETITION RULES ---
  async getCompetitionRules(programId?: string, includeInactive = true): Promise<CompetitionRule[]> {
    let query = supabase
      .from('competition_rules')
      .select('*, competition_programs(name, code)')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (programId && programId !== 'ALL') {
      query = query.eq('program_id', programId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching competition rules:', error);
      throw error;
    }

    return (data || []).map((r: any) => ({
      ...r,
      program: r.competition_programs,
    })) as CompetitionRule[];
  },

  async createCompetitionRule(rule: Partial<CompetitionRule>): Promise<CompetitionRule> {
    const { data, error } = await supabase
      .from('competition_rules')
      .insert({
        program_id: rule.program_id,
        code: rule.code,
        name: rule.name,
        description: rule.description || null,
        category: rule.category,
        effect_scope: rule.effect_scope,
        student_merit_points: rule.student_merit_points ?? 0,
        student_reward_points: rule.student_reward_points ?? 0,
        unit_points: rule.unit_points ?? 0,
        requires_evidence: rule.requires_evidence ?? false,
        requires_approval: rule.requires_approval ?? false,
        daily_limit: rule.daily_limit || null,
        is_active: rule.is_active ?? true,
        display_order: rule.display_order ?? 0,
      })
      .select('*, competition_programs(name, code)')
      .single();

    if (error) {
      console.error('Error creating competition rule:', error);
      throw error;
    }

    return {
      ...data,
      program: (data as any).competition_programs,
    } as CompetitionRule;
  },

  async updateCompetitionRule(id: string, rule: Partial<CompetitionRule>): Promise<CompetitionRule> {
    const { data, error } = await supabase
      .from('competition_rules')
      .update({
        program_id: rule.program_id,
        code: rule.code,
        name: rule.name,
        description: rule.description || null,
        category: rule.category,
        effect_scope: rule.effect_scope,
        student_merit_points: rule.student_merit_points ?? 0,
        student_reward_points: rule.student_reward_points ?? 0,
        unit_points: rule.unit_points ?? 0,
        requires_evidence: rule.requires_evidence ?? false,
        requires_approval: rule.requires_approval ?? false,
        daily_limit: rule.daily_limit || null,
        is_active: rule.is_active ?? true,
        display_order: rule.display_order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, competition_programs(name, code)')
      .single();

    if (error) {
      console.error('Error updating competition rule:', error);
      throw error;
    }

    return {
      ...data,
      program: (data as any).competition_programs,
    } as CompetitionRule;
  },

  async archiveCompetitionRule(id: string): Promise<CompetitionRule> {
    const { data, error } = await supabase
      .from('competition_rules')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, competition_programs(name, code)')
      .single();

    if (error) {
      console.error('Error archiving competition rule:', error);
      throw error;
    }

    return {
      ...data,
      program: (data as any).competition_programs,
    } as CompetitionRule;
  },

  // Backward compatibility aliases
  async getRules(programId?: string, includeInactive = true): Promise<CompetitionRule[]> {
    return this.getCompetitionRules(programId, includeInactive);
  },

  async saveRule(rule: Partial<CompetitionRule>): Promise<CompetitionRule> {
    if (rule.id) {
      return this.updateCompetitionRule(rule.id, rule);
    }
    return this.createCompetitionRule(rule);
  },

  async canManageCompetition(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // 1. Check user_roles for SUPER_ADMIN or PRINCIPAL
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role_code')
        .eq('user_id', user.id);

      const roles = (userRoles || []).map((r: any) => r.role_code);
      if (roles.includes('SUPER_ADMIN') || roles.includes('PRINCIPAL')) {
        return true;
      }

      // 2. Check user_competition_permissions for COMPETITION_MANAGE
      const { data: compPerms } = await supabase
        .from('user_competition_permissions')
        .select('permission_code')
        .eq('user_id', user.id)
        .eq('permission_code', 'COMPETITION_MANAGE');

      return !!(compPerms && compPerms.length > 0);
    } catch (err) {
      console.error('Error checking competition manage permission:', err);
      return false;
    }
  },

  async getAcademicYears(): Promise<{ id: string; name: string; is_active?: boolean }[]> {
    const { data, error } = await supabase
      .from('academic_years')
      .select('id, name, is_active')
      .order('name', { ascending: false });

    if (error) {
      console.error('Error fetching academic years:', error);
      return [];
    }
    return data || [];
  },

  // --- SEARCH STUDENTS & GET UNIT ---
  async searchStudents(searchTerm: string) {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const term = searchTerm.trim();
    const { data: students, error } = await supabase
      .from('profiles')
      .select('id, full_name, student_code, avatar_url')
      .or(`full_name.ilike.%${term}%,student_code.ilike.%${term}%`)
      .limit(10);

    if (error) {
      console.error('Error searching students:', error);
      return [];
    }

    if (!students || students.length === 0) return [];

    // Fetch student active enrollments
    const studentIds = students.map(s => s.id);
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('student_id, class_id, classes(id, name)')
      .in('student_id', studentIds);

    const enrollmentMap: Record<string, { class_id: string; class_name: string }> = {};
    if (enrollments) {
      enrollments.forEach((e: any) => {
        if (e.classes) {
          enrollmentMap[e.student_id] = {
            class_id: e.class_id,
            class_name: e.classes.name,
          };
        }
      });
    }

    return students.map(s => ({
      ...s,
      unit: enrollmentMap[s.id] || null,
    }));
  },

  async getStudentCurrentUnit(studentId: string) {
    const { data, error } = await supabase.rpc('get_student_current_unit', {
      p_student_id: studentId,
    });

    if (error) {
      console.error('Error getting student unit:', error);
      return { has_unit: false, message: 'Lỗi khi tra cứu chi đội học sinh.' };
    }

    return data;
  },

  // --- UPLOAD EVIDENCE IMAGE ---
  async uploadEvidenceImage(file: File, folderPrefix = 'temp'): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const uuid = crypto.randomUUID();
    const filePath = `competition/incidents/${folderPrefix}/${uuid}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('school-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading evidence image:', uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('school-media')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },

  // --- RECORD INCIDENT (RPC) ---
  async createIncident(payload: {
    program_id: string;
    rule_id: string;
    student_id?: string | null;
    unit_id?: string | null;
    occurred_at?: string;
    title?: string;
    description?: string;
    evidence_note?: string;
    evidence_items?: {
      evidence_type: 'IMAGE' | 'INTERNAL_LINK' | 'EXTERNAL_LINK';
      file_url?: string;
      external_url?: string;
      caption?: string;
      display_order?: number;
    }[];
  }) {
    const { data, error } = await supabase.rpc('create_competition_incident', {
      p_program_id: payload.program_id,
      p_rule_id: payload.rule_id,
      p_student_id: payload.student_id || null,
      p_unit_id: payload.unit_id || null,
      p_occurred_at: payload.occurred_at || new Date().toISOString(),
      p_title: payload.title || null,
      p_description: payload.description || null,
      p_evidence_note: payload.evidence_note || null,
      p_evidence_items: payload.evidence_items || [],
    });

    if (error) {
      console.error('Error creating incident:', error);
      throw error;
    }

    return data;
  },

  // --- APPROVE INCIDENT (RPC) ---
  async approveIncident(incidentId: string) {
    const { data, error } = await supabase.rpc('approve_competition_incident', {
      p_incident_id: incidentId,
    });

    if (error) {
      console.error('Error approving incident:', error);
      throw error;
    }

    return data;
  },

  // --- REJECT INCIDENT (RPC) ---
  async rejectIncident(incidentId: string, reason: string) {
    const { data, error } = await supabase.rpc('reject_competition_incident', {
      p_incident_id: incidentId,
      p_reason: reason,
    });

    if (error) {
      console.error('Error rejecting incident:', error);
      throw error;
    }

    return data;
  },

  // --- REVERSE INCIDENT (RPC) ---
  async reverseIncident(incidentId: string, reason: string) {
    const { data, error } = await supabase.rpc('reverse_competition_incident', {
      p_incident_id: incidentId,
      p_reason: reason,
    });

    if (error) {
      console.error('Error reversing incident:', error);
      throw error;
    }

    return data;
  },

  // --- FETCH INCIDENTS ---
  async getIncidents(filters?: {
    status?: IncidentStatus;
    programId?: string;
    ruleId?: string;
    studentId?: string;
  }): Promise<CompetitionIncident[]> {
    let query = supabase
      .from('competition_incidents')
      .select(`
        *,
        competition_programs(name, code),
        competition_rules(name, code, category, effect_scope, student_merit_points, student_reward_points, unit_points),
        student:profiles!competition_incidents_student_id_fkey(full_name, student_code),
        unit:classes!competition_incidents_unit_id_fkey(name),
        recorder:profiles!competition_incidents_recorded_by_fkey(full_name),
        approver:profiles!competition_incidents_approved_by_fkey(full_name),
        competition_incident_evidence(*)
      `)
      .order('occurred_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.programId) {
      query = query.eq('program_id', filters.programId);
    }
    if (filters?.ruleId) {
      query = query.eq('rule_id', filters.ruleId);
    }
    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching incidents:', error);
      throw error;
    }

    return (data || []).map((i: any) => ({
      ...i,
      program_name: i.competition_programs?.name,
      rule_name: i.competition_rules?.name,
      rule: i.competition_rules,
      student_name: i.student?.full_name,
      student_code: i.student?.student_code,
      unit_name: i.unit?.name,
      recorder_name: i.recorder?.full_name,
      approver_name: i.approver?.full_name,
      evidence_items: i.competition_incident_evidence || [],
    })) as CompetitionIncident[];
  },

  // --- ACADEMIC YEARS ---
  async getAcademicYears() {
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching academic years:', error);
      throw error;
    }
    return data || [];
  },

  // --- CLASSES / UNITS ---
  async getClasses(academicYearId?: string) {
    let query = supabase
      .from('classes')
      .select('*, grade_levels(name)')
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

  // --- WEEKLY COMPETITION: WEEKS ---
  async getWeeks(filters?: { programId?: string; academicYearId?: string }): Promise<CompetitionWeek[]> {
    let query = supabase
      .from('competition_weeks')
      .select('*, competition_programs(name, code), academic_years(name)')
      .order('week_number', { ascending: false });

    if (filters?.programId) {
      query = query.eq('program_id', filters.programId);
    }
    if (filters?.academicYearId) {
      query = query.eq('academic_year_id', filters.academicYearId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching weeks:', error);
      throw error;
    }

    return (data || []).map((w: any) => ({
      ...w,
      program_name: w.competition_programs?.name,
      academic_year_name: w.academic_years?.name,
    })) as CompetitionWeek[];
  },

  async getWeekById(weekId: string): Promise<CompetitionWeek | null> {
    const { data, error } = await supabase
      .from('competition_weeks')
      .select('*, competition_programs(name, code), academic_years(name)')
      .eq('id', weekId)
      .single();

    if (error) {
      if (error.code === 'P0002') return null;
      console.error('Error fetching week by id:', error);
      throw error;
    }

    return {
      ...data,
      program_name: data.competition_programs?.name,
      academic_year_name: data.academic_years?.name,
    } as CompetitionWeek;
  },

  async openWeek(payload: {
    program_id: string;
    academic_year_id: string;
    week_number: number;
    name: string;
    starts_on: string;
    ends_on: string;
    default_starting_points?: number;
    unit_ids?: string[];
  }) {
    const { data, error } = await supabase.rpc('open_competition_week', {
      p_program_id: payload.program_id,
      p_academic_year_id: payload.academic_year_id,
      p_week_number: payload.week_number,
      p_name: payload.name,
      p_starts_on: payload.starts_on,
      p_ends_on: payload.ends_on,
      p_default_starting_points: payload.default_starting_points || 100,
      p_unit_ids: payload.unit_ids || null,
    });

    if (error) {
      console.error('Error opening week:', error);
      throw error;
    }
    return data;
  },

  async lockWeek(weekId: string) {
    const { data, error } = await supabase.rpc('lock_competition_week', {
      p_week_id: weekId,
    });

    if (error) {
      console.error('Error locking week:', error);
      throw error;
    }
    return data;
  },

  async unlockWeek(weekId: string, reason?: string) {
    const { data, error } = await supabase.rpc('unlock_competition_week', {
      p_week_id: weekId,
      p_reason: reason || null,
    });

    if (error) {
      console.error('Error unlocking week:', error);
      throw error;
    }
    return data;
  },

  async finalizeWeek(weekId: string) {
    const { data, error } = await supabase.rpc('finalize_competition_week', {
      p_week_id: weekId,
    });

    if (error) {
      console.error('Error finalizing week:', error);
      throw error;
    }
    return data;
  },

  // --- WEEKLY COMPETITION: LEADERBOARD & UNITS ---
  async getWeekSummary(weekId: string) {
    const week = await this.getWeekById(weekId);
    if (!week) throw new Error('Không tìm thấy tuần thi đua.');

    // Fetch units
    const { data: unitsData, error: unitsError } = await supabase
      .from('competition_week_units')
      .select('*, class:classes!competition_week_units_unit_id_fkey(name)')
      .eq('week_id', weekId)
      .order('created_at', { ascending: true });

    if (unitsError) throw unitsError;

    const startTs = new Date(`${week.starts_on}T00:00:00.000Z`).toISOString();
    const endTs = new Date(`${week.ends_on}T23:59:59.999Z`).toISOString();

    // Fetch transactions in range
    const { data: txData, error: txError } = await supabase
      .from('competition_point_transactions')
      .select('unit_id, points, transaction_type')
      .eq('ledger_type', 'UNIT_COMPETITION')
      .eq('status', 'POSTED')
      .gte('effective_at', startTs)
      .lte('effective_at', endTs);

    if (txError) throw txError;

    // Aggregate point transactions per unit
    const txMap = new Map<string, { bonus: number; penalty: number; net: number; count: number }>();
    (txData || []).forEach(tx => {
      if (!tx.unit_id) return;
      const current = txMap.get(tx.unit_id) || { bonus: 0, penalty: 0, net: 0, count: 0 };
      const pts = tx.points || 0;
      if (pts > 0) current.bonus += pts;
      if (pts < 0) current.penalty += Math.abs(pts);
      current.net += pts;
      current.count += 1;
      txMap.set(tx.unit_id, current);
    });

    const processedUnits: CompetitionWeekUnit[] = (unitsData || []).map((u: any) => {
      const stats = txMap.get(u.unit_id) || { bonus: 0, penalty: 0, net: 0, count: 0 };
      const isPublished = week.status === 'PUBLISHED';
      
      const current_points = isPublished && u.final_points_snapshot != null 
        ? u.final_points_snapshot 
        : u.starting_points + stats.net;

      const total_bonus = isPublished ? u.manual_bonus_points : stats.bonus;
      const total_penalty = isPublished ? u.manual_penalty_points : stats.penalty;

      return {
        ...u,
        unit_name: u.class?.name || 'Chi đội',
        current_points,
        total_bonus,
        total_penalty,
        incident_count: stats.count,
      };
    });

    // If NOT published yet, compute dynamic temporary rank
    if (week.status !== 'PUBLISHED') {
      processedUnits.sort((a, b) => {
        if ((b.current_points ?? 0) !== (a.current_points ?? 0)) {
          return (b.current_points ?? 0) - (a.current_points ?? 0);
        }
        return (a.total_penalty ?? 0) - (b.total_penalty ?? 0);
      });

      let currentRank = 1;
      processedUnits.forEach((u, idx) => {
        if (idx > 0) {
          const prev = processedUnits[idx - 1];
          if (
            prev.current_points === u.current_points &&
            prev.total_penalty === u.total_penalty
          ) {
            u.rank_snapshot = prev.rank_snapshot;
          } else {
            u.rank_snapshot = idx + 1;
          }
        } else {
          u.rank_snapshot = 1;
        }
      });
    } else {
      // Sort by snapshot rank
      processedUnits.sort((a, b) => (a.rank_snapshot || 999) - (b.rank_snapshot || 999));
    }

    // Fetch total incidents stats for the week
    const { count: pendingCount } = await supabase
      .from('competition_incidents')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', week.program_id)
      .eq('status', 'PENDING')
      .gte('occurred_at', startTs)
      .lte('occurred_at', endTs);

    const { count: totalIncidentsCount } = await supabase
      .from('competition_incidents')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', week.program_id)
      .gte('occurred_at', startTs)
      .lte('occurred_at', endTs);

    return {
      week,
      units: processedUnits,
      pendingIncidentsCount: pendingCount || 0,
      totalIncidentsCount: totalIncidentsCount || 0,
    };
  },

  // --- PUBLIC WEEK SUMMARY ---
  async getPublicPublishedWeeks(): Promise<CompetitionWeek[]> {
    const { data, error } = await supabase
      .from('competition_weeks')
      .select('*, competition_programs(name), academic_years(name)')
      .eq('status', 'PUBLISHED')
      .order('week_number', { ascending: false });

    if (error) {
      console.error('Error fetching public published weeks:', error);
      throw error;
    }

    return (data || []).map((w: any) => ({
      ...w,
      program_name: w.competition_programs?.name,
      academic_year_name: w.academic_years?.name,
    })) as CompetitionWeek[];
  },

  async getPublicWeekLeaderboard(weekId: string) {
    const { data: weekData, error: weekErr } = await supabase
      .from('competition_weeks')
      .select('*, competition_programs(name), academic_years(name)')
      .eq('id', weekId)
      .eq('status', 'PUBLISHED')
      .single();

    if (weekErr || !weekData) {
      return null;
    }

    const { data: unitsData, error: unitsErr } = await supabase
      .from('competition_week_units')
      .select('starting_points, manual_bonus_points, manual_penalty_points, final_points_snapshot, rank_snapshot, comment, class:classes!competition_week_units_unit_id_fkey(name)')
      .eq('week_id', weekId)
      .order('rank_snapshot', { ascending: true });

    if (unitsErr) throw unitsErr;

    const publicLeaderboard = (unitsData || []).map((u: any) => ({
      unit_name: u.class?.name || 'Chi đội',
      starting_points: u.starting_points,
      manual_bonus_points: u.manual_bonus_points,
      manual_penalty_points: u.manual_penalty_points,
      final_points: u.final_points_snapshot,
      rank: u.rank_snapshot,
      comment: u.comment,
    }));

    return {
      week: {
        id: weekData.id,
        name: weekData.name,
        week_number: weekData.week_number,
        starts_on: weekData.starts_on,
        ends_on: weekData.ends_on,
        program_name: weekData.competition_programs?.name,
        academic_year_name: weekData.academic_years?.name,
        published_at: weekData.published_at,
      },
      leaderboard: publicLeaderboard,
    };
  },

  // --- UNIT WEEK ADJUSTMENTS ---
  async createAdjustment(payload: {
    week_id: string;
    unit_id: string;
    points: number;
    reason: string;
    evidence_url?: string;
  }) {
    const { data, error } = await supabase.rpc('create_competition_week_adjustment', {
      p_week_id: payload.week_id,
      p_unit_id: payload.unit_id,
      p_points: payload.points,
      p_reason: payload.reason,
      p_evidence_url: payload.evidence_url || null,
    });

    if (error) {
      console.error('Error creating adjustment:', error);
      throw error;
    }
    return data;
  },

  async updateUnitWeekComment(weekUnitId: string, comment: string) {
    const { data, error } = await supabase
      .from('competition_week_units')
      .update({ comment, updated_at: new Date().toISOString() })
      .eq('id', weekUnitId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --- UNIT DETAILED INCIDENTS & TRANSACTIONS FOR A WEEK ---
  async getUnitWeekDetails(weekId: string, unitId: string) {
    const week = await this.getWeekById(weekId);
    if (!week) throw new Error('Không tìm thấy tuần thi đua.');

    const startTs = new Date(`${week.starts_on}T00:00:00.000Z`).toISOString();
    const endTs = new Date(`${week.ends_on}T23:59:59.999Z`).toISOString();

    // Fetch posted point transactions for unit in range
    const { data: txList, error: txError } = await supabase
      .from('competition_point_transactions')
      .select(`
        *,
        incident:competition_incidents(
          title,
          description,
          occurred_at,
          recorded_by,
          rule:competition_rules(name, category),
          student:profiles!competition_incidents_student_id_fkey(full_name, student_code),
          recorder:profiles!competition_incidents_recorded_by_fkey(full_name),
          competition_incident_evidence(*)
        ),
        adjustment:competition_week_adjustments(reason, requested_by)
      `)
      .eq('unit_id', unitId)
      .eq('ledger_type', 'UNIT_COMPETITION')
      .eq('status', 'POSTED')
      .gte('effective_at', startTs)
      .lte('effective_at', endTs)
      .order('effective_at', { ascending: false });

    if (txError) throw txError;

    return (txList || []).map((t: any) => ({
      id: t.id,
      points: t.points,
      transaction_type: t.transaction_type,
      effective_at: t.effective_at,
      title: t.incident?.title || (t.adjustment ? `Điều chỉnh: ${t.adjustment.reason}` : 'Giao dịch điểm'),
      description: t.incident?.description,
      rule_name: t.incident?.rule?.name || 'Điều chỉnh tập thể',
      category: t.incident?.rule?.category || 'OTHER',
      student_name: t.incident?.student?.full_name,
      student_code: t.incident?.student?.student_code,
      recorder_name: t.incident?.recorder?.full_name || 'Tổng phụ trách / HĐĐ',
      evidence_items: t.incident?.competition_incident_evidence || [],
    }));
  },

  // --- PART 3: STUDENT PROFILE & GOOD DEEDS ---
  async getStudentCompetitionProfile(studentId?: string): Promise<StudentCompetitionProfile> {
    const { data, error } = await supabase.rpc('get_student_competition_profile', {
      p_student_id: studentId || null,
    });

    if (error) {
      console.error('Error fetching student competition profile:', error);
      throw error;
    }
    return data as StudentCompetitionProfile;
  },

  async getStudentPointTransactions(studentId?: string, ledgerType?: LedgerType) {
    let query = supabase
      .from('competition_point_transactions')
      .select(`
        *,
        incident:competition_incidents(
          title,
          description,
          occurred_at,
          rule:competition_rules(name, category)
        )
      `)
      .order('effective_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (ledgerType) {
      query = query.eq('ledger_type', ledgerType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((t: any) => ({
      ...t,
      incident_title: t.incident?.title,
      rule_name: t.incident?.rule?.name,
      category: t.incident?.rule?.category,
    }));
  },

  async getStudentIncidents(studentId?: string) {
    let query = supabase
      .from('competition_incidents')
      .select(`
        *,
        program:competition_programs(name),
        rule:competition_rules(name, category, student_merit_points, student_reward_points, unit_points),
        recorder:profiles!competition_incidents_recorded_by_fkey(full_name),
        approver:profiles!competition_incidents_approved_by_fkey(full_name),
        evidence_items:competition_incident_evidence(*)
      `)
      .order('occurred_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((i: any) => ({
      ...i,
      program_name: i.program?.name,
      rule_name: i.rule?.name,
      category: i.rule?.category,
      recorder_name: i.recorder?.full_name,
      approver_name: i.approver?.full_name,
      evidence_items: i.evidence_items || [],
    }));
  },

  async getGoodDeeds(limit = 20) {
    const { data, error } = await supabase
      .from('competition_incidents')
      .select(`
        *,
        rule:competition_rules!inner(name, category, student_merit_points),
        student:profiles!competition_incidents_student_id_fkey(full_name, student_code, avatar_url),
        unit:classes!competition_incidents_unit_id_fkey(name),
        evidence_items:competition_incident_evidence(*)
      `)
      .eq('status', 'APPROVED')
      .eq('rule.category', 'GOOD_DEED')
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((g: any) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      occurred_at: g.occurred_at,
      student_name: g.student?.full_name || 'Đội viên',
      student_code: g.student?.student_code,
      avatar_url: g.student?.avatar_url,
      unit_name: g.unit?.name || 'Chi đội',
      merit_points: g.rule?.student_merit_points || 0,
      evidence_items: g.evidence_items || [],
    }));
  },

  // --- REVIEW REQUESTS ---
  async submitReviewRequest(payload: {
    incident_id?: string;
    transaction_id?: string;
    reason: string;
    evidence_url?: string;
  }) {
    const { data, error } = await supabase.rpc('submit_competition_review_request', {
      p_incident_id: payload.incident_id || null,
      p_transaction_id: payload.transaction_id || null,
      p_reason: payload.reason,
      p_evidence_url: payload.evidence_url || null,
    });

    if (error) throw error;
    return data;
  },

  async getReviewRequests(studentId?: string) {
    let query = supabase
      .from('competition_review_requests')
      .select(`
        *,
        student:profiles!competition_review_requests_student_id_fkey(full_name, student_code),
        reviewer:profiles!competition_review_requests_reviewed_by_fkey(full_name),
        incident:competition_incidents(title)
      `)
      .order('submitted_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r: any) => ({
      ...r,
      student_name: r.student?.full_name,
      student_code: r.student?.student_code,
      reviewer_name: r.reviewer?.full_name,
      incident_title: r.incident?.title,
    })) as CompetitionReviewRequest[];
  },

  async resolveReviewRequest(payload: {
    request_id: string;
    status: 'ACCEPTED' | 'REJECTED';
    resolution_note?: string;
    adjustment_points?: number;
    ledger_type?: LedgerType;
  }) {
    const { data, error } = await supabase.rpc('resolve_competition_review_request', {
      p_request_id: payload.request_id,
      p_status: payload.status,
      p_resolution_note: payload.resolution_note || null,
      p_adjustment_points: payload.adjustment_points || 0,
      p_ledger_type: payload.ledger_type || 'STUDENT_MERIT',
    });

    if (error) throw error;
    return data;
  },

  // --- REWARD SHOP & REDEMPTIONS ---
  async getRewardItems(activeOnly = false): Promise<RewardItem[]> {
    let query = supabase
      .from('reward_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []) as RewardItem[];
  },

  async saveRewardItem(item: Partial<RewardItem>): Promise<RewardItem> {
    const payload = {
      name: item.name,
      description: item.description || null,
      image_url: item.image_url || null,
      points_required: item.points_required ?? 0,
      quantity: item.quantity ?? 0,
      is_active: item.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (item.id) {
      const { data, error } = await supabase
        .from('reward_items')
        .update(payload)
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;
      return data as RewardItem;
    } else {
      const { data, error } = await supabase
        .from('reward_items')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as RewardItem;
    }
  },

  async deleteRewardItem(id: string) {
    const { error } = await supabase
      .from('reward_items')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async requestRewardRedemption(rewardItemId: string, quantity = 1) {
    const { data, error } = await supabase.rpc('request_reward_redemption', {
      p_reward_item_id: rewardItemId,
      p_quantity: quantity,
    });

    if (error) throw error;
    return data;
  },

  async getRewardRedemptions(studentId?: string): Promise<RewardRedemption[]> {
    let query = supabase
      .from('reward_redemptions')
      .select(`
        *,
        student:profiles!reward_redemptions_student_id_fkey(full_name, student_code),
        reward:reward_items(name, image_url),
        approver:profiles!reward_redemptions_approved_by_fkey(full_name),
        issuer:profiles!reward_redemptions_issued_by_fkey(full_name)
      `)
      .order('requested_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r: any) => ({
      ...r,
      student_name: r.student?.full_name,
      student_code: r.student?.student_code,
      reward_name: r.reward?.name,
      reward_image_url: r.reward?.image_url,
      approver_name: r.approver?.full_name,
      issuer_name: r.issuer?.full_name,
    })) as RewardRedemption[];
  },

  async approveRewardRedemption(redemptionId: string) {
    const { data, error } = await supabase.rpc('approve_reward_redemption', {
      p_redemption_id: redemptionId,
    });
    if (error) throw error;
    return data;
  },

  async issueRewardRedemption(redemptionId: string) {
    const { data, error } = await supabase.rpc('issue_reward_redemption', {
      p_redemption_id: redemptionId,
    });
    if (error) throw error;
    return data;
  },

  async cancelRewardRedemption(redemptionId: string, reason?: string) {
    const { data, error } = await supabase.rpc('cancel_reward_redemption', {
      p_redemption_id: redemptionId,
      p_reason: reason || null,
    });
    if (error) throw error;
    return data;
  },
};


