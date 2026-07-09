-- 032_content_modules.sql
-- Content modules for News, Documents, Albums.
-- This migration creates the core CMS content tables used by the frontend API layer.

-- =========================================================
-- NEWS
-- =========================================================

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  slug text not null,
  summary text null,
  content text null,
  thumbnail_url text null,

  status text not null default 'draft',
  published_at timestamptz null,

  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint news_slug_unique unique (slug),
  constraint news_title_not_empty check (length(trim(title)) > 0),
  constraint news_slug_not_empty check (length(trim(slug)) > 0),
  constraint news_status_check check (status in ('draft', 'published', 'archived'))
);

create index if not exists idx_news_status
on public.news(status);

create index if not exists idx_news_published_at
on public.news(published_at desc);

create index if not exists idx_news_slug
on public.news(slug);

-- =========================================================
-- DOCUMENTS
-- =========================================================

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text null,

  category text not null default 'khac',

  file_url text not null,
  file_name text null,
  file_size bigint null,
  mime_type text null,

  status text not null default 'published',
  published_at timestamptz null,

  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint documents_title_not_empty check (length(trim(title)) > 0),
  constraint documents_file_url_not_empty check (length(trim(file_url)) > 0),
  constraint documents_category_check check (
    category in ('ke_hoach', 'cong_van', 'bieu_mau', 'quyet_dinh', 'khac')
  ),
  constraint documents_status_check check (status in ('draft', 'published', 'archived'))
);

create index if not exists idx_documents_category
on public.documents(category);

create index if not exists idx_documents_status
on public.documents(status);

create index if not exists idx_documents_published_at
on public.documents(published_at desc);

-- =========================================================
-- ALBUMS
-- =========================================================

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),

  title text not null,
  description text null,
  cover_image_url text null,

  status text not null default 'published',
  published_at timestamptz null,

  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint albums_title_not_empty check (length(trim(title)) > 0),
  constraint albums_status_check check (status in ('draft', 'published', 'archived'))
);

create index if not exists idx_albums_status
on public.albums(status);

create index if not exists idx_albums_published_at
on public.albums(published_at desc);

-- =========================================================
-- ALBUM IMAGES
-- =========================================================

create table if not exists public.album_images (
  id uuid primary key default gen_random_uuid(),

  album_id uuid not null references public.albums(id) on delete cascade,

  image_url text not null,
  caption text null,
  sort_order integer not null default 0,

  created_by uuid null references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),

  constraint album_images_image_url_not_empty check (length(trim(image_url)) > 0)
);

create index if not exists idx_album_images_album_id
on public.album_images(album_id);

create index if not exists idx_album_images_sort_order
on public.album_images(album_id, sort_order);

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_news_updated_at on public.news;
create trigger trg_news_updated_at
before update on public.news
for each row
execute function public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();

drop trigger if exists trg_albums_updated_at on public.albums;
create trigger trg_albums_updated_at
before update on public.albums
for each row
execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.news enable row level security;
alter table public.documents enable row level security;
alter table public.albums enable row level security;
alter table public.album_images enable row level security;

-- =========================================================
-- PUBLIC READ POLICIES
-- =========================================================

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
-- TEMPORARY AUTHENTICATED MANAGE POLICIES
-- =========================================================
-- These policies are for development/testing only.
-- Replace later with admin/editor role-based policies.

drop policy if exists "Authenticated can manage news temporarily" on public.news;
create policy "Authenticated can manage news temporarily"
on public.news
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can manage documents temporarily" on public.documents;
create policy "Authenticated can manage documents temporarily"
on public.documents
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can manage albums temporarily" on public.albums;
create policy "Authenticated can manage albums temporarily"
on public.albums
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can manage album images temporarily" on public.album_images;
create policy "Authenticated can manage album images temporarily"
on public.album_images
for all
to authenticated
using (true)
with check (true);
