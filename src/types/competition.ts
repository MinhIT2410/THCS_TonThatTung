/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CompetitionCategory =
  | 'GOOD_DEED'
  | 'ACHIEVEMENT'
  | 'PARTICIPATION'
  | 'DISCIPLINE'
  | 'ATTENDANCE'
  | 'UNIFORM'
  | 'HYGIENE'
  | 'OTHER';

export type CompetitionEffectScope =
  | 'STUDENT_ONLY'
  | 'UNIT_ONLY'
  | 'BOTH'
  | 'RECORD_ONLY';

export type IncidentStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type EvidenceType = 'IMAGE' | 'INTERNAL_LINK' | 'EXTERNAL_LINK';

export type LedgerType = 'STUDENT_MERIT' | 'STUDENT_REWARD' | 'UNIT_COMPETITION';

export type TransactionType = 'CREDIT' | 'DEBIT' | 'REVERSAL' | 'ADJUSTMENT';

export type TransactionStatus = 'PENDING' | 'POSTED' | 'REVERSED';

export type WeekStatus = 'DRAFT' | 'OPEN' | 'LOCKED' | 'PUBLISHED' | 'ARCHIVED';

export const WEEK_STATUS_LABELS: Record<WeekStatus, string> = {
  DRAFT: 'Bản nháp',
  OPEN: 'Đang mở (Ghi nhận)',
  LOCKED: 'Đã khóa (Chờ duyệt)',
  PUBLISHED: 'Đã công bố',
  ARCHIVED: 'Đã lưu trữ',
};

export const COMPETITION_CATEGORY_LABELS: Record<CompetitionCategory, string> = {
  GOOD_DEED: 'Người tốt - Việc tốt',
  ACHIEVEMENT: 'Thành tích học tập & phong trào',
  PARTICIPATION: 'Tham gia hoạt động',
  DISCIPLINE: 'Kỷ luật & nề nếp',
  ATTENDANCE: 'Chuyên cần',
  UNIFORM: 'Đồng phục & Khăn quàng',
  HYGIENE: 'Vệ sinh & Bảo vệ môi trường',
  OTHER: 'Hành vi khác',
};

export const COMPETITION_SCOPE_LABELS: Record<CompetitionEffectScope, string> = {
  BOTH: 'Đội viên & Chi đội',
  STUDENT_ONLY: 'Chỉ áp dụng Đội viên',
  UNIT_ONLY: 'Chỉ áp dụng Chi đội',
  RECORD_ONLY: 'Chỉ ghi nhận sự việc (Không tính điểm)',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  DRAFT: 'Bản nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy/Đảo',
};

export interface CompetitionProgram {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  academic_year_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitionRule {
  id: string;
  program_id: string;
  code: string;
  name: string;
  description?: string | null;
  category: CompetitionCategory;
  effect_scope: CompetitionEffectScope;
  student_merit_points: number;
  student_reward_points: number;
  unit_points: number;
  requires_evidence: boolean;
  requires_approval: boolean;
  daily_limit?: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  program?: CompetitionProgram;
}

export interface CompetitionIncident {
  id: string;
  program_id: string;
  rule_id: string;
  student_id?: string | null;
  unit_id?: string | null;
  occurred_at: string;
  title: string;
  description?: string | null;
  evidence_note?: string | null;
  status: IncidentStatus;
  recorded_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relational data
  program_name?: string;
  rule_name?: string;
  student_name?: string;
  student_code?: string;
  unit_name?: string;
  recorder_name?: string;
  approver_name?: string;
  evidence_items?: CompetitionEvidence[];
}

export interface CompetitionEvidence {
  id: string;
  incident_id: string;
  evidence_type: EvidenceType;
  file_url?: string | null;
  external_url?: string | null;
  caption?: string | null;
  display_order: number;
  uploaded_by?: string | null;
  created_at: string;
}

export interface CompetitionPointTransaction {
  id: string;
  incident_id?: string | null;
  adjustment_id?: string | null;
  program_id?: string | null;
  student_id?: string | null;
  unit_id?: string | null;
  ledger_type: LedgerType;
  points: number;
  transaction_type: TransactionType;
  status: TransactionStatus;
  effective_at: string;
  created_by?: string | null;
  reversed_transaction_id?: string | null;
  created_at: string;

  student_name?: string;
  unit_name?: string;
  incident_title?: string;
}

export interface CompetitionWeek {
  id: string;
  program_id: string;
  academic_year_id?: string | null;
  week_number: number;
  name: string;
  starts_on: string;
  ends_on: string;
  status: WeekStatus;
  default_starting_points: number;
  opened_by?: string | null;
  opened_at?: string | null;
  locked_by?: string | null;
  locked_at?: string | null;
  published_by?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relational fields
  program_name?: string;
  academic_year_name?: string;
}

export interface CompetitionWeekUnit {
  id: string;
  week_id: string;
  unit_id: string;
  starting_points: number;
  manual_bonus_points: number;
  manual_penalty_points: number;
  final_points_snapshot?: number | null;
  rank_snapshot?: number | null;
  comment?: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'EXCLUDED';
  created_at: string;
  updated_at: string;

  // Calculated or joined fields
  unit_name?: string;
  current_points?: number;
  total_bonus?: number;
  total_penalty?: number;
  incident_count?: number;
}

export interface CompetitionWeekAdjustment {
  id: string;
  week_id: string;
  unit_id: string;
  points: number;
  reason: string;
  evidence_url?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requested_by: string;
  approved_by?: string | null;
  created_at: string;
  approved_at?: string | null;

  unit_name?: string;
  requester_name?: string;
  approver_name?: string;
}

export type ReviewRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export const REVIEW_REQUEST_STATUS_LABELS: Record<ReviewRequestStatus, string> = {
  PENDING: 'Chờ xem xét',
  ACCEPTED: 'Đã chấp nhận',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

export type RedemptionStatus = 'PENDING' | 'APPROVED' | 'ISSUED' | 'REJECTED' | 'CANCELLED';

export const REDEMPTION_STATUS_LABELS: Record<RedemptionStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  ISSUED: 'Đã nhận quà',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

export interface CompetitionReviewRequest {
  id: string;
  incident_id?: string | null;
  transaction_id?: string | null;
  student_id: string;
  reason: string;
  evidence_url?: string | null;
  status: ReviewRequestStatus;
  submitted_at: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  resolution_note?: string | null;
  created_at: string;
  updated_at: string;

  student_name?: string;
  student_code?: string;
  unit_name?: string;
  reviewer_name?: string;
  incident_title?: string;
}

export interface RewardItem {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  points_required: number;
  quantity: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RewardRedemption {
  id: string;
  student_id: string;
  reward_item_id: string;
  quantity: number;
  points_per_item: number;
  total_points: number;
  status: RedemptionStatus;
  requested_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  issued_by?: string | null;
  issued_at?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;

  // Joined
  student_name?: string;
  student_code?: string;
  unit_name?: string;
  reward_name?: string;
  reward_image_url?: string;
  approver_name?: string;
  issuer_name?: string;
}

export interface StudentCompetitionProfile {
  student_id: string;
  full_name: string;
  student_code?: string;
  avatar_url?: string;
  unit_info?: {
    has_unit: boolean;
    class_id?: string;
    class_name?: string;
    academic_year_id?: string;
    message?: string;
  };
  accumulated_merit_points: number;
  posted_reward_points: number;
  reserved_reward_points: number;
  available_reward_points: number;
  good_deeds_count: number;
  achievements_count: number;
  violations_count: number;
  unit_contribution_points: number;
}

