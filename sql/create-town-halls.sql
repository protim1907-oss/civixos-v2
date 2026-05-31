create extension if not exists pgcrypto;

create table if not exists public.town_halls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  district text,
  meeting_url text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists town_halls_scheduled_at_idx
  on public.town_halls (scheduled_at);

create index if not exists town_halls_district_idx
  on public.town_halls (district);

create or replace function public.set_town_halls_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_town_halls_updated_at
  on public.town_halls;

create trigger set_town_halls_updated_at
before update on public.town_halls
for each row
execute function public.set_town_halls_updated_at();

alter table public.town_halls enable row level security;

-- All authenticated users (citizens) can read town halls
drop policy if exists "Anyone authenticated can read town halls"
  on public.town_halls;

create policy "Anyone authenticated can read town halls"
on public.town_halls
for select
to authenticated
using (true);

-- Only staff (officials, admins, moderators) can create town halls
drop policy if exists "Staff can create town halls"
  on public.town_halls;

create policy "Staff can create town halls"
on public.town_halls
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

-- Only staff can update town halls
drop policy if exists "Staff can update town halls"
  on public.town_halls;

create policy "Staff can update town halls"
on public.town_halls
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

-- Only staff can delete town halls
drop policy if exists "Staff can delete town halls"
  on public.town_halls;

create policy "Staff can delete town halls"
on public.town_halls
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role::text in ('admin', 'moderator', 'official')
  )
);
