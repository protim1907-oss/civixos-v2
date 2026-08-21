// Dry-run: draft a few sample Bump emails and print them (no DB writes).
//   npx tsx --env-file=.env.local scripts/draft-bump-sample.mts [count]
import { createClient } from "@supabase/supabase-js";
import { draftEmail } from "../lib/outreach/draft";

const n = Number(process.argv[2] || 3);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const { data: campaign } = await supabase
  .from("outreach_campaigns")
  .select("*")
  .eq("name", "Bump — freelancers (US/EU)")
  .single();

const { data: leads } = await supabase
  .from("outreach_leads")
  .select("*")
  .overlaps("tags", ["bump"])
  .eq("status", "new")
  .limit(n);

for (const lead of leads ?? []) {
  const { subject, body } = await draftEmail(campaign as never, lead as never);
  console.log(
    `\n════ to: ${lead.contact_name ?? "?"} · ${lead.title ?? ""} @ ${lead.org_name ?? ""} (${lead.email}) ════`
  );
  console.log(`Subject: ${subject}\n`);
  console.log(body);
}
console.log();
