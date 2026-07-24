// Seed the BidSpro International "MVP prospects" cold-outreach campaign.
//
// Idempotent: if a campaign with the same name already exists it is updated,
// not duplicated. Run with:  npm run seed:bidspro-campaign
//
// Requires .env.local:  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (loaded via --env-file in the npm script).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const campaign = {
  name: "MVP prospects — US / Europe / UAE",
  goal: "Book a short intro call with founders who want to build an MVP.",
  sender_org: "BidSpro International",
  offering:
    "Rapid MVP design & development — we take founders from idea to a working, launch-ready MVP in weeks, not months.",
  ai_prompt:
    "Audience: founders and product leaders looking to build an MVP. Emphasize speed to launch, fixed scope, and senior engineering. Keep it short and human. One clear CTA: a quick 15-minute call.",
  footer_reason:
    "You received this because you're building or exploring a new product. If it isn't relevant,",
  from_name: "Protim Ghosh",
  from_email: "protimghosh@bidsprointernational.com",
  reply_to: "protimghosh@bidsprointernational.com",
  // CAN-SPAM requires a REAL physical postal address. Replace before sending.
  postal_address: "BidSpro International — <add your registered postal address>",
  daily_cap: 25,
  audience_filter: { regions: ["us", "europe", "uae"] },
  status: "draft",
};

const { data: existing } = await supabase
  .from("outreach_campaigns")
  .select("id")
  .eq("name", campaign.name)
  .maybeSingle();

let result;
if (existing) {
  result = await supabase
    .from("outreach_campaigns")
    .update(campaign)
    .eq("id", existing.id)
    .select()
    .single();
} else {
  result = await supabase.from("outreach_campaigns").insert(campaign).select().single();
}

if (result.error) {
  console.error("Failed:", result.error.message);
  process.exit(1);
}

console.log(`${existing ? "Updated" : "Created"} campaign: ${result.data.id}`);
console.log("Next: import leads (CSV), draft, review/approve, then send.");
if (campaign.postal_address.includes("<add")) {
  console.warn("\n⚠  Set a real postal_address before sending (CAN-SPAM requirement).");
}
