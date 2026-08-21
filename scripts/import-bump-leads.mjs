// Import Apollo CSV into outreach_leads for the BUMP campaign.
//   node --env-file=.env.local scripts/import-bump-leads.mjs "<path-to-apollo.csv>"
//
// Isolation from the BidSpro campaign: leads are stored with region = null (so
// BidSpro's region filter can never match them) and tagged 'bump' (which the
// Bump campaign targets). Only VERIFIED emails; deduped on lower(email).

import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const path = process.argv[2];
if (!path) { console.error("Usage: import-bump-leads.mjs <csv>"); process.exit(1); }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing Supabase env."); process.exit(1); }
const supabase = createClient(url, key, { auth: { persistSession: false } });

function parseCsv(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i+1] === '"') { field += '"'; i++; } else q = false; } else field += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch === "\r") {} else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
function cleanEmail(v) {
  if (!v) return null;
  const m = v.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m?.[0]?.toLowerCase() || null;
}

const rows = parseCsv(fs.readFileSync(path, "utf8"));
if (rows.length < 2) { console.error("No data rows."); process.exit(1); }
const H = rows[0];
const col = (n) => H.indexOf(n);
const iFirst = col("First Name"), iLast = col("Last Name"), iTitle = col("Title");
const iCompany = col("Company Name"), iEmail = col("Email"), iStatus = col("Email Status");
const iWebsite = col("Website"), iPhone = col("Corporate Phone"), iIndustry = col("Industry");
const iCountry = col("Country"), iCompanyCountry = col("Company Country");

const leads = new Map();
let noEmail = 0, unverified = 0;
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const g = (idx) => (idx === -1 ? null : (r[idx] || "").trim() || null);
  const email = cleanEmail(r[iEmail]);
  if (!email) { noEmail++; continue; }
  if ((g(iStatus) || "").toLowerCase() !== "verified") { unverified++; continue; }
  leads.set(email, {
    email,
    org_name: g(iCompany),
    contact_name: [g(iFirst), g(iLast)].filter(Boolean).join(" ") || null,
    title: g(iTitle),
    website: g(iWebsite),
    phone: g(iPhone),
    region: null, // isolate from BidSpro's region-based targeting
    country: g(iCompanyCountry) || g(iCountry),
    industry: g(iIndustry),
    source: "apollo-bump",
    tags: ["bump"],
    status: "new",
  });
}
const values = [...leads.values()];
console.log(`Parsed ${rows.length - 1} rows -> ${values.length} unique verified (skipped ${noEmail} no-email, ${unverified} unverified)`);

// Dedupe against existing leads.
const have = new Set();
const emails = values.map((v) => v.email);
for (let i = 0; i < emails.length; i += 300) {
  const { data, error } = await supabase.from("outreach_leads").select("email").in("email", emails.slice(i, i + 300));
  if (error) { console.error("dedupe failed:", error.message); process.exit(1); }
  (data || []).forEach((r) => have.add((r.email || "").toLowerCase()));
}
const toInsert = values.filter((v) => !have.has(v.email));
console.log(`Already in DB: ${values.length - toInsert.length}; inserting: ${toInsert.length}`);

let inserted = 0;
for (let i = 0; i < toInsert.length; i += 200) {
  const { error } = await supabase.from("outreach_leads").insert(toInsert.slice(i, i + 200));
  if (error) { console.error("insert failed:", error.message); process.exit(1); }
  inserted += Math.min(200, toInsert.length - i);
}
console.log(`Inserted ${inserted} bump leads (tagged 'bump', region null).`);
