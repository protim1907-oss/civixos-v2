create extension if not exists pgcrypto;

create table if not exists public.official_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  district text not null,
  category text not null default 'Announcement',
  priority text not null default 'Medium'
    check (priority in ('Low', 'Medium', 'High')),
  status text not null default 'Active'
    check (status in ('Active', 'Scheduled', 'Archived')),
  source_name text,
  source_url text,
  published_by uuid references auth.users(id) on delete set null,
  published_by_name text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists official_updates_district_idx
  on public.official_updates (district);

create index if not exists official_updates_published_at_idx
  on public.official_updates (published_at desc);

create or replace function public.set_official_updates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_official_updates_updated_at
  on public.official_updates;

create trigger set_official_updates_updated_at
before update on public.official_updates
for each row
execute function public.set_official_updates_updated_at();

alter table public.official_updates enable row level security;

drop policy if exists "Anyone can read official updates"
  on public.official_updates;

create policy "Anyone can read official updates"
on public.official_updates
for select
to anon, authenticated
using (true);

drop policy if exists "Officials and staff can publish official updates"
  on public.official_updates;

create policy "Officials and staff can publish official updates"
on public.official_updates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role::text in ('admin', 'moderator', 'official')
  )
);

drop policy if exists "Officials and staff can update official updates"
  on public.official_updates;

create policy "Officials and staff can update official updates"
on public.official_updates
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role::text in ('admin', 'moderator', 'official')
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role::text in ('admin', 'moderator', 'official')
  )
);
