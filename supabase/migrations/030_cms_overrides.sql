-- 030_cms_overrides.sql
-- CMS overrides for Visual Edit Mode
-- Frontend keeps default UI config.
-- Database only stores admin-edited overrides.

create table if not exists public.cms_overrides (
  id uuid primary key default gen_random_uuid(),

  page_key text not null,
  block_key text not null,

  data jsonb not null default '{}'::jsonb,

  is_enabled boolean not null default true,

  updated_by uuid null references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cms_overrides_page_block_unique unique (page_key, block_key),
  constraint cms_overrides_page_key_not_empty check (length(trim(page_key)) > 0),
  constraint cms_overrides_block_key_not_empty check (length(trim(block_key)) > 0)
);

create index if not exists idx_cms_overrides_page_key
on public.cms_overrides(page_key);

create index if not exists idx_cms_overrides_page_block
on public.cms_overrides(page_key, block_key);

create index if not exists idx_cms_overrides_enabled
on public.cms_overrides(is_enabled);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cms_overrides_updated_at on public.cms_overrides;

create trigger trg_cms_overrides_updated_at
before update on public.cms_overrides
for each row
execute function public.set_updated_at();

alter table public.cms_overrides enable row level security;

drop policy if exists "Public can read enabled cms overrides" on public.cms_overrides;

create policy "Public can read enabled cms overrides"
on public.cms_overrides
for select
using (is_enabled = true);

-- Temporary CMS write policy for testing only.
-- Replace this later with admin/editor role-based policies.
drop policy if exists "Authenticated can manage cms overrides temporarily" on public.cms_overrides;

create policy "Authenticated can manage cms overrides temporarily"
on public.cms_overrides
for all
to authenticated
using (true)
with check (true);
