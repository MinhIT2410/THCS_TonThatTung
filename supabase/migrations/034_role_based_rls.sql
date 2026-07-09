-- 034_role_based_rls.sql
-- Replace temporary authenticated manage policies with admin/editor role-based RLS.
-- This migration only creates functions and policies.
-- Do not run automatically without user confirmation.

-- =========================================================
-- ROLE HELPER FUNCTIONS
-- =========================================================

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1
$$;

create or replace function public.has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role = any(required_roles)
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['admin'])
$$;

create or replace function public.is_admin_or_editor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['admin', 'editor'])
$$;

-- =========================================================
-- ENSURE RLS ENABLED
-- =========================================================

alter table public.cms_overrides enable row level security;
alter table public.news enable row level security;
alter table public.documents enable row level security;
alter table public.albums enable row level security;
alter table public.album_images enable row level security;
alter table public.profiles enable row level security;

-- =========================================================
-- DROP TEMPORARY POLICIES
-- =========================================================

drop policy if exists "Authenticated can manage cms overrides temporarily" on public.cms_overrides;

drop policy if exists "Authenticated can manage news temporarily" on public.news;
drop policy if exists "Authenticated can manage documents temporarily" on public.documents;
drop policy if exists "Authenticated can manage albums temporarily" on public.albums;
drop policy if exists "Authenticated can manage album images temporarily" on public.album_images;

drop policy if exists "Authenticated can read profiles temporarily" on public.profiles;

-- Storage temporary policies from previous migration.
drop policy if exists "Authenticated can upload school media temporarily" on storage.objects;
drop policy if exists "Authenticated can update school media temporarily" on storage.objects;
drop policy if exists "Authenticated can delete school media temporarily" on storage.objects;

drop policy if exists "Authenticated can upload school documents temporarily" on storage.objects;
drop policy if exists "Authenticated can update school documents temporarily" on storage.objects;
drop policy if exists "Authenticated can delete school documents temporarily" on storage.objects;

-- =========================================================
-- KEEP / RECREATE PUBLIC READ POLICIES
-- =========================================================

drop policy if exists "Public can read enabled cms overrides" on public.cms_overrides;
create policy "Public can read enabled cms overrides"
on public.cms_overrides
for select
using (is_enabled = true);

drop policy if exists "Public can read published news" on public.news;
create policy "Public can read published news"
on public.news
for select
using (status = 'published');

drop policy if exists "Public can read published documents" on public.documents;
create policy "Public can read published documents"
on public.documents
for select
using (status = 'published');

drop policy if exists "Public can read published albums" on public.albums;
create policy "Public can read published albums"
on public.albums
for select
using (status = 'published');

drop policy if exists "Public can read images from published albums" on public.album_images;
create policy "Public can read images from published albums"
on public.album_images
for select
using (
  exists (
    select 1
    from public.albums
    where albums.id = album_images.album_id
      and albums.status = 'published'
  )
);

-- =========================================================
-- ADMIN / EDITOR MANAGE POLICIES
-- =========================================================

drop policy if exists "Admin and editor can manage cms overrides" on public.cms_overrides;
create policy "Admin and editor can manage cms overrides"
on public.cms_overrides
for all
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

drop policy if exists "Admin and editor can manage news" on public.news;
create policy "Admin and editor can manage news"
on public.news
for all
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

drop policy if exists "Admin and editor can manage documents" on public.documents;
create policy "Admin and editor can manage documents"
on public.documents
for all
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

drop policy if exists "Admin and editor can manage albums" on public.albums;
create policy "Admin and editor can manage albums"
on public.albums
for all
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

drop policy if exists "Admin and editor can manage album images" on public.album_images;
create policy "Admin and editor can manage album images"
on public.album_images
for all
to authenticated
using (public.is_admin_or_editor())
with check (public.is_admin_or_editor());

-- =========================================================
-- PROFILE POLICIES
-- =========================================================

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Admin can read all profiles.
drop policy if exists "Admin can read all profiles" on public.profiles;
create policy "Admin can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- Admin can update profiles.
-- This includes assigning roles and activating/deactivating users.
drop policy if exists "Admin can update profiles" on public.profiles;
create policy "Admin can update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Ensure regular users still cannot update their own role/profile directly.
drop policy if exists "Users can update own basic profile" on public.profiles;

-- =========================================================
-- STORAGE POLICIES
-- =========================================================

-- Keep public read policies for public buckets.
drop policy if exists "Public can read school media" on storage.objects;
create policy "Public can read school media"
on storage.objects
for select
using (bucket_id = 'school-media');

drop policy if exists "Public can read school documents" on storage.objects;
create policy "Public can read school documents"
on storage.objects
for select
using (bucket_id = 'school-document');

-- Admin/editor can upload to CMS/media buckets.
drop policy if exists "Admin and editor can upload school media" on storage.objects;
create policy "Admin and editor can upload school media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'school-media'
  and public.is_admin_or_editor()
);

drop policy if exists "Admin and editor can update school media" on storage.objects;
create policy "Admin and editor can update school media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'school-media'
  and public.is_admin_or_editor()
)
with check (
  bucket_id = 'school-media'
  and public.is_admin_or_editor()
);

drop policy if exists "Admin and editor can delete school media" on storage.objects;
create policy "Admin and editor can delete school media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'school-media'
  and public.is_admin_or_editor()
);

drop policy if exists "Admin and editor can upload school documents" on storage.objects;
create policy "Admin and editor can upload school documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'school-document'
  and public.is_admin_or_editor()
);

drop policy if exists "Admin and editor can update school documents" on storage.objects;
create policy "Admin and editor can update school documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'school-document'
  and public.is_admin_or_editor()
)
with check (
  bucket_id = 'school-document'
  and public.is_admin_or_editor()
);

drop policy if exists "Admin and editor can delete school documents" on storage.objects;
create policy "Admin and editor can delete school documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'school-document'
  and public.is_admin_or_editor()
);
