-- Allow deleting Policy Pulse surveys. The table already has SELECT/INSERT/UPDATE
-- policies but no DELETE policy, so a delete from the moderator dashboard is
-- silently blocked by RLS (0 rows removed). This adds a DELETE policy that
-- mirrors the existing permissive UPDATE policy ("Authenticated users can update
-- policy pulse survey results" — using (true)). The moderator page is already
-- role-gated in the app; tighten this to admins/moderators via is_admin() if you
-- want DB-level enforcement too.
-- Run once in the Supabase Dashboard → SQL Editor.

drop policy if exists "Authenticated users can delete policy pulse surveys"
  on public.policy_pulse_surveys;

create policy "Authenticated users can delete policy pulse surveys"
on public.policy_pulse_surveys
for delete
to authenticated
using (true);
