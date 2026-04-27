create extension if not exists pgcrypto;

create table if not exists public.video_meeting_requests (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid references auth.users(id) on delete set null,
  citizen_name text,
  citizen_email text,
  district text,
  representative_id text,
  representative_name text not null,
  representative_title text,
  representative_office text,
  topic text not null,
  preferred_times text not null,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'completed')),
  meeting_url text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_meeting_requests_citizen_id_idx
  on public.video_meeting_requests (citizen_id);

create index if not exists video_meeting_requests_status_idx
  on public.video_meeting_requests (status);

create index if not exists video_meeting_requests_district_idx
  on public.video_meeting_requests (district);

create or replace function public.set_video_meeting_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_video_meeting_requests_updated_at
  on public.video_meeting_requests;

create trigger set_video_meeting_requests_updated_at
before update on public.video_meeting_requests
for each row
execute function public.set_video_meeting_requests_updated_at();

alter table public.video_meeting_requests enable row level security;

drop policy if exists "Citizens can create video meeting requests"
  on public.video_meeting_requests;

create policy "Citizens can create video meeting requests"
on public.video_meeting_requests
for insert
to authenticated
with check (auth.uid() = citizen_id);

drop policy if exists "Citizens can read their video meeting requests"
  on public.video_meeting_requests;

create policy "Citizens can read their video meeting requests"
on public.video_meeting_requests
for select
to authenticated
using (auth.uid() = citizen_id);

drop policy if exists "Staff can read video meeting requests"
  on public.video_meeting_requests;

create policy "Staff can read video meeting requests"
on public.video_meeting_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'moderator', 'official')
  )
);

drop policy if exists "Staff can review video meeting requests"
  on public.video_meeting_requests;

create policy "Staff can review video meeting requests"
on public.video_meeting_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'moderator', 'official')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'moderator', 'official')
  )
);
