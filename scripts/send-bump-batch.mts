// Draft + approve a Bump batch for a region. Sending itself is done by the
// deployed cron-send (SMTP runs on Vercel). Prints recipients + 2 samples.
//   npx tsx scripts/send-bump-batch.mts <europe|us> <count>
import { createClient } from "@supabase/supabase-js";
import { draftEmail } from "../lib/outreach/draft";

const regionArg = (process.argv[2] || "europe").toLowerCase();
const count = Number(process.argv[3] || 25);

const EUROPE = new Set([
  "France","United Kingdom","Switzerland","Belgium","Netherlands","Germany","Romania",
  "Ireland","Spain","Italy","Portugal","Austria","Sweden","Denmark","Poland","Norway",
  "Finland","Czechia","Greece","Hungary","Luxembourg",
]);
const US = new Set(["United States"]);
const set = regionArg === "us" ? US : EUROPE;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const { data: campaign } = await supabase
  .from("outreach_campaigns").select("*").eq("name", "Bump — freelancers (US/EU)").single();
if (!campaign) { console.error("Bump campaign not found"); process.exit(1); }

// Pull bump leads, filter to region, take N not already messaged.
const { data: allLeads } = await supabase
  .from("outreach_leads").select("*").overlaps("tags", ["bump"]).eq("status", "new").limit(500);
const { data: existingMsgs } = await supabase
  .from("outreach_messages").select("lead_id").eq("campaign_id", campaign.id);
const done = new Set((existingMsgs || []).map((m) => m.lead_id));
const leads = (allLeads || []).filter((l) => set.has((l.country || "").trim()) && !done.has(l.id)).slice(0, count);

console.log(`Region ${regionArg}: ${leads.length} leads to draft+approve\n`);
let ok = 0; const samples: string[] = [];
for (const lead of leads) {
  try {
    const { subject, body } = await draftEmail(campaign as never, lead as never);
    const { error } = await supabase.from("outreach_messages").insert({
      campaign_id: campaign.id, lead_id: lead.id, to_email: lead.email,
      subject, body, status: "approved", approved_at: new Date().toISOString(),
    });
    if (error) { console.error(`  FAIL ${lead.email}: ${error.message}`); continue; }
    ok++;
    console.log(`  ✓ ${lead.email}  (${lead.country})  — ${subject}`);
    if (samples.length < 2) samples.push(`── ${lead.email} ──\nSubject: ${subject}\n\n${body}`);
  } catch (e) {
    console.error(`  ERR ${lead.email}: ${e instanceof Error ? e.message : e}`);
  }
}
console.log(`\nApproved ${ok} messages (status 'approved', ready for cron-send).`);
console.log("\n===== SAMPLE DRAFTS =====\n" + samples.join("\n\n"));
