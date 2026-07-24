// One-off: set up a REAL end-to-end test for the BidSpro outreach agent.
// Creates/updates the campaign and inserts a single test lead pointing at an
// address you own, so you can run Draft → Approve → Send in /outreach and we
// can verify the result from the DB. Run: npm run seed:bidspro-test
import { createClient } from "@supabase/supabase-js";

const TEST_LEAD_EMAIL = "protim1907@gmail.com"; // an address you own

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const campaign = {
  name: "MVP prospects — US / Europe / UAE",
  goal: "Book a short intro call with founders who want to build an MVP.",
  sender_org: "BidSpro International",
  offering:
    "Rapid MVP design & development — from idea to a working, launch-ready MVP in weeks, not months.",
  ai_prompt:
    "Audience: founders and product leaders looking to build an MVP. Emphasize speed to launch, fixed scope, and senior engineering. Keep it short and human. One clear CTA: a quick 15-minute call.",
  footer_reason:
    "You received this because you're building or exploring a new product. If it isn't relevant,",
  from_name: "Protim Ghosh",
  from_email: "protimghosh@bidsprointernational.com",
  reply_to: "protimghosh@bidsprointernational.com",
  postal_address: "BidSpro International, Kharguli, Guwahati, Assam 781004, India",
  daily_cap: 25,
  audience_filter: { regions: ["us", "europe", "uae"] },
  status: "draft",
};

const { data: existing } = await supabase
  .from("outreach_campaigns")
  .select("id")
  .eq("name", campaign.name)
  .maybeSingle();

const cRes = existing
  ? await supabase.from("outreach_campaigns").update(campaign).eq("id", existing.id).select().single()
  : await supabase.from("outreach_campaigns").insert(campaign).select().single();

if (cRes.error) {
  console.error("Campaign failed:", cRes.error.message);
  process.exit(1);
}
console.log(`${existing ? "Updated" : "Created"} campaign: ${cRes.data.id}`);

// Test lead — region 'us' so it matches the campaign audience filter. Reset to
// 'new' so it's eligible for drafting even on a re-run.
const lead = {
  email: TEST_LEAD_EMAIL,
  org_name: "Acme Labs (TEST)",
  contact_name: "Protim Ghosh",
  title: "Founder",
  region: "us",
  country: "United States",
  industry: "fintech",
  notes: "End-to-end pipeline test lead. Safe to delete.",
  source: "e2e-test",
  status: "new",
};

// Clean slate: remove any prior test lead + its messages + suppression, then
// insert fresh. (Unique index is a partial expr index on lower(email), so we
// don't rely on upsert onConflict here.)
await supabase.from("outreach_leads").delete().eq("email", TEST_LEAD_EMAIL);
await supabase.from("outreach_suppressions").delete().eq("email", TEST_LEAD_EMAIL);

const lRes = await supabase.from("outreach_leads").insert(lead).select().single();

if (lRes.error) {
  console.error("Lead failed:", lRes.error.message);
  process.exit(1);
}

console.log(`Test lead ready: ${lRes.data.id} → ${TEST_LEAD_EMAIL}`);
console.log("\nNow in /outreach: open the campaign → Draft (AI) → Review → Approve → Send approved.");
