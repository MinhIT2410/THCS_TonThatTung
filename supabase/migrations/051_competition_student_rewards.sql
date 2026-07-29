BEGIN;

-- 051_competition_student_rewards.sql
-- Emulation & Competition Module (Part 3/3): Student Profile, Simple Rewards & Redemptions
-- Core Tables: competition_review_requests, reward_items, reward_redemptions
-- RPCs: get_student_competition_profile, request_reward_redemption, approve_reward_redemption,
--       issue_reward_redemption, cancel_reward_redemption,
--       submit_competition_review_request, resolve_competition_review_request

-- Drop complex inventory table if exists
drop table if exists public.reward_inventory_transactions cascade;
drop function if exists public.adjust_reward_inventory(uuid, integer, text) cascade;
drop function if exists public.mark_reward_ready(uuid) cascade;

-- 1. Create competition_review_requests table
create table if not exists public.competition_review_requests (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid null references public.competition_incidents(id) on delete restrict,
  transaction_id uuid null references public.competition_point_transactions(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  evidence_url text null,
  status text not null default 'PENDING' constraint competition_review_requests_status_check check (
    status in ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')
  ),
  resolution_note text null,
  adjustment_points integer null,
  reviewed_by uuid null references public.profiles(id) on delete set null,
  reviewed_at timestamptz null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create simplified reward_items table
create table if not exists public.reward_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  image_url text null,
  points_required integer not null constraint reward_items_points_check check (points_required > 0),
  quantity integer not null default 0 constraint reward_items_quantity_check check (quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create reward_redemptions table
create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete restrict,
  reward_item_id uuid not null references public.reward_items(id) on delete restrict,
  quantity integer not null default 1 constraint reward_redemptions_qty_check check (quantity > 0),
  points_per_item integer not null constraint reward_redemptions_ppi_check check (points_per_item > 0),
  total_points integer not null constraint reward_redemptions_tp_check check (total_points > 0),
  status text not null default 'PENDING' constraint reward_redemptions_status_check check (
    status in ('PENDING', 'APPROVED', 'ISSUED', 'REJECTED', 'CANCELLED')
  ),
  student_note text null,
  staff_note text null,
  rejection_reason text null,
  approved_by uuid null references public.profiles(id) on delete set null,
  approved_at timestamptz null,
  issued_by uuid null references public.profiles(id) on delete set null,
  issued_at timestamptz null,
  cancelled_by uuid null references public.profiles(id) on delete set null,
  cancelled_at timestamptz null,
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Upgrade competition_point_transactions for reward redemption linking
alter table public.competition_point_transactions
  add column if not exists redemption_id uuid null references public.reward_redemptions(id) on delete restrict;

-- Unique index to prevent duplicate point deduction per redemption
create unique index if not exists idx_competition_pt_tx_redemption_debit 
on public.competition_point_transactions (redemption_id, ledger_type) 
where redemption_id is not null;

-- Triggers for updated_at
drop trigger if exists trg_competition_review_requests_updated_at on public.competition_review_requests;
create trigger trg_competition_review_requests_updated_at before update on public.competition_review_requests
for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_items_updated_at on public.reward_items;
create trigger trg_reward_items_updated_at before update on public.reward_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_reward_redemptions_updated_at on public.reward_redemptions;
create trigger trg_reward_redemptions_updated_at before update on public.reward_redemptions
for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_competition_review_requests_student on public.competition_review_requests(student_id);
create index if not exists idx_competition_review_requests_status on public.competition_review_requests(status);
create index if not exists idx_reward_items_active on public.reward_items(is_active);
create index if not exists idx_reward_redemptions_student on public.reward_redemptions(student_id);
create index if not exists idx_reward_redemptions_status on public.reward_redemptions(status);

-- ============================================================================
-- RPC: get_student_competition_profile
-- ============================================================================
create or replace function public.get_student_competition_profile(p_student_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_target_id uuid;
  v_profile record;
  v_unit_info jsonb;
  v_accumulated_merit integer := 0;
  v_posted_reward integer := 0;
  v_reserved_reward integer := 0;
  v_available_reward integer := 0;
  v_good_deeds integer := 0;
  v_achievements integer := 0;
  v_violations integer := 0;
  v_unit_contrib integer := 0;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Yêu cầu xác thực.' using errcode = '42501';
  end if;

  v_target_id := coalesce(p_student_id, v_caller_id);

  -- Permission check: caller can view if viewing self or has any competition permission
  if v_caller_id <> v_target_id then
    if not (
      public.has_competition_permission(v_caller_id, 'COMPETITION_RECORD')
      or public.has_competition_permission(v_caller_id, 'COMPETITION_APPROVE')
      or public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE')
      or public.has_competition_permission(v_caller_id, 'COMPETITION_WEEK_MANAGE')
      or public.has_competition_permission(v_caller_id, 'COMPETITION_REWARD_MANAGE')
      or public.has_competition_permission(v_caller_id, 'COMPETITION_REVIEW_MANAGE')
    ) then
      raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
    end if;
  end if;

  -- Load profile
  select p.id, p.full_name, p.student_code, p.avatar_url
  into v_profile
  from public.profiles p
  where p.id = v_target_id;

  if not found then
    raise exception 'Không tìm thấy thông tin đội viên.' using errcode = 'P0002';
  end if;

  -- Get student unit info
  v_unit_info := public.get_student_current_unit(v_target_id);

  -- 1. STUDENT_MERIT total (accumulated merit points)
  select coalesce(sum(points), 0) into v_accumulated_merit
  from public.competition_point_transactions
  where student_id = v_target_id
    and ledger_type = 'STUDENT_MERIT'
    and status = 'POSTED';

  -- 2. STUDENT_REWARD posted total
  select coalesce(sum(points), 0) into v_posted_reward
  from public.competition_point_transactions
  where student_id = v_target_id
    and ledger_type = 'STUDENT_REWARD'
    and status = 'POSTED';

  -- 3. Reserved/pending reward points from active redemptions (PENDING or APPROVED)
  select coalesce(sum(total_points), 0) into v_reserved_reward
  from public.reward_redemptions
  where student_id = v_target_id
    and status in ('PENDING', 'APPROVED');

  -- 4. Available reward points = Posted - Reserved
  v_available_reward := v_posted_reward - v_reserved_reward;

  -- Incident counters
  select count(*) into v_good_deeds
  from public.competition_incidents i
  join public.competition_rules r on r.id = i.rule_id
  where i.student_id = v_target_id
    and i.status = 'APPROVED'
    and r.category = 'GOOD_DEED';

  select count(*) into v_achievements
  from public.competition_incidents i
  join public.competition_rules r on r.id = i.rule_id
  where i.student_id = v_target_id
    and i.status = 'APPROVED'
    and r.category = 'ACHIEVEMENT';

  select count(*) into v_violations
  from public.competition_incidents i
  join public.competition_rules r on r.id = i.rule_id
  where i.student_id = v_target_id
    and i.status = 'APPROVED'
    and r.category in ('DISCIPLINE', 'ATTENDANCE', 'UNIFORM', 'HYGIENE');

  -- Unit contribution points
  select coalesce(sum(points), 0) into v_unit_contrib
  from public.competition_point_transactions
  where student_id = v_target_id
    and ledger_type = 'UNIT_COMPETITION'
    and status = 'POSTED';

  return jsonb_build_object(
    'student_id', v_profile.id,
    'full_name', v_profile.full_name,
    'student_code', v_profile.student_code,
    'avatar_url', v_profile.avatar_url,
    'unit_info', v_unit_info,
    'accumulated_merit_points', v_accumulated_merit,
    'posted_reward_points', v_posted_reward,
    'reserved_reward_points', v_reserved_reward,
    'available_reward_points', v_available_reward,
    'good_deeds_count', v_good_deeds,
    'achievements_count', v_achievements,
    'violations_count', v_violations,
    'unit_contribution_points', v_unit_contrib
  );
end;
$$;

revoke execute on function public.get_student_competition_profile(uuid) from public, anon;
grant execute on function public.get_student_competition_profile(uuid) to authenticated;

-- ============================================================================
-- RPC: request_reward_redemption
-- ============================================================================
create or replace function public.request_reward_redemption(
  p_reward_item_id uuid,
  p_quantity integer default 1,
  p_student_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_item record;
  v_profile_json jsonb;
  v_avail_pts integer;
  v_total_pts integer;
  v_redemption_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Yêu cầu xác thực.' using errcode = '42501';
  end if;

  if p_quantity <= 0 then
    raise exception 'Số lượng phải lớn hơn 0.' using errcode = '22000';
  end if;

  -- Lock student profile row to prevent race conditions
  perform 1 from public.profiles where id = v_caller_id for update;

  -- Select and lock reward item
  select * into v_item
  from public.reward_items
  where id = p_reward_item_id and is_active = true
  for update;

  if not found then
    raise exception 'Phần thưởng không tồn tại hoặc đã ngưng đổi.' using errcode = 'P0002';
  end if;

  -- Quantity check
  if v_item.quantity < p_quantity then
    raise exception 'Phần thưởng "%" hiện không đủ số lượng trong danh sách (Hiện có %).', v_item.name, v_item.quantity using errcode = 'P0004';
  end if;

  v_total_pts := v_item.points_required * p_quantity;

  -- Check student available reward points
  v_profile_json := public.get_student_competition_profile(v_caller_id);
  v_avail_pts := (v_profile_json->>'available_reward_points')::integer;

  if v_avail_pts < v_total_pts then
    raise exception 'Bạn không đủ điểm thưởng khả dụng (Cần % điểm, hiện có % điểm).', v_total_pts, v_avail_pts using errcode = 'P0004';
  end if;

  -- Create redemption request with status PENDING (without deducting points or quantity)
  insert into public.reward_redemptions (
    student_id, reward_item_id, quantity, points_per_item, total_points, status, student_note, requested_at
  ) values (
    v_caller_id, p_reward_item_id, p_quantity, v_item.points_required, v_total_pts, 'PENDING', p_student_note, now()
  ) returning id into v_redemption_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Đã gửi yêu cầu đổi quà thành công!',
    'redemption_id', v_redemption_id
  );
end;
$$;

revoke execute on function public.request_reward_redemption(uuid, integer, text) from public, anon;
grant execute on function public.request_reward_redemption(uuid, integer, text) to authenticated;

-- ============================================================================
-- RPC: approve_reward_redemption
-- ============================================================================
create or replace function public.approve_reward_redemption(p_redemption_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_red record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not (
    public.has_competition_permission(v_caller_id, 'COMPETITION_REWARD_MANAGE') 
    or public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE')
  ) then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  select * into v_red
  from public.reward_redemptions
  where id = p_redemption_id
  for update;

  if not found then
    raise exception 'Không tìm thấy yêu cầu đổi quà.' using errcode = 'P0002';
  end if;

  if v_red.status <> 'PENDING' then
    raise exception 'Chỉ có thể phê duyệt yêu cầu ở trạng thái CHỜ DUYỆT.' using errcode = 'P0003';
  end if;

  update public.reward_redemptions
  set status = 'APPROVED',
      approved_by = v_caller_id,
      approved_at = now(),
      updated_at = now()
  where id = p_redemption_id;

  return jsonb_build_object('success', true, 'message', 'Đã phê duyệt yêu cầu đổi quà.');
end;
$$;

revoke execute on function public.approve_reward_redemption(uuid) from public, anon;
grant execute on function public.approve_reward_redemption(uuid) to authenticated;

-- ============================================================================
-- RPC: issue_reward_redemption
-- Single-transaction handler for confirming gift distribution, deducting points & reducing quantity
-- ============================================================================
create or replace function public.issue_reward_redemption(p_redemption_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_red record;
  v_item record;
  v_posted_pts integer;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not (
    public.has_competition_permission(v_caller_id, 'COMPETITION_REWARD_MANAGE') 
    or public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE')
  ) then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  -- Lock redemption
  select * into v_red
  from public.reward_redemptions
  where id = p_redemption_id
  for update;

  if not found then
    raise exception 'Không tìm thấy yêu cầu đổi quà.' using errcode = 'P0002';
  end if;

  if v_red.status <> 'APPROVED' then
    raise exception 'Yêu cầu đổi quà phải được duyệt trước khi xác nhận trao quà.' using errcode = 'P0003';
  end if;

  -- Lock student profile
  perform 1 from public.profiles where id = v_red.student_id for update;

  -- Lock reward item
  select * into v_item
  from public.reward_items
  where id = v_red.reward_item_id
  for update;

  if not found then
    raise exception 'Không tìm thấy phần thưởng.' using errcode = 'P0002';
  end if;

  -- Re-check quantity
  if v_item.quantity < v_red.quantity then
    raise exception 'Số lượng phần thưởng hiện không đủ (Còn % quà, cần % quà).', v_item.quantity, v_red.quantity using errcode = 'P0004';
  end if;

  -- Prevent duplicate point deduction for this redemption
  if exists (
    select 1 from public.competition_point_transactions
    where redemption_id = p_redemption_id
      and ledger_type = 'STUDENT_REWARD'
      and transaction_type = 'DEBIT'
  ) then
    raise exception 'Giao dịch trừ điểm cho yêu cầu này đã tồn tại.' using errcode = 'P0003';
  end if;

  -- Re-check student posted reward points balance
  select coalesce(sum(points), 0) into v_posted_pts
  from public.competition_point_transactions
  where student_id = v_red.student_id
    and ledger_type = 'STUDENT_REWARD'
    and status = 'POSTED';

  if v_posted_pts < v_red.total_points then
    raise exception 'Đội viên không đủ điểm thưởng để hoàn tất trao quà (Có % điểm, cần % điểm).', v_posted_pts, v_red.total_points using errcode = 'P0004';
  end if;

  -- 1. Deduct points in STUDENT_REWARD ledger
  insert into public.competition_point_transactions (
    student_id, ledger_type, points, transaction_type, status, effective_at, created_by, redemption_id
  ) values (
    v_red.student_id, 'STUDENT_REWARD', -v_red.total_points, 'DEBIT', 'POSTED', now(), v_caller_id, p_redemption_id
  );

  -- 2. Reduce quantity of reward item by redemption quantity
  update public.reward_items
  set quantity = quantity - v_red.quantity,
      updated_at = now()
  where id = v_red.reward_item_id;

  -- 3. Update redemption status to ISSUED
  update public.reward_redemptions
  set status = 'ISSUED',
      approved_by = coalesce(approved_by, v_caller_id),
      approved_at = coalesce(approved_at, now()),
      issued_by = v_caller_id,
      issued_at = now(),
      updated_at = now()
  where id = p_redemption_id;

  return jsonb_build_object('success', true, 'message', 'Đã xác nhận trao quà, khấu trừ điểm và cập nhật số lượng thành công.');
end;
$$;

revoke execute on function public.issue_reward_redemption(uuid) from public, anon;
grant execute on function public.issue_reward_redemption(uuid) to authenticated;

-- ============================================================================
-- RPC: cancel_reward_redemption
-- ============================================================================
create or replace function public.cancel_reward_redemption(
  p_redemption_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_red record;
  v_is_staff boolean;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Yêu cầu xác thực.' using errcode = '42501';
  end if;

  select * into v_red
  from public.reward_redemptions
  where id = p_redemption_id
  for update;

  if not found then
    raise exception 'Không tìm thấy yêu cầu đổi quà.' using errcode = 'P0002';
  end if;

  if v_red.status in ('ISSUED', 'REJECTED', 'CANCELLED') then
    raise exception 'Yêu cầu đã kết thúc, không thể hủy.' using errcode = 'P0003';
  end if;

  v_is_staff := (
    public.has_competition_permission(v_caller_id, 'COMPETITION_REWARD_MANAGE') 
    or public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE')
  );

  if not v_is_staff and v_red.student_id <> v_caller_id then
    raise exception 'Bạn không có quyền hủy yêu cầu đổi quà của người khác.' using errcode = '42501';
  end if;

  -- Update status without touching points or quantity
  update public.reward_redemptions
  set status = case when v_is_staff then 'REJECTED' else 'CANCELLED' end,
      rejection_reason = p_reason,
      cancelled_by = v_caller_id,
      cancelled_at = now(),
      updated_at = now()
  where id = p_redemption_id;

  return jsonb_build_object(
    'success', true,
    'message', case when v_is_staff then 'Đã từ chối yêu cầu đổi quà.' else 'Đã hủy yêu cầu đổi quà.' end
  );
end;
$$;

revoke execute on function public.cancel_reward_redemption(uuid, text) from public, anon;
grant execute on function public.cancel_reward_redemption(uuid, text) to authenticated;

-- ============================================================================
-- RPC: submit_competition_review_request
-- ============================================================================
create or replace function public.submit_competition_review_request(
  p_incident_id uuid default null,
  p_transaction_id uuid default null,
  p_reason text default null,
  p_evidence_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_incident record;
  v_tx record;
  v_req_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Yêu cầu xác thực.' using errcode = '42501';
  end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'Vui lòng cung cấp lý do đề nghị xem lại.' using errcode = '22000';
  end if;

  if p_incident_id is null and p_transaction_id is null then
    raise exception 'Phải chọn vụ việc hoặc giao dịch cần xem lại.' using errcode = '22000';
  end if;

  -- Validate incident ownership if provided
  if p_incident_id is not null then
    select * into v_incident
    from public.competition_incidents
    where id = p_incident_id;

    if not found then
      raise exception 'Không tìm thấy vụ việc vi phạm/khen thưởng.' using errcode = 'P0002';
    end if;

    if v_incident.student_id <> v_caller_id then
      raise exception 'Bạn không có quyền đề nghị xem lại dữ liệu này.' using errcode = '42501';
    end if;
  end if;

  -- Validate transaction ownership if provided
  if p_transaction_id is not null then
    select * into v_tx
    from public.competition_point_transactions
    where id = p_transaction_id;

    if not found then
      raise exception 'Không tìm thấy giao dịch điểm.' using errcode = 'P0002';
    end if;

    if v_tx.student_id <> v_caller_id then
      raise exception 'Bạn không có quyền đề nghị xem lại dữ liệu này.' using errcode = '42501';
    end if;

    if v_tx.ledger_type not in ('STUDENT_MERIT', 'STUDENT_REWARD') then
      raise exception 'Chỉ được gửi yêu cầu xem lại cho sổ điểm cá nhân.' using errcode = '22000';
    end if;

    if p_incident_id is not null then
      if v_tx.incident_id is null or v_tx.incident_id <> p_incident_id then
        raise exception 'Giao dịch không thuộc về vụ việc đã chọn.' using errcode = '22000';
      end if;
    end if;
  end if;

  -- Duplicate check
  if exists (
    select 1 from public.competition_review_requests
    where student_id = v_caller_id
      and (
        (p_incident_id is not null and incident_id = p_incident_id)
        or (p_transaction_id is not null and transaction_id = p_transaction_id)
      )
      and status = 'PENDING'
  ) then
    raise exception 'Dữ liệu này đã có yêu cầu xem lại đang được xử lý.' using errcode = 'P0003';
  end if;

  insert into public.competition_review_requests (
    incident_id, transaction_id, student_id, reason, evidence_url, status, submitted_at
  ) values (
    p_incident_id, p_transaction_id, v_caller_id, trim(p_reason), p_evidence_url, 'PENDING', now()
  ) returning id into v_req_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Đã gửi yêu cầu xem lại điểm thi đua thành công!',
    'review_request_id', v_req_id
  );
end;
$$;

revoke execute on function public.submit_competition_review_request(uuid, uuid, text, text) from public, anon;
grant execute on function public.submit_competition_review_request(uuid, uuid, text, text) to authenticated;

-- ============================================================================
-- RPC: resolve_competition_review_request
-- ============================================================================
create or replace function public.resolve_competition_review_request(
  p_request_id uuid,
  p_status text,
  p_resolution_note text default null,
  p_adjustment_points integer default null,
  p_ledger_type text default 'STUDENT_MERIT'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_req record;
  v_incident record;
  v_tx record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not (
    public.has_competition_permission(v_caller_id, 'COMPETITION_REVIEW_MANAGE') 
    or public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE')
  ) then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  if p_status not in ('ACCEPTED', 'REJECTED') then
    raise exception 'Trạng thái xử lý không hợp lệ.' using errcode = '22000';
  end if;

  if p_ledger_type = 'UNIT_COMPETITION' then
    raise exception 'Điểm thi đua chi đội phải được xử lý trong phần thi đua chi đội.' using errcode = '22000';
  end if;

  if p_ledger_type not in ('STUDENT_MERIT', 'STUDENT_REWARD') then
    raise exception 'Loại sổ điểm không hợp lệ.' using errcode = '22000';
  end if;

  select * into v_req
  from public.competition_review_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Không tìm thấy yêu cầu xem lại.' using errcode = 'P0002';
  end if;

  if v_req.status in ('ACCEPTED', 'REJECTED', 'CANCELLED') then
    raise exception 'Yêu cầu xem lại đã được xử lý xong.' using errcode = 'P0003';
  end if;

  -- Verify ownership of linked records before accepting
  if p_status = 'ACCEPTED' then
    if p_adjustment_points is null or p_adjustment_points = 0 then
      raise exception 'Vui lòng nhập số điểm cần điều chỉnh khi chấp nhận yêu cầu.' using errcode = '22000';
    end if;

    if v_req.incident_id is not null then
      select * into v_incident from public.competition_incidents where id = v_req.incident_id;
      if found and v_incident.student_id <> v_req.student_id then
        raise exception 'Vụ việc không thuộc về học sinh gửi yêu cầu.' using errcode = '22000';
      end if;
    end if;

    if v_req.transaction_id is not null then
      select * into v_tx from public.competition_point_transactions where id = v_req.transaction_id;
      if found and v_tx.student_id <> v_req.student_id then
        raise exception 'Giao dịch không thuộc về học sinh gửi yêu cầu.' using errcode = '22000';
      end if;
    end if;

    insert into public.competition_point_transactions (
      student_id,
      incident_id,
      ledger_type,
      points,
      transaction_type,
      status,
      effective_at,
      created_by
    ) values (
      v_req.student_id,
      v_req.incident_id,
      p_ledger_type,
      p_adjustment_points,
      case when p_adjustment_points > 0 then 'CREDIT' else 'DEBIT' end,
      'POSTED',
      now(),
      v_caller_id
    );
  end if;

  update public.competition_review_requests
  set status = p_status,
      resolution_note = p_resolution_note,
      adjustment_points = p_adjustment_points,
      reviewed_by = v_caller_id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Đã xử lý yêu cầu xem lại thành công.'
  );
end;
$$;

revoke execute on function public.resolve_competition_review_request(uuid, text, text, integer, text) from public, anon;
grant execute on function public.resolve_competition_review_request(uuid, text, text, integer, text) to authenticated;

-- RLS Policies
alter table public.competition_review_requests enable row level security;
alter table public.reward_items enable row level security;
alter table public.reward_redemptions enable row level security;

-- competition_review_requests policies
drop policy if exists "competition_review_requests_select" on public.competition_review_requests;
create policy "competition_review_requests_select" on public.competition_review_requests
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.has_competition_permission(auth.uid(), 'COMPETITION_REVIEW_MANAGE')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  );

drop policy if exists "competition_review_requests_insert" on public.competition_review_requests;
create policy "competition_review_requests_insert" on public.competition_review_requests
  for insert to authenticated
  with check (student_id = auth.uid());

-- reward_items policies
drop policy if exists "reward_items_select" on public.reward_items;
create policy "reward_items_select" on public.reward_items
  for select to anon, authenticated
  using (
    is_active = true 
    or (
      auth.uid() is not null 
      and (
        public.has_competition_permission(auth.uid(), 'COMPETITION_REWARD_MANAGE')
        or public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
      )
    )
  );

drop policy if exists "reward_items_manage" on public.reward_items;
create policy "reward_items_manage" on public.reward_items
  for all to authenticated
  using (
    public.has_competition_permission(auth.uid(), 'COMPETITION_REWARD_MANAGE')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  );

-- reward_redemptions policies
drop policy if exists "reward_redemptions_select" on public.reward_redemptions;
create policy "reward_redemptions_select" on public.reward_redemptions
  for select to authenticated
  using (
    student_id = auth.uid()
    or public.has_competition_permission(auth.uid(), 'COMPETITION_REWARD_MANAGE')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  );

-- Grants
grant select on public.reward_items to anon;
grant select, insert, update on public.reward_items to authenticated;
grant select on public.reward_redemptions to authenticated;
grant select on public.competition_review_requests to authenticated;

COMMIT;
