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

const STATE = "Georgia";
// Georgia districts are stored zero-padded (GA-01 .. GA-14), matching MD/CO/NV.
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

// A `representatives` row. The table has no website/phone column — the official
// site goes in linkedin_url and the contact page in email_href.
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

// Resolve a Wikipedia headshot via search -> pageimages (robust to exact titles).
async function wikiPhoto(query) {
  try {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail&pithumbsize=500" +
      `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1`;
    const data = await getJSON(url);
    const first = Object.values(data?.query?.pages || {})[0];
    return first?.thumbnail?.source || "";
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
  const gaFederal = legislators.filter((p) => p.terms.at(-1).state === "GA");

  const houseDelegation = gaFederal
    .filter((p) => p.terms.at(-1).type === "rep")
    .map((p) => {
      const t = p.terms.at(-1);
      const num = Number(t.district);
      const site = t.url || "";
      return {
        district_code: `GA-${String(num).padStart(2, "0")}`,
        state: STATE,
        district_number: num,
        name: p.name.official_full,
        title: "U.S. Representative",
        office_label: `Georgia ${ordinal(num)} Congressional District`,
        party: partyFull(t.party),
        website: site,
        contact_url: t.contact_form || (site ? `${site.replace(/\/$/, "")}/contact` : ""),
        phone: t.phone || null,
        image_url: congressPhoto(p.id.bioguide),
        is_active: true,
      };
    })
    .sort((a, b) => a.district_number - b.district_number);

  const usSenators = gaFederal
    .filter((p) => p.terms.at(-1).type === "sen")
    .map((p) => {
      const t = p.terms.at(-1);
      return representative({
        name: p.name.official_full,
        office: "U.S. Senator, Georgia",
        level: "senate",
        website: t.url,
        contact: t.contact_form || t.url,
        party: partyFull(t.party),
        photo: congressPhoto(p.id.bioguide),
      });
    });

  // ---- 2. Statewide executives (Wikipedia headshots) ---------------------
  const execDefs = [
    { name: "Brian Kemp", office: "Governor of Georgia", party: "Republican", website: "https://gov.georgia.gov", contact: "https://gov.georgia.gov/contact-us", q: "Brian Kemp Governor Georgia" },
    { name: "Burt Jones", office: "Lieutenant Governor of Georgia", party: "Republican", website: "https://ltgov.georgia.gov", contact: "https://ltgov.georgia.gov/contact", q: "Burt Jones Georgia Lieutenant Governor" },
    { name: "Chris Carr", office: "Attorney General of Georgia", party: "Republican", website: "https://law.georgia.gov", contact: "https://law.georgia.gov/contact-us", q: "Chris Carr Georgia Attorney General" },
    { name: "Brad Raffensperger", office: "Secretary of State of Georgia", party: "Republican", website: "https://sos.ga.gov", contact: "https://sos.ga.gov/contact-us", q: "Brad Raffensperger Georgia Secretary of State" },
  ];
  const execs = await mapLimit(execDefs, 4, async (d) =>
    representative({
      name: d.name,
      office: d.office,
      level: "State",
      website: d.website,
      contact: d.contact,
      party: d.party,
      photo: await wikiPhoto(d.q),
    })
  );

  // ---- 3. Current State Senators from OpenStates -------------------------
  const files = (
    await getJSON(
      "https://api.github.com/repos/openstates/people/contents/data/ga/legislature"
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
    // js-yaml parses unquoted YAML dates as Date objects — normalize to strings.
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
        office: `Georgia State Senator, District ${num}`,
        level: "State Senate",
        website: homepage || "",
        contact: homepage || "",
        party: partyFull(partyEntry?.name),
        photo: doc.image || "",
        district: `GA-${String(num).padStart(2, "0")}`,
      })
    );
  }
  stateSenators.sort(
    (a, b) => Number(a.district.split("-")[1]) - Number(b.district.split("-")[1])
  );

  // ---- Write to Supabase (idempotent: clear GA rows, then insert) --------
  const representativesRows = [...usSenators, ...execs, ...stateSenators];

  const { error: repDeleteError } = await supabase
    .from("representatives")
    .delete()
    .eq("state", STATE);
  if (repDeleteError) {
    console.error("Failed to clear GA representatives:", repDeleteError);
    process.exit(1);
  }
  const { error: repInsertError } = await supabase
    .from("representatives")
    .insert(representativesRows);
  if (repInsertError) {
    console.error("Failed to insert GA representatives:", repInsertError);
    process.exit(1);
  }

  const { error: houseDeleteError } = await supabase
    .from("district_representatives")
    .delete()
    .eq("state", STATE);
  if (houseDeleteError) {
    console.error("Failed to clear GA district representatives:", houseDeleteError);
    process.exit(1);
  }
  const { error: houseInsertError } = await supabase
    .from("district_representatives")
    .insert(houseDelegation);
  if (houseInsertError) {
    console.error("Failed to insert GA district representatives:", houseInsertError);
    process.exit(1);
  }

  const missingPhotos = representativesRows.filter((r) => !r.photo).map((r) => r.name);
  console.log(
    `Seeded Georgia: ${usSenators.length} U.S. senators, ${execs.length} statewide execs, ` +
      `${stateSenators.length} state senators, ${houseDelegation.length} U.S. House members.`
  );
  console.log(`  U.S. House: ${houseDelegation.map((h) => `${h.district_code} ${h.name}`).join(", ")}`);
  if (missingPhotos.length) {
    console.log(`  No photo resolved for: ${missingPhotos.length} row(s)`);
  }
}

main().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exit(1);
});
