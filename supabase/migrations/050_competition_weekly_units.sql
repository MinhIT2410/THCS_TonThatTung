BEGIN;

-- 050_competition_weekly_units.sql
-- Emulation & Competition Module (Part 2/3): Inter-Unit Weekly Competition
-- Tables: competition_weeks, competition_week_units, competition_week_adjustments
-- Ledger linkage: competition_point_transactions adjustment_id, program_id
-- RPCs: open_competition_week, lock_competition_week, unlock_competition_week, 
--       create_competition_week_adjustment, approve_competition_week_adjustment,
--       finalize_competition_week

-- 1. Create competition_weeks table
create table if not exists public.competition_weeks (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.competition_programs(id) on delete restrict,
  academic_year_id uuid null references public.academic_years(id) on delete set null,
  week_number integer not null constraint competition_weeks_number_check check (week_number > 0),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'DRAFT' constraint competition_weeks_status_check check (
    status in ('DRAFT', 'OPEN', 'LOCKED', 'PUBLISHED', 'ARCHIVED')
  ),
  default_starting_points integer not null default 100,
  opened_by uuid null references public.profiles(id) on delete set null,
  opened_at timestamptz null,
  locked_by uuid null references public.profiles(id) on delete set null,
  locked_at timestamptz null,
  published_by uuid null references public.profiles(id) on delete set null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_weeks_dates_check check (starts_on <= ends_on),
  constraint competition_weeks_prog_year_week_unique unique (program_id, academic_year_id, week_number)
);

-- Function to validate non-overlapping weeks for the same program
create or replace function public.validate_competition_week_overlap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_overlap_count integer;
begin
  select count(*) into v_overlap_count
  from public.competition_weeks
  where program_id = NEW.program_id
    and id <> NEW.id
    and status <> 'ARCHIVED'
    and (starts_on <= NEW.ends_on and ends_on >= NEW.starts_on);

  if v_overlap_count > 0 then
    raise exception 'Thời gian tuần thi đua (%) từ % đến % bị chồng lấp với tuần khác cùng chương trình.', 
      NEW.name, NEW.starts_on, NEW.ends_on using errcode = '23514';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_validate_competition_week_overlap on public.competition_weeks;
create trigger trg_validate_competition_week_overlap
before insert or update on public.competition_weeks
for each row execute function public.validate_competition_week_overlap();

-- 2. Create competition_week_units table
create table if not exists public.competition_week_units (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.competition_weeks(id) on delete cascade,
  unit_id uuid not null references public.classes(id) on delete restrict,
  starting_points integer not null default 100,
  manual_bonus_points integer not null default 0,
  manual_penalty_points integer not null default 0,
  final_points_snapshot integer null,
  rank_snapshot integer null,
  comment text null,
  status text not null default 'ACTIVE' constraint competition_week_units_status_check check (
    status in ('ACTIVE', 'LOCKED', 'EXCLUDED')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competition_week_units_week_unit_unique unique (week_id, unit_id)
);

-- 3. Create competition_week_adjustments table
create table if not exists public.competition_week_adjustments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.competition_weeks(id) on delete cascade,
  unit_id uuid not null references public.classes(id) on delete restrict,
  points integer not null,
  reason text not null,
  evidence_url text null,
  status text not null default 'PENDING' constraint competition_week_adjustments_status_check check (
    status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
  ),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz null
);

-- 4. Upgrade competition_point_transactions to support direct adjustments and program_id
alter table public.competition_point_transactions alter column incident_id drop not null;

alter table public.competition_point_transactions 
  add column if not exists adjustment_id uuid null references public.competition_week_adjustments(id) on delete restrict,
  add column if not exists program_id uuid null references public.competition_programs(id) on delete restrict;

-- Triggers for updated_at
drop trigger if exists trg_competition_weeks_updated_at on public.competition_weeks;
create trigger trg_competition_weeks_updated_at before update on public.competition_weeks
for each row execute function public.set_updated_at();

drop trigger if exists trg_competition_week_units_updated_at on public.competition_week_units;
create trigger trg_competition_week_units_updated_at before update on public.competition_week_units
for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_competition_weeks_program on public.competition_weeks(program_id);
create index if not exists idx_competition_weeks_academic_year on public.competition_weeks(academic_year_id);
create index if not exists idx_competition_weeks_status on public.competition_weeks(status);
create index if not exists idx_competition_week_units_week on public.competition_week_units(week_id);
create index if not exists idx_competition_week_units_unit on public.competition_week_units(unit_id);
create index if not exists idx_competition_week_adjustments_week on public.competition_week_adjustments(week_id);
create index if not exists idx_competition_point_tx_adjustment on public.competition_point_transactions(adjustment_id);

-- 5. RPC: open_competition_week
create or replace function public.open_competition_week(
  p_program_id uuid,
  p_academic_year_id uuid,
  p_week_number integer,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_default_starting_points integer default 100,
  p_unit_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_week_id uuid;
  v_unit_rec record;
  v_count integer := 0;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_competition_permission(v_caller_id, 'COMPETITION_WEEK_MANAGE') then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  if p_starts_on > p_ends_on then
    raise exception 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.' using errcode = '22000';
  end if;

  if p_week_number <= 0 then
    raise exception 'Số tuần phải lớn hơn 0.' using errcode = '22000';
  end if;

  -- Create competition_weeks record
  insert into public.competition_weeks (
    program_id, academic_year_id, week_number, name, starts_on, ends_on, status, 
    default_starting_points, opened_by, opened_at
  ) values (
    p_program_id, p_academic_year_id, p_week_number, p_name, p_starts_on, p_ends_on, 'OPEN',
    p_default_starting_points, v_caller_id, now()
  )
  returning id into v_week_id;

  -- Insert units
  if p_unit_ids is not null and array_length(p_unit_ids, 1) > 0 then
    for v_unit_rec in 
      select id from public.classes where id = any(p_unit_ids) and is_active = true
    loop
      insert into public.competition_week_units (
        week_id, unit_id, starting_points, status
      ) values (
        v_week_id, v_unit_rec.id, p_default_starting_points, 'ACTIVE'
      ) on conflict (week_id, unit_id) do nothing;
      v_count := v_count + 1;
    end loop;
  else
    -- Auto populate all active classes for the academic year (or all active classes if academic_year_id is null)
    for v_unit_rec in 
      select id from public.classes 
      where (p_academic_year_id is null or academic_year_id = p_academic_year_id)
        and is_active = true
      order by name
    loop
      insert into public.competition_week_units (
        week_id, unit_id, starting_points, status
      ) values (
        v_week_id, v_unit_rec.id, p_default_starting_points, 'ACTIVE'
      ) on conflict (week_id, unit_id) do nothing;
      v_count := v_count + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Đã mở tuần thi đua thành công!',
    'week_id', v_week_id,
    'units_count', v_count
  );
end;
$$;

revoke execute on function public.open_competition_week from public, anon;
grant execute on function public.open_competition_week to authenticated;

-- 6. RPC: lock_competition_week
create or replace function public.lock_competition_week(p_week_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_week record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_competition_permission(v_caller_id, 'COMPETITION_WEEK_MANAGE') then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  select * into v_week from public.competition_weeks where id = p_week_id for update;
  if not found then
    raise exception 'Không tìm thấy tuần thi đua.' using errcode = 'P0002';
  end if;

  if v_week.status <> 'OPEN' then
    raise exception 'Tuần thi đua không ở trạng thái mở (Trạng thái hiện tại: %).', v_week.status using errcode = 'P0003';
  end if;

  update public.competition_weeks
  set status = 'LOCKED',
      locked_by = v_caller_id,
      locked_at = now(),
      updated_at = now()
  where id = p_week_id;

  return jsonb_build_object('success', true, 'message', 'Đã khóa tuần thi đua thành công.');
end;
$$;

revoke execute on function public.lock_competition_week from public, anon;
grant execute on function public.lock_competition_week to authenticated;

-- 7. RPC: unlock_competition_week
create or replace function public.unlock_competition_week(p_week_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_week record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_competition_permission(v_caller_id, 'COMPETITION_WEEK_MANAGE') then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  select * into v_week from public.competition_weeks where id = p_week_id for update;
  if not found then
    raise exception 'Không tìm thấy tuần thi đua.' using errcode = 'P0002';
  end if;

  if v_week.status not in ('LOCKED', 'PUBLISHED') then
    raise exception 'Chỉ có thể mở lại tuần đang bị khóa hoặc đã công bố.' using errcode = 'P0003';
  end if;

  update public.competition_weeks
  set status = 'OPEN',
      locked_by = null,
      locked_at = null,
      updated_at = now()
  where id = p_week_id;

  return jsonb_build_object('success', true, 'message', 'Đã mở lại tuần thi đua.');
end;
$$;

revoke execute on function public.unlock_competition_week from public, anon;
grant execute on function public.unlock_competition_week to authenticated;

-- 8. RPC: create_competition_week_adjustment
create or replace function public.create_competition_week_adjustment(
  p_week_id uuid,
  p_unit_id uuid,
  p_points integer,
  p_reason text,
  p_evidence_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_week record;
  v_adj_id uuid;
  v_tx_type text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_competition_permission(v_caller_id, 'COMPETITION_WEEK_MANAGE') then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  select * into v_week from public.competition_weeks where id = p_week_id;
  if not found then
    raise exception 'Không tìm thấy tuần thi đua.' using errcode = 'P0002';
  end if;

  if v_week.status not in ('OPEN') then
    raise exception 'Không thể tạo điều chỉnh khi tuần thi đua đã bị khóa hoặc chốt.' using errcode = 'P0003';
  end if;

  if p_points = 0 then
    raise exception 'Số điểm điều chỉnh phải khác 0.' using errcode = '22000';
  end if;

  insert into public.competition_week_adjustments (
    week_id, unit_id, points, reason, evidence_url, status, requested_by, approved_by, approved_at
  ) values (
    p_week_id, p_unit_id, p_points, p_reason, p_evidence_url, 'APPROVED', v_caller_id, v_caller_id, now()
  ) returning id into v_adj_id;

  -- Insert ledger transaction directly for approved adjustment
  v_tx_type := case when p_points > 0 then 'CREDIT' else 'DEBIT' end;
  insert into public.competition_point_transactions (
    adjustment_id, program_id, unit_id, ledger_type, points, transaction_type, status, effective_at, created_by
  ) values (
    v_adj_id, v_week.program_id, p_unit_id, 'UNIT_COMPETITION', p_points, 'ADJUSTMENT', 'POSTED', v_week.starts_on::timestamptz + interval '12 hours', v_caller_id
  );

  return jsonb_build_object('success', true, 'message', 'Đã lưu điều chỉnh điểm chi đội thành công!', 'adjustment_id', v_adj_id);
end;
$$;

revoke execute on function public.create_competition_week_adjustment from public, anon;
grant execute on function public.create_competition_week_adjustment to authenticated;

-- 9. RPC: finalize_competition_week
create or replace function public.finalize_competition_week(p_week_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_week record;
  v_pending_count integer;
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_unit_rec record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not public.has_competition_permission(v_caller_id, 'COMPETITION_WEEK_MANAGE') then
    raise exception 'Quyền truy cập bị từ chối.' using errcode = '42501';
  end if;

  -- Lock week
  select * into v_week from public.competition_weeks where id = p_week_id for update;
  if not found then
    raise exception 'Không tìm thấy tuần thi đua.' using errcode = 'P0002';
  end if;

  if v_week.status in ('PUBLISHED', 'ARCHIVED') then
    raise exception 'Tuần thi đua đã được công bố trước đó.' using errcode = 'P0003';
  end if;

  v_start_ts := v_week.starts_on::timestamptz;
  v_end_ts := (v_week.ends_on + interval '1 day' - interval '1 millisecond')::timestamptz;

  -- Check pending incidents in week range
  select count(*) into v_pending_count
  from public.competition_incidents i
  where i.program_id = v_week.program_id
    and i.status = 'PENDING'
    and i.occurred_at >= v_start_ts
    and i.occurred_at <= v_end_ts;

  if v_pending_count > 0 then
    raise exception 'Vẫn còn % sự việc đang CHỜ DUYỆT trong khoảng thời gian tuần thi đua này. Vui lòng duyệt hoặc từ chối tất cả trước khi chốt tuần.', v_pending_count using errcode = 'P0004';
  end if;

  -- Calculate totals for each unit in competition_week_units
  for v_unit_rec in
    select 
      cwu.id as week_unit_id,
      cwu.unit_id,
      cwu.starting_points,
      coalesce(sum(case when t.points > 0 then t.points else 0 end), 0) as bonus_pts,
      coalesce(sum(case when t.points < 0 then abs(t.points) else 0 end), 0) as penalty_pts,
      cwu.starting_points + coalesce(sum(t.points), 0) as total_pts
    from public.competition_week_units cwu
    left join public.competition_point_transactions t 
      on t.unit_id = cwu.unit_id
     and t.ledger_type = 'UNIT_COMPETITION'
     and t.status = 'POSTED'
     and t.effective_at >= v_start_ts
     and t.effective_at <= v_end_ts
     and (t.program_id = v_week.program_id or t.program_id is null)
    where cwu.week_id = p_week_id
    group by cwu.id, cwu.unit_id, cwu.starting_points
  loop
    update public.competition_week_units
    set manual_bonus_points = v_unit_rec.bonus_pts,
        manual_penalty_points = v_unit_rec.penalty_pts,
        final_points_snapshot = v_unit_rec.total_pts
    where id = v_unit_rec.week_unit_id;
  end loop;

  -- Rank calculation
  with ranked as (
    select 
      id,
      rank() over (order by final_points_snapshot desc, manual_penalty_points asc) as rk
    from public.competition_week_units
    where week_id = p_week_id
  )
  update public.competition_week_units cwu
  set rank_snapshot = r.rk
  from ranked r
  where cwu.id = r.id;

  -- Update week status to PUBLISHED
  update public.competition_weeks
  set status = 'PUBLISHED',
      published_by = v_caller_id,
      published_at = now(),
      updated_at = now()
  where id = p_week_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Đã chốt và công bố kết quả tuần thi đua thành công!'
  );
end;
$$;

revoke execute on function public.finalize_competition_week from public, anon;
grant execute on function public.finalize_competition_week to authenticated;

-- 10. RLS Policies
alter table public.competition_weeks enable row level security;
alter table public.competition_week_units enable row level security;
alter table public.competition_week_adjustments enable row level security;

-- competition_weeks policies
drop policy if exists "competition_weeks_select" on public.competition_weeks;
create policy "competition_weeks_select" on public.competition_weeks
  for select using (
    status = 'PUBLISHED' 
    or (auth.uid() is not null and public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE'))
  );

drop policy if exists "competition_weeks_all_admin" on public.competition_weeks;
create policy "competition_weeks_all_admin" on public.competition_weeks
  for all using (
    auth.uid() is not null and public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE')
  );

-- competition_week_units policies
drop policy if exists "competition_week_units_select" on public.competition_week_units;
create policy "competition_week_units_select" on public.competition_week_units
  for select using (
    exists (
      select 1 from public.competition_weeks w 
      where w.id = week_id and (
        w.status = 'PUBLISHED' 
        or (auth.uid() is not null and public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE'))
      )
    )
  );

drop policy if exists "competition_week_units_all_admin" on public.competition_week_units;
create policy "competition_week_units_all_admin" on public.competition_week_units
  for all using (
    auth.uid() is not null and public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE')
  );

-- competition_week_adjustments policies
drop policy if exists "competition_week_adjustments_select" on public.competition_week_adjustments;
create policy "competition_week_adjustments_select" on public.competition_week_adjustments
  for select using (
    auth.uid() is not null and public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE')
  );

drop policy if exists "competition_week_adjustments_all_admin" on public.competition_week_adjustments;
create policy "competition_week_adjustments_all_admin" on public.competition_week_adjustments
  for all using (
    auth.uid() is not null and public.has_competition_permission(auth.uid(), 'COMPETITION_WEEK_MANAGE')
  );

-- Grant privileges
grant select on public.competition_weeks to anon, authenticated;
grant select on public.competition_week_units to anon, authenticated;
grant all on public.competition_weeks to authenticated;
grant all on public.competition_week_units to authenticated;
grant all on public.competition_week_adjustments to authenticated;

COMMIT;
