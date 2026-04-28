create extension if not exists pgcrypto;

create table if not exists public.policy_pulse_surveys (
  id text primary key,
  title text not null,
  district text not null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text,
  summary text not null,
  primary_question text not null,
  deadline date not null,
  uploaded_files jsonb not null default '[]'::jsonb,
  votes jsonb not null default '{}'::jsonb,
  recent_responses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists policy_pulse_surveys_district_idx
  on public.policy_pulse_surveys (district);

create index if not exists policy_pulse_surveys_created_at_idx
  on public.policy_pulse_surveys (created_at desc);

create or replace function public.set_policy_pulse_surveys_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_policy_pulse_surveys_updated_at
  on public.policy_pulse_surveys;

create trigger set_policy_pulse_surveys_updated_at
before update on public.policy_pulse_surveys
for each row
execute function public.set_policy_pulse_surveys_updated_at();

alter table public.policy_pulse_surveys enable row level security;

drop policy if exists "Anyone can read published policy pulse surveys"
  on public.policy_pulse_surveys;

create policy "Anyone can read published policy pulse surveys"
on public.policy_pulse_surveys
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can publish policy pulse surveys"
  on public.policy_pulse_surveys;

create policy "Authenticated users can publish policy pulse surveys"
on public.policy_pulse_surveys
for insert
to authenticated
with check (auth.uid() = created_by_user_id);

drop policy if exists "Authenticated users can update policy pulse survey results"
  on public.policy_pulse_surveys;

create policy "Authenticated users can update policy pulse survey results"
on public.policy_pulse_surveys
for update
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('policy-pulse-files', 'policy-pulse-files', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read policy pulse files"
  on storage.objects;

create policy "Anyone can read policy pulse files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'policy-pulse-files');

drop policy if exists "Authenticated users can upload policy pulse files"
  on storage.objects;

create policy "Authenticated users can upload policy pulse files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'policy-pulse-files');

drop policy if exists "Owners and staff can update policy pulse files"
  on storage.objects;

create policy "Owners and staff can update policy pulse files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'policy-pulse-files'
  and (
    owner = auth.uid()
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role::text in ('admin', 'moderator', 'official')
    )
  )
)
with check (
  bucket_id = 'policy-pulse-files'
  and (
    owner = auth.uid()
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role::text in ('admin', 'moderator', 'official')
    )
  )
);
