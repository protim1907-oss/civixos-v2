-- Issue status history: records every status transition
create table if not exists public.issue_status_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_name text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists issue_status_history_issue_id_idx
  on public.issue_status_history (issue_id);

create index if not exists issue_status_history_created_at_idx
  on public.issue_status_history (created_at);

alter table public.issue_status_history enable row level security;

-- Everyone authenticated can read status history
drop policy if exists "Anyone can read issue status history" on public.issue_status_history;
create policy "Anyone can read issue status history"
  on public.issue_status_history for select to authenticated using (true);

-- Staff can insert status history
drop policy if exists "Staff can insert issue status history" on public.issue_status_history;
create policy "Staff can insert issue status history"
  on public.issue_status_history for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role::text in ('admin', 'moderator', 'official')
    )
  );


-- Official responses: an official's formal response tied to a specific issue
create table if not exists public.issue_official_responses (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  official_id uuid references auth.users(id) on delete set null,
  official_name text not null,
  official_title text,
  response_text text not null,
  is_pinned boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists issue_official_responses_issue_id_idx
  on public.issue_official_responses (issue_id);

create or replace function public.set_issue_official_responses_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists set_issue_official_responses_updated_at on public.issue_official_responses;
create trigger set_issue_official_responses_updated_at
  before update on public.issue_official_responses
  for each row execute function public.set_issue_official_responses_updated_at();

alter table public.issue_official_responses enable row level security;

-- Everyone authenticated can read official responses
drop policy if exists "Anyone can read official responses" on public.issue_official_responses;
create policy "Anyone can read official responses"
  on public.issue_official_responses for select to authenticated using (true);

-- Staff can insert official responses
drop policy if exists "Staff can insert official responses" on public.issue_official_responses;
create policy "Staff can insert official responses"
  on public.issue_official_responses for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role::text in ('admin', 'moderator', 'official')
    )
  );

-- Staff can update their own responses
drop policy if exists "Staff can update official responses" on public.issue_official_responses;
create policy "Staff can update official responses"
  on public.issue_official_responses for update to authenticated
  using (official_id = auth.uid())
  with check (official_id = auth.uid());


-- Seed initial status history for existing issues
-- (marks every existing issue as "submitted" at its created_at time)
insert into public.issue_status_history (issue_id, from_status, to_status, note, created_at)
select
  id,
  null,
  'open',
  'Issue submitted by citizen',
  created_at
from public.issues
where status is not null
on conflict do nothing;
