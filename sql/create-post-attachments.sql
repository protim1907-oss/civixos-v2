-- Storage policies for the `post-attachments` bucket (Create Post attachments).
--
-- The bucket exists and is public, but it has NO row-level security policy on
-- storage.objects allowing authenticated users to upload — so every attachment
-- upload fails with "new row violates row-level security policy". Create Post
-- writes to `<user_id>/<timestamp>-<filename>`, so we scope each policy to the
-- uploader's own top-level folder (auth.uid() = the first path segment), exactly
-- like the address-proof-uploads bucket.
--
-- Run this in the Supabase Dashboard → SQL Editor.

-- Keep the bucket public (attachments are shown via getPublicUrl).
insert into storage.buckets (id, name, public)
values ('post-attachments', 'post-attachments', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload their own post attachments" on storage.objects;
create policy "Users can upload their own post attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read their own post attachments" on storage.objects;
create policy "Users can read their own post attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'post-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own post attachments" on storage.objects;
create policy "Users can update their own post attachments"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'post-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'post-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete their own post attachments" on storage.objects;
create policy "Users can delete their own post attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);
