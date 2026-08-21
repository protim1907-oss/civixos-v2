// Seed the "Bump — freelancers" cold-outreach campaign in the outreach engine.
// Idempotent (upsert by name). Targets ONLY leads tagged "bump" so it never
// collides with the region-based BidSpro campaign.
//
//   node --env-file=.env.local scripts/seed-bump-campaign.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const campaign = {
  name: "Bump — freelancers (US/EU)",
  goal: "Get freelancers & small businesses to try Bump to auto-chase unpaid invoices.",
  sender_org: "Bump",
  offering:
    "Bump helps freelancers and small businesses get paid faster by automating invoice follow-ups with AI-written reminders in an appropriate tone and timing. It removes the manual work of drafting and resending 'just following up' emails, and preserves client relationships by escalating gently — with full control over message approval and quiet hours.",
  ai_prompt:
    "Audience: freelancers, independent contractors, and solo business owners who invoice clients and deal with late payments. The pain: chasing overdue invoices is awkward, manual, and time-consuming. Introduce Bump as an AI tool that automatically chases unpaid invoices with well-timed, appropriately-toned reminders, so they get paid faster WITHOUT the awkward follow-ups — and they stay in control (approve messages, set quiet hours) so client relationships stay intact. Tone: short, warm, human — a founder reaching out, not a sales blast. One clear CTA: try it free at https://bumppaid.com (write the URL exactly). Do NOT invent statistics or ROI percentages; stick to time-saved, less-awkward-chasing, and get-paid-faster claims only. Keep it culturally neutral for a US + Europe audience.",
  footer_reason:
    "You received this because you're a freelancer or small business owner who invoices clients. If it isn't relevant,",
  from_name: "Protim Ghosh",
  from_email: "protimghosh@bidsprointernational.com",
  reply_to: "protimghosh@bidsprointernational.com",
  postal_address:
    "Bidspro International, Bucharest, Romania; www.bidsprointernational.com",
  daily_cap: 25,
  audience_filter: { tags: ["bump"] },
  status: "draft",
};

const { data: existing } = await supabase
  .from("outreach_campaigns")
  .select("id")
  .eq("name", campaign.name)
  .maybeSingle();

const result = existing
  ? await supabase.from("outreach_campaigns").update(campaign).eq("id", existing.id).select().single()
  : await supabase.from("outreach_campaigns").insert(campaign).select().single();

if (result.error) {
  console.error("Failed:", result.error.message);
  process.exit(1);
}
console.log(`${existing ? "Updated" : "Created"} campaign: ${result.data.id} (${campaign.name})`);
