import { createClient } from "@supabase/supabase-js";
import yaml from "js-yaml";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with your Supabase env loaded."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STATE = "Rhode Island";
const STATE_ABBR = "RI";
// Rhode Island districts are stored zero-padded (RI-01 ..).
const TODAY = new Date().toISOString().slice(0, 10);
const UA = { "User-Agent": "civix250-seed/1.0 (contact: admin@civix250.com)" };

async function getJSON(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

function partyFull(p) {
  const v = String(p || "").toLowerCase();
  if (v.startsWith("d")) return "Democrat";
  if (v.startsWith("r")) return "Republican";
  return p || "";
}
function ordinal(n) {
  const r100 = n % 100;
  if (r100 >= 11 && r100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] || "th"}`;
}
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function congressPhoto(bioguide) {
  return `https://unitedstates.github.io/images/congress/450x550/${bioguide}.jpg`;
}

function representative({ name, office, level, website, contact, party, photo, district = null }) {
  const slug = slugify(name);
  return {
    full_name: name,
    name,
    office_title: office,
    office,
    state: STATE,
    district,
    district_id: district,
    party,
    level,
    photo_url: photo || "",
    photo: photo || "",
    email: null,
    linkedin_url: website || "",
    linkedin: website || "",
    chat_href: `/chat/${slug}`,
    email_href: contact || website || "",
    is_primary: false,
    is_active: true,
  };
}

// Reject non-portrait images — office pages often return a seal/flag/logo.
function looksLikePortrait(url) {
  const f = decodeURIComponent(url || "").toLowerCase();
  return !!f && !/(seal|flag|coat[_ ]of[_ ]arms|logo|emblem|\.svg)/.test(f);
}

async function wikiThumb(paramStr) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=500&" +
    paramStr;
  const data = await getJSON(url);
  const pages = Object.values(data?.query?.pages || {});
  return pages[0]?.thumbnail?.source || "";
}

// Resolve a Wikipedia headshot. Prefers the exact page title (so it can't match
// a spouse or the office page's seal); falls back to search. Non-portrait images
// (seals/flags/logos/SVGs) are rejected. Back-compatible: called with a single
// descriptive string it does search-only (still guarded).
async function wikiPhoto(title, query) {
  const search = query || title;
  try {
    if (query) {
      const exact = await wikiThumb(`titles=${encodeURIComponent(title)}`);
      if (looksLikePortrait(exact)) return exact;
    }
    const found = await wikiThumb(
      `generator=search&gsrsearch=${encodeURIComponent(search)}&gsrlimit=1`
    );
    return looksLikePortrait(found) ? found : "";
  } catch {
    return "";
  }
}

async function mapLimit(items, limit, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

async function main() {
  // ---- 1. Federal delegation from congress-legislators -------------------
  const legislators = await getJSON(
    "https://unitedstates.github.io/congress-legislators/legislators-current.json"
  );
  const stFederal = legislators.filter((p) => p.terms.at(-1).state === STATE_ABBR);

  const houseDelegation = stFederal
    .filter((p) => p.terms.at(-1).type === "rep")
    .map((p) => {
      const t = p.terms.at(-1);
      const num = Number(t.district);
      const site = t.url || "";
      return {
        district_code: `${STATE_ABBR}-${String(num).padStart(2, "0")}`,
        state: STATE,
        district_number: num,
        name: p.name.official_full,
        title: "U.S. Representative",
        office_label: `Rhode Island ${ordinal(num)} Congressional District`,
        party: partyFull(t.party),
        website: site,
        contact_url: t.contact_form || (site ? `${site.replace(/\/$/, "")}/contact` : ""),
        phone: t.phone || null,
        image_url: congressPhoto(p.id.bioguide),
        is_active: true,
      };
    })
    .sort((a, b) => a.district_number - b.district_number);

  const usSenators = stFederal
    .filter((p) => p.terms.at(-1).type === "sen")
    .map((p) => {
      const t = p.terms.at(-1);
      return representative({
        name: p.name.official_full,
        office: "U.S. Senator, Rhode Island",
        level: "senate",
        website: t.url,
        contact: t.contact_form || t.url,
        party: partyFull(t.party),
        photo: congressPhoto(p.id.bioguide),
      });
    });

  // ---- 2. Statewide executives (Wikipedia headshots) ---------------------
  // Statewide executives (Wikipedia headshots). Verified current 2026-09-02.
  const execDefs = [
    { name: "Dan McKee", office: "Governor of Rhode Island", party: "Democrat", website: "https://governor.ri.gov", contact: "https://governor.ri.gov/contact", q: "Dan McKee Governor Rhode Island" },
    { name: "Sabina Matos", office: "Lieutenant Governor of Rhode Island", party: "Democrat", website: "https://ltgov.ri.gov", contact: "https://ltgov.ri.gov/contact-us", q: "Sabina Matos Lieutenant Governor Rhode Island" },
    { name: "Peter Neronha", office: "Attorney General of Rhode Island", party: "Democrat", website: "https://riag.ri.gov", contact: "https://riag.ri.gov/contact-us", q: "Peter Neronha Rhode Island Attorney General" },
    { name: "Gregg Amore", office: "Secretary of State of Rhode Island", party: "Democrat", website: "https://www.sos.ri.gov", contact: "https://www.sos.ri.gov/contact", q: "Gregg Amore Rhode Island Secretary of State" },
  ];
  const execs = await mapLimit(execDefs, 4, async (d) =>
    representative({
      name: d.name,
      office: d.office,
      level: "State",
      website: d.website,
      contact: d.contact,
      party: d.party,
      photo: await wikiPhoto(d.name, d.q),
    })
  );

  // ---- 3. Current State Senators from OpenStates -------------------------
  const files = (
    await getJSON(
      "https://api.github.com/repos/openstates/people/contents/data/ri/legislature"
    )
  ).filter((f) => f.name.endsWith(".yml"));

  const docs = await mapLimit(files, 10, async (f) => {
    try {
      return yaml.load(await getText(f.download_url));
    } catch {
      return null;
    }
  });

  const stateSenators = [];
  for (const doc of docs) {
    if (!doc) continue;
    const upperRoles = (doc.roles || []).filter((r) => r.type === "upper");
    const asDateStr = (v) =>
      v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v) : "";
    const current = upperRoles.find((r) => {
      const start = asDateStr(r.start_date);
      const end = asDateStr(r.end_date);
      return (!start || start <= TODAY) && (!end || end >= TODAY);
    });
    if (!current) continue;
    const num = Number(current.district);
    const partyEntry =
      (doc.party || []).find((p) => !p.end_date) || (doc.party || []).at(-1);
    const homepage = (doc.links || []).find((l) => l.note === "homepage")?.url;
    stateSenators.push(
      representative({
        name: doc.name,
        office: `Rhode Island State Senator, District ${num}`,
        level: "State Senate",
        website: homepage || "",
        contact: homepage || "",
        party: partyFull(partyEntry?.name),
        photo: doc.image || "",
        district: `${STATE_ABBR}-${String(num).padStart(2, "0")}`,
      })
    );
  }
  stateSenators.sort(
    (a, b) => Number(a.district.split("-")[1]) - Number(b.district.split("-")[1])
  );

  // ---- Write to Supabase (idempotent: clear RI rows, then insert) --------
  const representativesRows = [...usSenators, ...execs, ...stateSenators];

  const { error: repDeleteError } = await supabase
    .from("representatives")
    .delete()
    .eq("state", STATE);
  if (repDeleteError) {
    console.error("Failed to clear RI representatives:", repDeleteError);
    process.exit(1);
  }
  const { error: repInsertError } = await supabase
    .from("representatives")
    .insert(representativesRows);
  if (repInsertError) {
    console.error("Failed to insert RI representatives:", repInsertError);
    process.exit(1);
  }

  const { error: houseDeleteError } = await supabase
    .from("district_representatives")
    .delete()
    .eq("state", STATE);
  if (houseDeleteError) {
    console.error("Failed to clear RI district representatives:", houseDeleteError);
    process.exit(1);
  }
  const { error: houseInsertError } = await supabase
    .from("district_representatives")
    .insert(houseDelegation);
  if (houseInsertError) {
    console.error("Failed to insert RI district representatives:", houseInsertError);
    process.exit(1);
  }

  const missingPhotos = representativesRows.filter((r) => !r.photo).map((r) => r.name);
  console.log(
    `Seeded Rhode Island: ${usSenators.length} U.S. senators, ${execs.length} statewide execs, ` +
      `${stateSenators.length} state senators, ${houseDelegation.length} U.S. House members.`
  );
  console.log(`  U.S. House: ${houseDelegation.map((h) => `${h.district_code} ${h.name}`).join(", ")}`);
  if (missingPhotos.length) {
    console.log(`  No photo resolved for: ${missingPhotos.length} row(s): ${missingPhotos.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
