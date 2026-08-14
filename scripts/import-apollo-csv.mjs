// Import Apollo CSV export into outreach_leads for the BidSpro B2B campaign.
//
//   node --env-file=.env.local scripts/import-apollo-csv.mjs "<path-to-apollo.csv>"
//
// Only VERIFIED emails are imported (protects the sending domain from bounces).
// Deduped in code on lower(email) against existing leads. source = 'apollo'.
// Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/import-apollo-csv.mjs <path-to-csv>");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// RFC-4180-ish parser (same rules as app/api/outreach/import-csv/route.ts).
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch === "\r") { /* skip */ }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const EUROPE = new Set([
  "uk","united kingdom","england","ireland","germany","france","spain","italy","portugal",
  "netherlands","belgium","sweden","norway","denmark","finland","poland","austria","switzerland",
  "czech","czechia","czech republic","greece","romania","hungary","estonia","lithuania","latvia",
  "bulgaria","croatia","slovakia","slovenia","luxembourg","iceland","ukraine","serbia","cyprus","malta",
]);
const UAE = new Set(["uae","united arab emirates","u.a.e.","dubai","abu dhabi","sharjah"]);
const US = new Set(["us","usa","united states","united states of america","america"]);

function inferRegion(country) {
  const c = (country || "").trim().toLowerCase();
  if (!c) return null;
  if (US.has(c)) return "us";
  if (UAE.has(c)) return "uae";
  if (EUROPE.has(c)) return "europe";
  return null;
}

function cleanEmail(v) {
  if (!v) return null;
  const m = v.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m?.[0]?.toLowerCase() || null;
}

const text = fs.readFileSync(path, "utf8");
const rows = parseCsv(text);
if (rows.length < 2) { console.error("CSV has no data rows."); process.exit(1); }

const H = rows[0];
const col = (name) => H.indexOf(name);
const iFirst = col("First Name"), iLast = col("Last Name"), iTitle = col("Title");
const iCompany = col("Company Name"), iEmail = col("Email"), iStatus = col("Email Status");
const iWebsite = col("Website"), iPhone = col("Corporate Phone"), iIndustry = col("Industry");
const iCompanyCountry = col("Company Country"), iCountry = col("Country");

const leads = new Map();
let skippedNoEmail = 0, skippedUnverified = 0;

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const g = (idx) => (idx === -1 ? null : (r[idx] || "").trim() || null);

  const email = cleanEmail(r[iEmail]);
  if (!email) { skippedNoEmail++; continue; }

  const status = (g(iStatus) || "").toLowerCase();
  if (status !== "verified") { skippedUnverified++; continue; }

  const country = g(iCompanyCountry) || g(iCountry);
  const name = [g(iFirst), g(iLast)].filter(Boolean).join(" ") || null;

  leads.set(email, {
    email,
    org_name: g(iCompany),
    contact_name: name,
    title: g(iTitle),
    website: g(iWebsite),
    phone: g(iPhone),
    region: inferRegion(country),
    country,
    industry: g(iIndustry),
    source: "apollo",
    status: "new",
  });
}

const values = [...leads.values()];
console.log(`Parsed ${rows.length - 1} rows -> ${values.length} unique verified leads`);
console.log(`Skipped: ${skippedNoEmail} no-email, ${skippedUnverified} unverified/unavailable`);

// Dedupe against existing leads (case-insensitive; emails already lowercased).
const emails = values.map((v) => v.email);
const have = new Set();
for (let i = 0; i < emails.length; i += 300) {
  const chunk = emails.slice(i, i + 300);
  const { data, error } = await supabase.from("outreach_leads").select("email").in("email", chunk);
  if (error) { console.error("dedupe query failed:", error.message); process.exit(1); }
  (data || []).forEach((row) => have.add((row.email || "").toLowerCase()));
}
const toInsert = values.filter((v) => !have.has(v.email));
console.log(`Already in DB: ${values.length - toInsert.length}; to insert: ${toInsert.length}`);

let inserted = 0;
for (let i = 0; i < toInsert.length; i += 200) {
  const chunk = toInsert.slice(i, i + 200);
  const { error } = await supabase.from("outreach_leads").insert(chunk);
  if (error) { console.error("insert failed:", error.message); process.exit(1); }
  inserted += chunk.length;
}

const byRegion = {};
toInsert.forEach((v) => { byRegion[v.region || "unknown"] = (byRegion[v.region || "unknown"] || 0) + 1; });
console.log(`Inserted ${inserted} leads. By region:`, JSON.stringify(byRegion));
