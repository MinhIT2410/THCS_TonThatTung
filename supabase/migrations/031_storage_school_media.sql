-- 031_storage_school_media.sql
-- Storage bucket and policies for CMS media and document uploads.

-- Create school-media bucket for image uploads
insert into storage.buckets (id, name, public)
values ('school-media', 'school-media', true)
on conflict (id) do nothing;

-- Create school-document bucket for document/file uploads
insert into storage.buckets (id, name, public)
values ('school-document', 'school-document', true)
on conflict (id) do nothing;

-- Public can view files in both buckets.
drop policy if exists "Public can read school media" on storage.objects;
create policy "Public can read school media"
on storage.objects
for select
using (bucket_id = 'school-media' or bucket_id = 'school-document');

-- Temporary upload policy for authenticated users.
-- Replace this later with admin/editor role-based policies.
drop policy if exists "Authenticated can upload school media temporarily" on storage.objects;
create policy "Authenticated can upload school media temporarily"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'school-media' or bucket_id = 'school-document');

drop policy if exists "Authenticated can update school media temporarily" on storage.objects;
create policy "Authenticated can update school media temporarily"
on storage.objects
for update
to authenticated
using (bucket_id = 'school-media' or bucket_id = 'school-document')
with check (bucket_id = 'school-media' or bucket_id = 'school-document');

drop policy if exists "Authenticated can delete school media temporarily" on storage.objects;
create policy "Authenticated can delete school media temporarily"
on storage.objects
for delete
to authenticated
using (bucket_id = 'school-media' or bucket_id = 'school-document');
