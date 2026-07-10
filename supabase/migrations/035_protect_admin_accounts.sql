-- 035_protect_admin_accounts.sql
-- Add BEFORE UPDATE trigger on public.profiles to protect active admin accounts.

create or replace function public.check_admin_protection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_admin_count integer;
begin
  -- 1. Prevent any authenticated user from deactivating their own active account
  if auth.uid() = new.id and old.is_active = true and new.is_active = false then
    raise exception 'Bạn không thể tự khóa tài khoản của chính mình.';
  end if;

  -- 2. Prevent any admin from removing their own admin role
  if auth.uid() = new.id and old.role = 'admin' and new.role <> 'admin' then
    raise exception 'Bạn không thể tự hạ quyền Admin của chính mình.';
  end if;

  -- 3. Prevent reducing the number of active admins in the system to 0
  -- Only execute lock and count check when an active admin is losing their admin status or being deactivated
  if (old.role = 'admin' and old.is_active = true) and (new.role <> 'admin' or new.is_active = false) then
    -- Acquire a transaction-level advisory lock using a fixed unique constant to prevent concurrent race conditions
    perform pg_advisory_xact_lock(482025992);

    select count(*)
    into active_admin_count
    from public.profiles
    where role = 'admin' and is_active = true and id <> new.id;

    if active_admin_count = 0 then
      raise exception 'Hệ thống phải duy trì ít nhất một tài khoản Quản trị viên (Admin) đang hoạt động.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_admin_accounts on public.profiles;

create trigger trg_protect_admin_accounts
before update on public.profiles
for each row
execute function public.check_admin_protection();
