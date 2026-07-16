-- 044_student_codes.sql
-- Create student_code field in profiles and update finalize_invited_user RPC

-- 1. Add student_code field
alter table public.profiles
add column if not exists student_code text null;

-- 2. Create unique index for non-null student_code
create unique index if not exists idx_profiles_student_code_unique
on public.profiles(student_code)
where student_code is not null;

-- 3. Trigger to normalize student_code (trim, uppercase, validation check)
create or replace function public.normalize_student_code_trigger()
returns trigger
language plpgsql
as $$
begin
  if new.student_code is not null then
    -- Trim and uppercase
    new.student_code := upper(trim(new.student_code));
    
    -- Check if empty string
    if new.student_code = '' then
      new.student_code := null;
    -- Validate pattern: only letters A-Z, numbers 0-9 and hyphen (-)
    elsif not (new.student_code ~ '^[A-Z0-9-]+$') then
      raise exception 'Mã học sinh không hợp lệ. Chỉ cho phép các chữ cái (A-Z), số (0-9) và dấu gạch ngang (-).' using errcode = 'P0005';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_normalize_student_code on public.profiles;
create trigger trg_profiles_normalize_student_code
before insert or update of student_code
on public.profiles
for each row
execute function public.normalize_student_code_trigger();

-- 4. Update public.finalize_invited_user RPC to accept student_code
drop function if exists public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid);

create or replace function public.finalize_invited_user(
  target_user_id uuid,
  target_email text,
  target_full_name text,
  target_role_codes text[],
  actor_user_id uuid,
  target_class_id uuid default null,
  target_academic_year_id uuid default null,
  target_student_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unique_roles text[];
  v_normalized_student_code text;
begin
  -- 1. Eliminate duplicates & check roles not empty
  if target_role_codes is null or array_length(target_role_codes, 1) = 0 then
    raise exception 'Người dùng phải có ít nhất một vai trò.' using errcode = 'P0001';
  end if;

  select array_agg(distinct r)
  into v_unique_roles
  from unnest(target_role_codes) r;

  -- 2. Verify all role codes exist in roles table
  if exists (
    select 1 from unnest(v_unique_roles) r
    left join public.roles pr on pr.code = r
    where pr.code is null
  ) then
    raise exception 'Một hoặc nhiều vai trò không hợp lệ.' using errcode = 'P0002';
  end if;

  -- 3. Validate student_code based on roles
  if target_student_code is not null then
    v_normalized_student_code := upper(trim(target_student_code));
    if v_normalized_student_code = '' then
      v_normalized_student_code := null;
    end if;
  else
    v_normalized_student_code := null;
  end if;

  if 'STUDENT' = any(v_unique_roles) then
    if target_class_id is null or target_academic_year_id is null then
      raise exception 'Học sinh bắt buộc phải được chọn lớp học và năm học.' using errcode = 'P0003';
    end if;
  else
    if v_normalized_student_code is not null then
      raise exception 'Chỉ vai trò STUDENT mới được khai báo Mã học sinh.' using errcode = 'P0004';
    end if;
  end if;

  -- 4. Check unique student_code in database to raise clear error early
  if v_normalized_student_code is not null then
    if exists (
      select 1 from public.profiles
      where student_code = v_normalized_student_code and id <> target_user_id
    ) then
      raise exception 'Mã học sinh % đã tồn tại trên hệ thống.', v_normalized_student_code using errcode = 'P0006';
    end if;
  end if;

  -- 5. Ensure profile exists and has proper name, preserving other attributes
  insert into public.profiles (id, full_name, student_code, role, is_active)
  values (
    target_user_id,
    target_full_name,
    v_normalized_student_code,
    'viewer', -- legacy default role in profiles_role_check (used strictly for compatibility with NOT NULL constraint; actual authorization/permissions are strictly resolved from public.user_roles)
    true
  )
  on conflict (id) do update set
    full_name = coalesce(target_full_name, public.profiles.full_name),
    student_code = coalesce(v_normalized_student_code, public.profiles.student_code);

  -- 6. Delete existing user roles and insert new ones
  delete from public.user_roles where user_id = target_user_id;

  insert into public.user_roles (user_id, role_code, created_by)
  select target_user_id, r, actor_user_id
  from unnest(v_unique_roles) r;

  -- 7. Handle Student Enrollment if role contains STUDENT
  if 'STUDENT' = any(v_unique_roles) then
    -- Clean old enrollments to prevent unique constraint violation
    delete from public.student_enrollments where student_id = target_user_id;

    insert into public.student_enrollments (student_id, class_id, academic_year_id)
    values (target_user_id, target_class_id, target_academic_year_id);
  end if;

  -- 8. Insert Audit Log
  insert into public.user_audit_logs (actor_id, target_user_id, action_type, new_data)
  values (
    actor_user_id,
    target_user_id,
    'INVITE_USER',
    jsonb_build_object(
      'email', target_email,
      'full_name', target_full_name,
      'roles', v_unique_roles,
      'class_id', target_class_id,
      'academic_year_id', target_academic_year_id,
      'student_code', v_normalized_student_code
    )
  );
end;
$$;

-- Revoke permissions
revoke execute on function public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid, text) from public;
revoke execute on function public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid, text) from authenticated;
revoke execute on function public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid, text) from anon;

-- Grant to service_role and postgres
grant execute on function public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid, text) to service_role;
grant execute on function public.finalize_invited_user(uuid, text, text, text[], uuid, uuid, uuid, text) to postgres;

-- 5. Adjust SELECT policy for classes to allow all authenticated users (read-only, safe data)
drop policy if exists "Select classes for authorized school roles" on public.classes;
create policy "Select classes for authorized school roles"
on public.classes for select to authenticated
using (true);
