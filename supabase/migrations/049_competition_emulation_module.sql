BEGIN;

-- 049_competition_emulation_module.sql
-- Emulation & Competition Module (Part 1/3)
-- Tables: competition_permissions, user_competition_permissions, competition_programs, competition_rules, competition_incidents, competition_incident_evidence, competition_point_transactions
-- Functions & RPCs: has_competition_permission, check_competition_week_lock, approve_competition_incident, create_competition_incident, reverse_competition_incident, reject_competition_incident, get_student_current_unit

-- ============================================================================
-- 1. COMPETITION PERMISSIONS MODEL
-- ============================================================================

create table if not exists public.competition_permissions (
  code text primary key,
  name text not null,
  description text null,
  created_at timestamptz not null default now()
);

insert into public.competition_permissions (code, name, description) values
  ('COMPETITION_MANAGE', 'Quản lý chương trình & quy tắc thi đua', 'Toàn quyền cấu hình, tạo chương trình, quy tắc và phân quyền thi đua'),
  ('COMPETITION_RECORD', 'Ghi nhận sự việc thi đua', 'Quyền ghi nhận việc tốt, thành tích, vi phạm hoặc chấm điểm thi đua'),
  ('COMPETITION_APPROVE', 'Duyệt/Từ chối sự việc thi đua', 'Quyền duyệt hoặc từ chối các sự việc thi đua chờ duyệt'),
  ('COMPETITION_WEEK_MANAGE', 'Quản lý tuần thi đua chi đội', 'Quyền mở, khóa, mở lại, chốt và công bố bảng xếp hạng tuần'),
  ('COMPETITION_REWARD_MANAGE', 'Quản lý kho & đổi quà tặng', 'Quyền quản lý phần thưởng, duyệt và trao quà cho đội viên'),
  ('COMPETITION_REVIEW_MANAGE', 'Quản lý xem lại điểm thi đua', 'Quyền xử lý các yêu cầu đề nghị xem lại điểm thi đua')
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description;

create table if not exists public.user_competition_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_code text not null references public.competition_permissions(code) on delete cascade,
  granted_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint user_competition_permissions_user_perm_unique unique (user_id, permission_code)
);

create or replace function public.has_competition_permission(
  p_user_id uuid,
  p_permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.is_active = true
      and (
        -- SUPER_ADMIN bypasses technically
        exists (
          select 1 from public.user_roles ur 
          where ur.user_id = p_user_id and ur.role_code = 'SUPER_ADMIN'
        )
        -- PRINCIPAL has default full competition access
        or exists (
          select 1 from public.user_roles ur 
          where ur.user_id = p_user_id and ur.role_code = 'PRINCIPAL'
        )
        -- Granted COMPETITION_MANAGE can manage all competition features
        or exists (
          select 1 from public.user_competition_permissions ucp
          where ucp.user_id = p_user_id and ucp.permission_code = 'COMPETITION_MANAGE'
        )
        -- Specifically granted the requested permission
        or exists (
          select 1 from public.user_competition_permissions ucp
          where ucp.user_id = p_user_id and ucp.permission_code = p_permission_code
        )
      )
  );
$$;

-- ============================================================================
-- 2. TABLES & SCHEMA
-- ============================================================================

-- Competition Programs
create table if not exists public.competition_programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text null,
  academic_year_id uuid null references public.academic_years(id) on delete set null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  is_active boolean not null default true,
  created_by uuid null references public.profiles(id) on delete set null,
  updated_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Competition Rules
create table if not exists public.competition_rules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.competition_programs(id) on delete restrict,
  code text not null,
  name text not null,
  description text null,
  category text not null constraint competition_rules_category_check check (
    category in ('GOOD_DEED', 'ACHIEVEMENT', 'PARTICIPATION', 'DISCIPLINE', 'ATTENDANCE', 'UNIFORM', 'HYGIENE', 'OTHER')
  ),
  effect_scope text not null constraint competition_rules_effect_scope_check check (
    effect_scope in ('STUDENT_ONLY', 'UNIT_ONLY', 'BOTH', 'RECORD_ONLY')
  ),
  student_merit_points integer not null default 0,
  student_reward_points integer not null default 0,
  unit_points integer not null default 0,
  requires_evidence boolean not null default false,
  requires_approval boolean not null default false,
  daily_limit integer null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_rules_program_code_unique unique (program_id, code)
);

-- Competition Incidents
create table if not exists public.competition_incidents (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.competition_programs(id) on delete restrict,
  rule_id uuid not null references public.competition_rules(id) on delete restrict,
  student_id uuid null references public.profiles(id) on delete restrict,
  unit_id uuid null references public.classes(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  title text not null,
  description text null,
  evidence_note text null,
  status text not null default 'DRAFT' constraint competition_incidents_status_check check (
    status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
  ),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid null references public.profiles(id) on delete restrict,
  approved_at timestamptz null,
  rejected_by uuid null references public.profiles(id) on delete restrict,
  rejected_at timestamptz null,
  rejection_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Competition Incident Evidence
create table if not exists public.competition_incident_evidence (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.competition_incidents(id) on delete cascade,
  evidence_type text not null constraint competition_incident_evidence_type_check check (
    evidence_type in ('IMAGE', 'INTERNAL_LINK', 'EXTERNAL_LINK')
  ),
  file_url text null,
  external_url text null,
  caption text null,
  display_order integer not null default 0,
  uploaded_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Competition Point Transactions (Immutable Ledger)
create table if not exists public.competition_point_transactions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid null references public.competition_incidents(id) on delete restrict,
  student_id uuid null references public.profiles(id) on delete restrict,
  unit_id uuid null references public.classes(id) on delete restrict,
  ledger_type text not null constraint competition_point_transactions_ledger_type_check check (
    ledger_type in ('STUDENT_MERIT', 'STUDENT_REWARD', 'UNIT_COMPETITION')
  ),
  points integer not null,
  transaction_type text not null constraint competition_point_transactions_type_check check (
    transaction_type in ('CREDIT', 'DEBIT', 'REVERSAL', 'ADJUSTMENT')
  ),
  status text not null default 'PENDING' constraint competition_point_transactions_status_check check (
    status in ('PENDING', 'POSTED', 'REVERSED')
  ),
  effective_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id) on delete restrict,
  reversed_transaction_id uuid null references public.competition_point_transactions(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- Unique Partial Index to prevent duplicate ledger postings per incident
create unique index if not exists idx_competition_point_tx_incident_ledger_unique
on public.competition_point_transactions(incident_id, ledger_type)
where (incident_id is not null and transaction_type in ('CREDIT', 'DEBIT'));

-- Triggers for updated_at tracking
drop trigger if exists trg_competition_programs_updated_at on public.competition_programs;
create trigger trg_competition_programs_updated_at before update on public.competition_programs
for each row execute function public.set_updated_at();

drop trigger if exists trg_competition_rules_updated_at on public.competition_rules;
create trigger trg_competition_rules_updated_at before update on public.competition_rules
for each row execute function public.set_updated_at();

drop trigger if exists trg_competition_incidents_updated_at on public.competition_incidents;
create trigger trg_competition_incidents_updated_at before update on public.competition_incidents
for each row execute function public.set_updated_at();

-- Indexes for efficient queries
create index if not exists idx_competition_programs_academic_year on public.competition_programs(academic_year_id);
create index if not exists idx_competition_rules_program on public.competition_rules(program_id);
create index if not exists idx_competition_incidents_student on public.competition_incidents(student_id);
create index if not exists idx_competition_incidents_unit on public.competition_incidents(unit_id);
create index if not exists idx_competition_incidents_status on public.competition_incidents(status);
create index if not exists idx_competition_point_transactions_incident on public.competition_point_transactions(incident_id);
create index if not exists idx_competition_point_transactions_student on public.competition_point_transactions(student_id);
create index if not exists idx_competition_point_transactions_unit on public.competition_point_transactions(unit_id);
create index if not exists idx_competition_point_transactions_ledger_status on public.competition_point_transactions(ledger_type, status);

-- Helper RPC: check_competition_week_lock
create or replace function public.check_competition_week_lock(
  p_program_id uuid,
  p_target_time timestamptz
)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_week_status text;
begin
  select status into v_week_status
  from public.competition_weeks
  where program_id = p_program_id
    and status in ('LOCKED', 'PUBLISHED')
    and starts_on <= p_target_time::date
    and ends_on >= p_target_time::date
  limit 1;

  if v_week_status is not null then
    raise exception 'Tuần thi đua chứa thời điểm này đã bị khóa hoặc công bố.' using errcode = 'P0003';
  end if;
end;
$$;

-- Helper RPC: get_student_current_unit
create or replace function public.get_student_current_unit(p_student_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_class_id uuid;
  v_class_name text;
  v_academic_year_id uuid;
begin
  select se.class_id, c.name, se.academic_year_id
  into v_class_id, v_class_name, v_academic_year_id
  from public.student_enrollments se
  join public.classes c on c.id = se.class_id
  join public.academic_years ay on ay.id = se.academic_year_id
  where se.student_id = p_student_id
    and (ay.is_current = true or ay.is_active = true)
  order by ay.is_current desc, ay.is_active desc, se.created_at desc
  limit 1;

  if v_class_id is null then
    return jsonb_build_object(
      'has_unit', false,
      'message', 'Đội viên chưa được phân vào chi đội.'
    );
  end if;

  return jsonb_build_object(
    'has_unit', true,
    'class_id', v_class_id,
    'class_name', v_class_name,
    'academic_year_id', v_academic_year_id
  );
end;
$$;

revoke execute on function public.get_student_current_unit(uuid) from public, anon;
grant execute on function public.get_student_current_unit(uuid) to authenticated;

-- Helper RPC: approve_competition_incident
create or replace function public.approve_competition_incident(p_incident_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_incident record;
  v_rule record;
  v_tx_type text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_competition_permission(v_caller_id, 'COMPETITION_APPROVE') then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  -- Lock incident
  select * into v_incident
  from public.competition_incidents
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'Không tìm thấy sự việc.' using errcode = 'P0002';
  end if;

  if v_incident.status <> 'PENDING' then
    raise exception 'Sự việc không ở trạng thái chờ duyệt (Trạng thái hiện tại: %).', v_incident.status using errcode = 'P0003';
  end if;

  -- Prevent self approval unless SUPER_ADMIN or PRINCIPAL
  if v_incident.recorded_by = v_caller_id and not (public.has_app_role(v_caller_id, 'SUPER_ADMIN') or public.has_app_role(v_caller_id, 'PRINCIPAL')) then
    raise exception 'Người ghi nhận không được tự duyệt sự việc của chính mình.' using errcode = '42501';
  end if;

  -- Load rule from database
  select * into v_rule
  from public.competition_rules
  where id = v_incident.rule_id;

  if not found then
    raise exception 'Không tìm thấy quy tắc thi đua liên kết.' using errcode = 'P0002';
  end if;

  -- Check locked week for unit points
  if v_rule.effect_scope in ('UNIT_ONLY', 'BOTH') and v_rule.unit_points <> 0 then
    perform public.check_competition_week_lock(v_incident.program_id, v_incident.occurred_at);
  end if;

  -- Verify scope constraints
  if v_rule.effect_scope = 'BOTH' then
    if v_incident.student_id is null or v_incident.unit_id is null then
      raise exception 'Quy tắc thi đua yêu cầu phải có cả thông tin Đội viên và Chi đội.' using errcode = 'P0004';
    end if;
  elsif v_rule.effect_scope = 'STUDENT_ONLY' then
    if v_incident.student_id is null then
      raise exception 'Quy tắc thi đua yêu cầu phải chọn Đội viên.' using errcode = 'P0004';
    end if;
  elsif v_rule.effect_scope = 'UNIT_ONLY' then
    if v_incident.unit_id is null then
      raise exception 'Quy tắc thi đua yêu cầu phải chọn Chi đội.' using errcode = 'P0004';
    end if;
  end if;

  -- Create point transactions if scope applies and points != 0
  if v_rule.effect_scope in ('STUDENT_ONLY', 'BOTH') and v_rule.student_merit_points <> 0 then
    v_tx_type := case when v_rule.student_merit_points > 0 then 'CREDIT' else 'DEBIT' end;
    insert into public.competition_point_transactions (
      incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
    ) values (
      v_incident.id, v_incident.student_id, v_incident.unit_id, 'STUDENT_MERIT', v_rule.student_merit_points, v_tx_type, 'POSTED', v_incident.occurred_at, v_caller_id
    ) on conflict (incident_id, ledger_type) where (incident_id is not null and transaction_type in ('CREDIT', 'DEBIT')) do nothing;
  end if;

  if v_rule.effect_scope in ('STUDENT_ONLY', 'BOTH') and v_rule.student_reward_points <> 0 then
    v_tx_type := case when v_rule.student_reward_points > 0 then 'CREDIT' else 'DEBIT' end;
    insert into public.competition_point_transactions (
      incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
    ) values (
      v_incident.id, v_incident.student_id, v_incident.unit_id, 'STUDENT_REWARD', v_rule.student_reward_points, v_tx_type, 'POSTED', v_incident.occurred_at, v_caller_id
    ) on conflict (incident_id, ledger_type) where (incident_id is not null and transaction_type in ('CREDIT', 'DEBIT')) do nothing;
  end if;

  if v_rule.effect_scope in ('UNIT_ONLY', 'BOTH') and v_rule.unit_points <> 0 then
    v_tx_type := case when v_rule.unit_points > 0 then 'CREDIT' else 'DEBIT' end;
    insert into public.competition_point_transactions (
      incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
    ) values (
      v_incident.id, v_incident.student_id, v_incident.unit_id, 'UNIT_COMPETITION', v_rule.unit_points, v_tx_type, 'POSTED', v_incident.occurred_at, v_caller_id
    ) on conflict (incident_id, ledger_type) where (incident_id is not null and transaction_type in ('CREDIT', 'DEBIT')) do nothing;
  end if;

  -- Update incident status to APPROVED
  update public.competition_incidents
  set status = 'APPROVED',
      approved_by = v_caller_id,
      approved_at = now(),
      updated_at = now()
  where id = v_incident.id;

  return jsonb_build_object('success', true, 'message', 'Đã duyệt sự việc thành công.');
end;
$$;

revoke execute on function public.approve_competition_incident(uuid) from public, anon;
grant execute on function public.approve_competition_incident(uuid) to authenticated;

-- Helper RPC: create_competition_incident
create or replace function public.create_competition_incident(
  p_program_id uuid,
  p_rule_id uuid,
  p_student_id uuid default null,
  p_unit_id uuid default null,
  p_occurred_at timestamptz default now(),
  p_title text default null,
  p_description text default null,
  p_evidence_note text default null,
  p_evidence_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_rule record;
  v_unit_id uuid := p_unit_id;
  v_unit_info jsonb;
  v_incident_id uuid;
  v_status text;
  v_title text := trim(p_title);
  v_item jsonb;
  v_occurred_at timestamptz := coalesce(p_occurred_at, now());
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_competition_permission(v_caller_id, 'COMPETITION_RECORD') then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  -- Fetch rule
  select * into v_rule
  from public.competition_rules
  where id = p_rule_id and program_id = p_program_id;

  if not found then
    raise exception 'Quy tắc thi đua không tồn tại hoặc không thuộc chương trình được chọn.' using errcode = 'P0002';
  end if;

  if not v_rule.is_active then
    raise exception 'Quy tắc thi đua này đang tạm khóa.' using errcode = 'P0003';
  end if;

  -- Enforce requires_evidence validation
  if v_rule.requires_evidence then
    if p_evidence_items is null or jsonb_typeof(p_evidence_items) <> 'array' or jsonb_array_length(p_evidence_items) = 0 then
      raise exception 'Quy tắc này yêu cầu phải có minh chứng.' using errcode = 'P0004';
    end if;

    declare
      v_valid_evidence_found boolean := false;
      v_type text;
      v_file_url text;
      v_ext_url text;
    begin
      for v_item in select * from jsonb_array_elements(p_evidence_items)
      loop
        v_type := coalesce(v_item->>'evidence_type', 'IMAGE');
        v_file_url := trim(coalesce(v_item->>'file_url', ''));
        v_ext_url := trim(coalesce(v_item->>'external_url', ''));

        if v_type = 'IMAGE' and v_file_url <> '' then
          v_valid_evidence_found := true;
        elsif v_type in ('INTERNAL_LINK', 'EXTERNAL_LINK') and (v_file_url <> '' or v_ext_url <> '') then
          v_valid_evidence_found := true;
        end if;
      end loop;

      if not v_valid_evidence_found then
        raise exception 'Quy tắc này yêu cầu phải có minh chứng.' using errcode = 'P0004';
      end if;
    end;
  end if;

  -- Auto resolve student unit if student_id is provided and unit_id is null
  if p_student_id is not null and v_unit_id is null then
    v_unit_info := public.get_student_current_unit(p_student_id);
    if (v_unit_info->>'has_unit')::boolean = true then
      v_unit_id := (v_unit_info->>'class_id')::uuid;
    end if;
  end if;

  -- Validate scope requirements
  if v_rule.effect_scope = 'BOTH' then
    if p_student_id is null then
      raise exception 'Quy tắc này yêu cầu phải chọn Đội viên.' using errcode = 'P0004';
    end if;
    if v_unit_id is null then
      raise exception 'Đội viên chưa được phân vào chi đội.' using errcode = 'P0004';
    end if;
  elsif v_rule.effect_scope = 'STUDENT_ONLY' then
    if p_student_id is null then
      raise exception 'Quy tắc này yêu cầu phải chọn Đội viên.' using errcode = 'P0004';
    end if;
  elsif v_rule.effect_scope = 'UNIT_ONLY' then
    if v_unit_id is null then
      raise exception 'Quy tắc này yêu cầu phải xác định Chi đội.' using errcode = 'P0004';
    end if;
  end if;

  -- Enforce daily_limit validation
  if v_rule.daily_limit is not null and v_rule.daily_limit > 0 then
    declare
      v_existing_count integer := 0;
      v_occurred_date date := v_occurred_at::date;
    begin
      if v_rule.effect_scope in ('STUDENT_ONLY', 'BOTH') and p_student_id is not null then
        select count(*) into v_existing_count
        from public.competition_incidents
        where rule_id = v_rule.id
          and student_id = p_student_id
          and status not in ('REJECTED', 'CANCELLED')
          and occurred_at::date = v_occurred_date;
      elsif v_rule.effect_scope = 'UNIT_ONLY' and v_unit_id is not null then
        select count(*) into v_existing_count
        from public.competition_incidents
        where rule_id = v_rule.id
          and unit_id = v_unit_id
          and status not in ('REJECTED', 'CANCELLED')
          and occurred_at::date = v_occurred_date;
      else
        select count(*) into v_existing_count
        from public.competition_incidents
        where rule_id = v_rule.id
          and (
            (p_student_id is not null and student_id = p_student_id) or
            (v_unit_id is not null and unit_id = v_unit_id)
          )
          and status not in ('REJECTED', 'CANCELLED')
          and occurred_at::date = v_occurred_date;
      end if;

      if v_existing_count >= v_rule.daily_limit then
        raise exception 'Đã đạt giới hạn tối đa % lần ghi nhận/ngày cho quy tắc này.', v_rule.daily_limit using errcode = 'P0004';
      end if;
    end;
  end if;

  if v_title is null or v_title = '' then
    v_title := v_rule.name;
  end if;

  -- Determine status
  if v_rule.requires_approval then
    v_status := 'PENDING';
  else
    v_status := 'APPROVED';
  end if;

  -- Check locked week if auto-approved and unit points apply
  if v_status = 'APPROVED' and v_rule.effect_scope in ('UNIT_ONLY', 'BOTH') and v_rule.unit_points <> 0 then
    perform public.check_competition_week_lock(p_program_id, v_occurred_at);
  end if;

  -- Insert incident
  insert into public.competition_incidents (
    program_id, rule_id, student_id, unit_id, occurred_at, title, description, evidence_note, status, recorded_by, approved_by, approved_at
  ) values (
    p_program_id, p_rule_id, p_student_id, v_unit_id, v_occurred_at, v_title, p_description, p_evidence_note,
    v_status, v_caller_id, case when v_status = 'APPROVED' then v_caller_id else null end, case when v_status = 'APPROVED' then now() else null end
  )
  returning id into v_incident_id;

  -- Insert evidence items if provided
  if p_evidence_items is not null and jsonb_array_length(p_evidence_items) > 0 then
    for v_item in select * from jsonb_array_elements(p_evidence_items)
    loop
      insert into public.competition_incident_evidence (
        incident_id, evidence_type, file_url, external_url, caption, display_order, uploaded_by
      ) values (
        v_incident_id,
        coalesce(v_item->>'evidence_type', 'IMAGE'),
        v_item->>'file_url',
        v_item->>'external_url',
        v_item->>'caption',
        coalesce((v_item->>'display_order')::integer, 0),
        v_caller_id
      );
    end loop;
  end if;

  -- If status is APPROVED immediately, create point transactions
  if v_status = 'APPROVED' then
    if v_rule.effect_scope in ('STUDENT_ONLY', 'BOTH') and v_rule.student_merit_points <> 0 then
      insert into public.competition_point_transactions (
        incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
      ) values (
        v_incident_id, p_student_id, v_unit_id, 'STUDENT_MERIT', v_rule.student_merit_points,
        case when v_rule.student_merit_points > 0 then 'CREDIT' else 'DEBIT' end, 'POSTED', v_occurred_at, v_caller_id
      ) on conflict (incident_id, ledger_type) where (incident_id is not null and transaction_type in ('CREDIT', 'DEBIT')) do nothing;
    end if;

    if v_rule.effect_scope in ('STUDENT_ONLY', 'BOTH') and v_rule.student_reward_points <> 0 then
      insert into public.competition_point_transactions (
        incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
      ) values (
        v_incident_id, p_student_id, v_unit_id, 'STUDENT_REWARD', v_rule.student_reward_points,
        case when v_rule.student_reward_points > 0 then 'CREDIT' else 'DEBIT' end, 'POSTED', v_occurred_at, v_caller_id
      ) on conflict (incident_id, ledger_type) where (incident_id is not null and transaction_type in ('CREDIT', 'DEBIT')) do nothing;
    end if;

    if v_rule.effect_scope in ('UNIT_ONLY', 'BOTH') and v_rule.unit_points <> 0 then
      insert into public.competition_point_transactions (
        incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
      ) values (
        v_incident_id, p_student_id, v_unit_id, 'UNIT_COMPETITION', v_rule.unit_points,
        case when v_rule.unit_points > 0 then 'CREDIT' else 'DEBIT' end, 'POSTED', v_occurred_at, v_caller_id
      ) on conflict (incident_id, ledger_type) where (incident_id is not null and transaction_type in ('CREDIT', 'DEBIT')) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'incident_id', v_incident_id,
    'status', v_status,
    'message', case when v_status = 'PENDING' then 'Sự việc đã được ghi nhận và gửi chờ duyệt.' else 'Sự việc đã được ghi nhận và áp dụng điểm thành công.' end
  );
end;
$$;

revoke execute on function public.create_competition_incident(uuid, uuid, uuid, uuid, timestamptz, text, text, text, jsonb) from public, anon;
grant execute on function public.create_competition_incident(uuid, uuid, uuid, uuid, timestamptz, text, text, text, jsonb) to authenticated;

-- Helper RPC: reverse_competition_incident
create or replace function public.reverse_competition_incident(
  p_incident_id uuid,
  p_reason text default null
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
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not (public.has_competition_permission(v_caller_id, 'COMPETITION_APPROVE') or public.has_competition_permission(v_caller_id, 'COMPETITION_MANAGE')) then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  select * into v_incident
  from public.competition_incidents
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'Không tìm thấy sự việc.' using errcode = 'P0002';
  end if;

  if v_incident.status <> 'APPROVED' then
    raise exception 'Chỉ có thể đảo ngược/hủy sự việc đã duyệt.' using errcode = 'P0003';
  end if;

  -- Reverse all POSTED transactions
  for v_tx in
    select * from public.competition_point_transactions
    where incident_id = p_incident_id and status = 'POSTED'
  loop
    insert into public.competition_point_transactions (
      incident_id, student_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by, reversed_transaction_id
    ) values (
      v_tx.incident_id, v_tx.student_id, v_tx.unit_id, v_tx.ledger_type, -v_tx.points, 'REVERSAL', 'REVERSED', now(), v_caller_id, v_tx.id
    );

    update public.competition_point_transactions
    set status = 'REVERSED'
    where id = v_tx.id;
  end loop;

  update public.competition_incidents
  set status = 'CANCELLED',
      rejection_reason = coalesce(p_reason, 'Giao dịch đã được đảo/hủy'),
      updated_at = now()
  where id = p_incident_id;

  return jsonb_build_object('success', true, 'message', 'Đã hủy sự việc và tạo giao dịch đảo điểm thành công.');
end;
$$;

revoke execute on function public.reverse_competition_incident(uuid, text) from public, anon;
grant execute on function public.reverse_competition_incident(uuid, text) to authenticated;

-- Helper RPC: reject_competition_incident
create or replace function public.reject_competition_incident(
  p_incident_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_incident record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_competition_permission(v_caller_id, 'COMPETITION_APPROVE') then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  select * into v_incident
  from public.competition_incidents
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'Không tìm thấy sự việc.' using errcode = 'P0002';
  end if;

  if v_incident.status <> 'PENDING' then
    raise exception 'Sự việc không ở trạng thái chờ duyệt.' using errcode = 'P0003';
  end if;

  update public.competition_incidents
  set status = 'REJECTED',
      rejected_by = v_caller_id,
      rejected_at = now(),
      rejection_reason = p_reason,
      updated_at = now()
  where id = p_incident_id;

  return jsonb_build_object('success', true, 'message', 'Đã từ chối ghi nhận sự việc.');
end;
$$;

revoke execute on function public.reject_competition_incident(uuid, text) from public, anon;
grant execute on function public.reject_competition_incident(uuid, text) to authenticated;

-- Enable Row Level Security
alter table public.competition_permissions enable row level security;
alter table public.user_competition_permissions enable row level security;
alter table public.competition_programs enable row level security;
alter table public.competition_rules enable row level security;
alter table public.competition_incidents enable row level security;
alter table public.competition_incident_evidence enable row level security;
alter table public.competition_point_transactions enable row level security;

-- RLS Policies

-- competition_permissions
create policy "competition_permissions_select" on public.competition_permissions
  for select to authenticated using (true);

-- user_competition_permissions
create policy "user_competition_permissions_select" on public.user_competition_permissions
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
  );

create policy "user_competition_permissions_manage" on public.user_competition_permissions
  for all to authenticated
  using (public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE'))
  with check (public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE'));

-- competition_programs
create policy "competition_programs_select" on public.competition_programs
  for select to authenticated using (true);

create policy "competition_programs_manage" on public.competition_programs
  for all to authenticated
  using (public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE'))
  with check (public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE'));

-- competition_rules
create policy "competition_rules_select" on public.competition_rules
  for select to authenticated using (true);

create policy "competition_rules_manage" on public.competition_rules
  for all to authenticated
  using (public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE'))
  with check (public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE'));

-- competition_incidents
create policy "competition_incidents_select" on public.competition_incidents
  for select to authenticated
  using (
    public.has_competition_permission(auth.uid(), 'COMPETITION_RECORD')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_APPROVE')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
    or student_id = auth.uid()
    or recorded_by = auth.uid()
  );

create policy "competition_incidents_insert" on public.competition_incidents
  for insert to authenticated
  with check (
    public.has_competition_permission(auth.uid(), 'COMPETITION_RECORD')
    and recorded_by = auth.uid()
  );

create policy "competition_incidents_update" on public.competition_incidents
  for update to authenticated
  using (
    public.has_competition_permission(auth.uid(), 'COMPETITION_APPROVE')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
    or (recorded_by = auth.uid() and status = 'DRAFT')
  )
  with check (
    public.has_competition_permission(auth.uid(), 'COMPETITION_APPROVE')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
    or (recorded_by = auth.uid() and status in ('DRAFT', 'PENDING'))
  );

-- competition_incident_evidence
create policy "competition_incident_evidence_select" on public.competition_incident_evidence
  for select to authenticated
  using (
    public.has_competition_permission(auth.uid(), 'COMPETITION_RECORD')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_APPROVE')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
    or exists (
      select 1 from public.competition_incidents i
      where i.id = incident_id and (i.student_id = auth.uid() or i.recorded_by = auth.uid())
    )
  );

create policy "competition_incident_evidence_insert" on public.competition_incident_evidence
  for insert to authenticated
  with check (
    public.has_competition_permission(auth.uid(), 'COMPETITION_RECORD')
  );

-- competition_point_transactions (Immutable Ledger: SELECT only, no client INSERT/UPDATE/DELETE)
create policy "competition_point_transactions_select" on public.competition_point_transactions
  for select to authenticated
  using (
    public.has_competition_permission(auth.uid(), 'COMPETITION_RECORD')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_APPROVE')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE')
    or public.has_competition_permission(auth.uid(), 'COMPETITION_MANAGE')
    or student_id = auth.uid()
  );

COMMIT;
