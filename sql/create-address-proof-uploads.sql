insert into storage.buckets (id, name, public)
values ('address-proof-uploads', 'address-proof-uploads', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can upload their own address proof"
  on storage.objects;

create policy "Users can upload their own address proof"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'address-proof-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read their own address proof"
  on storage.objects;

create policy "Users can read their own address proof"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'address-proof-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update their own address proof"
  on storage.objects;

create policy "Users can update their own address proof"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'address-proof-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'address-proof-uploads'
  and auth.uid()::text = (storage.foldername(name))[1]
);
