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

// D.C. is not a state. It has:
//   - ONE at-large congressional district (Census codes it 98) -> "DC-98"
//   - a non-voting House Delegate (not a Senator/Representative with a vote)
//   - NO U.S. Senators
//   - NO state legislature — the Council of the District of Columbia instead
//     (Chairman + 4 at-large + 8 ward members = 13)
//   - Mayor + elected Attorney General as the executive layer
// Every D.C. resident shares the same district (DC-98) and the same Council,
// so all Council members are tagged DC-98 and shown to every D.C. citizen.
const STATE = "District of Columbia";
const DISTRICT_CODE = "DC-98";
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

function councilOffice(districtText) {
  const d = String(districtText || "").trim();
  if (/chair/i.test(d)) return "Chairman, Council of the District of Columbia";
  if (/at.?large/i.test(d)) return "Councilmember, At-Large — District of Columbia";
  return `Councilmember, ${d} — District of Columbia`;
}

async function main() {
  // ---- 1. Non-voting House Delegate (congress-legislators) ----------------
  const legislators = await getJSON(
    "https://unitedstates.github.io/congress-legislators/legislators-current.json"
  );
  const delegate = legislators.find(
    (p) => p.terms.at(-1).state === "DC" && p.terms.at(-1).type === "rep"
  );

  const houseDelegation = [];
  if (delegate) {
    const t = delegate.terms.at(-1);
    const site = t.url || "";
    houseDelegation.push({
      district_code: DISTRICT_CODE,
      state: STATE,
      district_number: 98,
      name: delegate.name.official_full,
      title: "U.S. House Delegate (non-voting)",
      office_label: "District of Columbia — At-Large (Delegate)",
      party: partyFull(t.party),
      website: site,
      contact_url: t.contact_form || (site ? `${site.replace(/\/$/, "")}/contact` : ""),
      phone: t.phone || null,
      image_url: congressPhoto(delegate.id.bioguide),
      is_active: true,
    });
  } else {
    console.warn("WARNING: DC delegate not found in congress-legislators.");
  }

  // ---- 2. Executives: Mayor + Attorney General (Wikipedia headshots) ------
  // Verified current 2026-08-05: Mayor Muriel Bowser (D, sitting) and elected
  // Attorney General Brian Schwalb (D, since 2023). D.C. has no Governor/Lt.Gov.
  const execDefs = [
    { name: "Muriel Bowser", office: "Mayor of the District of Columbia", party: "Democrat", website: "https://mayor.dc.gov", contact: "https://mayor.dc.gov/page/contact-us-0", q: "Muriel Bowser Mayor Washington DC" },
    { name: "Brian Schwalb", office: "Attorney General of the District of Columbia", party: "Democrat", website: "https://oag.dc.gov", contact: "https://oag.dc.gov/contact-oag", q: "Brian Schwalb DC Attorney General" },
  ];
  const execs = await mapLimit(execDefs, 2, async (d) =>
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

  // ---- 3. Council of the District of Columbia (OpenStates) ---------------
  // D.C. is unicameral; OpenStates marks the role type "legislature".
  const files = (
    await getJSON(
      "https://api.github.com/repos/openstates/people/contents/data/dc/legislature"
    )
  ).filter((f) => f.name.endsWith(".yml"));

  const docs = await mapLimit(files, 10, async (f) => {
    try {
      return yaml.load(await getText(f.download_url));
    } catch {
      return null;
    }
  });

  const council = [];
  for (const doc of docs) {
    if (!doc) continue;
    const asDateStr = (v) =>
      v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v) : "";
    const current = (doc.roles || []).find((r) => {
      if (r.type !== "legislature") return false;
      const start = asDateStr(r.start_date);
      const end = asDateStr(r.end_date);
      return (!start || start <= TODAY) && (!end || end >= TODAY);
    });
    if (!current) continue;
    const partyEntry =
      (doc.party || []).find((p) => !p.end_date) || (doc.party || []).at(-1);
    const homepage = (doc.links || []).find((l) => l.note === "homepage")?.url;
    council.push({
      row: representative({
        name: doc.name,
        office: councilOffice(current.district),
        // Tagged as the legislative layer so it renders in the (DC-relabeled)
        // "Council of the District of Columbia" section for every DC-98 citizen.
        level: "State Senate",
        website: homepage || "",
        contact: homepage || "",
        party: partyFull(partyEntry?.name),
        photo: doc.image || "",
        district: DISTRICT_CODE,
      }),
      sortKey: /chair/i.test(current.district)
        ? "0"
        : /at.?large/i.test(current.district)
        ? "1"
        : `2-${String(current.district).replace(/\D/g, "").padStart(2, "0")}`,
    });
  }
  // Recent winners OpenStates hasn't published yet. Deduped by name so they
  // drop out automatically once OpenStates catches up. Verified 2026-08-05:
  // Elissa Silverman (I) won the 2026-06-16 at-large special election (McDuffie's
  // seat, term through Jan 2027).
  const manualExtras = [
    { name: "Elissa Silverman", district: "At-Large", party: "Independent", website: "https://dccouncil.gov", q: "Elissa Silverman DC Council" },
  ];
  for (const ex of manualExtras) {
    if (council.some((c) => c.row.name.toLowerCase() === ex.name.toLowerCase())) continue;
    const photo = await wikiPhoto(ex.name, ex.q);
    council.push({
      row: representative({
        name: ex.name,
        office: councilOffice(ex.district),
        level: "State Senate",
        website: ex.website,
        contact: ex.website,
        party: ex.party,
        photo,
        district: DISTRICT_CODE,
      }),
      sortKey: "1",
    });
  }

  council.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const councilRows = council.map((c) => c.row);

  // ---- Write to Supabase (idempotent: clear DC rows, then insert) --------
  const representativesRows = [...execs, ...councilRows];

  const { error: repDeleteError } = await supabase
    .from("representatives")
    .delete()
    .eq("state", STATE);
  if (repDeleteError) {
    console.error("Failed to clear DC representatives:", repDeleteError);
    process.exit(1);
  }
  const { error: repInsertError } = await supabase
    .from("representatives")
    .insert(representativesRows);
  if (repInsertError) {
    console.error("Failed to insert DC representatives:", repInsertError);
    process.exit(1);
  }

  const { error: houseDeleteError } = await supabase
    .from("district_representatives")
    .delete()
    .eq("state", STATE);
  if (houseDeleteError) {
    console.error("Failed to clear DC district representatives:", houseDeleteError);
    process.exit(1);
  }
  if (houseDelegation.length) {
    const { error: houseInsertError } = await supabase
      .from("district_representatives")
      .insert(houseDelegation);
    if (houseInsertError) {
      console.error("Failed to insert DC delegate:", houseInsertError);
      process.exit(1);
    }
  }

  const missingPhotos = [...representativesRows]
    .filter((r) => !r.photo)
    .map((r) => r.name);
  console.log(
    `Seeded Washington, D.C.: ${houseDelegation.length} non-voting delegate, ` +
      `${execs.length} executives (Mayor + AG), ${councilRows.length} Council members.`
  );
  if (delegate) console.log(`  Delegate: ${delegate.name.official_full} (${DISTRICT_CODE})`);
  console.log(`  Council: ${councilRows.map((c) => c.name).join(", ")}`);
  if (missingPhotos.length) {
    console.log(`  No photo resolved for: ${missingPhotos.length} row(s): ${missingPhotos.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
